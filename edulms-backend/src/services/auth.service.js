const crypto = require("crypto");
const User = require("../models/User");
const RefreshToken = require("../models/RefreshToken");
const { hashPassword, comparePassword } = require("../utils/password");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
} = require("../utils/jwt");

class AuthError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

/**
 * Kích hoạt tài khoản bằng mã định danh (userCode), email và mật khẩu mới
 * @param {object} params
 * @param {string} params.userCode Mã học sinh / giáo viên
 * @param {string} params.email Email đã được Admin đăng ký
 * @param {string} params.password Mật khẩu mới do người dùng thiết lập
 */
const activateAccount = async (params = {}) => {
  const userCode =
    params.userCode ||
    params.code ||
    params.studentCode ||
    params.teacherCode ||
    params.identifier;
  const email = params.email;
  const password = params.password || params.newPassword;

  if (!userCode || !email || !password) {
    throw new AuthError("Vui lòng cung cấp đầy đủ mã định danh, email và mật khẩu mới", 400);
  }

  const normalizedUserCode = String(userCode).trim();
  const normalizedEmail = String(email).trim().toLowerCase();

  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
    throw new AuthError("Địa chỉ email không đúng định dạng", 400);
  }

  if (password.length < 6) {
    throw new AuthError("Mật khẩu mới phải có ít nhất 6 ký tự", 400);
  }

  // Tìm người dùng theo userCode (mã định danh)
  const user = await User.findOne({ userCode: normalizedUserCode });

  // Kiểm tra mã định danh và email phải khớp cùng một tài khoản
  if (!user || user.email.toLowerCase() !== normalizedEmail) {
    throw new AuthError("Mã định danh hoặc email không chính xác hoặc không khớp với hệ thống", 400);
  }

  // Tài khoản đã kích hoạt không được kích hoạt lại
  if (user.isActivated) {
    throw new AuthError("Tài khoản này đã được kích hoạt trước đó. Vui lòng đăng nhập!", 400);
  }

  // Hash mật khẩu mới và cập nhật trạng thái kích hoạt
  const hashedPassword = await hashPassword(password);
  user.password = hashedPassword;
  user.isActivated = true;
  user.mustChangePassword = false;
  await user.save();

  return {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    userCode: user.userCode,
    role: user.role,
    className: user.className,
    isActivated: user.isActivated,
  };
};

/**
 * Kiểm tra thông tin kích hoạt bước 1 (mã định danh và email)
 * @param {object} params
 */
const verifyActivationInfo = async (params = {}) => {
  const userCode =
    params.userCode ||
    params.code ||
    params.studentCode ||
    params.teacherCode ||
    params.identifier;
  const email = params.email;

  if (!userCode || !email) {
    throw new AuthError("Vui lòng cung cấp đầy đủ mã định danh và email", 400);
  }

  const normalizedUserCode = String(userCode).trim();
  const normalizedEmail = String(email).trim().toLowerCase();

  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
    throw new AuthError("Địa chỉ email không đúng định dạng", 400);
  }

  const user = await User.findOne({ userCode: normalizedUserCode });

  if (!user || user.email.toLowerCase() !== normalizedEmail) {
    throw new AuthError("Mã định danh hoặc email không chính xác hoặc không khớp với hệ thống", 400);
  }

  if (user.isActivated) {
    throw new AuthError("Tài khoản này đã được kích hoạt trước đó. Vui lòng đăng nhập!", 400);
  }

  return {
    fullName: user.fullName,
    role: user.role,
    className: user.className,
    userCode: user.userCode,
    email: user.email,
  };
};

/**
 * Đăng nhập người dùng bằng email và mật khẩu
 * @param {object} params
 * @param {string} params.email
 * @param {string} params.password
 */
