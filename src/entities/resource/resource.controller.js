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
    const { title, description, price, discountPrice, quantity, category, subCategory, practiceAreas } = req.body;
    console.log(practiceAreas);

    const thumbnailFile = req.files?.thumbnail?.[0];
    const formatFile = req.files?.format?.[0];

    let thumbnail = null;
    let formatUrl = null;

    if (thumbnailFile) {
      const result = await cloudinaryUpload(thumbnailFile.path, `thumb_${Date.now()}`, "resources/thumbnails");
      if (result?.secure_url) thumbnail = result.secure_url;
    }
    console.log(formatFile);

    if (formatFile) {
      const result = await cloudinaryUpload(formatFile.path, `doc_${Date.now()}`, "resources/formats");
      console.log(result);
      if (result?.secure_url) formatUrl = result.secure_url;
    }

    // status handling
    let status = "pending";
    if (req.user.role == "ADMIN") {
      status = "approved";
    }


    const resource = await createResourceService({
      title,
      description,
      price,
      discountPrice,
      quantity,
      format: formatUrl,
      category,
      subCategory,
      thumbnail: thumbnail,
      formatUrl,
      createdBy,
      status,
      practiceAreas
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
  const status = req.query.status ? req.query.status.toLowerCase() : null;
  const sellerId = req.query.sellerId;
  const categoryName = req.query.categoryName ? req.query.categoryName.toLowerCase() : null;
  const price = req.query.price ? req.query.price.map(Number) : null;
  const practiceAreas = req.query.practiceAreas;
  const search = req.query.search ? req.query.search.toLowerCase() : null;

  try {
    const { data, pagination } = await getAllResourcesService(page, limit, skip, status, sellerId, categoryName, price, practiceAreas, search);
    return res.status(200).json({
      success: true,
      message: 'Fetched resources',
      data,
      pagination
    });
  }

  catch (error) {
    next(error)
  }
}


export const getResourceById = async (req, res) => {
  try {
    const resource = await getResourceByIdService(req.params.id);
    if (!resource) return generateResponse(res, 404, false, "Resource not found");

    generateResponse(res, 200, true, "Fetched resource", resource);
  } catch (error) {
    generateResponse(res, 500, false, "Failed to fetch resource", error.message);
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
    const sellerId = req.user._id;

    const resources = await getSellerResourcesService(sellerId);

    generateResponse(res, 200, true, "Fetched seller resources successfully", resources);
  } catch (error) {
    generateResponse(res, 500, false, "Failed to fetch seller resources", error.message);
  }
};
