const mongoose = require("mongoose");
const Question = require("../models/Question");
const Subject = require("../models/Subject");

const VALID_DIFFICULTIES = [
  "easy",
  "medium",
  "hard",
  "nhan_biet",
  "thong_hieu",
  "van_dung",
  "van_dung_cao",
];

/**
 * Tạo Error có gắn statusCode HTTP
 */
const createAppError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

/**
 * Chuẩn hóa và xác thực danh sách options
 */
const validateAndNormalizeOptions = (options) => {
  if (!Array.isArray(options)) {
    throw createAppError("Danh sách các phương án trả lời phải là một mảng!", 400);
  }

  if (options.length < 2) {
    throw createAppError("Câu hỏi trắc nghiệm phải có ít nhất 2 phương án trả lời!", 400);
  }

  const normalized = options.map((opt, idx) => {
    if (typeof opt !== "string" || !opt.trim()) {
      throw createAppError(
        `Phương án thứ ${idx + 1} không được để trống!`,
        400
      );
    }
    return opt.trim();
  });

  return normalized;
};

/**
 * Xác thực correctIndex so với danh sách options
 */
const validateCorrectIndex = (correctIndex, optionsLength) => {
  if (
    correctIndex === undefined ||
    correctIndex === null ||
    typeof correctIndex !== "number" ||
    !Number.isInteger(correctIndex)
  ) {
    throw createAppError("Chỉ số đáp án đúng (correctIndex) phải là số nguyên!", 400);
  }

  if (correctIndex < 0 || correctIndex >= optionsLength) {
    throw createAppError(
      `Chỉ số đáp án đúng (${correctIndex}) không hợp lệ! Phải nằm trong khoảng từ 0 đến ${
        optionsLength - 1
      }`,
      400
    );
  }
};

/**
 * Tạo câu hỏi mới trong ngân hàng câu hỏi
 */
const createQuestion = async (data = {}, context = {}) => {
  const {
    subject,
    chapter,
    difficulty = "medium",
    content,
    options,
    correctIndex,
    explanation = "",
    isActive = true,
  } = data;

  const { user, targetSubject } = context;

  if (!user) {
    throw createAppError("Chưa xác thực thông tin người dùng!", 401);
  }

  if (!subject) {
    throw createAppError("Môn học (subject) là bắt buộc!", 400);
  }

  if (!mongoose.Types.ObjectId.isValid(subject)) {
    throw createAppError("Mã môn học (subject) không hợp lệ!", 400);
  }

  // Kiểm tra môn học tồn tại nếu chưa nạp sẵn từ middleware
  if (!targetSubject) {
    const subjectExists = await Subject.findOne({
      _id: subject,
      isDeleted: false,
    });
    if (!subjectExists) {
      throw createAppError("Môn học không tồn tại hoặc đã bị xóa!", 404);
    }
  }

  if (!chapter || !String(chapter).trim()) {
    throw createAppError("Chương (chapter) là bắt buộc và không được để trống!", 400);
  }

  const cleanDifficulty = String(difficulty).trim().toLowerCase();
  if (!VALID_DIFFICULTIES.includes(cleanDifficulty)) {
    throw createAppError(
      `Độ khó '${difficulty}' không hợp lệ! Hỗ trợ: easy, medium, hard, nhan_biet, thong_hieu, van_dung, van_dung_cao`,
      400
    );
  }

  if (!content || !String(content).trim()) {
    throw createAppError("Nội dung câu hỏi (content) là bắt buộc!", 400);
  }

  if (String(content).trim().length < 3) {
    throw createAppError("Nội dung câu hỏi phải có ít nhất 3 ký tự!", 400);
  }

  const normalizedOptions = validateAndNormalizeOptions(options);
  validateCorrectIndex(correctIndex, normalizedOptions.length);

  const newQuestion = new Question({
    subject,
    chapter: String(chapter).trim(),
    difficulty: cleanDifficulty,
    content: String(content).trim(),
    options: normalizedOptions,
    correctIndex,
    explanation: String(explanation || "").trim(),
    teacher: user.userId,
    createdBy: user.userId,
    isActive: isActive !== false,
    isDeleted: false,
  });

  await newQuestion.save();

  return await Question.findById(newQuestion._id)
    .populate("subject", "name code gradeLevel")
    .populate("teacher", "fullName email userCode role");
};

