import { generateResponse } from "../../../lib/responseFormate.js";
import {  getSellerDashboardSummaryService, getSellerRevenueReportService, getSellerSalesHistoryService } from "./dashboard.service.js";


export const getSellerDashboardSummary = async (req, res) => {
  try {
    const result = await getSellerDashboardSummaryService(req.user._id);
    generateResponse(res, 200, true, "Seller dashboard summary", result);
  } catch (error) {
    generateResponse(res, 500, false, "Failed to fetch seller dashboard summary", error.message);
  }
};


export const getSellerRevenueReport = async (req, res) => {
  try {
    const filter = req.query.filter || "month"; 
    const data = await getSellerRevenueReportService(req.user._id, filter);
    generateResponse(res, 200, true, "Revenue report fetched successfully", data);
  } catch (error) {
    generateResponse(res, 500, false, error.message);
  }
};


export const getSellerSalesHistory = async (req, res) => {
  try {
    const { search = "" } = req.query;

    const result = await getSellerSalesHistoryService(req.user._id, search.trim());

    generateResponse(res, 200, true, "Seller sales history fetched", result);
  } catch (error) {
    generateResponse(res, 500, false, "Failed to fetch  sales", error.message);
  }
};





