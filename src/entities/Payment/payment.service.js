// src/Payment/checkout.service.js
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
  if (!itemsFromFrontend || itemsFromFrontend.length === 0) {
    throw new Error('No items provided');
  }

  let subtotalCents = 0;
  const lineItems = [];
  const sellerShares = new Map(); // sellerId → amount in cents

  // PHASE 1: Build line items (100% to platform)
  for (const item of itemsFromFrontend) {
    const resource = await Resource.findById(item.resource).lean();
    if (!resource) throw new Error(`Resource not found: ${item.resource}`);
    if (item.quantity > resource.quantity) {
      throw new Error(`Not enough stock for ${resource.title}`);
    }

    const seller = await User.findById(resource.createdBy).lean();
    if (!seller || !seller.stripeAccountId) {
      throw new Error(`Seller not connected to Stripe: ${resource.title}`);
    }

    const unitPriceCents = Math.round((resource.discountPrice || resource.price) * 100);
    const itemTotalCents = unitPriceCents * item.quantity;
    subtotalCents += itemTotalCents;

    // 50% to seller → store for later transfer
    const sellerAmountCents = Math.floor(itemTotalCents * 0.5);
    sellerShares.set(seller.stripeAccountId, (sellerShares.get(seller.stripeAccountId) || 0) + sellerAmountCents);

    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: {
          name: resource.title,
          metadata: { resourceId: item.resource, sellerId: seller._id },
        },
        unit_amount: unitPriceCents,
      },
      quantity: item.quantity,
    });
  }

  // PHASE 2: Apply promo code
  let finalSubtotalCents = subtotalCents;
  let discountCents = 0;

  if (promoCode) {
    const promoResult = await applyPromoCodeService(promoCode, subtotalCents / 100);
    finalSubtotalCents = Math.round(promoResult.finalPrice * 100);
    discountCents = Math.round(promoResult.discountAmount * 100);
  }

  // Lawbie keeps 50%
  const lawbieRevenueCents = finalSubtotalCents - Array.from(sellerShares.values()).reduce((a, b) => a + b, 0);

  // PHASE 3: Build order items
  const orderItems = await Promise.all(
    itemsFromFrontend.map(async (item) => {
      const resource = await Resource.findById(item.resource).lean();
      return {
        resource: item.resource,
        quantity: item.quantity,
        price: resource.discountPrice || resource.price,
        seller: resource.createdBy,
      };
    })
  );

  // PHASE 4: Create order
  const transferGroup = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const order = await Order.create({
    items: orderItems,
    user: userId || null,
    guest: guestId || null,
    totalAmount: finalSubtotalCents / 100,
    discountAmount: discountCents / 100,
    appliedPromoCode: promoCode || null,
    paymentStatus: 'pending',
    transferGroup,
    customerCountry,
    sellerShares: Object.fromEntries(sellerShares), // Save for webhook
  });

  // PHASE 5: Create Checkout Session (100% to platform)
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: lineItems,
    customer_email: customerEmail || (userId ? (await User.findById(userId))?.email : undefined),

    automatic_tax: { enabled: true },

    success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}&order_id=${order._id}`,
    cancel_url: `${process.env.FRONTEND_URL}/cart`,

    metadata: {
      orderId: order._id.toString(),
      platform: 'lawbie-global',
      customerCountry,
    },

    payment_intent_data: {
      application_fee_amount: Math.max(lawbieRevenueCents, 0),
      transfer_group: transferGroup,
    },
  });

  order.stripeSessionId = session.id;
  await order.save();

  return {
    sessionId: session.id,
    url: session.url,
    orderId: order._id,
  };
};