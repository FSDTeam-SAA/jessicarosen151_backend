import {
    createPromoCodeService,
    getAllPromoCodesService,
    getPromoCodeByIdService,
    updatePromoCodeService,
    deletePromoCodeService
} from "./promo.service.js";
import { generateResponse } from "../../lib/responseFormate.js";
import { createFilter, createPaginationInfo } from "../../lib/pagination.js";



export const createPromoCode = async (req, res) => {
  try {
    const { code, discount, startDate, expiryDate, status } = req.body;
    const createdBy = req.user._id;

    const promoCode = await createPromoCodeService({
      code,
      discount,
      startDate,
      expiryDate,
      status,
      createdBy,
    });

    generateResponse(res, 201, true, "Promo code created successfully", promoCode);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to create promo code", error.message);
  }
};


export const getAllPromoCodes = async (req, res) => {
  try {
    const { search, date, page = 1, limit = 10, code } = req.query;

    // base filter from helper
    const filter = createFilter(search, date);

    // append code-specific search if provided
    if (code) {
      filter.code = { $regex: code, $options: "i" };
    }

    const { data, totalData } = await getAllPromoCodesService(filter, page, limit);

    const pagination = createPaginationInfo(Number(page), Number(limit), totalData);

    generateResponse(res, 200, true, "Fetched promo codes", {
      data,
      pagination
    });
  } catch (error) {
    generateResponse(res, 500, false, "Failed to fetch promo codes", error.message);
  }
};


export const getPromoCodeById = async (req, res) => {
  try {
    const code = await getPromoCodeByIdService(req.params.id);
    if (!code) return generateResponse(res, 404, false, "Promo code not found");

    generateResponse(res, 200, true, "Fetched promo code", code);
  } catch (error) {
    generateResponse(res, 500, false, "Failed to fetch promo code", error.message);
  }
};


export const updatePromoCode = async (req, res) => {
  try {
    const updated = await updatePromoCodeService(req.params.id, req.body);
    generateResponse(res, 200, true, "Promo code updated successfully", updated);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to update promo code", error.message);
  }
};


export const deletePromoCode = async (req, res) => {
  try {
    const deleted = await deletePromoCodeService(req.params.id);
    generateResponse(res, 200, true, "Promo code deleted successfully", deleted);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to delete promo code", error.message);
  }
};
  