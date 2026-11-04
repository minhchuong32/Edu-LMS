const studentAssignmentService = require("../services/studentAssignment.service");
const { successResponse } = require("../utils/apiResponse");

const getStudentsByClass = async (req, res, next) => {
  try {
    const data = await studentAssignmentService.getStudentsByClass(
      req.params.id,
      req.query
    );
    return successResponse(res, data, "Lấy danh sách học sinh theo lớp thành công");
  } catch (error) {
    next(error);
  }
};

const getUnassignedStudents = async (req, res, next) => {
  try {
    const students = await studentAssignmentService.getUnassignedStudents(req.query);
    return successResponse(
      res,
      students,
      "Lấy danh sách học sinh chưa phân lớp thành công"
    );
  } catch (error) {
    next(error);
  }
};

const addStudentsToClass = async (req, res, next) => {
  try {
    const result = await studentAssignmentService.addStudentsToClass(
      req.params.id,
      req.body,
      req.user._id
    );
    return successResponse(
      res,
      result,
      `Xếp ${result.addedCount} học sinh vào lớp ${result.className} thành công`,
      201
    );
  } catch (error) {
    next(error);
  }
};

const removeStudentFromClass = async (req, res, next) => {
  try {
    const result = await studentAssignmentService.removeStudentFromClass(
      req.params.id,
      req.params.studentId,
      req.body,
      req.user._id
    );
    return successResponse(res, result, result.message);
  } catch (error) {
    next(error);
  }
};

const transferStudent = async (req, res, next) => {
  try {
    const result = await studentAssignmentService.transferStudent(
      req.body,
      req.user._id
    );
    return successResponse(res, result, result.message);
  } catch (error) {
    next(error);
  }
};

const getClassHistory = async (req, res, next) => {
  try {
    const history = await studentAssignmentService.getClassHistory(req.query);
    return successResponse(
      res,
      history,
      "Lấy lịch sử xếp lớp và chuyển lớp thành công"
    );
  } catch (error) {
    next(error);
  }
};

const getClassHistoryByClassId = async (req, res, next) => {
  try {
    const history = await studentAssignmentService.getClassHistory({
      ...req.query,
      classId: req.params.id,
    });
    return successResponse(
      res,
      history,
      "Lấy lịch sử của lớp thành công"
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStudentsByClass,
  getUnassignedStudents,
  addStudentsToClass,
  removeStudentFromClass,
  transferStudent,
  getClassHistory,
  getClassHistoryByClassId,
};
