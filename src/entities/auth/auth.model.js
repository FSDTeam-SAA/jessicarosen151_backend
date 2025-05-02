import RoleType from '../../lib/types.js';
import mongoose from 'mongoose';

const AddressSchema = new mongoose.Schema({
  country: { type: String, default: '' },
  cityState: { type: String, default: '' },
  roadArea: { type: String, default: '' },
  postalCode: { type: String, default: '' },
  taxId: { type: String, default: '' }
}, { _id: false });

const UserSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    username: { type: String, required: false }, 
    phoneNumber: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      default: RoleType.USER,
      enum: [RoleType.USER, RoleType.ADMIN, RoleType.SELLER],
    },
    bio: { type: String, default: '' },
    address: { type: AddressSchema, default: () => ({}) },

    profileImage: { type: String, default: '' },
    multiProfileImage: { type: [String], default: [] },
    pdfFile: { type: String, default: '' },

    verificationCode: String,
    verificationCodeExpires: Date,

    hasActiveSubscription: { type: Boolean, default: false },
    subscriptionExpireDate: { type: Date, default: null },
  },
  { timestamps: true }
);

const User = mongoose.model('User', UserSchema);
export default User;
