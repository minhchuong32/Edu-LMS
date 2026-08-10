const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    teacherName: {
      type: String,
      required: true,
      trim: true,
    },
    teacherRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    gradeLabel: {
      type: String,
      required: true,
      trim: true,
    },
    gradeCode: {
      type: String,
      required: true,
      enum: ["all", "k10", "k11", "k12", "vocational"],
      default: "k10",
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    students: {
      type: Number,
      default: 0,
    },
    lessons: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      default: "Đang mở lớp",
    },
    badge: {
      type: String,
      default: "",
    },
    image: {
      type: String,
      default: "",
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Course", courseSchema);
