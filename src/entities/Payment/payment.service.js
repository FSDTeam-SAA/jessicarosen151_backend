import Stripe from 'stripe';
import User from '../auth/auth.model.js';
import { applyPromoCodeService } from '../promoCode/promo.service.js';
import Resource from '../resource/resource.model.js';
import Order from './order.model.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20'
});

const EXTRA_ADMIN_FEE_PERCENT = 0.13;
const SELLER_SHARE_PERCENT = 0.9;

export const createCheckoutSession = async ({
  userId = null,
  guestId = null,
  itemsFromFrontend,
  promoCode,
  customerCountry = 'BD',
  customerEmail = null
}) => {
  if (!itemsFromFrontend?.length) throw new Error('No items provided');

  const itemsBySeller = new Map();
  const PLATFORM_STRIPE_ID = process.env.PLATFORM_STRIPE_ACCOUNT_ID;

  // Debug info
  console.log('Platform Stripe ID from env:', PLATFORM_STRIPE_ID);

  // Group items by seller
  for (const item of itemsFromFrontend) {
    const resource = await Resource.findById(item.resource).lean();
    if (!resource) throw new Error(`Resource not found: ${item.resource}`);
    if (item.quantity > resource.quantity)
      throw new Error(`Not enough stock for ${resource.title}`);

    const seller = await User.findById(resource.createdBy).lean();
    if (!seller)
      throw new Error(`Seller not found for resource: ${resource.title}`);

    const unitPriceCents = Math.round(
      (resource.discountPrice || resource.price) * 100
    );
    const itemTotalCents = unitPriceCents * item.quantity;

    // CRITICAL FIX: Check if seller is platform or connected account
    const isPlatformSeller =
      !seller.stripeAccountId ||
      seller.stripeAccountId === process.env.PLATFORM_STRIPE_ID;

    // Use platform Stripe ID for platform sellers, actual ID for connected accounts
    const sellerKey = isPlatformSeller
      ? PLATFORM_STRIPE_ID
      : seller.stripeAccountId;

    if (!itemsBySeller.has(sellerKey)) {
      itemsBySeller.set(sellerKey, {
        sellerUserId: seller._id,
        sellerStripeId: sellerKey,
        isPlatformAccount: isPlatformSeller, // Track if platform account
        items: [],
        lineItems: [],
        rawSubtotalCents: 0
      });
    }

    const group = itemsBySeller.get(sellerKey);
    group.items.push({
      resource: item.resource,
      quantity: item.quantity,
      price: unitPriceCents / 100,
      seller: seller._id
    });

    group.lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: {
          name: resource.title,
          metadata: {
            resource: item.resource,
            sellerId: seller._id,
            isPlatform: isPlatformSeller ? 'true' : 'false'
          }
        },
        unit_amount: unitPriceCents
      },
      quantity: item.quantity
    });

    group.rawSubtotalCents += itemTotalCents;
  }

  // Calculate totals
  let totalRawSubtotalCents = 0;
  for (const group of itemsBySeller.values()) {
    totalRawSubtotalCents += group.rawSubtotalCents;
  }

  // Apply promo code
  let finalPreTaxCents = totalRawSubtotalCents;
  let discountCents = 0;

  if (promoCode) {
    const promo = await applyPromoCodeService(
      promoCode,
      totalRawSubtotalCents / 100
    );
    finalPreTaxCents = Math.round(promo.finalPrice * 100);
    discountCents = Math.round(promo.discountAmount * 100);
  }

  // Extra admin fee
  const extraAdminFeeCents = Math.round(
    finalPreTaxCents * EXTRA_ADMIN_FEE_PERCENT
  );
  finalPreTaxCents += extraAdminFeeCents;

  const sessions = [];
  let totalSellerShareCents = 0;
  let totalAdminRevenueCents = 0;

  // Process each seller group
  for (const [sellerKey, group] of itemsBySeller) {
    const proportion = group.rawSubtotalCents / totalRawSubtotalCents;
    const sellerPreTaxCents = Math.round(
      finalPreTaxCents * proportion * SELLER_SHARE_PERCENT
    );
    const adminShareCents = Math.round(
      finalPreTaxCents * proportion * (1 - SELLER_SHARE_PERCENT)
    );

    totalSellerShareCents += sellerPreTaxCents;
    totalAdminRevenueCents += adminShareCents;

    // Create order
    const order = await Order.create({
      items: group.items,
      user: userId || null,
      guest: guestId || null,
      totalAmount: finalPreTaxCents / 100,
      totalAmountAdmin: (adminShareCents + extraAdminFeeCents) / 100,
      discountAmount: Math.round(discountCents * proportion) / 100,
      appliedPromoCode: promoCode || null,
      paymentStatus: 'pending',
      customerCountry,
      sellerShares: { [sellerKey]: sellerPreTaxCents },
      lawbieRevenueCents: adminShareCents,
      rawSubtotalCents: group.rawSubtotalCents,
      isMultiSellerOrder: itemsBySeller.size > 1,
      isPlatformOrder: group.isPlatformAccount
    });

    console.log('order', order);

    // Base session parameters
    const sessionParams = {
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: group.lineItems,
      customer_email:
        customerEmail ||
        (userId ? (await User.findById(userId))?.email : undefined),
      // automatic_tax: { enabled: true },
      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}&order_id=${order._id}`,
      cancel_url: `${process.env.FRONTEND_URL}/cart`,
      metadata: {
        orderId: order._id.toString(),
        platform: 'lawbie-global',
        customerCountry,
        sellerKey,
        userId: userId || '',
        guestId: guestId || '',
        accountType: group.isPlatformAccount ? 'platform' : 'connected'
      }
    };

    let session;

    if (group.isPlatformAccount) {
      // PLATFORM ACCOUNT: No transfer_data, no stripeAccount option
      console.log('Creating platform account session (no transfer)');

      session = await stripe.checkout.sessions.create(sessionParams);
    } else {
      // CONNECTED ACCOUNT: With transfer_data AND stripeAccount option
      console.log(
        'Creating connected account session with transfer to:',
        sellerKey
      );

      sessionParams.payment_intent_data = {
        application_fee_amount: adminShareCents + extraAdminFeeCents,
        transfer_data: {
          destination: sellerKey
        }
      };

      // CRITICAL: Pass stripeAccount option for connected accounts
      session = await stripe.checkout.sessions.create(sessionParams);
    }

    const taxCents = session.total_details?.amount_tax || 0;
    const finalAdminRevenue = adminShareCents + extraAdminFeeCents + taxCents;

    order.stripeSessionId = session.id;
    order.totalAmount = session.amount_total / 100;
    order.taxAmount = taxCents / 100;
    order.lawbieRevenueCents = finalAdminRevenue;
    await order.save();

    sessions.push({
      sessionId: session.id,
      url: session.url,
      orderId: order._id.toString(),
      sellerStripeId: sellerKey,
      isPlatformAccount: group.isPlatformAccount,
      preTaxAmount: sellerPreTaxCents / 100,
      sellerShare: sellerPreTaxCents / 100,
      lawbieShare: finalAdminRevenue / 100,
      taxAmount: taxCents / 100
    });
  }

  return {
    sessions,
    totalPreTax: finalPreTaxCents / 100,
    totalDiscount: discountCents / 100,
    totalSellerShare: totalSellerShareCents / 100,
    totalAdminRevenue: totalAdminRevenueCents / 100
  };
};

//====================================================

// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
//   apiVersion: '2024-06-20',
// });

// export const createCheckoutSession = async ({
//   userId = null,
//   guestId = null,
//   itemsFromFrontend,
//   promoCode,
//   customerCountry = 'BD',
//   customerEmail = null,
// }) => {
//   if (!itemsFromFrontend?.length) throw new Error('No items provided');

//   // 1. Group items by seller
//   const itemsBySeller = new Map(); // sellerStripeId → group

//   for (const item of itemsFromFrontend) {
//     const resource = await Resource.findById(item.resource).lean();
//     if (!resource) throw new Error(`Resource not found: ${item.resource}`);
//     if (item.quantity > resource.quantity)
//       throw new Error(`Not enough stock for ${resource.title}`);

//     const seller = await User.findById(resource.createdBy).lean();
//     if (!seller?.stripeAccountId)
//       throw new Error(`Seller not connected to Stripe: ${resource.title}`);

//     const unitPriceCents = Math.round((resource.discountPrice || resource.price) * 100);
//     const itemTotalCents = unitPriceCents * item.quantity;
//     const key = seller.stripeAccountId;

//     if (!itemsBySeller.has(key)) {
//       itemsBySeller.set(key, {
//         sellerUserId: seller._id,
//         sellerStripeId: seller.stripeAccountId,
//         items: [],
//         lineItems: [],
//         rawSubtotalCents: 0,
//       });
//     }

//     const group = itemsBySeller.get(key);
//     group.items.push({
//       resource: item.resource,
//       quantity: item.quantity,
//       price: unitPriceCents / 100,
//       seller: seller._id,
//     });
//     group.lineItems.push({
//       price_data: {
//         currency: 'usd',
//         product_data: {
//           name: resource.title,
//           metadata: { resource: item.resource, sellerId: seller._id },
//         },
//         unit_amount: unitPriceCents,
//       },
//       quantity: item.quantity,
//     });
//     group.rawSubtotalCents += itemTotalCents;
//   }

//   // 2. Calculate total pre-tax and apply promo code
//   let totalRawSubtotalCents = 0;
//   for (const group of itemsBySeller.values()) {
//     totalRawSubtotalCents += group.rawSubtotalCents;
//   }

//   let finalPreTaxCents = totalRawSubtotalCents;
//   let discountCents = 0;

//   if (promoCode) {
//     const promo = await applyPromoCodeService(promoCode, totalRawSubtotalCents / 100);
//     finalPreTaxCents = Math.round(promo.finalPrice * 100);
//     discountCents = Math.round(promo.discountAmount * 100);
//   }

//   // 3. Create one Checkout Session per seller (Direct Charge)
//   const sessions = [];
//   let totalLawbieRevenueCents = 0;
//   let totalSellerShareCents = 0;

//   for (const [sellerStripeId, group] of itemsBySeller) {
//     const proportion = group.rawSubtotalCents / totalRawSubtotalCents;
//     const sellerPreTaxCents = Math.round(finalPreTaxCents * proportion);

//     // 50% of pre-tax goes to seller
//     const sellerShareCents = Math.floor(sellerPreTaxCents * 0.5);
//     const lawbiePreTaxShareCents = sellerPreTaxCents - sellerShareCents;

//     totalSellerShareCents += sellerShareCents;
//     totalLawbieRevenueCents += lawbiePreTaxShareCents;

//     // Create order first (tax not known yet)
//     const order = await Order.create({
//       items: group.items,
//       user: userId || null,
//       guest: guestId || null,
//       totalAmount: sellerPreTaxCents / 100, // will be updated after payment
//       discountAmount: Math.round(discountCents * proportion) / 100,
//       appliedPromoCode: promoCode || null,
//       paymentStatus: 'pending',
//       customerCountry,
//       sellerShares: { [sellerStripeId]: sellerShareCents },
//       lawbieRevenueCents: lawbiePreTaxShareCents,
//       rawSubtotalCents: group.rawSubtotalCents,
//       isMultiSellerOrder: itemsBySeller.size > 1,
//     });

//     console.log('Creating checkout session for order:', order._id);
//     console.log('Line items:', group.lineItems.length);
//     console.log('Seller Stripe ID:', sellerStripeId);

//     // Create Checkout Session as Direct Charge
//     const session = await stripe.checkout.sessions.create({
//       payment_method_types: ['card'],
//       mode: 'payment',
//       line_items: group.lineItems,
//       customer_email: customerEmail || (userId ? (await User.findById(userId))?.email : undefined),
//       automatic_tax: { enabled: true },
//       success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}&order_id=${order._id}`,
//       cancel_url: `${process.env.FRONTEND_URL}/cart`,
//       metadata: {
//         orderId: order._id.toString(),
//         platform: 'lawbie-global',
//         customerCountry,
//         sellerStripeId,
//         type: 'direct_charge',
//         userId: userId || '',
//         guestId: guestId || '',
//       },
//       // This is the CRITICAL part
//       payment_intent_data: {
//         application_fee_amount: lawbiePreTaxShareCents, // Lawbie gets 50% of pre-tax
//         // Tax will be automatically added to application fee below
//         transfer_data: {
//           destination: sellerStripeId,
//         },
//       },
//     }, {
//       stripeAccount: sellerStripeId, // Direct charge on seller's account
//     });

//     console.log('Checkout session created:', session.id);

//     // Now we know the exact tax amount
//     const taxCents = session.total_details?.amount_tax || 0;

//     // Add full tax to Lawbie's application fee
//     if (taxCents > 0) {
//       try {
//         await stripe.paymentIntents.update(
//           session.payment_intent,
//           {
//             application_fee_amount: lawbiePreTaxShareCents + taxCents,
//           },
//           { stripeAccount: sellerStripeId }
//         );
//         console.log('Updated application fee with tax:', lawbiePreTaxShareCents + taxCents);
//       } catch (feeError) {
//         console.error('Failed to update application fee:', feeError);
//         // Continue anyway - the payment will still work
//       }
//     }

//     // Update order with final amounts
//     const finalLawbieFeeCents = lawbiePreTaxShareCents + taxCents;
//     order.stripeSessionId = session.id;
//     order.totalAmount = session.amount_total / 100;
//     order.taxAmount = taxCents / 100;
//     order.lawbieRevenueCents = finalLawbieFeeCents;
//     await order.save();

//     totalLawbieRevenueCents += taxCents; // Add tax to Lawbie total

//     sessions.push({
//       sessionId: session.id,
//       url: session.url,
//       orderId: order._id.toString(),
//       sellerStripeId,
//       preTaxAmount: sellerPreTaxCents / 100,
//       sellerShare: sellerShareCents / 100,
//       lawbieShare: finalLawbieFeeCents / 100,
//       taxAmount: taxCents / 100,
//     });
//   }

//   return {
//     sessions,
//     totalPreTax: finalPreTaxCents / 100,
//     totalDiscount: discountCents / 100,
//     totalSellerShare: totalSellerShareCents / 100,
//     totalLawbieRevenue: totalLawbieRevenueCents / 100,
//   };
// };
