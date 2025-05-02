import { generateResponse } from '../../lib/responseFormate.js';
import {
  registerUserService,
  loginUserService,
  refreshTokenService,
  forgetPasswordService,
  verifyCodeService,
  resetPasswordService,
  updatePasswordService
} from './auth.service.js';



export const registerUser = async (req, res) => {
  try {
    const { firstName, lastName, phoneNumber, email, password } = req.body;

    await registerUserService({ firstName, lastName, phoneNumber, email, password });
    generateResponse(res, 201, true, 'Registered user successfully!', null);
  } catch (error) {
    generateResponse(res, 400, false, 'Registration failed', error.message);
  }
};


export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const tokens = await loginUserService({ email, password });
    generateResponse(res, 200, true, 'Login successful', tokens);
  } catch (error) {
    generateResponse(res, 401, false, 'Login failed', error.message);
  }
};

export const logoutUser = (_, res) => {
  generateResponse(res, 200, true, 'Logged out successfully', null);
};

export const refreshToken = (req, res) => {
  try {
    const { refreshTokenBody } = req.body;
    const tokens = refreshTokenService(refreshTokenBody);
    generateResponse(res, 200, true, 'Token refreshed', tokens);
  } catch (error) {
    generateResponse(res, 401, false, 'Invalid refresh token', error.message);
  }
};



export const updatePassword = async (req, res) => {
  try {
    const { email, oldPassword, newPassword } = req.body;
    await updatePasswordService({ email, oldPassword, newPassword });
    generateResponse(res, 200, true, "Password updated successfully", null);
  } catch (error) {
    generateResponse(res, 400, false, "Update password failed", error.message);
  }
};


export const forgetPassword = async (req, res) => {
  try {
    await forgetPasswordService(req.body.email);
    generateResponse(res, 200, true, 'Verification code sent to your email', null);
  } catch (error) {
    generateResponse(res, 400, false, 'Forget password failed', error.message);
  }
};


export const verifyCode = async (req, res) => {
  try {
    const { email, verificationCode } = req.body;

    await verifyCodeService({ email, verificationCode });
    generateResponse(res, 200, true, 'Verification successful', null);
  } catch (error) {
    generateResponse(res, 400, false, 'Verification failed', error.message);
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, password } = req.body;
    await resetPasswordService({ email, password });
    generateResponse(res, 200, true, 'Password reset successfully', null);
  } catch (error) {
    generateResponse(res, 400, false, 'Reset failed', error.message);
  }
};

