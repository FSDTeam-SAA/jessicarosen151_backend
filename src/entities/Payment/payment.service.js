import Stripe from 'stripe';
import User from '../auth/auth.model.js';
import Resource from '../resource/resource.model.js';
import Order from '../Payment/order.model.js';
import { applyPromoCodeService } from '../promoCode/promo.service.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createCheckoutSession = async (userId, { itemsFromFrontend, promoCode }) => {
  if (!itemsFromFrontend || itemsFromFrontend.length === 0) {
    throw new Error('No items provided');
  }

  const line_items = [];
  const transfer_map = [];
  let totalAmount = 0;
  const orderItems = [];
  const transferGroup = `order_${Date.now()}`;

  for (const item of itemsFromFrontend) {
    const resource = await Resource.findById(item.resource).lean();
    if (!resource) throw new Error(`Resource not found: ${item.resource}`);

    if (item.quantity > resource.quantity) {
      throw new Error(`Requested quantity for ${resource.title} exceeds available stock`);
    }

    const seller = await User.findById(resource.createdBy).lean();
    if (!seller) throw new Error('Seller not found');

    const unitPrice = resource.discountPrice || resource.price;
    const itemPrice = unitPrice * item.quantity;

    totalAmount += itemPrice;

    line_items.push({
      price_data: {
        currency: 'usd',
        unit_amount: Math.round(unitPrice * 100),
        product_data: {
          name: resource.title,
        },
      },
      quantity: item.quantity,
    });

    if (seller?.role === 'SELLER' && seller.stripeAccountId) {
      transfer_map.push({
        amount: Math.floor((itemPrice * 0.5) * 100),
        destination: seller.stripeAccountId,
      });
    }

    orderItems.push({
      resource: item.resource,
      seller: resource.createdBy,
      quantity: item.quantity,
      price: unitPrice,
    });
  }

  // Apply promo code to totalAmount
  let finalAmount = totalAmount;
  let discountAmount = 0;

  if (promoCode) {
    try {
      const promoResult = await applyPromoCodeService(promoCode, totalAmount);
      finalAmount = promoResult.finalPrice;
      discountAmount = promoResult.discountAmount;

      // Add a negative line item to reflect the discount
      if (discountAmount > 0) {
        line_items.push({
          price_data: {
            currency: 'usd',
            unit_amount: Math.round(discountAmount * -100), // Negative amount
            product_data: {
              name: `Discount: ${promoCode}`,
            },
          },
          quantity: 1,
        });
      }
    } catch (err) {
      throw new Error(`Promo code error: ${err.message}`);
    }
  }

  const order = await Order.create({
    user: userId,
    items: orderItems,
    totalAmount: finalAmount,
    discountAmount,
    appliedPromoCode: promoCode || null,
    stripeSessionId: '',
    transferGroup,
    transactionId: '',
    paymentStatus: 'pending',
  });

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

  order.stripeSessionId = session.id;
  await order.save();

  return {
    sessionId: session.id,
    url: session.url,
  };
};