const loginUser = async ({ email, password }) => {
  if (!email || !password) {
    throw new AuthError("Vui lòng nhập email và mật khẩu", 400);
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    throw new AuthError("Email hoặc mật khẩu không chính xác", 401);
  }

  // Kiểm tra tài khoản đã kích hoạt chưa
  if (user.isActivated === false) {
    throw new AuthError(
      "Tài khoản chưa được kích hoạt. Vui lòng kích hoạt tài khoản bằng mã định danh và email trước khi đăng nhập!",
      403
    );
  }

  const isPasswordMatch = await comparePassword(password, user.password);
  if (!isPasswordMatch) {
    throw new AuthError("Email hoặc mật khẩu không chính xác", 401);
  }

  // Tạo Access Token (15 phút) và Refresh Token (7 ngày)
  const payload = {
    userId: user._id,
    role: user.role,
    email: user.email,
    userCode: user.userCode,
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken({
    userId: user._id,
    tokenId: crypto.randomUUID(),
  });

  // Lưu Refresh Token vào CSDL (hết hạn sau 7 ngày)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await RefreshToken.create({
    token: refreshToken,
    user: user._id,
    expiresAt,
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      userCode: user.userCode,
      role: user.role,
      className: user.className,
      isActivated: user.isActivated,
      mustChangePassword: user.mustChangePassword,
    },
  };
};

/**
 * Làm mới phiên đăng nhập và xoay vòng Refresh Token (Token Rotation)
 * @param {string} oldRefreshToken
 */
const refreshSession = async (oldRefreshToken) => {
  if (!oldRefreshToken) {
    throw new AuthError("Không tìm thấy Refresh Token. Vui lòng đăng nhập lại!", 401);
  }

  try {
    verifyToken(oldRefreshToken, true);
  } catch {
    throw new AuthError("Refresh Token đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại!", 401);
  }

  // Kiểm tra token trong CSDL
  const tokenDoc = await RefreshToken.findOne({ token: oldRefreshToken });

  if (!tokenDoc || tokenDoc.isRevoked) {
    // Phát hiện token bị tái sử dụng (Reuse detection) - thu hồi toàn bộ token của user để bảo mật
    if (tokenDoc && tokenDoc.isRevoked) {
      await RefreshToken.deleteMany({ user: tokenDoc.user });
    }
    throw new AuthError("Refresh Token không hợp lệ hoặc đã bị vô hiệu hóa!", 401);
  }

  const user = await User.findById(tokenDoc.user);
  if (!user) {
    throw new AuthError("Không tìm thấy người dùng tương ứng với token!", 401);
  }

  // Xoay vòng Refresh Token (Token Rotation): Xóa token cũ
  await RefreshToken.deleteOne({ _id: tokenDoc._id });

  // Tạo cặp token mới
  const payload = {
    userId: user._id,
    role: user.role,
    email: user.email,
    userCode: user.userCode,
  };

  const newAccessToken = generateAccessToken(payload);
  const newRefreshToken = generateRefreshToken({
    userId: user._id,
    tokenId: crypto.randomUUID(),
  });

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await RefreshToken.create({
    token: newRefreshToken,
    user: user._id,
    expiresAt,
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      userCode: user.userCode,
      role: user.role,
      className: user.className,
      isActivated: user.isActivated,
    },
  };
};

/**
 * Đăng xuất: Vô hiệu hóa/Xóa Refresh Token khỏi CSDL
 * @param {string} refreshToken
 */
const logoutUser = async (refreshToken) => {
  if (refreshToken) {
    await RefreshToken.deleteMany({ token: refreshToken });
  }
  return true;
};

/**
 * Lấy thông tin người dùng hiện tại
 * @param {string} userId
 */
const getCurrentUser = async (userId) => {
  const user = await User.findById(userId).select("-password");
  if (!user) {
    throw new AuthError("Người dùng không tồn tại!", 404);
  }
  return user;
};

module.exports = {
  AuthError,
  activateAccount,
  verifyActivationInfo,
  loginUser,
  refreshSession,
  logoutUser,
  getCurrentUser,
};
