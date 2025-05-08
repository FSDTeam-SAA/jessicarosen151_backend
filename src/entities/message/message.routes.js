import express from "express";
import {
  getMessagesByResource,
  getUserConversations,
  createMessage
} from "./message.controller.js";
import { adminMiddleware, verifyToken } from "../../core/middlewares/authMiddleware.js";


const router = express.Router();

// Send a message (admin or seller)
router.post("/", verifyToken, createMessage);

// Get full message thread for a resource (admin or seller)
router.get("/:resourceId", verifyToken, getMessagesByResource);

// Get all conversations 
router.get("/conversations/me", verifyToken, adminMiddleware, getUserConversations);

export default router;
