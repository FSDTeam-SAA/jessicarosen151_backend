import PracticeArea from "./practiceArea.model.js";

export const createPracticeAreaService = async ({ name, description }) => {
  const existing = await PracticeArea.findOne({ name: name.trim() });
  if (existing) throw new Error('Practice Area already exists.');

  const practiceArea = new PracticeArea({ name, description });
  return await practiceArea.save();
};


export const getAllPracticeAreasService = async () => {
  const practiceAreas = (
    await PracticeArea.find({}).limit(15)
  )
  return practiceAreas;
};

export const getPracticeAreaByIdService = async (practiceAreaId) => {
  return await PracticeArea.findById(practiceAreaId);
};

export const updatePracticeAreaService = async (practiceAreaId, updateData) => {
  const updated = await PracticeArea.findByIdAndUpdate(practiceAreaId, updateData, { new: true });
  if (!updated) throw new Error('Practice Area not found');
  return updated;
};

export const deletePracticeAreaService = async (practiceAreaId) => {
  const deleted = await PracticeArea.findByIdAndDelete(practiceAreaId);
  if (!deleted) throw new Error('Practice Area not found or already deleted');
  return deleted;
};
