const mongoose = require("mongoose");

const assignmentSchema = new mongoose.Schema(
  {
    teachingAssignmentRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TeachingAssignment",
      required: true,
    },
    title: {
      type: String,
      required: [true, "Assignment title is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    attachmentUrl: {
      type: String,
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Assignment", assignmentSchema);
