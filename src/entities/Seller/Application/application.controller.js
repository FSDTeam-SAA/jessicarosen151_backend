import { approveSellerApplicationService, createApplication, getAllSellerApplicationsService } from "./application.service";


export const applyToBecomeSellerController = async (req, res) => {
  try {
    const data = req.body;
    const created = await createApplication(data);
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getAllSellerApplicationsController = async (req, res) => {
  try {
    const applications = await getAllSellerApplicationsService();
    res.status(200).json({ success: true, data: applications });
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
