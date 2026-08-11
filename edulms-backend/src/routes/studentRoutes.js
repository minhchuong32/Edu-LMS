const express = require("express");
const router = express.Router();
const studentController = require("../controllers/student.controller");
const { authMiddleware } = require("../middlewares");

// GET /api/v1/students/:studentId/parents
router.get("/:studentId/parents", authMiddleware, studentController.getStudentParents);

module.exports = router;
