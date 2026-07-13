const express = require("express");
const router = express.Router();

// POST /api/v1/auth/login
router.post("/login", async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      message: "Login successful (stub)",
      token: "jwt-token-stub",
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/auth/activate
router.post("/activate", async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      message: "Account activated successfully (stub)",
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/auth/refresh
router.post("/refresh", async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      token: "new-jwt-token-stub",
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/auth/logout
router.post("/logout", async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      message: "Logout successful (stub)",
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
