// src/Payment/stripeWebhook.controller.js
import Stripe from 'stripe';
import Order from './order.model.js';
import Resource from '../resource/resource.model.js';
import { generateResponse } from '../../lib/responseFormate.js';
import sendEmail from '../../lib/sendEmail.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const stripeWebhookHandler = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  // === 1. Verify Webhook Signature ===
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
    // === 2. Handle Webhook Events ===
    switch (event.type) {

      // ——————————————————————————————————————
      // PAYMENT SUCCESS – MAIN EVENT
      // ——————————————————————————————————————
      case 'checkout.session.completed': {
        const session = event.data.object;
        const orderId = session.metadata.orderId;

        if (!orderId) {
          console.warn('No orderId in session metadata');
          break;
        }

        const order = await Order.findById(orderId)
          .populate('items.resource')
          .populate('user')
          .populate('items.seller');

        if (!order || order.paymentStatus === 'paid') break;

        // Update order
        order.paymentStatus = 'paid';
        order.transactionId = session.payment_intent;
        order.totalAmount = session.amount_total / 100;
        order.taxAmount = (session.total_details?.amount_tax || 0) / 100;
        order.discountAmount = (session.total_details?.amount_discount || 0) / 100;
        await order.save();

        // Reduce stock
        for (const item of order.items) {
          await Resource.findByIdAndUpdate(item.resource._id, {
            $inc: { quantity: -item.quantity },
          });
        }

        console.log(`Order ${order._id} paid. Split: 50% seller, 50% Lawbie. Tax: $${order.taxAmount}`);

        // ——— SEND BUYER EMAIL ———
        const buyer = order.user || {
          email: session.customer_email,
          firstName: 'Customer',
          lastName: '',
        };

        const buyerEmailHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Your Lawbie Purchase Confirmation</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f7fa; font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f7fa; padding:20px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 10px 30px rgba(0,0,0,0.05);">
          <tr>
            <td style="background: linear-gradient(135deg, #1a73e8, #0d47a1); padding:30px 40px; text-align:center;">
              <h1 style="color:#ffffff; margin:0; font-size:28px; font-weight:600;">Lawbie</h1>
              <p style="color:#e3f2fd; margin:10px 0 0; font-size:16px;">Legal Documents Marketplace</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 30px;">
              <h2 style="color:#1a1a1a; margin:0 0 20px; font-size:24px;">Hi ${buyer.firstName} ${buyer.lastName || ''},</h2>
              <p style="color:#333333; font-size:16px; line-height:1.6; margin:0 0 24px;">
                Thank you for your purchase on <strong>Lawbie</strong>! Your payment has been successfully processed.
              </p>
              <div style="background-color:#f8f9fa; border-left:5px solid #1a73e8; padding:20px; margin:30px 0; border-radius:0 8px 8px 0;">
                <p style="margin:0; color:#2c3e50; font-size:15px;">
                  <strong>Order ID:</strong> #${order._id}<br/>
                  <strong>Total Paid:</strong> $${(session.amount_total / 100).toFixed(2)} USD
                  ${order.taxAmount > 0 ? `<br/><strong>Tax:</strong> $${order.taxAmount.toFixed(2)}` : ''}
                </p>
              </div>
              <div style="text-align:center; margin:35px 0;">
                <a href="https://lawbie.com/account/orders" style="background-color:#1a73e8; color:#ffffff; padding:14px 32px; text-decoration:none; border-radius:50px; font-weight:600; font-size:16px; display:inline-block; box-shadow:0 4px 15px rgba(26,115,232,0.3);">
                  Download My Files
                </a>
              </div>
              <p style="color:#555555; font-size:15px; line-height:1.6; margin:30px 0 0;">
                You can access your downloads anytime from your <strong>My Downloads</strong> page.
              </p>
              <hr style="border:none; border-top:1px solid #eeeeee; margin:35px 0;" />
              <p style="color:#777777; font-size:14px; line-height:1.6;">
                Questions? Email us at <a href="mailto:support@lawbie.com" style="color:#1a73e8; text-decoration:none;">support@lawbie.com</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#1a1a1a; color:#bbbbbb; padding:30px 40px; text-align:center; font-size:13px;">
              <p style="margin:0 0 10px;">Thank you for supporting legal creators.</p>
              <p style="margin:0; font-size:12px;">
                <strong>The Lawbie Team</strong><br/>
                <a href="https://www.lawbie.com" style="color:#1a73e8; text-decoration:none;">www.lawbie.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

        try {
          await sendEmail({
            to: buyer.email,
            subject: 'Your Lawbie Purchase Confirmation',
            html: buyerEmailHTML,
          });
          console.log(`Buyer email sent: ${buyer.email}`);
        } catch (emailErr) {
          console.error('Failed to send buyer email:', emailErr.message);
        }

        // ——— SEND SELLER EMAILS (one per item) ———
        for (const item of order.items) {
          const seller = item.seller;
          if (!seller?.email) continue;

          const earnings = (item.price * item.quantity * 0.5).toFixed(2);
          const productTitle = item.resource?.name || 'Product';

          const sellerEmailHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Sale on Lawbie!</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f7fa; font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f7fa; padding:20px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 10px 30px rgba(0,0,0,0.05);">
          <tr>
            <td style="background: linear-gradient(135deg, #34c759, #28a745); padding:40px; text-align:center;">
              <div style="font-size:50px; margin-bottom:10px;">Celebration</div>
              <h1 style="color:#ffffff; margin:0; font-size:28px; font-weight:700;">Sale Confirmed!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <h2 style="color:#1a1a1a; margin:0 0 20px; font-size:24px;">Hi ${seller.name || 'Seller'},</h2>
              <p style="color:#333333; font-size:16px; line-height:1.6; margin:0 0 24px;">
                Your product has been purchased on Lawbie!
              </p>
              <div style="background-color:#f0f8ff; border:1px solid #bee5eb; border-radius:10px; padding:20px; margin:30px 0;">
                <p style="margin:0; color:#0c5460; font-size:16px;">
                  <strong>Product:</strong> ${productTitle}<br/>
                  <strong>Earnings:</strong> <span style="font-size:20px; color:#28a745;">$${earnings}</span> (50% commission)
                </p>
              </div>
              <p style="color:#444444; font-size:15px; line-height:1.6; margin:25px 0;">
                Funds are automatically sent to your Stripe account.
              </p>
              <div style="text-align:center; margin:40px 0;">
                <a href="https://www.lawbie.com/dashboard/seller" style="background-color:#28a745; color:#ffffff; padding:14px 36px; text-decoration:none; border-radius:50px; font-weight:600; font-size:16px; display:inline-block; box-shadow:0 4px 15px rgba(40,167,69,0.3);">
                  View Dashboard
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color:#1a1a1a; color:#bbbbbb; padding:30px 40px; text-align:center; font-size:13px;">
              <p style="margin:0 0 10px 0;">Keep creating. Keep earning.</p>
              <p style="margin:0;">
                <strong>Lawbie Team</strong> • <a href="https://www.lawbie.com" style="color:#34c759; text-decoration:none;">lawbie.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

          try {
            await sendEmail({
              to: seller.email,
              subject: 'You Made a Sale on Lawbie! (50% Earnings)',
              html: sellerEmailHTML,
            });
            console.log(`Seller email sent: ${seller.email}`);
          } catch (emailErr) {
            console.error(`Failed to send seller email (${seller.email}):`, emailErr.message);
          }
        }

        break;
      }

      // ——————————————————————————————————————
      // REFUNDS & CANCELLATIONS
      // ——————————————————————————————————————
      case 'charge.refunded': {
        const charge = event.data.object;
        await Order.findOneAndUpdate(
          { transactionId: charge.payment_intent },
          { paymentStatus: 'refunded' },
          { new: true }
        );
        console.log(`Order refunded: ${charge.payment_intent}`);
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

      // ——————————————————————————————————————
      // LOGGING
      // ——————————————————————————————————————
      case 'transfer.created':
        console.log(`Transfer created: ${event.data.object.id}`);
        break;

      case 'transfer.failed':
        console.error(`Transfer failed: ${event.data.object.id}`, event.data.object);
        break;

      default:
        console.log(`Unhandled event: ${event.type}`);
    }

    // === 3. Respond to Stripe ===
    generateResponse(res, 200, true, 'Webhook processed successfully');
  } catch (err) {
    console.error('Webhook handler error:', err);
    generateResponse(res, 500, false, 'Server error', err.message);
  }
};

