const express = require("express");
const {
  verifyActivation,
  activate,
  login,
  refresh,
  logout,
  getMe,
} = require("../controllers/auth.controller");
const { protect } = require("../middlewares");

const router = express.Router();

// Xác thực thông tin trước kích hoạt (Bước 1)
router.post("/verify-activation", verifyActivation);

// Kích hoạt tài khoản (Bước 2 hoàn tất)
router.post("/activate", activate);

// Đăng nhập
router.post("/login", login);

// Làm mới Access Token và xoay vòng Refresh Token (hỗ trợ cả /refresh và /refresh-token)
router.post("/refresh", refresh);
router.post("/refresh-token", refresh);

// Đăng xuất
router.post("/logout", logout);

// Thông tin tài khoản hiện tại
router.get("/me", protect, getMe);

module.exports = router;
