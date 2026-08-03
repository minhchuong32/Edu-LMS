const mongoose = require("mongoose");

const classHistorySchema = new mongoose.Schema(
  {
    studentRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Student reference is required"],
    },
    fromClassRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      default: null,
    },
    toClassRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: [true, "Target class reference is required"],
    },
    transferredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Actor (transferredBy) reference is required"],
    },
    reason: {
      type: String,
      trim: true,
      default: "",
    },
    transferredAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

classHistorySchema.index({ studentRef: 1, transferredAt: -1 });
classHistorySchema.index({ fromClassRef: 1 });
classHistorySchema.index({ toClassRef: 1 });

module.exports = mongoose.model("ClassHistory", classHistorySchema);
