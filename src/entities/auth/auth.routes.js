import express from 'express';
import {
  registerUser,
  loginUser,
  refreshAccessToken,
  forgetPassword,
  verifyCode,
  resetPassword,
  changePassword,
  logoutUser
} from './auth.controller.js';
import { userAdminSellerMiddleware, verifyToken } from '../../core/middlewares/authMiddleware.js';


const router = express.Router();


router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/refresh-access-token', refreshAccessToken);
router.post('/forget-password', forgetPassword);
router.post('/verify-code', verifyCode);
router.post('/reset-password', resetPassword);
router.post('/change-password',verifyToken, changePassword);
router.post('/logout', verifyToken, userAdminSellerMiddleware, logoutUser);


export default router;
