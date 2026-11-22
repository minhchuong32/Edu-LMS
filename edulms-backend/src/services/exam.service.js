const mongoose = require("mongoose");
const Exam = require("../models/Exam");
const Question = require("../models/Question");
const ExamAttempt = require("../models/ExamAttempt");
const TeachingAssignment = require("../models/TeachingAssignment");
const User = require("../models/User");
const Notification = require("../models/Notification");
const lessonPermissionMiddleware = require("../middlewares/lessonPermission.middleware");

/**
 * Tạo Error có gắn statusCode HTTP
 */
const createAppError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

/**
 * Ẩn đáp án đúng (correctIndex) và lời giải (explanation) đối với Học sinh
 * Đảm bảo chỉ giáo viên / admin mới có thể xem đáp án đúng.
 */
const formatExamForUser = (examDoc, userRole) => {
  if (!examDoc) return null;

  const rawExam =
    typeof examDoc.toObject === "function" ? examDoc.toObject() : { ...examDoc };

  // Nếu là học sinh, loại bỏ hoàn toàn correctIndex và explanation khỏi từng câu hỏi
  if (userRole === "student") {
    if (Array.isArray(rawExam.questionIds)) {
      rawExam.questionIds = rawExam.questionIds.map((q) => {
        if (!q || typeof q !== "object") return q;
        const sanitized = { ...q };
        delete sanitized.correctIndex;
        delete sanitized.explanation;
        return sanitized;
      });
    }

    if (Array.isArray(rawExam.questions)) {
      rawExam.questions = rawExam.questions.map((q) => {
        if (!q || typeof q !== "object") return q;
        const sanitized = { ...q };
        delete sanitized.correctIndex;
        delete sanitized.explanation;
        return sanitized;
      });
    }
  }

  return rawExam;
};

/**
 * Thuật toán chọn ngẫu nhiên danh sách câu hỏi theo tiêu chí từ Ngân hàng câu hỏi
 * Hỗ trợ cả 2 dạng:
 * 1. Tiêu chí tổng quát: totalQuestions, chapter, difficulty
 * 2. Ma trận tiêu chí (Matrix): criteria = [ { count, difficulty, chapter } ]
 * Đồng thời kiểm tra số lượng câu hỏi đáp ứng đủ điều kiện trước khi chọn.
 */
const sampleRandomQuestions = async (subjectId, config = {}) => {
  const { totalQuestions, chapter, difficulty, criteria } = config;

  const selectedQuestionIds = [];
  const selectedSet = new Set();

  if (Array.isArray(criteria) && criteria.length > 0) {
    for (const item of criteria) {
      const count = parseInt(item.count, 10);
      if (!count || count <= 0) continue;

      const match = {
        subject: new mongoose.Types.ObjectId(subjectId),
        isDeleted: false,
        isActive: true,
      };

      if (selectedQuestionIds.length > 0) {
        match._id = {
          $nin: selectedQuestionIds.map((id) => new mongoose.Types.ObjectId(id)),
        };
      }

      if (item.difficulty && String(item.difficulty).trim()) {
        match.difficulty = String(item.difficulty).trim().toLowerCase();
      }

      if (item.chapter && String(item.chapter).trim()) {
        match.chapter = {
          $regex: `^${String(item.chapter).trim()}$`,
          $options: "i",
        };
      }

      // Kiểm tra số lượng câu hỏi khả dụng
      const countAvailable = await Question.countDocuments(match);
      if (countAvailable < count) {
        throw createAppError(
          `Không đủ số lượng câu hỏi trong ngân hàng! Tiêu chí [Độ khó: ${
            item.difficulty || "Tất cả"
          }, Chương: ${item.chapter || "Tất cả"}] yêu cầu ${count} câu, nhưng chỉ có ${countAvailable} câu khả dụng!`,
          400
        );
      }

      const sampled = await Question.aggregate([
        { $match: match },
        { $sample: { size: count } },
        { $project: { _id: 1 } },
      ]);

      for (const s of sampled) {
        const idStr = s._id.toString();
        if (!selectedSet.has(idStr)) {
          selectedSet.add(idStr);
          selectedQuestionIds.push(s._id);
        }
      }
    }
  } else {
    const count = parseInt(totalQuestions, 10);
    if (!count || count <= 0) {
      throw createAppError("Số lượng câu hỏi (totalQuestions) phải lớn hơn 0!", 400);
    }

    const match = {
      subject: new mongoose.Types.ObjectId(subjectId),
      isDeleted: false,
      isActive: true,
    };

    if (difficulty && String(difficulty).trim()) {
      match.difficulty = String(difficulty).trim().toLowerCase();
    }

    if (chapter && String(chapter).trim()) {
      match.chapter = {
        $regex: `^${String(chapter).trim()}$`,
        $options: "i",
      };
    }

    // Kiểm tra số lượng câu hỏi khả dụng
    const countAvailable = await Question.countDocuments(match);
    if (countAvailable < count) {
      throw createAppError(
        `Không đủ số lượng câu hỏi trong ngân hàng! Yêu cầu ${count} câu, nhưng chỉ có ${countAvailable} câu khả dụng theo tiêu chí đã chọn!`,
        400
      );
    }

    const sampled = await Question.aggregate([
      { $match: match },
      { $sample: { size: count } },
      { $project: { _id: 1 } },
    ]);

    for (const s of sampled) {
      selectedQuestionIds.push(s._id);
    }
  }

  if (selectedQuestionIds.length === 0) {
    throw createAppError("Không tìm thấy câu hỏi phù hợp với tiêu chí đã chọn!", 400);
  }

  return selectedQuestionIds;
};

