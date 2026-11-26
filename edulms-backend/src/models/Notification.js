const mongoose = require("mongoose");

const SUPPORTED_NOTIFICATION_TYPES = Object.freeze([
  "assignment_created",
  "assignment_graded",
  "submission_updated",
  "grade_created",
  "grade_updated",
  "assignment",
  "grade",
  "system",
  "general",
]);

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Người nhận thông báo (recipient) là bắt buộc"],
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    type: {
      type: String,
      required: [true, "Loại thông báo (type) là bắt buộc"],
      enum: {
        values: SUPPORTED_NOTIFICATION_TYPES,
        message: "Loại thông báo '{VALUE}' không hợp lệ",
      },
      default: "general",
      trim: true,
    },
    title: {
      type: String,
      trim: true,
      default: "Thông báo hệ thống",
      maxlength: [250, "Tiêu đề thông báo không được vượt quá 250 ký tự"],
    },
    content: {
      type: String,
      required: [true, "Nội dung thông báo (content) là bắt buộc"],
      trim: true,
      maxlength: [2000, "Nội dung thông báo không được vượt quá 2000 ký tự"],
    },
    message: {
      type: String,
      trim: true,
      default: "",
      maxlength: [2000, "Nội dung thông báo không được vượt quá 2000 ký tự"],
    },
    link: {
      type: String,
      trim: true,
      default: "",
      maxlength: [500, "Đường dẫn liên kết (link) không được vượt quá 500 ký tự"],
    },
    submission: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Submission",
      default: null,
    },
    assignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignment",
      default: null,
    },
    gradeRecord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GradeRecord",
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Đồng bộ hai chiều giữa trường `content` (chuẩn schema) và `message` (tương thích ngược)
notificationSchema.pre("validate", function () {
  if (!this.content && this.message) {
    this.content = this.message;
  }
  if (!this.message && this.content) {
    this.message = this.content;
  }
  if (!this.title && this.content) {
    this.title = String(this.content).slice(0, 120);
  }
});

notificationSchema.index({
  recipient: 1,
  isRead: 1,
  createdAt: -1,
  isDeleted: 1,
});

const Notification = mongoose.model("Notification", notificationSchema);
Notification.SUPPORTED_NOTIFICATION_TYPES = SUPPORTED_NOTIFICATION_TYPES;

module.exports = Notification;
