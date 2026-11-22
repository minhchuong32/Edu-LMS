const mongoose = require("mongoose");
const Exam = require("../models/Exam");
const TeachingAssignment = require("../models/TeachingAssignment");
const lessonPermissionMiddleware = require("./lessonPermission.middleware");
const { errorResponse } = require("../utils/apiResponse");

/**
 * Middleware kiểm tra quyền TẠO đề kiểm tra (canCreateExam)
 * 1. Bắt buộc đăng nhập (401).
 * 2. Chỉ 'teacher' hoặc 'admin' được tạo đề. Học sinh bị chặn (403).
 * 3. Nếu là 'teacher', phải là giáo viên được phân công trong TeachingAssignment (Chống IDOR).
 */
const canCreateExam = async (req, res, next) => {
  try {
    if (!req.user) {
      return errorResponse(res, "Chưa xác thực thông tin người dùng!", 401);
    }

    const { role, userId } = req.user;
    if (!["admin", "teacher"].includes(role)) {
      return errorResponse(
        res,
        `Tài khoản với vai trò '${role}' không có quyền tạo đề kiểm tra!`,
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

    const ta = await TeachingAssignment.findOne({
      _id: teachingAssignment,
      isDeleted: false,
    });

    if (!ta) {
      return errorResponse(
        res,
        "Phân công giảng dạy không tồn tại hoặc đã bị xóa!",
        404
      );
    }

    if (role === "teacher") {
      const assignedTeacherId = (ta.teacher?._id || ta.teacher)?.toString();
      if (assignedTeacherId !== userId.toString()) {
        return errorResponse(
          res,
          "Bạn không được phân công giảng dạy lớp học này, không có quyền tạo đề kiểm tra!",
          403
        );
      }
    }

    req.targetTeachingAssignment = ta;
    next();
  } catch (error) {
    return errorResponse(
      res,
      error.message || "Lỗi kiểm tra quyền tạo đề kiểm tra",
      500
    );
  }
};

/**
 * Middleware kiểm tra quyền CHỈNH SỬA / XÓA / PUBLISH đề kiểm tra (canModifyExam)
 * 1. Kiểm tra ID đề thi hợp lệ và tồn tại.
 * 2. Admin có toàn quyền.
 * 3. Giáo viên phải là người tạo đề HOẶC giáo viên được phân công trong TeachingAssignment.
 */
const canModifyExam = async (req, res, next) => {
  try {
    if (!req.user) {
      return errorResponse(res, "Chưa xác thực thông tin người dùng!", 401);
    }

    const { role, userId } = req.user;
    if (!["admin", "teacher"].includes(role)) {
      return errorResponse(
        res,
        `Tài khoản với vai trò '${role}' không có quyền thao tác trên đề kiểm tra!`,
        403
      );
    }

    const examId = req.params.id;
    if (!examId || !mongoose.Types.ObjectId.isValid(examId)) {
      return errorResponse(res, "Mã đề kiểm tra không hợp lệ!", 400);
    }

    const exam = await Exam.findOne({
      _id: examId,
      isDeleted: false,
    }).populate("teachingAssignment");

    if (!exam) {
      return errorResponse(
        res,
        "Đề kiểm tra không tồn tại hoặc đã bị xóa!",
        404
      );
    }

    if (role === "teacher") {
      const isCreator =
        (exam.teacher?._id || exam.teacher)?.toString() === userId.toString();
      const assignedTeacherId = (
        exam.teachingAssignment?.teacher?._id || exam.teachingAssignment?.teacher
      )?.toString();
      const isAssigned = assignedTeacherId === userId.toString();

      if (!isCreator && !isAssigned) {
        return errorResponse(
          res,
          "Bạn không phải giáo viên phụ trách đề kiểm tra này, không có quyền thao tác!",
          403
        );
      }
    }

    req.exam = exam;
    next();
  } catch (error) {
    return errorResponse(
      res,
      error.message || "Lỗi kiểm tra quyền thao tác đề kiểm tra",
      500
    );
  }
};

/**
 * Middleware kiểm tra quyền XEM CHI TIẾT đề kiểm tra (canViewExamDetail)
 * 1. Teacher/Admin: Xem được đề (bao gồm đáp án đúng correctIndex).
 * 2. Student:
 *    - Đề phải ở trạng thái đã phát hành ('published').
 *    - Học sinh phải thuộc đúng lớp học của TeachingAssignment.
 */
const canViewExamDetail = async (req, res, next) => {
  try {
    if (!req.user) {
      return errorResponse(res, "Chưa xác thực thông tin người dùng!", 401);
    }

    const { role, userId } = req.user;
    const examId = req.params.id;

    if (!examId || !mongoose.Types.ObjectId.isValid(examId)) {
      return errorResponse(res, "Mã đề kiểm tra không hợp lệ!", 400);
    }

    const exam = await Exam.findOne({
      _id: examId,
      isDeleted: false,
    }).populate("teachingAssignment");

    if (!exam) {
      return errorResponse(
        res,
        "Đề kiểm tra không tồn tại hoặc đã bị xóa!",
        404
      );
    }

    if (role === "student") {
      if (exam.status !== "published" && !exam.isPublished) {
        return errorResponse(
          res,
          "Đề kiểm tra chưa được phát hành, học sinh không thể truy cập!",
          403
        );
      }

      // Xác thực học sinh có thuộc lớp của phân công giảng dạy này không
      const { studentClass } =
        await lessonPermissionMiddleware.getStudentEnrolledClass(userId);
      const examClassId = (
        exam.teachingAssignment?.class?._id || exam.teachingAssignment?.class
      )?.toString();

      if (studentClass._id.toString() !== examClassId) {
        return errorResponse(
          res,
          "Học sinh không thuộc lớp học của đề kiểm tra này!",
          403
        );
      }
    }

    req.exam = exam;
    next();
  } catch (error) {
    return errorResponse(
      res,
      error.message || "Lỗi kiểm tra quyền xem đề kiểm tra",
      error.statusCode || 500
    );
  }
};

module.exports = {
  canCreateExam,
  canModifyExam,
  canViewExamDetail,
};
