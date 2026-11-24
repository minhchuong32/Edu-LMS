const express = require("express");
const {
  protect,
  authorize,
  canManageGradeRecord,
  canModifyGradeRecord,
  canViewGradeRecords,
} = require("../middlewares");
const gradebookController = require("../controllers/gradebook.controller");

const router = express.Router();

// Yêu cầu đăng nhập cho tất cả các API sổ điểm
router.use(protect);

// 1. Xem và cập nhật cấu hình hệ số điểm (weightConfig)
router.get("/weights", gradebookController.getGradeWeightConfig);
router.put(
  "/weights",
  authorize("admin", "teacher"),
  gradebookController.updateGradeWeightConfig
);
router.patch(
  "/weights",
  authorize("admin", "teacher"),
  gradebookController.updateGradeWeightConfig
);

// 2. Truy vấn danh sách điểm và điểm trung bình theo bộ lọc (student, teachingAssignment, classId, subjectId, semester, gradeType)
router.get("/", canViewGradeRecords, gradebookController.getGradeRecords);

// 3. Các route tiện ích truy vấn điểm theo học sinh / phân công / lớp - môn
router.get(
  "/student/:studentId",
  canViewGradeRecords,
  gradebookController.getGradeRecords
);

router.get(
  "/teaching-assignment/:teachingAssignmentId",
  canViewGradeRecords,
  gradebookController.getGradeRecords
);

router.get(
  "/class/:classId/subject/:subjectId",
  canViewGradeRecords,
  gradebookController.getGradeRecords
);

// 4. Nhập mới bản ghi điểm (Chỉ Giáo viên phụ trách TeachingAssignment hoặc Admin)
router.post("/", canManageGradeRecord, gradebookController.createGradeRecord);

// 5. Cập nhật bản ghi điểm theo ID (Chỉ Giáo viên phụ trách TeachingAssignment hoặc Admin)
router.put("/:id", canModifyGradeRecord, gradebookController.updateGradeRecord);
router.patch(
  "/:id",
  canModifyGradeRecord,
  gradebookController.updateGradeRecord
);

// 6. Xóa mềm bản ghi điểm theo ID (Chỉ Giáo viên phụ trách TeachingAssignment hoặc Admin)
router.delete(
  "/:id",
  canModifyGradeRecord,
  gradebookController.deleteGradeRecord
);

module.exports = router;

