const mongoose = require("mongoose");
const Submission = require("../models/Submission");
const Assignment = require("../models/Assignment");
const TeachingAssignment = require("../models/TeachingAssignment");
const notificationService = require("./notification.service");
const emailNotificationService = require("./emailNotification.service");
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
 * Kiểm tra và chuẩn hóa điểm số (score nằm trong khoảng hợp lệ 0 - 10)
 * @param {number|string} score
 * @returns {number}
 */
const validateScore = (score) => {
  if (
    score === undefined ||
    score === null ||
    String(score).trim() === "" ||
    typeof score === "boolean"
  ) {
    throw createAppError("Điểm số (score) là bắt buộc", 400);
  }

  const numericScore = Number(score);
  if (
    Number.isNaN(numericScore) ||
    !Number.isFinite(numericScore) ||
    numericScore < 0 ||
    numericScore > 10
  ) {
    throw createAppError(
      "Điểm số (score) phải nằm trong khoảng từ 0 đến 10",
      400
    );
  }

  return Math.round(numericScore * 100) / 100;
};

/**
 * Kiểm tra và chuẩn hóa nhận xét của giáo viên (feedback)
 * @param {string} feedback
 * @returns {string}
 */
const validateFeedback = (feedback) => {
  if (feedback === undefined || feedback === null) {
    throw createAppError("Nhận xét của giáo viên (feedback) là bắt buộc", 400);
  }

  const trimmed = String(feedback).trim();
  if (trimmed.length > 2000) {
    throw createAppError(
      "Nhận xét của giáo viên không được vượt quá 2000 ký tự",
      400
    );
  }

  return trimmed;
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
 * Kiểm tra quyền giáo viên phụ trách Assignment của bài nộp
 */
const verifyGradingPermission = async (submissionDoc, user, preloadedAssignment) => {
  if (!user) {
    throw createAppError("Chưa xác thực thông tin người dùng!", 401);
  }

  if (!["admin", "teacher"].includes(user.role)) {
    throw createAppError(
      "Chỉ giáo viên phụ trách hoặc quản trị viên mới có quyền chấm và sửa điểm!",
      403
    );
  }

  let assignmentDoc = preloadedAssignment;
  if (!assignmentDoc) {
    assignmentDoc = await Assignment.findOne({
      _id: submissionDoc.assignment,
      isDeleted: false,
    });
  }

  if (user.role === "teacher") {
    const teachingAssignment = assignmentDoc
      ? await TeachingAssignment.findOne({
          _id: assignmentDoc.teachingAssignment,
          isDeleted: false,
        })
      : null;

    const assignedTeacherId = (
      teachingAssignment?.teacher?._id || teachingAssignment?.teacher
    )?.toString();

    const currentUserId = (user.userId || user._id || user.id)?.toString();

    if (!teachingAssignment || assignedTeacherId !== currentUserId) {
      throw createAppError(
        "Bạn không phải giáo viên phụ trách bài tập này, không có quyền chấm điểm!",
        403
      );
    }
  }

  return assignmentDoc;
};

/**
 * Học sinh nộp bài tập (hoặc nộp lại khi bài tập vẫn đang mở)
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

  if (assignmentDoc.status === "locked") {
    throw createAppError(
      "Bài tập đã bị khóa nhận bài, bạn không thể nộp bài!",
      403
    );
  }

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

  const submittedAt = data.submittedAt ? new Date(data.submittedAt) : new Date();
  if (Number.isNaN(submittedAt.getTime())) {
    throw createAppError("Thời gian nộp bài (submittedAt) không hợp lệ", 400);
  }

  const isLate = calculateIsLate(submittedAt, assignmentDoc.dueDate);
  const note = data.note ? String(data.note).trim() : "";

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
 * - Học sinh chỉ có quyền xem điểm và nhận xét của chính mình
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

  if (user?.role === "student") {
    const currentStudentId = (user.userId || user._id || user.id)?.toString();
    if (query.student && query.student.toString() !== currentStudentId) {
      throw createAppError(
        "Học sinh chỉ có quyền xem điểm và nhận xét của chính mình!",
        403
      );
    }
    filter.student = currentStudentId;
  } else if (query.student) {
    if (!mongoose.Types.ObjectId.isValid(query.student)) {
      throw createAppError("Mã học sinh (student) không hợp lệ", 400);
    }
    filter.student = query.student;
  }

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
 * Lấy chi tiết một bài nộp theo ID
 * - Học sinh chỉ có quyền xem bài nộp, điểm và nhận xét của chính mình
 * - Giáo viên chỉ xem được bài nộp thuộc Assignment do mình phụ trách
 */
const getSubmissionById = async (submissionId, context = {}) => {
  const { user, targetSubmissionDoc } = context;

  if (!mongoose.Types.ObjectId.isValid(submissionId)) {
    throw createAppError("Mã bài nộp không hợp lệ", 400);
  }

  const submissionDoc = await Submission.findOne({
    _id: submissionId,
    isDeleted: false,
  })
    .populate("student", "fullName userCode email className")
    .populate("assignment", "title dueDate status attachmentUrl teachingAssignment")
    .lean();

  if (!submissionDoc) {
    throw createAppError("Bài nộp không tồn tại hoặc đã bị xóa", 404);
  }

  if (user && !targetSubmissionDoc) {
    const currentUserId = (user.userId || user._id || user.id)?.toString();

    if (user.role === "student") {
      const ownerStudentId = (
        submissionDoc.student?._id || submissionDoc.student
      )?.toString();

      if (ownerStudentId !== currentUserId) {
        throw createAppError(
          "Học sinh chỉ có quyền xem điểm và nhận xét của chính mình!",
          403
        );
      }
    } else if (user.role === "teacher") {
      const taId =
        submissionDoc.assignment?.teachingAssignment?._id ||
        submissionDoc.assignment?.teachingAssignment;
      const teachingAssignment = taId
        ? await TeachingAssignment.findOne({ _id: taId, isDeleted: false })
        : null;

      const assignedTeacherId = (
        teachingAssignment?.teacher?._id || teachingAssignment?.teacher
      )?.toString();

      if (!teachingAssignment || assignedTeacherId !== currentUserId) {
        throw createAppError(
          "Bạn không phải giáo viên phụ trách bài tập này, không có quyền xem bài nộp!",
          403
        );
      }
    }
  }

  return submissionDoc;
};

/**
 * Giáo viên chấm điểm (score) và/hoặc gửi nhận xét (feedback) cho bài nộp,
 * đồng thời tự động tạo thông báo (Notification) cho học sinh.
 */
const gradeSubmission = async (submissionId, data = {}, context = {}) => {
  const { user, targetSubmissionDoc, targetAssignmentDoc } = context;

  if (!mongoose.Types.ObjectId.isValid(submissionId)) {
    throw createAppError("Mã bài nộp không hợp lệ", 400);
  }

  const { score, feedback } = data;
  const hasScoreInput = score !== undefined && score !== null && String(score).trim() !== "";
  const hasFeedbackInput = feedback !== undefined && feedback !== null;

  if (!hasScoreInput && !hasFeedbackInput) {
    throw createAppError(
      "Vui lòng cung cấp điểm số (score) hoặc nhận xét (feedback) để cập nhật",
      400
    );
  }

  let validatedScore = null;
  if (hasScoreInput) {
    validatedScore = validateScore(score);
  }

  let validatedFeedback = null;
  if (hasFeedbackInput) {
    validatedFeedback = validateFeedback(feedback);
  }

  let submissionDoc = targetSubmissionDoc;
  let assignmentDoc = targetAssignmentDoc;

  if (!submissionDoc) {
    submissionDoc = await Submission.findOne({
      _id: submissionId,
      isDeleted: false,
    });

    if (!submissionDoc) {
      throw createAppError("Bài nộp không tồn tại hoặc đã bị xóa", 404);
    }

    assignmentDoc = await verifyGradingPermission(
      submissionDoc,
      user,
      assignmentDoc
    );
  } else if (!assignmentDoc && submissionDoc.assignment) {
    try {
      assignmentDoc = await Assignment.findOne({
        _id: submissionDoc.assignment,
        isDeleted: false,
      });
    } catch {
      assignmentDoc = null;
    }
  }

  if (hasScoreInput) {
    submissionDoc.score = validatedScore;
  }

  if (hasFeedbackInput) {
    submissionDoc.feedback = validatedFeedback;
  }

  submissionDoc.gradedAt = new Date();
  if (user?.userId || user?._id || user?.id) {
    submissionDoc.gradedBy = user.userId || user._id || user.id;
  }

  const savedSubmission = await submissionDoc.save();

  // Trigger tạo thông báo cho học sinh khi điểm số / nhận xét được cập nhật
  try {
    await notificationService.createGradingNotification({
      recipient: submissionDoc.student,
      sender: user?.userId || user?._id || user?.id || null,
      submission: savedSubmission,
      assignment: assignmentDoc,
      score: submissionDoc.score,
      feedback: submissionDoc.feedback,
    });
  } catch (notifyErr) {
    console.error(
      "[Submission] Không thể tạo thông báo kết quả chấm bài:",
      notifyErr.message
    );
  }

  // Trigger gửi email cảnh báo kết quả học tập / điểm thấp (< 5.0) cho Phụ huynh được liên kết
  if (hasScoreInput) {
    try {
      await emailNotificationService.triggerParentAcademicGradeEmail({
        student: submissionDoc.student,
        submission: savedSubmission,
        teachingAssignment: assignmentDoc?.teachingAssignment || null,
        score: submissionDoc.score,
        gradeType: "assignment",
        note: submissionDoc.feedback,
      });
    } catch (emailErr) {
      console.error(
        "[Submission] Không thể gửi email kết quả chấm bài cho Phụ huynh:",
        emailErr.message
      );
    }
  }

  return savedSubmission;
};

/**
 * API chuyên biệt: Cập nhật điểm số (score) cho bài nộp
 */
const updateSubmissionScore = async (submissionId, data = {}, context = {}) => {
  const validatedScore = validateScore(data.score);
  return await gradeSubmission(
    submissionId,
    {
      score: validatedScore,
      ...(data.feedback !== undefined ? { feedback: data.feedback } : {}),
    },
    context
  );
};

/**
 * API chuyên biệt: Cập nhật nhận xét (feedback) của giáo viên cho bài nộp
 */
const updateSubmissionFeedback = async (
  submissionId,
  data = {},
  context = {}
) => {
  const validatedFeedback = validateFeedback(data.feedback);
  return await gradeSubmission(
    submissionId,
    {
      feedback: validatedFeedback,
      ...(data.score !== undefined ? { score: data.score } : {}),
    },
    context
  );
};

module.exports = {
  createAppError,
  validateScore,
  validateFeedback,
  calculateIsLate,
  submitAssignment,
  getSubmissionsByAssignment,
  getMySubmission,
  getSubmissionById,
  gradeSubmission,
  updateSubmissionScore,
  updateSubmissionFeedback,
};
