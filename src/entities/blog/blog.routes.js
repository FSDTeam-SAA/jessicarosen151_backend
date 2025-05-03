import express from "express";
import {
  createBlog,
  getAllBlogs,
  getBlogById,
  updateBlog,
  deleteBlog
} from "./blog.controller.js";
import { adminMiddleware } from "../../core/middlewares/authMiddleware.js";
import { multerUpload } from "../../core/middlewares/multer.js";


const router = express.Router();

// Public routes
router.get("/", getAllBlogs);
router.get("/:id", getBlogById);

// Admin protected
router.post(
  "/",
  adminMiddleware,
  multerUpload([{ name: "thumbnail", maxCount: 1 }]),
  createBlog
);
router.put("/:id", adminMiddleware, updateBlog);
router.delete("/:id", adminMiddleware, deleteBlog);

export default router;
