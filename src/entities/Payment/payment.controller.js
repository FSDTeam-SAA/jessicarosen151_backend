// src/Payment/payment.controller.js
import { generateResponse } from '../../lib/responseFormate.js';
import Guest from '../auth.guest/auth.guest.model.js';
import { createCheckoutSession } from './payment.service.js';


export const initiateCheckout = async (req, res) => {
  const userId = req.user?.id || null;
  let guestId = null;

  // Handle guest
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
    return generateResponse(res, 400, false, 'No items provided');
  }

  try {
    const result = await createCheckoutSession({
      userId,
      guestId,
      itemsFromFrontend: items,
      promoCode: req.body.promoCode,
      customerCountry: req.body.customerCountry || 'CA',
      customerEmail: req.body.customerEmail,
    });

    // ——— IMPORTANT FIX ———
    // If multiple sellers → return all sessions
    // If one seller → return just one
    if (result.sessions.length === 1) {
      return generateResponse(res, 200, true, 'Checkout session created successfully', {
        sessionId: result.sessions[0].sessionId,
        url: result.sessions[0].url,
        orderId: result.sessions[0].orderId,
      });
    }

    // Multi-seller cart
    return generateResponse(res, 200, true, 'Checkout sessions created successfully', {
      sessions: result.sessions.map(s => ({
        sessionId: s.sessionId,
        url: s.url,
        orderId: s.orderId,
        sellerStripeId: s.sellerStripeId,
      })),
      total: result.totalPreTax,
    });

  } catch (error) {
    console.error('Checkout error:', error);
    return generateResponse(res, 500, false, 'Failed to create checkout session', error.message);
  }
};