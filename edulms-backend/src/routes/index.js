const express = require("express");
const { getHealth } = require("../controllers/health.controller");
const { importUsers } = require("../controllers/import.controller");
const { protect, authorize } = require("../middlewares");
const upload = require("../config/upload");

const router = express.Router();

router.get("/health", getHealth);

// Admin - Import Excel hàng loạt
router.post(
  "/admin/import/:role",
  protect,
  authorize("admin"),
  upload.single("file"),
  importUsers
);

module.exports = router;

