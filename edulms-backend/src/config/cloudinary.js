/**
 * Cấu hình Cloudinary cho Edu-LMS.
 *
 * - Thông tin xác thực chỉ lấy từ biến môi trường (không hardcode):
 *     CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 *   dotenv được nạp sẵn ở src/server.js (và scripts), không gọi lại ở đây.
 * - Phân loại file theo phần mở rộng + MIME type -> thư mục + resource_type.
 * - Upload qua stream từ Buffer (Multer memoryStorage), không ghi file tạm.
 */
const path = require("path");
const crypto = require("crypto");
const cloudinary = require("cloudinary").v2;
const { Readable } = require("stream");
const { FILE_TYPE_CATEGORIES } = require("./fileTypes");

// Cấu hình Cloudinary SDK từ biến môi trường
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // Luôn trả về URL https
});

// ===================== Thư mục & resource_type =====================

/** Thư mục lưu trữ chuẩn của hệ thống (giữ nguyên DOCUMENTS/VIDEOS để tương thích) */
const CLOUDINARY_FOLDERS = Object.freeze({
  DOCUMENTS: "edulms/documents",
  SPREADSHEETS: "edulms/spreadsheets",
  PRESENTATIONS: "edulms/presentations",
  ARCHIVES: "edulms/archives",
  IMAGES: "edulms/images",
  VIDEOS: "edulms/videos",
});

/** Các resource_type Cloudinary được sử dụng */
const RESOURCE_TYPES = Object.freeze({
  RAW: "raw", // Tài liệu, bảng tính, trình chiếu, file nén
  IMAGE: "image", // Hình ảnh
  VIDEO: "video", // Video
});

/** Thư mục + resource_type cho từng nhóm file */
const CATEGORY_STORAGE = Object.freeze({
  document: { folder: CLOUDINARY_FOLDERS.DOCUMENTS, resourceType: RESOURCE_TYPES.RAW },
  spreadsheet: { folder: CLOUDINARY_FOLDERS.SPREADSHEETS, resourceType: RESOURCE_TYPES.RAW },
  presentation: { folder: CLOUDINARY_FOLDERS.PRESENTATIONS, resourceType: RESOURCE_TYPES.RAW },
  archive: { folder: CLOUDINARY_FOLDERS.ARCHIVES, resourceType: RESOURCE_TYPES.RAW },
  image: { folder: CLOUDINARY_FOLDERS.IMAGES, resourceType: RESOURCE_TYPES.IMAGE },
  video: { folder: CLOUDINARY_FOLDERS.VIDEOS, resourceType: RESOURCE_TYPES.VIDEO },
});

/**
 * Nhóm file: thư mục + resource_type + danh sách extension -> MIME hợp lệ.
 * Danh sách extension/MIME lấy từ src/config/fileTypes.js (dùng chung với Multer)
 * để hai nơi không bị lệch nhau.
 */
const FILE_CATEGORIES = Object.freeze(
  Object.entries(FILE_TYPE_CATEGORIES).reduce((result, [category, config]) => {
    result[category] = {
      ...CATEGORY_STORAGE[category],
      extensions: Object.fromEntries(
        Object.entries(config.extensions).map(([ext, rule]) => [ext, rule.mimes]),
      ),
    };
    return result;
  }, {}),
);

/** Bảng tra nhanh: extension -> category */
const EXTENSION_TO_CATEGORY = Object.freeze(
  Object.entries(FILE_CATEGORIES).reduce((map, [category, config]) => {
    Object.keys(config.extensions).forEach((ext) => {
      map[ext] = category;
    });
    return map;
  }, {})
);

/** Danh sách extension được hỗ trợ (dùng cho thông báo lỗi / fileFilter) */
const SUPPORTED_EXTENSIONS = Object.freeze(Object.keys(EXTENSION_TO_CATEGORY));

/**
 * Xác định cấu hình lưu trữ cho một file.
 * @param {{ originalname: string, mimetype?: string }} file - req.file của Multer
 * @returns {{ category: string, folder: string, resourceType: string, extension: string } | null}
 *          null nếu extension không được hỗ trợ hoặc MIME không khớp extension.
 */
const getFileStorageConfig = (file) => {
  if (!file || !file.originalname) return null;

  const extension = path.extname(file.originalname).toLowerCase();
  const category = EXTENSION_TO_CATEGORY[extension];
  if (!category) return null;

  const config = FILE_CATEGORIES[category];
  const mimetype = String(file.mimetype || "").toLowerCase();
  if (mimetype && !config.extensions[extension].includes(mimetype)) {
    return null;
  }

  return {
    category,
    folder: config.folder,
    resourceType: config.resourceType,
    extension,
  };
};

/**
 * Tạo public_id an toàn, duy nhất từ tên file gốc.
 * - Loại bỏ dấu tiếng Việt, ký tự đặc biệt.
 * - Với resource_type "raw", Cloudinary không tự gắn đuôi file -> giữ extension
 *   trong public_id để khi tải về file vẫn mở được đúng định dạng.
 */
