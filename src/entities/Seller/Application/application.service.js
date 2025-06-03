import RoleType from "../../../lib/types.js";
import User from "../../auth/auth.model.js";

export const createApplication = async (data) => {

    const existingEmail = await User.findOne({ email: data.email })
    if (existingEmail) {
        throw new Error('Email already exists');
    }

    // create new application 

    const user = new User.create({
        ...data,
        role: RoleType.USER,
        sellerStatus: 'pending'
    })

    const userObj = user.toObject();
    delete userObj.password;
    return userObj;

}
// Admin: Get all seller applications
export const getAllSellerApplicationsService = async () => {
  return await User.find({ sellerStatus: { $in: ['pending', 'rejected'] } }).sort({ createdAt: -1 });
};


// Admin: Approve seller
export const approveSellerApplicationService = async (userId, status) => {
  if (!['approved', 'rejected'].includes(status)) {
    throw new Error("Invalid status. Must be either 'approved' or 'rejected'");
  }

  const updateData = {
    sellerStatus: status
  };

  if (status === 'approved') {
    updateData.role = RoleType.SELLER;
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    updateData,
    { new: true }
  ).select('-password');

  if (!updatedUser) {
    throw new Error("User not found or update failed");
  }

  return updatedUser;
};

