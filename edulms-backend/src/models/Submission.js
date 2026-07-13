const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema(
  {
    assignmentRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignment",
      required: true,
    },
    studentRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    isLate: {
      type: Boolean,
      default: false,
    },
    score: {
      type: Number,
      min: 0,
      max: 10,
    },
    feedback: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// A student can submit only one file per assignment
submissionSchema.index({ assignmentRef: 1, studentRef: 1 }, { unique: true });

module.exports = mongoose.model("Submission", submissionSchema);
