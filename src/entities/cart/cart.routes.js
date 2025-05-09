import express from "express";
import {
  addToCart,
  getCartDetails
} from "./cart.controller.js";
import { verifyToken } from "../../core/middlewares/authMiddleware.js";

const router = express.Router();

// Protected routes
router.post("/add", verifyToken, addToCart);
router.get("/", verifyToken, getCartDetails);

export default router;