/**
 * Tạo đề kiểm tra thủ công (Giáo viên tự chọn câu hỏi từ ngân hàng)
 */
const createManualExam = async (data = {}, context = {}) => {
  const {
    teachingAssignment,
    title,
    description = "",
    duration,
    questionIds = [],
    scoreWeight = 10,
    startTime = null,
    endTime = null,
  } = data;

  const { user, targetTeachingAssignment } = context;

  if (!user) {
    throw createAppError("Chưa xác thực thông tin người dùng!", 401);
  }

  if (!teachingAssignment || !mongoose.Types.ObjectId.isValid(teachingAssignment)) {
    throw createAppError("Mã phân công giảng dạy không hợp lệ!", 400);
  }

  const ta =
    targetTeachingAssignment ||
    (await TeachingAssignment.findOne({
      _id: teachingAssignment,
      isDeleted: false,
    }));

  if (!ta) {
    throw createAppError("Phân công giảng dạy không tồn tại hoặc đã bị xóa!", 404);
  }

  if (!title || !String(title).trim()) {
    throw createAppError("Tiêu đề đề kiểm tra là bắt buộc!", 400);
  }

  const durationNum = parseInt(duration, 10);
  if (!durationNum || durationNum <= 0) {
    throw createAppError("Thời gian làm bài (phút) phải là số nguyên dương!", 400);
  }

  if (!Array.isArray(questionIds) || questionIds.length === 0) {
    throw createAppError("Đề kiểm tra thủ công phải có ít nhất 1 câu hỏi!", 400);
  }

  // Khử trùng lặp ID câu hỏi
  const uniqueQuestionIds = [
    ...new Set(questionIds.map((id) => id?.toString())),
  ].filter((id) => mongoose.Types.ObjectId.isValid(id));

  if (uniqueQuestionIds.length === 0) {
    throw createAppError("Danh sách mã câu hỏi không hợp lệ!", 400);
  }

  // Kiểm tra tất cả câu hỏi có tồn tại và thuộc môn học của TeachingAssignment không
  const questionsInDb = await Question.find({
    _id: { $in: uniqueQuestionIds },
    isDeleted: false,
  });

  if (questionsInDb.length !== uniqueQuestionIds.length) {
    throw createAppError(
      "Một số câu hỏi được chọn không tồn tại hoặc đã bị xóa khỏi ngân hàng!",
      400
    );
  }

  const taSubjectId = (ta.subject?._id || ta.subject).toString();
  const invalidSubjectQuestion = questionsInDb.find(
    (q) => (q.subject?._id || q.subject).toString() !== taSubjectId
  );

  if (invalidSubjectQuestion) {
    throw createAppError(
      "Tất cả câu hỏi trong đề phải thuộc cùng môn học của phân công giảng dạy này!",
      400
    );
  }

  const exam = new Exam({
    teachingAssignment,
    title: String(title).trim(),
    description: String(description || "").trim(),
    duration: durationNum,
    questionIds: uniqueQuestionIds,
    scoreWeight: Number(scoreWeight) || 10,
    teacher: user.userId,
    status: "draft",
    isPublished: false,
    startTime: startTime ? new Date(startTime) : null,
    endTime: endTime ? new Date(endTime) : null,
    isDeleted: false,
  });

  await exam.save();

  return await Exam.findById(exam._id)
    .populate({
      path: "teachingAssignment",
      populate: ["class", "subject", "teacher"],
    })
    .populate("questionIds")
    .populate("teacher", "fullName email userCode");
};

