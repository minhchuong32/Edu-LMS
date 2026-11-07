const mongoose = require("mongoose");

const lessonContentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Tiêu đề bài giảng là bắt buộc"],
      trim: true,
      minlength: [2, "Tiêu đề bài giảng phải có ít nhất 2 ký tự"],
      maxlength: [200, "Tiêu đề bài giảng không được vượt quá 200 ký tự"],
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: [2000, "Mô tả không được vượt quá 2000 ký tự"],
    },
    contentType: {
      type: String,
      required: [true, "Loại nội dung là bắt buộc"],
      enum: {
        values: ["video", "pdf", "slide", "document", "link", "text"],
        message:
          "Loại nội dung '{VALUE}' không hợp lệ. Các loại hỗ trợ: video, pdf, slide, document, link, text",
      },
      lowercase: true,
      trim: true,
    },
    resourceUrl: {
      type: String,
      trim: true,
      default: "",
      validate: {
        validator: function (value) {
          // Nếu contentType là "text", resourceUrl có thể rỗng
          if (this.contentType === "text") {
            return true;
          }
          // Nếu contentType khác "text", khuyến khích có resourceUrl hợp lệ
          if (!value && this.contentType) {
            return false;
          }
          // Kiểm tra định dạng URL hoặc relative path cơ bản nếu có nhập
          if (value) {
            return /^(https?:\/\/|\/|uploads\/)/i.test(value);
          }
          return true;
        },
        message:
          "Đường dẫn tài liệu/video (resourceUrl) không hợp lệ hoặc không được để trống đối với loại nội dung này",
      },
    },
    order: {
      type: Number,
      required: [true, "Thứ tự hiển thị là bắt buộc"],
      default: 1,
      min: [1, "Thứ tự hiển thị phải lớn hơn hoặc bằng 1"],
    },
    videoProvider: {
      type: String,
      enum: {
        values: ["youtube", "cloudinary", "custom", null],
        message: "Nhà cung cấp video '{VALUE}' không hợp lệ",
      },
      default: null,
      lowercase: true,
      trim: true,
    },
    videoId: {
      type: String,
      trim: true,
      default: null,
    },
    originalVideoUrl: {
      type: String,
      trim: true,
      default: null,
    },
    teachingAssignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TeachingAssignment",
      required: [true, "Phân công giảng dạy là bắt buộc"],
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
  {
    timestamps: true,
  }
);

// Index phục vụ truy vấn bài giảng theo phân công giảng dạy và sắp xếp theo thứ tự hiển thị
lessonContentSchema.index({
  teachingAssignment: 1,
  order: 1,
  isDeleted: 1,
});

// Index phục vụ lọc bài giảng theo phân công và loại nội dung (video, tài liệu, slide, ...)
lessonContentSchema.index({
  teachingAssignment: 1,
  contentType: 1,
  isDeleted: 1,
});

module.exports = mongoose.model("LessonContent", lessonContentSchema);
