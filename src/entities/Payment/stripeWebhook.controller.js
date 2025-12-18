// src/Payment/stripeWebhook.controller.js
import Stripe from 'stripe';
import Order from './order.model.js';
import Resource from '../resource/resource.model.js';
import { generateResponse } from '../../lib/responseFormate.js';
import sendEmail from '../../lib/sendEmail.js';

// import Stripe from 'stripe';
// import Order from './order.model.js';
// import Resource from '../resource/resource.model.js';
// import { generateResponse } from '../../lib/responseFormate.js';
// import sendEmail from '../../lib/sendEmail.js';

// import Stripe from 'stripe';
// import Order from './order.model.js';
// import Resource from '../resource/resource.model.js';
// import { generateResponse } from '../../lib/responseFormate.js';
// import sendEmail from '../../lib/sendEmail.js';

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
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    console.log('payment event', event.type);
    switch (event.type) {
      case 'checkout.session.completed':
        await handlePayment(event.data.object);
        break;

      case 'payment_intent.succeeded':
        if (event.data.object.metadata?.orderId)
          await handlePaymentFromIntent(event.data.object);
        break;

      case 'checkout.session.expired':
      case 'payment_intent.payment_failed':
      case 'charge.failed':
        await handleFailedPayment(event.data.object);
        break;

      default:
        break;
    }

    generateResponse(res, 200, true, 'Webhook processed');
  } catch (err) {
    console.error('Webhook error:', err);
    generateResponse(res, 500, false, 'Webhook error', err.message);
  }
};

const handlePayment = async (session) => {
  const order = await Order.findById(session.metadata.orderId)
    .populate('items.resource')
    .populate('user')
    .populate('items.seller');
  if (!order || order.paymentStatus === 'paid') return;

  order.paymentStatus = 'paid';
  order.transactionId = session.payment_intent;
  order.totalAmount = session.amount_total / 100;
  order.taxAmount = (session.total_details?.amount_tax || 0) / 100;
  order.paidAt = new Date();
  await order.save();

  // Reduce stock
  for (const item of order.items) {
    await Resource.findByIdAndUpdate(item.resource._id, {
      $inc: { quantity: -item.quantity }
    });
  }

  // Send emails
  await sendEmails(order, session);
};

const handlePaymentFromIntent = async (intent) => {
  const order = await Order.findById(intent.metadata.orderId)
    .populate('items.resource')
    .populate('user')
    .populate('items.seller');
  if (!order || order.paymentStatus === 'paid') return;

  order.paymentStatus = 'paid';
  order.transactionId = intent.id;
  order.totalAmount = intent.amount / 100;
  order.paidAt = new Date();
  await order.save();

  for (const item of order.items) {
    await Resource.findByIdAndUpdate(item.resource._id, {
      $inc: { quantity: -item.quantity }
    });
  }

  await sendEmails(order, { customer_email: intent.receipt_email });
};

const handleFailedPayment = async (failedObject) => {
  const orderId = failedObject.metadata?.orderId;
  if (!orderId) return;

  const order = await Order.findById(orderId);
  if (order && order.paymentStatus === 'pending') {
    order.paymentStatus = 'failed';
    order.failureReason =
      failedObject.last_payment_error?.message || 'Payment failed';
    await order.save();
  }
};

