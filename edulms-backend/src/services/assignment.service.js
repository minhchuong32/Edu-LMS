const mongoose = require("mongoose");
const Assignment = require("../models/Assignment");
const TeachingAssignment = require("../models/TeachingAssignment");
const notificationService = require("./notification.service");
const { getStudentEnrolledClass } = require("../middlewares/lessonPermission.middleware");
const { safeDeleteFromCloudinary } = require("../config/cloudinary");

const VALID_STATUSES = ["open", "locked"];

/**
 * Tạo lỗi nghiệp vụ có gắn statusCode chuẩn HTTP
 */
const createAppError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

/**
 * Xóa an toàn các tệp đính kèm trên Cloudinary liên quan đến một bài tập
 * @param {object} assignmentDoc
 * @param {string[]} [excludeUrls=[]]
 */
const deleteAssignmentCloudinaryFiles = async (assignmentDoc, excludeUrls = []) => {
  if (!assignmentDoc) return;
  const deleteTasks = [];

  if (Array.isArray(assignmentDoc.attachments)) {
    for (const att of assignmentDoc.attachments) {
      if (att && att.url && !excludeUrls.includes(att.url)) {
        if (att.url.includes("res.cloudinary.com") || att.publicId) {
          deleteTasks.push(
            safeDeleteFromCloudinary(att.publicId || att.url, att.resourceType)
          );
        }
      }
    }
  }

  if (
    assignmentDoc.attachmentUrl &&
    assignmentDoc.attachmentUrl.includes("res.cloudinary.com") &&
    !excludeUrls.includes(assignmentDoc.attachmentUrl)
  ) {
    const isAlreadyQueued = assignmentDoc.attachments?.some(
      (a) =>
        a.url === assignmentDoc.attachmentUrl ||
        a.publicId === assignmentDoc.attachmentUrl
    );
    if (!isAlreadyQueued) {
      deleteTasks.push(safeDeleteFromCloudinary(assignmentDoc.attachmentUrl));
    }
  }

  if (deleteTasks.length > 0) {
    try {
      await Promise.allSettled(deleteTasks);
    } catch (err) {
      console.error("[Assignment] Lỗi khi xóa tệp Cloudinary:", err.message);
    }
  }
};

/**
 * Chuẩn hóa danh sách tệp đính kèm (attachments)
 * @param {Array} rawAttachments
 */
const normalizeAttachments = (rawAttachments) => {
  if (!Array.isArray(rawAttachments)) return [];
  return rawAttachments
    .filter((item) => item && typeof item.url === "string" && item.url.trim())
    .map((item) => ({
      name: item.name || item.originalName || "Tài liệu bài tập",
      url: item.url.trim(),
      publicId: item.publicId || "",
      resourceType: item.resourceType || "raw",
      fileType: item.fileType || item.category || "document",
      fileSize: Number(item.fileSize || item.size) || 0,
      format: item.format || "",
    }));
};

/**
 * Kiểm tra quyền sở hữu bài tập theo TeachingAssignment đối với Giáo viên / Admin
 */
const verifyTeacherOwnership = async (assignmentDoc, user) => {
  if (!user) return;
  const { role, userId } = user;

  if (!["admin", "teacher"].includes(role)) {
    throw createAppError(
      `Tài khoản với vai trò '${role}' không có quyền thao tác trên bài tập!`,
      403
    );
  }

  if (role === "teacher") {
    const ta = await TeachingAssignment.findOne({
      _id: assignmentDoc.teachingAssignment,
      isDeleted: false,
    });
    const assignedTeacherId = (ta?.teacher?._id || ta?.teacher)?.toString();

    if (!ta || assignedTeacherId !== userId.toString()) {
      throw createAppError(
        "Bạn không phải giáo viên phụ trách bài tập này, không có quyền thao tác!",
        403
      );
    }
  }
};

/**
 * Tạo mới bài tập liên kết với TeachingAssignment
 */
