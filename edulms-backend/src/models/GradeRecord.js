const mongoose = require("mongoose");

const gradeRecordSchema = new mongoose.Schema(
  {
    studentRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    classRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },
    subjectRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    examType: {
      type: String,
      enum: ["mouth", "15min", "1period", "final"],
      required: true,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 10,
    },
    weight: {
      type: Number,
      required: true,
      enum: [1, 2, 3], // 1 for mouth/15min, 2 for 1period, 3 for final
    },
  },
  {
    timestamps: true,
  }
);

// Optimize performance for fetching class rosters or subject sheets
gradeRecordSchema.index({ classRef: 1, subjectRef: 1, studentRef: 1 });

module.exports = mongoose.model("GradeRecord", gradeRecordSchema);
