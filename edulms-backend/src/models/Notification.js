const mongoose = require("mongoose");

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
      enum: {
        values: [
          "assignment_graded",
          "assignment_created",
          "submission_updated",
          "system",
          "general",
        ],
        message: "Loại thông báo '{VALUE}' không hợp lệ",
      },
      default: "assignment_graded",
      trim: true,
    },
    title: {
      type: String,
      required: [true, "Tiêu đề thông báo là bắt buộc"],
      trim: true,
      maxlength: [250, "Tiêu đề thông báo không được vượt quá 250 ký tự"],
    },
    message: {
      type: String,
      required: [true, "Nội dung thông báo là bắt buộc"],
      trim: true,
      maxlength: [2000, "Nội dung thông báo không được vượt quá 2000 ký tự"],
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

notificationSchema.index({
  recipient: 1,
  isRead: 1,
  createdAt: -1,
  isDeleted: 1,
});

module.exports = mongoose.model("Notification", notificationSchema);

