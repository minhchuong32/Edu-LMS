const ApiError = require("../utils/ApiError");
const { verifyAccessToken } = require("../utils/jwt");
const User = require("../models/User");

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new ApiError(401, "Yêu cầu cung cấp Access Token hợp lệ.");
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyAccessToken(token);

    if (!decoded) {
      throw new ApiError(401, "Access Token đã hết hạn hoặc không hợp lệ.");
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      throw new ApiError(401, "Người dùng liên kết với token này không tồn tại.");
    }

    // Attach authenticated user information to request
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = authMiddleware;
