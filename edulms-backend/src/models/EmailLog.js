const mongoose = require("mongoose");

const SUPPORTED_EMAIL_EVENT_TYPES = Object.freeze([
  "low_grade_alert",
  "grade_result_notification",
  "periodic_academic_report",
]);

const SUPPORTED_EMAIL_STATUSES = Object.freeze([
  "pending",
  "sent",
  "failed",
  "skipped_duplicate",
]);

/**
 * Model EmailLog: Ghi nhận trạng thái gửi email thông báo cho Phụ huynh
 * - Đảm bảo cùng một sự kiện (eventKey + recipientEmail) không bị gửi email trùng lặp nhiều lần
 * - Lưu trữ trạng thái gửi ('pending' | 'sent' | 'failed'), số lần thử (attempts / maxRetries) và lỗi cuối cùng (lastError) để hỗ trợ kiểm tra lỗi và retry
 */
const emailLogSchema = new mongoose.Schema(
  {
    eventKey: {
      type: String,
      required: [true, "Mã định danh sự kiện gửi email (eventKey) là bắt buộc"],
      trim: true,
    },
    eventType: {
      type: String,
      required: [true, "Loại sự kiện email (eventType) là bắt buộc"],
      enum: {
        values: SUPPORTED_EMAIL_EVENT_TYPES,
        message: "Loại sự kiện email '{VALUE}' không hợp lệ",
      },
      default: "low_grade_alert",
      trim: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Học sinh liên quan (student) là bắt buộc"],
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    recipientEmail: {
      type: String,
      required: [true, "Địa chỉ email Phụ huynh nhận (recipientEmail) là bắt buộc"],
      lowercase: true,
      trim: true,
    },
    subject: {
      type: String,
      required: [true, "Tiêu đề email (subject) là bắt buộc"],
      trim: true,
      maxlength: [300, "Tiêu đề email không được vượt quá 300 ký tự"],
    },
    htmlContent: {
      type: String,
      required: [true, "Nội dung HTML của email (htmlContent) là bắt buộc"],
    },
    textContent: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: {
        values: SUPPORTED_EMAIL_STATUSES,
        message: "Trạng thái gửi email '{VALUE}' không hợp lệ",
      },
      default: "pending",
    },
    attempts: {
      type: Number,
      default: 0,
      min: [0, "Số lần thử gửi không được âm"],
    },
    maxRetries: {
      type: Number,
      default: 3,
      min: [1, "Số lần thử tối đa phải lớn hơn hoặc bằng 1"],
    },
    messageId: {
      type: String,
      default: null,
    },
    lastError: {
      type: String,
      default: null,
    },
    sentAt: {
      type: Date,
      default: null,
    },
    lastAttemptAt: {
      type: Date,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index theo (eventKey, recipientEmail) để chống gửi trùng lặp cùng một sự kiện cho cùng một Phụ huynh
emailLogSchema.index({ eventKey: 1, recipientEmail: 1 }, { unique: true });
emailLogSchema.index({ status: 1, attempts: 1, createdAt: -1 });
emailLogSchema.index({ student: 1, eventType: 1, createdAt: -1 });

const EmailLog = mongoose.model("EmailLog", emailLogSchema);

EmailLog.SUPPORTED_EMAIL_EVENT_TYPES = SUPPORTED_EMAIL_EVENT_TYPES;
EmailLog.SUPPORTED_EMAIL_STATUSES = SUPPORTED_EMAIL_STATUSES;

module.exports = EmailLog;

