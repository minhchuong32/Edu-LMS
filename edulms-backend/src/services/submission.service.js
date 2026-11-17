const mongoose = require("mongoose");
const Submission = require("../models/Submission");
const Assignment = require("../models/Assignment");
const TeachingAssignment = require("../models/TeachingAssignment");
const { getStudentEnrolledClass } = require("../middlewares/lessonPermission.middleware");
const { safeDeleteFromCloudinary } = require("../config/cloudinary");

/**
 * Tạo lỗi nghiệp vụ có gắn statusCode chuẩn HTTP
 */
const createAppError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

/**
 * Tự động xác định trạng thái trễ hạn (isLate) dựa trên thời điểm nộp (submittedAt) và hạn nộp (dueDate)
 * @param {Date|string|number} submittedAt
 * @param {Date|string|number} dueDate
 * @returns {boolean} true nếu nộp sau dueDate, ngược lại false
 */
const calculateIsLate = (submittedAt, dueDate) => {
  if (!dueDate) return false;
  const submitTime = new Date(submittedAt || Date.now()).getTime();
  const dueTime = new Date(dueDate).getTime();
  if (Number.isNaN(submitTime) || Number.isNaN(dueTime)) return false;
  return submitTime > dueTime;
};

/**
 * Chuẩn hóa danh sách tệp đính kèm của bài nộp
 */
const normalizeAttachments = (rawAttachments) => {
  if (!Array.isArray(rawAttachments)) return [];
  return rawAttachments
    .filter((item) => item && typeof item.url === "string" && item.url.trim())
    .map((item) => ({
      name: item.name || item.originalName || "Bài nộp học sinh",
      url: item.url.trim(),
      publicId: item.publicId || "",
      resourceType: item.resourceType || "raw",
      fileType: item.fileType || item.category || "document",
      fileSize: Number(item.fileSize || item.size) || 0,
      format: item.format || "",
    }));
};

/**
 * Xóa an toàn các tệp bài nộp cũ trên Cloudinary khi học sinh nộp lại
 */
