import express from "express";
import { createResource, getAllResources, getResourceById, updateResource, deleteResource, getSellerResources } from "./resource.controller.js";
import { adminSellerMiddleware, verifyToken } from "../../core/middlewares/authMiddleware.js";
import { multerUpload } from "../../core/middlewares/multer.js";


const router = express.Router();


router
  .route("/my-resource")
  .get(verifyToken, adminSellerMiddleware, getSellerResources)


router
  .route("/get-all-resources")
  .get(getAllResources);


router.
  route("/")
  .post(verifyToken, adminSellerMiddleware, multerUpload([{ name: "file", maxCount: 1 }, { name: "thumbnail", maxCount: 1 }]), createResource);


router
  .route('/:id')
  .get(getResourceById)
  .put(verifyToken, adminSellerMiddleware, updateResource)
  .delete(verifyToken, adminSellerMiddleware, deleteResource);


export default router;
