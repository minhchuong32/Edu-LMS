const ApiError = require("../utils/ApiError");

/**
 * Middleware to restrict access to specific roles
 * @param {...String} roles Allowed roles
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, "Yêu cầu đăng nhập trước."));
    }
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, "Bạn không có quyền thực hiện hành động này."));
    }
    next();
  };
};

module.exports = restrictTo;
