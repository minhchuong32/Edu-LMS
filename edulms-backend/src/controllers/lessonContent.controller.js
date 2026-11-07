const path = require("path");
const mongoose = require("mongoose");
const LessonContent = require("../models/LessonContent");
const TeachingAssignment = require("../models/TeachingAssignment");
const { successResponse, errorResponse } = require("../utils/apiResponse");
const {
  extractYouTubeVideoId,
  formatYouTubeEmbedUrl,
} = require("../utils/youtubeHelper");
const { safeDeleteFromCloudinary } = require("../config/cloudinary");

/**
 * Xóa an toàn toàn bộ file Cloudinary liên quan đến một bài giảng
 * @param {object} lesson
 * @param {string[]} [excludeUrls=[]]
 */
const deleteLessonCloudinaryFiles = async (lesson, excludeUrls = []) => {
  if (!lesson) return;
  const deleteTasks = [];

  // 1. Duyệt qua mảng attachments
  if (Array.isArray(lesson.attachments)) {
    for (const att of lesson.attachments) {
      if (att && att.url && !excludeUrls.includes(att.url)) {
        if (att.url.includes("res.cloudinary.com") || att.publicId) {
          deleteTasks.push(
            safeDeleteFromCloudinary(att.publicId || att.url, att.resourceType)
          );
        }
      }
    }
  }

  // 2. Duyệt qua resourceUrl (nếu là Cloudinary và không nằm trong excludeUrls)
  if (
    lesson.resourceUrl &&
    lesson.resourceUrl.includes("res.cloudinary.com") &&
    !excludeUrls.includes(lesson.resourceUrl)
  ) {
    const isAlreadyQueued = lesson.attachments?.some(
      (a) => a.url === lesson.resourceUrl || a.publicId === lesson.resourceUrl
    );
    if (!isAlreadyQueued) {
      deleteTasks.push(safeDeleteFromCloudinary(lesson.resourceUrl));
    }
  }

  if (deleteTasks.length > 0) {
    try {
      await Promise.allSettled(deleteTasks);
    } catch (err) {
      console.error("[LessonContent] Lỗi khi xóa tệp Cloudinary:", err.message);
    }
  }
};

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

    // 4. Xử lý video YouTube Embed hoặc video Cloudinary kế thừa
    let videoProvider = req.body.videoProvider || null;
    let videoId = req.body.videoId || null;
    let originalVideoUrl = null;

    if (contentType === "video") {
      const inputUrl = resourceUrl || req.body.videoUrl || "";
      if (!inputUrl || !inputUrl.trim()) {
        return errorResponse(
          res,
          "Đường dẫn video YouTube là bắt buộc đối với bài giảng video",
          400
        );
      }

      // Kiểm tra có phải YouTube URL
      const extractedId = extractYouTubeVideoId(inputUrl);
      if (extractedId) {
        videoId = extractedId;
        videoProvider = "youtube";
        originalVideoUrl = inputUrl.trim();
        resourceUrl = formatYouTubeEmbedUrl(extractedId);
      } else {
        // Tương thích ngược: Cho phép giữ nguyên video Cloudinary cũ nếu có
        const isLegacyCloudinary =
          inputUrl.includes("res.cloudinary.com") ||
          inputUrl.startsWith("/uploads/") ||
          inputUrl.startsWith("uploads/");

        if (isLegacyCloudinary) {
          videoProvider = "cloudinary";
          resourceUrl = inputUrl.trim();
        } else {
          return errorResponse(
            res,
            "Đường dẫn video YouTube không hợp lệ. Vui lòng cung cấp liên kết YouTube chuẩn (dạng https://www.youtube.com/watch?v=... hoặc https://youtu.be/...)!",
            400
          );
        }
      }
    }

    // 5. Chuẩn bị danh sách attachments
    let attachments = Array.isArray(req.body.attachments) ? req.body.attachments : [];
    if (attachments.length === 0 && resourceUrl && contentType !== "text" && contentType !== "video") {
      const cleanFileName =
        req.body.fileName ||
        decodeURIComponent(path.basename(resourceUrl.split("?")[0].split("#")[0])) ||
        title.trim();
      attachments.push({
        name: cleanFileName,
        url: resourceUrl.trim(),
        publicId: req.body.publicId || "",
        resourceType: req.body.resourceType || "raw",
        fileType: req.body.fileType || contentType,
        fileSize: req.body.fileSize || 0,
        format: req.body.format || "",
      });
    }

    if (!resourceUrl && attachments.length > 0 && contentType !== "text") {
      resourceUrl = attachments[0].url;
    }

    // 6. Khởi tạo và lưu nội dung bài giảng
    const newLesson = new LessonContent({
      title: title.trim(),
      description: description ? description.trim() : "",
      contentType,
      resourceUrl: resourceUrl ? resourceUrl.trim() : "",
      attachments,
      videoProvider,
      videoId,
      originalVideoUrl,
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
        "title description contentType resourceUrl videoProvider videoId originalVideoUrl order isActive createdAt updatedAt"
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
    if (order !== undefined) lesson.order = order;
    if (isActive !== undefined) lesson.isActive = isActive;

    // Cập nhật attachments nếu được truyền lên
    if (req.body.attachments !== undefined && Array.isArray(req.body.attachments)) {
      const newAttachments = req.body.attachments;
      const newUrls = newAttachments.map((a) => a.url);

      // Tìm những file cũ bị loại bỏ để xóa an toàn khỏi Cloudinary
      if (Array.isArray(lesson.attachments)) {
        for (const oldAtt of lesson.attachments) {
          if (oldAtt && oldAtt.url && !newUrls.includes(oldAtt.url)) {
            if (oldAtt.url.includes("res.cloudinary.com") || oldAtt.publicId) {
              safeDeleteFromCloudinary(
                oldAtt.publicId || oldAtt.url,
                oldAtt.resourceType
              );
            }
          }
        }
      }
      lesson.attachments = newAttachments;

      // Nếu resourceUrl chưa có hoặc bị xóa khỏi attachments, tự động đồng bộ
      if (
        lesson.attachments.length > 0 &&
        (!lesson.resourceUrl || !newUrls.includes(lesson.resourceUrl))
      ) {
        lesson.resourceUrl = lesson.attachments[0].url;
      }
    }

    // Xử lý cập nhật video YouTube Embed hoặc giữ tương thích video Cloudinary
    const targetType = contentType !== undefined ? contentType : lesson.contentType;
    if (targetType === "video" && (resourceUrl !== undefined || req.body.videoUrl !== undefined)) {
      const inputUrl = resourceUrl !== undefined ? resourceUrl : req.body.videoUrl;
      if (inputUrl && inputUrl.trim()) {
        const extractedId = extractYouTubeVideoId(inputUrl);
        if (extractedId) {
          lesson.videoId = extractedId;
          lesson.videoProvider = "youtube";
          lesson.originalVideoUrl = inputUrl.trim();
          lesson.resourceUrl = formatYouTubeEmbedUrl(extractedId);
        } else {
          const isLegacyCloudinary =
            inputUrl.includes("res.cloudinary.com") ||
            inputUrl.startsWith("/uploads/") ||
            inputUrl.startsWith("uploads/");

          if (isLegacyCloudinary) {
            lesson.videoProvider = "cloudinary";
            lesson.resourceUrl = inputUrl.trim();
          } else {
            return errorResponse(
              res,
              "Đường dẫn video YouTube không hợp lệ. Vui lòng cung cấp liên kết YouTube chuẩn (dạng https://www.youtube.com/watch?v=... hoặc https://youtu.be/...)!",
              400
            );
          }
        }
      }
    } else if (resourceUrl !== undefined) {
      const trimmedUrl = resourceUrl.trim();
      const oldResourceUrl = lesson.resourceUrl;
      if (
        oldResourceUrl &&
        oldResourceUrl !== trimmedUrl &&
        oldResourceUrl.includes("res.cloudinary.com")
      ) {
        const isStillInAttachments = lesson.attachments?.some(
          (a) => a.url === oldResourceUrl
        );
        if (!isStillInAttachments) {
          safeDeleteFromCloudinary(oldResourceUrl);
        }
      }
      lesson.resourceUrl = trimmedUrl;
    }

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
 * Xóa mềm nội dung bài giảng và đồng bộ dọn dẹp file đính kèm trên Cloudinary
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

    // Xóa an toàn toàn bộ file đính kèm trên Cloudinary trước khi soft-delete
    await deleteLessonCloudinaryFiles(lesson);

    // Soft delete: Đánh dấu isDeleted = true
    lesson.isDeleted = true;
    await lesson.save();

    return successResponse(res, null, "Xóa nội dung bài giảng thành công");
  } catch (error) {
    next(error);
  }
};

