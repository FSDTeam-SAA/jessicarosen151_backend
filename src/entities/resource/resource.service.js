import mongoose from "mongoose";
import Review from "../review/review.model.js";
import Resource from "./resource.model.js";

export const createResourceService = async (data) => {
  const resource = new Resource(data);
  return await resource.save();
};


export const getAllResourcesService = async (page, limit, skip, status, sellerId, categoryName, price, practiceAreas, formatType, search) => {

  const query = sellerId ? { createdBy: sellerId } : {};
  if (status) query.status = new RegExp(`^${status}$`, 'i'); // allows full, case insensitive query
  if (formatType) query["format.type"] = new RegExp(`^${formatType}$`, 'i');
  if (price) query.price = { $gte: price[0], $lte: price[1] }

  if (practiceAreas) {
    query.practiceAreas = typeof practiceAreas === "string" ? new RegExp(`^${practiceAreas}$`, 'i') : {
      $all: practiceAreas.map(area => new RegExp(`^${area}$`, 'i'))
    };
  }

  const resources = (
    await Resource.find(query)
      .select("-__v -updatedAt")
      .populate("category", "name description")
      .populate("subCategory", "name description")
      .populate("createdBy", "firstName lastName email role")
      .sort({ createdAt: -1 })
      .lean()
  )

  const filteredResources = resources.filter((resource) => {

    const title = resource.title.toLowerCase();
    const description = resource.description?.toLowerCase() || "";
    const categoryNameLocal = resource.category.name.toLowerCase()
    const subCategoryName = resource.subCategory.name.toLowerCase()
    const practiceAreasList = resource.practiceAreas?.map(p => p.toLowerCase()) || [];

    const matchedSearch =
      search ?
        title.includes(search) ||
        description.includes(search) ||
        categoryNameLocal.includes(search) ||
        subCategoryName.includes(search) ||
        practiceAreasList.some(area => area.includes(search))
        : true;

    const matchedCategoryName = categoryName ? categoryNameLocal.includes(categoryName) : true;

    return matchedSearch && matchedCategoryName;
  })

  const modifiedResources = await Promise.all(filteredResources.map(async (resource) => {
    const averageRating = await Review.aggregate([
      { $match: { resourceId: new mongoose.Types.ObjectId(resource._id) } },
      {
        $group: {
          _id: "$resourceId",
          averageRating: { $avg: "$rating" }
        }
      }
    ])
    resource.averageRating = averageRating[0] ? averageRating[0].averageRating : 0;

    return resource;
  }))

  const totalItems = modifiedResources.length;
  const totalPages = Math.ceil(totalItems / limit);

  const paginatedResources = modifiedResources.slice(skip, skip + limit);

  return {
    data: paginatedResources,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems,
      itemsPerPage: limit
    }
  }
};


export const getResourceByIdService = async (id) => {
  return await Resource.findById(id)
    .populate("category", "name")
    .populate("subCategory", "name")
    .populate("createdBy", "firstName lastName email");
};


export const updateResourceService = async (id, updateData, user) => {

  if (user.role === "ADMIN") {
    if (updateData.status && user.role !== "ADMIN") {
      throw new Error("Only admin can update the status of a resource");
    }

    const updated = await Resource.findByIdAndUpdate(id, updateData, { new: true });
    if (!updated) throw new Error("Resource not found");
    return updated;
  }

  // Seller: can only update their own resources (not status)
  if (user.role === "SELLER") {
    const resource = await Resource.findById(id);
    if (!resource) throw new Error("Resource not found");

    if (resource.createdBy.toString() !== user._id) {
      throw new Error("Sellers can only update their own resources");
    }

    if (updateData.status) {
      throw new Error("Only admin can update the status of a resource");
    }

    const updated = await Resource.findByIdAndUpdate(id, updateData, { new: true });
    return updated;
  }

  throw new Error("Unauthorized role");
};


export const deleteResourceService = async (id, user) => {
  const resource = await Resource.findById(id);
  if (!resource) throw new Error("Resource not found or already deleted");

  // Admin can delete any resource
  if (user.role === "ADMIN") {
    await resource.deleteOne();
    return resource;
  }

  // Seller can only delete their own resources
  if (user.role === "SELLER") {
    if (!resource.createdBy.equals(user._id)) {
      throw new Error("Sellers can only delete their own resources");
    }

    await resource.deleteOne();
    return resource;
  }

  throw new Error("Unauthorized role");
};


export const getSellerResourcesService = async (myId) => {
  try {
    const resources = await Resource.find({ createdBy: myId })
      .populate("category", "name")
      .populate("subCategory", "name")
      .sort({ createdAt: -1 });

    return resources;
  } catch (error) {
    throw new Error("Error fetching seller resources: " + error.message);
  }
};
