const express = require("express");
const {
  protect,
  uploadFile,
  uploadDocument,
  uploadVideo,
  uploadImage,
} = require("../middlewares");
const { uploadSingleFile } = require("../controllers/upload.controller");

const router = express.Router();

/**
 * Tất cả các route upload đều yêu cầu người dùng phải đăng nhập bằng JWT.
 * Token JWT được gửi qua Authorization: Bearer <token> hoặc cookie.
 */
router.use(protect);

/**
 * [POST] /api/v1/upload
 * Endpoint upload chính: Tự động phát hiện và hỗ trợ tất cả các định dạng:
 * - Tài liệu: PDF, DOC, DOCX, TXT, RTF (tối đa 10MB)
 * - Bảng tính: XLS, XLSX, CSV (tối đa 10MB)
 * - Trình chiếu: PPT, PPTX (tối đa 10MB)
 * - File nén: ZIP, RAR, 7Z (tối đa 20MB)
 * - Hình ảnh: JPG, JPEG, PNG, WEBP (tối đa 5MB)
 * - Video: MP4, MOV, WEBM (tối đa 30MB)
 */
router.post("/", uploadFile, uploadSingleFile);

/**
 * Các endpoint tiện ích chuyên dụng (tùy chọn) khi client muốn ràng buộc chặt theo loại file:
 */
router.post("/document", uploadDocument, uploadSingleFile);
router.post("/video", uploadVideo, uploadSingleFile);
router.post("/image", uploadImage, uploadSingleFile);

module.exports = router;
