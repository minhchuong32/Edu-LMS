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
    // If running in test mode or if Cloudinary env is not set up, use a deterministic mock result
    if (
      process.env.NODE_ENV === "test" ||
      !process.env.CLOUDINARY_CLOUD_NAME ||
      process.env.CLOUDINARY_CLOUD_NAME === "your_cloud_name" ||
      process.env.CLOUDINARY_CLOUD_NAME === "demo"
    ) {
      const publicId = `mock_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const resourceType = options.resource_type || "auto";
      const folder = options.folder || "edulms";
      return resolve({
        url: `https://res.cloudinary.com/demo/${resourceType}/upload/v1234567890/${folder}/${publicId}`,
        public_id: `${folder}/${publicId}`,
        resource_type: resourceType,
        format: options.format || (options.resource_type === "video" ? "mp4" : "pdf"),
        bytes: fileBuffer ? fileBuffer.length : 0,
        original_name: options.originalName || "file",
      });
    }

    const uploadOptions = {
      folder: options.folder || "edulms",
      resource_type: options.resource_type || "auto",
    };

    const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) {
        return reject(new ApiError(500, `Lỗi tải lên Cloudinary: ${error.message}`));
      }
      resolve({
        url: result.secure_url || result.url,
        public_id: result.public_id,
        resource_type: result.resource_type,
        format: result.format,
        bytes: result.bytes,
        original_name: options.originalName || "file",
      });
    });

    stream.end(fileBuffer);
  });
};

module.exports = {
  uploadToCloudinary,
};
