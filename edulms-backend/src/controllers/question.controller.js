const questionService = require("../services/question.service");
const { successResponse } = require("../utils/apiResponse");

/**
 * Controller Tạo mới câu hỏi vào Ngân hàng câu hỏi
 */
const createQuestion = async (req, res, next) => {
  try {
    const question = await questionService.createQuestion(req.body, {
      user: req.user,
      targetSubject: req.targetSubject,
    });
    return successResponse(res, question, "Tạo câu hỏi thành công", 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Controller Lấy danh sách câu hỏi theo bộ lọc (môn học, chương, độ khó, từ khóa)
 */
const getQuestions = async (req, res, next) => {
  try {
    const result = await questionService.getQuestions(req.query, req.user);
    return successResponse(res, result, "Lấy danh sách câu hỏi thành công");
  } catch (error) {
    next(error);
  }
};

/**
 * Controller Lấy chi tiết một câu hỏi theo ID
 */
const getQuestionById = async (req, res, next) => {
  try {
    const question = await questionService.getQuestionById(req.params.id);
    return successResponse(res, question, "Lấy chi tiết câu hỏi thành công");
  } catch (error) {
    next(error);
  }
};

/**
 * Controller Cập nhật thông tin câu hỏi
 */
const updateQuestion = async (req, res, next) => {
  try {
    const updated = await questionService.updateQuestion(
      req.params.id,
      req.body,
      {
        user: req.user,
        preloadedQuestion: req.question,
      }
    );
    return successResponse(res, updated, "Cập nhật câu hỏi thành công");
  } catch (error) {
    next(error);
  }
};

/**
 * Controller Xóa câu hỏi (soft delete)
 */
const deleteQuestion = async (req, res, next) => {
  try {
    const result = await questionService.deleteQuestion(req.params.id, {
      user: req.user,
      preloadedQuestion: req.question,
    });
    return successResponse(res, result, result.message);
  } catch (error) {
    next(error);
  }
};

/**
 * Controller Lấy danh sách các chương của môn học
 */
const getChapters = async (req, res, next) => {
  try {
    const subjectId = req.query.subject || req.params.subjectId;
    const chapters = await questionService.getChaptersBySubject(subjectId);
    return successResponse(res, chapters, "Lấy danh sách chương thành công");
  } catch (error) {
    next(error);
  }
};

/**
 * Controller Thống kê câu hỏi theo độ khó/chương
 */
const getSummary = async (req, res, next) => {
  try {
    const subjectId = req.query.subject || req.params.subjectId;
    const summary = await questionService.getQuestionSummary(subjectId);
    return successResponse(res, summary, "Lấy thống kê câu hỏi thành công");
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createQuestion,
  getQuestions,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
  getChapters,
  getSummary,
};