const createAssignment = async (data = {}, context = {}) => {
  let {
    teachingAssignment,
    title,
    description,
    dueDate,
    attachmentUrl,
    attachments: rawAttachments,
    status,
    isActive,
  } = data;

  const { user, targetTeachingAssignment: preloadedTa } = context;

  if (!title || !String(title).trim()) {
    throw createAppError("Tiêu đề bài tập là bắt buộc", 400);
  }

  if (String(title).trim().length < 2) {
    throw createAppError("Tiêu đề bài tập phải có ít nhất 2 ký tự", 400);
  }

  if (!dueDate) {
    throw createAppError("Hạn nộp bài (dueDate) là bắt buộc", 400);
  }

  const parsedDueDate = new Date(dueDate);
  if (Number.isNaN(parsedDueDate.getTime())) {
    throw createAppError("Hạn nộp bài (dueDate) không hợp lệ", 400);
  }

  if (status !== undefined && status !== null && status !== "") {
    const normalizedStatus = String(status).trim().toLowerCase();
    if (!VALID_STATUSES.includes(normalizedStatus)) {
      throw createAppError(
        `Trạng thái bài tập '${status}' không hợp lệ. Chỉ chấp nhận: open, locked`,
        400
      );
    }
    status = normalizedStatus;
  } else {
    status = "open";
  }

  let targetTeachingAssignment = preloadedTa;
  if (!targetTeachingAssignment) {
    if (!teachingAssignment) {
      throw createAppError(
        "Phân công giảng dạy (teachingAssignment) là bắt buộc",
        400
      );
    }

    if (!mongoose.Types.ObjectId.isValid(teachingAssignment)) {
      throw createAppError(
        "Mã phân công giảng dạy (teachingAssignment) không hợp lệ",
        400
      );
    }

    targetTeachingAssignment = await TeachingAssignment.findOne({
      _id: teachingAssignment,
      isDeleted: false,
    });

    if (!targetTeachingAssignment) {
      throw createAppError(
        "Phân công giảng dạy không tồn tại hoặc đã bị xóa",
        404
      );
    }

    if (user) {
      const { role, userId } = user;
      if (!["admin", "teacher"].includes(role)) {
        throw createAppError(
          `Tài khoản với vai trò '${role}' không có quyền tạo bài tập!`,
          403
        );
      }

      const assignedTeacherId = (
        targetTeachingAssignment.teacher?._id || targetTeachingAssignment.teacher
      )?.toString();

      if (role === "teacher" && assignedTeacherId !== userId.toString()) {
        throw createAppError(
          "Bạn không được phân công giảng dạy lớp học này, không có quyền tạo bài tập!",
          403
        );
      }
    }
  }

  const attachments = normalizeAttachments(rawAttachments);
  if (!attachmentUrl && attachments.length > 0) {
    attachmentUrl = attachments[0].url;
  }

  const newAssignment = new Assignment({
    teachingAssignment: targetTeachingAssignment._id || teachingAssignment,
    title: String(title).trim(),
    description: description ? String(description).trim() : "",
    dueDate: parsedDueDate,
    attachmentUrl: attachmentUrl ? String(attachmentUrl).trim() : "",
    attachments,
    status,
    isActive: isActive !== undefined ? Boolean(isActive) : true,
  });

  const savedAssignment = await newAssignment.save();

  // Trigger tự động tạo thông báo cho các học sinh trong lớp khi giáo viên giao bài tập mới
  if (savedAssignment.isActive !== false) {
    try {
      await notificationService.createAssignmentCreatedNotifications({
        assignment: savedAssignment,
        teachingAssignment: targetTeachingAssignment,
        sender: user?.userId || user?._id || user?.id || null,
      });
    } catch (notifyErr) {
      console.error(
        "[Assignment] Không thể tạo thông báo giao bài tập mới:",
        notifyErr.message
      );
    }
  }

  return savedAssignment;
};

/**
 * Lấy danh sách bài tập (hỗ trợ lọc theo teachingAssignment, status, isActive, search)
 */
