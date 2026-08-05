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
    const resourceType = "auto";

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

const https = require("https");
const http = require("http");
const path = require("path");

const downloadOrViewFile = async (req, res, next) => {
  try {
    const fileUrl = req.query.url;
    const mode = req.query.mode || "view";

    if (!fileUrl) {
      return res.status(400).json({ success: false, message: "URL tệp không hợp lệ." });
    }

    const cleanUrl = fileUrl.split("?")[0];
    const originalFilename = path.basename(cleanUrl);
    const ext = path.extname(originalFilename).toLowerCase();

    const mimeTypes = {
      ".pdf": "application/pdf",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".webp": "image/webp",
      ".gif": "image/gif",
      ".svg": "image/svg+xml",
      ".mp4": "video/mp4",
      ".mov": "video/quicktime",
      ".webm": "video/webm",
      ".mp3": "audio/mpeg",
      ".wav": "audio/wav",
      ".doc": "application/msword",
      ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".xls": "application/vnd.ms-excel",
      ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ".ppt": "application/vnd.ms-powerpoint",
      ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ".txt": "text/plain; charset=utf-8",
      ".zip": "application/zip",
      ".rar": "application/x-rar-compressed",
    };

    const contentType = mimeTypes[ext] || "application/octet-stream";

    const streamFile = (url, redirectCount = 0) => {
      if (redirectCount > 5) {
        return res.status(508).json({ success: false, message: "Quá nhiều lần chuyển hướng." });
      }

      const fetchProtocol = url.startsWith("https") ? https : http;

      fetchProtocol.get(url, (cloudinaryRes) => {
        // Xử lý redirect
        if (cloudinaryRes.statusCode >= 300 && cloudinaryRes.statusCode < 400 && cloudinaryRes.headers.location) {
          cloudinaryRes.resume(); // xả buffer, tránh leak
          return streamFile(cloudinaryRes.headers.location, redirectCount + 1);
        }

        // Chặn lỗi từ Cloudinary, không pipe error page giả làm file
        if (cloudinaryRes.statusCode >= 400) {
          cloudinaryRes.resume();
          console.error(`Cloudinary trả lỗi ${cloudinaryRes.statusCode} cho URL: ${url}`);
          return res.status(cloudinaryRes.statusCode === 401 ? 502 : cloudinaryRes.statusCode).json({
            success: false,
            message:
              cloudinaryRes.statusCode === 401
                ? "Không thể truy cập tệp. Vui lòng kiểm tra cài đặt Security > 'Allow delivery of PDF and ZIP files' trên Cloudinary."
                : "Không thể tải tệp từ máy chủ lưu trữ.",
          });
        }

        const dispositionType = mode === "download" ? "attachment" : "inline";
        // Ưu tiên content-type thật từ Cloudinary nếu có
        res.setHeader("Content-Type", cloudinaryRes.headers["content-type"] || contentType);
        if (cloudinaryRes.headers["content-length"]) {
          res.setHeader("Content-Length", cloudinaryRes.headers["content-length"]);
        }
        res.setHeader(
          "Content-Disposition",
          `${dispositionType}; filename="${encodeURIComponent(originalFilename)}"`
        );

        cloudinaryRes.pipe(res);
      }).on("error", (err) => {
        console.error("Lỗi proxy file:", err);
        if (!res.headersSent) {
          res.status(502).json({ success: false, message: "Lỗi kết nối tới máy chủ lưu trữ." });
        }
      });
    };

    streamFile(fileUrl);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadDocument,
  uploadVideo,
  uploadMedia,
  downloadOrViewFile,
};

