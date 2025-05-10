import mongoose from "mongoose";
import Review from "./review.model.js";

export const createReviewService = async ({ resourceId, userId, rating, comment }) => {
    if (!resourceId || !userId || !rating || !comment) throw new Error("All fields are required");
    if (rating < 0 || rating > 5) throw new Error("Rating must be between 0 and 5");

    const review = new Review({ resourceId, userId, rating, comment });
    await review.save();
    return
};

export const getAllReviewsOfProductService = async (resourceId, page, limit, skip) => {
    if (!resourceId) throw new Error("Resource ID is required");

    const [reviews, totalItems, averageRatingArray] = await Promise.all([
        Review.find({ resourceId })
            .select("-__v -updatedAt -resourceId")
            .populate("userId", "firstName lastName email profileImage")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),

        Review.countDocuments({ resourceId }),

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

    const averageRating = averageRatingArray[0] ? averageRatingArray[0].averageRating : 0;

    const totalPages = Math.ceil(totalItems / limit);

    const data = {
        reviews,
        pagination: {
            currentPage: page,
            totalPages,
            totalItems,
            itemsPerPage: limit
        },
        averageRating
    }

    return data;
}