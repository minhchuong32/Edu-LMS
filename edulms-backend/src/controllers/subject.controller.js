const subjectService = require("../services/subject.service");
const { successResponse } = require("../utils/apiResponse");

const getSubjects = async (req, res, next) => {
  try {
    const subjects = await subjectService.getSubjects(req.query);
    return successResponse(res, subjects, "Lấy danh sách môn học thành công");
  } catch (error) {
    next(error);
  }
};

const getSubjectById = async (req, res, next) => {
  try {
    const subject = await subjectService.getSubjectById(req.params.id);
    return successResponse(res, subject, "Lấy thông tin môn học thành công");
  } catch (error) {
    next(error);
  }
};

const createSubject = async (req, res, next) => {
  try {
    const subject = await subjectService.createSubject(req.body);
    return successResponse(res, subject, "Tạo môn học mới thành công", 201);
  } catch (error) {
    next(error);
  }
};

const updateSubject = async (req, res, next) => {
  try {
    const subject = await subjectService.updateSubject(req.params.id, req.body);
    return successResponse(res, subject, "Cập nhật môn học thành công");
  } catch (error) {
    next(error);
  }
};

const deleteSubject = async (req, res, next) => {
  try {
    const result = await subjectService.deleteSubject(req.params.id);
    return successResponse(res, result, result.message);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
};