/**
 * Xem trước (preview) danh sách câu hỏi ngẫu nhiên sinh ra theo tiêu chí
 */
const previewRandomQuestions = async (data = {}, context = {}) => {
  const { teachingAssignment, totalQuestions, chapter, difficulty, criteria } =
    data;

  const { targetTeachingAssignment } = context;

  if (!teachingAssignment || !mongoose.Types.ObjectId.isValid(teachingAssignment)) {
    throw createAppError("Mã phân công giảng dạy không hợp lệ!", 400);
  }

  const ta =
    targetTeachingAssignment ||
    (await TeachingAssignment.findOne({
      _id: teachingAssignment,
      isDeleted: false,
    }));

  if (!ta) {
    throw createAppError("Phân công giảng dạy không tồn tại!", 404);
  }

  const subjectId = (ta.subject?._id || ta.subject).toString();
  const selectedQuestionIds = await sampleRandomQuestions(subjectId, {
    totalQuestions,
    chapter,
    difficulty,
    criteria,
  });

  const questions = await Question.find({
    _id: { $in: selectedQuestionIds },
  }).populate("subject", "name code");

  return {
    total: questions.length,
    questionIds: selectedQuestionIds,
    questions,
  };
};

/**
 * Tạo đề kiểm tra ngẫu nhiên theo tiêu chí (số lượng, chương, độ khó)
 */
const createRandomExam = async (data = {}, context = {}) => {
  const {
    teachingAssignment,
    title,
    description = "",
    duration,
    scoreWeight = 10,
    startTime = null,
    endTime = null,
    totalQuestions,
    chapter,
    difficulty,
    criteria,
  } = data;

  const { user, targetTeachingAssignment } = context;

  if (!user) {
    throw createAppError("Chưa xác thực thông tin người dùng!", 401);
  }

  if (!teachingAssignment || !mongoose.Types.ObjectId.isValid(teachingAssignment)) {
    throw createAppError("Mã phân công giảng dạy không hợp lệ!", 400);
  }

  const ta =
    targetTeachingAssignment ||
    (await TeachingAssignment.findOne({
      _id: teachingAssignment,
      isDeleted: false,
    }));

  if (!ta) {
    throw createAppError("Phân công giảng dạy không tồn tại!", 404);
  }

  if (!title || !String(title).trim()) {
    throw createAppError("Tiêu đề đề kiểm tra là bắt buộc!", 400);
  }

  const durationNum = parseInt(duration, 10);
  if (!durationNum || durationNum <= 0) {
    throw createAppError("Thời gian làm bài (phút) phải là số nguyên dương!", 400);
  }

  const subjectId = (ta.subject?._id || ta.subject).toString();
  const selectedQuestionIds = await sampleRandomQuestions(subjectId, {
    totalQuestions,
    chapter,
    difficulty,
    criteria,
  });

  const exam = new Exam({
    teachingAssignment,
    title: String(title).trim(),
    description: String(description || "").trim(),
    duration: durationNum,
    questionIds: selectedQuestionIds,
    scoreWeight: Number(scoreWeight) || 10,
    teacher: user.userId,
    status: "draft",
    isPublished: false,
    startTime: startTime ? new Date(startTime) : null,
    endTime: endTime ? new Date(endTime) : null,
    isDeleted: false,
  });

  await exam.save();

  return await Exam.findById(exam._id)
    .populate({
      path: "teachingAssignment",
      populate: ["class", "subject", "teacher"],
    })
    .populate("questionIds")
    .populate("teacher", "fullName email userCode");
};

