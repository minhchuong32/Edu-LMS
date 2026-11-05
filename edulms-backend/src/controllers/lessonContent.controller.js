const mongoose = require("mongoose");
const LessonContent = require("../models/LessonContent");
const TeachingAssignment = require("../models/TeachingAssignment");
const { successResponse, errorResponse } = require("../utils/apiResponse");

/**
 * [POST] /api/v1/lessons
 * Tạo mới nội dung bài giảng
 * Quyền: Admin, Teacher (được kiểm tra qua middleware canCreateLesson)
 */
const createLessonContent = async (req, res, next) => {
  try {
    let {
      title,
      description,
      contentType,
      resourceUrl,
      order,
      teachingAssignment,
      isActive,
    } = req.body;

    // 1. Kiểm tra các trường dữ liệu bắt buộc
    if (!title || !title.trim()) {
      return errorResponse(res, "Tiêu đề bài giảng là bắt buộc", 400);
    }

    if (!contentType) {
      return errorResponse(res, "Loại nội dung (contentType) là bắt buộc", 400);
    }

    // 2. Xác thực phân công giảng dạy (TeachingAssignment) và quyền sở hữu
    let assignment = req.targetAssignment;
    if (!assignment) {
      if (!teachingAssignment) {
        return errorResponse(
          res,
          "Phân công giảng dạy (teachingAssignment) là bắt buộc",
          400
        );
      }

      if (!mongoose.Types.ObjectId.isValid(teachingAssignment)) {
        return errorResponse(
          res,
          "Mã phân công giảng dạy (teachingAssignment) không hợp lệ",
          400
        );
      }

      assignment = await TeachingAssignment.findOne({
        _id: teachingAssignment,
        isDeleted: false,
      });

      if (!assignment) {
        return errorResponse(
          res,
          "Phân công giảng dạy không tồn tại hoặc đã bị xóa",
          404
        );
      }

      // Ngăn chặn IDOR: Giáo viên chỉ được tạo nội dung cho phân công của chính mình
      if (
        req.user.role === "teacher" &&
        assignment.teacher.toString() !== req.user.userId
      ) {
        return errorResponse(
          res,
          "Bạn không được phân công giảng dạy lớp học này, không có quyền tạo nội dung bài giảng!",
          403
        );
      }
    } else {
      teachingAssignment = assignment._id;
    }

    // 3. Tự động tính số thứ tự (order) nếu client không truyền
    if (order === undefined || order === null) {
      const lastLesson = await LessonContent.findOne({
        teachingAssignment,
        isDeleted: false,
      }).sort({ order: -1 });

      order = lastLesson && lastLesson.order ? lastLesson.order + 1 : 1;
    }

    // 4. Khởi tạo và lưu nội dung bài giảng
    const newLesson = new LessonContent({
      title: title.trim(),
      description: description ? description.trim() : "",
      contentType,
      resourceUrl: resourceUrl ? resourceUrl.trim() : "",
      order,
      teachingAssignment,
      isActive: isActive !== undefined ? isActive : true,
    });

    const savedLesson = await newLesson.save();

    return successResponse(
      res,
      savedLesson,
      "Tạo nội dung bài giảng thành công",
      201
    );
  } catch (error) {
    next(error);
  }
};

/**
 * [GET] /api/v1/lessons
 * Lấy danh sách nội dung bài giảng (hỗ trợ lọc theo phân công, loại nội dung, trạng thái, tìm kiếm)
 * Quyền: Admin, Teacher, Student, Parent
 */
const getLessonContents = async (req, res, next) => {
  try {
    const { teachingAssignment, contentType, isActive, search } = req.query;

    const filter = { isDeleted: false };

    // Lọc theo phân công giảng dạy
    if (teachingAssignment) {
      if (!mongoose.Types.ObjectId.isValid(teachingAssignment)) {
        return errorResponse(
          res,
          "Mã phân công giảng dạy (teachingAssignment) không hợp lệ",
          400
        );
      }
      filter.teachingAssignment = teachingAssignment;
    }

    // Lọc theo loại nội dung
    if (contentType) {
      filter.contentType = contentType.toLowerCase().trim();
    }

    // Học sinh và phụ huynh chỉ được xem nội dung đang được kích hoạt (isActive: true)
    if (req.user.role === "student" || req.user.role === "parent") {
      filter.isActive = true;
    } else if (isActive !== undefined) {
      filter.isActive = isActive === "true" || isActive === true;
    }

    // Tìm kiếm theo tiêu đề bài giảng
    if (search && search.trim()) {
      filter.title = { $regex: search.trim(), $options: "i" };
    }

    const lessons = await LessonContent.find(filter)
      .sort({ order: 1, createdAt: 1 })
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

    return successResponse(
      res,
      lessons,
      "Lấy danh sách nội dung bài giảng thành công"
    );
  } catch (error) {
    next(error);
  }
};

