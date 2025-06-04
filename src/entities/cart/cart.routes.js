import express from "express";
import {
  addToCart,
  getCartDetails,
  updateCartItem,
  removeCartItem,
  clearCart
} from "./cart.controller.js";
import { verifyToken } from "../../core/middlewares/authMiddleware.js";


const router = express.Router();


router
  .route("/")
  .get(verifyToken, getCartDetails)     
  .post(verifyToken, addToCart)         
  .delete(verifyToken, clearCart);      


router
  .route("/item/:resourceId")
  .patch(verifyToken, updateCartItem)   
  .delete(verifyToken, removeCartItem); 


export default router;
