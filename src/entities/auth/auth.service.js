import User from './auth.model.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { refreshTokenSecrete, emailExpires } from '../../core/config/config.js';
import sendEmail from '../../lib/sendEmail.js';
import verificationCodeTemplate from '../../lib/emailTemplates.js';
import { hashPassword } from '../../lib/hashPassword.js';
import {
  generateAccessToken,
  generateRefreshToken
} from '../../lib/generateToken.js';



export const registerUserService = async ({
  firstName,
  lastName,
  phoneNumber,
  email,
  password
}) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) throw new Error('User already registered.');

  const hashedPassword = await hashPassword(password);

  const newUser = new User({
    firstName,
    lastName,
    phoneNumber,
    email,
    password: hashedPassword
  });

  const savedUser = await newUser.save();
  if (!savedUser) throw new Error('Registration failed');

  return;
};


export const loginUserService = async ({ email, password }) => {
  const user = await User.findOne({ email });
  if (!user) throw new Error('User not found');

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new Error('Invalid credentials');

  const userWithoutPassword = {
    ...user.toObject(),
    password: undefined,
    createdAt: undefined,
    updatedAt: undefined,
    __v: undefined
  };

  return {
    accessToken: generateAccessToken(userWithoutPassword),
    refreshToken: generateRefreshToken(userWithoutPassword)
  };
};

export const refreshTokenService = (refreshTokenBody) => {
  if (!refreshTokenBody) throw new Error('No refresh token provided');

  const decoded = jwt.verify(refreshTokenBody, refreshTokenSecrete);

  // Destructure and exclude `exp` and `iat`
  const { exp, iat, ...payloadWithoutExp } = decoded;

  return {
    accessToken: generateAccessToken(payloadWithoutExp),
    refreshToken: generateRefreshToken(payloadWithoutExp)
  };
};

export const updatePasswordService = async ({ email, oldPassword, newPassword }) => {
  const user = await User.findOne({ email });
  if (!user) throw new Error('Invalid email');
  
  const isMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isMatch) throw new Error('Incorrect password');

  const hashedPassword = await hashPassword(newPassword);

  user.password = hashedPassword;
  await user.save();

  return true;
};



export const forgetPasswordService = async (email) => {
  const user = await User.findOne({ email });
  if (!user) throw new Error('Invalid email');

  const verificationCode = Math.floor(100000 + Math.random() * 900000);
  const expiresIn = new Date(Date.now() + emailExpires);

  user.verificationCode = verificationCode;
  user.verificationCodeExpires = expiresIn;
  await user.save();

  await sendEmail({
    to: email,
    subject: 'Verification Code',
    html: verificationCodeTemplate(verificationCode)
  });

  return true;
};

export const verifyCodeService = async ({ email, verificationCode }) => {
  const user = await User.findOne({ email });
  if (!user) throw new Error('Invalid email');
  if (!user.verificationCode || !user.verificationCodeExpires)
    throw new Error('Verification code not found');
  if (new Date() > user.verificationCodeExpires)
    throw new Error('Verification code expired');
  if (parseInt(user.verificationCode) !== parseInt(verificationCode))
    throw new Error('Incorrect code');

  user.verificationCode = null;
  user.verificationCodeExpires = null;
  await user.save();

  return true;
};

export const resetPasswordService = async ({ email, password }) => {
  const user = await User.findOne({ email });
  if (!user) throw new Error('Invalid email');
  if (user.verificationCode || user.verificationCodeExpires)
    throw new Error('Verification code not cleared');

  const hashedPassword = await hashPassword(password);

  user.password = hashedPassword;
  await user.save();

  return true;
};
