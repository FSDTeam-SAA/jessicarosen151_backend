import mongoose, { Schema } from "mongoose";

const resourceSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: ""
    },
    price: {
      type: Number,
      required: true
    },
    discountPrice: {
      type: Number,
      default: 0
    },
    quantity: {
      type: Number,
      required: true
    },
    format: {
      type: String,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true
    },
    subCategory: {
      type: Schema.Types.ObjectId,
      ref: "SubCategory",
      required: true
    },
    thumbnail: {
      type: String,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    },
    productId: {
      type: String,
      unique: true,
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Generate random 5-digits Product ID
resourceSchema.pre("validate", async function (next) {
  if (!this.productId) {
    let isUnique = false;
    let generatedId;

    while (!isUnique) {
      generatedId = Math.floor(10000 + Math.random() * 90000).toString();
      const existing = await mongoose.models.Resource.findOne({ productId: generatedId });
      if (!existing) isUnique = true;
    }

    this.productId = generatedId;
  }

  next();
});

const Resource = mongoose.model("Resource", resourceSchema);
export default Resource;
