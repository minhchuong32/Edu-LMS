const mongoose = require("mongoose");
const LessonContent = require("../models/LessonContent");
const TeachingAssignment = require("../models/TeachingAssignment");
const { errorResponse } = require("../utils/apiResponse");

/**
 * Middleware kiểm tra quyền TẠO bài giảng (canCreateLesson)
 * Quy tắc:
 * 1. Người dùng bắt buộc đã đăng nhập (req.user tồn tại).
 * 2. Chỉ 'admin' hoặc 'teacher' được phép tạo. 'student'/'parent' bị từ chối (403).
 * 3. Nếu là 'teacher', chỉ được tạo cho TeachingAssignment mà mình được phân công (ngăn chặn IDOR).
 */
const canCreateLesson = async (req, res, next) => {
  try {
    if (!req.user) {
      return errorResponse(res, "Chưa xác thực thông tin người dùng!", 401);
    }

    const { role, userId } = req.user;

    // 1. Học sinh và Phụ huynh không được phép tạo bài giảng
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

    // 2. Kiểm tra TeachingAssignment tồn tại và chưa bị xóa
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

    // 3. Nếu là giáo viên, bắt buộc phải đúng giáo viên được phân công (Ngăn chặn IDOR)
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

    // Gán assignment vào request để controller tái sử dụng không cần query lại
    req.targetAssignment = assignment;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware kiểm tra quyền CẬP NHẬT hoặc XÓA bài giảng (canModifyLesson)
 * Quy tắc:
 * 1. Người dùng bắt buộc đã đăng nhập (req.user tồn tại).
 * 2. Chỉ 'admin' hoặc 'teacher' được phép sửa/xóa. 'student'/'parent' bị từ chối (403).
 * 3. Kiểm tra tính hợp lệ của ID bài giảng và sự tồn tại của LessonContent.
 * 4. Nếu là 'teacher', kiểm tra TeachingAssignment xem có đúng giáo viên phụ trách không.
 *    Ngăn chặn IDOR: Không cho phép giáo viên sửa/xóa bài giảng của giáo viên khác.
 */
const canModifyLesson = async (req, res, next) => {
  try {
    if (!req.user) {
      return errorResponse(res, "Chưa xác thực thông tin người dùng!", 401);
    }

    const { role, userId } = req.user;

    // 1. Học sinh và Phụ huynh không được phép sửa/xóa bài giảng
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

    // 2. Tìm bài giảng
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

    // 3. Nếu là giáo viên, đối chiếu quyền sở hữu qua TeachingAssignment (Ngăn chặn IDOR)
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

    // Gán lesson vào request để controller tái sử dụng
    req.targetLesson = lesson;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  canCreateLesson,
  canModifyLesson,
};
