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

    const emailLower = email.toLowerCase().trim();
    const user = await User.findOne({ email: emailLower }).populate("classRef");
    if (!user) {
      throw new ApiError(400, "Email này chưa được đăng ký trên hệ thống. Vui lòng kiểm tra lại.");
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new ApiError(400, "Mật khẩu không chính xác. Vui lòng kiểm tra lại.");
    }

    if (!user.isActivated) {
      throw new ApiError(400, "Tài khoản chưa được kích hoạt. Vui lòng kích hoạt tài khoản trước khi đăng nhập.");
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
            classRef: user.classRef ? { _id: user.classRef._id || user.classRef, name: user.classRef.name } : null,
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

    const emailLower = email.toLowerCase().trim();
    const cleanCode = code.trim();
    const codeNoDash = cleanCode.replace(/-/g, "");
    const escaped1 = cleanCode.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    const escaped2 = codeNoDash.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    const codeRegex = new RegExp(`^(${escaped1}|${escaped2})$`, "i");

    const userByEmail = await User.findOne({ email: emailLower });

    if (!userByEmail) {
      throw new ApiError(404, "Không tìm thấy tài khoản với Email này.");
    }

    if (userByEmail.isActivated) {
      throw new ApiError(400, "Tài khoản đã được kích hoạt trước đó.");
    }

    const userCode = (userByEmail.studentCode || userByEmail.teacherCode || "").trim();
    const userCodeNoDash = userCode.replace(/-/g, "");
    const isCodeMatch =
      codeRegex.test(userCode) ||
      cleanCode.toLowerCase() === userCode.toLowerCase() ||
      codeNoDash.toLowerCase() === userCodeNoDash.toLowerCase();

    if (!isCodeMatch) {
      throw new ApiError(404, "Không tìm thấy tài khoản phù hợp với Email và Mã định danh này.");
    }

    const user = userByEmail;

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
 * Verify activation details (code and email) before password setup
 */
const verifyActivation = async (req, res, next) => {
  try {
    const { code, email } = req.body;

    if (!code || !email) {
      throw new ApiError(400, "Vui lòng nhập đầy đủ mã định danh và email.");
    }

    const emailLower = email.toLowerCase().trim();
    const cleanCode = code.trim();
    const codeNoDash = cleanCode.replace(/-/g, "");
    const escaped1 = cleanCode.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    const escaped2 = codeNoDash.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    const codeRegex = new RegExp(`^(${escaped1}|${escaped2})$`, "i");

    const userByEmail = await User.findOne({ email: emailLower });

    if (!userByEmail) {
      throw new ApiError(404, "Không tìm thấy tài khoản với Email này.");
    }

    if (userByEmail.isActivated) {
      throw new ApiError(400, "Tài khoản đã được kích hoạt trước đó.");
    }

    const userCode = (userByEmail.studentCode || userByEmail.teacherCode || "").trim();
    const userCodeNoDash = userCode.replace(/-/g, "");
    const isCodeMatch =
      codeRegex.test(userCode) ||
      cleanCode.toLowerCase() === userCode.toLowerCase() ||
      codeNoDash.toLowerCase() === userCodeNoDash.toLowerCase();

    if (!isCodeMatch) {
      throw new ApiError(404, "Không tìm thấy tài khoản phù hợp với Email và Mã định danh này.");
    }

    const user = userByEmail;

    res.status(200).json(
      new ApiResponse(200, { name: user.name }, "Xác thực thông tin kích hoạt thành công.")
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
    const user = req.user.classRef && req.user.classRef.name
      ? req.user
      : await User.findById(req.user._id).populate("classRef");

    res.status(200).json(
      new ApiResponse(
        200,
        {
          user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            studentCode: user.studentCode,
            teacherCode: user.teacherCode,
            classRef: user.classRef ? { _id: user.classRef._id || user.classRef, name: user.classRef.name } : null,
          },
        },
        "Lấy thông tin người dùng hiện tại thành công."
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Change Password for authenticated user
 * Route: POST /api/v1/auth/change-password
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      throw new ApiError(400, "Vui lòng nhập đầy đủ mật khẩu hiện tại, mật khẩu mới và xác nhận mật khẩu mới.");
    }

    if (newPassword.length < 6) {
      throw new ApiError(400, "Mật khẩu mới phải chứa ít nhất 6 ký tự.");
    }

    if (newPassword !== confirmNewPassword) {
      throw new ApiError(400, "Xác nhận mật khẩu mới không trùng khớp với mật khẩu mới.");
    }

    if (currentPassword === newPassword) {
      throw new ApiError(400, "Mật khẩu mới không được trùng với mật khẩu hiện tại.");
    }

    // Fetch user with password field
    const user = await User.findById(req.user._id);
    if (!user) {
      throw new ApiError(404, "Không tìm thấy thông tin người dùng.");
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      throw new ApiError(400, "Mật khẩu hiện tại không chính xác.");
    }

    // Update password (pre-save hook will hash it)
    user.password = newPassword;
    await user.save();

    // Revoke all refresh tokens for this user so old sessions require re-login
    await RefreshToken.deleteMany({ userId: user._id });

    res.status(200).json(
      new ApiResponse(
        200,
        { requireRelogin: true },
        "Đổi mật khẩu thành công. Tất cả các phiên đăng nhập cũ đã được đăng xuất. Vui lòng đăng nhập lại."
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
  verifyActivation,
  getMe,
  changePassword,
};