/**
 * Lấy danh sách đề kiểm tra
 */
const getExams = async (queryParams = {}, user = {}) => {
  const {
    teachingAssignment,
    status,
    search,
    page = 1,
    limit = 20,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = queryParams;

  const filter = { isDeleted: false };

  if (teachingAssignment && mongoose.Types.ObjectId.isValid(teachingAssignment)) {
    filter.teachingAssignment = teachingAssignment;
  }

  if (status && ["draft", "published", "closed"].includes(status)) {
    filter.status = status;
  }

  if (search && String(search).trim()) {
    filter.title = { $regex: String(search).trim(), $options: "i" };
  }

  // Phân quyền dữ liệu theo vai trò
  if (user.role === "student") {
    // Học sinh chỉ xem đề đã phát hành
    filter.status = "published";

    // Lọc theo lớp mà học sinh đang theo học
    const { studentClass } =
      await lessonPermissionMiddleware.getStudentEnrolledClass(user.userId);
    const classTeachingAssignments = await TeachingAssignment.find({
      class: studentClass._id,
      isDeleted: false,
    }).select("_id");

    const taIds = classTeachingAssignments.map((ta) => ta._id);
    filter.teachingAssignment = { $in: taIds };
  } else if (user.role === "teacher" && queryParams.scope === "mine") {
    filter.teacher = user.userId;
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const sortDirection = sortOrder === "asc" ? 1 : -1;
  const sortOptions = { [sortBy]: sortDirection };

  const [exams, total] = await Promise.all([
    Exam.find(filter)
      .populate({
        path: "teachingAssignment",
        populate: ["class", "subject", "teacher"],
      })
      .populate("questionIds")
      .populate("teacher", "fullName email userCode")
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Exam.countDocuments(filter),
  ]);

  // Format bảo mật đáp án cho học sinh
  const formattedExams = exams.map((exam) =>
    formatExamForUser(exam, user.role)
  );

  return {
    exams: formattedExams,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
};

/**
 * Lấy chi tiết đề kiểm tra theo ID
 */
const getExamById = async (id, user = {}) => {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw createAppError("Mã đề kiểm tra không hợp lệ!", 400);
  }

  const exam = await Exam.findOne({ _id: id, isDeleted: false })
    .populate({
      path: "teachingAssignment",
      populate: ["class", "subject", "teacher"],
    })
    .populate("questionIds")
    .populate("teacher", "fullName email userCode");

  if (!exam) {
    throw createAppError("Đề kiểm tra không tồn tại hoặc đã bị xóa!", 404);
  }

  const formattedExam = formatExamForUser(exam, user.role);

  // Nếu người dùng là học sinh, bổ sung trạng thái đã nộp bài hay chưa (vẫn tuyệt đối không lộ correctIndex)
  if (user.role === "student" && user.userId && formattedExam) {
    const existingAttempt = await ExamAttempt.findOne({
      exam: id,
      student: user.userId,
      isDeleted: false,
    });
    if (existingAttempt) {
      formattedExam.hasSubmitted = true;
      formattedExam.attemptId = existingAttempt._id;
      formattedExam.attempt = {
        _id: existingAttempt._id,
        score: existingAttempt.score,
        scoreWeight: existingAttempt.scoreWeight,
        totalQuestions: existingAttempt.totalQuestions,
        correctCount: existingAttempt.correctCount,
        wrongCount: existingAttempt.wrongCount,
        unansweredCount: existingAttempt.unansweredCount,
        submittedAt: existingAttempt.submittedAt,
        status: existingAttempt.status,
      };
    } else {
      formattedExam.hasSubmitted = false;
      formattedExam.attemptId = null;
      formattedExam.attempt = null;
    }
  }

  return formattedExam;
};

/**
 * Cập nhật thông tin đề kiểm tra (cho phép chỉnh sửa câu hỏi trước khi publish)
 */
const updateExam = async (id, updateData = {}, context = {}) => {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw createAppError("Mã đề kiểm tra không hợp lệ!", 400);
  }

  const exam =
    context.preloadedExam ||
    (await Exam.findOne({ _id: id, isDeleted: false }).populate(
      "teachingAssignment"
    ));

  if (!exam) {
    throw createAppError("Đề kiểm tra không tồn tại hoặc đã bị xóa!", 404);
  }

  // Nếu đề đã phát hành, không cho phép chỉnh sửa danh sách câu hỏi
  if (
    (exam.status === "published" || exam.isPublished) &&
    updateData.questionIds !== undefined
  ) {
    throw createAppError(
      "Không thể chỉnh sửa danh sách câu hỏi sau khi đề kiểm tra đã được phát hành!",
      400
    );
  }

  if (updateData.title !== undefined) {
    if (!String(updateData.title).trim()) {
      throw createAppError("Tiêu đề đề kiểm tra không được để trống!", 400);
    }
    exam.title = String(updateData.title).trim();
  }

  if (updateData.description !== undefined) {
    exam.description = String(updateData.description || "").trim();
  }

  if (updateData.duration !== undefined) {
    const durationNum = parseInt(updateData.duration, 10);
    if (!durationNum || durationNum <= 0) {
      throw createAppError("Thời gian làm bài phải lớn hơn 0!", 400);
    }
    exam.duration = durationNum;
  }

  if (updateData.scoreWeight !== undefined) {
    exam.scoreWeight = Number(updateData.scoreWeight) || 10;
  }

  if (updateData.startTime !== undefined) {
    exam.startTime = updateData.startTime ? new Date(updateData.startTime) : null;
  }

  if (updateData.endTime !== undefined) {
    exam.endTime = updateData.endTime ? new Date(updateData.endTime) : null;
  }

  // Cập nhật câu hỏi nếu đề chưa publish
  if (updateData.questionIds !== undefined) {
    if (!Array.isArray(updateData.questionIds) || updateData.questionIds.length === 0) {
      throw createAppError("Đề kiểm tra phải có ít nhất 1 câu hỏi!", 400);
    }

    const uniqueIds = [
      ...new Set(updateData.questionIds.map((qId) => qId?.toString())),
    ].filter((qId) => mongoose.Types.ObjectId.isValid(qId));

    const ta = await TeachingAssignment.findById(
      exam.teachingAssignment?._id || exam.teachingAssignment
    );
    const taSubjectId = (ta?.subject?._id || ta?.subject)?.toString();

    const questionsInDb = await Question.find({
      _id: { $in: uniqueIds },
      isDeleted: false,
    });

    if (questionsInDb.length !== uniqueIds.length) {
      throw createAppError(
        "Một số câu hỏi cập nhật không tồn tại trong ngân hàng!",
        400
      );
    }

    if (taSubjectId) {
      const invalidSubject = questionsInDb.find(
        (q) => (q.subject?._id || q.subject).toString() !== taSubjectId
      );
      if (invalidSubject) {
        throw createAppError(
          "Các câu hỏi phải thuộc đúng môn học của phân công giảng dạy!",
          400
        );
      }
    }

    exam.questionIds = uniqueIds;
  }

  await exam.save();

  const updatedDoc = await Exam.findById(exam._id)
    .populate({
      path: "teachingAssignment",
      populate: ["class", "subject", "teacher"],
    })
    .populate("questionIds")
    .populate("teacher", "fullName email userCode");

  return formatExamForUser(updatedDoc, context.user?.role);
};

/**
 * Phát hành đề kiểm tra cho lớp học (Publish Exam)
 */
const publishExam = async (id, context = {}) => {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw createAppError("Mã đề kiểm tra không hợp lệ!", 400);
  }

  const exam =
    context.preloadedExam ||
    (await Exam.findOne({ _id: id, isDeleted: false }).populate(
      "teachingAssignment"
    ));

  if (!exam) {
    throw createAppError("Đề kiểm tra không tồn tại hoặc đã bị xóa!", 404);
  }

  if (!exam.questionIds || exam.questionIds.length === 0) {
    throw createAppError(
      "Đề kiểm tra chưa có câu hỏi nào, không thể phát hành!",
      400
    );
  }

  exam.status = "published";
  exam.isPublished = true;
  exam.publishedAt = new Date();

  await exam.save();

  // Gửi thông báo đến học sinh của lớp học (nếu có học sinh)
  try {
    const classId =
      exam.teachingAssignment?.class?._id || exam.teachingAssignment?.class;
    if (classId) {
      const students = await User.find({
        role: "student",
        $or: [{ classRef: classId }, { isActivated: true }],
      }).select("_id");

      if (students.length > 0) {
        const notifications = students.map((s) => ({
          recipient: s._id,
          sender: exam.teacher,
          type: "general",
          title: `Đề kiểm tra mới: ${exam.title}`,
          message: `Giáo viên vừa phát hành đề kiểm tra '${exam.title}' (${exam.duration} phút). Vui lòng vào làm bài đúng hạn!`,
          metadata: { examId: exam._id, type: "exam" },
        }));
        await Notification.insertMany(notifications, { ordered: false }).catch(
          () => {}
        );
      }
    }
  } catch (err) {
    // Không làm gián đoạn luồng chính nếu lỗi thông báo
  }

  const updatedDoc = await Exam.findById(exam._id)
    .populate({
      path: "teachingAssignment",
      populate: ["class", "subject", "teacher"],
    })
    .populate("questionIds")
    .populate("teacher", "fullName email userCode");

  return formatExamForUser(updatedDoc, context.user?.role);
};

