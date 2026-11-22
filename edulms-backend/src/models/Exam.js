const mongoose = require("mongoose");

const examSchema = new mongoose.Schema(
  {
    teachingAssignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TeachingAssignment",
      required: [true, "Phân công giảng dạy (teachingAssignment) là bắt buộc"],
    },
    title: {
      type: String,
      required: [true, "Tiêu đề đề kiểm tra là bắt buộc"],
      trim: true,
      minlength: [2, "Tiêu đề đề kiểm tra phải có ít nhất 2 ký tự"],
      maxlength: [200, "Tiêu đề đề kiểm tra không được vượt quá 200 ký tự"],
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: [3000, "Mô tả đề kiểm tra không được vượt quá 3000 ký tự"],
    },
    duration: {
      type: Number,
      required: [true, "Thời gian làm bài (duration - phút) là bắt buộc"],
      min: [1, "Thời gian làm bài tối thiểu là 1 phút"],
      max: [300, "Thời gian làm bài không được vượt quá 300 phút"],
    },
    questionIds: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Question",
        },
      ],
      default: [],
    },
    scoreWeight: {
      type: Number,
      default: 10,
      min: [0.1, "Thang điểm hoặc hệ số điểm tối thiểu là 0.1"],
      max: [100, "Thang điểm hoặc hệ số điểm tối đa là 100"],
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Giáo viên tạo đề kiểm tra là bắt buộc"],
    },
    status: {
      type: String,
      enum: {
        values: ["draft", "published", "closed"],
        message:
          "Trạng thái '{VALUE}' không hợp lệ. Hỗ trợ: draft, published, closed",
      },
      default: "draft",
      lowercase: true,
      trim: true,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    startTime: {
      type: Date,
      default: null,
    },
    endTime: {
      type: Date,
      default: null,
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
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual alias 'questions' hỗ trợ truy cập tương thích
examSchema.virtual("questions").get(function () {
  return this.questionIds;
});

// Tự động đồng bộ status và isPublished trước khi validate
examSchema.pre("validate", function () {
  if (this.isPublished && this.status === "draft") {
    this.status = "published";
  }
  if (this.status === "published" && !this.isPublished) {
    this.isPublished = true;
  }
  if (this.isPublished && !this.publishedAt) {
    this.publishedAt = new Date();
  }
});

// Chỉ mục hỗ trợ truy vấn đề thi theo phân công giảng dạy và trạng thái
examSchema.index({
  teachingAssignment: 1,
  status: 1,
  isDeleted: 1,
});

examSchema.index({
  teacher: 1,
  isDeleted: 1,
});

module.exports = mongoose.model("Exam", examSchema);
