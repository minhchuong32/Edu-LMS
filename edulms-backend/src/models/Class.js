const mongoose = require("mongoose");

const classSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Tên lớp học là bắt buộc (ví dụ: 10A1, 10A2)"],
      uppercase: true,
      trim: true,
    },
    grade: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Grade",
      required: [true, "Khối học tương ứng là bắt buộc"],
    },
    academicYear: {
      type: String,
      required: [true, "Năm học là bắt buộc (ví dụ: 2025-2026)"],
      trim: true,
      match: [/^\d{4}-\d{4}$/, "Năm học phải theo định dạng YYYY-YYYY (ví dụ: 2025-2026)"],
    },
    homeroomTeacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    room: {
      type: String,
      trim: true,
      default: "",
    },
    capacity: {
      type: Number,
      default: 45,
      min: [1, "Sĩ số tối thiểu là 1"],
      max: [60, "Sĩ số tối đa là 60"],
    },
    currentStudents: {
      type: Number,
      default: 0,
      min: [0, "Sĩ số không thể âm"],
    },
    description: {
      type: String,
      trim: true,
      default: "",
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
  { timestamps: true }
);

classSchema.index({ name: 1, academicYear: 1, isDeleted: 1 });

module.exports = mongoose.model("Class", classSchema);