/**
 * Xóa mềm đề kiểm tra (soft delete)
 */
const deleteExam = async (id, context = {}) => {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw createAppError("Mã đề kiểm tra không hợp lệ!", 400);
  }

  const exam =
    context.preloadedExam ||
    (await Exam.findOne({ _id: id, isDeleted: false }));

  if (!exam) {
    throw createAppError("Đề kiểm tra không tồn tại hoặc đã bị xóa!", 404);
  }

  exam.isDeleted = true;
  await exam.save();

  return {
    success: true,
    message: "Xóa đề kiểm tra thành công",
    id: exam._id,
  };
};

/**
 * Engine tự động chấm điểm bài làm trắc nghiệm
 * @param {Array<Object>} questions Danh sách câu hỏi kèm đáp án đúng (correctIndex) từ database
 * @param {Array|Object} studentAnswers Danh sách đáp án học sinh đã chọn
 * @param {number} scoreWeight Thang điểm của đề (mặc định 10)
 * @returns {Object} { processedAnswers, score, scoreWeight, totalQuestions, correctCount, wrongCount, unansweredCount }
 */
const gradeExamAnswers = (
  questions = [],
  studentAnswers = [],
  scoreWeight = 10
) => {
  const answerMap = new Map();

  if (Array.isArray(studentAnswers)) {
    for (const item of studentAnswers) {
      if (!item) continue;
      const qId = (item.questionId || item.question || item._id)?.toString();
      if (qId) {
        answerMap.set(qId, item.selectedOption);
      }
    }
  } else if (studentAnswers && typeof studentAnswers === "object") {
    for (const [key, value] of Object.entries(studentAnswers)) {
      if (key) {
        answerMap.set(key.toString(), value);
      }
    }
  }

  let correctCount = 0;
  let wrongCount = 0;
  let unansweredCount = 0;
  const processedAnswers = [];

  for (const question of questions) {
    if (!question) continue;
    const qId = (question._id || question.id)?.toString();
    const rawChoice = answerMap.get(qId);

    let selectedOption = null;
    const optionsLen = Array.isArray(question.options)
      ? question.options.length
      : 4;

    if (
      rawChoice !== undefined &&
      rawChoice !== null &&
      rawChoice !== "" &&
      !isNaN(Number(rawChoice)) &&
      Number.isInteger(Number(rawChoice)) &&
      Number(rawChoice) >= 0 &&
      Number(rawChoice) < optionsLen
    ) {
      selectedOption = Number(rawChoice);
    }

    const isAnswered = selectedOption !== null;
    const isCorrect = isAnswered && selectedOption === question.correctIndex;

    if (!isAnswered) {
      unansweredCount++;
    } else if (isCorrect) {
      correctCount++;
    } else {
      wrongCount++;
    }

    processedAnswers.push({
      question: question._id || question.id,
      selectedOption,
      isCorrect,
    });
  }

  const totalQuestions = questions.length;
  const weight = Number(scoreWeight) > 0 ? Number(scoreWeight) : 10;
  const rawScore =
    totalQuestions > 0 ? (correctCount / totalQuestions) * weight : 0;
  // Làm tròn đến 2 chữ số thập phân
  const score = Math.round((rawScore + Number.EPSILON) * 100) / 100;

  return {
    processedAnswers,
    score,
    scoreWeight: weight,
    totalQuestions,
    correctCount,
    wrongCount,
    unansweredCount,
  };
};

