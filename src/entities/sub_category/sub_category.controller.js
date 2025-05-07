import {
  createSubCategoryService,
  getAllSubCategoriesService,
  getSubCategoryByIdService,
  updateSubCategoryService,
  deleteSubCategoryService
} from "./sub_category.service.js";
import { generateResponse } from "../../lib/responseFormate.js";



export const createSubCategory = async (req, res) => {
  try {
    const { name, description, category } = req.body;
    const subCategory = await createSubCategoryService({ name, description, category });
    generateResponse(res, 201, true, "Sub-category created successfully", subCategory);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to create sub-category", error.message);
  }
};


export const getAllSubCategories = async (req, res) => {
  const { categoryId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  try {
    const { data, pagination } = await getAllSubCategoriesService(categoryId, page, limit, skip);
    return res.status(200).json({
      success: true,
      message: 'Fetched sub categories',
      data,
      pagination
    });
  }

  catch (error) {
    generateResponse(res, 500, false, "Failed to fetch sub-categories", error.message);
  }
};


export const getSubCategoryById = async (req, res) => {
  try {
    const subCategory = await getSubCategoryByIdService(req.params.id);
    if (!subCategory) return generateResponse(res, 404, false, "Sub-category not found");

    generateResponse(res, 200, true, "Fetched sub-category", subCategory);
  } catch (error) {
    generateResponse(res, 500, false, "Failed to fetch sub-category", error.message);
  }
};


export const updateSubCategory = async (req, res) => {
  try {
    const updated = await updateSubCategoryService(req.params.id, req.body);
    generateResponse(res, 200, true, "Sub-category updated successfully", updated);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to update sub-category", error.message);
  }
};


export const deleteSubCategory = async (req, res) => {
  try {
    const deleted = await deleteSubCategoryService(req.params.id);
    generateResponse(res, 200, true, "Sub-category deleted successfully", deleted);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to delete sub-category", error.message);
  }
};
