const timetableService = require("../services/timetable.service");
const User = require("../models/User");
const { successResponse } = require("../utils/apiResponse");

/**
 * Lấy danh sách tiết thời khóa biểu theo bộ lọc
 */
const getTimetables = async (req, res, next) => {
  try {
    const data = await timetableService.getTimetables(req.query);
    return successResponse(res, data, "Lấy danh sách thời khóa biểu thành công");
  } catch (error) {
    next(error);
  }
};

/**
 * Lấy chi tiết 1 tiết thời khóa biểu
 */
const getTimetableById = async (req, res, next) => {
  try {
    const data = await timetableService.getTimetableById(req.params.id);
    return successResponse(res, data, "Lấy chi tiết thời khóa biểu thành công");
  } catch (error) {
    next(error);
  }
};

/**
 * Tạo mới 1 tiết thời khóa biểu
 */
const createTimetable = async (req, res, next) => {
  try {
    const data = await timetableService.createTimetableEntry(req.body);
    return successResponse(res, data, "Thêm tiết vào thời khóa biểu thành công", 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Cập nhật 1 tiết thời khóa biểu
 */
const updateTimetable = async (req, res, next) => {
  try {
    const data = await timetableService.updateTimetableEntry(req.params.id, req.body);
    return successResponse(res, data, "Cập nhật thời khóa biểu thành công");
  } catch (error) {
    next(error);
  }
};

/**
 * Xóa 1 tiết thời khóa biểu
 */
const deleteTimetable = async (req, res, next) => {
  try {
    const result = await timetableService.deleteTimetableEntry(req.params.id);
    return successResponse(res, result, result.message);
  } catch (error) {
    next(error);
  }
};

/**
 * Lấy thời khóa biểu theo lớp học (Hỗ trợ Học sinh, Giáo viên, Admin)
 */
const getClassTimetable = async (req, res, next) => {
  try {
    let { classId } = req.params;

    // Nếu học sinh hoặc gọi bí danh 'my-class' / 'me'
    if (classId === "my-class" || classId === "me" || !classId) {
      const studentUser = await User.findById(req.user.userId).select("classRef").lean();
      if (!studentUser || !studentUser.classRef) {
        return successResponse(
          res,
          { class: null, totalSlots: 0, slots: [], grid: {} },
          "Học sinh chưa được gán vào lớp học nào!"
        );
      }
      classId = studentUser.classRef;
    } else if (req.user.role === "student") {
      // Bảo vệ: Học sinh chỉ được xem lớp của chính mình
      const studentUser = await User.findById(req.user.userId).select("classRef").lean();
      if (!studentUser || String(studentUser.classRef) !== String(classId)) {
        const error = new Error("Học sinh chỉ được phép xem thời khóa biểu của lớp mình!");
        error.statusCode = 403;
        throw error;
      }
    }

    const data = await timetableService.getClassTimetable(classId, req.query);
    return successResponse(res, data, "Lấy thời khóa biểu lớp học thành công");
  } catch (error) {
    next(error);
  }
};

/**
 * Lấy thời khóa biểu theo giáo viên
 */
const getTeacherTimetable = async (req, res, next) => {
  try {
    let { teacherId } = req.params;

    if (!teacherId || teacherId === "me" || teacherId === "undefined" || teacherId === "null") {
      teacherId = req.user.userId;
    }

    const data = await timetableService.getTeacherTimetable(teacherId, req.query);
    return successResponse(res, data, "Lấy lịch giảng dạy thành công");
  } catch (error) {
    next(error);
  }
};

/**
 * Lấy thời khóa biểu của chính mình (my-schedule)
 */
const getMyTimetable = async (req, res, next) => {
  try {
    const data = await timetableService.getMyTimetable(req.user, req.query);
    return successResponse(res, data, "Lấy thời khóa biểu cá nhân thành công");
  } catch (error) {
    next(error);
  }
};

/**
 * Kiểm tra xung đột trước khi lưu (Pre-check conflict)
 */
const checkConflict = async (req, res, next) => {
  try {
    const result = await timetableService.checkTimetableConflict(req.body);
    return successResponse(
      res,
      result,
      result.hasConflict ? "Phát hiện xung đột thời khóa biểu" : "Lịch học hợp lệ, không bị trùng"
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Thiết lập / Cập nhật thời khóa biểu hàng loạt cho một Lớp
 */
const batchCreateOrUpdate = async (req, res, next) => {
  try {
    const data = await timetableService.batchCreateOrUpdateTimetable(req.body);
    return successResponse(res, data, "Thiết lập thời khóa biểu hàng loạt thành công", 201);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTimetables,
  getTimetableById,
  createTimetable,
  updateTimetable,
  deleteTimetable,
  getClassTimetable,
  getTeacherTimetable,
  getMyTimetable,
  checkConflict,
  batchCreateOrUpdate,
};
