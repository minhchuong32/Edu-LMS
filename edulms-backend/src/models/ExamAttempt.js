const mongoose = require("mongoose");

const examAttemptAnswerSchema = new mongoose.Schema(
  {
    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
      required: [true, "Mã câu hỏi là bắt buộc"],
    },
    selectedOption: {
      type: Number,
      default: null, // Chỉ số phương án học sinh chọn (0, 1, 2...), null nếu bỏ trống
    },
    isCorrect: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const examAttemptSchema = new mongoose.Schema(
  {
    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: [true, "Đề kiểm tra (exam) là bắt buộc"],
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Học sinh (student) là bắt buộc"],
    },
    answers: {
      type: [examAttemptAnswerSchema],
      default: [],
    },
    score: {
      type: Number,
      required: [true, "Điểm số là bắt buộc"],
      min: [0, "Điểm số không được nhỏ hơn 0"],
    },
    scoreWeight: {
      type: Number,
      default: 10,
    },
    totalQuestions: {
      type: Number,
      default: 0,
      min: 0,
    },
    correctCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    wrongCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    unansweredCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    durationSpent: {
      type: Number,
      default: 0, // Thời gian làm bài tính theo giây
      min: 0,
    },
    status: {
      type: String,
      enum: {
        values: ["in_progress", "submitted", "completed"],
        message:
          "Trạng thái '{VALUE}' không hợp lệ. Hỗ trợ: in_progress, submitted, completed",
      },
      default: "completed",
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
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

// Chỉ mục hỗ trợ tìm kiếm bài làm theo đề thi và học sinh
examAttemptSchema.index(
  {
    exam: 1,
    student: 1,
    isDeleted: 1,
  },
  { unique: false }
);

examAttemptSchema.index({
  student: 1,
  isDeleted: 1,
});

module.exports = mongoose.model("ExamAttempt", examAttemptSchema);
