import User from './auth.model.js';
import jwt from 'jsonwebtoken';
import { refreshTokenSecrete, emailExpires } from '../../core/config/config.js';
import sendEmail from '../../lib/sendEmail.js';
import verificationCodeTemplate from '../../lib/emailTemplates.js';


export const registerUserService = async ({
  firstName,
  lastName,
  phoneNumber,
  email,
  password
}) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) throw new Error('User already registered.');

  const newUser = new User({
    firstName,
    lastName,
    phoneNumber,
    email,
    password
  });

  const savedUser = await newUser.save();
  if (!savedUser) throw new Error('Registration failed');

  return;
};


export const loginUserService = async ({ email, password }) => {
  const user = await User.findOne({ email }).lean()
  if (!user) throw new Error('User not found');

  const isMatch = await user.comparePassword(password, user.password);
  if (!isMatch) throw new Error('Invalid credentials');

  delete user.password;

  const payload = {
    _id: user._id
  }

  const data = {
    user,
    accessToken: user.generateAccessToken(payload),
    refreshToken: user.generateRefreshToken(payload)
  }

  return data
};

export const refreshAccessTokenService = async (refreshToken) => {
  if (!refreshToken) throw new Error('No refresh token provided');

  // Find user by refreshToken
  const user = await User.findOne({ refreshToken });

  if (!user) throw new Error('Invalid refresh token');

  const decoded = jwt.verify(refreshToken, refreshTokenSecrete)

  if (!decoded || decoded._id !== user._id.toString()) throw new Error('Invalid refresh token')

  const payload = { _id: user._id }

  const accessToken = user.generateAccessToken(payload);
  const newRefreshToken = user.generateRefreshToken(payload);

  user.refreshToken = newRefreshToken;
  await user.save({ validateBeforeSave: false })

  return {
    accessToken,
    refreshToken: newRefreshToken
  }
};

// export const updatePasswordService = async ({ email, oldPassword, newPassword }) => {
//   const user = await User.findOne({ email });
//   if (!user) throw new Error('Invalid email');

//   const isMatch = await bcrypt.compare(oldPassword, user.password);
//   if (!isMatch) throw new Error('Incorrect password');

//   const hashedPassword = await hashPassword(newPassword);

//   user.password = hashedPassword;
//   await user.save();

//   return true;
// };

export const forgetPasswordService = async (email) => {

  if (!email) throw new Error('Email is required')

  const user = await User.findOne({ email });
  if (!user) throw new Error('Invalid email');

  const otp = Math.floor(100000 + Math.random() * 900000);
  const otpExpires = new Date(Date.now() + emailExpires);

  user.otp = otp;
  user.otpExpires = otpExpires;
  await user.save({ validateBeforeSave: false });

  await sendEmail({
    to: email,
    subject: 'Password Reset OTP',
    html: verificationCodeTemplate(otp)
  });

  return;
};

export const verifyCodeService = async ({ email, otp }) => {

  const user = await User.findOne({ email });

  if (!user) throw new Error('Invalid email');

  if (!user.otp || !user.otpExpires) throw new Error('Otp not found');

  if (user.otp !== otp || new Date() > user.otpExpires) throw new Error('Invalid or expired otp')

  user.otp = null;
  user.otpExpires = null;
  await user.save({ validateBeforeSave: false });

  return;
};

export const resetPasswordService = async ({ email, newPassword }) => {
  const user = await User.findOne({ email });
  if (!user) throw new Error('Invalid email');

  if (user.otp || user.otpExpires) throw new Error('otp not cleared');

  user.password = newPassword;
  await user.save();

  return;
};
