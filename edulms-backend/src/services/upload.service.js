const path = require("path");
const cloudinary = require("../config/cloudinary");
const ApiError = require("../utils/ApiError");

/**
 * Upload a file buffer to Cloudinary using upload_stream
 * @param {Buffer} fileBuffer - Memory buffer of the uploaded file
 * @param {Object} options - Options including folder, resource_type, originalName
 * @returns {Promise<Object>} Upload result details
 */
const uploadToCloudinary = (fileBuffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const originalName = options.originalName || "file";
    const ext = path.extname(originalName).toLowerCase();
    const extWithoutDot = ext.replace(".", "");
    const baseName = path.basename(originalName, ext)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .substring(0, 50);
    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Categorize Cloudinary resource_type
    const isImage = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"].includes(ext);
    const isVideo = [".mp4", ".mov", ".avi", ".mkv", ".webm", ".mp3", ".wav"].includes(ext);

    let resourceType = options.resource_type;
    if (!resourceType || resourceType === "auto" || resourceType === "image") {
      if (isVideo) {
        resourceType = "video";
      } else if (isImage) {
        resourceType = "image";
      } else {
        resourceType = "raw"; // PDFs, Word, Excel, PowerPoint, Zip, etc.
      }
    }

    // For raw files (PDF, docx, xlsx, etc.), public_id must include extension so URL ends with .pdf
    // For image/video, Cloudinary automatically appends extension to URL, so public_id omits extension.
    let publicId;
    if (resourceType === "raw") {
      publicId = ext ? `${baseName}_${uniqueSuffix}${ext}` : `${baseName}_${uniqueSuffix}`;
    } else {
      publicId = `${baseName}_${uniqueSuffix}`;
    }

    // If running in test mode or if Cloudinary env is not set up, use a deterministic mock result
    if (
      process.env.NODE_ENV === "test" ||
      !process.env.CLOUDINARY_CLOUD_NAME ||
      process.env.CLOUDINARY_CLOUD_NAME === "your_cloud_name" ||
      process.env.CLOUDINARY_CLOUD_NAME === "demo"
    ) {
      const folder = options.folder || "edulms";
      return resolve({
        url: `https://res.cloudinary.com/demo/${resourceType}/upload/v1234567890/${folder}/${publicId}`,
        public_id: `${folder}/${publicId}`,
        resource_type: resourceType,
        format: extWithoutDot || (isVideo ? "mp4" : "pdf"),
        bytes: fileBuffer ? fileBuffer.length : 0,
        original_name: originalName,
      });
    }

    const uploadOptions = {
      folder: options.folder || "edulms",
      resource_type: resourceType,
      type: "upload", // Ensure public access without 401 Unauthorized
      public_id: publicId,
    };

    const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) {
        return reject(new ApiError(500, `Lỗi tải lên Cloudinary: ${error.message}`));
      }
      resolve({
        url: result.secure_url || result.url,
        public_id: result.public_id,
        resource_type: result.resource_type,
        format: result.format || extWithoutDot,
        bytes: result.bytes,
        original_name: originalName,
      });
    });

    stream.end(fileBuffer);
  });
};

module.exports = {
  uploadToCloudinary,
};


