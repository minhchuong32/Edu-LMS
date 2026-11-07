/**
 * Danh mục định dạng file được phép upload trong Edu-LMS (nguồn dữ liệu duy nhất).
 *
 * Mỗi nhóm (category) gồm:
 *  - label:   tên hiển thị trong thông báo lỗi
 *  - maxSize: dung lượng tối đa (byte)
 *  - extensions: phần mở rộng -> {
 *        mimes:   MIME type hợp lệ do client gửi lên (header Content-Type của part)
 *        formats: định dạng nội dung thật được chấp nhận (kết quả nhận diện magic bytes,
 *                 xem src/utils/fileSignature.js)
 *    }
 *
 * Được dùng bởi:
 *  - src/config/uploadMedia.js       (Multer: fileFilter + giới hạn dung lượng)
 *  - src/middlewares/upload.middleware.js (kiểm tra nội dung file)
 *  - src/config/cloudinary.js        (phân loại thư mục + resource_type)
 */

const MB = 1024 * 1024;

const FILE_TYPE_CATEGORIES = Object.freeze({
  document: {
    label: "tài liệu (PDF, DOC, DOCX, TXT, RTF)",
    maxSize: 10 * MB,
    extensions: {
      ".pdf": { mimes: ["application/pdf"], formats: ["pdf"] },
      ".doc": { mimes: ["application/msword"], formats: ["doc"] },
      ".docx": {
        mimes: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
        formats: ["docx"],
      },
      ".txt": { mimes: ["text/plain"], formats: ["text"] },
      ".rtf": { mimes: ["application/rtf", "text/rtf"], formats: ["rtf"] },
    },
  },
  spreadsheet: {
    label: "bảng tính (XLS, XLSX, CSV)",
    maxSize: 10 * MB,
    extensions: {
      ".xls": { mimes: ["application/vnd.ms-excel"], formats: ["xls"] },
      ".xlsx": {
        mimes: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
        formats: ["xlsx"],
      },
      // Windows (có cài Excel) thường gửi CSV dưới dạng application/vnd.ms-excel
      ".csv": {
        mimes: ["text/csv", "application/csv", "application/vnd.ms-excel", "text/plain"],
        formats: ["text"],
      },
    },
  },
  presentation: {
    label: "trình chiếu (PPT, PPTX)",
    maxSize: 10 * MB,
    extensions: {
      ".ppt": { mimes: ["application/vnd.ms-powerpoint"], formats: ["ppt"] },
      ".pptx": {
        mimes: ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
        formats: ["pptx"],
      },
    },
  },
  archive: {
    label: "file nén (ZIP, RAR, 7Z)",
    maxSize: 20 * MB,
    extensions: {
      // Trình duyệt thường không nhận diện được RAR/7Z -> application/octet-stream.
      // An toàn vì nội dung thật vẫn được kiểm tra bằng magic bytes.
      ".zip": {
        mimes: ["application/zip", "application/x-zip-compressed", "application/octet-stream"],
        // DOCX/XLSX/PPTX bản chất là ZIP hợp lệ
        formats: ["zip", "docx", "xlsx", "pptx"],
      },
      ".rar": {
        mimes: [
          "application/vnd.rar",
          "application/x-rar-compressed",
          "application/x-rar",
          "application/octet-stream",
        ],
        formats: ["rar"],
      },
      ".7z": {
        mimes: ["application/x-7z-compressed", "application/octet-stream"],
        formats: ["7z"],
      },
    },
  },
  image: {
    label: "hình ảnh (JPG, JPEG, PNG, WEBP)",
    maxSize: 5 * MB,
    extensions: {
      ".jpg": { mimes: ["image/jpeg"], formats: ["jpeg"] },
      ".jpeg": { mimes: ["image/jpeg"], formats: ["jpeg"] },
      ".png": { mimes: ["image/png"], formats: ["png"] },
      ".webp": { mimes: ["image/webp"], formats: ["webp"] },
    },
  },
  video: {
    label: "video (MP4, MOV, WEBM)",
    maxSize: 30 * MB,
    extensions: {
      // MP4 và MOV cùng họ ISO Base Media, trình duyệt/Cloudinary xử lý được cả hai
      ".mp4": { mimes: ["video/mp4"], formats: ["mp4", "mov"] },
      ".mov": { mimes: ["video/quicktime"], formats: ["mov", "mp4"] },
      ".webm": { mimes: ["video/webm"], formats: ["webm"] },
    },
  },
});

/** Bảng tra: extension -> { category, mimes, formats, maxSize, label } */
const EXTENSION_RULES = Object.freeze(
  Object.entries(FILE_TYPE_CATEGORIES).reduce((map, [category, config]) => {
    Object.entries(config.extensions).forEach(([ext, rule]) => {
      map[ext] = Object.freeze({
        category,
        mimes: rule.mimes,
        formats: rule.formats,
        maxSize: config.maxSize,
        label: config.label,
      });
    });
    return map;
  }, {}),
);

const ALL_CATEGORIES = Object.freeze(Object.keys(FILE_TYPE_CATEGORIES));
const ALL_EXTENSIONS = Object.freeze(Object.keys(EXTENSION_RULES));

module.exports = {
  MB,
  FILE_TYPE_CATEGORIES,
  EXTENSION_RULES,
  ALL_CATEGORIES,
  ALL_EXTENSIONS,
};

