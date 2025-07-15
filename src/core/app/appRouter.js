import express from 'express';
import authRoutes from '../../entities/auth/auth.routes.js';
import userRoutes from '../../entities/user/user.routes.js';
import practiceAreaRoutes from '../../entities/practiceArea/practiceArea.routes.js';
import resourceRoutes from '../../entities/resource/resource.routes.js';
import blogRoutes from '../../entities/blog/blog.routes.js';
import promoRoutes from '../../entities/promoCode/promo.routes.js';
import contactRoutes from '../../entities/contact/contact.routes.js';
import messageRoutes from '../../entities/message/message.routes.js';
import reviewRoutes from '../../entities/review/review.routes.js';
import applicationRoutes from '../../entities/Seller/Application/application.routes.js'
import countryRoutes from '../../entities/country/country.routes.js';
import resourceTypesRoutes from '../../entities/rTypes/resourceTypes.routes.js'
import sellerOnboardingRoutes from '../../entities/Seller/Stripe-onboard/sellerStripeRoutes.js';
import paymentRoutes from '../../entities/Payment/payment.routes.js';
import dashboardRoutes from '../../entities/Seller/Dashboard/dashboard.routes.js';
import adminDashboardRoutes from '../../entities/admin/Dashboard/dashboard.routes.js';
import newsletterRoutes from '../../entities/newsletter/newsletter.routes.js';
import questionAnswerRoutes from '../../entities/QuesAns/qa.routes.js';

const router = express.Router();

// Define all your routes here
router.use('/v1/auth', authRoutes);
router.use('/v1/user', userRoutes);
router.use('/v1/practice-area', practiceAreaRoutes);
router.use('/v1/country-state', countryRoutes);
router.use('/v1/resource', resourceRoutes);
router.use('/v1/resource-type', resourceTypesRoutes);
router.use('/v1/blog', blogRoutes);
router.use('/v1/promo-codes', promoRoutes);
router.use('/v1/contact', contactRoutes)
router.use('/v1/message', messageRoutes);
router.use('/v1/reviews', reviewRoutes);
router.use('/v1/seller',applicationRoutes)
router.use('/v1/stripe',sellerOnboardingRoutes);
router.use('/v1/payment',paymentRoutes)

router.use('/v1/seller/dashboard', dashboardRoutes);
router.use('/v1/admin/dashboard', adminDashboardRoutes);

router.use('/v1/newsletter', newsletterRoutes)
router.use('/v1/qa', questionAnswerRoutes);

export default router;
