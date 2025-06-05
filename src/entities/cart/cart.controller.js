import {
  addToCartService,
  getCartDetailsService,
  updateCartItemService,
  removeCartItemService,
  clearCartService
} from "./cart.service.js";
import { generateResponse } from "../../lib/responseFormate.js";


export const addToCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const { resourceId, quantity } = req.body;

    // Validate if the quantity and resourceId are correct
    if (!resourceId || !quantity || quantity < 1) {
      return generateResponse(res, 400, false, "Invalid resourceId or quantity");
    }

    // Call service to add item to cart
    const updatedCart = await addToCartService(userId, resourceId, quantity);

    return generateResponse(res, 200, true, "Item added to cart", updatedCart);
  } catch (error) {
    return generateResponse(res, 400, false, "Failed to add item to cart", error.message);
  }
};



export const getCartDetails = async (req, res) => {
  try {
    const userId = req.user?._id;
    const cart = await getCartDetailsService(userId);
    if (!cart) return generateResponse(res, 404, false, "Cart not found");
    generateResponse(res, 200, true, "Cart fetched successfully", cart);
  } catch (error) {
    generateResponse(res, 500, false, "Failed to fetch cart", error.message);
  }
};


export const updateCartItem = async (req, res) => {
  try {
    const userId = req.user._id;
    const resourceId = req.params.resourceId;
    const { quantity } = req.body;

    const updatedCart = await updateCartItemService(userId, resourceId, quantity);
    generateResponse(res, 200, true, "Cart item updated", updatedCart);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to update item", error.message);
  }
};


export const removeCartItem = async (req, res) => {
  try {
    const userId = req.user._id;
    const resourceId = req.params.resourceId;

    const updatedCart = await removeCartItemService(userId, resourceId);
    generateResponse(res, 200, true, "Item removed from cart", updatedCart);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to remove item", error.message);
  }
};


export const clearCart = async (req, res) => {
  try {
    const userId = req.user._id;
    await clearCartService(userId);
    generateResponse(res, 200, true, "Cart cleared", null);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to clear cart", error.message);
  }
};
