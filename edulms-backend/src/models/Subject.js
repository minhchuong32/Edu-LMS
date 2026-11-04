const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Tên môn học là bắt buộc"],
      trim: true,
    },
    code: {
      type: String,
      required: [true, "Mã môn học là bắt buộc"],
      unique: true,
      uppercase: true,
      trim: true,
    },
    gradeLevel: {
      type: Number,
      enum: [10, 11, 12],
      default: null,
    },
    periodsPerWeek: {
      type: Number,
      default: 2,
      min: [1, "Số tiết/tuần tối thiểu là 1"],
      max: [10, "Số tiết/tuần tối đa là 10"],
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

subjectSchema.index({ code: 1, isDeleted: 1 });

module.exports = mongoose.model("Subject", subjectSchema);
