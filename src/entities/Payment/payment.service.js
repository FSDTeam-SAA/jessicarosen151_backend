// src/Payment/payment.service.js
import Stripe from 'stripe';
import User from '../auth/auth.model.js';
import { applyPromoCodeService } from '../promoCode/promo.service.js';
import Resource from '../resource/resource.model.js';
import Order from './order.model.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

export const createCheckoutSession = async ({
  userId = null,
  guestId = null,
  itemsFromFrontend,
  promoCode,
  customerCountry = 'BD',
  customerEmail = null,
}) => {
  if (!itemsFromFrontend?.length) throw new Error('No items provided');

  // 1. Group items by seller
  const itemsBySeller = new Map(); // sellerStripeId → group

  for (const item of itemsFromFrontend) {
    const resource = await Resource.findById(item.resource).lean();
    if (!resource) throw new Error(`Resource not found: ${item.resource}`);
    if (item.quantity > resource.quantity)
      throw new Error(`Not enough stock for ${resource.title}`);

    const seller = await User.findById(resource.createdBy).lean();
    if (!seller?.stripeAccountId)
      throw new Error(`Seller not connected to Stripe: ${resource.title}`);

    const unitPriceCents = Math.round((resource.discountPrice || resource.price) * 100);
    const itemTotalCents = unitPriceCents * item.quantity;
    const key = seller.stripeAccountId;

    if (!itemsBySeller.has(key)) {
      itemsBySeller.set(key, {
        sellerUserId: seller._id,
        sellerStripeId: seller.stripeAccountId,
        items: [],
        lineItems: [],
        rawSubtotalCents: 0,
      });
    }

    const group = itemsBySeller.get(key);
    group.items.push({
      resource: item.resource,
      quantity: item.quantity,
      price: unitPriceCents / 100,
      seller: seller._id,
    });
    group.lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: {
          name: resource.title,
          metadata: { resource: item.resource, sellerId: seller._id },
        },
        unit_amount: unitPriceCents,
      },
      quantity: item.quantity,
    });
    group.rawSubtotalCents += itemTotalCents;
  }

  // 2. Calculate total pre-tax and apply promo code
  let totalRawSubtotalCents = 0;
  for (const group of itemsBySeller.values()) {
    totalRawSubtotalCents += group.rawSubtotalCents;
  }

  let finalPreTaxCents = totalRawSubtotalCents;
  let discountCents = 0;

  if (promoCode) {
    const promo = await applyPromoCodeService(promoCode, totalRawSubtotalCents / 100);
    finalPreTaxCents = Math.round(promo.finalPrice * 100);
    discountCents = Math.round(promo.discountAmount * 100);
  }

  // 3. Create one Checkout Session per seller (Direct Charge)
  const sessions = [];
  let totalLawbieRevenueCents = 0;
  let totalSellerShareCents = 0;

  for (const [sellerStripeId, group] of itemsBySeller) {
    const proportion = group.rawSubtotalCents / totalRawSubtotalCents;
    const sellerPreTaxCents = Math.round(finalPreTaxCents * proportion);

    // 50% of pre-tax goes to seller
    const sellerShareCents = Math.floor(sellerPreTaxCents * 0.5);
    const lawbiePreTaxShareCents = sellerPreTaxCents - sellerShareCents;

    totalSellerShareCents += sellerShareCents;
    totalLawbieRevenueCents += lawbiePreTaxShareCents;

    // Create order first (tax not known yet)
    const order = await Order.create({
      items: group.items,
      user: userId || null,
      guest: guestId || null,
      totalAmount: sellerPreTaxCents / 100, // will be updated after payment
      discountAmount: Math.round(discountCents * proportion) / 100,
      appliedPromoCode: promoCode || null,
      paymentStatus: 'pending',
      customerCountry,
      sellerShares: { [sellerStripeId]: sellerShareCents },
      lawbieRevenueCents: lawbiePreTaxShareCents,
      rawSubtotalCents: group.rawSubtotalCents,
      isMultiSellerOrder: itemsBySeller.size > 1,
    });

    console.log('Creating checkout session for order:', order._id);
    console.log('Line items:', group.lineItems.length);
    console.log('Seller Stripe ID:', sellerStripeId);

    // Create Checkout Session as Direct Charge
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: group.lineItems,
      customer_email: customerEmail || (userId ? (await User.findById(userId))?.email : undefined),
      automatic_tax: { enabled: true },
      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}&order_id=${order._id}`,
      cancel_url: `${process.env.FRONTEND_URL}/cart`,
      metadata: {
        orderId: order._id.toString(),
        platform: 'lawbie-global',
        customerCountry,
        sellerStripeId,
        type: 'direct_charge',
        userId: userId || '',
        guestId: guestId || '',
      },
      // This is the CRITICAL part
      payment_intent_data: {
        application_fee_amount: lawbiePreTaxShareCents, // Lawbie gets 50% of pre-tax
        // Tax will be automatically added to application fee below
        transfer_data: {
          destination: sellerStripeId,
        },
      },
    }, {
      stripeAccount: sellerStripeId, // Direct charge on seller's account
    });

    console.log('Checkout session created:', session.id);

    // Now we know the exact tax amount
    const taxCents = session.total_details?.amount_tax || 0;

    // Add full tax to Lawbie's application fee
    if (taxCents > 0) {
      try {
        await stripe.paymentIntents.update(
          session.payment_intent,
          {
            application_fee_amount: lawbiePreTaxShareCents + taxCents,
          },
          { stripeAccount: sellerStripeId }
        );
        console.log('Updated application fee with tax:', lawbiePreTaxShareCents + taxCents);
      } catch (feeError) {
        console.error('Failed to update application fee:', feeError);
        // Continue anyway - the payment will still work
      }
    }

    // Update order with final amounts
    const finalLawbieFeeCents = lawbiePreTaxShareCents + taxCents;
    order.stripeSessionId = session.id;
    order.totalAmount = session.amount_total / 100;
    order.taxAmount = taxCents / 100;
    order.lawbieRevenueCents = finalLawbieFeeCents;
    await order.save();

    totalLawbieRevenueCents += taxCents; // Add tax to Lawbie total

    sessions.push({
      sessionId: session.id,
      url: session.url,
      orderId: order._id.toString(),
      sellerStripeId,
      preTaxAmount: sellerPreTaxCents / 100,
      sellerShare: sellerShareCents / 100,
      lawbieShare: finalLawbieFeeCents / 100,
      taxAmount: taxCents / 100,
    });
  }

  return {
    sessions,
    totalPreTax: finalPreTaxCents / 100,
    totalDiscount: discountCents / 100,
    totalSellerShare: totalSellerShareCents / 100,
    totalLawbieRevenue: totalLawbieRevenueCents / 100,
  };
};