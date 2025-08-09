// import { generateResponse } from '../../lib/responseFormate.js';
// import { createCheckoutSession } from '../Payment/payment.service.js';
// import {order} from './order.model.js'
// export const initiateCheckout = async (req, res) => {
//   const userId = req.user?.id;
//    const items = req.body.items;
//   console.log(userId);
//   try {
//     const session = await createCheckoutSession(userId,{  itemsFromFrontend: items,promoCode: req.body.promoCode});
    
//     generateResponse(res, 200, true, 'Checkout session created successfully', {
//       sessionId: session.sessionId,
//       url: session.url,   
//     });
//   } catch (error) {
//     generateResponse(res, 500, false, 'Failed to create checkout session', error.message);
//   }
// };
import { generateResponse } from '../../lib/responseFormate.js';
import Guest from '../auth.guest/auth.guest.model.js';
import { createCheckoutSession } from '../Payment/payment.service.js';

export const initiateCheckout = async (req, res) => {
  const userId = req.user?.id || null;
  let guestId = null;

  // If no logged-in user, create guest record if guest info is provided
  if (!userId && req.body.guest) {
    try {
      const guestDoc = await Guest.create(req.body.guest);
      guestId = guestDoc._id;
    } catch (error) {
      return generateResponse(res, 500, false, 'Failed to create guest record', error.message);
    }
  } else if (req.body.guestId) {
    guestId = req.body.guestId;
  }

  const items = req.body.items;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return generateResponse(res, 400, false, 'No items provided', null);
  }



  try {
    const session = await createCheckoutSession({
      userId,
      guestId,
      itemsFromFrontend: items,
      promoCode: req.body.promoCode,
    });

    generateResponse(res, 200, true, 'Checkout session created successfully', {
      sessionId: session.sessionId,
      url: session.url,
    });
  } catch (error) {
    generateResponse(res, 500, false, 'Failed to create checkout session', error.message);
  }
};
