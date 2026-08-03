const mongoose = require("mongoose");

const teachingAssignmentSchema = new mongoose.Schema(
  {
    teacherRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      alias: "teacher",
    },
    classRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
      alias: "class",
    },
    subjectRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
      alias: "subject",
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate assignment of the same subject to the same class
teachingAssignmentSchema.index({ classRef: 1, subjectRef: 1 }, { unique: true });

module.exports = mongoose.model("TeachingAssignment", teachingAssignmentSchema);
