import Stripe from 'stripe';
import Cart from '../cart/cart.model.js';
import User from '../auth/auth.model.js';
import Resource from '../resource/resource.model.js';
import Order from '../Payment/order.model.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// export const createCheckoutSession = async (userId) => {
//   const cart = await Cart.findOne({ user: userId }).lean();

// //   console.log(cart);
// if (!cart || cart.length === 0) throw new Error('Cart is empty');




//   const line_items = [];
//   const transfer_map = [];
//   let totalAmount = 0;
//   const orderItems = [];
//   const transferGroup = `order_${Date.now()}`;

//   for (const item of cart.items) {
//     const resource = await Resource.findById(item.resource).lean();
//     if (!resource) throw new Error('Resource not found');

//     const seller = await User.findById(resource.createdBy).lean();
//     if (!seller) throw new Error('Seller not found');
//     const price = item.price * item.quantity;
//     totalAmount += price;

//     line_items.push({
//       price_data: {
//         currency: 'usd',
//         unit_amount: item.price * 100,
//         product_data: {
//           name: resource.title,
//         },
//       },
//       quantity: item.quantity,
//     });

//     // 50% to seller if seller exists
//     if (seller?.role === 'SELLER' && seller.stripeAccountId) {
//       transfer_map.push({
//         amount: Math.floor((price * 0.5) * 100),
//         destination: seller.stripeAccountId,
//       });
//     }

//     orderItems.push({
//       resource: item.resource,
//       seller: resource.createdBy,
//       quantity: item.quantity,
//       price: item.price,
//     });
//   }

//   const order = await Order.create({
//     user: userId,
//     items: orderItems,
//     totalAmount,
//     stripeSessionId: '',
//     transferGroup,
//     transactionId: '',
//     paymentStatus: 'pending',
//   });

//   const session = await stripe.checkout.sessions.create({
//     payment_method_types: ['card'],
//     line_items,
//     mode: 'payment',
//     success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
//     cancel_url: `${process.env.FRONTEND_URL}/cancel`,
//     metadata: {
//       orderId: order._id.toString(),
//       transferGroup,
//     },
//     payment_intent_data: {
//     transfer_group: transferGroup,
//   },
//   });

//   order.stripeSessionId = session.id;
//   await order.save();

//   return {
//   sessionId: session.id,
//   url: session.url,
// };

// };





export const createCheckoutSession = async (userId, promoCodeInput = null) => {
  const cart = await Cart.findOne({ user: userId }).lean();
  if (!cart || cart.items.length === 0) {
    throw new Error('Cart is empty');
  }

  const line_items = [];
  const transfer_map = [];
  const orderItems = [];
  const transferGroup = `order_${Date.now()}`;

  let totalAmount = 0;
  let discountAmount = 0;
  let appliedPromo = null;

  // 1. Calculate item prices
  for (const item of cart.items) {
    const resource = await Resource.findById(item.resource).lean();
    if (!resource) throw new Error('Resource not found');

    const seller = await User.findById(resource.createdBy).lean();
    if (!seller) throw new Error('Seller not found');

    const price = item.price * item.quantity;
    totalAmount += price;

    line_items.push({
      price_data: {
        currency: 'usd',
        unit_amount: item.price * 100, // cents
        product_data: {
          name: resource.title,
        },
      },
      quantity: item.quantity,
    });

    // 50% to seller if seller exists
    if (seller?.role === 'SELLER' && seller.stripeAccountId) {
      transfer_map.push({
        amount: Math.floor((price * 0.5) * 100),
        destination: seller.stripeAccountId,
      });
    }

    orderItems.push({
      resource: item.resource,
      seller: resource.createdBy,
      quantity: item.quantity,
      price: item.price,
    });
  }

  // 2. Apply promo code if present
  if (promoCodeInput) {
    const promo = await PromoCode.findOne({ code: promoCodeInput, active: true });

    if (!promo) throw new Error('Promo code not found or inactive');
    if (promo.expiryDate < new Date()) throw new Error('Promo code has expired');
    if (promo.usageLimit <= promo.usedCount) throw new Error('Promo code usage limit reached');

    appliedPromo = promo;

    if (promo.discountType === 'Percentage') {
      discountAmount = totalAmount * (promo.discountValue / 100);
    } else if (promo.discountType === 'Fixed') {
      discountAmount = promo.discountValue;
    }

    // prevent negative totals
    if (discountAmount > totalAmount) discountAmount = totalAmount;

    totalAmount = totalAmount - discountAmount;

    // Optionally: show discount as a separate line item (Stripe doesn't allow negative prices)
    line_items.push({
      price_data: {
        currency: 'usd',
        unit_amount: Math.floor(-discountAmount * 100), // Stripe doesn't support negative prices directly
        product_data: {
          name: `Promo Code (${promo.code})`,
        },
      },
      quantity: 1,
    });
  }

  // 3. Create Order
  const order = await Order.create({
    user: userId,
    items: orderItems,
    totalAmount,
    stripeSessionId: '',
    transferGroup,
    transactionId: '',
    paymentStatus: 'pending',
    promocode: appliedPromo?._id || null,
  });

  // 4. Create Stripe Checkout Session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items,
    mode: 'payment',
    success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL}/cancel`,
    metadata: {
      orderId: order._id.toString(),
      transferGroup,
    },
    payment_intent_data: {
      transfer_group: transferGroup,
    },
  });

  // 5. Save Stripe session ID
  order.stripeSessionId = session.id;
  await order.save();

  return {
    sessionId: session.id,
    url: session.url,
  };
};