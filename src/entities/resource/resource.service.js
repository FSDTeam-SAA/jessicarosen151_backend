import Resource from "./resource.model.js";

export const createResourceService = async (data) => {
  const resource = new Resource(data);
  return await resource.save();
};


export const getAllResourcesService = async () => {
  return await Resource.find()
    .populate("category", "name")
    .populate("subCategory", "name")
    .populate("createdBy", "firstName lastName email role");
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


export const getSellerResourcesService = async (sellerId) => {
  try {
    const resources = await Resource.find({ createdBy: sellerId })
      .populate("category", "name")       
      .populate("subCategory", "name")    
      .sort({ createdAt: -1 });          

    return resources;
  } catch (error) {
    throw new Error("Error fetching seller resources: " + error.message);
  }
};