/**
 * Lấy danh sách câu hỏi với bộ lọc linh hoạt (môn học, chương, độ khó, tìm kiếm)
 */
const getQuestions = async (queryParams = {}, user = {}) => {
  const {
    subject,
    chapter,
    difficulty,
    search,
    q,
    teacher,
    page = 1,
    limit = 20,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = queryParams;

  const filter = { isDeleted: false };

  // Lọc theo Môn học
  if (subject) {
    if (!mongoose.Types.ObjectId.isValid(subject)) {
      throw createAppError("Mã môn học không hợp lệ!", 400);
    }
    filter.subject = subject;
  }

  // Lọc theo Chương
  if (chapter && String(chapter).trim()) {
    filter.chapter = {
      $regex: `^${String(chapter).trim()}$`,
      $options: "i",
    };
  }

  // Lọc theo Độ khó
  if (difficulty && String(difficulty).trim()) {
    filter.difficulty = String(difficulty).trim().toLowerCase();
  }

  // Lọc theo Giáo viên tạo
  if (teacher && mongoose.Types.ObjectId.isValid(teacher)) {
    filter.teacher = teacher;
  }

  // Tìm kiếm từ khóa trong nội dung câu hỏi
  const keyword = search || q;
  if (keyword && String(keyword).trim()) {
    filter.content = {
      $regex: String(keyword).trim(),
      $options: "i",
    };
  }

  // Nếu là giáo viên và không truyền subject, hỗ trợ xem câu hỏi thuộc các môn mình dạy hoặc do mình tạo
  if (user && user.role === "teacher" && !subject && queryParams.scope === "mine") {
    filter.teacher = user.userId;
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const sortDirection = sortOrder === "asc" ? 1 : -1;
  const sortOptions = { [sortBy]: sortDirection };

  const [questions, total] = await Promise.all([
    Question.find(filter)
      .populate("subject", "name code gradeLevel")
      .populate("teacher", "fullName email userCode role")
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Question.countDocuments(filter),
  ]);

  return {
    questions,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
};

/**
 * Lấy chi tiết một câu hỏi theo ID
 */
const getQuestionById = async (id) => {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw createAppError("Mã câu hỏi không hợp lệ!", 400);
  }

  const question = await Question.findOne({
    _id: id,
    isDeleted: false,
  })
    .populate("subject", "name code gradeLevel")
    .populate("teacher", "fullName email userCode role");

  if (!question) {
    throw createAppError("Câu hỏi không tồn tại hoặc đã bị xóa!", 404);
  }

  return question;
};

/**
 * Cập nhật thông tin câu hỏi
 */
const updateQuestion = async (id, updateData = {}, context = {}) => {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw createAppError("Mã câu hỏi không hợp lệ!", 400);
  }

  const question =
    context.preloadedQuestion ||
    (await Question.findOne({ _id: id, isDeleted: false }));

  if (!question) {
    throw createAppError("Câu hỏi không tồn tại hoặc đã bị xóa!", 404);
  }

  // Cập nhật môn học nếu có
  if (updateData.subject !== undefined) {
    if (!mongoose.Types.ObjectId.isValid(updateData.subject)) {
      throw createAppError("Mã môn học không hợp lệ!", 400);
    }
    const subjectExists = await Subject.findOne({
      _id: updateData.subject,
      isDeleted: false,
    });
    if (!subjectExists) {
      throw createAppError("Môn học không tồn tại hoặc đã bị xóa!", 404);
    }
    question.subject = updateData.subject;
  }

  // Cập nhật chương nếu có
  if (updateData.chapter !== undefined) {
    if (!String(updateData.chapter).trim()) {
      throw createAppError("Chương không được để trống!", 400);
    }
    question.chapter = String(updateData.chapter).trim();
  }

  // Cập nhật độ khó nếu có
  if (updateData.difficulty !== undefined) {
    const cleanDiff = String(updateData.difficulty).trim().toLowerCase();
    if (!VALID_DIFFICULTIES.includes(cleanDiff)) {
      throw createAppError(`Độ khó '${updateData.difficulty}' không hợp lệ!`, 400);
    }
    question.difficulty = cleanDiff;
  }

  // Cập nhật nội dung câu hỏi nếu có
  if (updateData.content !== undefined) {
    if (!String(updateData.content).trim()) {
      throw createAppError("Nội dung câu hỏi không được để trống!", 400);
    }
    if (String(updateData.content).trim().length < 3) {
      throw createAppError("Nội dung câu hỏi phải có ít nhất 3 ký tự!", 400);
    }
    question.content = String(updateData.content).trim();
  }

  // Cập nhật options & correctIndex
  const newOptions =
    updateData.options !== undefined
      ? validateAndNormalizeOptions(updateData.options)
      : question.options;

  const newCorrectIndex =
    updateData.correctIndex !== undefined
      ? updateData.correctIndex
      : question.correctIndex;

  validateCorrectIndex(newCorrectIndex, newOptions.length);

  question.options = newOptions;
  question.correctIndex = newCorrectIndex;

  if (updateData.explanation !== undefined) {
    question.explanation = String(updateData.explanation || "").trim();
  }

  if (updateData.isActive !== undefined) {
    question.isActive = Boolean(updateData.isActive);
  }

  await question.save();

  return await Question.findById(question._id)
    .populate("subject", "name code gradeLevel")
    .populate("teacher", "fullName email userCode role");
};

/**
 * Xóa mềm câu hỏi
 */
const deleteQuestion = async (id, context = {}) => {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw createAppError("Mã câu hỏi không hợp lệ!", 400);
  }

  const question =
    context.preloadedQuestion ||
    (await Question.findOne({ _id: id, isDeleted: false }));

  if (!question) {
    throw createAppError("Câu hỏi không tồn tại hoặc đã bị xóa!", 404);
  }

  question.isDeleted = true;
  await question.save();

  return {
    success: true,
    message: "Xóa câu hỏi thành công",
    id: question._id,
  };
};

