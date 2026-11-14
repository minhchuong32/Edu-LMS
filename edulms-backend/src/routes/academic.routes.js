const express = require("express");
const { protect, authorize } = require("../middlewares");

const gradeController = require("../controllers/grade.controller");
const subjectController = require("../controllers/subject.controller");
const classController = require("../controllers/class.controller");
const assignmentController = require("../controllers/assignment.controller");
const studentAssignmentController = require("../controllers/studentAssignment.controller");
const timetableRoutes = require("./timetable.routes");

const router = express.Router();

// Tất cả các route học vụ đều yêu cầu đăng nhập
router.use(protect);

// Danh sách giáo viên hỗ trợ phân công
router.get("/teachers", authorize("admin"), assignmentController.getTeachersList);

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

/* ==========================================
   4. PHÂN CÔNG GIẢNG DẠY (TEACHING ASSIGNMENTS)
========================================== */
router.get("/assignments", assignmentController.getAssignments);
router.get("/assignments/teacher/:teacherId", assignmentController.getTeacherSchedule);
router.post("/assignments/check-conflict", authorize("admin"), assignmentController.checkConflict);
router.get("/assignments/:id", assignmentController.getAssignmentById);
router.post("/assignments", authorize("admin"), assignmentController.createAssignment);
router.put("/assignments/:id", authorize("admin"), assignmentController.updateAssignment);
router.delete("/assignments/:id", authorize("admin"), assignmentController.deleteAssignment);

/* ==========================================
   5. XẾP LỚP & CHUYỂN LỚP HỌC SINH (STUDENT ASSIGNMENTS)
========================================== */
router.get("/students/unassigned", authorize("admin"), studentAssignmentController.getUnassignedStudents);
router.get("/class-history", authorize("admin"), studentAssignmentController.getClassHistory);
router.get("/classes/:id/students", studentAssignmentController.getStudentsByClass);
router.post("/classes/:id/students", authorize("admin"), studentAssignmentController.addStudentsToClass);
router.delete("/classes/:id/students/:studentId", authorize("admin"), studentAssignmentController.removeStudentFromClass);
router.post("/classes/transfer-student", authorize("admin"), studentAssignmentController.transferStudent);
router.get("/classes/:id/history", authorize("admin"), studentAssignmentController.getClassHistoryByClassId);

/* ==========================================
   6. QUẢN LÝ THỜI KHÓA BIỂU (TIMETABLES)
========================================== */
router.use("/timetables", timetableRoutes);

module.exports = router;