/**
 * [DELETE] /api/v1/lessons/:id/files/:fileId
 * Xóa một tệp đính kèm riêng lẻ khỏi bài giảng và xóa khỏi Cloudinary
 * Quyền: Admin, Teacher (phụ trách)
 */
const deleteLessonFile = async (req, res, next) => {
  try {
    const { id, fileId } = req.params;
    let lesson = req.targetLesson;

    if (!lesson) {
      lesson = await LessonContent.findOne({ _id: id, isDeleted: false });
      if (!lesson) {
        return errorResponse(
          res,
          "Nội dung bài giảng không tồn tại hoặc đã bị xóa",
          404
        );
      }
    }

    let targetIndex = -1;
    if (Array.isArray(lesson.attachments)) {
      targetIndex = lesson.attachments.findIndex(
        (a) => a._id?.toString() === fileId || a.id === fileId
      );
    }

    let targetFile = targetIndex !== -1 ? lesson.attachments[targetIndex] : null;

    if (!targetFile && (fileId === "primary" || lesson.resourceUrl?.includes(fileId))) {
      targetFile = {
        url: lesson.resourceUrl,
        publicId: "",
        resourceType: "raw",
      };
    }

    if (!targetFile) {
      return errorResponse(
        res,
        "Không tìm thấy tệp đính kèm cần xóa trong bài giảng",
        404
      );
    }

    // 1. Xóa tệp trên Cloudinary (nếu là Cloudinary URL hoặc có publicId)
    if (targetFile.url?.includes("res.cloudinary.com") || targetFile.publicId) {
      await safeDeleteFromCloudinary(
        targetFile.publicId || targetFile.url,
        targetFile.resourceType
      );
    }

    // 2. Gỡ bỏ tệp khỏi mảng attachments trong Database
    if (targetIndex !== -1) {
      lesson.attachments.splice(targetIndex, 1);
    }

    // 3. Nếu tệp bị xóa trùng với resourceUrl chính
    if (lesson.resourceUrl === targetFile.url) {
      lesson.resourceUrl =
        lesson.attachments.length > 0 ? lesson.attachments[0].url : "";
    }

    await lesson.save();

    return successResponse(
      res,
      lesson,
      "Đã xóa tệp đính kèm khỏi bài giảng và Cloudinary thành công"
    );
  } catch (error) {
    next(error);
  }
};

