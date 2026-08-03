const express = require("express");
const router = express.Router();
const academicController = require("../controllers/academic.controller");
const { authMiddleware, restrictTo } = require("../middlewares");

// Apply authentication middleware to all academic routes
router.use(authMiddleware);

// --- Grades Routes ---
router.route("/grades")
  .get(academicController.getGrades)
  .post(restrictTo("admin"), academicController.createGrade);

router.route("/grades/:id")
  .get(academicController.getGradeById)
  .put(restrictTo("admin"), academicController.updateGrade)
  .delete(restrictTo("admin"), academicController.deleteGrade);

// --- Classes Routes ---
router.post("/classes/transfer", restrictTo("admin"), academicController.transferClass);
router.post("/classes/batch-transfer", restrictTo("admin"), academicController.batchTransferClass);
router.get("/classes/transfer-history", restrictTo("admin", "teacher"), academicController.getTransferHistory);

router.route("/classes")
  .get(academicController.getClasses)
  .post(restrictTo("admin"), academicController.createClass);

router.route("/classes/:id")
  .get(academicController.getClassById)
  .put(restrictTo("admin"), academicController.updateClass)
  .delete(restrictTo("admin"), academicController.deleteClass);

// --- Subjects Routes ---
router.route("/subjects")
  .get(academicController.getSubjects)
  .post(restrictTo("admin"), academicController.createSubject);

router.route("/subjects/:id")
  .get(academicController.getSubjectById)
  .put(restrictTo("admin"), academicController.updateSubject)
  .delete(restrictTo("admin"), academicController.deleteSubject);

// --- Teaching Assignments Routes ---
router.route("/teaching-assignments")
  .get(academicController.getTeachingAssignments)
  .post(restrictTo("admin"), academicController.createTeachingAssignment);

router.route("/teaching-assignments/:id")
  .get(academicController.getTeachingAssignmentById)
  .put(restrictTo("admin"), academicController.updateTeachingAssignment)
  .delete(restrictTo("admin"), academicController.deleteTeachingAssignment);

// --- Stubs for Assignments & Submissions (preserved from existing stub routes) ---
router.post("/assignments", async (req, res, next) => {
  try {
    res.status(201).json({ success: true, message: "Assignment created (stub)" });
  } catch (error) {
    next(error);
  }
});

router.get("/assignments/:id", async (req, res, next) => {
  try {
    res.status(200).json({ success: true, assignment: {} });
  } catch (error) {
    next(error);
  }
});

router.post("/submissions", async (req, res, next) => {
  try {
    res.status(201).json({ success: true, message: "Submission uploaded (stub)" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
