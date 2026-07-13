const mongoose = require("mongoose");

const examSchema = new mongoose.Schema(
  {
    teachingAssignmentRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TeachingAssignment",
      required: true,
    },
    title: {
      type: String,
      required: [true, "Exam title is required"],
      trim: true,
    },
    duration: {
      type: Number,
      required: [true, "Exam duration in minutes is required"],
      min: 15,
      max: 180,
    },
    questions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Question",
      },
    ],
    weight: {
      type: Number,
      default: 3, // Weight for final semester exam is normally 3 in Vietnam high school scale
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Exam", examSchema);