/**
 * [PUT] /api/v1/lessons/:id/files/:fileId
 * Thay thế một tệp đính kèm trong bài giảng bằng tệp mới, xóa tệp cũ khỏi Cloudinary
 * Quyền: Admin, Teacher (phụ trách)
 */
const replaceLessonFile = async (req, res, next) => {
  try {
    const { id, fileId } = req.params;
    const { name, url, publicId, resourceType, fileType, fileSize, format } =
      req.body || {};

    if (!url || !url.trim()) {
      return errorResponse(res, "Đường dẫn tệp mới (url) là bắt buộc", 400);
    }

    let lesson = req.targetLesson;
    if (!lesson) {
      lesson = await LessonContent.findOne({ _id: id, isDeleted: false });
      if (!lesson) {
        return errorResponse(
          res,
          "Nội dung bài giảng không tồn tại hoặc đã bị xóa",
          404
        );
      }
    }

    let targetIndex = -1;
    if (Array.isArray(lesson.attachments)) {
      targetIndex = lesson.attachments.findIndex(
        (a) => a._id?.toString() === fileId || a.id === fileId
      );
    }

    let oldFile = targetIndex !== -1 ? lesson.attachments[targetIndex] : null;

    if (!oldFile && (fileId === "primary" || lesson.resourceUrl?.includes(fileId))) {
      oldFile = {
        url: lesson.resourceUrl,
        publicId: "",
        resourceType: "raw",
      };
    }

    // 1. Xóa tệp cũ trên Cloudinary
    if (oldFile && (oldFile.url?.includes("res.cloudinary.com") || oldFile.publicId)) {
      await safeDeleteFromCloudinary(
        oldFile.publicId || oldFile.url,
        oldFile.resourceType
      );
    }

    const newFileData = {
      name:
        name ||
        decodeURIComponent(path.basename(url.split("?")[0].split("#")[0])),
      url: url.trim(),
      publicId: publicId || "",
      resourceType: resourceType || "raw",
      fileType: fileType || lesson.contentType || "document",
      fileSize: fileSize || 0,
      format: format || "",
    };

    // 2. Cập nhật trong mảng attachments
    if (targetIndex !== -1) {
      lesson.attachments[targetIndex] = {
        ...lesson.attachments[targetIndex].toObject?.(),
        ...newFileData,
      };
    } else {
      lesson.attachments.push(newFileData);
    }

    // 3. Cập nhật resourceUrl nếu là tệp chính hoặc rỗng
    if (!lesson.resourceUrl || lesson.resourceUrl === oldFile?.url) {
      lesson.resourceUrl = newFileData.url;
    }

    await lesson.save();

    return successResponse(
      res,
      lesson,
      "Đã thay thế tệp và đồng bộ Cloudinary thành công"
    );
  } catch (error) {
    next(error);
  }
};

