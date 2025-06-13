import express from 'express';
import { sellerMiddleware, verifyToken } from '../../../core/middlewares/authMiddleware.js';
import {  getSellerDashboardSummary, getSellerRevenueReport } from './dashboard.controller.js';


const router = express.Router();
router.use(verifyToken, sellerMiddleware); 


router.get("/dashboard-summary", getSellerDashboardSummary);
router.get("/revenue-report", getSellerRevenueReport);


export default router;
