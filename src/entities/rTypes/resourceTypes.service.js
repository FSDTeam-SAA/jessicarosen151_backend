import ResourceType from "./resourceTypes.model.js";

export const createPracticeAreaService = async ({ name, description }) => {
  const existing = await ResourceType.findOne({ name: name.trim() });
  if (existing) throw new Error('Practice Area already exists.');

  const practiceArea = new ResourceType({ name, description });
  return await practiceArea.save();
};


export const getAllPracticeAreasService = async () => {
  const practiceAreas = (
    await ResourceType.find({})
  )
  return practiceAreas;
};

export const getPracticeAreaByIdService = async (practiceAreaId) => {
  return await ResourceType.findById(practiceAreaId);
};

export const updatePracticeAreaService = async (practiceAreaId, updateData) => {
  const updated = await ResourceType.findByIdAndUpdate(practiceAreaId, updateData, { new: true });
  if (!updated) throw new Error('Practice Area not found');
  return updated;
};

export const deletePracticeAreaService = async (practiceAreaId) => {
  const deleted = await ResourceType.findByIdAndDelete(practiceAreaId);
  if (!deleted) throw new Error('Practice Area not found or already deleted');
  return deleted;
};

