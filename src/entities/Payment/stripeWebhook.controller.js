// src/Payment/stripeWebhook.controller.js
import Stripe from 'stripe';
import Order from './order.model.js';
import Resource from '../resource/resource.model.js';
import { generateResponse } from '../../lib/responseFormate.js';
import sendEmail from '../../lib/sendEmail.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

export const stripeWebhookHandler = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  console.log("sig", sig);

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }


  console.log("Evenetasdfasdfasdfasdfasd", event.data.object);


  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const orderId = session.metadata.orderId;
        if (!orderId) break;

        const order = await Order.findById(orderId)
          .populate('items.resource')
          .populate('user')
          .populate('items.seller');
        if (!order || order.paymentStatus === 'paid') break;

        const taxCents = session.total_details?.amount_tax || 0;
        const totalPaidCents = session.amount_total;

        // Update order
        order.paymentStatus = 'paid';
        order.transactionId = session.payment_intent;
        order.totalAmount = totalPaidCents / 100;
        order.taxAmount = taxCents / 100;
        await order.save();

        // Reduce stock
        for (const item of order.items) {
          await Resource.findByIdAndUpdate(
            item.resource._id,
            { $inc: { quantity: -item.quantity } }
          );
        }

        // NO MANUAL TRANSFER — Stripe already paid seller
        const sellerShareCents = Object.values(order.sellerShares || {})[0] || 0;
        console.log(`Order ${order._id} | Seller received $${(sellerShareCents / 100).toFixed(2)} via transfer_data`);

        // ——— SEND BUYER EMAIL ———
        const buyer = order.user || { email: session.customer_email, firstName: 'Customer', lastName: '' };
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
                Thank you for your purchase on <strong>Lawbie</strong>!
              </p>
              <div style="background-color:#f8f9fa; border-left:5px solid #1a73e8; padding:20px; margin:30px 0; border-radius:0 8px 8px 0;">
                <p style="margin:0; color:#2c3e50; font-size:15px;">
                  <strong>Order ID:</strong> #${order._id}<br/>
                  <strong>Subtotal:</strong> $${(order.rawSubtotalCents / 100).toFixed(2)} USD
                  ${order.discountAmount > 0 ? `<br/><strong>Discount:</strong> -$${order.discountAmount.toFixed(2)}` : ''}
                  <br/><strong>Pre-tax:</strong> $${(order.totalAmount - order.taxAmount).toFixed(2)}
                  <br/><strong>Tax (13%):</strong> $${order.taxAmount.toFixed(2)}
                  <br/><strong>Total Paid:</strong> $${order.totalAmount.toFixed(2)} USD
                </p>
              </div>
              <div style="text-align:center; margin:35px 0;">
                <a href="https://lawbie.com/account/orders" style="background-color:#1a73e8; color:#ffffff; padding:14px 32px; text-decoration:none; border-radius:50px; font-weight:600; font-size:16px; display:inline-block; box-shadow:0 4px 15px rgba(26,115,232,0.3);">
                  Download My Files
                </a>
              </div>
              <p style="color:#555555; font-size:15px; line-height:1.6; margin:30px 0 0;">
                Access your downloads from <strong>My Downloads</strong>.
              </p>
              <hr style="border:none; border-top:1px solid #eeeeee; margin:35px 0;" />
              <p style="color:#777777; font-size:14px; line-height:1.6;">
                Questions? Email <a href="mailto:support@lawbie.com" style="color:#1a73e8; text-decoration:none;">support@lawbie.com</a>
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
          await sendEmail({ to: buyer.email, subject: 'Your Lawbie Purchase Confirmation', html: buyerEmailHTML });
        } catch (err) {
          console.error('Buyer email failed:', err.message);
        }

        // ——— SEND SELLER EMAIL ———
        const seller = order.items[0]?.seller;
        if (seller?.email) {
          const productTitles = order.items.map(i => i.resource?.title || 'Product').join(', ');
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
              <h1 style="color:#ffffff; margin:0; font-size:28px; font-weight:700;">Sale Confirmed!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <h2 style="color:#1a1a1a; margin:0 0 20px; font-size:24px;">Hi ${seller.name || 'Seller'},</h2>
              <p style="color:#333333; font-size:16px; line-height:1.6; margin:0 0 24px;">
                Your product(s) have been purchased!
              </p>
              <div style="background-color:#f0f8ff; border:1px solid #bee5eb; border-radius:10px; padding:20px; margin:30px 0;">
                <p style="margin:0; color:#0c5460; font-size:16px;">
                  <strong>Product(s):</strong> ${productTitles}<br/>
                  <strong>Your Earnings:</strong> <span style="font-size:20px; color:#28a745;">$${(sellerShareCents / 100).toFixed(2)}</span> (50% of pre-tax)
                </p>
              </div>
              <p style="color:#444444; font-size:15px; line-height:1.6; margin:25px 0;">
                Funds are in your Stripe account.
              </p>
              <div style="text-align:center; margin:40px 0;">
                <a href="https://lawbie.com/dashboard/seller" style="background-color:#28a745; color:#ffffff; padding:14px 36px; text-decoration:none; border-radius:50px; font-weight:600; font-size:16px; display:inline-block; box-shadow:0 4px 15px rgba(40,167,69,0.3);">
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
            await sendEmail({ to: seller.email, subject: 'You Made a Sale!', html: sellerEmailHTML });
          } catch (err) {
            console.error('Seller email failed:', err.message);
          }
        }

        break;
      }

      case 'charge.refunded':
      case 'payment_intent.canceled':
      case 'checkout.session.expired':
        // Handle status updates
        break;

      default:
        console.log(`Unhandled event: ${event.type}`);
    }

    generateResponse(res, 200, true, 'Webhook processed');
  } catch (err) {
    console.error('Webhook error:', err);
    generateResponse(res, 500, false, 'Server error', err.message);
  }
};