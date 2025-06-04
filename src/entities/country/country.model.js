import mongoose, { Schema } from "mongoose";

const countrySchema = new Schema(
  {
    countryName: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    states: {
      type: [String],
      default: []
    },

  },
  {
    timestamps: true
  }
);

const Country = mongoose.model("Country", countrySchema);
export default Country;
