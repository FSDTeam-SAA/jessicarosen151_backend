import Cart from "./cart.model.js";
import Resource from "../resource/resource.model.js";


export const addToCartService = async (userId, resourceId, quantity = 1) => {
  if (!resourceId || !quantity) {
    throw new Error("Resource ID and quantity are required");
  }

  if (quantity <= 0 || quantity > 50) {
    throw new Error("Quantity must be between 1 and 50");
  }

  const resource = await Resource.findById(resourceId);
  if (!resource || resource.status !== "approved") {
    throw new Error("Resource not found or not available");
  }

  const effectivePrice = resource.discountPrice ?? resource.price;

  let cart = await Cart.findOne({ user: userId });

  if (!cart) {
    cart = new Cart({
      user: userId,
      items: [{ resource: resourceId, quantity, price: effectivePrice }],
    });
  } else {
    const existingItem = cart.items.find(item => item.resource.toString() === resourceId);

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;

      if (newQuantity > 50) {
        throw new Error("Total quantity for this item exceeds the limit (50)");
      }

      existingItem.quantity = newQuantity;
    } else {
      cart.items.push({ resource: resourceId, quantity, price: effectivePrice });
    }
  }

  await cart.save();
  return cart;
};


export const getCartDetailsService = async (userId) => {
  const cart = await Cart.findOne({ user: userId })
    .populate({
      path: "items.resource",
      select: "title thumbnail price discountPrice",
    })
    .lean();

  if (!cart || cart.items.length === 0) {
    return {
      items: [],
      itemCount: 0,
      subtotal: 0,
      total: 0,
    };
  }

  // Filter out deleted or null resources
  cart.items = cart.items.filter(item => item.resource);

  let subtotal = 0;
  const items = cart.items.map(item => {
    const effectivePrice = item.resource.discountPrice ?? item.resource.price;
    const itemTotal = effectivePrice * item.quantity;
    subtotal += itemTotal;

    return {
      resource: {
        _id: item.resource._id,
        title: item.resource.title,
        thumbnail: item.resource.thumbnail,
        price: item.resource.price,
        discountPrice: item.resource.discountPrice,
      },
      quantity: item.quantity,
      itemTotal,
    };
  });

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    items,
    itemCount,
    subtotal,
    total: subtotal, 
  };
};


export const updateCartItemService = async (userId, resourceId, quantity) => {
  const cart = await Cart.findOne({ user: userId });
  if (!cart) throw new Error("Cart not found");

  const item = cart.items.find(item => item.resource.toString() === resourceId);
  if (!item) throw new Error("Item not found in cart");

  if (quantity < 1 || quantity > 50) {
    throw new Error("Quantity must be between 1 and 50");
  }

  item.quantity = quantity;
  return await cart.save();
};


export const removeCartItemService = async (userId, resourceId) => {
  const cart = await Cart.findOne({ user: userId });
  if (!cart) throw new Error("Cart not found");

  const originalLength = cart.items.length;
  cart.items = cart.items.filter(item => item.resource.toString() !== resourceId);

  if (cart.items.length === originalLength) {
    throw new Error("Item was not found in cart");
  }

  return await cart.save();
};


export const clearCartService = async (userId) => {
  const cart = await Cart.findOne({ user: userId });
  if (!cart) throw new Error("Cart not found");

  cart.items = [];
  await cart.save();
};