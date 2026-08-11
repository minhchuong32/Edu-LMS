const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const upload = require("../middlewares/upload.middleware");

const { authMiddleware, restrictTo } = require("../middlewares");

// POST /api/v1/users/import - Bulk import users from Excel
router.post("/import", authMiddleware, restrictTo("admin"), upload.single("file"), userController.importUsers);

// GET /api/v1/users - List users with filters
router.get("/", authMiddleware, userController.listUsers);

// Admin-only user management endpoints
router.post("/", authMiddleware, restrictTo("admin"), userController.createUser);
router.get("/:id", authMiddleware, restrictTo("admin"), userController.getUserById);
router.put("/:id", authMiddleware, restrictTo("admin"), userController.updateUser);
router.delete("/:id", authMiddleware, restrictTo("admin"), userController.deleteUser);

// PUT /api/v1/users/:id/class - Update student's class
router.put("/:id/class", authMiddleware, restrictTo("admin"), userController.updateUserClass);

module.exports = router;

