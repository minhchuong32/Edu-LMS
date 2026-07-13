const mongoose = require("mongoose");

const examAttemptSchema = new mongoose.Schema(
  {
    examRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
    },
    studentRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    answers: {
      type: [Number], // Indice representing choices made by the student
      required: true,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 10,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("ExamAttempt", examAttemptSchema);
