const uploadService = require("../services/upload.service");
const ApiResponse = require("../utils/ApiResponse");

const uploadDocument = async (req, res, next) => {
  try {
    const result = await uploadService.uploadToCloudinary(req.file.buffer, {
      folder: "edulms/documents",
      resource_type: "raw",
      originalName: req.file.originalname,
      format: "pdf",
    });

    res
      .status(200)
      .json(new ApiResponse(200, result, "Tải lên tài liệu PDF thành công."));
  } catch (error) {
    next(error);
  }
};

const uploadVideo = async (req, res, next) => {
  try {
    const result = await uploadService.uploadToCloudinary(req.file.buffer, {
      folder: "edulms/videos",
      resource_type: "video",
      originalName: req.file.originalname,
    });

    res
      .status(200)
      .json(new ApiResponse(200, result, "Tải lên video thành công."));
  } catch (error) {
    next(error);
  }
};

const uploadMedia = async (req, res, next) => {
  try {
    const originalNameLower = req.file.originalname.toLowerCase();
    const isVideo =
      req.file.mimetype.startsWith("video/") ||
      [".mp4", ".mov", ".avi", ".mkv", ".webm"].some((ext) => originalNameLower.endsWith(ext));

    const folder = isVideo ? "edulms/videos" : "edulms/documents";
    const resourceType = isVideo ? "video" : "raw";

    const result = await uploadService.uploadToCloudinary(req.file.buffer, {
      folder: folder,
      resource_type: resourceType,
      originalName: req.file.originalname,
    });

    res
      .status(200)
      .json(new ApiResponse(200, result, "Tải lên tệp tin thành công."));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadDocument,
  uploadVideo,
  uploadMedia,
};
