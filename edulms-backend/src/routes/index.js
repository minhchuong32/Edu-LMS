const express = require("express");
const { getHealth } = require("../controllers/health.controller");
const { importUsers, downloadTemplate } = require("../controllers/import.controller");
const authRoutes = require("./auth.routes");
const { protect, authorize } = require("../middlewares");
const upload = require("../config/upload");

const router = express.Router();

router.get("/health", getHealth);

// Xác thực & Kích hoạt tài khoản
router.use("/auth", authRoutes);

// Admin - Tải file Excel mẫu (.xlsx)
router.get(
  "/admin/import/template/:role",
  protect,
  authorize("admin"),
  downloadTemplate
);

// Admin - Import Excel hàng loạt
router.post(
  "/admin/import/:role",
  protect,
  authorize("admin"),
  upload.single("file"),
  importUsers
);

module.exports = router;

