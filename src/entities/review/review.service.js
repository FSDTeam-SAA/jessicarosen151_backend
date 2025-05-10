import mongoose from "mongoose";
import Review from "./review.model.js";

export const createReviewService = async ({ resourceId, userId, rating, comment }) => {
    if (!resourceId || !userId || !rating || !comment) throw new Error("All fields are required");
    if (rating < 0 || rating > 5) throw new Error("Rating must be between 0 and 5");

    const review = new Review({ resourceId, userId, rating, comment });
    await review.save();
    return
};

export const getAllReviewsOfProductService = async (resourceId) => {
    if (!resourceId) throw new Error("Resource ID is required");

    const [reviews, averageRating] = await Promise.all([
        Review.find({ resourceId }).populate("userId", "firstName lastName email profileImage"),
        Review.aggregate([
            { $match: { resourceId: new mongoose.Types.ObjectId(resourceId) } },
            {
                $group: {
                    _id: "$resourceId",
                    averageRating: { $avg: "$rating" }
                }
            }
        ])
    ])
    return { reviews, averageRating };
}