/**
 * Học sinh nộp bài kiểm tra & Hệ thống tự động chấm điểm tại Backend
 */
const submitExam = async (examId, submitData = {}, context = {}) => {
  const { user } = context;

  if (!user) {
    throw createAppError("Chưa xác thực thông tin người dùng!", 401);
  }

  if (!examId || !mongoose.Types.ObjectId.isValid(examId)) {
    throw createAppError("Mã đề kiểm tra không hợp lệ!", 400);
  }

  const exam =
    context.preloadedExam ||
    (await Exam.findOne({ _id: examId, isDeleted: false }).populate(
      "teachingAssignment"
    ));

  if (!exam) {
    throw createAppError("Đề kiểm tra không tồn tại hoặc đã bị xóa!", 404);
  }

  if (exam.status !== "published" && !exam.isPublished) {
    throw createAppError(
      "Đề kiểm tra chưa được phát hành, không thể làm bài và nộp bài!",
      403
    );
  }

  // Nếu là học sinh, kiểm tra có thuộc lớp của đề kiểm tra không
  if (user.role === "student") {
    const { studentClass } =
      await lessonPermissionMiddleware.getStudentEnrolledClass(user.userId);
    const examClassId = (
      exam.teachingAssignment?.class?._id || exam.teachingAssignment?.class
    )?.toString();

    if (studentClass._id.toString() !== examClassId) {
      throw createAppError(
        "Học sinh không thuộc lớp học của đề kiểm tra này, không thể nộp bài!",
        403
      );
    }
  }

  // Kiểm tra học sinh đã nộp bài này trước đó chưa (Chống nộp lại & chống ghi đè kết quả)
  const existingAttempt = await ExamAttempt.findOne({
    exam: exam._id,
    student: user.userId,
    isDeleted: false,
  });

  if (existingAttempt) {
    throw createAppError(
      "Bạn đã nộp bài kiểm tra này rồi! Hệ thống không cho phép nộp lại hoặc chỉnh sửa kết quả.",
      400
    );
  }

  // Lấy danh sách câu hỏi gốc từ DB (bao gồm đáp án đúng correctIndex được bảo vệ tại server)
  const questionDocs = await Question.find({
    _id: { $in: exam.questionIds },
    isDeleted: false,
  });

  // Đảm bảo thứ tự câu hỏi khớp chính xác với exam.questionIds
  const questionMap = new Map(questionDocs.map((q) => [q._id.toString(), q]));
  const orderedQuestions = exam.questionIds
    .map((id) => questionMap.get(id.toString()))
    .filter(Boolean);

  if (orderedQuestions.length === 0) {
    throw createAppError(
      "Đề kiểm tra không có câu hỏi nào hợp lệ để chấm điểm!",
      400
    );
  }

  // Thực hiện chấm điểm tự động tại Backend
  const {
    processedAnswers,
    score,
    scoreWeight,
    totalQuestions,
    correctCount,
    wrongCount,
    unansweredCount,
  } = gradeExamAnswers(orderedQuestions, submitData.answers, exam.scoreWeight);

  const durationSpent = Math.max(0, parseInt(submitData.durationSpent, 10) || 0);

  // Lưu bản ghi làm bài (ExamAttempt)
  const attempt = new ExamAttempt({
    exam: exam._id,
    student: user.userId,
    answers: processedAnswers,
    score,
    scoreWeight,
    totalQuestions,
    correctCount,
    wrongCount,
    unansweredCount,
    durationSpent,
    startedAt: submitData.startedAt
      ? new Date(submitData.startedAt)
      : new Date(Date.now() - durationSpent * 1000),
    submittedAt: new Date(),
    status: "completed",
  });

  await attempt.save();

  // Populate đầy đủ thông tin (kèm đáp án đúng và lời giải) để học sinh xem lại sau khi nộp
  const populatedAttempt = await ExamAttempt.findById(attempt._id)
    .populate({
      path: "exam",
      select: "title duration scoreWeight teachingAssignment",
      populate: {
        path: "teachingAssignment",
        select: "class subject teacher",
        populate: [
          { path: "class", select: "name code" },
          { path: "subject", select: "name code" },
        ],
      },
    })
    .populate({
      path: "answers.question",
      select: "content options correctIndex explanation chapter difficulty",
    })
    .populate("student", "fullName email userCode");

  return populatedAttempt;
};