const deleteSubmissionCloudinaryFiles = async (submissionDoc, excludeUrls = []) => {
  if (!submissionDoc) return;
  const deleteTasks = [];

  if (Array.isArray(submissionDoc.attachments)) {
    for (const att of submissionDoc.attachments) {
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
    submissionDoc.fileUrl &&
    submissionDoc.fileUrl.includes("res.cloudinary.com") &&
    !excludeUrls.includes(submissionDoc.fileUrl)
  ) {
    const isAlreadyQueued = submissionDoc.attachments?.some(
      (a) => a.url === submissionDoc.fileUrl || a.publicId === submissionDoc.fileUrl
    );
    if (!isAlreadyQueued) {
      deleteTasks.push(safeDeleteFromCloudinary(submissionDoc.fileUrl));
    }
  }

  if (deleteTasks.length > 0) {
    try {
      await Promise.allSettled(deleteTasks);
    } catch (err) {
      console.error("[Submission] Lỗi khi xóa tệp Cloudinary:", err.message);
    }
  }
};

/**
 * Học sinh nộp bài tập (hoặc nộp lại khi bài tập vẫn đang mở)
 * - Kiểm tra bài tập có đang mở ('open') hay đã khóa ('locked')
 * - Kiểm tra học sinh thuộc đúng lớp/môn của bài tập
 * - Tự động xác định isLate dựa trên submittedAt và dueDate
 */
const submitAssignment = async (data = {}, context = {}) => {
  const { user, targetAssignmentDoc: preloadedAssignment, studentClass: preloadedClass } = context;

  if (!user) {
    throw createAppError("Chưa xác thực thông tin người dùng!", 401);
  }

  if (user.role !== "student") {
    throw createAppError("Chỉ tài khoản học sinh mới có quyền nộp bài tập!", 403);
  }

  const studentId = user.userId || user._id || user.id;
  const assignmentId =
    data.assignment || preloadedAssignment?._id?.toString();

  if (!assignmentId) {
    throw createAppError("Mã bài tập (assignment) là bắt buộc", 400);
  }

  if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
    throw createAppError("Mã bài tập (assignment) không hợp lệ", 400);
  }

  const attachments = normalizeAttachments(data.attachments);
  const fileUrl =
    (data.fileUrl && String(data.fileUrl).trim()) ||
    attachments[0]?.url ||
    "";

  if (!fileUrl) {
    throw createAppError("Đường dẫn tệp bài nộp (fileUrl) là bắt buộc", 400);
  }

  // 1. Lấy và kiểm tra Assignment
  let assignmentDoc = preloadedAssignment;
  if (!assignmentDoc) {
    assignmentDoc = await Assignment.findOne({
      _id: assignmentId,
      isDeleted: false,
    });

    if (!assignmentDoc) {
      throw createAppError("Bài tập không tồn tại hoặc đã bị xóa", 404);
    }
  }

  if (assignmentDoc.isActive === false) {
    throw createAppError("Bài tập hiện chưa được công khai!", 403);
  }

  // 2. Không cho phép nộp bài khi Assignment đã ở trạng thái locked
  if (assignmentDoc.status === "locked") {
    throw createAppError(
      "Bài tập đã bị khóa nhận bài, bạn không thể nộp bài!",
      403
    );
  }

  // 3. Kiểm tra học sinh thuộc đúng lớp/môn của bài tập (nếu chưa qua middleware)
  if (!preloadedAssignment || !preloadedClass) {
    const { studentClass } = await getStudentEnrolledClass(studentId);
    const teachingAssignmentId =
      assignmentDoc.teachingAssignment?._id || assignmentDoc.teachingAssignment;

    const teachingAssignment = await TeachingAssignment.findOne({
      _id: teachingAssignmentId,
      isDeleted: false,
    });

    const assignedClassId = (
      teachingAssignment?.class?._id || teachingAssignment?.class
    )?.toString();

    if (!teachingAssignment || assignedClassId !== studentClass._id.toString()) {
      throw createAppError(
        "Bạn không thuộc lớp học của bài tập này, không có quyền nộp bài!",
        403
      );
    }
  }

  // 4. Tự động xác định thời điểm nộp (submittedAt) và trạng thái trễ hạn (isLate)
  const submittedAt = data.submittedAt ? new Date(data.submittedAt) : new Date();
  if (Number.isNaN(submittedAt.getTime())) {
    throw createAppError("Thời gian nộp bài (submittedAt) không hợp lệ", 400);
  }

  const isLate = calculateIsLate(submittedAt, assignmentDoc.dueDate);
  const note = data.note ? String(data.note).trim() : "";

  // 5. Kiểm tra xem học sinh đã từng nộp bài cho bài tập này chưa (nếu có thì cập nhật bài nộp)
  const existingSubmission = await Submission.findOne({
    assignment: assignmentDoc._id,
    student: studentId,
    isDeleted: false,
  });

  if (existingSubmission) {
    const keepUrls = [fileUrl, ...attachments.map((a) => a.url)].filter(Boolean);
    await deleteSubmissionCloudinaryFiles(existingSubmission, keepUrls);

    existingSubmission.fileUrl = fileUrl;
    existingSubmission.attachments = attachments;
    existingSubmission.note = note;
    existingSubmission.submittedAt = submittedAt;
    existingSubmission.isLate = isLate;

    const updatedSubmission = await existingSubmission.save();
    return {
      submission: updatedSubmission,
      isResubmission: true,
      isLate,
    };
  }

  const newSubmission = new Submission({
    assignment: assignmentDoc._id,
    student: studentId,
    fileUrl,
    attachments,
    note,
    submittedAt,
    isLate,
    score: null,
    feedback: "",
  });

  const savedSubmission = await newSubmission.save();

  return {
    submission: savedSubmission,
    isResubmission: false,
    isLate,
  };
};

/**
 * Lấy danh sách bài nộp theo bài tập (assignmentId)
 * - Giáo viên phụ trách xem được toàn bộ bài nộp của học sinh trong lớp
 * - Học sinh chỉ xem được bài nộp của chính mình
 */
