const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: [true, "Môn học là bắt buộc"],
    },
    chapter: {
      type: String,
      required: [true, "Chương là bắt buộc"],
      trim: true,
      minlength: [1, "Tên chương không được để trống"],
      maxlength: [200, "Tên chương không được vượt quá 200 ký tự"],
    },
    difficulty: {
      type: String,
      required: [true, "Độ khó là bắt buộc"],
      enum: {
        values: [
          "easy",
          "medium",
          "hard",
          "nhan_biet",
          "thong_hieu",
          "van_dung",
          "van_dung_cao",
        ],
        message:
          "Độ khó '{VALUE}' không hợp lệ. Các giá trị hỗ trợ: easy, medium, hard (hoặc nhan_biet, thong_hieu, van_dung, van_dung_cao)",
      },
      default: "medium",
      lowercase: true,
      trim: true,
    },
    content: {
      type: String,
      required: [true, "Nội dung câu hỏi là bắt buộc"],
      trim: true,
      minlength: [3, "Nội dung câu hỏi phải có ít nhất 3 ký tự"],
      maxlength: [10000, "Nội dung câu hỏi không được vượt quá 10000 ký tự"],
    },
    options: {
      type: [String],
      required: [true, "Danh sách các phương án trả lời là bắt buộc"],
      validate: [
        {
          validator: function (val) {
            return Array.isArray(val) && val.length >= 2;
          },
          message: "Câu hỏi trắc nghiệm phải có ít nhất 2 phương án trả lời",
        },
        {
          validator: function (val) {
            if (!Array.isArray(val)) return false;
            return val.every(
              (opt) => typeof opt === "string" && opt.trim().length > 0
            );
          },
          message: "Các phương án trả lời không được để trống",
        },
      ],
    },
    correctIndex: {
      type: Number,
      required: [true, "Chỉ số đáp án đúng (correctIndex) là bắt buộc"],
      validate: {
        validator: function (val) {
          if (!Number.isInteger(val) || val < 0) return false;
          if (Array.isArray(this.options) && this.options.length > 0) {
            return val < this.options.length;
          }
          return true;
        },
        message:
          "Chỉ số đáp án đúng (correctIndex) không hợp lệ so với số lượng phương án trả lời",
      },
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Giáo viên tạo câu hỏi là bắt buộc"],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    explanation: {
      type: String,
      trim: true,
      default: "",
      maxlength: [5000, "Lời giải thích không được vượt quá 5000 ký tự"],
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

// Tự động gán đồng bộ teacher và createdBy trước khi validate
questionSchema.pre("validate", function () {
  if (!this.createdBy && this.teacher) {
    this.createdBy = this.teacher;
  }
  if (!this.teacher && this.createdBy) {
    this.teacher = this.createdBy;
  }
});

// Chỉ mục hỗ trợ lọc ngân hàng câu hỏi theo Môn học, Chương, Độ khó
questionSchema.index({
  subject: 1,
  chapter: 1,
  difficulty: 1,
  isDeleted: 1,
});

questionSchema.index({
  subject: 1,
  isDeleted: 1,
});

questionSchema.index({
  teacher: 1,
  isDeleted: 1,
});

module.exports = mongoose.model("Question", questionSchema);
