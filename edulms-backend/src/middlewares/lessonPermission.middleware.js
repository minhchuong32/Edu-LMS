const mongoose = require("mongoose");
const User = require("../models/User");
const Class = require("../models/Class");
const LessonContent = require("../models/LessonContent");
const TeachingAssignment = require("../models/TeachingAssignment");
const { errorResponse } = require("../utils/apiResponse");

/**
 * Hàm tiện ích: Lấy và kiểm tra lớp học mà học sinh đang theo học
 * @param {string} userId - ID của tài khoản học sinh
 * @returns {Promise<{ student: object, studentClass: object }>}
 */
const getStudentEnrolledClass = async (userId) => {
  const student = await User.findById(userId).select(
    "fullName userCode role classRef className isActivated"
  );

  if (!student || student.role !== "student") {
    const error = new Error("Tài khoản không phải là học sinh hợp lệ!");
    error.statusCode = 403;
    throw error;
  }

  // Kiểm tra học sinh đã được phân lớp chưa
  if (!student.classRef && !student.className) {
    const error = new Error(
      "Học sinh chưa được phân công vào bất kỳ lớp học nào!"
    );
    error.statusCode = 403;
    throw error;
  }

  const classQuery = student.classRef
    ? { _id: student.classRef, isDeleted: false }
    : { name: student.className, isDeleted: false };

  const studentClass = await Class.findOne(classQuery);
  if (!studentClass) {
    const error = new Error(
      "Lớp học của học sinh không tồn tại hoặc đã bị xóa!"
    );
    error.statusCode = 404;
    throw error;
  }

  return { student, studentClass };
};

/**
 * Middleware kiểm tra quyền TẠO bài giảng (canCreateLesson)
 * Quy tắc:
 * 1. Bắt buộc đăng nhập (401).
 * 2. Chỉ 'admin' hoặc 'teacher' được tạo. 'student'/'parent' bị từ chối (403).
 * 3. Nếu là 'teacher', chỉ được tạo cho TeachingAssignment của mình (ngăn chặn IDOR).
 */
