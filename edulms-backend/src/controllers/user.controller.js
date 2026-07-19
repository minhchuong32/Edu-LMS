const userService = require("../services/user.service");
const ApiResponse = require("../utils/ApiResponse");
const ApiError = require("../utils/ApiError");

/**
 * Controller to handle bulk import of users from Excel
 */
const importUsers = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new ApiError(400, "Vui lòng tải lên một tệp tin Excel (.xls, .xlsx)");
    }

    // Support role from body or query string
    const role = req.body.role || req.query.role;

    const result = await userService.importUsersFromExcel(req.file.buffer, role);

    res.status(200).json(
      new ApiResponse(200, result, "Thực hiện nhập dữ liệu từ Excel hoàn tất.")
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to list users with filters
 */
const listUsers = async (req, res, next) => {
  try {
    const { role, search } = req.query;
    const users = await userService.getUsers({ role, search });
    res.status(200).json(
      new ApiResponse(200, users, "Lấy danh sách người dùng thành công")
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  importUsers,
  listUsers
};
