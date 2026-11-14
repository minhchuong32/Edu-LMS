const express = require("express");
const { getHealth } = require("../controllers/health.controller");
const {
  importUsers,
  downloadTemplate,
} = require("../controllers/import.controller");
const authRoutes = require("./auth.routes");
const { protect, authorize } = require("../middlewares");
const upload = require("../config/upload");

const router = express.Router();

router.get("/health", getHealth);

// Xác thực & Kích hoạt tài khoản
router.use("/auth", authRoutes);

// Admin - Tải file Excel mẫu (.xlsx)
router.get(
  "/admin/import/template/:role",
  protect,
  authorize("admin"),
  downloadTemplate
);

// Admin - Import Excel hàng loạt
router.post(
  "/admin/import/:role",
  protect,
  authorize("admin"),
  upload.single("file"),
  importUsers
);

// Quản lý Khối, Lớp, Môn học & Phân công giảng dạy
const academicRoutes = require("./academic.routes");
router.use("/academic", academicRoutes);

// Quản lý Thời khóa biểu (Timetables)
const timetableRoutes = require("./timetable.routes");
router.use("/timetables", timetableRoutes);

// Quản lý Nội dung bài giảng (Lesson Contents)
const lessonContentRoutes = require("./lessonContent.routes");
router.use("/lessons", lessonContentRoutes);

// Quản lý Upload tài liệu & media lên Cloudinary
const uploadRoutes = require("./upload.routes");
router.use("/upload", uploadRoutes);

module.exports = router;
