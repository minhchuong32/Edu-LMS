const mongoose = require("mongoose");
const Question = require("../models/Question");
const Subject = require("../models/Subject");
const TeachingAssignment = require("../models/TeachingAssignment");
const { errorResponse } = require("../utils/apiResponse");

/**
 * Middleware phân quyền chung cho Ngân hàng câu hỏi
 * Chỉ cho phép vai trò 'admin' hoặc 'teacher' truy cập.
 * Từ chối học sinh ('student') và phụ huynh ('parent') với mã lỗi 403.
 */
const canAccessQuestionBank = async (req, res, next) => {
  try {
    if (!req.user) {
      return errorResponse(res, "Chưa xác thực thông tin người dùng!", 401);
    }

    const { role } = req.user;
    if (!["admin", "teacher"].includes(role)) {
      return errorResponse(
        res,
        `Tài khoản với vai trò '${role}' không có quyền truy cập ngân hàng câu hỏi!`,
        403
      );
    }

    next();
  } catch (error) {
    return errorResponse(
      res,
      error.message || "Lỗi kiểm tra quyền truy cập ngân hàng câu hỏi",
      500
    );
  }
};

/**
 * Middleware kiểm tra quyền TẠO câu hỏi
 * 1. Bắt buộc đăng nhập và là 'admin' hoặc 'teacher'.
 * 2. Phải cung cấp mã môn học (subject) hợp lệ và môn học phải tồn tại.
 * 3. Nếu là 'teacher', kiểm tra xem giáo viên có được phân công giảng dạy môn học này hay không.
 */
const canCreateQuestion = async (req, res, next) => {
  try {
    if (!req.user) {
      return errorResponse(res, "Chưa xác thực thông tin người dùng!", 401);
    }

    const { role, userId } = req.user;
    if (!["admin", "teacher"].includes(role)) {
      return errorResponse(
        res,
        `Tài khoản với vai trò '${role}' không có quyền tạo câu hỏi!`,
        403
      );
    }

    const { subject } = req.body;
    if (!subject) {
      return errorResponse(res, "Môn học (subject) là bắt buộc!", 400);
    }

    if (!mongoose.Types.ObjectId.isValid(subject)) {
      return errorResponse(res, "Mã môn học (subject) không hợp lệ!", 400);
    }

    const subjectDoc = await Subject.findOne({
      _id: subject,
      isDeleted: false,
    });

    if (!subjectDoc) {
      return errorResponse(res, "Môn học không tồn tại hoặc đã bị xóa!", 404);
    }

    req.targetSubject = subjectDoc;

    // Chống IDOR: Giáo viên phải được phân công giảng dạy môn học này
    if (role === "teacher") {
      const isAssigned = await TeachingAssignment.exists({
        teacher: userId,
        subject: subject,
        isDeleted: false,
      });

      if (!isAssigned) {
        return errorResponse(
          res,
          "Bạn không được phân công giảng dạy môn học này, không có quyền tạo câu hỏi vào ngân hàng môn!",
          403
        );
      }
    }

    next();
  } catch (error) {
    return errorResponse(
      res,
      error.message || "Lỗi kiểm tra quyền tạo câu hỏi",
      500
    );
  }
};

/**
 * Middleware kiểm tra quyền SỬA / XÓA câu hỏi (canModifyQuestion)
 * 1. Kiểm tra ID câu hỏi hợp lệ và câu hỏi tồn tại (chưa bị xóa).
 * 2. Admin có toàn quyền.
 * 3. Nếu là 'teacher': Phải là người tạo câu hỏi HOẶC giáo viên được phân công giảng dạy môn học đó.
 */
const canModifyQuestion = async (req, res, next) => {
  try {
    if (!req.user) {
      return errorResponse(res, "Chưa xác thực thông tin người dùng!", 401);
    }

    const { role, userId } = req.user;
    if (!["admin", "teacher"].includes(role)) {
      return errorResponse(
        res,
        `Tài khoản với vai trò '${role}' không có quyền chỉnh sửa hoặc xóa câu hỏi!`,
        403
      );
    }

    const questionId = req.params.id;
    if (!questionId || !mongoose.Types.ObjectId.isValid(questionId)) {
      return errorResponse(res, "Mã câu hỏi không hợp lệ!", 400);
    }

    const question = await Question.findOne({
      _id: questionId,
      isDeleted: false,
    });

    if (!question) {
      return errorResponse(res, "Câu hỏi không tồn tại hoặc đã bị xóa!", 404);
    }

    if (role === "teacher") {
      const isOwner =
        (question.teacher?._id || question.teacher)?.toString() ===
          userId.toString() ||
        (question.createdBy?._id || question.createdBy)?.toString() ===
          userId.toString();

      let isAssignedToSubject = false;
      if (!isOwner) {
        isAssignedToSubject = await TeachingAssignment.exists({
          teacher: userId,
          subject: question.subject,
          isDeleted: false,
        });
      }

      if (!isOwner && !isAssignedToSubject) {
        return errorResponse(
          res,
          "Bạn không phải người tạo câu hỏi và không phụ trách môn học này, không có quyền thao tác!",
          403
        );
      }
    }

    req.question = question;
    next();
  } catch (error) {
    return errorResponse(
      res,
      error.message || "Lỗi kiểm tra quyền thao tác câu hỏi",
      500
    );
  }
};

module.exports = {
  canAccessQuestionBank,
  canCreateQuestion,
  canModifyQuestion,
};
