import SubCategory from "../sub_category/sub_category.model.js";
import Category from "./category.model.js";

export const createCategoryService = async ({ name, description, createdBy }) => {
  const existing = await Category.findOne({ name: name.trim() });
  if (existing) throw new Error('Category already exists.');

  const category = new Category({ name, description, createdBy });
  return await category.save();
};

export const getAllCategoriesService = async (page, limit, skip) => {
  const categories = (
    await Category
      .find({})
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .select('-__v -updatedAt')
      .lean()
  )

  const modifiedCategories = await Promise.all(categories.map(async (category) => {
    const subCategoriesCount = await SubCategory.countDocuments({ category: category._id });

    category.subCategoriesCount = subCategoriesCount;
    return category;
  }))

  const totalItems = modifiedCategories.length;
  const totalPages = Math.ceil(totalItems / limit);

  const paginatedCategories = modifiedCategories.slice(skip, skip + limit);

  return {
    data: paginatedCategories,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems,
      itemsPerPage: limit
    }
  }
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
