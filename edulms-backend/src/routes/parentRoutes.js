const express = require("express");
const router = express.Router();
const parentController = require("../controllers/parent.controller");
const { authMiddleware, restrictTo } = require("../middlewares");

// GET /api/v1/parents/me/children
router.get("/me/children", authMiddleware, restrictTo("parent", "admin"), parentController.getMyChildren);

module.exports = router;
