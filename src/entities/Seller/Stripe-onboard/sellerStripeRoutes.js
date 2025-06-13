import express from 'express';
import { onboardSeller } from './sellerStripeController.js';


const router = express.Router();

router
.route('/onboard')
.post(onboardSeller)

export default router;