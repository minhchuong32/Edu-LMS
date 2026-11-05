const express = require("express");
const { protect, authorize } = require("../middlewares");
const lessonContentController = require("../controllers/lessonContent.controller");

const router = express.Router();

// Tất cả các route quản lý bài giảng đều yêu cầu người dùng đăng nhập
router.use(protect);

// 1. Lấy danh sách nội dung bài giảng
router.get("/", lessonContentController.getLessonContents);

// 2. Lấy chi tiết một nội dung bài giảng
router.get("/:id", lessonContentController.getLessonContentById);

// 3. Tạo mới bài giảng (Chỉ Admin và Giáo viên)
router.post(
  "/",
  authorize("admin", "teacher"),
  lessonContentController.createLessonContent
);

// 4. Cập nhật bài giảng (Hỗ trợ cả PUT và PATCH)
router.put(
  "/:id",
  authorize("admin", "teacher"),
  lessonContentController.updateLessonContent
);

router.patch(
  "/:id",
  authorize("admin", "teacher"),
  lessonContentController.updateLessonContent
);

// 5. Xóa bài giảng (Chỉ Admin và Giáo viên)
router.delete(
  "/:id",
  authorize("admin", "teacher"),
  lessonContentController.deleteLessonContent
);

module.exports = router;

