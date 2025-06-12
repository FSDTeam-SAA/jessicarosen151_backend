import express from 'express';
import { initiateCheckout } from './payment.controller.js';
import { verifyToken } from '../../core/middlewares/authMiddleware.js';


const router = express.Router();

router.post('/create-session',verifyToken, initiateCheckout);

export default router;
