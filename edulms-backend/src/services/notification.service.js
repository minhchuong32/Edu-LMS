const mongoose = require("mongoose");
const Notification = require("../models/Notification");

/**
 * Tạo lỗi nghiệp vụ có gắn statusCode
 */
const createAppError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

/**
 * Trigger tạo thông báo cho học sinh sau khi giáo viên chấm điểm hoặc gửi nhận xét bài nộp
 * @param {object} params
 * @param {string|object} params.recipient - ID của học sinh nhận thông báo
 * @param {string|object} [params.sender] - ID của giáo viên chấm bài
 * @param {object} [params.submission] - Document Submission đã chấm
 * @param {object} [params.assignment] - Document Assignment tương ứng
 * @param {number|null} [params.score] - Điểm số được cập nhật
 * @param {string} [params.feedback] - Nhận xét của giáo viên
 */
const createGradingNotification = async ({
  recipient,
  sender = null,
  submission = null,
  assignment = null,
  score = null,
  feedback = "",
}) => {
  const recipientId = recipient?._id || recipient;
  if (!recipientId) return null;

  const assignmentTitle = assignment?.title || "Bài tập";
  const hasScore = score !== undefined && score !== null && score !== "";
  const trimmedFeedback = feedback ? String(feedback).trim() : "";

  const title = hasScore
    ? `Đã có điểm chấm bài: ${assignmentTitle}`
    : `Giáo viên đã nhận xét bài nộp: ${assignmentTitle}`;

  let message = `Bài nộp của bạn cho "${assignmentTitle}" đã được giáo viên cập nhật kết quả.`;
  if (hasScore && trimmedFeedback) {
    message = `Bài nộp của bạn cho "${assignmentTitle}" đã được chấm ${score}/10 điểm. Nhận xét: "${trimmedFeedback}"`;
  } else if (hasScore) {
    message = `Bài nộp của bạn cho "${assignmentTitle}" đã được chấm ${score}/10 điểm.`;
  } else if (trimmedFeedback) {
    message = `Giáo viên đã gửi nhận xét cho bài nộp "${assignmentTitle}": "${trimmedFeedback}"`;
  }

  const notification = new Notification({
    recipient: recipientId,
    sender: sender?._id || sender || null,
    type: "assignment_graded",
    title,
    message,
    submission: submission?._id || submission || null,
    assignment: assignment?._id || assignment || submission?.assignment || null,
    metadata: {
      score: hasScore ? Number(score) : null,
      feedback: trimmedFeedback,
      assignmentTitle,
    },
    isRead: false,
  });

  return await notification.save();
};

/**
 * Lấy danh sách thông báo của người dùng hiện tại
 */
const getMyNotifications = async (userId, query = {}) => {
  if (!userId) {
    throw createAppError("Chưa xác thực thông tin người dùng!", 401);
  }

  const filter = {
    recipient: userId,
    isDeleted: false,
  };

  if (query.isRead !== undefined && query.isRead !== "") {
    filter.isRead = query.isRead === "true" || query.isRead === true;
  }

  if (query.type) {
    filter.type = String(query.type).trim();
  }

  const notifications = await Notification.find(filter)
    .sort({ createdAt: -1 })
    .populate("sender", "fullName email role")
    .populate("assignment", "title dueDate status")
    .populate("submission", "score feedback submittedAt isLate")
    .lean();

  const unreadCount = await Notification.countDocuments({
    recipient: userId,
    isRead: false,
    isDeleted: false,
  });

  return {
    notifications,
    unreadCount,
  };
};

/**
 * Đánh dấu một thông báo là đã đọc (chỉ người nhận mới có quyền)
 */
const markNotificationAsRead = async (notificationId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(notificationId)) {
    throw createAppError("Mã thông báo không hợp lệ", 400);
  }

  const notification = await Notification.findOne({
    _id: notificationId,
    isDeleted: false,
  });

  if (!notification) {
    throw createAppError("Thông báo không tồn tại", 404);
  }

  if (notification.recipient.toString() !== userId.toString()) {
    throw createAppError(
      "Bạn không có quyền truy cập thông báo của người dùng khác!",
      403
    );
  }

  notification.isRead = true;
  notification.readAt = new Date();
  return await notification.save();
};

/**
 * Đánh dấu tất cả thông báo của người dùng hiện tại là đã đọc
 */
const markAllNotificationsAsRead = async (userId) => {
  await Notification.updateMany(
    { recipient: userId, isRead: false, isDeleted: false },
    { $set: { isRead: true, readAt: new Date() } }
  );
  return true;
};

module.exports = {
  createGradingNotification,
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};

