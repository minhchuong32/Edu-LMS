const mongoose = require("mongoose");

/**
 * Bảng hệ số mặc định theo từng loại điểm (có thể cấu hình đè qua biến môi trường hoặc runtime config)
 */
const DEFAULT_GRADE_WEIGHTS = Object.freeze({
  oral: 1, // Điểm miệng
  "15min": 1, // Điểm 15 phút
  regular: 1, // Điểm đánh giá thường xuyên
  "45min": 2, // Điểm kiểm tra 1 tiết (45 phút)
  midterm: 2, // Điểm kiểm tra giữa kỳ
  final: 3, // Điểm thi cuối kỳ / học kỳ
});

const SUPPORTED_GRADE_TYPES = Object.freeze(Object.keys(DEFAULT_GRADE_WEIGHTS));
const SUPPORTED_SEMESTERS = Object.freeze(["HK1", "HK2", "CaNam"]);

const gradeRecordSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Học sinh (student) là bắt buộc"],
    },
    teachingAssignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TeachingAssignment",
      required: [true, "Phân công giảng dạy (teachingAssignment) là bắt buộc"],
    },
    semester: {
      type: String,
      required: [true, "Học kỳ (semester) là bắt buộc"],
      enum: {
        values: SUPPORTED_SEMESTERS,
        message:
          "Học kỳ '{VALUE}' không hợp lệ. Các học kỳ hỗ trợ: HK1, HK2, CaNam",
      },
      default: "HK1",
      trim: true,
    },
    gradeType: {
      type: String,
      required: [true, "Loại điểm (gradeType) là bắt buộc"],
      enum: {
        values: SUPPORTED_GRADE_TYPES,
        message:
          "Loại điểm '{VALUE}' không hợp lệ. Các loại điểm hỗ trợ: oral, 15min, regular, 45min, midterm, final",
      },
      lowercase: true,
      trim: true,
    },
    value: {
      type: Number,
      required: [true, "Giá trị điểm (value) là bắt buộc"],
      min: [0, "Điểm số phải nằm trong khoảng từ 0 đến 10"],
      max: [10, "Điểm số phải nằm trong khoảng từ 0 đến 10"],
    },
    weight: {
      type: Number,
      required: [true, "Hệ số điểm (weight) là bắt buộc"],
      min: [0.1, "Hệ số điểm (weight) phải lớn hơn 0"],
    },
    note: {
      type: String,
      trim: true,
      default: "",
      maxlength: [500, "Ghi chú điểm số không được vượt quá 500 ký tự"],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    updatedBy: {
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

// Tự động gán hệ số (weight) từ cấu hình theo gradeType nếu chưa được chỉ định
gradeRecordSchema.pre("validate", function () {
  if (
    (this.weight === undefined || this.weight === null) &&
    this.gradeType &&
    DEFAULT_GRADE_WEIGHTS[this.gradeType] !== undefined
  ) {
    this.weight = DEFAULT_GRADE_WEIGHTS[this.gradeType];
  }
});

// Index phục vụ truy vấn bảng điểm theo phân công giảng dạy, học sinh, học kỳ và loại điểm
gradeRecordSchema.index({
  teachingAssignment: 1,
  student: 1,
  semester: 1,
  gradeType: 1,
  isDeleted: 1,
});

// Index phục vụ tra cứu nhanh sổ điểm cá nhân của học sinh theo học kỳ
gradeRecordSchema.index({
  student: 1,
  semester: 1,
  isDeleted: 1,
});

const GradeRecord = mongoose.model("GradeRecord", gradeRecordSchema);

GradeRecord.DEFAULT_GRADE_WEIGHTS = DEFAULT_GRADE_WEIGHTS;
GradeRecord.SUPPORTED_GRADE_TYPES = SUPPORTED_GRADE_TYPES;
GradeRecord.SUPPORTED_SEMESTERS = SUPPORTED_SEMESTERS;

module.exports = GradeRecord;

