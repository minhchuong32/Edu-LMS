const express = require("express");
const {
  protect,
  canSubmitAssignment,
  canViewSubmissionsByAssignment,
  canGradeSubmission,
  canViewSubmissionDetail,
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

// 4. Lấy chi tiết một bài nộp theo ID (Học sinh chỉ xem được bài nộp của mình)
router.get(
  "/:id",
  canViewSubmissionDetail,
  submissionController.getSubmissionById
);

// 5. Học sinh nộp bài tập (Body: { assignment, fileUrl, attachments, note })
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

// 6. Giáo viên chấm điểm và gửi nhận xét chung (score + feedback)
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

router.post(
  "/:id/grade",
  canGradeSubmission,
  submissionController.gradeSubmission
);

// 7. API chuyên biệt cập nhật điểm số (score)
router.patch(
  "/:id/score",
  canGradeSubmission,
  submissionController.updateSubmissionScore
);

router.put(
  "/:id/score",
  canGradeSubmission,
  submissionController.updateSubmissionScore
);

// 8. API chuyên biệt cập nhật nhận xét của giáo viên (feedback)
router.patch(
  "/:id/feedback",
  canGradeSubmission,
  submissionController.updateSubmissionFeedback
);

router.put(
  "/:id/feedback",
  canGradeSubmission,
  submissionController.updateSubmissionFeedback
);

module.exports = router;
