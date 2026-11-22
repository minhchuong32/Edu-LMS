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

/**
 * Controller Học sinh nộp bài kiểm tra & Hệ thống tự động chấm điểm
 */
const submitExam = async (req, res, next) => {
  try {
    const result = await examService.submitExam(req.params.id, req.body, {
      user: req.user,
      preloadedExam: req.exam,
    });
    return successResponse(
      res,
      result,
      "Nộp bài kiểm tra và chấm điểm thành công!",
      201
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Controller Xem chi tiết kết quả bài làm của học sinh (kèm đáp án đúng sau khi nộp)
 */
const getExamAttempt = async (req, res, next) => {
  try {
    const result = await examService.getExamAttempt(req.params.id, req.query, {
      user: req.user,
      preloadedExam: req.exam,
    });
    return successResponse(
      res,
      result,
      "Lấy kết quả bài làm thành công"
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Controller Lấy danh sách kết quả bài làm của cả lớp dành cho Giáo viên / Admin
 */
const getExamAttempts = async (req, res, next) => {
  try {
    const result = await examService.getExamAttempts(req.params.id, req.query, {
      user: req.user,
      preloadedExam: req.exam,
    });
    return successResponse(
      res,
      result,
      "Lấy danh sách bài nộp của học sinh thành công"
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Lấy server time để client đồng bộ đồng hồ đếm ngược (tránh gian lận chỉnh giờ máy)
 */
const getServerTime = (_req, res) => {
  const serverTime = Date.now();
  return successResponse(
    res,
    { serverTime, iso: new Date(serverTime).toISOString() },
    "Lấy server time thành công"
  );
};

module.exports = {
  getServerTime,
  submitExam,
  getExamAttempt,
  getExamAttempts,
  createManualExam,
  previewRandomQuestions,
  createRandomExam,
  getExams,
  getExamById,
  updateExam,
  publishExam,
  deleteExam,
};
