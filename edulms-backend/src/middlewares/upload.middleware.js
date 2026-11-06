/**
 * Middleware upload nhiều định dạng file cho Edu-LMS.
 *
 * Luồng xử lý của mỗi middleware:
 *   1. Multer (RAM) parse multipart/form-data
 *      - fileFilter: phần mở rộng thuộc danh sách cho phép + MIME type khớp extension
 *      - LimitedMemoryStorage: giới hạn dung lượng riêng theo nhóm, cắt ngay khi vượt
 *   2. handleMulterError: chuyển mọi lỗi Multer -> UploadError (400/413/415)
 *   3. validateFileContent: kiểm tra chữ ký nội dung (magic bytes) để chống giả mạo
 *      (vd: file .exe đổi tên thành .pdf và gửi header application/pdf)
 *
 * Kết quả: req.file = {
 *   buffer, originalname, mimetype, size,
 *   category,        // document | spreadsheet | presentation | archive | image | video
 *   extension,       // ".pdf", ".docx", ...
 *   detectedFormat,  // định dạng thật: pdf | docx | zip | jpeg | mp4 | text ...
 * }
 * -> sẵn sàng gọi uploadFileToCloudinary(req.file).
 */
const path = require("path");
const { EXTENSION_RULES, FILE_TYPE_CATEGORIES } = require("../config/fileTypes");
const { UploadError, createMulter, formatSize, describeExtensions } = require("../config/uploadMedia");
const { detectFileFormat, detectPdf, detectVideo } = require("../utils/fileSignature");

// ===================== Kiểm tra nội dung file =====================

/**
 * Kiểm tra buffer có đúng định dạng khai báo (extension) hay không.
 * @param {{ buffer: Buffer, originalname: string, extension?: string }} file
 * @returns {string} định dạng thật phát hiện được
 * @throws {UploadError}
 */
const validateFileContent = (file) => {
  if (!file.buffer || file.buffer.length === 0) {
    throw new UploadError("Tập tin rỗng, vui lòng chọn tập tin khác!", 400, "EMPTY_FILE");
  }

  const ext = file.extension || path.extname(file.originalname || "").toLowerCase();
  const rule = EXTENSION_RULES[ext];
  if (!rule) {
    throw new UploadError(`Phần mở rộng '${ext}' không được hỗ trợ!`, 415, "INVALID_EXTENSION");
  }

  const detected = detectFileFormat(file.buffer);
  if (!detected) {
    throw new UploadError(
      `Nội dung tập tin không phải ${rule.label} hợp lệ hoặc đã bị giả mạo định dạng!`,
      415,
      "INVALID_FILE_CONTENT",
    );
  }

  if (!rule.formats.includes(detected)) {
    throw new UploadError(
      `Nội dung tập tin (${detected}) không khớp với phần mở rộng '${ext}'!`,
      415,
      "CONTENT_EXTENSION_MISMATCH",
    );
  }

  // Lưới an toàn: đảm bảo dung lượng không vượt giới hạn của nhóm
  if (file.buffer.length > rule.maxSize) {
    throw new UploadError(
      `Kích thước ${rule.label} vượt quá giới hạn tối đa cho phép (${formatSize(rule.maxSize)})!`,
      413,
      "FILE_TOO_LARGE",
    );
  }

  return detected;
};

// ===================== Xử lý lỗi Multer =====================

/**
 * Chuyển lỗi phát sinh khi Multer parse request thành UploadError
 * với status code và thông báo tiếng Việt phù hợp.
 * @param {Error} err
 * @param {{ fieldName: string, maxFileSize: number }} context
 */
const handleMulterError = (err, { fieldName = "file", maxFileSize } = {}) => {
  if (err instanceof UploadError) return err;

  if (err && err.name === "MulterError") {
    switch (err.code) {
      case "LIMIT_FILE_SIZE":
        return new UploadError(
          `Kích thước tập tin vượt quá giới hạn tối đa cho phép${maxFileSize ? ` (${formatSize(maxFileSize)})` : ""}!`,
          413,
          "FILE_TOO_LARGE",
        );
      case "LIMIT_FILE_COUNT":
        return new UploadError("Chỉ được upload 1 tập tin mỗi lần!", 400, "TOO_MANY_FILES");
      case "LIMIT_UNEXPECTED_FILE":
        return new UploadError(
          `Trường tập tin không hợp lệ ('${err.field}'). Vui lòng gửi file qua trường '${fieldName}'!`,
          400,
          "UNEXPECTED_FIELD",
        );
      case "LIMIT_FIELD_COUNT":
      case "LIMIT_FIELD_VALUE":
      case "LIMIT_FIELD_KEY":
      case "LIMIT_PART_COUNT":
        return new UploadError("Dữ liệu form gửi kèm vượt quá giới hạn cho phép!", 400, err.code);
      default:
        return new UploadError(`Lỗi upload tập tin: ${err.message}`, 400, err.code);
    }
  }

  // Lỗi khác (vd: multipart bị hỏng, client ngắt kết nối)
  return new UploadError(`Không thể xử lý tập tin upload: ${err.message}`, 400, "UPLOAD_FAILED");
};

