import { generateResponse } from "../../lib/responseFormate.js";
import { createReviewService, getAllReviewsOfProductService } from "./review.service.js";

export const createReview = async (req, res, next) => {
    const { resourceId, userId, rating, comment } = req.body;
    try {
        await createReviewService({
            resourceId,
            userId,
            rating,
            comment
        });
        generateResponse(res, 201, "Review created successfully", null);
    }

    catch (error) {
        if (error.message === "All fields are required") {
            generateResponse(res, 400, error.message, null);
        }

        else if (error.message === "Rating must be between 0 and 5") {
            generateResponse(res, 400, error.message, null);
        }

        else {
            next(error)
        }
    }
}

export const getAllReviewsOfResource = async (req, res, next) => {
    const { resourceId } = req.params;
    try {
        const reviews = await getAllReviewsOfProductService(resourceId);
        generateResponse(res, 200, "Reviews fetched successfully", reviews);
    }

    catch (error) {
        if (error.message === "Resource ID is required") {
            generateResponse(res, 400, error.message, null);
        }

        else {
            next(error)
        }
    }
}