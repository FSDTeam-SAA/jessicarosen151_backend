import PromoCode from "./promo.model.js";

export const createPromoCodeService = async (data) => {
  const existing = await PromoCode.findOne({ code: data.code.trim().toUpperCase() });
  if (existing) throw new Error("Promo code already exists.");

  data.code = data.code.trim().toUpperCase();
  const promoCode = new PromoCode(data);
  return await promoCode.save();
};


export const getAllPromoCodesService = async () => {
  return await PromoCode.find().populate("createdBy", "firstName lastName email");
};


export const getPromoCodeByIdService = async (id) => {
  return await PromoCode.findById(id).populate("createdBy", "firstName lastName email");
};


export const updatePromoCodeService = async (id, updateData) => {
  if (updateData.code) {
    updateData.code = updateData.code.trim().toUpperCase();
  }
  const updated = await PromoCode.findByIdAndUpdate(id, updateData, { new: true });
  if (!updated) throw new Error("Promo code not found");
  return updated;
};


export const deletePromoCodeService = async (id) => {
  const deleted = await PromoCode.findByIdAndDelete(id);
  if (!deleted) throw new Error("Promo code not found or already deleted");
  return deleted;
};
