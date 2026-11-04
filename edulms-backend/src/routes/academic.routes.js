const express = require("express");
const { protect, authorize } = require("../middlewares");

const gradeController = require("../controllers/grade.controller");
const subjectController = require("../controllers/subject.controller");
const classController = require("../controllers/class.controller");

const router = express.Router();

// Tất cả các route học vụ đều yêu cầu đăng nhập
router.use(protect);

/* ==========================================
   1. QUẢN LÝ KHỐI HỌC (GRADES 10, 11, 12)
========================================== */
router.get("/grades", gradeController.getGrades);
router.get("/grades/:id", gradeController.getGradeById);
router.post("/grades", authorize("admin"), gradeController.createGrade);
router.put("/grades/:id", authorize("admin"), gradeController.updateGrade);
router.delete("/grades/:id", authorize("admin"), gradeController.deleteGrade);

/* ==========================================
   2. QUẢN LÝ MÔN HỌC (SUBJECTS)
========================================== */
router.get("/subjects", subjectController.getSubjects);
router.get("/subjects/:id", subjectController.getSubjectById);
router.post("/subjects", authorize("admin"), subjectController.createSubject);
router.put("/subjects/:id", authorize("admin"), subjectController.updateSubject);
router.delete("/subjects/:id", authorize("admin"), subjectController.deleteSubject);

/* ==========================================
   3. QUẢN LÝ LỚP HỌC (CLASSES)
========================================== */
router.get("/classes", classController.getClasses);
router.get("/classes/:id", classController.getClassById);
router.post("/classes", authorize("admin"), classController.createClass);
router.put("/classes/:id", authorize("admin"), classController.updateClass);
router.patch("/classes/:id/homeroom", authorize("admin"), classController.assignHomeroomTeacher);
router.delete("/classes/:id", authorize("admin"), classController.deleteClass);

module.exports = router;
