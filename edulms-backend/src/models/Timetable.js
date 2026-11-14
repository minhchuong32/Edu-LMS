const mongoose = require("mongoose");

const timetableSchema = new mongoose.Schema(
  {
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: [true, "Lớp học là bắt buộc"],
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: [true, "Môn học là bắt buộc"],
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Giáo viên giảng dạy là bắt buộc"],
    },
    teachingAssignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TeachingAssignment",
      required: [true, "Phân công giảng dạy là bắt buộc"],
    },
    dayOfWeek: {
      type: Number,
      required: [true, "Thứ trong tuần là bắt buộc (2 = Thứ Hai, ..., 7 = Thứ Bảy, 8 = Chủ Nhật)"],
      min: [2, "Thứ trong tuần từ 2 (Thứ Hai) đến 8 (Chủ Nhật)"],
      max: [8, "Thứ trong tuần từ 2 (Thứ Hai) đến 8 (Chủ Nhật)"],
    },
    period: {
      type: Number,
      required: [true, "Tiết học là bắt buộc (1 - 10)"],
      min: [1, "Tiết học từ 1 đến 10"],
      max: [10, "Tiết học từ 1 đến 10"],
    },
    academicYear: {
      type: String,
      required: [true, "Năm học là bắt buộc (ví dụ: 2025-2026)"],
      trim: true,
      match: [/^\d{4}-\d{4}$/, "Năm học phải theo định dạng YYYY-YYYY (ví dụ: 2025-2026)"],
    },
    semester: {
      type: String,
      enum: {
        values: ["HK1", "HK2", "CaNam"],
        message: "Học kỳ chỉ được là 'HK1', 'HK2' hoặc 'CaNam'",
      },
      default: "CaNam",
    },
    room: {
      type: String,
      trim: true,
      default: "",
    },
    note: {
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

// Index phục vụ truy vấn và kiểm tra xung đột lịch
timetableSchema.index({
  class: 1,
  academicYear: 1,
  semester: 1,
  dayOfWeek: 1,
  period: 1,
  isDeleted: 1,
});

timetableSchema.index({
  teacher: 1,
  academicYear: 1,
  semester: 1,
  dayOfWeek: 1,
  period: 1,
  isDeleted: 1,
});

timetableSchema.index({
  teachingAssignment: 1,
  isDeleted: 1,
});

module.exports = mongoose.model("Timetable", timetableSchema);
