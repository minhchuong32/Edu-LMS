const User = require("../models/User");
const ApiError = require("../utils/ApiError");

/**
 * Get children for the current authenticated parent from JWT user
 * @param {Object} currentUser - Current user from req.user
 */
const getMyChildren = async (currentUser) => {
  if (!currentUser) {
    throw new ApiError(401, "Yêu cầu đăng nhập trước.");
  }

  if (currentUser.role !== "parent" && currentUser.role !== "admin") {
    throw new ApiError(403, "Chỉ có phụ huynh mới có quyền truy cập danh sách con em.");
  }

  // Fetch full parent user doc to get latest childrenRefs
  const parentUser = await User.findById(currentUser._id);
  if (!parentUser) {
    throw new ApiError(404, "Không tìm thấy thông tin tài khoản.");
  }

  const childrenIds = parentUser.childrenRefs || [];
  if (childrenIds.length === 0) {
    return [];
  }

  const children = await User.find({ _id: { $in: childrenIds } })
    .select("_id name email studentCode classRef isActivated")
    .populate("classRef", "name schoolYear");

  return children;
};

module.exports = {
  getMyChildren,
};
