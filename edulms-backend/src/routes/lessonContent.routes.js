const express = require("express");
const { protect, canCreateLesson, canModifyLesson } = require("../middlewares");
const lessonContentController = require("../controllers/lessonContent.controller");

const router = express.Router();

// Tất cả các route quản lý bài giảng đều yêu cầu người dùng đăng nhập
router.use(protect);

// 1. Lấy danh sách nội dung bài giảng (Tất cả vai trò)
router.get("/", lessonContentController.getLessonContents);

// 2. Lấy chi tiết một nội dung bài giảng (Tất cả vai trò)
router.get("/:id", lessonContentController.getLessonContentById);

// 3. Tạo mới bài giảng (Chỉ Admin hoặc Giáo viên phụ trách phân công đó)
router.post("/", canCreateLesson, lessonContentController.createLessonContent);

// 4. Cập nhật bài giảng (Chỉ Admin hoặc Giáo viên phụ trách phân công đó)
router.put(
  "/:id",
  canModifyLesson,
  lessonContentController.updateLessonContent
);

router.patch(
  "/:id",
  canModifyLesson,
  lessonContentController.updateLessonContent
);

// 5. Xóa bài giảng (Chỉ Admin hoặc Giáo viên phụ trách phân công đó)
router.delete(
  "/:id",
  canModifyLesson,
  lessonContentController.deleteLessonContent
);

module.exports = router;
