const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const upload = require("../middlewares/upload.middleware");

// POST /api/v1/users/import - Bulk import users from Excel
router.post("/import", upload.single("file"), userController.importUsers);

// GET /api/v1/users - List users with filters
router.get("/", userController.listUsers);

module.exports = router;