const getAssignments = async (query = {}, context = {}) => {
  const { teachingAssignment, status, isActive, search } = query;
  const { user, targetTeachingAssignment: preloadedTa, studentClass: preloadedClass } = context;

  const filter = { isDeleted: false };

  if (user?.role === "student" || user?.role === "parent") {
    filter.isActive = true;
  } else if (isActive !== undefined) {
    filter.isActive = isActive === "true" || isActive === true;
  }

  if (status) {
    const normalizedStatus = String(status).trim().toLowerCase();
    if (!VALID_STATUSES.includes(normalizedStatus)) {
      throw createAppError(
        `Trạng thái lọc '${status}' không hợp lệ. Chỉ chấp nhận: open, locked`,
        400
      );
    }
    filter.status = normalizedStatus;
  }

  if (search && String(search).trim()) {
    filter.title = { $regex: String(search).trim(), $options: "i" };
  }

  if (teachingAssignment) {
    if (!mongoose.Types.ObjectId.isValid(teachingAssignment)) {
      throw createAppError(
        "Mã phân công giảng dạy (teachingAssignment) không hợp lệ",
        400
      );
    }

    let targetTeachingAssignment = preloadedTa;
    if (!targetTeachingAssignment) {
      targetTeachingAssignment = await TeachingAssignment.findOne({
        _id: teachingAssignment,
        isDeleted: false,
      });
    }

    if (!targetTeachingAssignment) {
      throw createAppError(
        "Phân công giảng dạy không tồn tại hoặc đã bị xóa",
        404
      );
    }

    if (user?.role === "teacher") {
      const assignedTeacherId = (
        targetTeachingAssignment.teacher?._id || targetTeachingAssignment.teacher
      )?.toString();

      if (assignedTeacherId !== user.userId.toString()) {
        throw createAppError(
          "Bạn không được phân công giảng dạy lớp/môn học này, không có quyền truy cập bài tập!",
          403
        );
      }
    } else if (user?.role === "student") {
      let studentClass = preloadedClass;
      if (!studentClass) {
        const enrolled = await getStudentEnrolledClass(user.userId);
        studentClass = enrolled.studentClass;
      }

      const assignedClassId = (
        targetTeachingAssignment.class?._id || targetTeachingAssignment.class
      )?.toString();

      if (assignedClassId !== studentClass._id.toString()) {
        throw createAppError(
          "Bạn không thuộc lớp học này, không có quyền truy cập bài tập!",
          403
        );
      }
    }

    filter.teachingAssignment = teachingAssignment;
  } else if (user?.role === "teacher") {
    const teacherAssignments = await TeachingAssignment.find({
      teacher: user.userId,
      isDeleted: false,
    }).select("_id");

    filter.teachingAssignment = {
      $in: teacherAssignments.map((a) => a._id),
    };
  } else if (user?.role === "student") {
    let studentClass = preloadedClass;
    if (!studentClass) {
      const enrolled = await getStudentEnrolledClass(user.userId);
      studentClass = enrolled.studentClass;
    }

    const classAssignments = await TeachingAssignment.find({
      class: studentClass._id,
      isDeleted: false,
    }).select("_id");

    filter.teachingAssignment = {
      $in: classAssignments.map((a) => a._id),
    };
  }

  return await Assignment.find(filter)
    .sort({ dueDate: 1, createdAt: -1 })
    .populate({
      path: "teachingAssignment",
      select: "class subject teacher academicYear semester",
      populate: [
        { path: "class", select: "name academicYear" },
        { path: "subject", select: "name code" },
        { path: "teacher", select: "fullName userCode email" },
      ],
    })
    .lean();
};

/**
 * Lấy danh sách bài tập theo Lớp học và Môn học
 */
const getAssignmentsByClassAndSubject = async (params = {}, context = {}) => {
  const { classId, subjectId, academicYear, semester, status } = params;
  const { user, studentClass: preloadedClass } = context;

  if (!classId) {
    throw createAppError("Thông tin lớp học (classId) là bắt buộc", 400);
  }
  if (!subjectId) {
    throw createAppError("Thông tin môn học (subjectId) là bắt buộc", 400);
  }

  if (!mongoose.Types.ObjectId.isValid(classId)) {
    throw createAppError(
      "Mã lớp học (classId) không đúng định dạng ObjectId",
      400
    );
  }
  if (!mongoose.Types.ObjectId.isValid(subjectId)) {
    throw createAppError(
      "Mã môn học (subjectId) không đúng định dạng ObjectId",
      400
    );
  }

  if (user?.role === "student") {
    let studentClass = preloadedClass;
    if (!studentClass) {
      const enrolled = await getStudentEnrolledClass(user.userId);
      studentClass = enrolled.studentClass;
    }

    if (classId.toString() !== studentClass._id.toString()) {
      throw createAppError(
        "Bạn không thuộc lớp học này, không có quyền truy cập danh sách bài tập!",
        403
      );
    }
  }

  const assignmentQuery = {
    class: classId,
    subject: subjectId,
    isDeleted: false,
  };
  if (academicYear) assignmentQuery.academicYear = academicYear.trim();
  if (semester) assignmentQuery.semester = semester.trim();

  const matchedTeachingAssignments = await TeachingAssignment.find(
    assignmentQuery
  ).lean();

  if (!matchedTeachingAssignments || matchedTeachingAssignments.length === 0) {
    return {
      assignments: [],
      isEmptyTeachingAssignment: true,
    };
  }

  if (user?.role === "teacher") {
    const ownsAny = matchedTeachingAssignments.some(
      (ta) =>
        (ta.teacher?._id || ta.teacher)?.toString() === user.userId.toString()
    );
    if (!ownsAny) {
      throw createAppError(
        "Bạn không được phân công giảng dạy lớp/môn học này, không có quyền truy cập bài tập!",
        403
      );
    }
  }

  const filter = {
    teachingAssignment: {
      $in: matchedTeachingAssignments.map((ta) => ta._id),
    },
    isDeleted: false,
  };

  if (user?.role === "student" || user?.role === "parent") {
    filter.isActive = true;
  }

  if (status) {
    const normalizedStatus = String(status).trim().toLowerCase();
    if (!VALID_STATUSES.includes(normalizedStatus)) {
      throw createAppError(`Trạng thái lọc '${status}' không hợp lệ`, 400);
    }
    filter.status = normalizedStatus;
  }

  const assignments = await Assignment.find(filter)
    .sort({ dueDate: 1, createdAt: -1 })
    .populate({
      path: "teachingAssignment",
      select: "class subject teacher academicYear semester",
      populate: [
        { path: "class", select: "name academicYear" },
        { path: "subject", select: "name code" },
        { path: "teacher", select: "fullName userCode email" },
      ],
    })
    .lean();

  return {
    assignments,
    isEmptyTeachingAssignment: false,
  };
};

