import express from "express";
import { createCategory, deleteCategory, getAllCategories, getCategoryById, updateCategory } from "./category.controller.js";
import {adminMiddleware} from "../../core/middlewares/authMiddleware.js";



const router = express.Router();

// Public 
router.get('/', getAllCategories);
router.get('/:id', getCategoryById);

// Admin protected
router.post('/', adminMiddleware, createCategory);
router.put('/:id', adminMiddleware, updateCategory);
router.delete('/:id', adminMiddleware, deleteCategory);

export default router;
