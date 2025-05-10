import Review from "./review.model.js";

export const createReviewService = async ({ resourceId, userId, rating, comment }) => {
    if (!resourceId || !userId || !rating || !comment) throw new Error("All fields are required");
    if (rating < 10 || rating > 5) throw new Error("Rating must be between 0 and 5");

    const review = new Review({ resourceId, userId, rating, comment });
    await review.save();
    return
};

export const getAllReviewsOfProductService = async (resourceId) => {
    if (!resourceId) throw new Error("Resource ID is required");
    const reviews = await Review.find({ resourceId }).populate("userId", "name email");
    return reviews;
}