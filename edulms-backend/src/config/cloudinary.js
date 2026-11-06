const cloudinary = require("cloudinary").v2;
const { Readable } = require("stream");

// Cấu hình Cloudinary SDK từ biến môi trường
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Định nghĩa phân chia thư mục lưu trữ chuẩn cho hệ thống Edu-LMS
const CLOUDINARY_FOLDERS = {
  DOCUMENTS: "edulms/documents",
  VIDEOS: "edulms/videos",
};

/**
 * Kiểm tra kết nối tới dịch vụ Cloudinary
 * @returns {Promise<{ success: boolean, message: string, status?: string }>}
 */
const checkCloudinaryConnection = async () => {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
    process.env;

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
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
    return {
      success: false,
      message: `Kết nối Cloudinary thất bại: ${error.message}`,
      error,
    };
  }
};

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
    const uploadOptions = {
      folder: options.folder || CLOUDINARY_FOLDERS.DOCUMENTS,
      resource_type: options.resource_type || "auto",
      ...options,
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
  checkCloudinaryConnection,
  uploadStreamToCloudinary,
  deleteFromCloudinary,
};
