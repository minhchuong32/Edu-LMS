const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Họ và tên là bắt buộc"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email là bắt buộc"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Mật khẩu là bắt buộc"],
    },
    userCode: {
      type: String,
      required: [true, "Mã định danh là bắt buộc"],
      unique: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["admin", "teacher", "student", "parent"],
      default: "student",
    },
    className: {
      type: String,
      trim: true,
      default: null,
    },
    classRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      default: null,
    },
    // Danh sách học sinh được liên kết với tài khoản Phụ huynh (một phụ huynh có thể có một hoặc nhiều học sinh)
    childrenRefs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    phone: {
      type: String,
      trim: true,
      default: null,
    },
    mustChangePassword: {
      type: Boolean,
      default: false,
    },
    isActivated: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

userSchema.index({ classRef: 1, role: 1 });
userSchema.index({ role: 1, childrenRefs: 1 });

module.exports = mongoose.model("User", userSchema);
