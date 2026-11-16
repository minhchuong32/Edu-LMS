const mongoose = require("mongoose");

const assignmentAttachmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: "",
    },
    url: {
      type: String,
      required: [true, "Đường dẫn tệp đính kèm (url) là bắt buộc"],
      trim: true,
    },
    publicId: {
      type: String,
      trim: true,
      default: "",
    },
    resourceType: {
      type: String,
      trim: true,
      default: "raw",
    },
    fileType: {
      type: String,
      trim: true,
      default: "document",
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    format: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: true, timestamps: true }
);

const assignmentSchema = new mongoose.Schema(
  {
    teachingAssignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TeachingAssignment",
      required: [true, "Phân công giảng dạy là bắt buộc"],
    },
    title: {
      type: String,
      required: [true, "Tiêu đề bài tập là bắt buộc"],
      trim: true,
      minlength: [2, "Tiêu đề bài tập phải có ít nhất 2 ký tự"],
      maxlength: [200, "Tiêu đề bài tập không được vượt quá 200 ký tự"],
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: [5000, "Mô tả bài tập không được vượt quá 5000 ký tự"],
    },
    dueDate: {
      type: Date,
      required: [true, "Hạn nộp bài (dueDate) là bắt buộc"],
    },
    attachmentUrl: {
      type: String,
      trim: true,
      default: "",
    },
    attachments: {
      type: [assignmentAttachmentSchema],
      default: [],
    },
    status: {
      type: String,
      enum: {
        values: ["open", "locked"],
        message:
          "Trạng thái bài tập '{VALUE}' không hợp lệ. Các trạng thái hỗ trợ: open, locked",
      },
      default: "open",
      lowercase: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
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

// Index phục vụ truy vấn danh sách bài tập theo phân công giảng dạy và hạn nộp
assignmentSchema.index({
  teachingAssignment: 1,
  dueDate: 1,
  isDeleted: 1,
});

// Index phục vụ lọc bài tập theo phân công giảng dạy và trạng thái đóng/mở nhận bài
assignmentSchema.index({
  teachingAssignment: 1,
  status: 1,
  isDeleted: 1,
});

module.exports = mongoose.model("Assignment", assignmentSchema);

