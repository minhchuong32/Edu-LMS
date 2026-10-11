const { verifyToken } = require("../utils/jwt");

/**
 * Middleware xác thực Access Token JWT từ Header Authorization
 */
const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Không tìm thấy mã xác thực. Vui lòng đăng nhập lại!",
      });
    }

    // Giải mã token
    const decoded = verifyToken(token);
    
    // Gán thông tin người dùng vào request
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!",
      });
    }
    return res.status(401).json({
      success: false,
      message: "Mã xác thực không hợp lệ!",
    });
  }
};

module.exports = {
  protect,
};