/**
 * [GET] /api/v1/lessons/:id
 * Lấy chi tiết một nội dung bài giảng
 * Quyền: Admin, Teacher, Student, Parent
 */
const getLessonContentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, "Mã bài giảng không hợp lệ", 400);
    }

    const lesson = await LessonContent.findOne({
      _id: id,
      isDeleted: false,
    }).populate({
      path: "teachingAssignment",
      select: "class subject teacher academicYear semester",
      populate: [
        { path: "class", select: "name academicYear" },
        { path: "subject", select: "name code" },
        { path: "teacher", select: "fullName userCode email" },
      ],
    });

    if (!lesson) {
      return errorResponse(
        res,
        "Nội dung bài giảng không tồn tại hoặc đã bị xóa",
        404
      );
    }

    // Học sinh và phụ huynh không xem được bài học chưa kích hoạt
    if (
      (req.user.role === "student" || req.user.role === "parent") &&
      !lesson.isActive
    ) {
      return errorResponse(
        res,
        "Nội dung bài giảng hiện chưa được công khai",
        403
      );
    }

    return successResponse(
      res,
      lesson,
      "Lấy thông tin chi tiết bài giảng thành công"
    );
  } catch (error) {
    next(error);
  }
};

/**
 * [PUT/PATCH] /api/v1/lessons/:id
 * Cập nhật nội dung bài giảng
 * Quyền: Admin, Teacher (được kiểm tra qua middleware canModifyLesson)
 */
const updateLessonContent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, contentType, resourceUrl, order, isActive } =
      req.body;

    // Lấy bài giảng đã xác thực quyền từ middleware
    let lesson = req.targetLesson;
    if (!lesson) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return errorResponse(res, "Mã bài giảng không hợp lệ", 400);
      }

      lesson = await LessonContent.findOne({
        _id: id,
        isDeleted: false,
      });

      if (!lesson) {
        return errorResponse(
          res,
          "Nội dung bài giảng không tồn tại hoặc đã bị xóa",
          404
        );
      }

      // Ngăn chặn IDOR: Giáo viên chỉ được sửa bài giảng thuộc phân công của mình
      if (req.user.role === "teacher") {
        const assignment = await TeachingAssignment.findById(
          lesson.teachingAssignment
        );
        if (!assignment || assignment.teacher.toString() !== req.user.userId) {
          return errorResponse(
            res,
            "Bạn không phải giáo viên phụ trách bài giảng này, không có quyền chỉnh sửa hoặc xóa!",
            403
          );
        }
      }
    }

    // Cập nhật các trường được phép (không cho phép sửa teachingAssignment qua body để ngăn chặn IDOR)
    if (title !== undefined) lesson.title = title.trim();
    if (description !== undefined) lesson.description = description.trim();
    if (contentType !== undefined) lesson.contentType = contentType;
    if (resourceUrl !== undefined) lesson.resourceUrl = resourceUrl.trim();
    if (order !== undefined) lesson.order = order;
    if (isActive !== undefined) lesson.isActive = isActive;

    const updatedLesson = await lesson.save();

    return successResponse(
      res,
      updatedLesson,
      "Cập nhật nội dung bài giảng thành công"
    );
  } catch (error) {
    next(error);
  }
};

/**
 * [DELETE] /api/v1/lessons/:id
 * Xóa mềm nội dung bài giảng
 * Quyền: Admin, Teacher (được kiểm tra qua middleware canModifyLesson)
 */
const deleteLessonContent = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Lấy bài giảng đã xác thực quyền từ middleware
    let lesson = req.targetLesson;
    if (!lesson) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return errorResponse(res, "Mã bài giảng không hợp lệ", 400);
      }

      lesson = await LessonContent.findOne({
        _id: id,
        isDeleted: false,
      });

      if (!lesson) {
        return errorResponse(
          res,
          "Nội dung bài giảng không tồn tại hoặc đã bị xóa",
          404
        );
      }

      // Ngăn chặn IDOR: Giáo viên chỉ được xóa bài giảng thuộc phân công của mình
      if (req.user.role === "teacher") {
        const assignment = await TeachingAssignment.findById(
          lesson.teachingAssignment
        );
        if (!assignment || assignment.teacher.toString() !== req.user.userId) {
          return errorResponse(
            res,
            "Bạn không phải giáo viên phụ trách bài giảng này, không có quyền chỉnh sửa hoặc xóa!",
            403
          );
        }
      }
    }

    // Soft delete: Đánh dấu isDeleted = true
    lesson.isDeleted = true;
    await lesson.save();

    return successResponse(res, null, "Xóa nội dung bài giảng thành công");
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createLessonContent,
  getLessonContents,
  getLessonContentById,
  updateLessonContent,
  deleteLessonContent,
};
