import express from "express";
import {
  createSubCategory,
  getAllSubCategories,
  getSubCategoryById,
  updateSubCategory,
  deleteSubCategory
} from "./sub_category.controller.js";
import { adminMiddleware } from "../../core/middlewares/authMiddleware.js";

const router = express.Router();

// Public
router.get("/", getAllSubCategories);
router.get("/:id", getSubCategoryById);

// Admin protected
router.post("/", adminMiddleware, createSubCategory);
router.put("/:id", adminMiddleware, updateSubCategory);
router.delete("/:id", adminMiddleware, deleteSubCategory);

export default router;
