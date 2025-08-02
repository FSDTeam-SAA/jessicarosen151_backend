import mongoose, { Schema } from "mongoose";

const heroSectionSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      required: true,
    },
    
    country: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const HeroSection = mongoose.model("HeroSection", heroSectionSchema);
export default HeroSection;