const sendEmails = async (order, session) => {
  try {
    // Buyer Email
    // const buyerEmail = order.user?.email || session.customer_email;
    // if (buyerEmail) {
    //   await sendEmail({
    //     to: buyerEmail,
    //     subject: 'Purchase Confirmation',
    //     html: `<p>Hi ${order.user?.firstName || 'Customer'}, Your order #${order._id} is confirmed.</p>
    //            <p>Total Paid: $${order.totalAmount}</p>`
    //   });
    // }

    // // Seller Email
    // const seller = order.items[0]?.seller;
    // if (seller?.email) {
    //   const sellerShare = Object.values(order.sellerShares || {})[0] / 100;
    //   await sendEmail({
    //     to: seller.email,
    //     subject: 'You Made a Sale!',
    //     html: `<p>Hi ${seller.firstName || 'Seller'}, you earned $${sellerShare} from order #${order._id}</p>`
    //   });
    // }

    const buyerEmailHtml = (order) => `
  <div style="font-family: Arial, sans-serif; color: #333;">
    <p>Hi ${order.user?.firstName || 'Customer'},</p>

    <p>
      Thank you for your purchase on <strong>Lawbie</strong> 🎉
    </p>

    <p>
      Your transaction has been successfully processed, and your document(s)
      are now available for download.
    </p>

    <p>
      <strong>Access your files anytime here:</strong><br/>
      <a href="https://lawbie.com/my-downloads" target="_blank">
        My Downloads
      </a>
    </p>

    <p>
      You can return to your downloads at any time by logging into your
      Lawbie account and visiting the My Downloads page.
    </p>

    <p>
      If you have any questions or need assistance, feel free to reach out to us
      at <a href="mailto:support@lawbie.com">support@lawbie.com</a>.
    </p>

    <br/>

    <p>— we’re happy to help!</p>

    <p>
      Thank you for supporting legal creators and joining the Lawbie community.
    </p>

    <br/>

    <p>
      Best,<br/>
      <strong>The Lawbie Team</strong><br/>
      <a href="https://lawbie.com" target="_blank">www.lawbie.com</a>
    </p>
  </div>
`;

    // Buyer Email
    const buyerEmail = order.user?.email || session.customer_email;
    if (buyerEmail) {
      await sendEmail({
        to: buyerEmail,
        subject: 'Your Lawbie Purchase Confirmation 🧾',
        html: buyerEmailHtml(order)
      });
    }

    const sellerEmailHtml = (order, sellerShare) => `
  <div style="font-family: Arial, sans-serif; color: #333;">
    <p>Hi ${order.items[0]?.seller?.firstName || 'Seller'},</p>

    <p>
      Great news — your product,
      <strong>${order.items[0]?.product?.title || 'your product'}</strong>,
      has just been purchased on <strong>Lawbie</strong> 🎉
    </p>

    <p>
      <strong>You’ve earned $${sellerShare}</strong> from this sale.
    </p>

    <p>
      Funds will be processed automatically through Stripe.
    </p>

    <p>
      You can view all your sales and earnings anytime by visiting your
      Seller Dashboard:
      <br/>
      👉 <a href="https://lawbie.com/seller/dashboard" target="_blank">
        Go to Dashboard
      </a>
    </p>

    <p>
      Thank you for contributing your expertise to the Lawbie community —
      your work helps lawyers everywhere save time and practice smarter.
    </p>

    <br/>

    <p>
      Best,<br/>
      <strong>The Lawbie Team</strong><br/>
      <a href="https://lawbie.com" target="_blank">www.lawbie.com</a>
    </p>
  </div>
`;

    // Seller Email
    const seller = order.items[0]?.seller;
    if (seller?.email) {
      const sellerShare = Object.values(order.sellerShares || {})[0] / 100;

      await sendEmail({
        to: seller.email,
        subject: "You've Made a Sale on Lawbie 🎉",
        html: sellerEmailHtml(order, sellerShare)
      });
    }
  } catch (err) {
    console.error('Email sending failed:', err.message);
  }
};

// ============================================================================

// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
//   apiVersion: '2023-06-20',
// });

// export const stripeWebhookHandler = async (req, res) => {
//   const sig = req.headers['stripe-signature'];
//   let event;

//   console.log("🔔 Webhook received");

//   try {
//     event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
//     console.log(`✅ Webhook verified: ${event.type}`);
//   } catch (err) {
//     console.error('❌ Webhook signature verification failed:', err.message);
//     return res.status(400).send(`Webhook Error: ${err.message}`);
//   }

//   // Log the event for debugging
//   console.log(`📦 Event type: ${event.type}`);
//   console.log('Event ID:', event.id);
//   console.log('Event object:', JSON.stringify(event.data.object, null, 2));

//   try {
//     switch (event.type) {
//       case 'checkout.session.completed': {
//         console.log("✅ Checkout session completed - processing payment");
//         await handleSuccessfulPayment(event.data.object);
//         break;
//       }

//       case 'payment_intent.succeeded': {
//         console.log("✅ Payment intent succeeded");
//         const paymentIntent = event.data.object;

//         // Try to get session from payment intent
//         if (paymentIntent.invoice) {
//           const session = await stripe.checkout.sessions.retrieve(
//             paymentIntent.invoice,
//             { expand: ['line_items'] }
//           );
//           if (session) {
//             await handleSuccessfulPayment(session);
//           }
//         } else if (paymentIntent.metadata?.orderId) {
//           await handleSuccessfulPaymentFromPaymentIntent(paymentIntent);
//         }
//         break;
//       }

