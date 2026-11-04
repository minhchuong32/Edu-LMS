const gradeService = require("../services/grade.service");
const { successResponse } = require("../utils/apiResponse");

const getGrades = async (req, res, next) => {
  try {
    const grades = await gradeService.getGrades(req.query);
    return successResponse(res, grades, "Lấy danh sách khối học thành công");
  } catch (error) {
    next(error);
  }
};

const getGradeById = async (req, res, next) => {
  try {
    const grade = await gradeService.getGradeById(req.params.id);
    return successResponse(res, grade, "Lấy thông tin khối học thành công");
  } catch (error) {
    next(error);
  }
};

const createGrade = async (req, res, next) => {
  try {
    const grade = await gradeService.createGrade(req.body);
    return successResponse(res, grade, "Tạo khối học mới thành công", 201);
  } catch (error) {
    next(error);
  }
};

const updateGrade = async (req, res, next) => {
  try {
    const grade = await gradeService.updateGrade(req.params.id, req.body);
    return successResponse(res, grade, "Cập nhật khối học thành công");
  } catch (error) {
    next(error);
  }
};

const deleteGrade = async (req, res, next) => {
  try {
    const result = await gradeService.deleteGrade(req.params.id);
    return successResponse(res, result, result.message);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getGrades,
  getGradeById,
  createGrade,
  updateGrade,
  deleteGrade,
};
