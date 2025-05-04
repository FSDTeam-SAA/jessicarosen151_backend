import express from 'express';
import {
  registerUser,
  loginUser,
  refreshAccessToken,
  forgetPassword,
  verifyCode,
  resetPassword
} from './auth.controller.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/refresh-access-token', refreshAccessToken);
router.post('/forget-password', forgetPassword);
router.post('/verify-code', verifyCode);
router.post('/reset-password', resetPassword);

export default router;
