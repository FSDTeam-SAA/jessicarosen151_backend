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

    if (updateData.status && user.role !== "ADMIN") {
       throw new Error("Only admin can update the status of a resource");
    }
    
    const updated = await Resource.findByIdAndUpdate(id, updateData, { new: true });
    if (!updated) throw new Error("Resource not found");
    return updated;
};
  

export const deleteResourceService = async (id) => {
  const deleted = await Resource.findByIdAndDelete(id);
  if (!deleted) throw new Error("Resource not found or alreadys deleted");
  return deleted;
};
