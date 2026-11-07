const express = require("express");
const {
  protect,
  canCreateLesson,
  canModifyLesson,
  canStudentAccessClassLessons,
  canViewLessonDetail,
} = require("../middlewares");
const lessonContentController = require("../controllers/lessonContent.controller");

const router = express.Router();

// Tất cả các route quản lý bài giảng đều yêu cầu người dùng đăng nhập (401 nếu thiếu token)
router.use(protect);

// 1. Lấy danh sách nội dung bài giảng chung
router.get("/", lessonContentController.getLessonContents);

// 2. Lấy danh sách nội dung bài giảng theo Lớp và Môn học (Kiểm tra quyền lớp học của Học sinh)
router.get(
  "/by-class-subject",
  canStudentAccessClassLessons,
  lessonContentController.getLessonsByClassAndSubject
);
router.get(
  "/class/:classId/subject/:subjectId",
  canStudentAccessClassLessons,
  lessonContentController.getLessonsByClassAndSubject
);

// 3. Lấy chi tiết một nội dung bài giảng (Kiểm tra quyền bài giảng thuộc lớp của Học sinh)
router.get(
  "/:id",
  canViewLessonDetail,
  lessonContentController.getLessonContentById
);

// 4. Tạo mới bài giảng (Chỉ Admin hoặc Giáo viên phụ trách phân công đó)
router.post("/", canCreateLesson, lessonContentController.createLessonContent);

// 5. Cập nhật bài giảng (Chỉ Admin hoặc Giáo viên phụ trách phân công đó)
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

// 6. Xóa bài giảng (Chỉ Admin hoặc Giáo viên phụ trách phân công đó)
router.delete(
  "/:id",
  canModifyLesson,
  lessonContentController.deleteLessonContent
);

// 7. Quản lý từng tệp đính kèm riêng lẻ trong bài giảng
router.post(
  "/:id/files",
  canModifyLesson,
  lessonContentController.addLessonFile
);

router.put(
  "/:id/files/:fileId",
  canModifyLesson,
  lessonContentController.replaceLessonFile
);

router.delete(
  "/:id/files/:fileId",
  canModifyLesson,
  lessonContentController.deleteLessonFile
);

module.exports = router;
