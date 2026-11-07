const assignmentService = require("../services/assignment.service");
const { successResponse } = require("../utils/apiResponse");

const getAssignments = async (req, res, next) => {
  try {
    const assignments = await assignmentService.getAssignments(req.query);
    return successResponse(res, assignments, "Lấy danh sách phân công giảng dạy thành công");
  } catch (error) {
    next(error);
  }
};

const getAssignmentById = async (req, res, next) => {
  try {
    const assignment = await assignmentService.getAssignmentById(req.params.id);
    return successResponse(res, assignment, "Lấy chi tiết phân công giảng dạy thành công");
  } catch (error) {
    next(error);
  }
};

const createAssignment = async (req, res, next) => {
  try {
    const assignment = await assignmentService.createAssignment(req.body);
    return successResponse(res, assignment, "Phân công giảng dạy thành công", 201);
  } catch (error) {
    next(error);
  }
};

const updateAssignment = async (req, res, next) => {
  try {
    const assignment = await assignmentService.updateAssignment(req.params.id, req.body);
    return successResponse(res, assignment, "Cập nhật phân công giảng dạy thành công");
  } catch (error) {
    next(error);
  }
};

const deleteAssignment = async (req, res, next) => {
  try {
    const result = await assignmentService.deleteAssignment(req.params.id);
    return successResponse(res, result, result.message);
  } catch (error) {
    next(error);
  }
};

const getTeachersList = async (req, res, next) => {
  try {
    const teachers = await assignmentService.getTeachersList(req.query.academicYear);
    return successResponse(res, teachers, "Lấy danh sách giáo viên thành công");
  } catch (error) {
    next(error);
  }
};

const checkConflict = async (req, res, next) => {
  try {
    const result = await assignmentService.checkConflicts(req.body);
    return successResponse(
      res,
      result,
      result.hasConflict ? "Phát hiện xung đột lịch giảng dạy" : "Lịch giảng dạy không bị trùng lặp"
    );
  } catch (error) {
    next(error);
  }
};

const getTeacherSchedule = async (req, res, next) => {
  try {
    let { teacherId } = req.params;
    const { academicYear, semester } = req.query;

    // Hỗ trợ trường hợp gọi bằng alias 'me', hoặc 'undefined', hoặc nếu user là giáo viên và không có teacherId
    if (!teacherId || teacherId === "me" || teacherId === "undefined" || teacherId === "null") {
      if (req.user?.role === "teacher" || req.user?.userId) {
        teacherId = req.user.userId;
      }
    }

    let schedule = await assignmentService.getTeacherSchedule(teacherId, academicYear, semester);

    // Fallback: Nếu không tìm thấy phân công theo teacherId và req.user có userCode
    if ((!schedule || schedule.length === 0) && req.user?.userCode) {
      const fallbackSchedule = await assignmentService.getTeacherSchedule(
        req.user.userCode,
        academicYear,
        semester
      );
      if (fallbackSchedule && fallbackSchedule.length > 0) {
        schedule = fallbackSchedule;
      }
    }

    return successResponse(res, schedule, "Lấy lịch giảng dạy của giáo viên thành công");
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAssignments,
  getAssignmentById,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  getTeachersList,
  checkConflict,
  getTeacherSchedule,
};
