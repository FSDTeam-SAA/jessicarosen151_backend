import express from 'express';
import { applyToBecomeSellerController, getAllSellerApplicationsController, updateSellerApplicationStatusController } from './application.controller';
import { adminMiddleware, verifyToken } from '../../../core/middlewares/authMiddleware';




const router = express.Router();

router.post('/apply',applyToBecomeSellerController)
router.get('/admin/applications',verifyToken,adminMiddleware,getAllSellerApplicationsController)
router.patch('/admin/applications/:id',updateSellerApplicationStatusController)