/**
 * Lấy chi tiết một bài tập theo ID
 */
const getAssignmentById = async (id, context = {}) => {
  const { user, targetAssignmentDoc } = context;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createAppError("Mã bài tập không hợp lệ", 400);
  }

  const assignmentDoc = await Assignment.findOne({
    _id: id,
    isDeleted: false,
  })
    .populate({
      path: "teachingAssignment",
      select: "class subject teacher academicYear semester",
      populate: [
        { path: "class", select: "name academicYear" },
        { path: "subject", select: "name code" },
        { path: "teacher", select: "fullName userCode email" },
      ],
    })
    .lean();

  if (!assignmentDoc) {
    throw createAppError("Bài tập không tồn tại hoặc đã bị xóa", 404);
  }

  if (user && !targetAssignmentDoc) {
    const { role, userId } = user;
    const ta = assignmentDoc.teachingAssignment;

    if (role === "teacher") {
      const assignedTeacherId = (ta?.teacher?._id || ta?.teacher)?.toString();
      if (!ta || assignedTeacherId !== userId.toString()) {
        throw createAppError(
          "Bạn không được phân công giảng dạy lớp/môn học này, không có quyền xem bài tập!",
          403
        );
      }
    } else if (role === "student") {
      if (!assignmentDoc.isActive) {
        throw createAppError("Bài tập hiện chưa được công khai!", 403);
      }
      const { studentClass } = await getStudentEnrolledClass(userId);
      const assignedClassId = (ta?.class?._id || ta?.class)?.toString();
      if (!ta || assignedClassId !== studentClass._id.toString()) {
        throw createAppError(
          "Bạn không thuộc lớp học này, không có quyền truy cập bài tập!",
          403
        );
      }
    }
  }

  return assignmentDoc;
};

/**
 * Cập nhật thông tin bài tập
 */
