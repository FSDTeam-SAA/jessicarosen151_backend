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
        const order = await Order.findOne({ stripeSessionId: session.id })
          .populate('items.resource')
          .populate('user');

        if (!order) break;

        // Mark order as paid & reduce resource quantity
        order.paymentStatus = 'paid';
        for (const item of order.items) {
          await Resource.findByIdAndUpdate(item.resource._id, {
            $inc: { quantity: -item.quantity }
          });
        }

        order.transactionId = session.payment_intent;
        await order.save();

        // Retrieve PaymentIntent for transfers
        const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent);

        // Transfer 37% to each seller
        for (const item of order.items) {
          const seller = await User.findById(item.seller);
          if (seller && seller.stripeAccountId) {
            const amountToTransfer = Math.floor(item.price * item.quantity * 0.37 * 100); // cents

            try {
              await stripe.transfers.create({
                amount: amountToTransfer,
                currency: 'usd',
                destination: seller.stripeAccountId,
                transfer_group: session.metadata.transferGroup || `order_${order._id}`,
              });
              console.log(`Transfer successful for seller ${seller.email}`);
            } catch (transferErr) {
              console.error(`Transfer failed for seller ${seller.email}:`, transferErr.message);
            }
          }
        }

        // === SEND BUYER CONFIRMATION EMAIL ===
        try {
          const buyer = order.user; // Already populated

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
                Thank you for your purchase on <strong>Lawbie</strong>! Your transaction has been successfully processed.
              </p>
              <div style="background-color:#f8f9fa; border-left:5px solid #1a73e8; padding:20px; margin:30px 0; border-radius:0 8px 8px 0;">
                <p style="margin:0; color:#2c3e50; font-size:15px;">
                  <strong>Your document(s) are now ready for download!</strong><br/>
                  Access them anytime from your account.
                </p>
              </div>
              <div style="text-align:center; margin:35px 0;">
                <a href="https://lawbie.com/account/orders" style="background-color:#1a73e8; color:#ffffff; padding:14px 32px; text-decoration:none; border-radius:50px; font-weight:600; font-size:16px; display:inline-block; box-shadow:0 4px 15px rgba(26,115,232,0.3);">
                  Download My Files
                </a>
              </div>
              <p style="color:#555555; font-size:15px; line-height:1.6; margin:30px 0 0;">
                You can return to your downloads anytime by logging into your Lawbie account and visiting the <strong>My Downloads</strong> page.
              </p>
              <hr style="border:none; border-top:1px solid #eeeeee; margin:35px 0;" />
              <p style="color:#777777; font-size:14px; line-height:1.6;">
                Need help? Our support team is here for you.<br/>
                Email us at <a href="mailto:support@lawbie.com" style="color:#1a73e8; text-decoration:none;">support@lawbie.com</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#1a1a1a; color:#bbbbbb; padding:30px 40px; text-align:center; font-size:13px;">
              <p style="margin:0 0 10px;">Thank you for supporting legal creators and joining the Lawbie community.</p>
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

          await sendEmail({
            to: buyer.email,
            subject: "Your Lawbie Purchase Confirmation",
            html: buyerEmailHTML
          });

          console.log(`Purchase confirmation email sent to buyer: ${buyer.email}`);
        } catch (emailErr) {
          console.error("Failed to send buyer confirmation email:", emailErr);
        }

        // === SEND SELLER NOTIFICATION EMAIL (one per item) ===
        try {
          for (const item of order.items) {
            const seller = await User.findById(item.seller);
            if (!seller || !seller.email) continue;

            const productTitle = item.resource?.name || 'Your Product';
            const sellerEarnings = (item.price * item.quantity * 0.37).toFixed(2);

            const sellerEmailHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>You've Made a Sale on Lawbie!</title>
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
                Great news — your product has just been purchased on Lawbie!
              </p>
              <div style="background-color:#f0f8ff; border:1px solid #bee5eb; border-radius:10px; padding:20px; margin:30px 0;">
                <p style="margin:0; color:#0c5460; font-size:16px;">
                  <strong>Product Sold:</strong> ${productTitle}<br/>
                  <strong>You Earned:</strong> <span style="font-size:20px; color:#28a745;">$${sellerEarnings}</span> (37% commission)
                </p>
              </div>
              <p style="color:#444444; font-size:15px; line-height:1.6; margin:25px 0;">
                Funds will be automatically transferred to your connected Stripe account within the standard payout schedule.
              </p>
              <div style="text-align:center; margin:40px 0;">
                <a href="https://www.lawbie.com/dashboard/seller" style="background-color:#28a745; color:#ffffff; padding:14px 36px; text-decoration:none; border-radius:50px; font-weight:600; font-size:16px; display:inline-block; box-shadow:0 4px 15px rgba(40,167,69,0.3);">
                  View Seller Dashboard
                </a>
              </div>
              <hr style="border:none; border-top:1px dashed #dddddd; margin:40px 0;" />
              <p style="color:#555555; font-size:15px; line-height:1.6; margin:0;">
                Thank you for sharing your legal expertise. Your templates help lawyers save time and deliver better results every day.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#1a1a1a; color:#bbbbbb; padding:30px 40px; text-align:center; font-size:13px;">
              <p style="margin:0 0 10px 0;">Keep creating. Keep earning.</p>
              <p style="margin:0;">
                <strong>Lawbie Team</strong> • 
                <a href="https://www.lawbie.com" style="color:#34c759; text-decoration:none;">lawbie.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

            await sendEmail({
              to: seller.email,
              subject: "You've Made a Sale on Lawbie!",
              html: sellerEmailHTML
            });

            console.log(`Sale notification email sent to seller: ${seller.email}`);
          }
        } catch (sellerEmailErr) {
          console.error("Failed to send seller email:", sellerEmailErr);
        }

        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object;
        await Order.findOneAndUpdate(
          { transactionId: charge.payment_intent },
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

      case 'transfer.created':
        console.log(`Transfer created: ${event.data.object.id}`);
        break;

      case 'transfer.failed':
        console.error(`Transfer failed: ${event.data.object.id}`, event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    generateResponse(res, 200, true, 'Webhook event processed successfully');
  } catch (err) {
    console.error('Webhook handler error:', err);
    generateResponse(res, 500, false, 'Webhook handler error', err.message);
  }
};