import express from "express";
import {
    createReview,
    getAllReviewsOfProduct
} from "./review.controller.js";

const router = express.Router();

// Public
router.get("/get-all-reviews-product/:resourceId", getAllReviewsOfProduct);

router.post(
    "/create",
    createReview
);

export default router;