/**
 * Express error-middleware (tùy chọn): định dạng lỗi upload thành JSON chuẩn.
 * Không bắt buộc mount vì global errorHandler đã đọc err.statusCode;
 * dùng khi muốn trả thêm trường `code` cho frontend.
 */
const uploadErrorHandler = (err, req, res, next) => {
  if (!(err instanceof UploadError) && !(err && err.name === "MulterError")) {
    return next(err);
  }
  const uploadError = handleMulterError(err);
  return res.status(uploadError.statusCode).json({
    success: false,
    message: uploadError.message,
    code: uploadError.code,
  });
};

// ===================== Factory middleware =====================

/**
 * Tạo middleware upload hoàn chỉnh: Multer + xử lý lỗi + kiểm tra magic bytes.
 * @param {object} [options]
 * @param {string[]} [options.categories] nhóm file được phép (mặc định: tất cả)
 * @param {string[]} [options.extensions] giới hạn thêm theo extension (vd: [".pdf"])
 * @param {string}   [options.fieldName="file"] tên field multipart chứa file
 * @param {boolean}  [options.required=true] bắt buộc phải có file hay không
 */
const createUploadMiddleware = ({ categories, extensions, fieldName = "file", required = true } = {}) => {
  const { instance, allowedExtensions, maxFileSize } = createMulter({ categories, extensions });
  const multerSingle = instance.single(fieldName);
  const allowedLabel = describeExtensions(allowedExtensions);

  const middleware = (req, res, next) => {
    multerSingle(req, res, (err) => {
      if (err) {
        return next(handleMulterError(err, { fieldName, maxFileSize }));
      }

      if (!req.file) {
        if (!required) return next();
        return next(
          new UploadError(
            `Vui lòng chọn tập tin để upload (trường '${fieldName}'). Định dạng hỗ trợ: ${allowedLabel}`,
            400,
            "FILE_REQUIRED",
          ),
        );
      }

      try {
        req.file.detectedFormat = validateFileContent(req.file);
        return next();
      } catch (validationError) {
        // Giải phóng buffer ngay khi file không hợp lệ
        req.file.buffer = null;
        req.file = undefined;
        return next(validationError);
      }
    });
  };

  // Thông tin cấu hình để tra cứu / hiển thị
  middleware.allowedExtensions = allowedExtensions;
  middleware.maxFileSize = maxFileSize;
  return middleware;
};

/** Upload 1 file thuộc bất kỳ nhóm nào được hỗ trợ (giới hạn theo nhóm) */
const uploadFile = createUploadMiddleware();

/** Tài liệu: PDF, DOC, DOCX, TXT, RTF (≤ 10MB) */
const uploadDocument = createUploadMiddleware({ categories: ["document"] });

/** Bảng tính: XLS, XLSX, CSV (≤ 10MB) */
const uploadSpreadsheet = createUploadMiddleware({ categories: ["spreadsheet"] });

/** Trình chiếu: PPT, PPTX (≤ 10MB) */
const uploadPresentation = createUploadMiddleware({ categories: ["presentation"] });

/** File nén: ZIP, RAR, 7Z (≤ 20MB) */
const uploadArchive = createUploadMiddleware({ categories: ["archive"] });

/** Hình ảnh: JPG, JPEG, PNG, WEBP (≤ 5MB) */
const uploadImage = createUploadMiddleware({ categories: ["image"] });

/** Video: MP4, MOV, WEBM (≤ 30MB) */
const uploadVideo = createUploadMiddleware({ categories: ["video"] });

/** Tài liệu học tập (tài liệu + bảng tính + trình chiếu), dùng cho bài giảng */
const uploadLessonMaterial = createUploadMiddleware({
  categories: ["document", "spreadsheet", "presentation"],
});

module.exports = {
  FILE_TYPE_CATEGORIES,
  uploadFile,
  uploadDocument,
  uploadSpreadsheet,
  uploadPresentation,
  uploadArchive,
  uploadImage,
  uploadVideo,
  uploadLessonMaterial,
  createUploadMiddleware,
  handleMulterError,
  uploadErrorHandler,
  validateFileContent,
  detectPdf,
  detectVideo,
};
