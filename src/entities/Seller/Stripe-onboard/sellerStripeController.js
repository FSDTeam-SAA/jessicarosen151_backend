import { generateResponse } from '../../../lib/responseFormate.js';
import RoleType from '../../../lib/types.js';
import User from '../../auth/auth.model.js';
import {
  createConnectedAccount,
  createConnectedAccountOnboardingLink,
  createOnboardingLink,
  stripeAccount
} from '../Stripe-onboard/sellerStripeService.js';

export const onboardSeller = async (req, res) => {
  try {
    const { email, country } = req.body;

    if (!country) {
      return generateResponse(res, 400, false, 'Country is required');
    }
    const seller = await User.findOne({ email, role: RoleType.SELLER });

    if (!seller) {
      return generateResponse(
        res,
        404,
        false,
        'Seller not found or not authorized'
      );
    }

    if (!seller.stripeAccountId) {
      seller.stripeAccountId = await createConnectedAccount(email, country);
      await seller.save();
    }

    const onboardingUrl = await createOnboardingLink(
      seller.stripeAccountId,
      `${process.env.FRONTEND_URL}/stripe/refresh`,
      `${process.env.FRONTEND_URL}/stripe/return`
    );

    return generateResponse(res, 200, true, 'Stripe onboarding link created', {
      url: onboardingUrl
    });
  } catch (err) {
    console.error('Stripe onboarding failed:', err);
    return generateResponse(
      res,
      500,
      false,
      'Stripe onboarding failed',
      err.message
    );
  }
};

// export const createConnectedAccountOnboardingLinkController = async (
//   req,
//   res
// ) => {
//   try {
//     const { email, country } = req.body;

//     if (!country) {
//       return generateResponse(res, 400, false, 'Country is required');
//     }
//     const seller = await User.findOne({ email, role: RoleType.SELLER });

//     if (!seller) {
//       return generateResponse(
//         res,
//         404,
//         false,
//         'Seller not found or not authorized'
//       );
//     }
//     const result = await createConnectedAccountOnboardingLink(email, country);
//     return generateResponse(
//       res,
//       200,
//       true,
//       'Stripe onboarding link created',
//       result
//     );
//   } catch (error) {
//     console.error('Stripe onboarding failed:', err);
//     return generateResponse(
//       res,
//       500,
//       false,
//       'Stripe onboarding failed',
//       err.message
//     );
//   }
// };

export const createConnectedAccountOnboardingLinkController = async (
  req,
  res
) => {
  try {
    const { email, country } = req.body;

    if (!email || !country) {
      return generateResponse(
        res,
        400,
        false,
        'Email and country are required'
      );
    }

    const seller = await User.findOne({ email, role: RoleType.SELLER });
    if (!seller) {
      return generateResponse(
        res,
        404,
        false,
        'Seller not found or not authorized'
      );
    }

    const result = await createConnectedAccountOnboardingLink(email, country);

    return generateResponse(res, 200, true, result.message, {
      url: result.url
    });
  } catch (error) {
    console.error('Stripe onboarding failed:', error);
    return generateResponse(
      res,
      500,
      false,
      'Stripe onboarding failed',
      error.message
    );
  }
};

export const stripeAccountController = async (req, res) => {
  try {
    const { email } = req.body;
    const result = await stripeAccount(email);
    return generateResponse(res, 200, true, '', result);
  } catch (error) {
    console.error('Stripe account creation failed:', error);
    return generateResponse(
      res,
      500,
      false,
      'Stripe account creation failed',
      error.message
    );
  }
};