/**
 * Xem kết quả chi tiết bài làm của học sinh (kèm đáp án đúng sau khi đã nộp)
 */
const getExamAttempt = async (examId, query = {}, context = {}) => {
  const { user } = context;

  if (!user) {
    throw createAppError("Chưa xác thực thông tin người dùng!", 401);
  }

  if (!examId || !mongoose.Types.ObjectId.isValid(examId)) {
    throw createAppError("Mã đề kiểm tra không hợp lệ!", 400);
  }

  let targetStudentId = user.userId;
  if (["teacher", "admin"].includes(user.role) && query.studentId) {
    if (!mongoose.Types.ObjectId.isValid(query.studentId)) {
      throw createAppError("Mã học sinh không hợp lệ!", 400);
    }
    targetStudentId = query.studentId;
  }

  const attempt = await ExamAttempt.findOne({
    exam: examId,
    student: targetStudentId,
    isDeleted: false,
  })
    .populate({
      path: "exam",
      select: "title duration scoreWeight teachingAssignment",
      populate: {
        path: "teachingAssignment",
        select: "class subject teacher",
        populate: [
          { path: "class", select: "name code" },
          { path: "subject", select: "name code" },
        ],
      },
    })
    .populate({
      path: "answers.question",
      select: "content options correctIndex explanation chapter difficulty",
    })
    .populate("student", "fullName email userCode");

  if (!attempt) {
    throw createAppError(
      "Chưa tìm thấy bài làm của học sinh cho đề kiểm tra này!",
      404
    );
  }

  return attempt;
};

