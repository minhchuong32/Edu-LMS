const express = require("express");
const {
  protect,
  canAccessQuestionBank,
  canCreateQuestion,
  canModifyQuestion,
} = require("../middlewares");
const questionController = require("../controllers/question.controller");

const router = express.Router();

// Tất cả các route Ngân hàng câu hỏi yêu cầu xác thực người dùng
router.use(protect);

// Kiểm tra quyền: Chỉ giáo viên ('teacher') và admin ('admin') mới được truy cập
router.use(canAccessQuestionBank);

// Các route tiện ích: Lấy danh sách chương và Thống kê câu hỏi theo môn học
router.get("/chapters", questionController.getChapters);
router.get("/summary", questionController.getSummary);
router.get("/subject/:subjectId/chapters", questionController.getChapters);
router.get("/subject/:subjectId/summary", questionController.getSummary);

// 1. Lấy danh sách câu hỏi (hỗ trợ lọc theo subject, chapter, difficulty, search, phân trang)
router.get("/", questionController.getQuestions);

// 2. Lấy chi tiết một câu hỏi theo ID
router.get("/:id", questionController.getQuestionById);

// 3. Tạo mới câu hỏi (Chỉ giáo viên được phân công giảng dạy môn học đó hoặc Admin)
router.post("/", canCreateQuestion, questionController.createQuestion);

// 4. Cập nhật thông tin câu hỏi (Chỉ người tạo, giáo viên phụ trách môn hoặc Admin)
router.put("/:id", canModifyQuestion, questionController.updateQuestion);
router.patch("/:id", canModifyQuestion, questionController.updateQuestion);

// 5. Xóa câu hỏi (soft delete)
router.delete("/:id", canModifyQuestion, questionController.deleteQuestion);

module.exports = router;
