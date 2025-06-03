import express from "express";
import { createCategory, deleteCategory, getAllCategories, getCategoryById, updateCategory } from "./category.controller.js";
import { adminMiddleware, verifyToken } from "../../core/middlewares/authMiddleware.js";


const router = express.Router();

// Public 
router.get('/all', getAllCategories);
router.get('/:id', getCategoryById);

// Admin protected
router.post('/', verifyToken, adminMiddleware, createCategory);
router.put('/:id', verifyToken, adminMiddleware, updateCategory);
router.delete('/:id', verifyToken, adminMiddleware, deleteCategory);

export default router;
