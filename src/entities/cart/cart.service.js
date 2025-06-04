import Cart from "./cart.model.js";
import Resource from "../resource/resource.model.js";

export const addToCartService = async (userId, resourceId, quantity = 1) => {
  const resource = await Resource.findById(resourceId);
  if (!resource) throw new Error("Resource not found");

  const effectivePrice = resource.discountPrice > 0 && resource.discountPrice < resource.price
    ? resource.discountPrice
    : resource.price;

  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = new Cart({
      user: userId,
      items: [{ resource: resourceId, quantity, price: effectivePrice }]
    });
  } else {
    const existingItem = cart.items.find(item => item.resource.toString() === resourceId);
    if (existingItem) {
      existingItem.quantity += quantity;
      existingItem.price = effectivePrice;
    } else {
      cart.items.push({ resource: resourceId, quantity, price: effectivePrice });
    }
  }

  return await cart.save();
};

export const getCartDetailsService = async (userId) => {
  const cart = await Cart.findOne({ user: userId })
    .populate({
      path: "items.resource",
      select: "title thumbnail price discountPrice"
    })
    .select("-__v");

  if (!cart) return null;

  let subtotal = 0;

  const items = cart.items.map(item => {
    const res = item.resource;
    const unitPrice = res.discountPrice > 0 && res.discountPrice < res.price ? res.discountPrice : res.price;
    const totalItemPrice = unitPrice * item.quantity;
    subtotal += totalItemPrice;

    return {
      resource: {
        _id: res._id,
        title: res.title,
        thumbnail: res.thumbnail,
        price: res.price,
        discountPrice: res.discountPrice
      },
      quantity: item.quantity,
      unitPrice,
      totalPrice: totalItemPrice
    };
  });

  return {
    items,
    subtotal,
    total: subtotal
  };
};

export const updateCartItemService = async (userId, resourceId, quantity) => {
  const cart = await Cart.findOne({ user: userId });
  if (!cart) throw new Error("Cart not found");

  const item = cart.items.find(item => item.resource.toString() === resourceId);
  if (!item) throw new Error("Item not found in cart");

  if (quantity < 1) throw new Error("Quantity must be at least 1");
  item.quantity = quantity;

  return await cart.save();
};

export const removeCartItemService = async (userId, resourceId) => {
  const cart = await Cart.findOne({ user: userId });
  if (!cart) throw new Error("Cart not found");

  cart.items = cart.items.filter(item => item.resource.toString() !== resourceId);
  return await cart.save();
};

export const clearCartService = async (userId) => {
  await Cart.findOneAndUpdate({ user: userId }, { items: [] });
};
