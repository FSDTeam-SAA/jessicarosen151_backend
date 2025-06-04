import {
  createResourceService,
  getAllResourcesService,
  getResourceByIdService,
  updateResourceService,
  deleteResourceService,
  getSellerResourcesService,
} from "./resource.service.js";
import { generateResponse } from "../../lib/responseFormate.js";
import { cloudinaryUpload } from "../../lib/cloudinaryUpload.js";

export const createResource = async (req, res) => {
  try {
    const createdBy = req.user._id;
    const { 
      title, 
      description, 
      price, 
      discountPrice, 
      quantity, 
      country, 
      states, 
      resourceType, 
      practiceAreas 
    } = req.body;

    const thumbnailFile = req.files?.thumbnail?.[0];
    const file = req.files?.file?.[0];

    let thumbnail = null;
    let fileUrl = null;
    let fileType = null;

    if (thumbnailFile) {
      const result = await cloudinaryUpload(thumbnailFile.path, `thumb_${Date.now()}`, "resources/thumbnails");
      if (result?.secure_url) thumbnail = result.secure_url;
    }

    if (file) {
      const result = await cloudinaryUpload(
        file.path,
        `doc_${Date.now()}`,
        "resources/files"
      );
      if (result?.secure_url) fileUrl = result.secure_url;
      fileType = file.mimetype || "application/octet-stream";
    }

    let status = "pending";
    if (req.user.role === "ADMIN") {
      status = "approved";
    }

    const resource = await createResourceService({
      title,
      description,
      price,
      discountPrice,
      quantity,
      file: {
        url: fileUrl,
        type: fileType
      },
      thumbnail,
      country,
      states: states || [],
      resourceType: resourceType || [],
      createdBy,
      status,
      practiceAreas: practiceAreas || []
    });

    generateResponse(res, 201, true, "Resource created successfully", resource);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to create resource", error.message);
  }
};

export const getAllResources = async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const {
    status,
    sellerId,
    resourceType,
    price,
    practiceAreas,
    fileType,
    search,
    country,
    states
  } = req.query;

  try {
    const priceRange = price ? price.split(',').map(Number) : null;
    const statesArray = states ? states.split(',') : null;
    const practiceAreasArray = practiceAreas ? practiceAreas.split(',') : null;
    const resourceTypeArray = resourceType ? resourceType.split(',') : null;

    const { data, pagination } = await getAllResourcesService(
      page,
      limit,
      skip,
      status,
      sellerId,
      resourceTypeArray,
      priceRange,
      practiceAreasArray,
      fileType,
      search?.toLowerCase(),
      country,
      statesArray
    );

    return res.status(200).json({
      success: true,
      message: 'Fetched resources',
      data,
      pagination
    });
  } catch (error) {
    next(error);
  }
};

export const getResourceById = async (req, res, next) => {
  const resourceId = req.params.id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  
  try {
    const { data, pagination } = await getResourceByIdService(resourceId, page, limit, skip);
    return res.status(200).json({
      success: true,
      message: "Fetched resource successfully",
      data,
      pagination
    });
  } catch (error) {
    if (error.message === "Resource not found") {
      generateResponse(res, 404, false, error.message, null);
    } else {
      next(error);
    }
  }
};

export const updateResource = async (req, res) => {
  try {
    const updated = await updateResourceService(req.params.id, req.body, req.user);
    generateResponse(res, 200, true, "Resource updated successfully", updated);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to update resource", error.message);
  }
};

export const deleteResource = async (req, res) => {
  try {
    const deleted = await deleteResourceService(req.params.id, req.user);
    generateResponse(res, 200, true, "Resource deleted successfully", deleted);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to delete resource", error.message);
  }
};

export const getSellerResources = async (req, res) => {
  try {
    const myId = req.user._id;
    const resources = await getSellerResourcesService(myId);
    generateResponse(res, 200, true, "Fetched seller resources successfully", resources);
  } catch (error) {
    generateResponse(res, 500, false, "Failed to fetch seller resources", error.message);
  }
};