//       case 'checkout.session.async_payment_succeeded': {
//         console.log("✅ Async payment succeeded");
//         await handleSuccessfulPayment(event.data.object);
//         break;
//       }

//       case 'application_fee.created': {
//         console.log("ℹ️ Application fee created - payment processing");
//         // This is expected but doesn't mean payment is complete
//         break;
//       }

//       case 'charge.succeeded': {
//         console.log("✅ Charge succeeded");
//         const charge = event.data.object;
//         if (charge.invoice) {
//           const session = await stripe.checkout.sessions.retrieve(charge.invoice);
//           if (session) {
//             await handleSuccessfulPayment(session);
//           }
//         }
//         break;
//       }

//       case 'checkout.session.expired':
//       case 'payment_intent.payment_failed':
//       case 'charge.failed': {
//         console.log(`❌ Payment failed: ${event.type}`);
//         await handleFailedPayment(event.data.object);
//         break;
//       }

//       default:
//         console.log(`⚡ Unhandled event type: ${event.type}`);
//     }

//     generateResponse(res, 200, true, 'Webhook processed successfully');
//   } catch (err) {
//     console.error('💥 Webhook processing error:', err);
//     generateResponse(res, 500, false, 'Server error processing webhook', err.message);
//   }
// };

// // Main function for handling successful payments
// async function handleSuccessfulPayment(session) {
//   console.log("💰 Processing successful payment for session:", session.id);

//   const orderId = session.metadata?.orderId;
//   if (!orderId) {
//     console.error('❌ No orderId in session metadata');
//     return;
//   }

//   console.log('📋 Looking for order:', orderId);

//   const order = await Order.findById(orderId)
//     .populate('items.resource')
//     .populate('user')
//     .populate('items.seller');

//   if (!order) {
//     console.error('❌ Order not found:', orderId);
//     return;
//   }

//   if (order.paymentStatus === 'paid') {
//     console.log('✅ Order already paid:', orderId);
//     return;
//   }

//   console.log('🔄 Updating order status to paid');

//   const taxCents = session.total_details?.amount_tax || 0;
//   const totalPaidCents = session.amount_total;

//   // Update order
//   order.paymentStatus = 'paid';
//   order.transactionId = session.payment_intent;
//   order.totalAmount = totalPaidCents / 100;
//   order.taxAmount = taxCents / 100;
//   order.paidAt = new Date();
//   await order.save();

//   console.log(`✅ Order ${orderId} marked as paid - Amount: $${order.totalAmount}`);

//   // Reduce stock
//   console.log('📦 Reducing stock for ordered items');
//   for (const item of order.items) {
//     await Resource.findByIdAndUpdate(
//       item.resource._id,
//       { $inc: { quantity: -item.quantity } }
//     );
//     console.log(`➖ Reduced stock for resource: ${item.resource._id} by ${item.quantity}`);
//   }

//   // Send emails
//   console.log('📧 Sending confirmation emails');
//   await sendEmails(order, session);

//   console.log(`🎉 Order ${orderId} processing completed successfully`);
// }

// // Fallback handler for payment_intent.succeeded
// async function handleSuccessfulPaymentFromPaymentIntent(paymentIntent) {
//   const orderId = paymentIntent.metadata.orderId;
//   console.log("🔄 Processing payment intent success for order:", orderId);

//   const order = await Order.findById(orderId)
//     .populate('items.resource')
//     .populate('user')
//     .populate('items.seller');

//   if (!order || order.paymentStatus === 'paid') return;

//   order.paymentStatus = 'paid';
//   order.transactionId = paymentIntent.id;
//   order.totalAmount = paymentIntent.amount / 100;
//   order.paidAt = new Date();
//   await order.save();

//   console.log(`✅ Order ${orderId} marked as paid via payment intent`);

//   // Reduce stock
//   for (const item of order.items) {
//     await Resource.findByIdAndUpdate(
//       item.resource._id,
//       { $inc: { quantity: -item.quantity } }
//     );
//   }

//   await sendEmails(order, { customer_email: paymentIntent.receipt_email });
// }

