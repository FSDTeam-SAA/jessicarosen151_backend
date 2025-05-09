import { addToCartService, getCartDetailsService } from "./cart.service.js";
import { generateResponse } from "../../lib/responseFormate.js";


export const addToCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const { resourceId, quantity, price } = req.body;

    const updatedCart = await addToCartService(userId, resourceId, quantity, price);
    generateResponse(res, 200, true, "Item added to cart", updatedCart);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to add item to cart", error.message);
  }
};


export const getCartDetails = async (req, res) => {
  try {
    const userId = req.user._id;
    const cart = await getCartDetailsService(userId);

    if (!cart) return generateResponse(res, 404, false, "Cart not found");

    generateResponse(res, 200, true, "Cart fetched successfully", cart);
  } catch (error) {
    generateResponse(res, 500, false, "Failed to fetch cart", error.message);
  }
};
