const gradebookService = require("../services/gradebook.service");
const { successResponse, errorResponse } = require("../utils/apiResponse");

/**
 * Trích xuất ngữ cảnh xác thực từ request
 */
const getRequestContext = (req) => ({
  user: req.user,
  targetTeachingAssignment: req.targetTeachingAssignment,
  targetGradeRecord: req.targetGradeRecord,
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
 * [POST] /api/v1/gradebook (hoặc /api/v1/grade-records)
 * Nhập điểm mới cho học sinh
 */
const createGradeRecord = async (req, res, next) => {
  try {
    const savedRecord = await gradebookService.createGradeRecord(
      req.body,
      getRequestContext(req)
    );
    return successResponse(
      res,
      savedRecord,
      "Nhập điểm cho học sinh thành công",
      201
    );
  } catch (error) {
    return handleServiceError(res, next, error);
  }
};

/**
 * [PUT/PATCH] /api/v1/gradebook/:id
 * Cập nhật điểm hoặc thông tin bản ghi điểm
 */
const updateGradeRecord = async (req, res, next) => {
  try {
    const updatedRecord = await gradebookService.updateGradeRecord(
      req.params.id,
      req.body,
      getRequestContext(req)
    );
    return successResponse(
      res,
      updatedRecord,
      "Cập nhật điểm cho học sinh thành công"
    );
  } catch (error) {
    return handleServiceError(res, next, error);
  }
};

/**
 * [DELETE] /api/v1/gradebook/:id
 * Xóa mềm một bản ghi điểm
 */
const deleteGradeRecord = async (req, res, next) => {
  try {
    await gradebookService.deleteGradeRecord(
      req.params.id,
      getRequestContext(req)
    );
    return successResponse(res, null, "Xóa bản ghi điểm thành công");
  } catch (error) {
    return handleServiceError(res, next, error);
  }
};

/**
 * [GET] /api/v1/gradebook
 * Truy vấn danh sách điểm và điểm trung bình theo học sinh / lớp / môn / học kỳ
 */
const getGradeRecords = async (req, res, next) => {
  try {
    const query = {
      ...req.query,
      ...(req.params.studentId ? { student: req.params.studentId } : {}),
      ...(req.params.teachingAssignmentId
        ? { teachingAssignment: req.params.teachingAssignmentId }
        : {}),
      ...(req.params.classId ? { classId: req.params.classId } : {}),
      ...(req.params.subjectId ? { subjectId: req.params.subjectId } : {}),
    };

    const result = await gradebookService.getGradeRecords(
      query,
      getRequestContext(req)
    );
    return successResponse(res, result, "Lấy dữ liệu sổ điểm thành công");
  } catch (error) {
    return handleServiceError(res, next, error);
  }
};

/**
 * [GET] /api/v1/gradebook/weights
 * Lấy cấu hình hệ số điểm hiện tại
 */
const getGradeWeightConfig = (req, res) => {
  const weights = gradebookService.getGradeWeightConfig();
  return successResponse(
    res,
    weights,
    "Lấy cấu hình hệ số điểm thành công"
  );
};

/**
 * [PUT/PATCH] /api/v1/gradebook/weights
 * Cập nhật cấu hình hệ số điểm (Chỉ Admin hoặc Teacher)
 */
const updateGradeWeightConfig = (req, res, next) => {
  try {
    const updatedWeights = gradebookService.setGradeWeightConfig(req.body);
    return successResponse(
      res,
      updatedWeights,
      "Cập nhật cấu hình hệ số điểm thành công"
    );
  } catch (error) {
    return handleServiceError(res, next, error);
  }
};

/**
 * [POST/PUT] /api/v1/gradebook/bulk
 * Lưu hàng loạt nhiều đầu điểm của học sinh trong một lần thao tác
 */
const bulkUpsertGradeRecords = async (req, res, next) => {
  try {
    const result = await gradebookService.bulkUpsertGradeRecords(
      req.body,
      getRequestContext(req)
    );
    return successResponse(
      res,
      result,
      `Đã lưu thành công ${result.count} đầu điểm`
    );
  } catch (error) {
    return handleServiceError(res, next, error);
  }
};

module.exports = {
  createGradeRecord,
  updateGradeRecord,
  deleteGradeRecord,
  bulkUpsertGradeRecords,
  getGradeRecords,
  getGradeWeightConfig,
  updateGradeWeightConfig,
};

