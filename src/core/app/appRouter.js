import express from 'express';
import authRoutes from '../../entities/auth/auth.routes.js';
import userRoutes from '../../entities/user/user.routes.js';
import categoryRoutes from '../../entities/category/category.routes.js';
import subCategoryRoutes from '../../entities/sub_category/sub_category.routes.js';
import resourceRoutes from '../../entities/resource/resource.routes.js';
import blogRoutes from '../../entities/blog/blog.routes.js';
import promoRoutes from '../../entities/promo_code/promo.routes.js';
import contactRoutes from '../../entities/contact/contact.routes.js';
import messageRoutes from '../../entities/message/message.routes.js';
import cartRoutes from '../../entities/cart/cart.routes.js';
import reviewRoutes from '../../entities/review/review.routes.js';
import applicationRoutes from '../../entities/Seller/Application/application.routes.js'

const router = express.Router();

// Define all your routes here
router.use('/v1/auth', authRoutes);
router.use('/v1/user', userRoutes);
router.use('/v1/category', categoryRoutes);
router.use("/v1/subcategory", subCategoryRoutes);
router.use('/v1/resource', resourceRoutes);
router.use('/v1/blog', blogRoutes);
router.use('/v1/promo-code', promoRoutes);
router.use('/v1/contact', contactRoutes)
router.use('/v1/message', messageRoutes);
router.use('/v1/cart', cartRoutes);
router.use('/v1/reviews', reviewRoutes);
router.use('/v1/application',applicationRoutes)

export default router;
