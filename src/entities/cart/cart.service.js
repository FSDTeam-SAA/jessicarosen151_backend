import Cart from "./cart.model.js";

export const addToCartService = async (userId, resourceId, quantity, price) => {
  const cart = await Cart.findOne({ user: userId });

  if (!cart) {
    const newCart = new Cart({
      user: userId,
      items: [{ resource: resourceId, quantity, price }]
    });
    return await newCart.save();
  }

  const existingItem = cart.items.find(item => item.resource.toString() === resourceId);

  if (existingItem) {
    existingItem.quantity += quantity;
    existingItem.price = price; 
  } else {
    cart.items.push({ resource: resourceId, quantity, price });
  }

  return await cart.save();
};


export const getCartDetailsService = async (userId) => {
  return await Cart.findOne({ user: userId })
    .populate({
      path: "items.resource",
      select: "title thumbnail price discountPrice format"
    })
    .select("-__v");
};