// // Handle failed payments
// async function handleFailedPayment(failedObject) {
//   const orderId = failedObject.metadata?.orderId;
//   if (!orderId) return;

//   const order = await Order.findById(orderId);
//   if (order && order.paymentStatus === 'pending') {
//     order.paymentStatus = 'failed';
//     order.failureReason = failedObject.last_payment_error?.message || 'Payment failed';
//     await order.save();
//     console.log(`❌ Order ${orderId} marked as failed`);
//   }
// }

// // Email sending function
// async function sendEmails(order, session) {
//   try {
//     // ——— SEND BUYER EMAIL ———
//     const buyerEmail = order.user?.email || session.customer_email;
//     const buyerName = order.user?.firstName || 'Customer';

//     if (buyerEmail) {
//       const buyerEmailHTML = `
// <!DOCTYPE html>
// <html lang="en">
// <head>
//   <meta charset="UTF-8" />
//   <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
//   <title>Your Lawbie Purchase Confirmation</title>
// </head>
// <body style="margin:0; padding:0; background-color:#f4f7fa; font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
//   <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f7fa; padding:20px 0;">
//     <tr>
//       <td align="center">
//         <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 10px 30px rgba(0,0,0,0.05);">
//           <tr>
//             <td style="background: linear-gradient(135deg, #1a73e8, #0d47a1); padding:30px 40px; text-align:center;">
//               <h1 style="color:#ffffff; margin:0; font-size:28px; font-weight:600;">Lawbie</h1>
//               <p style="color:#e3f2fd; margin:10px 0 0; font-size:16px;">Legal Documents Marketplace</p>
//             </td>
//           </tr>
//           <tr>
//             <td style="padding:40px 40px 30px;">
//               <h2 style="color:#1a1a1a; margin:0 0 20px; font-size:24px;">Hi ${buyerName},</h2>
//               <p style="color:#333333; font-size:16px; line-height:1.6; margin:0 0 24px;">
//                 Thank you for your purchase on <strong>Lawbie</strong>!
//               </p>
//               <div style="background-color:#f8f9fa; border-left:5px solid #1a73e8; padding:20px; margin:30px 0; border-radius:0 8px 8px 0;">
//                 <p style="margin:0; color:#2c3e50; font-size:15px;">
//                   <strong>Order ID:</strong> #${order._id}<br/>
//                   <strong>Subtotal:</strong> $${(order.rawSubtotalCents / 100).toFixed(2)} USD
//                   ${order.discountAmount > 0 ? `<br/><strong>Discount:</strong> -$${order.discountAmount.toFixed(2)}` : ''}
//                   <br/><strong>Pre-tax:</strong> $${(order.totalAmount - order.taxAmount).toFixed(2)}
//                   <br/><strong>Tax:</strong> $${order.taxAmount.toFixed(2)}
//                   <br/><strong>Total Paid:</strong> $${order.totalAmount.toFixed(2)} USD
//                 </p>
//               </div>
//               <div style="text-align:center; margin:35px 0;">
//                 <a href="${process.env.FRONTEND_URL}/account/downloads" style="background-color:#1a73e8; color:#ffffff; padding:14px 32px; text-decoration:none; border-radius:50px; font-weight:600; font-size:16px; display:inline-block; box-shadow:0 4px 15px rgba(26,115,232,0.3);">
//                   Download My Files
//                 </a>
//               </div>
//               <p style="color:#555555; font-size:15px; line-height:1.6; margin:30px 0 0;">
//                 Access your downloads from <strong>My Downloads</strong> in your account.
//               </p>
//               <hr style="border:none; border-top:1px solid #eeeeee; margin:35px 0;" />
//               <p style="color:#777777; font-size:14px; line-height:1.6;">
//                 Questions? Email <a href="mailto:support@lawbie.com" style="color:#1a73e8; text-decoration:none;">support@lawbie.com</a>
//               </p>
//             </td>
//           </tr>
//           <tr>
//             <td style="background-color:#1a1a1a; color:#bbbbbb; padding:30px 40px; text-align:center; font-size:13px;">
//               <p style="margin:0 0 10px;">Thank you for supporting legal creators.</p>
//               <p style="margin:0; font-size:12px;">
//                 <strong>The Lawbie Team</strong><br/>
//                 <a href="https://www.lawbie.com" style="color:#1a73e8; text-decoration:none;">www.lawbie.com</a>
//               </p>
//             </td>
//           </tr>
//         </table>
//       </td>
//     </tr>
//   </table>
// </body>
// </html>`;

