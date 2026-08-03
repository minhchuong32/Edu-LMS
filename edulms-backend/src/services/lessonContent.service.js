const mongoose = require("mongoose");
const LessonContent = require("../models/LessonContent");
const TeachingAssignment = require("../models/TeachingAssignment");
const ApiError = require("../utils/ApiError");

/**
 * Helper to verify that the user has permission to manage lesson content
 * for a specific TeachingAssignment (Admin or assigned Teacher).
 */
const checkTeacherAssignmentPermission = (assignment, user) => {
  if (user.role === "admin") {
    return true;
  }
  if (user.role === "teacher") {
    const assignedTeacherId = assignment.teacherRef
      ? (assignment.teacherRef._id || assignment.teacherRef).toString()
      : null;
    if (assignedTeacherId && assignedTeacherId === user._id.toString()) {
      return true;
    }
  }
  throw new ApiError(
    403,
    "Chỉ giáo viên được phân công mới có quyền thực hiện thao tác này."
  );
};

const createLessonContent = async (data, user) => {
  const teachingAssignmentRef = data.teachingAssignmentRef || data.teachingAssignment;

  if (!teachingAssignmentRef || !mongoose.Types.ObjectId.isValid(teachingAssignmentRef)) {
    throw new ApiError(400, "Mã phân công giảng dạy (teachingAssignmentRef) không hợp lệ.");
  }

  if (!data.title || !data.title.trim()) {
    throw new ApiError(400, "Tiêu đề bài học là bắt buộc.");
  }

  const assignment = await TeachingAssignment.findById(teachingAssignmentRef);
  if (!assignment) {
    throw new ApiError(404, "Không tìm thấy phân công giảng dạy tương ứng.");
  }

  checkTeacherAssignmentPermission(assignment, user);

  const newContent = await LessonContent.create({
    teachingAssignmentRef: assignment._id,
    title: data.title.trim(),
    description: data.description ? data.description.trim() : "",
    contentType: data.contentType || "document",
    attachmentUrl: data.attachmentUrl || "",
    order: typeof data.order === "number" ? data.order : 0,
  });

  return newContent;
};

const getLessonContents = async (query = {}) => {
  const filter = {};
  if (query.teachingAssignmentRef && mongoose.Types.ObjectId.isValid(query.teachingAssignmentRef)) {
    filter.teachingAssignmentRef = query.teachingAssignmentRef;
  }
  if (query.contentType) {
    filter.contentType = query.contentType;
  }

  return await LessonContent.find(filter)
    .sort({ order: 1, createdAt: 1 })
    .populate({
      path: "teachingAssignmentRef",
      populate: [
        { path: "teacherRef", select: "name email teacherCode" },
        { path: "classRef", select: "name schoolYear" },
        { path: "subjectRef", select: "name" },
      ],
    });
};

const getLessonContentsByClassAndSubject = async (classId, subjectId, user) => {
  if (!classId || !mongoose.Types.ObjectId.isValid(classId)) {
    throw new ApiError(400, "Mã lớp học không hợp lệ.");
  }
  if (!subjectId || !mongoose.Types.ObjectId.isValid(subjectId)) {
    throw new ApiError(400, "Mã môn học không hợp lệ.");
  }

  // Check if student belongs to the requested class
  if (user.role === "student") {
    const studentClassId = user.classRef
      ? (user.classRef._id || user.classRef).toString()
      : null;

    if (!studentClassId || studentClassId !== classId.toString()) {
      throw new ApiError(403, "Học sinh không thuộc lớp học này.");
    }
  }

  const assignment = await TeachingAssignment.findOne({
    classRef: classId,
    subjectRef: subjectId,
  });

  if (!assignment) {
    return [];
  }

  return await LessonContent.find({ teachingAssignmentRef: assignment._id })
    .sort({ order: 1, createdAt: 1 })
    .populate({
      path: "teachingAssignmentRef",
      populate: [
        { path: "teacherRef", select: "name email teacherCode" },
        { path: "classRef", select: "name schoolYear" },
        { path: "subjectRef", select: "name" },
      ],
    });
};

const getLessonContentById = async (id) => {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Mã nội dung bài học không hợp lệ.");
  }

  const lessonContent = await LessonContent.findById(id).populate({
    path: "teachingAssignmentRef",
    populate: [
      { path: "teacherRef", select: "name email teacherCode" },
      { path: "classRef", select: "name schoolYear" },
      { path: "subjectRef", select: "name" },
    ],
  });

  if (!lessonContent) {
    throw new ApiError(404, "Không tìm thấy nội dung bài học.");
  }

  return lessonContent;
};

const updateLessonContent = async (id, data, user) => {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Mã nội dung bài học không hợp lệ.");
  }

  const lessonContent = await LessonContent.findById(id);
  if (!lessonContent) {
    throw new ApiError(404, "Không tìm thấy nội dung bài học.");
  }

  const assignment = await TeachingAssignment.findById(lessonContent.teachingAssignmentRef);
  if (!assignment) {
    throw new ApiError(404, "Không tìm thấy phân công giảng dạy tương ứng.");
  }

  checkTeacherAssignmentPermission(assignment, user);

  if (data.title !== undefined) {
    if (!data.title || !data.title.trim()) {
      throw new ApiError(400, "Tiêu đề bài học không được để trống.");
    }
    lessonContent.title = data.title.trim();
  }

  if (data.description !== undefined) {
    lessonContent.description = data.description.trim();
  }

  if (data.contentType !== undefined) {
    lessonContent.contentType = data.contentType;
  }

  if (data.attachmentUrl !== undefined) {
    lessonContent.attachmentUrl = data.attachmentUrl;
  }

  if (typeof data.order === "number") {
    lessonContent.order = data.order;
  }

  return await lessonContent.save();
};

const deleteLessonContent = async (id, user) => {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Mã nội dung bài học không hợp lệ.");
  }

  const lessonContent = await LessonContent.findById(id);
  if (!lessonContent) {
    throw new ApiError(404, "Không tìm thấy nội dung bài học.");
  }

  const assignment = await TeachingAssignment.findById(lessonContent.teachingAssignmentRef);
  if (!assignment) {
    throw new ApiError(404, "Không tìm thấy phân công giảng dạy tương ứng.");
  }

  checkTeacherAssignmentPermission(assignment, user);

  await LessonContent.findByIdAndDelete(id);
  return { id, deleted: true };
};

module.exports = {
  createLessonContent,
  getLessonContents,
  getLessonContentsByClassAndSubject,
  getLessonContentById,
  updateLessonContent,
  deleteLessonContent,
};
