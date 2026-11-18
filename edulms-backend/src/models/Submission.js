const mongoose = require("mongoose");

const submissionAttachmentSchema = new mongoose.Schema(
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

const submissionSchema = new mongoose.Schema(
  {
    assignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignment",
      required: [true, "Bài tập (assignment) là bắt buộc"],
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Học sinh (student) là bắt buộc"],
    },
    fileUrl: {
      type: String,
      required: [true, "Đường dẫn tệp bài nộp (fileUrl) là bắt buộc"],
      trim: true,
    },
    attachments: {
      type: [submissionAttachmentSchema],
      default: [],
    },
    note: {
      type: String,
      trim: true,
      default: "",
      maxlength: [1000, "Ghi chú bài nộp không được vượt quá 1000 ký tự"],
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    isLate: {
      type: Boolean,
      default: false,
    },
    score: {
      type: Number,
      default: null,
      min: [0, "Điểm số không được nhỏ hơn 0"],
      max: [10, "Điểm số không được lớn hơn 10"],
    },
    feedback: {
      type: String,
      trim: true,
      default: "",
      maxlength: [2000, "Nhận xét của giáo viên không được vượt quá 2000 ký tự"],
    },
    gradedAt: {
      type: Date,
      default: null,
    },
    gradedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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

// Tự động tính toán isLate nếu document có gắn dueDate tạm hoặc qua phương thức tĩnh
submissionSchema.statics.calculateIsLate = function (submittedAt, dueDate) {
  if (!dueDate) return false;
  const submitTime = new Date(submittedAt || Date.now()).getTime();
  const dueTime = new Date(dueDate).getTime();
  if (Number.isNaN(submitTime) || Number.isNaN(dueTime)) return false;
  return submitTime > dueTime;
};

// Index phục vụ tra cứu bài nộp của học sinh theo bài tập
submissionSchema.index({
  assignment: 1,
  student: 1,
  isDeleted: 1,
});

// Index phục vụ lọc danh sách bài nộp theo bài tập và trạng thái đúng hạn / trễ hạn
submissionSchema.index({
  assignment: 1,
  isLate: 1,
  submittedAt: -1,
  isDeleted: 1,
});

module.exports = mongoose.model("Submission", submissionSchema);

