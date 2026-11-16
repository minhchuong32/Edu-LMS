const express = require("express");
const {
  protect,
  canCreateAssignment,
  canModifyAssignment,
  canAccessTeachingAssignment,
  canViewAssignmentDetail,
} = require("../middlewares");
const assignmentController = require("../controllers/assignment.controller");

const router = express.Router();

// Tất cả các route quản lý bài tập đều yêu cầu người dùng đăng nhập (401 nếu thiếu token)
router.use(protect);

// 1. Lấy danh sách bài tập (hỗ trợ lọc theo teachingAssignment, status, search)
router.get(
  "/",
  canAccessTeachingAssignment,
  assignmentController.getAssignments
);

// 2. Lấy danh sách bài tập theo Lớp học và Môn học
router.get(
  "/by-class-subject",
  canAccessTeachingAssignment,
  assignmentController.getAssignmentsByClassAndSubject
);

router.get(
  "/class/:classId/subject/:subjectId",
  canAccessTeachingAssignment,
  assignmentController.getAssignmentsByClassAndSubject
);

// 3. Lấy danh sách bài tập theo mã TeachingAssignment trên URL
router.get(
  "/teaching-assignment/:teachingAssignmentId",
  (req, res, next) => {
    req.query.teachingAssignment = req.params.teachingAssignmentId;
    next();
  },
  canAccessTeachingAssignment,
  assignmentController.getAssignments
);

// 4. Lấy chi tiết một bài tập theo ID (Kiểm tra quyền theo TeachingAssignment)
router.get(
  "/:id",
  canViewAssignmentDetail,
  assignmentController.getAssignmentById
);

// 5. Tạo mới bài tập (Chỉ giáo viên được phân công trong TeachingAssignment hoặc Admin)
router.post(
  "/",
  canCreateAssignment,
  assignmentController.createAssignment
);

// 6. Cập nhật thông tin bài tập (Chỉ giáo viên được phân công hoặc Admin)
router.put(
  "/:id",
  canModifyAssignment,
  assignmentController.updateAssignment
);

router.patch(
  "/:id",
  canModifyAssignment,
  assignmentController.updateAssignment
);

// 7. Xóa bài tập (Chỉ giáo viên được phân công hoặc Admin)
router.delete(
  "/:id",
  canModifyAssignment,
  assignmentController.deleteAssignment
);

// 8. Mở / Khóa nhận bài tập (status: 'open' | 'locked')
router.patch(
  "/:id/status",
  canModifyAssignment,
  assignmentController.updateAssignmentStatus
);

router.put(
  "/:id/status",
  canModifyAssignment,
  assignmentController.updateAssignmentStatus
);

router.patch(
  "/:id/lock",
  canModifyAssignment,
  assignmentController.lockAssignment
);

router.post(
  "/:id/lock",
  canModifyAssignment,
  assignmentController.lockAssignment
);

router.patch(
  "/:id/open",
  canModifyAssignment,
  assignmentController.openAssignment
);

router.post(
  "/:id/open",
  canModifyAssignment,
  assignmentController.openAssignment
);

router.patch(
  "/:id/unlock",
  canModifyAssignment,
  assignmentController.openAssignment
);

router.post(
  "/:id/unlock",
  canModifyAssignment,
  assignmentController.openAssignment
);

module.exports = router;

