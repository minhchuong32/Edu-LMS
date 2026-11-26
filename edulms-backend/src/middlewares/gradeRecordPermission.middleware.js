const mongoose = require("mongoose");
const GradeRecord = require("../models/GradeRecord");
const TeachingAssignment = require("../models/TeachingAssignment");
const Class = require("../models/Class");
const User = require("../models/User");
const { getStudentEnrolledClass } = require("./lessonPermission.middleware");
const { errorResponse } = require("../utils/apiResponse");

/**
 * Kiểm tra giáo viên có phụ trách TeachingAssignment (giáo viên bộ môn hoặc GVCN lớp đó) hay không
 */
const isTeacherAuthorizedForAssignment = async (
  teachingAssignment,
  userId,
  allowHomeroomView = false
) => {
  if (!teachingAssignment || !userId) return false;

  const assignedTeacherId = (
    teachingAssignment.teacher?._id || teachingAssignment.teacher
  )?.toString();

  if (assignedTeacherId === userId.toString()) {
    return true;
  }

  if (allowHomeroomView && teachingAssignment.class) {
    const classId = teachingAssignment.class?._id || teachingAssignment.class;
    const classDoc = await Class.findOne({ _id: classId, isDeleted: false });
    const homeroomId = (
      classDoc?.homeroomTeacher?._id || classDoc?.homeroomTeacher
    )?.toString();
    if (homeroomId && homeroomId === userId.toString()) {
      return true;
    }
  }

  return false;
};

/**
 * Middleware kiểm tra quyền NHẬP ĐIỂM (canManageGradeRecord)
 * Quy tắc:
 * 1. Bắt buộc đăng nhập (401).
 * 2. Chỉ 'teacher' hoặc 'admin' được phép nhập điểm (403 đối với 'student', 'parent').
 * 3. Nếu là 'teacher', bắt buộc phải là giáo viên phụ trách trong TeachingAssignment (Chống IDOR - 403).
 */
