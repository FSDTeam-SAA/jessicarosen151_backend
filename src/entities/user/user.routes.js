import { multerUpload } from "../../core/middlewares/multer.js";
import { 
     getAllUsersController, getAllAdminsController, getAllSuperAdminsController, getUserByIdController,updateUserController, deleteUserController, 
     createAvatarController,updateAvatarProfileController,deleteAvatarController,
     createMultipleAvatarController,updateMultipleAvatarController,deleteMultipleAvatarController,
     createUserPDFController,updateUserPDFController,deleteUserPDFController
    } from "./user.controller.js";
import express from "express";
const router = express.Router();


router.get("/all-users", getAllUsersController);
router.get("/all-admins", getAllAdminsController);
router.get("/all-super-admins", getAllSuperAdminsController);
router.get("/:id", getUserByIdController);
router.put("/:id", updateUserController);
router.delete("/:id", deleteUserController);

router.post("/upload-avatar/:id",multerUpload([{ name: "profileImage", maxCount: 1 },]), createAvatarController);
router.put("/upload-avatar/:id",multerUpload([{ name: "profileImage", maxCount: 1 },]), updateAvatarProfileController);
router.delete("/upload-avatar/:id", deleteAvatarController);

router.post("/upload-multiple-avatar/:id",multerUpload([{ name: "multiProfileImage", maxCount: 5 },]), createMultipleAvatarController);
router.put("/upload-multiple-avatar/:id",multerUpload([{ name: "multiProfileImage", maxCount: 5 },]), updateMultipleAvatarController);
router.delete("/upload-multiple-avatar/:id", deleteMultipleAvatarController);

router.post("/upload-file/:id",multerUpload([{ name: "userPDF", maxCount: 1 },]),createUserPDFController);
router.put("/upload-file/:id",multerUpload([{ name: "userPDF", maxCount: 1 },]),updateUserPDFController);
router.delete("/upload-file/:id",deleteUserPDFController);

export default router;

