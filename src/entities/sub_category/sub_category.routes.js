import express from "express";
import {
  createSubCategory,
  getAllSubCategories,
  getSubCategoryById,
  updateSubCategory,
  deleteSubCategory
} from "./sub_category.controller.js";
import { adminMiddleware, verifyToken } from "../../core/middlewares/authMiddleware.js";

const router = express.Router();

// Public
router.get("/get-all-sub-categories/:categoryId", getAllSubCategories);
router.get("/:id", getSubCategoryById);

// Admin protected
router.post("/", verifyToken, adminMiddleware, createSubCategory);
router.put("/:id", verifyToken, adminMiddleware, updateSubCategory);
router.delete("/:id", verifyToken, adminMiddleware, deleteSubCategory);

export default router;