//       await sendEmail({
//         to: buyerEmail,
//         subject: 'Your Lawbie Purchase Confirmation',
//         html: buyerEmailHTML
//       });
//       console.log('✅ Buyer email sent to:', buyerEmail);
//     }

//     // ——— SEND SELLER EMAIL ———
//     const seller = order.items[0]?.seller;
//     if (seller?.email) {
//       const productTitles = order.items.map(i => i.resource?.title || 'Product').join(', ');
//       const sellerShareCents = Object.values(order.sellerShares || {})[0] || 0;

//       const sellerEmailHTML = `
// <!DOCTYPE html>
// <html lang="en">
// <head>
//   <meta charset="UTF-8" />
//   <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
//   <title>Sale on Lawbie!</title>
// </head>
// <body style="margin:0; padding:0; background-color:#f4f7fa; font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
//   <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f7fa; padding:20px 0;">
//     <tr>
//       <td align="center">
//         <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 10px 30px rgba(0,0,0,0.05);">
//           <tr>
//             <td style="background: linear-gradient(135deg, #34c759, #28a745); padding:40px; text-align:center;">
//               <h1 style="color:#ffffff; margin:0; font-size:28px; font-weight:700;">Sale Confirmed!</h1>
//             </td>
//           </tr>
//           <tr>
//             <td style="padding:40px;">
//               <h2 style="color:#1a1a1a; margin:0 0 20px; font-size:24px;">Hi ${seller.name || 'Seller'},</h2>
//               <p style="color:#333333; font-size:16px; line-height:1.6; margin:0 0 24px;">
//                 Your product(s) have been purchased on Lawbie!
//               </p>
//               <div style="background-color:#f0f8ff; border:1px solid #bee5eb; border-radius:10px; padding:20px; margin:30px 0;">
//                 <p style="margin:0; color:#0c5460; font-size:16px;">
//                   <strong>Product(s):</strong> ${productTitles}<br/>
//                   <strong>Your Earnings:</strong> <span style="font-size:20px; color:#28a745;">$${(sellerShareCents / 100).toFixed(2)}</span> (50% of pre-tax)
//                 </p>
//               </div>
//               <p style="color:#444444; font-size:15px; line-height:1.6; margin:25px 0;">
//                 Funds have been transferred to your Stripe account and will be available according to your payout schedule.
//               </p>
//               <div style="text-align:center; margin:40px 0;">
//                 <a href="${process.env.FRONTEND_URL}/dashboard/seller" style="background-color:#28a745; color:#ffffff; padding:14px 36px; text-decoration:none; border-radius:50px; font-weight:600; font-size:16px; display:inline-block; box-shadow:0 4px 15px rgba(40,167,69,0.3);">
//                   View Dashboard
//                 </a>
//               </div>
//             </td>
//           </tr>
//           <tr>
//             <td style="background-color:#1a1a1a; color:#bbbbbb; padding:30px 40px; text-align:center; font-size:13px;">
//               <p style="margin:0 0 10px 0;">Keep creating. Keep earning.</p>
//               <p style="margin:0;">
//                 <strong>Lawbie Team</strong> • <a href="https://www.lawbie.com" style="color:#34c759; text-decoration:none;">lawbie.com</a>
//               </p>
//             </td>
//           </tr>
//         </table>
//       </td>
//     </tr>
//   </table>
// </body>
// </html>`;

//       await sendEmail({
//         to: seller.email,
//         subject: 'You Made a Sale on Lawbie!',
//         html: sellerEmailHTML
//       });
//       console.log('✅ Seller email sent to:', seller.email);
//     }

//   } catch (err) {
//     console.error('❌ Email sending failed:', err.message);
//   }
// }

// // Debug endpoint to check webhook configuration
// export const webhookDebug = async (req, res) => {
//   console.log("🔍 Webhook debug endpoint hit");
//   console.log("Headers:", req.headers);
//   console.log("Body:", req.body);

//   generateResponse(res, 200, true, 'Webhook debug endpoint working', {
//     timestamp: new Date().toISOString(),
//     headers: req.headers,
//     body: req.body
//   });
// };