const updateAssignment = async (id, data = {}, context = {}) => {
  const { user, targetAssignmentDoc } = context;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createAppError("Mã bài tập không hợp lệ", 400);
  }

  let assignmentDoc = targetAssignmentDoc;
  if (!assignmentDoc) {
    assignmentDoc = await Assignment.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!assignmentDoc) {
      throw createAppError("Bài tập không tồn tại hoặc đã bị xóa", 404);
    }

    await verifyTeacherOwnership(assignmentDoc, user);
  }

  const {
    title,
    description,
    dueDate,
    attachmentUrl,
    attachments: rawAttachments,
    status,
    isActive,
    teachingAssignment: newTeachingAssignmentId,
  } = data;

  if (
    newTeachingAssignmentId &&
    newTeachingAssignmentId.toString() !==
      assignmentDoc.teachingAssignment.toString()
  ) {
    if (!mongoose.Types.ObjectId.isValid(newTeachingAssignmentId)) {
      throw createAppError(
        "Mã phân công giảng dạy (teachingAssignment) không hợp lệ",
        400
      );
    }

    const newTa = await TeachingAssignment.findOne({
      _id: newTeachingAssignmentId,
      isDeleted: false,
    });

    if (!newTa) {
      throw createAppError(
        "Phân công giảng dạy mới không tồn tại hoặc đã bị xóa",
        404
      );
    }

    if (user?.role === "teacher") {
      const newTeacherId = (newTa.teacher?._id || newTa.teacher)?.toString();
      if (newTeacherId !== user.userId.toString()) {
        throw createAppError(
          "Bạn không được phân công giảng dạy ở lớp/môn học mới này!",
          403
        );
      }
    }

    assignmentDoc.teachingAssignment = newTeachingAssignmentId;
  }

  if (title !== undefined) {
    if (!String(title).trim()) {
      throw createAppError("Tiêu đề bài tập không được để trống", 400);
    }
    if (String(title).trim().length < 2) {
      throw createAppError("Tiêu đề bài tập phải có ít nhất 2 ký tự", 400);
    }
    assignmentDoc.title = String(title).trim();
  }

  if (description !== undefined) {
    assignmentDoc.description = String(description).trim();
  }

  if (dueDate !== undefined) {
    const parsedDueDate = new Date(dueDate);
    if (!dueDate || Number.isNaN(parsedDueDate.getTime())) {
      throw createAppError("Hạn nộp bài (dueDate) không hợp lệ", 400);
    }
    assignmentDoc.dueDate = parsedDueDate;
  }

  if (status !== undefined) {
    const normalizedStatus = String(status).trim().toLowerCase();
    if (!VALID_STATUSES.includes(normalizedStatus)) {
      throw createAppError(
        `Trạng thái bài tập '${status}' không hợp lệ. Chỉ chấp nhận: open, locked`,
        400
      );
    }
    assignmentDoc.status = normalizedStatus;
  }

  if (isActive !== undefined) {
    assignmentDoc.isActive = Boolean(isActive);
  }

  if (rawAttachments !== undefined || attachmentUrl !== undefined) {
    const nextAttachments =
      rawAttachments !== undefined
        ? normalizeAttachments(rawAttachments)
        : assignmentDoc.attachments || [];
    const nextAttachmentUrl =
      attachmentUrl !== undefined
        ? String(attachmentUrl).trim()
        : nextAttachments[0]?.url || assignmentDoc.attachmentUrl || "";

    const keepUrls = [
      nextAttachmentUrl,
      ...nextAttachments.map((a) => a.url),
    ].filter(Boolean);

    await deleteAssignmentCloudinaryFiles(assignmentDoc, keepUrls);

    if (rawAttachments !== undefined) {
      assignmentDoc.attachments = nextAttachments;
    }
    assignmentDoc.attachmentUrl = nextAttachmentUrl;
  }

  return await assignmentDoc.save();
};

/**
 * Xóa mềm bài tập và dọn dẹp tệp đính kèm trên Cloudinary
 */
const deleteAssignment = async (id, context = {}) => {
  const { user, targetAssignmentDoc } = context;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createAppError("Mã bài tập không hợp lệ", 400);
  }

  let assignmentDoc = targetAssignmentDoc;
  if (!assignmentDoc) {
    assignmentDoc = await Assignment.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!assignmentDoc) {
      throw createAppError("Bài tập không tồn tại hoặc đã bị xóa", 404);
    }

    await verifyTeacherOwnership(assignmentDoc, user);
  }

  await deleteAssignmentCloudinaryFiles(assignmentDoc);

  assignmentDoc.isDeleted = true;
  assignmentDoc.isActive = false;
  await assignmentDoc.save();

  return null;
};

/**
 * Mở / Khóa nhận bài tập (status: 'open' | 'locked' hoặc tự động đảo nếu không truyền)
 */
const updateAssignmentStatus = async (id, statusInput, context = {}) => {
  const { user, targetAssignmentDoc } = context;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createAppError("Mã bài tập không hợp lệ", 400);
  }

  let assignmentDoc = targetAssignmentDoc;
  if (!assignmentDoc) {
    assignmentDoc = await Assignment.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!assignmentDoc) {
      throw createAppError("Bài tập không tồn tại hoặc đã bị xóa", 404);
    }

    await verifyTeacherOwnership(assignmentDoc, user);
  }

  let nextStatus = statusInput;
  if (nextStatus !== undefined && nextStatus !== null && nextStatus !== "") {
    nextStatus = String(nextStatus).trim().toLowerCase();
    if (!VALID_STATUSES.includes(nextStatus)) {
      throw createAppError(
        `Trạng thái bài tập '${statusInput}' không hợp lệ. Chỉ chấp nhận: open, locked`,
        400
      );
    }
  } else {
    nextStatus = assignmentDoc.status === "open" ? "locked" : "open";
  }

  assignmentDoc.status = nextStatus;
  const savedAssignment = await assignmentDoc.save();

  const message =
    nextStatus === "locked"
      ? "Khóa nhận bài tập thành công"
      : "Mở nhận bài tập thành công";

  return {
    assignment: savedAssignment,
    message,
  };
};

module.exports = {
  createAppError,
  deleteAssignmentCloudinaryFiles,
  normalizeAttachments,
  createAssignment,
  getAssignments,
  getAssignmentsByClassAndSubject,
  getAssignmentById,
  updateAssignment,
  deleteAssignment,
  updateAssignmentStatus,
};
