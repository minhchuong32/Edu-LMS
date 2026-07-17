const User = require("../models/User");
const RefreshToken = require("../models/RefreshToken");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require("../utils/jwt");

// Helper to manually parse cookies from headers
const parseCookies = (cookieHeader) => {
  const list = {};
  if (!cookieHeader) return list;

  cookieHeader.split(";").forEach((cookie) => {
    let [name, ...rest] = cookie.split("=");
    name = name.trim();
    if (!name) return;
    const val = rest.join("=").trim();
    if (!val) return;
    list[name] = decodeURIComponent(val);
  });

  return list;
};

// Cookie configuration
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // None for secure cross-site, lax for localhost
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

/**
 * Log in a user and issue tokens
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ApiError(400, "Vui lòng nhập đầy đủ email và mật khẩu.");
    }

    const user = await User.findOne({ email });
    if (!user) {
      throw new ApiError(401, "Email hoặc mật khẩu không chính xác.");
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new ApiError(401, "Email hoặc mật khẩu không chính xác.");
    }

    if (!user.isActivated) {
      throw new ApiError(403, "Tài khoản chưa được kích hoạt. Vui lòng kích hoạt trước.");
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token to DB
    await RefreshToken.create({
      token: refreshToken,
      userId: user._id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    // Set refresh token in HTTP-Only cookie
    res.cookie("refreshToken", refreshToken, COOKIE_OPTIONS);

    res.status(200).json(
      new ApiResponse(
        200,
        {
          token: accessToken,
          user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            studentCode: user.studentCode,
            teacherCode: user.teacherCode,
          },
        },
        "Đăng nhập thành công."
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Log out user by revoking refresh token
 */
const logout = async (req, res, next) => {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const refreshToken = cookies.refreshToken;

    if (refreshToken) {
      // Remove refresh token from DB
      await RefreshToken.deleteOne({ token: refreshToken });
    }

    // Clear client cookie
    res.clearCookie("refreshToken", {
      ...COOKIE_OPTIONS,
      maxAge: 0,
    });

    res.status(200).json(
      new ApiResponse(200, null, "Đăng xuất thành công.")
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Rotate Access/Refresh Token pair using Refresh Token
 */
const refresh = async (req, res, next) => {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const refreshToken = cookies.refreshToken;

    if (!refreshToken) {
      throw new ApiError(401, "Không tìm thấy Refresh Token. Vui lòng đăng nhập lại.");
    }

    // Find token in database
    const tokenDoc = await RefreshToken.findOne({ token: refreshToken });

    // 1. Detection of Token Reuse
    if (tokenDoc && tokenDoc.isUsed) {
      // Revoke all tokens for this user immediately as a safety precaution
      await RefreshToken.deleteMany({ userId: tokenDoc.userId });
      
      // Clear cookie
      res.clearCookie("refreshToken", {
        ...COOKIE_OPTIONS,
        maxAge: 0,
      });

      throw new ApiError(
        403,
        "Cảnh báo bảo mật: Token đã được sử dụng trước đó. Tất cả phiên làm việc đã bị hủy."
      );
    }

    // If token does not exist in DB (e.g. already revoked/deleted) or fails JWT verification
    const decoded = verifyRefreshToken(refreshToken);
    if (!tokenDoc || !decoded) {
      // Clear invalid cookie
      res.clearCookie("refreshToken", {
        ...COOKIE_OPTIONS,
        maxAge: 0,
      });
      throw new ApiError(401, "Refresh Token không hợp lệ hoặc đã hết hạn.");
    }

    // Check expiration manually
    if (tokenDoc.expiresAt < new Date()) {
      await RefreshToken.deleteOne({ _id: tokenDoc._id });
      res.clearCookie("refreshToken", {
        ...COOKIE_OPTIONS,
        maxAge: 0,
      });
      throw new ApiError(401, "Refresh Token đã hết hạn.");
    }

    const user = await User.findById(tokenDoc.userId);
    if (!user) {
      throw new ApiError(401, "Người dùng không tồn tại.");
    }

    // Generate new Access and Refresh tokens
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    // Rotate refresh token: Mark current token as used and set replacedBy
    tokenDoc.isUsed = true;
    tokenDoc.replacedBy = newRefreshToken;
    await tokenDoc.save();

    // Save the new refresh token in DB
    await RefreshToken.create({
      token: newRefreshToken,
      userId: user._id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    // Set new refresh token in HTTP-only cookie
    res.cookie("refreshToken", newRefreshToken, COOKIE_OPTIONS);

    res.status(200).json(
      new ApiResponse(
        200,
        {
          token: newAccessToken,
        },
        "Làm mới token thành công."
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * First-time account activation
 */
const activate = async (req, res, next) => {
  try {
    const { code, email, password } = req.body;

    if (!code || !email || !password) {
      throw new ApiError(400, "Vui lòng nhập đầy đủ mã định danh, email và mật khẩu mới.");
    }

    if (password.length < 6) {
      throw new ApiError(400, "Mật khẩu phải chứa ít nhất 6 ký tự.");
    }

    // Escape special regex characters in the code
    const escapedCode = code.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    const codeRegex = new RegExp(`^${escapedCode}$`, "i");

    // Find user by email and either studentCode or teacherCode matching code case-insensitively
    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      $or: [
        { studentCode: codeRegex },
        { teacherCode: codeRegex },
      ],
    });

    if (!user) {
      throw new ApiError(
        404,
        "Không tìm thấy tài khoản tương ứng với Email và Mã định danh đã cung cấp."
      );
    }

    if (user.isActivated) {
      throw new ApiError(400, "Tài khoản đã được kích hoạt trước đó.");
    }

    // Update password (hashed in pre-save hook) and activate
    user.password = password;
    user.isActivated = true;
    await user.save();

    res.status(200).json(
      new ApiResponse(200, null, "Kích hoạt tài khoản thành công.")
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get current authenticated user details
 */
const getMe = async (req, res, next) => {
  try {
    res.status(200).json(
      new ApiResponse(
        200,
        {
          user: {
            _id: req.user._id,
            name: req.user.name,
            email: req.user.email,
            role: req.user.role,
            studentCode: req.user.studentCode,
            teacherCode: req.user.teacherCode,
          },
        },
        "Lấy thông tin người dùng hiện tại thành công."
      )
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  logout,
  refresh,
  activate,
  getMe,
};
