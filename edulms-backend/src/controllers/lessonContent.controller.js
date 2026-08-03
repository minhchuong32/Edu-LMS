const lessonContentService = require("../services/lessonContent.service");
const ApiResponse = require("../utils/ApiResponse");

const createLessonContent = async (req, res, next) => {
  try {
    const lessonContent = await lessonContentService.createLessonContent(req.body, req.user);
    res.status(201).json(new ApiResponse(201, lessonContent, "Tạo nội dung bài học thành công."));
  } catch (error) {
    next(error);
  }
};

const getLessonContents = async (req, res, next) => {
  try {
    const lessonContents = await lessonContentService.getLessonContents(req.query);
    res.status(200).json(new ApiResponse(200, lessonContents, "Lấy danh sách nội dung bài học thành công."));
  } catch (error) {
    next(error);
  }
};

const getLessonContentsByClassAndSubject = async (req, res, next) => {
  try {
    const { classId, subjectId } = req.query;
    const lessonContents = await lessonContentService.getLessonContentsByClassAndSubject(
      classId,
      subjectId,
      req.user
    );
    res
      .status(200)
      .json(
        new ApiResponse(200, lessonContents, "Lấy nội dung bài học theo lớp và môn thành công.")
      );
  } catch (error) {
    next(error);
  }
};

const getLessonContentById = async (req, res, next) => {
  try {
    const lessonContent = await lessonContentService.getLessonContentById(req.params.id);
    res.status(200).json(new ApiResponse(200, lessonContent, "Lấy thông tin nội dung bài học thành công."));
  } catch (error) {
    next(error);
  }
};

const updateLessonContent = async (req, res, next) => {
  try {
    const updatedContent = await lessonContentService.updateLessonContent(
      req.params.id,
      req.body,
      req.user
    );
    res.status(200).json(new ApiResponse(200, updatedContent, "Cập nhật nội dung bài học thành công."));
  } catch (error) {
    next(error);
  }
};

const deleteLessonContent = async (req, res, next) => {
  try {
    const result = await lessonContentService.deleteLessonContent(req.params.id, req.user);
    res.status(200).json(new ApiResponse(200, result, "Xóa nội dung bài học thành công."));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createLessonContent,
  getLessonContents,
  getLessonContentsByClassAndSubject,
  getLessonContentById,
  updateLessonContent,
  deleteLessonContent,
};

