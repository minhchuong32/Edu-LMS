const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipientRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["assignment", "grade", "attendance", "system"],
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    link: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for rapid listing of user notifications
notificationSchema.index({ recipientRef: 1, isRead: 1 });

module.exports = mongoose.model("Notification", notificationSchema);
