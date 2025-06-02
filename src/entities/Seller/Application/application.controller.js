import { generateResponse } from "../../../lib/responseFormate";
import { approveSellerApplicationService, createApplication, getAllSellerApplicationsService } from "./application.service";


export const applyToBecomeSellerController = async (req, res) => {
  try {
    const data = req.body;
    const created = await createApplication(data);
   generateResponse(res, 201, true, "Application created successfully", created);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to create application", error.message);
  }
};

export const getAllSellerApplicationsController = async (req, res) => {
  try {
    const applications = await getAllSellerApplicationsService();
    generateResponse(res, 200, true, "Fetched all seller applications", applications);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateSellerApplicationStatusController = async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;
    const updated = await approveSellerApplicationService(id, status);
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
