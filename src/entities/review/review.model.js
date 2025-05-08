import mongoose from "mongoose";
const { Schema } = mongoose;

const reviewSchema = new Schema(
    {
        resourceId: {
            type: Schema.Types.ObjectId,
            ref: "Resource",
            required: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },
        comment: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

const review = mongoose.model("Review", reviewSchema);
export default review;