const buildPublicId = (originalname, resourceType) => {
  const extension = path.extname(originalname || "").toLowerCase();
  const baseName =
    path
      .basename(originalname || "file", extension)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .replace(/[^a-zA-Z0-9-_]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase()
      .slice(0, 80) || "file";

  const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  const publicId = `${baseName}-${uniqueSuffix}`;

  return resourceType === RESOURCE_TYPES.RAW
    ? `${publicId}${extension}`
    : publicId;
};

// ===================== Kết nối =====================

/** Kiểm tra đã khai báo đủ biến môi trường Cloudinary hay chưa */
const isCloudinaryConfigured = () => {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
    process.env;
  return Boolean(
    CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET
  );
};

/**
 * Kiểm tra kết nối tới dịch vụ Cloudinary
 * @returns {Promise<{ success: boolean, message: string, status?: string }>}
 */
const checkCloudinaryConnection = async () => {
  if (!isCloudinaryConfigured()) {
    return {
      success: false,
      message:
        "Thiếu biến môi trường Cloudinary (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)",
    };
  }

  try {
    const pingResult = await cloudinary.api.ping();
    return {
      success: true,
      message: "Kết nối Cloudinary thành công",
      status: pingResult.status,
    };
  } catch (error) {
    // Không trả về object error gốc để tránh lộ thông tin cấu hình
    const reason =
      (error && (error.message || (error.error && error.error.message))) ||
      "Không xác định";
    return {
      success: false,
      message: `Kết nối Cloudinary thất bại: ${reason}`,
    };
  }
};

// ===================== Upload / Delete =====================

/**
 * Tải tệp từ Buffer (Multer memoryStorage) lên Cloudinary qua luồng (Upload Stream)
 * @param {Buffer} fileBuffer - Buffer dữ liệu tệp từ Multer
 * @param {object} options - Các tùy chọn bổ sung cho Cloudinary
 * @param {string} options.folder - Thư mục lưu trữ (mặc định: edulms/documents)
 * @param {string} options.resource_type - 'auto' | 'image' | 'video' | 'raw'
 * @param {string} [options.public_id] - Định danh tệp tùy chọn
 * @returns {Promise<object>} Kết quả phản hồi từ Cloudinary
 */
const uploadStreamToCloudinary = (fileBuffer, options = {}) => {
  return new Promise((resolve, reject) => {
    if (!Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) {
      return reject(new Error("Dữ liệu tệp tin không hợp lệ hoặc rỗng!"));
    }

    const uploadOptions = {
      ...options,
      folder: options.folder || CLOUDINARY_FOLDERS.DOCUMENTS,
      resource_type: options.resource_type || "auto",
    };

    const stream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve(result);
      }
    );

    Readable.from(fileBuffer).pipe(stream);
  });
};

/**
 * Upload file Multer lên Cloudinary, tự động chọn thư mục và resource_type.
 * @param {{ buffer: Buffer, originalname: string, mimetype?: string }} file - req.file
 * @param {object} [extraOptions] - tùy chọn Cloudinary bổ sung (tags, context...)
 * @returns {Promise<{ url: string, publicId: string, resourceType: string, folder: string,
 *                     category: string, format?: string, bytes: number, originalName: string }>}
 */
const uploadFileToCloudinary = async (file, extraOptions = {}) => {
  const storageConfig = getFileStorageConfig(file);
  if (!storageConfig) {
    const error = new Error(
      `Định dạng tập tin không được hỗ trợ. Chỉ chấp nhận: ${SUPPORTED_EXTENSIONS.join(", ")}`
    );
    error.statusCode = 415;
    throw error;
  }

  const result = await uploadStreamToCloudinary(file.buffer, {
    ...extraOptions,
    folder: storageConfig.folder,
    resource_type: storageConfig.resourceType,
    public_id: buildPublicId(file.originalname, storageConfig.resourceType),
    overwrite: false,
  });

  // Chỉ trả về thông tin cần thiết, không trả nguyên response Cloudinary
  return {
    url: result.secure_url,
    publicId: result.public_id,
    resourceType: result.resource_type || storageConfig.resourceType,
    folder: storageConfig.folder,
    category: storageConfig.category,
    format: result.format || storageConfig.extension.slice(1),
    bytes: result.bytes,
    originalName: file.originalname,
  };
};

/**
 * Xóa tài nguyên trên Cloudinary theo public_id
 * @param {string} publicId - ID định danh của tệp trên Cloudinary
 * @param {string} [resourceType='image'] - 'image' | 'video' | 'raw'
 * @returns {Promise<object>}
 */
const deleteFromCloudinary = async (publicId, resourceType = "image") => {
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
};

module.exports = {
  cloudinary,
  CLOUDINARY_FOLDERS,
  RESOURCE_TYPES,
  FILE_CATEGORIES,
  SUPPORTED_EXTENSIONS,
  getFileStorageConfig,
  buildPublicId,
  isCloudinaryConfigured,
  checkCloudinaryConnection,
  uploadStreamToCloudinary,
  uploadFileToCloudinary,
  deleteFromCloudinary,
};