const canCreateLesson = async (req, res, next) => {
  try {
    if (!req.user) {
      return errorResponse(res, "Chưa xác thực thông tin người dùng!", 401);
    }

    const { role, userId } = req.user;

    // Học sinh và phụ huynh không có quyền tạo bài giảng
    if (!["admin", "teacher"].includes(role)) {
      return errorResponse(
        res,
        `Tài khoản với vai trò '${role}' không có quyền tạo nội dung bài giảng!`,
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

    // Chống IDOR: Giáo viên chỉ được tạo bài giảng cho phân công của chính mình
    if (
      role === "teacher" &&
      assignment.teacher.toString() !== userId.toString()
    ) {
      return errorResponse(
        res,
        "Bạn không được phân công giảng dạy lớp học này, không có quyền tạo nội dung bài giảng!",
        403
      );
    }

    req.targetAssignment = assignment;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware kiểm tra quyền CẬP NHẬT hoặc XÓA bài giảng (canModifyLesson)
 * Quy tắc:
 * 1. Bắt buộc đăng nhập (401).
 * 2. Chỉ 'admin' hoặc 'teacher' được sửa/xóa. 'student'/'parent' bị từ chối (403).
 * 3. Kiểm tra tính hợp lệ của bài giảng.
 * 4. Giáo viên chỉ được sửa/xóa bài giảng thuộc phân công của mình (ngăn chặn IDOR).
 */
const canModifyLesson = async (req, res, next) => {
  try {
    if (!req.user) {
      return errorResponse(res, "Chưa xác thực thông tin người dùng!", 401);
    }

    const { role, userId } = req.user;

    // Học sinh và phụ huynh không có quyền sửa/xóa bài giảng
    if (!["admin", "teacher"].includes(role)) {
      return errorResponse(
        res,
        `Tài khoản với vai trò '${role}' không có quyền thao tác trên nội dung bài giảng!`,
        403
      );
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, "Mã bài giảng không hợp lệ!", 400);
    }

    const lesson = await LessonContent.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!lesson) {
      return errorResponse(
        res,
        "Nội dung bài giảng không tồn tại hoặc đã bị xóa!",
        404
      );
    }

    // Chống IDOR: Đối chiếu giáo viên phụ trách
    if (role === "teacher") {
      const assignment = await TeachingAssignment.findOne({
        _id: lesson.teachingAssignment,
        isDeleted: false,
      });

      if (!assignment || assignment.teacher.toString() !== userId.toString()) {
        return errorResponse(
          res,
          "Bạn không phải giáo viên phụ trách bài giảng này, không có quyền chỉnh sửa hoặc xóa!",
          403
        );
      }
      req.targetAssignment = assignment;
    }

    req.targetLesson = lesson;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware kiểm tra quyền XEM danh sách bài giảng theo Lớp và Môn học của Student
 * (canStudentAccessClassLessons)
 * Quy tắc:
 * 1. Yêu cầu đăng nhập (401).
 * 2. Nếu là Student:
 *    - Xác định lớp học hiện tại từ CSDL (User.classRef / User.className).
 *    - Nếu học sinh chưa có lớp: từ chối 403.
 *    - Nếu học sinh truyền classId khác với lớp của mình: từ chối 403 (Chống IDOR).
 *    - Buộc request sử dụng đúng classId của học sinh đó.
 */
const canStudentAccessClassLessons = async (req, res, next) => {
  try {
    if (!req.user) {
      return errorResponse(res, "Chưa xác thực thông tin người dùng!", 401);
    }

    if (req.user.role === "student") {
      let enrolled;
      try {
        enrolled = await getStudentEnrolledClass(req.user.userId);
      } catch (err) {
        return errorResponse(res, err.message, err.statusCode || 403);
      }

      const { studentClass } = enrolled;
      req.studentClass = studentClass;

      const requestedClassId =
        req.params.classId || req.query.classId || req.query.class;

      // Chống IDOR: Học sinh lớp A không được xem lớp B
      if (
        requestedClassId &&
        requestedClassId.toString() !== studentClass._id.toString()
      ) {
        return errorResponse(
          res,
          "Bạn không thuộc lớp học này, không có quyền truy cập nội dung bài giảng!",
          403
        );
      }

      // Ép dùng lớp học thực tế của học sinh để tránh bypass
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
 * Middleware kiểm tra quyền XEM CHI TIẾT một bài giảng (canViewLessonDetail)
 * Quy tắc:
 * 1. Yêu cầu đăng nhập (401).
 * 2. Kiểm tra bài giảng có tồn tại không (404).
 * 3. Nếu là Student:
 *    - Bài giảng phải đang ở trạng thái kích hoạt isActive: true (403 nếu chưa công khai).
 *    - Bài giảng phải thuộc lớp học mà học sinh đang theo học (403 nếu thuộc lớp khác - Chống IDOR).
 */
const canViewLessonDetail = async (req, res, next) => {
  try {
    if (!req.user) {
      return errorResponse(res, "Chưa xác thực thông tin người dùng!", 401);
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, "Mã bài giảng không hợp lệ!", 400);
    }

    const lesson = await LessonContent.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!lesson) {
      return errorResponse(
        res,
        "Nội dung bài giảng không tồn tại hoặc đã bị xóa!",
        404
      );
    }

    if (req.user.role === "student") {
      // 1. Chặn xem bài giảng ẩn / nháp
      if (!lesson.isActive) {
        return errorResponse(
          res,
          "Nội dung bài giảng hiện chưa được công khai!",
          403
        );
      }

      // 2. Lấy lớp của học sinh
      let enrolled;
      try {
        enrolled = await getStudentEnrolledClass(req.user.userId);
      } catch (err) {
        return errorResponse(res, err.message, err.statusCode || 403);
      }

      const { studentClass } = enrolled;

      // 3. Tìm phân công giảng dạy tương ứng
      const assignment = await TeachingAssignment.findOne({
        _id: lesson.teachingAssignment,
        isDeleted: false,
      });

      // Chống IDOR: Bài giảng không thuộc lớp của học sinh
      if (
        !assignment ||
        assignment.class.toString() !== studentClass._id.toString()
      ) {
        return errorResponse(
          res,
          "Bạn không thuộc lớp học này, không có quyền truy cập nội dung bài giảng!",
          403
        );
      }

      req.targetAssignment = assignment;
    }

    req.targetLesson = lesson;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStudentEnrolledClass,
  canCreateLesson,
  canModifyLesson,
  canStudentAccessClassLessons,
  canViewLessonDetail,
};
