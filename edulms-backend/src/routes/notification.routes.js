const express = require("express");
const { protect } = require("../middlewares");
const notificationController = require("../controllers/notification.controller");

const router = express.Router();

router.use(protect);

router.get("/", notificationController.getMyNotifications);
router.patch("/read-all", notificationController.markAllNotificationsAsRead);
router.put("/read-all", notificationController.markAllNotificationsAsRead);
router.patch("/:id/read", notificationController.markNotificationAsRead);
router.put("/:id/read", notificationController.markNotificationAsRead);

module.exports = router;

