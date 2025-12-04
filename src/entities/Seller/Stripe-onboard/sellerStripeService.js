import User from '../../auth/auth.model.js';

import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2022-11-15' // বা তোমার Stripe API version
});

export async function createConnectedAccount(email, country) {
  const account = await stripe.accounts.create({
    type: 'express',
    country,
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true }
    }
  });
  return account.id;
}

export async function createOnboardingLink(accountId, refreshUrl, returnUrl) {
  const link = await stripe.accountLinks.create({
    account: accountId,
    type: 'account_onboarding',
    refresh_url: refreshUrl,
    return_url: returnUrl
  });
  return link.url;
}

// export async function createConnectedAccountOnboardingLink(email, country) {
//   const existingAccount = await User.findOne({ email });

//   if (!existingAccount) {
//     throw new Error('User not found');
//   }

//   if (existingAccount.stripeAccountId) {
//     // If already created, return
//     // const account = await stripe.accounts.createLoginLink(
//     //   existingAccount.stripeAccountId
//     // );

//     // return account;
//     throw new Error('Account already created');
//   }

//   const account = await stripe.accounts.create({
//     type: 'express',
//     email,
//     country,

//     business_type: 'individual',

//     individual: {
//       first_name: existingAccount.firstName,
//       last_name: existingAccount.lastName,
//       email: existingAccount.email,
//       dob: existingAccount.dob
//         ? {
//             day: existingAccount.dob.getUTCDate(),
//             month: existingAccount.dob.getUTCMonth() + 1,
//             year: existingAccount.dob.getUTCFullYear()
//           }
//         : undefined,
//       address: {
//         country: existingAccount.address.country,
//         line1: existingAccount.address.roadArea,
//         line2: '',
//         city: existingAccount.address.cityState,
//         postal_code: existingAccount.address.postalCode
//       }
//       // phone: existingAccount.phoneNumber
//     },

//     business_profile: {
//       name: `${existingAccount.firstName} ${existingAccount.lastName}`,
//       url: 'https://your-default-website.com'
//     }
//   });

//   if (!account || !account.id) {
//     throw new Error('Failed to create Stripe account');
//   }

//   existingAccount.stripeAccountId = account.id;
//   await existingAccount.save();

//   // Create onboarding link
//   const accountLink = await stripe.accountLinks.create({
//     account: account.id,
//     refresh_url: `${process.env.FRONTEND_URL}/connect/refresh`,
//     return_url: `${process.env.FRONTEND_URL}/stripe-account-success`,
//     type: 'account_onboarding'
//   });

//   return {
//     url: accountLink.url,
//     message: 'Stripe onboarding link created successfully'
//   };
// }

// Create or return onboarding link
export const createConnectedAccountOnboardingLinkController = async (
  req,
  res
) => {
  try {
    const { email, country } = req.body;

    // Validate input
    if (!email || !country) {
      return generateResponse(
        res,
        400,
        false,
        'Email and country are required'
      );
    }

    if (typeof country !== 'string' || country.length !== 2) {
      return generateResponse(
        res,
        400,
        false,
        'Country code must be 2 uppercase letters'
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

    const result = await createConnectedAccountOnboardingLink(
      email,
      country.toUpperCase()
    );

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

export async function createConnectedAccountOnboardingLink(email, country) {
  const existingAccount = await User.findOne({ email });

  if (!existingAccount) {
    throw new Error('User not found');
  }

  // If already has a Stripe account → create login link
  if (existingAccount.stripeAccountId) {
    const loginLink = await stripe.accounts.createLoginLink(
      existingAccount.stripeAccountId
    );
    return {
      url: loginLink.url,
      message: 'Stripe login link created successfully'
    };
  }

  // Create new Stripe account
  const account = await stripe.accounts.create({
    type: 'express',
    email,
    country,
    business_type: 'individual',
    individual: {
      first_name: existingAccount.firstName,
      last_name: existingAccount.lastName,
      email: existingAccount.email,
      dob: existingAccount.dob
        ? {
            day: existingAccount.dob.getUTCDate(),
            month: existingAccount.dob.getUTCMonth() + 1,
            year: existingAccount.dob.getUTCFullYear()
          }
        : undefined,
      address: {
        country: country,
        line1: existingAccount.address.roadArea,
        line2: '',
        city: existingAccount.address.cityState,
        postal_code: existingAccount.address.postalCode
      }
    },
    business_profile: {
      name: `${existingAccount.firstName} ${existingAccount.lastName}`,
      url: 'https://your-default-website.com'
    }
  });

  if (!account || !account.id) {
    throw new Error('Failed to create Stripe account');
  }

  existingAccount.stripeAccountId = account.id;
  await existingAccount.save();

  // Create onboarding link
  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${process.env.FRONTEND_URL}/connect/refresh`,
    return_url: `${process.env.FRONTEND_URL}/stripe-account-success`,
    type: 'account_onboarding'
  });

  return {
    url: accountLink.url,
    message: 'Stripe onboarding link created successfully'
  };
}

export const stripeAccount = async (email) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error('User not found');
  }

  if (!user.stripeAccountId) {
    throw new Error('Stripe account not found');
  }

  const account = await stripe.accounts.createLoginLink(
    user.stripeAccountId
  );


  return account;
};
