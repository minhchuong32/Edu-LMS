const mongoose = require("mongoose");

const gradeSchema = new mongoose.Schema(
  {
    level: {
      type: Number,
      required: [true, "Khối học là bắt buộc (10, 11, 12)"],
      enum: {
        values: [10, 11, 12],
        message: "Khối học chỉ được thuộc các khối 10, 11, hoặc 12",
      },
      unique: true,
    },
    name: {
      type: String,
      required: [true, "Tên khối học là bắt buộc"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Tự động gán tên khối chuẩn nếu chưa có
gradeSchema.pre("validate", function (next) {
  if (this.level && !this.name) {
    this.name = `Khối ${this.level}`;
  }
  next();
});

module.exports = mongoose.model("Grade", gradeSchema);
