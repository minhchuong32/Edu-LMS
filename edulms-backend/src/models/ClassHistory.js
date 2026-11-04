const mongoose = require("mongoose");

const classHistorySchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Học sinh là bắt buộc"],
    },
    action: {
      type: String,
      enum: {
        values: ["ASSIGN", "TRANSFER", "REMOVE"],
        message: "Hành động '{VALUE}' không hợp lệ (hỗ trợ: ASSIGN, TRANSFER, REMOVE)",
      },
      required: [true, "Hành động là bắt buộc"],
    },
    fromClass: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      default: null,
    },
    toClass: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      default: null,
    },
    academicYear: {
      type: String,
      trim: true,
      default: "",
    },
    note: {
      type: String,
      trim: true,
      default: "",
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Người thực hiện là bắt buộc"],
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

classHistorySchema.index({ student: 1, changedAt: -1 });
classHistorySchema.index({ fromClass: 1, changedAt: -1 });
classHistorySchema.index({ toClass: 1, changedAt: -1 });
classHistorySchema.index({ academicYear: 1 });

module.exports = mongoose.model("ClassHistory", classHistorySchema);
