
import User from './auth.model.js';
import jwt from 'jsonwebtoken';
import sendEmail from '../../lib/sendEmail.js';
import verificationCodeTemplate from '../../lib/emailTemplates.js';
import {accessTokenSecrete,emailExpires, accessTokenExpires, refreshTokenSecrete, refreshTokenExpires } from '../../core/config/config.js';


export const initiateRegisterUserService = async ({ firstName, lastName, phoneNumber, email, password }) => {
  const existingUser = await User.findOne({ email });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000); 

  if (existingUser) {
    if (existingUser.isVerified) {
      throw new Error('User already verified');
    }

    // User exists but not verified → update OTP
    existingUser.otp = otp;
    existingUser.otpExpires = otpExpires;
    existingUser.firstName = firstName;
    existingUser.lastName = lastName;
    existingUser.phoneNumber = phoneNumber;
    existingUser.password = password; 
    await existingUser.save();
  } 
  else {
    const newUser = new User({
      firstName,
      lastName,
      phoneNumber,
      email,
      password,
      otp,
      otpExpires
    });
    await newUser.save();
  }

  await sendEmail({
    to: email,
    subject: 'Your Lawbie OTP Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px; background-color: #f9f9f9;">
        <h1 style="color: #333; text-align: center;">Verification Code</h1>
        <p style="font-size: 16px; color: #555;">Hello,</p>
        <p style="font-size: 16px; color: #555;">Thank you for registering. Your verification code is:</p>
        <p style="font-size: 24px; font-weight: bold; text-align: center; color: #007BFF;">${otp}</p>
        <p style="font-size: 16px; color: #555;">Please enter this code within 10 minutes to verify your account.</p>
        <p style="font-size: 16px; color: #555;">If you did not register, please ignore this email.</p>
        <footer style="border-top: 1px solid #ddd; padding-top: 10px; margin-top: 20px; text-align: center; font-size: 12px; color: #aaa;">
          &copy; 2025 Lawbie.com All rights reserved.
        </footer>
      </div>
    `
  });
};


export const verifyRegisterOTPService = async (email, otp) => {
  const user = await User.findOne({ email });

  if (!user) throw new Error('User not found');
  if (user.isVerified) throw new Error('User already verified');
  if (user.otp !== otp) throw new Error('Invalid OTP');
  if (user.otpExpires < new Date()) throw new Error('OTP expired');

  user.isVerified = true;
  user.otp = null;
  user.otpExpires = null;

  await user.save();

await sendEmail({
  to: email,
  subject: 'Welcome to Lawbie ⚖️',
  html: `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f7fa; padding: 40px;">
      <div style="max-width: 650px; margin: auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">

        <!-- Header -->
        <div style="background-color: #1a237e; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 26px; color: #ffffff;">Welcome to Lawbie ⚖️</h1>
        </div>

        <!-- Body -->
        <div style="padding: 30px;">
          <p style="font-size: 18px; color: #2c3e50; margin-bottom: 15px;">
            Welcome to <strong>Lawbie</strong> — we’re excited to have you on board!
          </p>
          <p style="font-size: 16px; color: #555; line-height: 1.6;">
            Your account is ready, and you now have access to tools and resources designed to help legal professionals 
            <strong>save time</strong>, <strong>work smarter</strong>, and <strong>connect with the right people</strong>.
            You can also upload your own work, share your expertise, and earn money while helping others in the legal community.
          </p>
          <p style="font-size: 16px; color: #555; line-height: 1.6;">
            If you ever need help, our team is just an email away at 
            <a href="mailto:support@lawbie.com" style="color: #1a237e; text-decoration: none; font-weight: bold;">support@lawbie.com</a>.
          </p>
          <p style="font-size: 16px; color: #555; line-height: 1.6;">
            Here’s to making your legal work easier, faster, and more rewarding.
          </p>

          <!-- Call-to-Action Button -->
          <div style="text-align: center; margin-top: 25px;">
            <a href="https://www.lawbie.com" 
               style="display: inline-block; background-color: #1a237e; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 8px; font-size: 16px; font-weight: bold;">
              Visit Lawbie
            </a>
          </div>

          <!-- Signature -->
          <div style="margin-top: 35px;">
            <p style="font-size: 16px; color: #333; margin: 0;">Best regards,</p>
            <p style="font-size: 16px; color: #333; margin: 0;">The Lawbie Team</p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f0f0f0; padding: 15px; text-align: center; font-size: 13px; color: #888;">
          &copy; 2025 Lawbie.com — All rights reserved. <br>
          <a href="https://www.lawbie.com" style="color: #1a237e; text-decoration: none;">www.lawbie.com</a>
        </div>

      </div>
    </div>
  `
});


  const { _id, role, profileImage, name, phoneNumber } = user;
  return { _id, email, role, profileImage, name, phoneNumber };
};


export const loginUserService = async ({ email, password }) => {
  if (!email || !password) throw new Error('Email and password are required');

  const user = await User.findOne({ email }).select("_id firstName lastName email role profileImage password isVerified refreshToken updatedAt");

  console.log('user', user);

  if (!user) throw new Error('User not found');
  if (!user.isVerified) throw new Error('Please verify your email before logging in');

  const isMatch = await user.comparePassword(user._id, password);
  if (!isMatch) throw new Error('Invalid password');

  const payload = { _id: user._id, role: user.role };

  const accessToken = user.generateAccessToken(payload);
  const refreshToken = user.generateRefreshToken(payload);

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return {
    user: {
      firstName: user.firstName,
      lastName: user.lastName,
      _id: user._id,
      email: user.email,
      role: user.role,
      profileImage: user.profileImage,
      refreshToken,
      updatedAt: user.updatedAt,
    },
    accessToken
  };
};


export const refreshAccessTokenService = async (refreshToken) => {
  if (!refreshToken) throw new Error('No refresh token provided');

  const user = await User.findOne({ refreshToken });

  if (!user) throw new Error('Invalid refresh token');

  const decoded = jwt.verify(refreshToken, refreshTokenSecrete)

  if (!decoded || decoded._id !== user._id.toString()) throw new Error('Invalid refresh token')

  const payload = { _id: user._id , role: user.role }

  const accessToken = user.generateAccessToken(payload);
  const newRefreshToken = user.generateRefreshToken(payload);

  user.refreshToken = newRefreshToken;
  await user.save({ validateBeforeSave: false })

  return {
    accessToken,
    refreshToken: newRefreshToken
  }
};


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
    subject: 'Your Lawbie OTP Code',
    html: verificationCodeTemplate(otp)
  });

  return;
};


export const verifyCodeService = async ({ email, otp }) => {

  if (!email || !otp) throw new Error('Email and otp are required')

  const user = await User.findOne({ email });

  if (!user) throw new Error('Invalid email');

  if (!user.otp || !user.otpExpires) throw new Error('Otp not found');

  if (parseInt(user.otp, 10) !== parseInt(otp, 10) || Date.now() > user.otpExpires.getTime()) throw new Error('Invalid or expired otp')

  user.otp = null;
  user.otpExpires = null;
  await user.save({ validateBeforeSave: false });

  return;
};


export const resetPasswordService = async ({ email, newPassword }) => {
  if (!email || !newPassword) throw new Error('Email and new password are required');

  const user = await User.findOne({ email });
  if (!user) throw new Error('Invalid email');

  if (user.otp || user.otpExpires) throw new Error('otp not cleared');

  user.password = newPassword;
  await user.save();

  return;
};


export const changePasswordService = async ({ userId, oldPassword, newPassword }) => {
  if (!userId || !oldPassword || !newPassword) throw new Error('User id, old password and new password are required');

  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  const isMatch = await user.comparePassword(userId, oldPassword);
  if (!isMatch) throw new Error('Invalid old password');

  user.password = newPassword;
  await user.save();

  return;
};

