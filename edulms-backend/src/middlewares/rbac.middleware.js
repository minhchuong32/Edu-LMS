/**
 * Middleware phân quyền người dùng (Role-Based Access Control)
 * @param  {...string} roles Danh sách các vai trò được phép truy cập ('admin', 'teacher', 'student', 'parent')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Chưa xác thực thông tin người dùng!",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Tài khoản với vai trò '${req.user.role}' không có quyền truy cập tài nguyên này!`,
      });
    }

    next();
  };
};

module.exports = {
  authorize,
};
