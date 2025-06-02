import express from 'express';
import { applyToBecomeSellerController, getAllSellerApplicationsController, updateSellerApplicationStatusController } from './application.controller';




const router = express.Router();

router.post('/apply',applyToBecomeSellerController)
router.get('/admin/applications',getAllSellerApplicationsController)
router.patch('/admin/applications/:id',updateSellerApplicationStatusController)