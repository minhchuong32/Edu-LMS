const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const upload = require("../middlewares/upload.middleware");

const { authMiddleware, restrictTo } = require("../middlewares");

// POST /api/v1/users/import - Bulk import users from Excel
router.post("/import", upload.single("file"), userController.importUsers);

// GET /api/v1/users - List users with filters
router.get("/", userController.listUsers);

// PUT /api/v1/users/:id/class - Update student's class
router.put("/:id/class", authMiddleware, restrictTo("admin"), userController.updateUserClass);

module.exports = router;
