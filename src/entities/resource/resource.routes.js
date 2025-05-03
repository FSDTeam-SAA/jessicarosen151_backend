import express from "express";
import { createResource, getAllResources, getResourceById, updateResource, deleteResource, getSellerResources } from "./resource.controller.js";
import { adminSellerMiddleware , sellerMiddleware } from "../../core/middlewares/authMiddleware.js";
import { multerUpload } from "../../core/middlewares/multer.js";

const router = express.Router();

// Public
router.get("/", getAllResources);
router.get("/:id", getResourceById);


// Admin & seller protected
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


// Seller protected
router.get("/seller/my-resources", sellerMiddleware, getSellerResources);

export default router;
