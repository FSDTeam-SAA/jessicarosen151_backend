import express from 'express';
import { initiateCheckout } from './payment.controller.js';
import { optionalVerifyToken } from '../../core/middlewares/authMiddleware.js';


const router = express.Router();

router.post('/create-session',optionalVerifyToken, initiateCheckout);

export default router;
