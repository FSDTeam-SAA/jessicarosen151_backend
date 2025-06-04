import mongoose, { Schema } from "mongoose";

const resourceSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    country: {
      type: String,
      default: ""
    },
    states: [{
      type: String,
      default: ""
    }],

    resourceType: {
      type: [String],
      default: []
    },

    Litigation: {
      type: Boolean,
      default: false
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
    file: {
      url: {
        type: String,
        required: true
      },
      type: {
        type: String,
        required: true
      }
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
    },
    practiceAreas: {
      type: [String],
      default: []
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

// calculate resultant price before saving
resourceSchema.pre("save", function (next) {
  this.resultantPrice =
    this.discountPrice > 0 && this.discountPrice < this.price
      ? this.price - this.discountPrice
      : this.price;
  next();
});

const Resource = mongoose.model("Resource", resourceSchema);
export default Resource;
