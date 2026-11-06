const path = require("path");
const {
  uploadFileToCloudinary,
  isCloudinaryConfigured,
} = require("../config/cloudinary");
const { errorResponse } = require("../utils/apiResponse");

/**
 * Controller xử lý upload tập tin (tài liệu, bảng tính, trình chiếu, nén, hình ảnh, video)
 * lên Cloudinary.
 *
 * @route POST /api/v1/upload (hoặc /api/v1/upload/single)
 * @access Private (yêu cầu JWT qua protect middleware)
 */
const uploadSingleFile = async (req, res, next) => {
  try {
    // 1. Kiểm tra file đã qua Multer & validator magic bytes chưa
    if (!req.file || !req.file.buffer) {
      return errorResponse(
        res,
        "Vui lòng chọn tập tin để upload (field 'file')",
        400
      );
    }

    // 2. Kiểm tra cấu hình Cloudinary phía server
    if (!isCloudinaryConfigured()) {
      return errorResponse(
        res,
        "Dịch vụ lưu trữ Cloudinary chưa được cấu hình trên hệ thống",
        500
      );
    }

    // 3. Upload file stream từ RAM (buffer) lên Cloudinary
    // Cloudinary config đã tự động chọn folder, resource_type và format dựa trên extension & magic bytes
    const uploadResult = await uploadFileToCloudinary(req.file);

    // Xác định fileName an toàn từ publicId hoặc originalName
    const parsedPublicId = path.basename(uploadResult.publicId);
    const fileName =
      uploadResult.resourceType === "raw"
        ? parsedPublicId
        : `${parsedPublicId}.${uploadResult.format || req.file.extension.replace(".", "")}`;

    // 4. Trả về đúng định dạng response yêu cầu
    return res.status(200).json({
      success: true,
      message: "Tải lên tập tin thành công",
      originalName: req.file.originalname,
      fileName,
      fileType: uploadResult.category, // document, spreadsheet, presentation, archive, image, video
      fileSize: req.file.size || uploadResult.bytes,
      url: uploadResult.url,
      publicId: uploadResult.publicId,
      resourceType: uploadResult.resourceType, // raw, image, video
      format: uploadResult.format,
    });
  } catch (error) {
    // Nếu là lỗi nghiệp vụ upload (UploadError có statusCode) hoặc lỗi từ Cloudinary
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

module.exports = {
  uploadSingleFile,
};
