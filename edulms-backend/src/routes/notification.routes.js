const express = require("express");
const { protect, authorize } = require("../middlewares");
const notificationController = require("../controllers/notification.controller");

const router = express.Router();

// Yêu cầu đăng nhập cho toàn bộ các API thông báo
router.use(protect);

// 1. Tạo thông báo mới cho người dùng (Giáo viên / Quản trị viên)
router.post(
  "/",
  authorize("teacher", "admin"),
  notificationController.createNotification
);

// 2. Lấy danh sách thông báo của người dùng hiện tại
router.get("/", notificationController.getMyNotifications);

// 3. Đánh dấu tất cả thông báo của người dùng hiện tại là đã đọc
router.patch("/read-all", notificationController.markAllNotificationsAsRead);
router.put("/read-all", notificationController.markAllNotificationsAsRead);

// 4. Đánh dấu một thông báo cụ thể của người dùng hiện tại là đã đọc
router.patch("/:id/read", notificationController.markNotificationAsRead);
router.put("/:id/read", notificationController.markNotificationAsRead);

module.exports = router;
