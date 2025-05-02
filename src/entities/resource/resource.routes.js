import express from "express";
import { createResource, getAllResources, getResourceById, updateResource, deleteResource } from "./resource.controller.js";
import { adminSellerMiddleware } from "../../core/middlewares/authMiddleware.js";
import { multerUpload } from "../../core/middlewares/multer.js";

const router = express.Router();

// Public
router.get("/", getAllResources);
router.get("/:id", getResourceById);

// protected
router.post(
  "/",
  adminSellerMiddleware,
  multerUpload([
    { name: "format", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 }
  ]),
  createResource
);

router.put("/:id", adminSellerMiddleware , updateResource);
router.delete("/:id", adminSellerMiddleware, deleteResource);

export default router;
