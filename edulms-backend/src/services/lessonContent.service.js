const mongoose = require("mongoose");
const LessonContent = require("../models/LessonContent");
const TeachingAssignment = require("../models/TeachingAssignment");
const ApiError = require("../utils/ApiError");

/**
 * Helper to verify that the user has permission to manage lesson content
 * for a specific TeachingAssignment (Admin or assigned Teacher).
 */
const checkTeacherAssignmentPermission = (assignment, user) => {
  if (!user) {
    throw new ApiError(401, "Yêu cầu đăng nhập để thực hiện thao tác.");
  }
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
    "Chỉ giáo viên được Admin phân công giảng dạy mới có quyền quản lý các bài giảng này."
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

  // Enforce teacher assignment restriction
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

const getLessonContents = async (query = {}, user = null) => {
  const filter = {};

  if (query.contentType) {
    filter.contentType = query.contentType;
  }

  // Teacher scope restriction: ONLY allow access to assigned teaching assignments
  if (user && user.role === "teacher") {
    const myAssignments = await TeachingAssignment.find({ teacherRef: user._id }).select("_id");
    const myAssignmentIds = myAssignments.map((a) => a._id.toString());

    if (query.teachingAssignmentRef && mongoose.Types.ObjectId.isValid(query.teachingAssignmentRef)) {
      if (!myAssignmentIds.includes(query.teachingAssignmentRef.toString())) {
        throw new ApiError(403, "Bạn không được phân công giảng dạy lớp/môn học này.");
      }
      filter.teachingAssignmentRef = query.teachingAssignmentRef;
    } else {
      filter.teachingAssignmentRef = { $in: myAssignments.map((a) => a._id) };
    }
  } else if (user && user.role === "student") {
    // Student scope restriction
    const studentClassId = user.classRef
      ? (user.classRef._id || user.classRef).toString()
      : null;

    if (!studentClassId) {
      return [];
    }

    const classAssignments = await TeachingAssignment.find({ classRef: studentClassId }).select("_id");
    const classAssignmentIds = classAssignments.map((a) => a._id.toString());

    if (query.teachingAssignmentRef && mongoose.Types.ObjectId.isValid(query.teachingAssignmentRef)) {
      if (!classAssignmentIds.includes(query.teachingAssignmentRef.toString())) {
        throw new ApiError(403, "Học sinh không thuộc lớp học của bài giảng này.");
      }
      filter.teachingAssignmentRef = query.teachingAssignmentRef;
    } else {
      filter.teachingAssignmentRef = { $in: classAssignments.map((a) => a._id) };
    }
  } else if (query.teachingAssignmentRef && mongoose.Types.ObjectId.isValid(query.teachingAssignmentRef)) {
    filter.teachingAssignmentRef = query.teachingAssignmentRef;
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

  if (user && user.role === "student") {
    const studentClassId = user.classRef
      ? (user.classRef._id || user.classRef).toString()
      : null;

    if (!studentClassId || studentClassId !== classId.toString()) {
      throw new ApiError(403, "Học sinh không thuộc lớp học này.");
    }
  }

  const queryFilter = {
    classRef: classId,
    subjectRef: subjectId,
  };

  if (user && user.role === "teacher") {
    queryFilter.teacherRef = user._id;
  }

  const assignment = await TeachingAssignment.findOne(queryFilter);

  if (!assignment) {
    if (user && user.role === "teacher") {
      throw new ApiError(403, "Bạn không được Admin phân công giảng dạy môn học này tại lớp học đã chọn.");
    }
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

const getLessonContentById = async (id, user = null) => {
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

  if (user && user.role === "teacher" && lessonContent.teachingAssignmentRef) {
    checkTeacherAssignmentPermission(lessonContent.teachingAssignmentRef, user);
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

const reorderLessonContents = async (items, user) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, "Danh sách sắp xếp không được để trống.");
  }

  const ids = items.map((item) => item.id || item._id).filter(Boolean);
  const contents = await LessonContent.find({ _id: { $in: ids } });

  if (contents.length === 0) {
    throw new ApiError(404, "Không tìm thấy nội dung bài học nào.");
  }

  if (user.role !== "admin") {
    const assignmentIds = [...new Set(contents.map((c) => c.teachingAssignmentRef.toString()))];
    const assignments = await TeachingAssignment.find({ _id: { $in: assignmentIds } });
    for (const assignment of assignments) {
      checkTeacherAssignmentPermission(assignment, user);
    }
  }

  const bulkOps = items.map((item, index) => {
    const itemId = item.id || item._id;
    const newOrder = typeof item.order === "number" ? item.order : index + 1;
    return {
      updateOne: {
        filter: { _id: itemId },
        update: { $set: { order: newOrder } },
      },
    };
  });

  await LessonContent.bulkWrite(bulkOps);
  return { updatedCount: items.length };
};

module.exports = {
  createLessonContent,
  getLessonContents,
  getLessonContentsByClassAndSubject,
  getLessonContentById,
  updateLessonContent,
  deleteLessonContent,
  reorderLessonContents,
};
