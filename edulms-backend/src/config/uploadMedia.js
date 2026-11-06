/**
 * Cấu hình Multer cho upload nhiều định dạng file (tài liệu, bảng tính, trình chiếu,
 * file nén, hình ảnh, video).
 *
 * - Lưu trong RAM (req.file.buffer), KHÔNG ghi file tạm ra ổ đĩa. Buffer được stream
 *   thẳng lên Cloudinary (uploadFileToCloudinary / uploadStreamToCloudinary).
 * - fileFilter (lớp 1): kiểm tra phần mở rộng + MIME type phải đi đúng cặp và thuộc
 *   nhóm được phép của từng route.
 * - Storage engine (lớp 2): giới hạn dung lượng RIÊNG theo nhóm file, dừng nhận dữ liệu
 *   ngay khi vượt ngưỡng (không đọc hết file vào RAM).
 * - Kiểm tra nội dung thật (magic bytes - lớp 3) nằm ở src/middlewares/upload.middleware.js.
 *
 * LƯU Ý: src/config/upload.js (import Excel) được giữ nguyên, không dùng chung cấu hình.
 */
const multer = require("multer");
const path = require("path");
const { MB, FILE_TYPE_CATEGORIES, EXTENSION_RULES, ALL_CATEGORIES } = require("./fileTypes");

/**
 * Lỗi upload có kèm HTTP status code để global errorHandler trả về đúng mã.
 */
class UploadError extends Error {
  constructor(message, statusCode = 400, code = "INVALID_FILE") {
    super(message);
    this.name = "UploadError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

const formatSize = (bytes) => {
  const mb = bytes / MB;
  return `${Number.isInteger(mb) ? mb : mb.toFixed(1)}MB`;
};

/**
 * Chuẩn hóa danh sách phần mở rộng được phép từ categories (+ lọc extensions nếu có).
 * @param {string[]} categories
 * @param {string[]} [extensions] tập con extension (vd: chỉ [".pdf"])
 */
const resolveAllowedExtensions = (categories, extensions) => {
  const unknown = categories.filter((c) => !FILE_TYPE_CATEGORIES[c]);
  if (unknown.length) {
    throw new Error(`Nhóm file không hợp lệ: ${unknown.join(", ")}`);
  }

  const fromCategories = categories.flatMap((c) => Object.keys(FILE_TYPE_CATEGORIES[c].extensions));
  if (!extensions) return fromCategories;

  const normalized = extensions.map((e) => e.toLowerCase());
  const invalid = normalized.filter((e) => !fromCategories.includes(e));
  if (invalid.length) {
    throw new Error(`Phần mở rộng không thuộc nhóm đã chọn: ${invalid.join(", ")}`);
  }
  return normalized;
};

/** Tạo nhãn mô tả các định dạng cho thông báo lỗi, vd: "PDF, DOCX" */
const describeExtensions = (extensions) => extensions.map((e) => e.slice(1).toUpperCase()).join(", ");

/**
 * Tạo fileFilter (lớp 1: extension + MIME type).
 * Gắn thông tin nhóm vào file để storage engine áp dụng giới hạn dung lượng riêng.
 */
const createFileFilter = (allowedExtensions) => {
  const allowedLabel = describeExtensions(allowedExtensions);

  return (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const mimetype = String(file.mimetype || "").toLowerCase();
    const rule = EXTENSION_RULES[ext];

    if (!rule || !allowedExtensions.includes(ext)) {
      return cb(
        new UploadError(
          `Phần mở rộng '${ext || "(trống)"}' không được hỗ trợ. Chỉ chấp nhận: ${allowedLabel}`,
          415,
          "INVALID_EXTENSION",
        ),
        false,
      );
    }

    if (!rule.mimes.includes(mimetype)) {
      return cb(
        new UploadError(
          `Định dạng tập tin không hợp lệ (${mimetype || "không xác định"}) cho phần mở rộng '${ext}'!`,
          415,
          "INVALID_MIME_TYPE",
        ),
        false,
      );
    }

    // Thông tin nội bộ dùng cho các bước sau (không phụ thuộc dữ liệu client)
    file.category = rule.category;
    file.extension = ext;
    file.maxSize = rule.maxSize;
    return cb(null, true);
  };
};

/**
 * Storage engine lưu file trong RAM, giới hạn dung lượng theo nhóm file (file.maxSize).
 * Khi vượt ngưỡng: ngừng giữ dữ liệu, xả phần còn lại của stream và trả lỗi 413.
 */
class LimitedMemoryStorage {
  _handleFile(req, file, cb) {
    const chunks = [];
    const limit = file.maxSize;
    let total = 0;
    let finished = false;

    const finish = (err, info) => {
      if (finished) return;
      finished = true;
      file.stream.removeListener("data", onData);
      cb(err, info);
    };

    const onData = (chunk) => {
      total += chunk.length;
      if (limit && total > limit) {
        chunks.length = 0; // giải phóng bộ nhớ ngay
        file.stream.resume(); // xả phần còn lại, không giữ trong RAM
        return finish(
          new UploadError(
            `Kích thước ${FILE_TYPE_CATEGORIES[file.category].label} vượt quá giới hạn tối đa cho phép (${formatSize(limit)})!`,
            413,
            "FILE_TOO_LARGE",
          ),
        );
      }
      chunks.push(chunk);
    };

    file.stream.on("data", onData);
    file.stream.on("error", (err) => finish(err));
    file.stream.on("end", () => {
      const buffer = Buffer.concat(chunks);
      finish(null, { buffer, size: buffer.length });
    });
  }

  _removeFile(req, file, cb) {
    delete file.buffer;
    cb(null);
  }
}

/**
 * Tạo instance Multer cho tập nhóm file được phép.
 * limits.fileSize = giới hạn lớn nhất trong các nhóm (lưới an toàn cuối cùng);
 * giới hạn riêng từng nhóm do LimitedMemoryStorage đảm nhiệm.
 */
const createMulter = ({ categories = ALL_CATEGORIES, extensions } = {}) => {
  const allowedExtensions = resolveAllowedExtensions(categories, extensions);
  const maxFileSize = Math.max(...allowedExtensions.map((e) => EXTENSION_RULES[e].maxSize));

  const instance = multer({
    storage: new LimitedMemoryStorage(),
    fileFilter: createFileFilter(allowedExtensions),
    defParamCharset: "utf8", // Giữ đúng tên file tiếng Việt
    limits: {
      fileSize: maxFileSize,
      files: 1, // Mỗi request chỉ nhận 1 file
      fields: 20, // Giới hạn số field text đi kèm
      fieldSize: 1 * MB, // Giới hạn kích thước mỗi field text
      parts: 25,
    },
  });

  return { instance, allowedExtensions, maxFileSize };
};

module.exports = {
  MB,
  UploadError,
  LimitedMemoryStorage,
  formatSize,
  describeExtensions,
  resolveAllowedExtensions,
  createFileFilter,
  createMulter,
};
