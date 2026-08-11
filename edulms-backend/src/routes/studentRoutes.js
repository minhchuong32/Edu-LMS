const express = require("express");
const router = express.Router();
const studentController = require("../controllers/student.controller");
const { authMiddleware, restrictTo } = require("../middlewares");

// GET /api/v1/students/:studentId/parents
router.get("/:studentId/parents", authMiddleware, studentController.getStudentParents);

// POST /api/v1/students/:studentId/parents - Admin/Teacher link parent to student
router.post(
  "/:studentId/parents",
  authMiddleware,
  restrictTo("admin", "teacher"),
  studentController.addStudentParent
);

// DELETE /api/v1/students/:studentId/parents/:parentId - Admin/Teacher unlink parent from student
router.delete(
  "/:studentId/parents/:parentId",
  authMiddleware,
  restrictTo("admin", "teacher"),
  studentController.removeStudentParent
);

module.exports = router;
