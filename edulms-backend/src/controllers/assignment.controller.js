const assignmentService = require("../services/assignment.service");
const { successResponse, errorResponse } = require("../utils/apiResponse");

/**
 * Trích xuất ngữ cảnh xác thực & đối tượng đã kiểm tra từ middleware
 */
const getRequestContext = (req) => ({
  user: req.user,
  targetTeachingAssignment: req.targetTeachingAssignment,
  targetAssignmentDoc: req.targetAssignmentDoc,
  studentClass: req.studentClass,
});

/**
 * Xử lý lỗi từ tầng service trả về đúng định dạng API response
 */
const handleServiceError = (res, next, error) => {
  if (error && error.statusCode) {
    return errorResponse(res, error.message, error.statusCode);
  }
  return next(error);
};

/**
 * [POST] /api/v1/assignments
 * Tạo mới bài tập liên kết với TeachingAssignment
 */
const createAssignment = async (req, res, next) => {
  try {
    const savedAssignment = await assignmentService.createAssignment(
      req.body,
      getRequestContext(req)
    );
    return successResponse(
      res,
      savedAssignment,
      "Tạo bài tập thành công",
      201
    );
  } catch (error) {
    return handleServiceError(res, next, error);
  }
};

/**
 * [GET] /api/v1/assignments
 * Lấy danh sách bài tập theo bộ lọc và phân quyền TeachingAssignment
 */
const getAssignments = async (req, res, next) => {
  try {
    const assignments = await assignmentService.getAssignments(
      req.query,
      getRequestContext(req)
    );
    return successResponse(
      res,
      assignments,
      "Lấy danh sách bài tập thành công"
    );
  } catch (error) {
    return handleServiceError(res, next, error);
  }
};

/**
 * [GET] /api/v1/assignments/by-class-subject
 * [GET] /api/v1/assignments/class/:classId/subject/:subjectId
 * Lấy danh sách bài tập theo Lớp học và Môn học
 */
const getAssignmentsByClassAndSubject = async (req, res, next) => {
  try {
    const classId = req.params.classId || req.query.classId || req.query.class;
    const subjectId =
      req.params.subjectId || req.query.subjectId || req.query.subject;
    const { academicYear, semester, status } = req.query;

    const { assignments, isEmptyTeachingAssignment } =
      await assignmentService.getAssignmentsByClassAndSubject(
        { classId, subjectId, academicYear, semester, status },
        getRequestContext(req)
      );

    return successResponse(
      res,
      assignments,
      isEmptyTeachingAssignment
        ? "Chưa có bài tập cho lớp và môn học này"
        : "Lấy danh sách bài tập theo lớp và môn học thành công"
    );
  } catch (error) {
    return handleServiceError(res, next, error);
  }
};

/**
 * [GET] /api/v1/assignments/:id
 * Lấy chi tiết một bài tập theo ID
 */
const getAssignmentById = async (req, res, next) => {
  try {
    const assignmentDoc = await assignmentService.getAssignmentById(
      req.params.id,
      getRequestContext(req)
    );
    return successResponse(
      res,
      assignmentDoc,
      "Lấy chi tiết bài tập thành công"
    );
  } catch (error) {
    return handleServiceError(res, next, error);
  }
};

/**
 * [PUT/PATCH] /api/v1/assignments/:id
 * Cập nhật thông tin bài tập
 */
const updateAssignment = async (req, res, next) => {
  try {
    const updatedAssignment = await assignmentService.updateAssignment(
      req.params.id,
      req.body,
      getRequestContext(req)
    );
    return successResponse(
      res,
      updatedAssignment,
      "Cập nhật bài tập thành công"
    );
  } catch (error) {
    return handleServiceError(res, next, error);
  }
};

/**
 * [DELETE] /api/v1/assignments/:id
 * Xóa mềm bài tập và dọn dẹp tệp đính kèm trên Cloudinary
 */
const deleteAssignment = async (req, res, next) => {
  try {
    await assignmentService.deleteAssignment(
      req.params.id,
      getRequestContext(req)
    );
    return successResponse(res, null, "Xóa bài tập thành công");
  } catch (error) {
    return handleServiceError(res, next, error);
  }
};

/**
 * [PATCH/PUT] /api/v1/assignments/:id/status
 * API mở/khóa nhận bài (status: 'open' | 'locked' hoặc tự động đảo trạng thái)
 */
const updateAssignmentStatus = async (req, res, next) => {
  try {
    const { assignment, message } =
      await assignmentService.updateAssignmentStatus(
        req.params.id,
        req.body?.status,
        getRequestContext(req)
      );
    return successResponse(res, assignment, message);
  } catch (error) {
    return handleServiceError(res, next, error);
  }
};

/**
 * [PATCH/POST] /api/v1/assignments/:id/lock
 * Khóa nhận bài tập (status = 'locked')
 */
const lockAssignment = async (req, res, next) => {
  req.body = { ...req.body, status: "locked" };
  return updateAssignmentStatus(req, res, next);
};

/**
 * [PATCH/POST] /api/v1/assignments/:id/open (hoặc /unlock)
 * Mở nhận bài tập (status = 'open')
 */
const openAssignment = async (req, res, next) => {
  req.body = { ...req.body, status: "open" };
  return updateAssignmentStatus(req, res, next);
};

module.exports = {
  createAssignment,
  getAssignments,
  getAssignmentsByClassAndSubject,
  getAssignmentById,
  updateAssignment,
  deleteAssignment,
  updateAssignmentStatus,
  toggleAssignmentStatus: updateAssignmentStatus,
  lockAssignment,
  openAssignment,
  unlockAssignment: openAssignment,
};
