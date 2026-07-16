const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const authMiddleware = require("../middlewares/auth.middleware");

// POST /api/v1/auth/login
router.post("/login", authController.login);

// POST /api/v1/auth/logout
router.post("/logout", authController.logout);

// POST /api/v1/auth/refresh
router.post("/refresh", authController.refresh);

// POST /api/v1/auth/activate
router.post("/activate", authController.activate);

// GET /api/v1/auth/me
router.get("/me", authMiddleware, authController.getMe);

module.exports = router;
