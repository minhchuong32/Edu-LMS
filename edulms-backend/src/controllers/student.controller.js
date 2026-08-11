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

module.exports = {
  getStudentParents,
};
