import SubCategory from "./sub_category.model.js";

export const createSubCategoryService = async ({ name, description, category }) => {
  const existing = await SubCategory.findOne({ name: name.trim(), category });
  if (existing) throw new Error("Sub-category already exists under this category.");

  const subCategory = new SubCategory({ name, description, category });
  return await subCategory.save();
};

export const getAllSubCategoriesService = async () => {
  return await SubCategory.find().populate("category", "name");
};

export const getSubCategoryByIdService = async (id) => {
  return await SubCategory.findById(id).populate("category", "name");
};

export const updateSubCategoryService = async (id, updateData) => {
  const updated = await SubCategory.findByIdAndUpdate(id, updateData, { new: true });
  if (!updated) throw new Error("Sub-category not found");
  return updated;
};

export const deleteSubCategoryService = async (id) => {
  const deleted = await SubCategory.findByIdAndDelete(id);
  if (!deleted) throw new Error("Sub-category not found or already deleted");
  return deleted;
};
