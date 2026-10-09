const bcrypt = require("bcryptjs");

/**
 * Mã hóa mật khẩu plain text với bcrypt
 * @param {string} password Mật khẩu thô
 * @param {number} saltRounds Độ phức tạp salt (mặc định 10)
 * @returns {Promise<string>} Mật khẩu đã hash
 */
const hashPassword = async (password, saltRounds = 10) => {
  const salt = await bcrypt.genSalt(saltRounds);
  return await bcrypt.hash(password, salt);
};

/**
 * So sánh mật khẩu thô với chuỗi hash trong database
 * @param {string} password Mật khẩu nhập vào
 * @param {string} hashedPassword Mật khẩu lưu trong CSDL
 * @returns {Promise<boolean>}
 */
const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

module.exports = {
  hashPassword,
  comparePassword,
};
