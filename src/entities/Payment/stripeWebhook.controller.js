import Stripe from 'stripe';
import Order from '../Payment/order.model.js';
import User from '../auth/auth.model.js';
import { generateResponse } from '../../lib/responseFormate.js';
import Resource from '../resource/resource.model.js';
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
    console.error('Stripe webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const order = await Order.findOne({ stripeSessionId: session.id }).populate('items.resource');

        if (!order) break;

        order.paymentStatus = 'paid';
        for (const item of order.items) {
          await Resource.findByIdAndUpdate(item.resource, {
            $inc: { quantity: -item.quantity }
          });
        }

        order.transactionId = session.payment_intent;
        await order.save();

        // Send 50% payout to each seller
        for (const item of order.items) {
          const seller = await User.findById(item.seller);
          if (seller?.role === 'SELLER' && seller.stripeAccountId) {
            const transferAmount = Math.floor(item.price * item.quantity * 0.5 * 100);
            try {
              await stripe.transfers.create({
                amount: transferAmount,
                currency: 'usd',
                destination: seller.stripeAccountId,
                transfer_group: session.metadata.transferGroup,
              });
              console.log(`Transfer succeeded for seller ${seller._id} amount: ${transferAmount}`);
            } catch (error) {
              console.error(`Transfer failed for seller ${seller._id}:`, error);
            }
          }
        }

        // 📩 Send order confirmation email to user
        try {
          const user = await User.findById(order.user); // Assuming `order.user` stores the buyer's ID
          if (user && user.email) {
            const productList = order.items.map(item => {
              return `<li>${item.resource.name} - Qty: ${item.quantity} - $${item.price}</li>`;
            }).join("");

            await sendEmail({
              to: user.email,
              subject: "Order Confirmation - Thank You for Your Purchase!",
              html: `
          <h2>Hi ${user.name || 'Customer'},</h2>
          <p>Thank you for your order! Here are your purchased items:</p>
          <ul>${productList}</ul>
          <p>Total Paid: <strong>$${order.items.reduce((total, item) => total + (item.price * item.quantity), 0)}</strong></p>
          <p>We’ll notify you once your items are shipped.</p>
          <br/>
          <p>Best regards,<br/>Your Company Team</p>
        `
            });

            console.log(`Order confirmation email sent to ${user.email}`);
          }
        } catch (emailErr) {
          console.error("Failed to send order confirmation email:", emailErr);
        }

        break;
      }



      // Refund successful
      case 'charge.refunded': {
        const charge = event.data.object;
        const paymentIntentId = charge.payment_intent;
        await Order.findOneAndUpdate(
          { transactionId: paymentIntentId },
          { paymentStatus: 'refunded' },
          { new: true }
        );
        break;
      }

      //  Manual payment canceled (by user or system)
      case 'payment_intent.canceled': {
        const intent = event.data.object;
        await Order.findOneAndUpdate(
          { transactionId: intent.id },
          { paymentStatus: 'cancelled' },
          { new: true }
        );
        break;
      }

      //  Checkout session expired (no payment completed)
      case 'checkout.session.expired': {
        const session = event.data.object;
        await Order.findOneAndUpdate(
          { stripeSessionId: session.id },
          { paymentStatus: 'expired' },
          { new: true }
        );
        break;
      }

      // Transfer to seller created successfully
      case 'transfer.created': {
        const transfer = event.data.object;
        console.log(`Transfer to seller successful: ${transfer.id}`);
        break;
      }

      // Transfer failed
      case 'transfer.failed': {
        const transfer = event.data.object;
        console.error(`❌ Transfer to seller failed: ${transfer.id}`);
        // Optional: log or alert admins here
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    generateResponse(res, 200, true, 'Webhook event processed successfully');
  } catch (err) {
    console.error('Webhook handler error:', err);
    generateResponse(res, 500, false, 'Webhook handler error', err.message);
  }
};
