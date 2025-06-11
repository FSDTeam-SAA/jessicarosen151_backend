import { generateResponse } from '../../../lib/responseFormate.js';
import RoleType from '../../../lib/types.js';
import User from '../../auth/auth.model.js';
import { createConnectedAccount, createOnboardingLink } from '../Stripe-onboard/sellerStripeService.js';

 

export const onboardSeller = async (req, res) => {
  try {
    const email = req.body.email;

    const seller = await User.findOne({ email, role: RoleType.SELLER });
    if (!seller) {
      return generateResponse(res, 404, false, 'Seller not found or not authorized');
    }

    if (!seller.stripeAccountId) {
      seller.stripeAccountId = await createConnectedAccount(email);
      await seller.save();
    }

    const onboardingUrl = await createOnboardingLink(
      seller.stripeAccountId,
      `${process.env.FRONTEND_URL}/stripe/refresh`,
      `${process.env.FRONTEND_URL}/stripe/return`
    );

    return generateResponse(res, 200, true, 'Stripe onboarding link created', { url: onboardingUrl });
  } catch (err) {
    console.error('Stripe onboarding failed:', err);
    return generateResponse(res, 500, false, 'Stripe onboarding failed', err.message);
  }
};
