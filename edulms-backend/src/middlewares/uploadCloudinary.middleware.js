const multer = require("multer");
const ApiError = require("../utils/ApiError");

const MAX_PDF_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 30 * 1024 * 1024; // 30MB

const storage = multer.memoryStorage();

const allowedVideoExtensions = [".mp4", ".mov", ".avi", ".mkv", ".webm"];
const allowedDocExtensions = [
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt",
  ".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg",
  ".mp3", ".wav", ".m4a", ".ogg",
  ".zip", ".rar", ".7z"
];

const fileFilter = (req, file, cb) => {
  const originalNameLower = file.originalname.toLowerCase();
  const isPdfOrDoc =
    file.mimetype.startsWith("image/") ||
    file.mimetype.startsWith("audio/") ||
    file.mimetype === "application/pdf" ||
    allowedDocExtensions.some((ext) => originalNameLower.endsWith(ext));
  const isVideo =
    file.mimetype.startsWith("video/") ||
    allowedVideoExtensions.some((ext) => originalNameLower.endsWith(ext));

  if (isPdfOrDoc || isVideo) {
    cb(null, true);
  } else {
    cb(
      new ApiError(
        400,
        "Định dạng tệp không được hỗ trợ. Vui lòng chọn tệp PDF, Word/Excel/PPT, hình ảnh hoặc Video."
      ),
      false
    );
  }
};

const uploadMulter = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: MAX_VIDEO_SIZE, // Global max buffer limit
  },
});

// Middleware for PDF Document upload endpoint (PDF <= 10MB)
const handleDocumentUpload = (req, res, next) => {
  uploadMulter.single("file")(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return next(new ApiError(400, "Dung lượng tệp không được vượt quá 30MB."));
      }
      return next(err);
    }

    if (!req.file) {
      return next(new ApiError(400, "Vui lòng chọn tệp tin PDF để tải lên."));
    }

    const originalNameLower = req.file.originalname.toLowerCase();
    const isPdf = req.file.mimetype === "application/pdf" || originalNameLower.endsWith(".pdf");

    if (!isPdf) {
      return next(new ApiError(400, "Chỉ chấp nhận định dạng tệp PDF (.pdf)."));
    }

    if (req.file.size > MAX_PDF_SIZE) {
      return next(new ApiError(400, "Dung lượng tệp PDF không được vượt quá 10MB."));
    }

    next();
  });
};

// Middleware for Video upload endpoint (Video <= 30MB)
const handleVideoUpload = (req, res, next) => {
  uploadMulter.single("file")(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return next(new ApiError(400, "Dung lượng tệp Video không được vượt quá 30MB."));
      }
      return next(err);
    }

    if (!req.file) {
      return next(new ApiError(400, "Vui lòng chọn tệp tin Video để tải lên."));
    }

    const originalNameLower = req.file.originalname.toLowerCase();
    const isVideo =
      req.file.mimetype.startsWith("video/") ||
      allowedVideoExtensions.some((ext) => originalNameLower.endsWith(ext));

    if (!isVideo) {
      return next(
        new ApiError(
          400,
          "Chỉ chấp nhận định dạng tệp Video (.mp4, .mov, .avi, .mkv, .webm)."
        )
      );
    }

    if (req.file.size > MAX_VIDEO_SIZE) {
      return next(new ApiError(400, "Dung lượng tệp Video không được vượt quá 30MB."));
    }

    next();
  });
};

// General media upload middleware (PDF <= 10MB, Video <= 30MB)
const handleMediaUpload = (req, res, next) => {
  uploadMulter.single("file")(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return next(new ApiError(400, "Dung lượng tệp vượt quá giới hạn tối đa cho phép."));
      }
      return next(err);
    }

    if (!req.file) {
      return next(new ApiError(400, "Vui lòng chọn tệp tin để tải lên."));
    }

    const originalNameLower = req.file.originalname.toLowerCase();
    const isPdf = req.file.mimetype === "application/pdf" || originalNameLower.endsWith(".pdf");
    const isVideo =
      req.file.mimetype.startsWith("video/") ||
      allowedVideoExtensions.some((ext) => originalNameLower.endsWith(ext));

    if (isPdf && req.file.size > MAX_PDF_SIZE) {
      return next(new ApiError(400, "Dung lượng tệp PDF không được vượt quá 10MB."));
    }

    if (isVideo && req.file.size > MAX_VIDEO_SIZE) {
      return next(new ApiError(400, "Dung lượng tệp Video không được vượt quá 30MB."));
    }

    next();
  });
};

module.exports = {
  handleDocumentUpload,
  handleVideoUpload,
  handleMediaUpload,
};
