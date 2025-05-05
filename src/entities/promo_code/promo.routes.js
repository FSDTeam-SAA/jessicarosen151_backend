import express from "express";
import {
    createPromoCode,
    deletePromoCode,
    getAllPromoCodes,
    getPromoCodeById,
    updatePromoCode,
} from "./promo.controller.js";

import { adminMiddleware } from "../../core/middlewares/authMiddleware.js";


const router = express.Router();

// Public
router.get("/", getAllPromoCodes);
router.get("/:id", getPromoCodeById);

// Admin protected
router.post("/", adminMiddleware, createPromoCode);
router.put("/:id", adminMiddleware, updatePromoCode);
router.delete("/:id", adminMiddleware, deletePromoCode);

export default router;
