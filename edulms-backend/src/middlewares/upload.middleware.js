const multer = require("multer");
const ApiError = require("../utils/ApiError");

// Store files in memory
const storage = multer.memoryStorage();

// File filter to check for Excel mime types or extensions
const fileFilter = (req, file, cb) => {
  const allowedExtensions = [".xls", ".xlsx"];
  const allowedMimeTypes = [
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];

  const originalNameLower = file.originalname.toLowerCase();
  const hasExcelExtension = allowedExtensions.some((ext) =>
    originalNameLower.endsWith(ext)
  );

  if (allowedMimeTypes.includes(file.mimetype) || hasExcelExtension) {
    cb(null, true);
  } else {
    cb(new ApiError(400, "Chỉ chấp nhận các tệp tin Excel (.xls, .xlsx)"), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

module.exports = upload;