/**
 * Giáo viên / Quản trị viên xem toàn bộ danh sách kết quả bài làm của cả lớp
 */
const getExamAttempts = async (examId, _query = {}, context = {}) => {
  const { user } = context;

  if (!user) {
    throw createAppError("Chưa xác thực thông tin người dùng!", 401);
  }

  if (!examId || !mongoose.Types.ObjectId.isValid(examId)) {
    throw createAppError("Mã đề kiểm tra không hợp lệ!", 400);
  }

  const exam =
    context.preloadedExam ||
    (await Exam.findOne({ _id: examId, isDeleted: false }));

  if (!exam) {
    throw createAppError("Đề kiểm tra không tồn tại hoặc đã bị xóa!", 404);
  }

  const attempts = await ExamAttempt.find({
    exam: examId,
    isDeleted: false,
  })
    .populate("student", "fullName email userCode avatar")
    .sort({ submittedAt: -1 });

  const totalAttempts = attempts.length;
  const scores = attempts.map((a) => a.score);
  const averageScore =
    totalAttempts > 0
      ? Math.round(
          (scores.reduce((sum, s) => sum + s, 0) / totalAttempts) * 100
        ) / 100
      : 0;
  const highestScore = totalAttempts > 0 ? Math.max(...scores) : 0;
  const lowestScore = totalAttempts > 0 ? Math.min(...scores) : 0;

  return {
    examId,
    attempts,
    statistics: {
      totalAttempts,
      averageScore,
      highestScore,
      lowestScore,
    },
  };
};

module.exports = {
  gradeExamAnswers,
  submitExam,
  getExamAttempt,
  getExamAttempts,
  formatExamForUser,
  sampleRandomQuestions,
  createManualExam,
  previewRandomQuestions,
  createRandomExam,
  getExams,
  getExamById,
  updateExam,
  publishExam,
  deleteExam,
};
