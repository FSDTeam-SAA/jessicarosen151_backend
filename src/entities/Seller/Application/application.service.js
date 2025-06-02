import RoleType from "../../../lib/types";
import User from "../../auth/auth.model";

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
export const approveSellerApplicationService = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  user.sellerStatus = 'approved';
  user.role = RoleType.SELLER;

  await user.save();

  const userObj = user.toObject();
  delete userObj.password;
  return userObj;
};

