import HeroSection from "./herosection.model.js";
import { cloudinaryUpload } from "../../../../lib/cloudinaryUpload.js";

// Create hero section
export const createHeroSection = async (data, filePath) => {

console.log("Creating hero section with data:", data, "and filePath:");

  if (filePath) {
    const uploadResult = await cloudinaryUpload(filePath, `hero-${Date.now()}`, "hero-section");
    if (!uploadResult?.url) throw new Error("Image upload failed");
    data.image = uploadResult.url;
  }
  return await HeroSection.create(data);
};

// Get all hero sections
export const getAllHeroSections = async () => {
  return await HeroSection.findOne().sort({ createdAt: -1 }).limit(1);
};

// Get hero section by ID
export const getHeroSectionById = async (id) => {
  return await HeroSection.findById(id);
};

// Update hero section
export const updateHeroSection = async (id, data, filePath) => {
  if (filePath) {
    const uploadResult = await cloudinaryUpload(filePath, `hero-${Date.now()}`, "hero-section");
    if (!uploadResult?.url) throw new Error("Image upload failed");
    data.image = uploadResult.url;
  }
  return await HeroSection.findByIdAndUpdate(id, data, { new: true });
};

// Delete hero section
export const deleteHeroSection = async (id) => {
  return await HeroSection.findByIdAndDelete(id);
};
