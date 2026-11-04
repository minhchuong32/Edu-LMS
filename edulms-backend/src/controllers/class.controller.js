const classService = require("../services/class.service");
const { successResponse } = require("../utils/apiResponse");

const getClasses = async (req, res, next) => {
  try {
    const classes = await classService.getClasses(req.query);
    return successResponse(res, classes, "Lấy danh sách lớp học thành công");
  } catch (error) {
    next(error);
  }
};

const getClassById = async (req, res, next) => {
  try {
    const cls = await classService.getClassById(req.params.id);
    return successResponse(res, cls, "Lấy thông tin lớp học thành công");
  } catch (error) {
    next(error);
  }
};

const createClass = async (req, res, next) => {
  try {
    const cls = await classService.createClass(req.body);
    return successResponse(res, cls, "Tạo lớp học mới thành công", 201);
  } catch (error) {
    next(error);
  }
};

const updateClass = async (req, res, next) => {
  try {
    const cls = await classService.updateClass(req.params.id, req.body);
    return successResponse(res, cls, "Cập nhật lớp học thành công");
  } catch (error) {
    next(error);
  }
};

const assignHomeroomTeacher = async (req, res, next) => {
  try {
    const { teacherId } = req.body;
    const cls = await classService.assignHomeroomTeacher(req.params.id, teacherId);
    return successResponse(
      res,
      cls,
      teacherId ? "Phân công giáo viên chủ nhiệm thành công" : "Hủy phân công giáo viên chủ nhiệm thành công"
    );
  } catch (error) {
    next(error);
  }
};

const deleteClass = async (req, res, next) => {
  try {
    const result = await classService.deleteClass(req.params.id);
    return successResponse(res, result, result.message);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getClasses,
  getClassById,
  createClass,
  updateClass,
  assignHomeroomTeacher,
  deleteClass,
};
