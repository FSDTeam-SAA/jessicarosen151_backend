import { generateResponse } from '../../lib/responseFormate.js';
import { createCheckoutSession } from '../Payment/payment.service.js';

export const initiateCheckout = async (req, res) => {
  const userId = req.user?.id;
   const items = req.body.items;
  console.log(userId);
  try {
    const session = await createCheckoutSession(userId,items);
    
    generateResponse(res, 200, true, 'Checkout session created successfully', {
      sessionId: session.sessionId,
      url: session.url,   
    });
  } catch (error) {
    generateResponse(res, 500, false, 'Failed to create checkout session', error.message);
  }
};