/**
 * Lấy danh sách các chương hiện có của một môn học (phục vụ lọc & chọn tạo đề)
 */
const getChaptersBySubject = async (subjectId) => {
  if (!subjectId || !mongoose.Types.ObjectId.isValid(subjectId)) {
    throw createAppError("Mã môn học không hợp lệ!", 400);
  }

  const chapters = await Question.distinct("chapter", {
    subject: subjectId,
    isDeleted: false,
  });

  return chapters.sort();
};

/**
 * Thống kê số lượng câu hỏi theo độ khó và chương của môn học
 */
const getQuestionSummary = async (subjectId) => {
  if (!subjectId || !mongoose.Types.ObjectId.isValid(subjectId)) {
    throw createAppError("Mã môn học không hợp lệ!", 400);
  }

  const summary = await Question.aggregate([
    {
      $match: {
        subject: new mongoose.Types.ObjectId(subjectId),
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: {
          chapter: "$chapter",
          difficulty: "$difficulty",
        },
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: "$_id.chapter",
        difficulties: {
          $push: {
            difficulty: "$_id.difficulty",
            count: "$count",
          },
        },
        totalInChapter: { $sum: "$count" },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);

  const totalQuestions = summary.reduce(
    (acc, curr) => acc + curr.totalInChapter,
    0
  );

  return {
    subject: subjectId,
    totalQuestions,
    chapters: summary,
  };
};

module.exports = {
  createQuestion,
  getQuestions,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
  getChaptersBySubject,
  getQuestionSummary,
  validateAndNormalizeOptions,
  validateCorrectIndex,
};
