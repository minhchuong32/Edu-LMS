const mongoose = require("mongoose");
const Assignment = require("../models/Assignment");
const TeachingAssignment = require("../models/TeachingAssignment");
const { getStudentEnrolledClass } = require("./lessonPermission.middleware");
const { errorResponse } = require("../utils/apiResponse");

/**
 * Middleware kiểm tra quyền TẠO bài tập (canCreateAssignment)
 * Quy tắc:
 * 1. Bắt buộc đăng nhập (401).
 * 2. Chỉ 'teacher' (hoặc 'admin') được tạo. 'student'/'parent' bị từ chối (403).
 * 3. Nếu là 'teacher', bắt buộc phải là giáo viên được phân công trong TeachingAssignment (Chống IDOR).
 */
const canCreateAssignment = async (req, res, next) => {
  try {
    if (!req.user) {
      return errorResponse(res, "Chưa xác thực thông tin người dùng!", 401);
    }

    const { role, userId } = req.user;

    if (!["admin", "teacher"].includes(role)) {
      return errorResponse(
        res,
        `Tài khoản với vai trò '${role}' không có quyền tạo bài tập!`,
        403
      );
    }

    const { teachingAssignment } = req.body;

    if (!teachingAssignment) {
      return errorResponse(
        res,
        "Phân công giảng dạy (teachingAssignment) là bắt buộc!",
        400
      );
    }

    if (!mongoose.Types.ObjectId.isValid(teachingAssignment)) {
      return errorResponse(
        res,
        "Mã phân công giảng dạy (teachingAssignment) không hợp lệ!",
        400
      );
    }

    const assignment = await TeachingAssignment.findOne({
      _id: teachingAssignment,
      isDeleted: false,
    });

    if (!assignment) {
      return errorResponse(
        res,
        "Phân công giảng dạy không tồn tại hoặc đã bị xóa!",
        404
      );
    }

    const assignedTeacherId = (
      assignment.teacher?._id || assignment.teacher
    )?.toString();

    // Chống IDOR: Chỉ giáo viên được phân công mới được tạo bài tập cho TeachingAssignment này
    if (role === "teacher" && assignedTeacherId !== userId.toString()) {
      return errorResponse(
        res,
        "Bạn không được phân công giảng dạy lớp học này, không có quyền tạo bài tập!",
        403
      );
    }

    req.targetTeachingAssignment = assignment;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware kiểm tra quyền CHỈNH SỬA, XÓA hoặc MỞ/KHÓA bài tập (canModifyAssignment)
 * Quy tắc:
 * 1. Bắt buộc đăng nhập (401).
 * 2. Chỉ 'teacher' (hoặc 'admin') được phép thao tác. 'student'/'parent' bị từ chối (403).
 * 3. Kiểm tra bài tập tồn tại (404).
 * 4. Giáo viên chỉ có quyền chỉnh sửa, xóa và mở/khóa bài tập thuộc TeachingAssignment của mình (Chống IDOR).
 */
const canModifyAssignment = async (req, res, next) => {
  try {
    if (!req.user) {
      return errorResponse(res, "Chưa xác thực thông tin người dùng!", 401);
    }

    const { role, userId } = req.user;

    if (!["admin", "teacher"].includes(role)) {
      return errorResponse(
        res,
        `Tài khoản với vai trò '${role}' không có quyền thao tác trên bài tập!`,
        403
      );
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, "Mã bài tập không hợp lệ!", 400);
    }

    const assignmentDoc = await Assignment.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!assignmentDoc) {
      return errorResponse(
        res,
        "Bài tập không tồn tại hoặc đã bị xóa!",
        404
      );
    }

    // Kiểm tra quyền sở hữu qua TeachingAssignment đối với Giáo viên
    if (role === "teacher") {
      const teachingAssignmentId =
        assignmentDoc.teachingAssignment?._id || assignmentDoc.teachingAssignment;

      const teachingAssignment = await TeachingAssignment.findOne({
        _id: teachingAssignmentId,
        isDeleted: false,
      });

      const assignedTeacherId = (
        teachingAssignment?.teacher?._id || teachingAssignment?.teacher
      )?.toString();

      if (!teachingAssignment || assignedTeacherId !== userId.toString()) {
        return errorResponse(
          res,
          "Bạn không phải giáo viên phụ trách bài tập này, không có quyền chỉnh sửa, xóa hoặc khóa/mở bài tập!",
          403
        );
      }

      req.targetTeachingAssignment = teachingAssignment;
    }

    req.targetAssignmentDoc = assignmentDoc;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware kiểm tra quyền TRUY CẬP danh sách bài tập theo TeachingAssignment hoặc Lớp - Môn
 * (canAccessTeachingAssignment)
 * Quy tắc:
 * 1. Bắt buộc đăng nhập (401).
 * 2. Nếu truyền teachingAssignment:
 *    - Teacher chỉ được truy cập TeachingAssignment do mình phụ trách (403 nếu của GV khác).
 *    - Student chỉ được truy cập TeachingAssignment thuộc lớp mình đang học (403 nếu lớp khác).
 * 3. Nếu Student truyền classId: phải khớp với lớp của Student.
 */
const canAccessTeachingAssignment = async (req, res, next) => {
  try {
    if (!req.user) {
      return errorResponse(res, "Chưa xác thực thông tin người dùng!", 401);
    }

    const { role, userId } = req.user;
    const teachingAssignmentId =
      req.params.teachingAssignmentId ||
      req.query.teachingAssignment ||
      req.body?.teachingAssignment;

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
        const assignedTeacherId = (
          teachingAssignment.teacher?._id || teachingAssignment.teacher
        )?.toString();

        if (assignedTeacherId !== userId.toString()) {
          return errorResponse(
            res,
            "Bạn không được phân công giảng dạy lớp/môn học này, không có quyền truy cập bài tập!",
            403
          );
        }
      }

      if (role === "student") {
        let enrolled;
        try {
          enrolled = await getStudentEnrolledClass(userId);
        } catch (err) {
          return errorResponse(res, err.message, err.statusCode || 403);
        }

        const { studentClass } = enrolled;
        req.studentClass = studentClass;

        const assignedClassId = (
          teachingAssignment.class?._id || teachingAssignment.class
        )?.toString();

        if (assignedClassId !== studentClass._id.toString()) {
          return errorResponse(
            res,
            "Bạn không thuộc lớp học này, không có quyền truy cập bài tập!",
            403
          );
        }
      }

      req.targetTeachingAssignment = teachingAssignment;
    } else if (role === "student") {
      let enrolled;
      try {
        enrolled = await getStudentEnrolledClass(userId);
      } catch (err) {
        return errorResponse(res, err.message, err.statusCode || 403);
      }

      const { studentClass } = enrolled;
      req.studentClass = studentClass;

      const requestedClassId =
        req.params.classId || req.query.classId || req.query.class;

      if (
        requestedClassId &&
        requestedClassId.toString() !== studentClass._id.toString()
      ) {
        return errorResponse(
          res,
          "Bạn không thuộc lớp học này, không có quyền truy cập danh sách bài tập!",
          403
        );
      }

      req.query.classId = studentClass._id.toString();
      if (req.params.classId) {
        req.params.classId = studentClass._id.toString();
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware kiểm tra quyền XEM CHI TIẾT một bài tập (canViewAssignmentDetail)
 * Quy tắc:
 * 1. Bắt buộc đăng nhập (401).
 * 2. Kiểm tra bài tập có tồn tại không (404).
 * 3. Nếu là Teacher: chỉ xem được bài tập thuộc phân công giảng dạy của mình (403 nếu của GV khác).
 * 4. Nếu là Student:
 *    - Bài tập phải đang isActive: true.
 *    - Bài tập phải thuộc TeachingAssignment của lớp mà học sinh đang học (403 nếu lớp khác).
 */
const canViewAssignmentDetail = async (req, res, next) => {
  try {
    if (!req.user) {
      return errorResponse(res, "Chưa xác thực thông tin người dùng!", 401);
    }

    const { role, userId } = req.user;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, "Mã bài tập không hợp lệ!", 400);
    }

    const assignmentDoc = await Assignment.findOne({
      _id: id,
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

    if (role === "teacher") {
      const assignedTeacherId = (
        teachingAssignment?.teacher?._id || teachingAssignment?.teacher
      )?.toString();

      if (!teachingAssignment || assignedTeacherId !== userId.toString()) {
        return errorResponse(
          res,
          "Bạn không được phân công giảng dạy lớp/môn học này, không có quyền xem bài tập!",
          403
        );
      }
    }

    if (role === "student") {
      if (!assignmentDoc.isActive) {
        return errorResponse(
          res,
          "Bài tập hiện chưa được công khai!",
          403
        );
      }

      let enrolled;
      try {
        enrolled = await getStudentEnrolledClass(userId);
      } catch (err) {
        return errorResponse(res, err.message, err.statusCode || 403);
      }

      const { studentClass } = enrolled;
      const assignedClassId = (
        teachingAssignment?.class?._id || teachingAssignment?.class
      )?.toString();

      if (!teachingAssignment || assignedClassId !== studentClass._id.toString()) {
        return errorResponse(
          res,
          "Bạn không thuộc lớp học này, không có quyền truy cập bài tập!",
          403
        );
      }
    }

    req.targetAssignmentDoc = assignmentDoc;
    req.targetTeachingAssignment = teachingAssignment;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  canCreateAssignment,
  canModifyAssignment,
  canAccessTeachingAssignment,
  canViewAssignmentDetail,
};

