const mongoose = require("mongoose");

const timetableSchema = new mongoose.Schema(
  {
    teachingAssignmentRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TeachingAssignment",
      required: true,
    },
    dayOfWeek: {
      type: Number,
      required: true,
      min: 2, // Monday (2 in VN standard or standard index)
      max: 8, // Sunday (8)
    },
    period: {
      type: Number,
      required: true,
      min: 1, // Period 1
      max: 10, // Period 10
    },
    classroom: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent teaching assignment collisions (one class cannot have two periods at the same time)
timetableSchema.index({ dayOfWeek: 1, period: 1, teachingAssignmentRef: 1 }, { unique: true });

module.exports = mongoose.model("Timetable", timetableSchema);
