import Category from "./category.model.js";

export const createCategoryService = async ({ name, description, createdBy }) => {
  const existing = await Category.findOne({ name: name.trim() });
  if (existing) throw new Error('Category already exists.');

  const category = new Category({ name, description, createdBy });
  return await category.save();
};

export const getAllCategoriesService = async () => {
  return await Category.find().populate('createdBy', 'firstName lastName email');
};

export const getCategoryByIdService = async (categoryId) => {
  return await Category.findById(categoryId);
};

export const updateCategoryService = async (categoryId, updateData) => {
  const updated = await Category.findByIdAndUpdate(categoryId, updateData, { new: true });
  if (!updated) throw new Error('Category not found');
  return updated;
};

export const deleteCategoryService = async (categoryId) => {
  const deleted = await Category.findByIdAndDelete(categoryId);
  if (!deleted) throw new Error('Category not found or already deleted');
  return deleted;
};
