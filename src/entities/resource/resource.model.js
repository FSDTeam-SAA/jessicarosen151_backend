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
      enum: ["PDF","Document",  ],
      required: true
    },
    file: {
      url: {
        type: String,
      },
      type: {
        type: String,
      }
    },
    thumbnail: {
      type: String
    },
    images: {
      type: [String],
      default: []
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


resourceSchema.pre("validate", async function (next) {
  if (!this.productId) {
    let isUnique = false;
    let generatedId;

    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    while (!isUnique) {
      generatedId = Array(6)
        .fill("")
        .map(() => characters.charAt(Math.floor(Math.random() * characters.length)))
        .join("");
      const existing = await mongoose.models.Resource.findOne({ productId: generatedId });
      if (!existing) isUnique = true;
    }

    this.productId = generatedId;
  }

  next();
});


const Resource = mongoose.model("Resource", resourceSchema);
export default Resource;
