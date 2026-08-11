const studentService = require("../services/student.service");
const ApiResponse = require("../utils/ApiResponse");

/**
 * Controller to handle fetching parents of a student
 * GET /api/v1/students/:studentId/parents
 */
const getStudentParents = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const parents = await studentService.getStudentParents(studentId, req.user);

    res.status(200).json(
      new ApiResponse(200, parents, "Lấy danh sách phụ huynh thành công.")
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to handle linking parent to student
 * POST /api/v1/students/:studentId/parents
 */
const addStudentParent = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const parents = await studentService.addStudentParent(studentId, req.body, req.user);

    res.status(201).json(
      new ApiResponse(201, parents, "Liên kết phụ huynh thành công.")
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to handle unlinking parent from student
 * DELETE /api/v1/students/:studentId/parents/:parentId
 */
const removeStudentParent = async (req, res, next) => {
  try {
    const { studentId, parentId } = req.params;
    const parents = await studentService.removeStudentParent(studentId, parentId, req.user);

    res.status(200).json(
      new ApiResponse(200, parents, "Đã gỡ liên kết phụ huynh thành công.")
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStudentParents,
  addStudentParent,
  removeStudentParent,
};
