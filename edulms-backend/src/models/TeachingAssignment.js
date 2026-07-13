const mongoose = require("mongoose");

const teachingAssignmentSchema = new mongoose.Schema(
  {
    teacherRef: {
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
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate assignment of the same subject to the same class
teachingAssignmentSchema.index({ classRef: 1, subjectRef: 1 }, { unique: true });

module.exports = mongoose.model("TeachingAssignment", teachingAssignmentSchema);
