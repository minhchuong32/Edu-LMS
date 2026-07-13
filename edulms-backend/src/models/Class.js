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
      unique: true, // Only one class per homeroom teacher
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate class names in same academic year (simulated by name + grade uniqueness)
classSchema.index({ name: 1, gradeRef: 1 }, { unique: true });

module.exports = mongoose.model("Class", classSchema);
