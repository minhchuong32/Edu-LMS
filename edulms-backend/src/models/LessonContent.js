const mongoose = require("mongoose");

const lessonContentSchema = new mongoose.Schema(
  {
    teachingAssignmentRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TeachingAssignment",
      required: [true, "Teaching assignment reference is required"],
      alias: "teachingAssignment",
    },
    title: {
      type: String,
      required: [true, "Lesson content title is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    contentType: {
      type: String,
      required: [true, "Content type is required"],
      enum: ["video", "document", "link", "exercise", "other"],
      default: "document",
    },
    attachmentUrl: {
      type: String,
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index to quickly fetch content ordered by teachingAssignment
lessonContentSchema.index({ teachingAssignmentRef: 1, order: 1 });

module.exports = mongoose.model("LessonContent", lessonContentSchema);
