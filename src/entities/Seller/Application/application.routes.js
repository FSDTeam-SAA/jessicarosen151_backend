import express from 'express';
import { applyToBecomeSellerController, getAllSellerApplicationsController, updateSellerApplicationStatusController } from './application.controller.js';
import { adminMiddleware, verifyToken } from '../../../core/middlewares/authMiddleware.js';
const router = express.Router();

router.post('/apply',applyToBecomeSellerController)
router.get('/admin/applications',verifyToken,adminMiddleware,getAllSellerApplicationsController)
router.patch('/admin/applications/:id',verifyToken,adminMiddleware,updateSellerApplicationStatusController)

export default router;