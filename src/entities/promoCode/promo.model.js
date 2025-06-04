import mongoose, { Schema } from "mongoose";

const promoCodeSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 5,
      maxlength: 10,
      match: /^[a-zA-Z0-9]+$/, 
    },
    discount: {
      type: Number,
      required: true,
      min: 0,
      max: 100, 
    },
    startDate: {
      type: Date,
      required: true,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive", "Expired"],
      default: "Active",
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    }
  },
  {
    timestamps: true
  }
);

const PromoCode = mongoose.model("PromoCode", promoCodeSchema);
export default PromoCode;
