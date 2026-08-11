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
    const { role, search, classRef } = req.query;
    const users = await userService.getUsers({ role, search, classRef }, req.user);
    res.status(200).json(
      new ApiResponse(200, users, "Lấy danh sách người dùng thành công")
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to update student's classRef (assign or unassign class)
 */
const updateUserClass = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { classRef } = req.body;
    const user = await userService.updateUserClass(id, classRef);
    res.status(200).json(
      new ApiResponse(200, user, "Cập nhật lớp học cho học sinh thành công")
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to create a new user
 */
const createUser = async (req, res, next) => {
  try {
    const newUser = await userService.createUser(req.body);
    res.status(201).json(
      new ApiResponse(201, newUser, "Tạo người dùng mới thành công.")
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to get single user details by ID
 */
const getUserById = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id);
    res.status(200).json(
      new ApiResponse(200, user, "Lấy thông tin người dùng thành công.")
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to update a user by ID
 */
const updateUser = async (req, res, next) => {
  try {
    const updatedUser = await userService.updateUser(req.params.id, req.body);
    res.status(200).json(
      new ApiResponse(200, updatedUser, "Cập nhật người dùng thành công.")
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to delete a user by ID
 */
const deleteUser = async (req, res, next) => {
  try {
    const result = await userService.deleteUser(req.params.id, req.user);
    res.status(200).json(
      new ApiResponse(200, result, "Xóa người dùng thành công.")
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  importUsers,
  listUsers,
  updateUserClass,
  createUser,
  getUserById,
  updateUser,
  deleteUser,
};


