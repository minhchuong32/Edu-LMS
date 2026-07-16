const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "edulms_jwt_secret_key_2026_super_secure";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "edulms_jwt_refresh_secret_key_2026_super_secure";

/**
 * Generate Access Token
 * @param {Object} user User object/document
 * @returns {String} Signed Access Token
 */
const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    {
      expiresIn: "15m",
    }
  );
};

/**
 * Generate Refresh Token
 * @param {Object} user User object/document
 * @returns {String} Signed Refresh Token
 */
const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
    },
    JWT_REFRESH_SECRET,
    {
      expiresIn: "7d",
    }
  );
};

/**
 * Verify Access Token
 * @param {String} token Token to verify
 * @returns {Object|null} Decoded token payload if valid, else null
 */
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
};

/**
 * Verify Refresh Token
 * @param {String} token Token to verify
 * @returns {Object|null} Decoded token payload if valid, else null
 */
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET);
  } catch (err) {
    return null;
  }
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
