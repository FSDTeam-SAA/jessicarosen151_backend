import {
    createCategoryService,
    getAllCategoriesService,
    getCategoryByIdService,
    updateCategoryService,
    deleteCategoryService
} from './category.service.js';
import {generateResponse} from '../../lib/responseFormate.js';



export const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    const createdBy = req.user._id;

    const category = await createCategoryService({ name, description, createdBy });
    generateResponse(res, 201, true, 'Category created successfully', category);
  } catch (error) {
    generateResponse(res, 400, false, 'Failed to create category', error.message);
  }
};


export const getAllCategories = async (req, res) => {
  try {
    const categories = await getAllCategoriesService();
    generateResponse(res, 200, true, 'Fetched categories', categories);
  } catch (error) {
    generateResponse(res, 500, false, 'Failed to fetch categories', error.message);
  }
};


export const getCategoryById = async (req, res) => {
  try {
    const category = await getCategoryByIdService(req.params.id);
    if (!category) return generateResponse(res, 404, false, 'Category not found');

    generateResponse(res, 200, true, 'Fetched category', category);
  } catch (error) {
    generateResponse(res, 500, false, 'Failed to fetch category', error.message);
  }
};


export const updateCategory = async (req, res) => {
  try {
    const updated = await updateCategoryService(req.params.id, req.body);
    generateResponse(res, 200, true, 'Category updated successfully', updated);
  } catch (error) {
    generateResponse(res, 400, false, 'Failed to update category', error.message);
  }
};


export const deleteCategory = async (req, res) => {
  try {
    const deleted = await deleteCategoryService(req.params.id);
    generateResponse(res, 200, true, 'Category deleted successfully', deleted);
  } catch (error) {
    generateResponse(res, 400, false, 'Failed to delete category', error.message);
  }
};
  