/**
 * [POST] /api/v1/lessons/:id/files
 * Thêm một tệp đính kèm mới vào bài giảng
 * Quyền: Admin, Teacher (phụ trách)
 */
const addLessonFile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, url, publicId, resourceType, fileType, fileSize, format } =
      req.body || {};

    if (!url || !url.trim()) {
      return errorResponse(res, "Đường dẫn tệp (url) là bắt buộc", 400);
    }

    let lesson = req.targetLesson;
    if (!lesson) {
      lesson = await LessonContent.findOne({ _id: id, isDeleted: false });
      if (!lesson) {
        return errorResponse(
          res,
          "Nội dung bài giảng không tồn tại hoặc đã bị xóa",
          404
        );
      }
    }

    const newFileData = {
      name:
        name ||
        decodeURIComponent(path.basename(url.split("?")[0].split("#")[0])),
      url: url.trim(),
      publicId: publicId || "",
      resourceType: resourceType || "raw",
      fileType: fileType || lesson.contentType || "document",
      fileSize: fileSize || 0,
      format: format || "",
    };

    if (!Array.isArray(lesson.attachments)) {
      lesson.attachments = [];
    }

    lesson.attachments.push(newFileData);

    if (!lesson.resourceUrl && lesson.contentType !== "text") {
      lesson.resourceUrl = newFileData.url;
    }

    await lesson.save();

    return successResponse(
      res,
      lesson,
      "Đã thêm tệp đính kèm vào bài giảng thành công"
    );
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
  deleteLessonFile,
  replaceLessonFile,
  addLessonFile,
};
