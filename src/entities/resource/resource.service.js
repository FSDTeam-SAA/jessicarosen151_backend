import mongoose from "mongoose";
import Review from "../review/review.model.js";
import Resource from "./resource.model.js";

export const createResourceService = async (data) => {
  const resource = new Resource(data);
  return await resource.save();
};

export const getAllResourcesService = async (
  page, 
  limit, 
  skip, 
  status, 
  sellerId, 
  resourceType, 
  price, 
  practiceAreas, 
  fileType, 
  search,
  country,
  states,
  sortedBy
) => {
  const query = sellerId ? { createdBy: sellerId } : {};
  
  if (status) query.status = new RegExp(`^${status}$`, 'i');
  if (fileType) query["file.type"] = new RegExp(`^${fileType}$`, 'i');
  if (price) query.resultantPrice = { $gte: price[0], $lte: price[1] };
  if (country) query.country = new RegExp(`^${country}$`, 'i');
  if (states) query.states = { $in: states.map(state => new RegExp(`^${state}$`, 'i')) };

  if (practiceAreas) {
    query.practiceAreas = typeof practiceAreas === "string" 
      ? new RegExp(`^${practiceAreas}$`, 'i') 
      : { $in: practiceAreas.map(area => new RegExp(`^${area}$`, 'i')) };
  }

  if (resourceType) {
    query.resourceType = typeof resourceType === "string"
      ? new RegExp(`^${resourceType}$`, 'i')
      : { $in: resourceType.map(type => new RegExp(`^${type}$`, 'i')) };
  }
  

  const resources = await Resource.find(query)
    .select("-__v -updatedAt")
    .populate("createdBy", "firstName lastName email profileImage")
    .sort({ createdAt: -1 }) // initial sorting, may be overridden
    .lean();

  const filteredResources = resources.filter((resource) => {
    const title = resource.title.toLowerCase();
    const description = resource.description?.toLowerCase() || "";
    const practiceAreasList = resource.practiceAreas?.map(p => p.toLowerCase()) || [];
    const resourceTypes = resource.resourceType?.map(t => t.toLowerCase()) || [];

    const matchedSearch = search
      ? title.includes(search) ||
        description.includes(search) ||
        practiceAreasList.some(area => area.includes(search)) ||
        resourceTypes.some(type => type.includes(search))
      : true;

    return matchedSearch;
  });

  const modifiedResources = await Promise.all(
    filteredResources.map(async (resource) => {
      const reviewInfo = await Review.aggregate([
        { $match: { resourceId: new mongoose.Types.ObjectId(resource._id) } },
        {
          $group: {
            _id: "$resourceId",
            averageRating: { $avg: "$rating" },
            totalReviews: { $sum: 1 }
          }
        }
      ]);

      resource.averageRating = reviewInfo[0]?.averageRating || 0;
      resource.totalReviews = reviewInfo[0]?.totalReviews || 0;

      return resource;
    })
  );

  // Sorting logic based on 'sortedBy'
  let finalResources = [...modifiedResources];
  switch (sortedBy?.toLowerCase()) {
    case 'best reviewed':
    case 'rating':
      finalResources.sort((a, b) => b.averageRating - a.averageRating);
      break;
    case 'most recent':
      finalResources.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      break;
    case 'best sellers(products)':
      finalResources.sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0));
      break;
    case 'best sellers(people)':
      // You can implement seller-level aggregation here if needed
      break;
    case 'relevance':
    default:
      // Keep current filteredResources order (implicitly by match strength)
      break;
  }

  const totalItems = finalResources.length;
  const totalPages = Math.ceil(totalItems / limit);
  const paginatedResources = finalResources.slice(skip, skip + limit);

  return {
    data: paginatedResources,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems,
      itemsPerPage: limit
    }
  };
};

export const getResourceByIdService = async (id, page, limit, skip) => {
  const resource = await Resource.findById(id)
    .select("-__v -updatedAt")
    .populate("createdBy", "firstName lastName email profileImage")
    .lean();

  if (!resource) throw new Error("Resource not found");

  const [reviewInfo, reviews] = await Promise.all([
    Review.aggregate([
      { $match: { resourceId: new mongoose.Types.ObjectId(resource._id) } },
      {
        $group: {
          _id: "$resourceId",
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 }
        }
      }
    ]),
    Review.find({ resourceId: resource._id })
      .select("-__v -updatedAt -resourceId")
      .populate("userId", "firstName lastName email profileImage")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
  ]);

  const totalReviews = reviewInfo[0]?.totalReviews || 0;

  resource.averageRating = reviewInfo[0]?.averageRating || 0;
  resource.totalReviews = totalReviews;
  resource.reviews = reviews;

  const pagination = {
    currentPage: page,
    totalPages: Math.ceil(totalReviews / limit),
    totalItems: totalReviews,
    itemsPerPage: limit
  };

  return {
    data: resource,
    pagination
  };
};

export const updateResourceService = async (id, updateData, user) => {
  if (user.role === "ADMIN") {
    const updated = await Resource.findByIdAndUpdate(id, updateData, { new: true });
    if (!updated) throw new Error("Resource not found");
    return updated;
  }

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

  if (user.role === "ADMIN") {
    await resource.deleteOne();
    return resource;
  }

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
    return await Resource.find({ createdBy: myId }).sort({ createdAt: -1 });
  } catch (error) {
    throw new Error("Error fetching seller resources: " + error.message);
  }
};