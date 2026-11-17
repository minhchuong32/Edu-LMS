const express = require("express");
const {
  protect,
  canSubmitAssignment,
  canViewSubmissionsByAssignment,
  canGradeSubmission,
} = require("../middlewares");
const submissionController = require("../controllers/submission.controller");

const router = express.Router();

// Yêu cầu đăng nhập cho tất cả các route bài nộp
router.use(protect);

// 1. Lấy danh sách bài nộp theo bài tập (?assignment=:assignmentId)
router.get(
  "/",
  canViewSubmissionsByAssignment,
  submissionController.getSubmissionsByAssignment
);

// 2. Lấy danh sách bài nộp theo assignmentId trên URL
router.get(
  "/assignment/:assignmentId",
  canViewSubmissionsByAssignment,
  submissionController.getSubmissionsByAssignment
);

// 3. Lấy bài nộp của học sinh hiện tại cho một bài tập
router.get("/my/:assignmentId", submissionController.getMySubmission);

// 4. Học sinh nộp bài tập (Body: { assignment, fileUrl, attachments, note })
router.post(
  "/",
  canSubmitAssignment,
  submissionController.submitAssignment
);

router.post(
  "/assignment/:assignmentId",
  canSubmitAssignment,
  submissionController.submitAssignment
);

// 5. Giáo viên chấm điểm và nhận xét bài nộp
router.patch(
  "/:id/grade",
  canGradeSubmission,
  submissionController.gradeSubmission
);

router.put(
  "/:id/grade",
  canGradeSubmission,
  submissionController.gradeSubmission
);

module.exports = router;

