const jwt = require("jsonwebtoken");

/**
 * Tạo Access Token
 * @param {object} payload Thông tin đưa vào token (userId, role...)
 * @param {string} expiresIn Thời gian hết hạn (mặc định '1d')
 * @returns {string}
 */
const generateAccessToken = (payload, expiresIn = process.env.JWT_EXPIRES_IN || "1d") => {
  const secret = process.env.JWT_SECRET || "default_jwt_secret_key";
  return jwt.sign(payload, secret, { expiresIn });
};

/**
 * Tạo Refresh Token
 * @param {object} payload
 * @param {string} expiresIn (mặc định '7d')
 * @returns {string}
 */
const generateRefreshToken = (payload, expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || "7d") => {
  const secret = process.env.JWT_REFRESH_SECRET || "default_jwt_refresh_secret_key";
  return jwt.sign(payload, secret, { expiresIn });
};

/**
 * Xác thực Token JWT
 * @param {string} token
 * @param {string} isRefreshToken Có phải mã refresh token không
 * @returns {object} Decoded payload
 */
const verifyToken = (token, isRefreshToken = false) => {
  const secret = isRefreshToken
    ? process.env.JWT_REFRESH_SECRET || "default_jwt_refresh_secret_key"
    : process.env.JWT_SECRET || "default_jwt_secret_key";
  return jwt.verify(token, secret);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
};
