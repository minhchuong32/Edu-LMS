const express = require("express");
const router = express.Router();
const uploadController = require("../controllers/upload.controller");
const { authMiddleware } = require("../middlewares");
const {
  handleDocumentUpload,
  handleVideoUpload,
  handleMediaUpload,
} = require("../middlewares/uploadCloudinary.middleware");

// Public file view & download proxy route
router.get("/file", uploadController.downloadOrViewFile);

// Require authentication for upload operations
router.use(authMiddleware);

// Upload dedicated PDF document (<= 10MB)
router.post("/document", handleDocumentUpload, uploadController.uploadDocument);

// Upload dedicated Video file (<= 30MB)
router.post("/video", handleVideoUpload, uploadController.uploadVideo);

// Upload generic media file (PDF <= 10MB or Video <= 30MB)
router.post("/media", handleMediaUpload, uploadController.uploadMedia);

module.exports = router;
