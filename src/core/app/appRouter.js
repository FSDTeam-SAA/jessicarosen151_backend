import express from 'express';
import authRoutes from '../../entities/auth/auth.routes.js';
import userRoutes from '../../entities/user/user.routes.js';
import categoryRoutes from '../../entities/category/category.routes.js';
import subCategoryRoutes from '../../entities/sub_category/sub_category.routes.js';
import resourceRoutes from '../../entities/resource/resource.routes.js';
import blogRoutes from '../../entities/blog/blog.routes.js';
import promoRoutes from '../../entities/promo_code/promo.routes.js';

const router = express.Router();

// Define all your routes here
router.use('/v1/auth', authRoutes);
router.use('/v1/user', userRoutes);

router.use('/v1/categories', categoryRoutes);
router.use("/v1/subcategories", subCategoryRoutes);
router.use('/v1/resources', resourceRoutes);
router.use('/v1/blogs', blogRoutes);
router.use('/v1/promo-codes', promoRoutes); 


export default router;
