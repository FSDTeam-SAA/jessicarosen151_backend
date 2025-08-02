import mongoose, { Schema } from "mongoose";

const bestsellerSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    image: [{
      type: String,
      required: true,
      validate: {
        validator: (v) => v.length <= 2,
        message: "image array can have maximum length of 2",
      },
    }],
    
    country: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const BestSeller = mongoose.model("BestSeller", bestsellerSchema);
export default BestSeller;
