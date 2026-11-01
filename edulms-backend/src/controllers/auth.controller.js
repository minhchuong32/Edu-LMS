const {
  activateAccount,
  verifyActivationInfo,
  loginUser,
  refreshSession,
  logoutUser,
  getCurrentUser,
} = require("../services/auth.service");
const { successResponse } = require("../utils/apiResponse");

const REFRESH_TOKEN_COOKIE = "refreshToken";

/**
 * Cấu hình bảo mật cho HttpOnly Cookie
 */
const getCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
    path: "/",
  };
};

/**
 * POST /api/v1/auth/verify-activation
 * Kiểm tra mã định danh và email trong Bước 1 trước khi đặt mật khẩu mới
 */
const verifyActivation = async (req, res, next) => {
  try {
    const data = await verifyActivationInfo(req.body);
    return successResponse(
      res,
      data,
      "Xác thực thông tin tài khoản thành công!",
      200
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/activate
 * Kích hoạt tài khoản bằng mã định danh (userCode), email và mật khẩu mới
 */
const activate = async (req, res, next) => {
  try {
    const user = await activateAccount(req.body);
    return successResponse(
      res,
      user,
      "Kích hoạt tài khoản thành công! Vui lòng đăng nhập bằng mật khẩu vừa thiết lập.",
      200
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/login
 * Đăng nhập bằng email và mật khẩu
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { accessToken, refreshToken, user } = await loginUser({
      email,
      password,
    });

    // Lưu Refresh Token vào HttpOnly Cookie
    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, getCookieOptions());

    return successResponse(
      res,
      {
        user,
        accessToken,
      },
      "Đăng nhập thành công!",
      200
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/refresh
 * Làm mới Access Token và xoay vòng Refresh Token (Token Rotation)
 */
const refresh = async (req, res, next) => {
  try {
    // Lấy refresh token từ HttpOnly Cookie hoặc body (fallback)
    const token = req.cookies?.[REFRESH_TOKEN_COOKIE] || req.body?.refreshToken;

    const { accessToken, refreshToken, user } = await refreshSession(token);

    // Cập nhật Refresh Token mới vào HttpOnly Cookie sau khi rotate
    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, getCookieOptions());

    return successResponse(
      res,
      {
        user,
        accessToken,
      },
      "Làm mới phiên đăng nhập thành công!",
      200
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/logout
 * Đăng xuất: Vô hiệu hóa Refresh Token trong CSDL và xóa HttpOnly Cookie
 */
const logout = async (req, res, next) => {
  try {
    const token = req.cookies?.[REFRESH_TOKEN_COOKIE] || req.body?.refreshToken;

    await logoutUser(token);

    // Xóa HttpOnly Cookie
    res.clearCookie(REFRESH_TOKEN_COOKIE, {
      ...getCookieOptions(),
      maxAge: 0,
    });

    return successResponse(res, null, "Đăng xuất thành công!", 200);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/auth/me
 * Lấy thông tin tài khoản hiện tại (yêu cầu Access Token)
 */
const getMe = async (req, res, next) => {
  try {
    const user = await getCurrentUser(req.user.userId);
    return successResponse(res, { user }, "Lấy thông tin người dùng thành công!", 200);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  verifyActivation,
  activate,
  login,
  refresh,
  logout,
  getMe,
};
