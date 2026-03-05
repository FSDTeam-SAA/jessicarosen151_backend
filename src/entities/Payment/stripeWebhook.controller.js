// src/Payment/stripeWebhook.controller.js
import Stripe from 'stripe';
import Order from './order.model.js';
import Resource from '../resource/resource.model.js';
import User from '../user/user.model.js';           // ← assuming this exists
import { generateResponse } from '../../lib/responseFormate.js';
import sendEmail from '../../lib/sendEmail.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const stripeWebhookHandler = async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    console.log(`Webhook received — type: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        await handleSuccessfulCheckout(session);
        break;
      }

      case 'checkout.session.async_payment_succeeded': {
        // For delayed payment methods (e.g. bank, SEPA)
        const session = event.data.object;
        await handleSuccessfulCheckout(session);
        break;
      }

      case 'checkout.session.expired':
      case 'payment_intent.payment_failed':
      case 'charge.failed': {
        await handleFailedPayment(event.data.object);
        break;
      }

      case 'charge.refunded': {
        await handleRefund(event.data.object);
        break;
      }

      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }

    generateResponse(res, 200, true, 'Webhook processed');
  } catch (err) {
    console.error('Webhook processing error:', err);
    generateResponse(res, 500, false, 'Webhook error', err.message);
  }
};

async function handleSuccessfulCheckout(session) {
  if (!session?.id) return;

  const order = await Order.findOne({ stripeSessionId: session.id })
    .populate('user')
    .populate({
      path: 'items.resource',
      model: 'Resource',
    })
    .populate({
      path: 'items.seller',
      model: 'User',
    });

  if (!order) {
    console.warn(`Order not found for session ${session.id}`);
    return;
  }

  if (order.paymentStatus === 'paid') {
    console.log(`Order ${order._id} already paid — skipping`);
    return;
  }

  // Update order
  order.paymentStatus = 'paid';
  order.transactionId = session.payment_intent;
  order.totalAmount = session.amount_total / 100;
  order.taxAmount = (session.total_details?.amount_tax || 0) / 100;
  order.paidAt = new Date();
  await order.save();

  // Decrease stock
  for (const item of order.items) {
    await Resource.findByIdAndUpdate(item.resource._id, {
      $inc: { quantity: -item.quantity },
    });
  }

  // Process 50% transfers to sellers (Stripe Connect)
  for (const item of order.items) {
    const seller = item.seller;
    if (seller?.role !== 'SELLER' || !seller.stripeAccountId) continue;

    const amountCents = Math.floor(item.price * item.quantity * 0.5 * 100);

    try {
      await stripe.transfers.create({
        amount: amountCents,
        currency: 'usd',
        destination: seller.stripeAccountId,
        transfer_group: session.metadata?.transferGroup || `order_${order._id}`,
        description: `50% payout for order ${order._id}`,
      });
      console.log(`Transfer OK → seller ${seller._id} : $${amountCents / 100}`);
    } catch (err) {
      console.error(`Transfer failed for seller ${seller._id}:`, err);
      // → Consider: save failed transfer info, notify admin, retry logic, etc.
    }
  }

  // Send confirmation emails
  await sendConfirmationEmails(order, session);
}

async function handleFailedPayment(obj) {
  const orderId = obj.metadata?.orderId;
  if (!orderId) return;

  const order = await Order.findById(orderId);
  if (!order || order.paymentStatus !== 'pending') return;

  order.paymentStatus = 'failed';
  order.failureReason = obj.last_payment_error?.message || 'Payment failed';
  await order.save();

  console.log(`Order ${orderId} marked as failed`);
}

async function handleRefund(charge) {
  const paymentIntentId = charge.payment_intent;
  if (!paymentIntentId) return;

  const order = await Order.findOneAndUpdate(
    { transactionId: paymentIntentId },
    { paymentStatus: 'refunded' },
    { new: true }
  );

  if (order) {
    console.log(`Order ${order._id} marked as refunded`);
    // Optional: notify buyer & sellers, reverse stock, etc.
  }
}

async function sendConfirmationEmails(order, session) {
  try {
    const buyerEmail = order.user?.email || session.customer_email;
    const buyerName = order.user?.firstName || 'Customer';

    if (buyerEmail) {
      await sendEmail({
        to: buyerEmail,
        subject: 'Your Lawbie Purchase Confirmation 🧾',
        html: buyerEmailHtml(order),
      });
      console.log(`Buyer email sent to ${buyerEmail}`);
    }

    // Seller notification (using first seller for simplicity – improve if multi-seller)
    const seller = order.items[0]?.seller;
    if (seller?.email) {
      const sellerShareCents = Math.floor(order.totalAmount * 0.5 * 100); // approximate
      // Better: use saved sellerShares if you have it per seller

      await sendEmail({
        to: seller.email,
        subject: "You've Made a Sale on Lawbie! 🎉",
        html: sellerEmailHtml(order, seller, sellerShareCents / 100),
      });
      console.log(`Seller email sent to ${seller.email}`);
    }
  } catch (err) {
    console.error('Email sending failed:', err.message);
  }
}

// ──────────────────────────────────────────────
// HTML Email Templates
// ──────────────────────────────────────────────

function buyerEmailHtml(order) {
  return `
<div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
  <h2>Thank you for your purchase on Lawbie! 🎉</h2>
  <p>Hi ${order.user?.firstName || 'there'},</p>
  <p>Your order <strong>#${order._id}</strong> has been confirmed.</p>
  <p><strong>Total paid:</strong> $${order.totalAmount.toFixed(2)}</p>
  <p>Your document(s) are now available in your account:</p>
  <p style="text-align: center; margin: 30px 0;">
    <a href="https://lawbie.com/account/orders" 
       style="background: #1a73e8; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold;">
      View My Orders
    </a>
  </p>
  <p>You can always access your downloads by logging into your Lawbie account.</p>
  <p>Questions? Contact us at <a href="mailto:support@lawbie.com">support@lawbie.com</a></p>
  <br/>
  <p>Best regards,<br/><strong>The Lawbie Team</strong><br/>
  <a href="https://lawbie.com">www.lawbie.com</a></p>
</div>`;
}

function sellerEmailHtml(order, seller, sellerShare) {
  const productTitle = order.items[0]?.resource?.title || 'your product';
  return `
<div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
  <h2>Great news — you made a sale! 🎉</h2>
  <p>Hi ${seller.firstName || 'Seller'},</p>
  <p>Your product <strong>${productTitle}</strong> was just purchased.</p>
  <p><strong>You earned $${sellerShare.toFixed(2)}</strong> from this order.</p>
  <p>Funds are being processed via Stripe and will appear according to your payout schedule.</p>
  <p style="text-align: center; margin: 30px 0;">
    <a href="https://lawbie.com/dashboard" 
       style="background: #28a745; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: bold;">
      Go to Dashboard
    </a>
  </p>
  <p>Thank you for being part of Lawbie!</p>
  <br/>
  <p>Best,<br/><strong>The Lawbie Team</strong></p>
</div>`;
}