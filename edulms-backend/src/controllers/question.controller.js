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

/**
 * Controller Tải file Excel mẫu câu hỏi trắc nghiệm (có cấu hình Dropdown Data Validation)
 */
const downloadTemplate = async (req, res, next) => {
  try {
    const buffer = await questionService.generateQuestionTemplate(req.user);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=mau_ngan_hang_cau_hoi.xlsx"
    );
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
};

/**
 * Controller Phân tích và xem trước (Preview) file Excel nhập câu hỏi
 */
const previewImport = async (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn tập tin Excel để tải lên!",
      });
    }

    const result = await questionService.previewQuestionsFromExcel(
      req.file.buffer,
      req.user
    );
    return successResponse(res, result, "Phân tích file Excel thành công");
  } catch (error) {
    next(error);
  }
};

/**
 * Controller Xác nhận lưu hàng loạt câu hỏi từ kết quả Preview
 */
const confirmImport = async (req, res, next) => {
  try {
    const { items } = req.body;
    const result = await questionService.confirmImportQuestions(items, req.user);
    return successResponse(
      res,
      result,
      `Nhập thành công ${result.successCount} câu hỏi vào ngân hàng`,
      201
    );
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
  downloadTemplate,
  previewImport,
  confirmImport,
};