const canManageGradeRecord = async (req, res, next) => {
  try {
    if (!req.user) {
      return errorResponse(res, "Chưa xác thực thông tin người dùng!", 401);
    }

    const { role, userId } = req.user;

    if (!["admin", "teacher"].includes(role)) {
      return errorResponse(
        res,
        `Tài khoản với vai trò '${role}' không có quyền nhập hoặc chỉnh sửa điểm!`,
        403
      );
    }

    const teachingAssignmentId =
      req.body?.teachingAssignment ||
      req.params?.teachingAssignmentId ||
      (Array.isArray(req.body?.records) &&
        req.body.records[0]?.teachingAssignment);

    if (!teachingAssignmentId) {
      return errorResponse(
        res,
        "Phân công giảng dạy (teachingAssignment) là bắt buộc!",
        400
      );
    }

    if (!mongoose.Types.ObjectId.isValid(teachingAssignmentId)) {
      return errorResponse(
        res,
        "Mã phân công giảng dạy (teachingAssignment) không hợp lệ!",
        400
      );
    }

    const teachingAssignment = await TeachingAssignment.findOne({
      _id: teachingAssignmentId,
      isDeleted: false,
    });

    if (!teachingAssignment) {
      return errorResponse(
        res,
        "Phân công giảng dạy không tồn tại hoặc đã bị xóa!",
        404
      );
    }

    if (role === "teacher") {
      const isAuthorized = await isTeacherAuthorizedForAssignment(
        teachingAssignment,
        userId,
        false
      );

      if (!isAuthorized) {
        return errorResponse(
          res,
          "Bạn không được phân công giảng dạy lớp và môn học này, không có quyền nhập hoặc sửa điểm!",
          403
        );
      }
    }

    req.targetTeachingAssignment = teachingAssignment;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware kiểm tra quyền SỬA / XÓA một bản ghi điểm (canModifyGradeRecord)
 * Quy tắc:
 * 1. Bắt buộc đăng nhập (401).
 * 2. Chỉ 'teacher' hoặc 'admin' được phép thao tác (403).
 * 3. Kiểm tra bản ghi điểm tồn tại (404).
 * 4. Giáo viên chỉ được sửa/xóa điểm thuộc TeachingAssignment do mình phụ trách (403).
 */
const canModifyGradeRecord = async (req, res, next) => {
  try {
    if (!req.user) {
      return errorResponse(res, "Chưa xác thực thông tin người dùng!", 401);
    }

    const { role, userId } = req.user;

    if (!["admin", "teacher"].includes(role)) {
      return errorResponse(
        res,
        `Tài khoản với vai trò '${role}' không có quyền chỉnh sửa hoặc xóa điểm!`,
        403
      );
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, "Mã bản ghi điểm không hợp lệ!", 400);
    }

    const gradeRecord = await GradeRecord.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!gradeRecord) {
      return errorResponse(
        res,
        "Bản ghi điểm không tồn tại hoặc đã bị xóa!",
        404
      );
    }

    const teachingAssignmentId =
      gradeRecord.teachingAssignment?._id || gradeRecord.teachingAssignment;

    const teachingAssignment = await TeachingAssignment.findOne({
      _id: teachingAssignmentId,
      isDeleted: false,
    });

    if (!teachingAssignment) {
      return errorResponse(
        res,
        "Phân công giảng dạy của bản ghi điểm này không tồn tại hoặc đã bị xóa!",
        404
      );
    }

    if (role === "teacher") {
      const isAuthorized = await isTeacherAuthorizedForAssignment(
        teachingAssignment,
        userId,
        false
      );

      if (!isAuthorized) {
        return errorResponse(
          res,
          "Bạn không phải giáo viên phụ trách lớp/môn học này, không có quyền sửa hoặc xóa điểm!",
          403
        );
      }
    }

    req.targetGradeRecord = gradeRecord;
    req.targetTeachingAssignment = teachingAssignment;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware kiểm tra quyền TRUY VẤN bảng điểm và điểm trung bình (canViewGradeRecords)
 * Quy tắc:
 * 1. Bắt buộc đăng nhập (401).
 * 2. Nếu là Teacher: chỉ được truy vấn các TeachingAssignment do mình phụ trách (hoặc lớp mình chủ nhiệm).
 * 3. Nếu là Student: chỉ được xem điểm của chính mình và thuộc lớp mình đang học.
 */
const canViewGradeRecords = async (req, res, next) => {
  try {
    if (!req.user) {
      return errorResponse(res, "Chưa xác thực thông tin người dùng!", 401);
    }

    const { role, userId } = req.user;
    const teachingAssignmentId =
      req.params.teachingAssignmentId ||
      req.query.teachingAssignment ||
      req.body?.teachingAssignment;

    if (role === "student") {
      const requestedStudentId =
        req.params.studentId || req.query.student || req.query.studentId;

      if (
        requestedStudentId &&
        requestedStudentId.toString() !== userId.toString()
      ) {
        return errorResponse(
          res,
          "Học sinh chỉ có quyền xem điểm số của chính mình!",
          403
        );
      }

      req.query.student = userId.toString();
    } else if (role === "parent") {
      // Kiểm tra quyền xem điểm của Phụ huynh dựa trên childrenRefs
      const parentQuery = User.findOne({
        _id: userId,
        role: "parent",
        isDeleted: { $ne: true },
      });
      const parentDoc =
        parentQuery && typeof parentQuery.select === "function"
          ? await parentQuery.select("_id childrenRefs").lean()
          : await parentQuery;

      const childrenIdStrings = Array.isArray(parentDoc?.childrenRefs)
        ? parentDoc.childrenRefs
            .map((c) => (c?._id || c)?.toString())
            .filter(Boolean)
        : [];

      const requestedStudentId =
        req.params.studentId || req.query.student || req.query.studentId;

      if (
        requestedStudentId &&
        !childrenIdStrings.includes(requestedStudentId.toString())
      ) {
        return errorResponse(
          res,
          "Phụ huynh chỉ có quyền xem điểm số của các học sinh được liên kết trong danh sách con (childrenRefs)!",
          403
        );
      }

      req.authorizedChildrenIds = childrenIdStrings;
    }

    if (teachingAssignmentId) {
      if (!mongoose.Types.ObjectId.isValid(teachingAssignmentId)) {
        return errorResponse(
          res,
          "Mã phân công giảng dạy (teachingAssignment) không hợp lệ!",
          400
        );
      }

      const teachingAssignment = await TeachingAssignment.findOne({
        _id: teachingAssignmentId,
        isDeleted: false,
      });

      if (!teachingAssignment) {
        return errorResponse(
          res,
          "Phân công giảng dạy không tồn tại hoặc đã bị xóa!",
          404
        );
      }

      if (role === "teacher") {
        const isAuthorized = await isTeacherAuthorizedForAssignment(
          teachingAssignment,
          userId,
          true
        );

        if (!isAuthorized) {
          return errorResponse(
            res,
            "Bạn không được phân công giảng dạy lớp/môn học này, không có quyền truy cập sổ điểm!",
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
            "Bạn không thuộc lớp học này, không có quyền truy cập sổ điểm!",
            403
          );
        }

        req.studentClass = studentClass;
      }

      req.targetTeachingAssignment = teachingAssignment;
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  isTeacherAuthorizedForAssignment,
  canManageGradeRecord,
  canModifyGradeRecord,
  canViewGradeRecords,
};

