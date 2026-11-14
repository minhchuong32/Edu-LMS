const express = require("express");
const timetableController = require("../controllers/timetable.controller");
const { protect, authorize } = require("../middlewares");

const router = express.Router();

// Yêu cầu xác thực tài khoản cho toàn bộ API thời khóa biểu
router.use(protect);

// Xem thời khóa biểu cá nhân của tài khoản đăng nhập (Học sinh xem lớp mình, Giáo viên xem lịch dạy)
router.get("/my-schedule", timetableController.getMyTimetable);

// Kiểm tra xung đột thời khóa biểu trước khi lưu
router.post("/check-conflict", authorize("admin"), timetableController.checkConflict);

// Thiết lập thời khóa biểu hàng loạt cho một Lớp
router.post("/batch", authorize("admin"), timetableController.batchCreateOrUpdate);

// Xem thời khóa biểu theo Giáo viên (Giáo viên xem lịch của mình, Admin xem tất cả)
router.get("/teacher/:teacherId", timetableController.getTeacherTimetable);

// Xem thời khóa biểu theo Lớp (Học sinh xem lớp mình, Admin và Giáo viên xem tất cả các lớp)
router.get("/class/:classId", timetableController.getClassTimetable);

// CRUD Danh sách thời khóa biểu
router.get("/", timetableController.getTimetables);
router.get("/:id", timetableController.getTimetableById);
router.post("/", authorize("admin"), timetableController.createTimetable);
router.put("/:id", authorize("admin"), timetableController.updateTimetable);
router.delete("/:id", authorize("admin"), timetableController.deleteTimetable);

module.exports = router;
