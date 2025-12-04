import express from 'express';
import {
  createConnectedAccountOnboardingLinkController,
  stripeAccountController
} from './sellerStripeController.js';

const router = express.Router();

// router
// .route('/onboard')
// .post(onboardSeller)
router.route('/onboard').post(createConnectedAccountOnboardingLinkController);

router.route('/onboard').get(stripeAccountController);

export default router;