const getSubmissionsByAssignment = async (
  assignmentId,
  query = {},
  context = {}
) => {
  const { user, targetAssignmentDoc: preloadedAssignment } = context;

  if (!assignmentId) {
    throw createAppError(
      "Mã bài tập (assignment) là bắt buộc để lấy danh sách bài nộp",
      400
    );
  }

  if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
    throw createAppError("Mã bài tập (assignment) không hợp lệ", 400);
  }

  let assignmentDoc = preloadedAssignment;
  if (!assignmentDoc) {
    assignmentDoc = await Assignment.findOne({
      _id: assignmentId,
      isDeleted: false,
    });

    if (!assignmentDoc) {
      throw createAppError("Bài tập không tồn tại hoặc đã bị xóa", 404);
    }

    if (user) {
      const teachingAssignment = await TeachingAssignment.findOne({
        _id: assignmentDoc.teachingAssignment,
        isDeleted: false,
      });

      if (!teachingAssignment) {
        throw createAppError(
          "Phân công giảng dạy của bài tập không tồn tại",
          404
        );
      }

      if (user.role === "teacher") {
        const assignedTeacherId = (
          teachingAssignment.teacher?._id || teachingAssignment.teacher
        )?.toString();

        if (assignedTeacherId !== user.userId.toString()) {
          throw createAppError(
            "Bạn không phải giáo viên phụ trách bài tập này, không có quyền xem danh sách bài nộp!",
            403
          );
        }
      } else if (user.role === "student") {
        const { studentClass } = await getStudentEnrolledClass(user.userId);
        const assignedClassId = (
          teachingAssignment.class?._id || teachingAssignment.class
        )?.toString();

        if (assignedClassId !== studentClass._id.toString()) {
          throw createAppError(
            "Bạn không thuộc lớp học của bài tập này, không có quyền xem bài nộp!",
            403
          );
        }
      }
    }
  }

  const filter = {
    assignment: assignmentDoc._id || assignmentId,
    isDeleted: false,
  };

  // Nếu là học sinh, chỉ được lấy bài nộp của chính mình
  if (user?.role === "student") {
    filter.student = user.userId || user._id || user.id;
  } else if (query.student) {
    if (!mongoose.Types.ObjectId.isValid(query.student)) {
      throw createAppError("Mã học sinh (student) không hợp lệ", 400);
    }
    filter.student = query.student;
  }

  // Lọc theo trạng thái đúng hạn / trễ hạn (isLate)
  if (query.isLate !== undefined && query.isLate !== "") {
    filter.isLate = query.isLate === "true" || query.isLate === true;
  }

  const submissions = await Submission.find(filter)
    .sort({ submittedAt: -1 })
    .populate("student", "fullName userCode email className")
    .populate("assignment", "title dueDate status attachmentUrl")
    .lean();

  return submissions;
};

/**
 * Lấy bài nộp của học sinh hiện tại cho một bài tập cụ thể
 */
const getMySubmission = async (assignmentId, context = {}) => {
  const { user } = context;

  if (!user) {
    throw createAppError("Chưa xác thực thông tin người dùng!", 401);
  }

  if (!assignmentId || !mongoose.Types.ObjectId.isValid(assignmentId)) {
    throw createAppError("Mã bài tập (assignment) không hợp lệ", 400);
  }

  const studentId = user.userId || user._id || user.id;

  const submission = await Submission.findOne({
    assignment: assignmentId,
    student: studentId,
    isDeleted: false,
  })
    .populate("assignment", "title dueDate status attachmentUrl")
    .lean();

  return submission || null;
};

/**
 * Giáo viên chấm điểm (score) và nhận xét (feedback) cho bài nộp
 */
const gradeSubmission = async (submissionId, data = {}, context = {}) => {
  const { user, targetSubmissionDoc } = context;

  if (!mongoose.Types.ObjectId.isValid(submissionId)) {
    throw createAppError("Mã bài nộp không hợp lệ", 400);
  }

  let submissionDoc = targetSubmissionDoc;
  if (!submissionDoc) {
    submissionDoc = await Submission.findOne({
      _id: submissionId,
      isDeleted: false,
    });

    if (!submissionDoc) {
      throw createAppError("Bài nộp không tồn tại hoặc đã bị xóa", 404);
    }

    if (user?.role === "teacher") {
      const assignmentDoc = await Assignment.findOne({
        _id: submissionDoc.assignment,
        isDeleted: false,
      });
      const teachingAssignment = assignmentDoc
        ? await TeachingAssignment.findOne({
            _id: assignmentDoc.teachingAssignment,
            isDeleted: false,
          })
        : null;

      const assignedTeacherId = (
        teachingAssignment?.teacher?._id || teachingAssignment?.teacher
      )?.toString();

      if (!teachingAssignment || assignedTeacherId !== user.userId.toString()) {
        throw createAppError(
          "Bạn không phải giáo viên phụ trách bài tập này, không có quyền chấm điểm!",
          403
        );
      }
    }
  }

  const { score, feedback } = data;

  if (score !== undefined && score !== null && score !== "") {
    const numericScore = Number(score);
    if (Number.isNaN(numericScore) || numericScore < 0 || numericScore > 10) {
      throw createAppError("Điểm số (score) phải nằm trong khoảng từ 0 đến 10", 400);
    }
    submissionDoc.score = numericScore;
  }

  if (feedback !== undefined) {
    submissionDoc.feedback = String(feedback).trim();
  }

  submissionDoc.gradedAt = new Date();
  if (user?.userId || user?._id) {
    submissionDoc.gradedBy = user.userId || user._id;
  }

  return await submissionDoc.save();
};

module.exports = {
  createAppError,
  calculateIsLate,
  submitAssignment,
  getSubmissionsByAssignment,
  getMySubmission,
  gradeSubmission,
};

