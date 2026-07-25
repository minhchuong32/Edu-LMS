const mongoose = require("mongoose");

const classSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Class name is required"],
      trim: true,
    },
    gradeRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Grade",
      required: true,
    },
    homeroomTeacherRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    schoolYear: {
      type: String,
      required: [true, "School year is required"],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate class names in the same academic year
classSchema.index({ name: 1, schoolYear: 1 }, { unique: true });

// Prevent duplicate homeroom teacher assignments in the same academic year
classSchema.index({ homeroomTeacherRef: 1, schoolYear: 1 }, { unique: true });

module.exports = mongoose.model("Class", classSchema);
