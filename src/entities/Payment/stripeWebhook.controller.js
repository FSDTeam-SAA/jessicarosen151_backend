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

        // Fetch the PaymentIntent to create a transfer
  const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent);
  
  // Create transfer(s) for each seller
const transferPromises = order.items.map(async (item) => {
  const seller = await User.findById(item.seller);
  
  if (seller && seller.stripeAccountId) {
    const amountToTransfer = Math.floor(item.price * item.quantity * 0.37 * 100); // 37% for seller in cents

    try {
      await stripe.transfers.create({
        amount: amountToTransfer,
        currency: 'usd',
        destination: seller.stripeAccountId, // The connected account ID
        transfer_group: session.metadata.transferGroup, // Link the transfer to the payment
      });

      console.log(`✅ Transfer successful for seller ${seller.email}`);
    } catch (transferErr) {
      console.error(`❌ Transfer failed for seller ${seller.email}:`, transferErr);
    }
  }
});

  
  


        // Wait for all transfers to complete
        await Promise.all(transferPromises);
  
        // Email sending using Promise.all for parallel execution
        const emailPromises = [];

        // ✅ Send purchase confirmation email to buyer
        emailPromises.push(
          (async () => {
            try {
              const user = await User.findById(order.user);
              if (user && user.email) {
                await sendEmail({
                  to: user.email,
                  subject: "Your Lawbie Purchase Confirmation 🧾",
                  html: `
                  <p>Hi ${user.name || 'Customer'},</p>

                  <p>Thank you for your purchase on Lawbie! 🎉</p>

                  <p>Your transaction has been successfully processed, and your document(s) are now available for download.</p>

                  <p><strong>Access your files anytime here:</strong><br/>
                  <a href="https://www.lawbie.com/dashboard/downloads" style="color:#1a73e8;">My Downloads</a></p>

                  <p>You can return to your downloads at any time by logging into your Lawbie account and visiting the My Downloads page.</p>

                  <p>If you have any questions or need assistance, feel free to reach out to us at <a href="mailto:support@lawbie.com">support@lawbie.com</a> — we’re happy to help!</p>

                  <p>Thank you for supporting legal creators and joining the Lawbie community.</p>

                  <p>Best,<br/>
                  The Lawbie Team<br/>
                  <a href="https://www.lawbie.com">www.lawbie.com</a></p>
                  `
                });

                console.log(`✅ Purchase confirmation email sent to buyer: ${user.email}`);
              }
            } catch (emailErr) {
              console.error("❌ Failed to send buyer confirmation email:", emailErr);
            }
          })()
        );

        // ✅ Send sale notification email to seller(s)
        for (const item of order.items) {
          emailPromises.push(
            (async () => {
              try {
                const seller = await User.findById(item.seller);
                if (seller && seller.email) {
                  const productTitle = item.resource?.name || 'Your Product';
                  const sellerEarnings = (item.price * item.quantity * 0.37).toFixed(2);

                  await sendEmail({
                    to: seller.email,
                    subject: "You've Made a Sale on Lawbie! 💼📚",
                    html: `
                    <p>Hi ${seller.name || 'Seller'},</p>

                    <p>Great news — your product, <strong>${productTitle}</strong>, has just been purchased on Lawbie! 🎉</p>

                    <p>You’ve earned <strong>$${sellerEarnings}</strong> from this sale. Funds will be processed automatically through Stripe.</p>

                    <p>You can view all your sales and earnings anytime by visiting your Seller Dashboard:<br/>
                    👉 <a href="https://www.lawbie.com/dashboard/seller" style="color:#1a73e8;">Go To Dashboard</a></p>

                    <p>Thank you for contributing your expertise to the Lawbie community — your work helps lawyers everywhere save time and practice smarter.</p>

                    <p>Best,<br/>
                    The Lawbie Team<br/>
                    <a href="https://www.lawbie.com">www.lawbie.com</a></p>
                    `
                  });

                  console.log(`✅ Sale notification email sent to seller: ${seller.email}`);
                }
              } catch (sellerEmailErr) {
                console.error("❌ Failed to send seller email:", sellerEmailErr);
              }
            })()
          );
        }

        // Wait for all email sending tasks to complete
        await Promise.all(emailPromises);

        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object;
        const paymentIntentId = charge.payment_intent;
        await Order.findOneAndUpdate(
          { transactionId: paymentIntentId },
          { paymentStatus: 'refunded' },
          { new: true }
        );
        break;

        break;
      }

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

      case 'payment_intent.canceled': {
        const intent = event.data.object;
        await Order.findOneAndUpdate(
          { transactionId: intent.id },
          { paymentStatus: 'cancelled' },
          { new: true }
        );
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object;
        await Order.findOneAndUpdate(
          { stripeSessionId: session.id },
          { paymentStatus: 'expired' },
          { new: true }
        );
        break;
      }

      case 'transfer.created': {
        const transfer = event.data.object;
        console.log(`Transfer to seller successful: ${transfer.id}`);
        break;
      }

      case 'transfer.failed': {
        const transfer = event.data.object;
        console.error(`❌ Transfer to seller failed: ${transfer.id}`);
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
