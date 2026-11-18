const mongoose = require("mongoose");
const Assignment = require("../models/Assignment");
const Submission = require("../models/Submission");
const TeachingAssignment = require("../models/TeachingAssignment");
const { getStudentEnrolledClass } = require("./lessonPermission.middleware");
const { errorResponse } = require("../utils/apiResponse");

/**
 * Middleware kiểm tra quyền NỘP BÀI TẬP của Học sinh (canSubmitAssignment)
 * Quy tắc:
 * 1. Bắt buộc đăng nhập (401).
 * 2. Chỉ tài khoản có vai trò 'student' mới được nộp bài (403).
 * 3. Bài tập phải tồn tại (404) và đang mở nhận bài (status === 'open').
 *    Nếu bài tập đã ở trạng thái 'locked' -> từ chối nộp bài (403).
 * 4. Học sinh phải thuộc đúng lớp học trong TeachingAssignment của bài tập đó (403 - Chống IDOR).
 */
const canSubmitAssignment = async (req, res, next) => {
  try {
    if (!req.user) {
      return errorResponse(res, "Chưa xác thực thông tin người dùng!", 401);
    }

    const { role, userId } = req.user;

    if (role !== "student") {
      return errorResponse(
        res,
        "Chỉ tài khoản học sinh mới có quyền nộp bài tập!",
        403
      );
    }

    const assignmentId =
      req.params.assignmentId || req.params.id || req.body?.assignment;

    if (!assignmentId) {
      return errorResponse(res, "Mã bài tập (assignment) là bắt buộc!", 400);
    }

    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
      return errorResponse(
        res,
        "Mã bài tập (assignment) không đúng định dạng!",
        400
      );
    }

    const assignmentDoc = await Assignment.findOne({
      _id: assignmentId,
      isDeleted: false,
    });

    if (!assignmentDoc) {
      return errorResponse(
        res,
        "Bài tập không tồn tại hoặc đã bị xóa!",
        404
      );
    }

    if (assignmentDoc.isActive === false) {
      return errorResponse(
        res,
        "Bài tập hiện chưa được công khai!",
        403
      );
    }

    // Kiểm tra trạng thái mở/khóa của bài tập
    if (assignmentDoc.status === "locked") {
      return errorResponse(
        res,
        "Bài tập đã bị khóa nhận bài, bạn không thể nộp bài!",
        403
      );
    }

    // Kiểm tra học sinh có thuộc lớp của bài tập không
    let enrolled;
    try {
      enrolled = await getStudentEnrolledClass(userId);
    } catch (err) {
      return errorResponse(res, err.message, err.statusCode || 403);
    }

    const { student, studentClass } = enrolled;

    const teachingAssignmentId =
      assignmentDoc.teachingAssignment?._id || assignmentDoc.teachingAssignment;

    const teachingAssignment = await TeachingAssignment.findOne({
      _id: teachingAssignmentId,
      isDeleted: false,
    });

    const assignedClassId = (
      teachingAssignment?.class?._id || teachingAssignment?.class
    )?.toString();

    if (
      !teachingAssignment ||
      assignedClassId !== studentClass._id.toString()
    ) {
      return errorResponse(
        res,
        "Bạn không thuộc lớp học của bài tập này, không có quyền nộp bài!",
        403
      );
    }

    req.student = student;
    req.studentClass = studentClass;
    req.targetAssignmentDoc = assignmentDoc;
    req.targetTeachingAssignment = teachingAssignment;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware kiểm tra quyền LẤY DANH SÁCH BÀI NỘP theo Bài tập (canViewSubmissionsByAssignment)
 * Quy tắc:
 * 1. Bắt buộc đăng nhập (401).
 * 2. Giáo viên chỉ được xem danh sách bài nộp của bài tập thuộc TeachingAssignment do mình phụ trách (403).
 * 3. Học sinh chỉ được truy cập bài tập thuộc lớp mình (và chỉ xem được bài nộp của chính mình).
 */
const canViewSubmissionsByAssignment = async (req, res, next) => {
  try {
    if (!req.user) {
      return errorResponse(res, "Chưa xác thực thông tin người dùng!", 401);
    }

    const { role, userId } = req.user;

    if (!["admin", "teacher", "student"].includes(role)) {
      return errorResponse(
        res,
        `Tài khoản với vai trò '${role}' không có quyền xem danh sách bài nộp!`,
        403
      );
    }

    const assignmentId =
      req.params.assignmentId || req.params.id || req.query.assignment;

    if (!assignmentId) {
      return errorResponse(
        res,
        "Mã bài tập (assignment) là bắt buộc để lấy danh sách bài nộp!",
        400
      );
    }

    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
      return errorResponse(
        res,
        "Mã bài tập (assignment) không đúng định dạng!",
        400
      );
    }

    const assignmentDoc = await Assignment.findOne({
      _id: assignmentId,
      isDeleted: false,
    });

    if (!assignmentDoc) {
      return errorResponse(
        res,
        "Bài tập không tồn tại hoặc đã bị xóa!",
        404
      );
    }

    const teachingAssignmentId =
      assignmentDoc.teachingAssignment?._id || assignmentDoc.teachingAssignment;

    const teachingAssignment = await TeachingAssignment.findOne({
      _id: teachingAssignmentId,
      isDeleted: false,
    });

    if (!teachingAssignment) {
      return errorResponse(
        res,
        "Phân công giảng dạy của bài tập không tồn tại hoặc đã bị xóa!",
        404
      );
    }

    if (role === "teacher") {
      const assignedTeacherId = (
        teachingAssignment.teacher?._id || teachingAssignment.teacher
      )?.toString();

      if (assignedTeacherId !== userId.toString()) {
        return errorResponse(
          res,
          "Bạn không phải giáo viên phụ trách bài tập này, không có quyền xem danh sách bài nộp!",
          403
        );
      }
    } else if (role === "student") {
      let enrolled;
      try {
        enrolled = await getStudentEnrolledClass(userId);
      } catch (err) {
        return errorResponse(res, err.message, err.statusCode || 403);
      }

      const { studentClass } = enrolled;
      const assignedClassId = (
        teachingAssignment.class?._id || teachingAssignment.class
      )?.toString();

      if (assignedClassId !== studentClass._id.toString()) {
        return errorResponse(
          res,
          "Bạn không thuộc lớp học của bài tập này, không có quyền xem bài nộp!",
          403
        );
      }

      req.studentClass = studentClass;
    }

    req.targetAssignmentDoc = assignmentDoc;
    req.targetTeachingAssignment = teachingAssignment;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware kiểm tra quyền CHẤM ĐIỂM & NHẬN XÉT bài nộp (canGradeSubmission)
 */
const canGradeSubmission = async (req, res, next) => {
  try {
    if (!req.user) {
      return errorResponse(res, "Chưa xác thực thông tin người dùng!", 401);
    }

    const { role, userId } = req.user;

    if (!["admin", "teacher"].includes(role)) {
      return errorResponse(
        res,
        "Chỉ giáo viên phụ trách hoặc quản trị viên mới có quyền chấm điểm bài nộp!",
        403
      );
    }

    const submissionId = req.params.submissionId || req.params.id;
    if (!mongoose.Types.ObjectId.isValid(submissionId)) {
      return errorResponse(res, "Mã bài nộp không hợp lệ!", 400);
    }

    const submissionDoc = await Submission.findOne({
      _id: submissionId,
      isDeleted: false,
    });

    if (!submissionDoc) {
      return errorResponse(
        res,
        "Bài nộp không tồn tại hoặc đã bị xóa!",
        404
      );
    }

    const assignmentDoc = await Assignment.findOne({
      _id: submissionDoc.assignment,
      isDeleted: false,
    });

    if (!assignmentDoc) {
      return errorResponse(
        res,
        "Bài tập của bài nộp này không tồn tại!",
        404
      );
    }

    if (role === "teacher") {
      const teachingAssignment = await TeachingAssignment.findOne({
        _id: assignmentDoc.teachingAssignment,
        isDeleted: false,
      });

      const assignedTeacherId = (
        teachingAssignment?.teacher?._id || teachingAssignment?.teacher
      )?.toString();

      if (!teachingAssignment || assignedTeacherId !== userId.toString()) {
        return errorResponse(
          res,
          "Bạn không phải giáo viên phụ trách bài tập này, không có quyền chấm điểm!",
          403
        );
      }

      req.targetTeachingAssignment = teachingAssignment;
    }

    req.targetSubmissionDoc = submissionDoc;
    req.targetAssignmentDoc = assignmentDoc;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware kiểm tra quyền XEM CHI TIẾT một bài nộp (điểm & nhận xét) - canViewSubmissionDetail
 * Quy tắc:
 * 1. Bắt buộc đăng nhập (401).
 * 2. Học sinh chỉ có quyền xem điểm và nhận xét của chính mình (403 nếu xem của học sinh khác - Chống IDOR).
 * 3. Giáo viên chỉ có quyền xem bài nộp thuộc Assignment do mình phụ trách (403 nếu của GV khác).
 */
const canViewSubmissionDetail = async (req, res, next) => {
  try {
    if (!req.user) {
      return errorResponse(res, "Chưa xác thực thông tin người dùng!", 401);
    }

    const { role, userId } = req.user;
    const submissionId = req.params.submissionId || req.params.id;

    if (!mongoose.Types.ObjectId.isValid(submissionId)) {
      return errorResponse(res, "Mã bài nộp không hợp lệ!", 400);
    }

    const submissionDoc = await Submission.findOne({
      _id: submissionId,
      isDeleted: false,
    });

    if (!submissionDoc) {
      return errorResponse(
        res,
        "Bài nộp không tồn tại hoặc đã bị xóa!",
        404
      );
    }

    if (role === "student") {
      const ownerStudentId = (
        submissionDoc.student?._id || submissionDoc.student
      )?.toString();

      if (ownerStudentId !== userId.toString()) {
        return errorResponse(
          res,
          "Học sinh chỉ có quyền xem điểm và nhận xét của chính mình!",
          403
        );
      }
    } else if (role === "teacher") {
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

      if (!teachingAssignment || assignedTeacherId !== userId.toString()) {
        return errorResponse(
          res,
          "Bạn không phải giáo viên phụ trách bài tập này, không có quyền xem bài nộp!",
          403
        );
      }

      req.targetAssignmentDoc = assignmentDoc;
      req.targetTeachingAssignment = teachingAssignment;
    } else if (role !== "admin") {
      return errorResponse(
        res,
        `Tài khoản với vai trò '${role}' không có quyền xem bài nộp!`,
        403
      );
    }

    req.targetSubmissionDoc = submissionDoc;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  canSubmitAssignment,
  canViewSubmissionsByAssignment,
  canGradeSubmission,
  canViewSubmissionDetail,
};

