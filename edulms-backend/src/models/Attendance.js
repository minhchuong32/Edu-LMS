const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    timetableRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Timetable",
      required: true,
    },
    studentRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["present", "absent", "late", "excused"],
      default: "present",
    },
    note: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate attendance records for the same student on the same period and date
attendanceSchema.index({ timetableRef: 1, studentRef: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);
