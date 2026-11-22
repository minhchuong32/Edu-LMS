const examService = require("../services/exam.service");
const { successResponse } = require("../utils/apiResponse");

/**
 * Controller Tạo đề kiểm tra thủ công (chọn câu hỏi từ ngân hàng)
 */
const createManualExam = async (req, res, next) => {
  try {
    const exam = await examService.createManualExam(req.body, {
      user: req.user,
      targetTeachingAssignment: req.targetTeachingAssignment,
    });
    return successResponse(res, exam, "Tạo đề kiểm tra thành công", 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Controller Xem trước (preview) danh sách câu hỏi ngẫu nhiên theo tiêu chí
 */
const previewRandomQuestions = async (req, res, next) => {
  try {
    const result = await examService.previewRandomQuestions(req.body, {
      user: req.user,
      targetTeachingAssignment: req.targetTeachingAssignment,
    });
    return successResponse(
      res,
      result,
      "Tạo danh sách câu hỏi ngẫu nhiên thành công"
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Controller Tạo đề kiểm tra ngẫu nhiên theo tiêu chí (số lượng, chương, độ khó)
 */
const createRandomExam = async (req, res, next) => {
  try {
    const exam = await examService.createRandomExam(req.body, {
      user: req.user,
      targetTeachingAssignment: req.targetTeachingAssignment,
    });
    return successResponse(
      res,
      exam,
      "Tạo đề kiểm tra ngẫu nhiên thành công",
      201
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Controller Lấy danh sách đề kiểm tra
 */
const getExams = async (req, res, next) => {
  try {
    const result = await examService.getExams(req.query, req.user);
    return successResponse(res, result, "Lấy danh sách đề kiểm tra thành công");
  } catch (error) {
    next(error);
  }
};

/**
 * Controller Lấy chi tiết đề kiểm tra
 */
const getExamById = async (req, res, next) => {
  try {
    const exam = await examService.getExamById(req.params.id, req.user);
    return successResponse(res, exam, "Lấy chi tiết đề kiểm tra thành công");
  } catch (error) {
    next(error);
  }
};

/**
 * Controller Cập nhật thông tin đề kiểm tra (cho phép chỉnh sửa câu hỏi trước khi publish)
 */
const updateExam = async (req, res, next) => {
  try {
    const updated = await examService.updateExam(req.params.id, req.body, {
      user: req.user,
      preloadedExam: req.exam,
    });
    return successResponse(res, updated, "Cập nhật đề kiểm tra thành công");
  } catch (error) {
    next(error);
  }
};

/**
 * Controller Phát hành đề kiểm tra cho học sinh trong lớp (Publish)
 */
const publishExam = async (req, res, next) => {
  try {
    const published = await examService.publishExam(req.params.id, {
      user: req.user,
      preloadedExam: req.exam,
    });
    return successResponse(
      res,
      published,
      "Phát hành đề kiểm tra thành công"
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Controller Xóa đề kiểm tra (soft delete)
 */
const deleteExam = async (req, res, next) => {
  try {
    const result = await examService.deleteExam(req.params.id, {
      user: req.user,
      preloadedExam: req.exam,
    });
    return successResponse(res, result, result.message);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createManualExam,
  previewRandomQuestions,
  createRandomExam,
  getExams,
  getExamById,
  updateExam,
  publishExam,
  deleteExam,
};
