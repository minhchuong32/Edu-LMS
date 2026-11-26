const express = require("express");
const { protect, authorize } = require("../middlewares");
const {
  enforceParentReadOnly,
  verifyParentChildAccess,
} = require("../middlewares/parentPermission.middleware");
const parentController = require("../controllers/parent.controller");

const router = express.Router();

// Tất cả route đều yêu cầu xác thực JWT
router.use(protect);

// Middleware giới hạn quyền ghi đối với tài khoản Phụ huynh (chặn mọi POST, PUT, PATCH, DELETE từ role = 'parent')
router.use(enforceParentReadOnly);

// 1. Lấy danh sách học sinh được liên kết với tài khoản Phụ huynh (dựa trên childrenRefs)
router.get(
  "/children",
  authorize("parent"),
  verifyParentChildAccess,
  parentController.getLinkedChildren
);

// 2. Lấy tổng hợp điểm số và điểm danh của từng học sinh được liên kết
router.get(
  "/children/:studentId",
  authorize("parent"),
  verifyParentChildAccess,
  parentController.getLinkedChildAcademicAndAttendance
);

router.get(
  "/children/:studentId/grades",
  authorize("parent"),
  verifyParentChildAccess,
  parentController.getLinkedChildAcademicAndAttendance
);

router.get(
  "/children/:studentId/attendance",
  authorize("parent"),
  verifyParentChildAccess,
  parentController.getLinkedChildAcademicAndAttendance
);

// 3. Lấy danh sách thông báo từ nhà trường và giáo viên của từng học sinh được liên kết
router.get(
  "/children/:studentId/notifications",
  authorize("parent"),
  verifyParentChildAccess,
  parentController.getLinkedChildNotifications
);

module.exports = router;

