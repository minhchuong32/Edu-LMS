const academicService = require("../services/academic.service");
const ApiResponse = require("../utils/ApiResponse");

// --- Grades Controllers ---
const createGrade = async (req, res, next) => {
  try {
    const grade = await academicService.createGrade(req.body);
    res.status(201).json(new ApiResponse(201, grade, "Tạo khối học thành công."));
  } catch (error) {
    next(error);
  }
};

const getGrades = async (req, res, next) => {
  try {
    const grades = await academicService.getGrades();
    res.status(200).json(new ApiResponse(200, grades, "Lấy danh sách khối học thành công."));
  } catch (error) {
    next(error);
  }
};

const getGradeById = async (req, res, next) => {
  try {
    const grade = await academicService.getGradeById(req.params.id);
    res.status(200).json(new ApiResponse(200, grade, "Lấy thông tin khối học thành công."));
  } catch (error) {
    next(error);
  }
};

const updateGrade = async (req, res, next) => {
  try {
    const grade = await academicService.updateGrade(req.params.id, req.body);
    res.status(200).json(new ApiResponse(200, grade, "Cập nhật khối học thành công."));
  } catch (error) {
    next(error);
  }
};

const deleteGrade = async (req, res, next) => {
  try {
    const result = await academicService.deleteGrade(req.params.id);
    res.status(200).json(new ApiResponse(200, result, "Xóa khối học thành công."));
  } catch (error) {
    next(error);
  }
};

// --- Classes Controllers ---
const createClass = async (req, res, next) => {
  try {
    const newClass = await academicService.createClass(req.body);
    res.status(201).json(new ApiResponse(201, newClass, "Tạo lớp học thành công."));
  } catch (error) {
    next(error);
  }
};

const getClasses = async (req, res, next) => {
  try {
    const { gradeRef, schoolYear, search } = req.query;
    const classes = await academicService.getClasses({ gradeRef, schoolYear, search });
    res.status(200).json(new ApiResponse(200, classes, "Lấy danh sách lớp học thành công."));
  } catch (error) {
    next(error);
  }
};

const getClassById = async (req, res, next) => {
  try {
    const classObj = await academicService.getClassById(req.params.id);
    res.status(200).json(new ApiResponse(200, classObj, "Lấy thông tin lớp học thành công."));
  } catch (error) {
    next(error);
  }
};

const updateClass = async (req, res, next) => {
  try {
    const updatedClass = await academicService.updateClass(req.params.id, req.body);
    res.status(200).json(new ApiResponse(200, updatedClass, "Cập nhật thông tin lớp học thành công."));
  } catch (error) {
    next(error);
  }
};

const deleteClass = async (req, res, next) => {
  try {
    const result = await academicService.deleteClass(req.params.id);
    res.status(200).json(new ApiResponse(200, result, "Xóa lớp học thành công."));
  } catch (error) {
    next(error);
  }
};

// --- Subjects Controllers ---
const createSubject = async (req, res, next) => {
  try {
    const subject = await academicService.createSubject(req.body);
    res.status(201).json(new ApiResponse(201, subject, "Tạo môn học thành công."));
  } catch (error) {
    next(error);
  }
};

const getSubjects = async (req, res, next) => {
  try {
    const { search } = req.query;
    const subjects = await academicService.getSubjects({ search });
    res.status(200).json(new ApiResponse(200, subjects, "Lấy danh sách môn học thành công."));
  } catch (error) {
    next(error);
  }
};

const getSubjectById = async (req, res, next) => {
  try {
    const subject = await academicService.getSubjectById(req.params.id);
    res.status(200).json(new ApiResponse(200, subject, "Lấy thông tin môn học thành công."));
  } catch (error) {
    next(error);
  }
};

const updateSubject = async (req, res, next) => {
  try {
    const subject = await academicService.updateSubject(req.params.id, req.body);
    res.status(200).json(new ApiResponse(200, subject, "Cập nhật môn học thành công."));
  } catch (error) {
    next(error);
  }
};

const deleteSubject = async (req, res, next) => {
  try {
    const result = await academicService.deleteSubject(req.params.id);
    res.status(200).json(new ApiResponse(200, result, "Xóa môn học thành công."));
  } catch (error) {
    next(error);
  }
};

// --- Teaching Assignments Controllers ---
const createTeachingAssignment = async (req, res, next) => {
  try {
    const assignment = await academicService.createTeachingAssignment(req.body);
    res.status(201).json(new ApiResponse(201, assignment, "Tạo phân công giảng dạy thành công."));
  } catch (error) {
    next(error);
  }
};

const getTeachingAssignments = async (req, res, next) => {
  try {
    const { teacher, class: classVal, subject } = req.query;
    const assignments = await academicService.getTeachingAssignments({
      teacher,
      class: classVal,
      subject
    });
    res.status(200).json(new ApiResponse(200, assignments, "Lấy danh sách phân công giảng dạy thành công."));
  } catch (error) {
    next(error);
  }
};

const getTeachingAssignmentById = async (req, res, next) => {
  try {
    const assignment = await academicService.getTeachingAssignmentById(req.params.id);
    res.status(200).json(new ApiResponse(200, assignment, "Lấy thông tin phân công giảng dạy thành công."));
  } catch (error) {
    next(error);
  }
};

const updateTeachingAssignment = async (req, res, next) => {
  try {
    const assignment = await academicService.updateTeachingAssignment(req.params.id, req.body);
    res.status(200).json(new ApiResponse(200, assignment, "Cập nhật phân công giảng dạy thành công."));
  } catch (error) {
    next(error);
  }
};

const deleteTeachingAssignment = async (req, res, next) => {
  try {
    const result = await academicService.deleteTeachingAssignment(req.params.id);
    res.status(200).json(new ApiResponse(200, result, "Xóa phân công giảng dạy thành công."));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createGrade,
  getGrades,
  getGradeById,
  updateGrade,
  deleteGrade,
  createClass,
  getClasses,
  getClassById,
  updateClass,
  deleteClass,
  createSubject,
  getSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject,
  createTeachingAssignment,
  getTeachingAssignments,
  getTeachingAssignmentById,
  updateTeachingAssignment,
  deleteTeachingAssignment,
};
