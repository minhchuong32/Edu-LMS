const express = require("express");
const {
  protect,
  canCreateExam,
  canModifyExam,
  canViewExamDetail,
} = require("../middlewares");
const examController = require("../controllers/exam.controller");

const router = express.Router();

// Tất cả các route quản lý và xem đề kiểm tra đều yêu cầu đăng nhập
router.use(protect);

// 1. Tạo danh sách câu hỏi ngẫu nhiên xem trước (preview)
router.post(
  "/preview-random",
  canCreateExam,
  examController.previewRandomQuestions
);
router.post(
  "/random-preview",
  canCreateExam,
  examController.previewRandomQuestions
);

// 2. Tạo đề kiểm tra ngẫu nhiên theo tiêu chí (số lượng, chương, độ khó)
router.post("/random", canCreateExam, examController.createRandomExam);

// 3. Tạo đề kiểm tra thủ công (chọn câu hỏi từ ngân hàng)
router.post("/manual", canCreateExam, examController.createManualExam);

// Tuyến đường POST mặc định: nếu có questionIds thì tạo thủ công, nếu có criteria/totalQuestions thì tạo random
router.post("/", canCreateExam, (req, res, next) => {
  if (
    (!req.body.questionIds || req.body.questionIds.length === 0) &&
    (req.body.criteria || req.body.totalQuestions)
  ) {
    return examController.createRandomExam(req, res, next);
  }
  return examController.createManualExam(req, res, next);
});

// 4. Lấy danh sách đề kiểm tra (giáo viên xem đề của mình/phân công; học sinh chỉ xem đề đã phát hành của lớp)
router.get("/", examController.getExams);

// 5. Lấy chi tiết đề kiểm tra (học sinh không nhận correctIndex và explanation)
router.get("/:id", canViewExamDetail, examController.getExamById);

// 5.1. Học sinh nộp bài kiểm tra & Hệ thống tự động chấm điểm
router.post("/:id/submit", canViewExamDetail, examController.submitExam);

// 5.2. Lấy kết quả bài làm chi tiết (học sinh xem lại bài đã nộp kèm đáp án đúng)
router.get("/:id/result", canViewExamDetail, examController.getExamAttempt);
router.get("/:id/attempt", canViewExamDetail, examController.getExamAttempt);

// 5.3. Giáo viên / Quản trị viên xem toàn bộ danh sách kết quả nộp bài của học sinh
router.get("/:id/attempts", canModifyExam, examController.getExamAttempts);

// 6. Chỉnh sửa đề kiểm tra (chỉ được sửa danh sách câu hỏi khi đề chưa phát hành)
router.put("/:id", canModifyExam, examController.updateExam);
router.patch("/:id", canModifyExam, examController.updateExam);

// 7. Phát hành đề kiểm tra cho học sinh trong lớp (Publish)
router.patch("/:id/publish", canModifyExam, examController.publishExam);
router.post("/:id/publish", canModifyExam, examController.publishExam);

// 8. Xóa đề kiểm tra (soft delete)
router.delete("/:id", canModifyExam, examController.deleteExam);

module.exports = router;
