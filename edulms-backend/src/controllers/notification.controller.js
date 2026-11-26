const notificationService = require("../services/notification.service");
const { successResponse, errorResponse } = require("../utils/apiResponse");

const handleServiceError = (res, next, error) => {
  if (error && error.statusCode) {
    return errorResponse(res, error.message, error.statusCode);
  }
  return next(error);
};

/**
 * [POST] /api/v1/notifications
 * Tạo thông báo mới cho người dùng (chỉ cho phép Teacher hoặc Admin tạo)
 */
const createNotification = async (req, res, next) => {
  try {
    const created = await notificationService.createNotification(req.body, {
      user: req.user,
    });
    return successResponse(
      res,
      created,
      "Tạo thông báo thành công",
      201
    );
  } catch (error) {
    return handleServiceError(res, next, error);
  }
};

/**
 * [GET] /api/v1/notifications
 * Lấy danh sách thông báo của người dùng đang đăng nhập
 */
const getMyNotifications = async (req, res, next) => {
  try {
    const userId = req.user?.userId || req.user?._id || req.user?.id;
    const data = await notificationService.getMyNotifications(userId, req.query);
    return successResponse(
      res,
      data,
      "Lấy danh sách thông báo thành công"
    );
  } catch (error) {
    return handleServiceError(res, next, error);
  }
};

/**
 * [PATCH/PUT] /api/v1/notifications/:id/read
 * Đánh dấu 1 thông báo đã đọc
 */
const markNotificationAsRead = async (req, res, next) => {
  try {
    const userId = req.user?.userId || req.user?._id || req.user?.id;
    const updated = await notificationService.markNotificationAsRead(
      req.params.id,
      userId
    );
    return successResponse(
      res,
      updated,
      "Đã đánh dấu đọc thông báo"
    );
  } catch (error) {
    return handleServiceError(res, next, error);
  }
};

/**
 * [PATCH/PUT] /api/v1/notifications/read-all
 * Đánh dấu tất cả thông báo đã đọc
 */
const markAllNotificationsAsRead = async (req, res, next) => {
  try {
    const userId = req.user?.userId || req.user?._id || req.user?.id;
    await notificationService.markAllNotificationsAsRead(userId, {
      ...req.query,
      ...req.body,
    });
    return successResponse(
      res,
      null,
      "Đã đánh dấu đọc tất cả thông báo"
    );
  } catch (error) {
    return handleServiceError(res, next, error);
  }
};

module.exports = {
  createNotification,
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};
