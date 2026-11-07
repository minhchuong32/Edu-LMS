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

    // Học sinh và phụ huynh chỉ được xem nội dung đang được kích hoạt (isActive: true)
    if (req.user.role === "student" || req.user.role === "parent") {
      filter.isActive = true;
    } else if (isActive !== undefined) {
      filter.isActive = isActive === "true" || isActive === true;
    }

    // Nếu là Học sinh và có thông tin lớp được gán từ middleware:
    if (req.user.role === "student" && req.studentClass) {
      if (teachingAssignment) {
        if (!mongoose.Types.ObjectId.isValid(teachingAssignment)) {
          return errorResponse(res, "Mã phân công giảng dạy không hợp lệ", 400);
        }
        filter.teachingAssignment = teachingAssignment;
      } else {
        // Chỉ lấy các phân công của đúng lớp học của học sinh đó
        const classAssignments = await TeachingAssignment.find({
          class: req.studentClass._id,
          isDeleted: false,
        }).select("_id");
        filter.teachingAssignment = { $in: classAssignments.map((a) => a._id) };
      }
    } else if (teachingAssignment) {
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
 * [GET] /api/v1/lessons/by-class-subject
 * [GET] /api/v1/lessons/class/:classId/subject/:subjectId
 * Lấy danh sách LessonContent theo Lớp học và Môn học (hỗ trợ phân trang và sắp xếp theo order)
 * Quyền: Admin, Teacher, Student, Parent
 */
const getLessonsByClassAndSubject = async (req, res, next) => {
  try {
    const classId = req.params.classId || req.query.classId || req.query.class;
    const subjectId =
      req.params.subjectId || req.query.subjectId || req.query.subject;
    const { academicYear, semester, contentType, isActive, page, limit } =
      req.query;

    // 1. Kiểm tra tham số lớp học và môn học bắt buộc
    if (!classId) {
      return errorResponse(res, "Thông tin lớp học (classId) là bắt buộc", 400);
    }
    if (!subjectId) {
      return errorResponse(
        res,
        "Thông tin môn học (subjectId) là bắt buộc",
        400
      );
    }

    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return errorResponse(
        res,
        "Mã lớp học (classId) không đúng định dạng ObjectId",
        400
      );
    }
    if (!mongoose.Types.ObjectId.isValid(subjectId)) {
      return errorResponse(
        res,
        "Mã môn học (subjectId) không đúng định dạng ObjectId",
        400
      );
    }

    // 2. Tìm TeachingAssignment tương ứng với Lớp và Môn học
    const assignmentFilter = {
      class: classId,
      subject: subjectId,
      isDeleted: false,
    };

    if (academicYear && academicYear.trim()) {
      assignmentFilter.academicYear = academicYear.trim();
    }
    if (semester && semester.trim()) {
      assignmentFilter.semester = semester.trim();
    }

    const assignment = await TeachingAssignment.findOne(assignmentFilter)
      .sort({ createdAt: -1 })
      .populate("class", "name academicYear")
      .populate("subject", "name code")
      .populate("teacher", "fullName userCode email");

    if (!assignment) {
      return errorResponse(
        res,
        "Không tìm thấy phân công giảng dạy tương ứng cho lớp học và môn học này",
        404
      );
    }

    // 3. Xây dựng bộ lọc cho LessonContent
    const lessonFilter = {
      teachingAssignment: assignment._id,
      isDeleted: false,
    };

    // Học sinh và phụ huynh chỉ được xem nội dung đã kích hoạt
    if (req.user.role === "student" || req.user.role === "parent") {
      lessonFilter.isActive = true;
    } else if (isActive !== undefined) {
      lessonFilter.isActive = isActive === "true" || isActive === true;
    }

    if (contentType) {
      lessonFilter.contentType = contentType.toLowerCase().trim();
    }

    // 4. Đếm tổng số bài giảng phục vụ phân trang
    const total = await LessonContent.countDocuments(lessonFilter);

    // 5. Cấu hình phân trang (nếu client truyền page hoặc limit)
    const isPaginationRequested = page !== undefined || limit !== undefined;
    const pageNum = parseInt(page, 10) > 0 ? parseInt(page, 10) : 1;
    const limitNum = parseInt(limit, 10) > 0 ? parseInt(limit, 10) : 10;

    let queryBuilder = LessonContent.find(lessonFilter)
      .select(
        "title description contentType resourceUrl order isActive createdAt updatedAt"
      )
      .sort({ order: 1, createdAt: 1 });

    if (isPaginationRequested) {
      const skip = (pageNum - 1) * limitNum;
      queryBuilder = queryBuilder.skip(skip).limit(limitNum);
    }

    const lessons = await queryBuilder.lean();

    // 6. Đóng gói dữ liệu phản hồi
    const responseData = {
      teachingAssignment: {
        _id: assignment._id,
        academicYear: assignment.academicYear,
        semester: assignment.semester,
        class: assignment.class,
        subject: assignment.subject,
        teacher: assignment.teacher,
      },
      lessons,
    };

    if (isPaginationRequested) {
      responseData.pagination = {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      };
    } else {
      responseData.total = total;
    }

    return successResponse(
      res,
      responseData,
      "Lấy danh sách nội dung bài giảng theo lớp và môn học thành công"
    );
  } catch (error) {
    next(error);
  }
};

/**
 * [GET] /api/v1/lessons/:id
 * Lấy chi tiết một nội dung bài giảng
 * Quyền: Admin, Teacher, Student, Parent (Học sinh được kiểm tra qua canViewLessonDetail)
 */
const getLessonContentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, "Mã bài giảng không hợp lệ", 400);
    }

    let lesson = req.targetLesson;
    if (!lesson) {
      lesson = await LessonContent.findOne({
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
    } else if (typeof lesson.populate === "function") {
      lesson = await lesson.populate({
        path: "teachingAssignment",
        select: "class subject teacher academicYear semester",
        populate: [
          { path: "class", select: "name academicYear" },
          { path: "subject", select: "name code" },
          { path: "teacher", select: "fullName userCode email" },
        ],
      });
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
  getLessonsByClassAndSubject,
  getLessonContentById,
  updateLessonContent,
  deleteLessonContent,
};
