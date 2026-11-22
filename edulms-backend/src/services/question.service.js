const mongoose = require("mongoose");
const Question = require("../models/Question");
const Subject = require("../models/Subject");
const ExcelJS = require("exceljs");
const TeachingAssignment = require("../models/TeachingAssignment");

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

/**
 * Trích xuất chuỗi text từ giá trị ô Excel (hỗ trợ Hyperlink, RichText, Formula, Date)
 */
const getCellValue = (cellVal) => {
  if (cellVal === null || cellVal === undefined) return "";
  if (typeof cellVal === "object") {
    if (cellVal.text !== undefined && cellVal.text !== null) {
      if (typeof cellVal.text === "object" && Array.isArray(cellVal.text.richText)) {
        return cellVal.text.richText.map((i) => i.text || "").join("").trim();
      }
      return String(cellVal.text).trim();
    }
    if (cellVal.result !== undefined && cellVal.result !== null) {
      return String(cellVal.result).trim();
    }
    if (Array.isArray(cellVal.richText)) {
      return cellVal.richText.map((i) => i.text || "").join("").trim();
    }
    if (cellVal.hyperlink) {
      return String(cellVal.hyperlink).trim();
    }
  }
  return String(cellVal).trim();
};

/**
 * Sinh file Excel mẫu có cấu hình Dropdown Data Validation cho giáo viên
 * @param {object} user Người dùng hiện tại
 * @returns {Promise<Buffer>} Buffer file Excel
 */
const generateQuestionTemplate = async (user) => {
  let subjects = [];
  const teacherId = user._id || user.userId;

  if (user.role === "teacher") {
    const assignments = await TeachingAssignment.find({
      teacher: teacherId,
      isDeleted: false,
    }).populate("subject");

    const seen = new Set();
    assignments.forEach((a) => {
      if (a.subject && !a.subject.isDeleted && !seen.has(String(a.subject._id))) {
        seen.add(String(a.subject._id));
        subjects.push(a.subject);
      }
    });
  }

  // Nếu là admin hoặc giáo viên chưa có phân công, nạp tất cả môn học đang hoạt động
  if (subjects.length === 0) {
    subjects = await Subject.find({ isDeleted: false, isActive: true });
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Edu-LMS";
  workbook.lastModifiedBy = "Edu-LMS";
  workbook.created = new Date();

  // 1. Sheet chính nhập câu hỏi
  const mainSheet = workbook.addWorksheet("CauHoi", {
    views: [{ showGridLines: true }],
  });

  // 2. Sheet phụ lưu danh mục để liên kết Dropdown (được ẩn đi)
  const lookupSheet = workbook.addWorksheet("_DanhMuc", {
    state: "hidden",
  });

  // Nạp danh sách môn học vào Sheet phụ
  lookupSheet.addRow(["DanhSachMonHoc"]);
  subjects.forEach((s) => {
    lookupSheet.addRow([`${s.code} - ${s.name}`]);
  });
  const subjectRowCount = subjects.length > 0 ? subjects.length : 1;

  // Cấu hình các cột cho Sheet chính
  mainSheet.columns = [
    { header: "STT", key: "stt", width: 8 },
    { header: "Môn học (*)", key: "subject", width: 28 },
    { header: "Chương (*)", key: "chapter", width: 30 },
    { header: "Độ khó (*)", key: "difficulty", width: 16 },
    { header: "Nội dung câu hỏi (*)", key: "content", width: 50 },
    { header: "Phương án A (*)", key: "optA", width: 25 },
    { header: "Phương án B (*)", key: "optB", width: 25 },
    { header: "Phương án C", key: "optC", width: 25 },
    { header: "Phương án D", key: "optD", width: 25 },
    { header: "Đáp án đúng (*)", key: "correct", width: 16 },
    { header: "Giải thích", key: "explanation", width: 40 },
  ];

  // Định dạng hàng tiêu đề (Row 1)
  const headerRow = mainSheet.getRow(1);
  headerRow.height = 30;
  headerRow.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E40AF" },
  };

  // Thêm dữ liệu câu hỏi mẫu trực quan (Row 2 và Row 3)
  const firstSubjectText =
    subjects.length > 0
      ? `${subjects[0].code} - ${subjects[0].name}`
      : "TOAN - Toán học";

  mainSheet.addRow({
    stt: 1,
    subject: firstSubjectText,
    chapter: "Chương 1: Mệnh đề và Tập hợp",
    difficulty: "Dễ",
    content: "Trong các câu sau, câu nào là một mệnh đề toán học?",
    optA: "Hôm nay trời đẹp quá!",
    optB: "Số 15 là số nguyên tố.",
    optC: "Bạn có thích học toán không?",
    optD: "x + 2 > 5.",
    correct: "B",
    explanation: "Mệnh đề là khẳng định có tính đúng hoặc sai rõ ràng.",
  });

  mainSheet.addRow({
    stt: 2,
    subject: firstSubjectText,
    chapter: "Chương 1: Mệnh đề và Tập hợp",
    difficulty: "Trung bình",
    content: "Cho hai tập hợp A = {1, 2, 3} và B = {2, 3, 4}. Giao của hai tập hợp A ∩ B là:",
    optA: "{2, 3}",
    optB: "{1, 4}",
    optC: "{1, 2, 3, 4}",
    optD: "Tập rỗng",
    correct: "A",
    explanation: "Phần tử chung của A và B là 2 và 3.",
  });

  // Thiết lập Data Validation Dropdown cho 300 dòng đầu tiên
  for (let r = 2; r <= 300; r++) {
    const row = mainSheet.getRow(r);
    row.alignment = { vertical: "middle", wrapText: true };

    // Dropdown Môn học từ Sheet _DanhMuc
    mainSheet.getCell(`B${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`_DanhMuc!$A$2:$A$${subjectRowCount + 1}`],
      showErrorMessage: true,
      errorTitle: "Môn học không hợp lệ",
      error: "Vui lòng chọn môn học từ danh sách thả xuống!",
    };

    // Dropdown Độ khó (Dễ, Trung bình, Khó)
    mainSheet.getCell(`D${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"Dễ,Trung bình,Khó"'],
      showErrorMessage: true,
      errorTitle: "Độ khó không hợp lệ",
      error: "Vui lòng chọn độ khó từ danh sách thả xuống: Dễ, Trung bình hoặc Khó!",
    };

    // Dropdown Đáp án đúng (A, B, C, D)
    mainSheet.getCell(`J${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"A,B,C,D"'],
      showErrorMessage: true,
      errorTitle: "Đáp án không hợp lệ",
      error: "Vui lòng chọn đáp án đúng từ danh sách thả xuống: A, B, C hoặc D!",
    };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};

/**
 * Đọc và phân tích trước (Preview) file Excel câu hỏi trắc nghiệm
 * @param {Buffer} buffer Buffer file Excel
 * @param {object} user Người dùng hiện tại
 * @returns {Promise<object>} Danh sách câu hỏi đã parse và các lỗi (nếu có)
 */
const previewQuestionsFromExcel = async (buffer, user) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.getWorksheet("CauHoi") || workbook.worksheets[0];
  if (!worksheet) {
    throw createAppError("File Excel không hợp lệ hoặc không có dữ liệu!", 400);
  }

  // Nạp danh mục môn học trong cơ sở dữ liệu
  const allSubjects = await Subject.find({ isDeleted: false });
  const subjectMap = new Map();
  allSubjects.forEach((s) => {
    subjectMap.set(s.code.toUpperCase(), s);
    subjectMap.set(s.name.toLowerCase(), s);
    subjectMap.set(`${s.code} - ${s.name}`.toLowerCase(), s);
    subjectMap.set(String(s._id), s);
  });

  // Xác định các môn học giáo viên được phép tạo câu hỏi
  const teacherId = user._id || user.userId;
  let allowedSubjectIds = null;
  if (user.role === "teacher") {
    const assignments = await TeachingAssignment.find({
      teacher: teacherId,
      isDeleted: false,
    });
    allowedSubjectIds = new Set(assignments.map((a) => String(a.subject)));
  }

  const items = [];
  worksheet.eachRow((row, rowNumber) => {
    // Bỏ qua dòng tiêu đề
    if (rowNumber === 1) return;

    const rawSubject = getCellValue(row.getCell(2).value);
    const chapter = getCellValue(row.getCell(3).value);
    const rawDifficulty = getCellValue(row.getCell(4).value);
    const content = getCellValue(row.getCell(5).value);
    const optA = getCellValue(row.getCell(6).value);
    const optB = getCellValue(row.getCell(7).value);
    const optC = getCellValue(row.getCell(8).value);
    const optD = getCellValue(row.getCell(9).value);
    const rawCorrect = getCellValue(row.getCell(10).value);
    const explanation = getCellValue(row.getCell(11).value);

    // Kiểm tra dòng rỗng hoàn toàn -> bỏ qua
    const isRowEmpty = [
      rawSubject,
      chapter,
      rawDifficulty,
      content,
      optA,
      optB,
      optC,
      optD,
      rawCorrect,
    ].every((v) => !v);
    if (isRowEmpty) return;

    const errors = [];

    // 1. Kiểm tra Môn học
    let subjectDoc = null;
    if (!rawSubject) {
      errors.push("Chưa chọn Môn học");
    } else {
      const codePart = rawSubject.split("-")[0].trim().toUpperCase();
      subjectDoc =
        subjectMap.get(codePart) ||
        subjectMap.get(rawSubject.toLowerCase()) ||
        subjectMap.get(rawSubject.toUpperCase());

      if (!subjectDoc) {
        errors.push(`Môn học '${rawSubject}' không tồn tại trong hệ thống`);
      } else if (
        allowedSubjectIds &&
        !allowedSubjectIds.has(String(subjectDoc._id))
      ) {
        errors.push(
          `Bạn không được phân công giảng dạy môn '${subjectDoc.name}'`
        );
      }
    }

    // 2. Kiểm tra Chương
    if (!chapter) {
      errors.push("Tên chương không được để trống");
    }

    // 3. Chuẩn hóa Độ khó
    let difficulty = "medium";
    const diffLower = rawDifficulty.toLowerCase().trim();
    if (["dễ", "easy", "nhan_biet"].includes(diffLower)) {
      difficulty = "easy";
    } else if (["trung bình", "tb", "medium", "thong_hieu"].includes(diffLower)) {
      difficulty = "medium";
    } else if (
      ["khó", "hard", "van_dung", "van_dung_cao"].includes(diffLower)
    ) {
      difficulty = "hard";
    } else if (diffLower) {
      errors.push(`Độ khó '${rawDifficulty}' không hợp lệ (hỗ trợ: Dễ, Trung bình, Khó)`);
    }

    // 4. Kiểm tra Nội dung
    if (!content || content.length < 3) {
      errors.push("Nội dung câu hỏi phải có ít nhất 3 ký tự");
    }

    // 5. Kiểm tra Phương án trả lời
    const rawOptions = [optA, optB, optC, optD];
    const options = rawOptions.filter((opt) => opt && opt.length > 0);
    if (!optA || !optB) {
      errors.push("Phương án A và Phương án B là bắt buộc");
    }
    if (options.length < 2) {
      errors.push("Câu hỏi phải có tối thiểu 2 phương án trả lời");
    }

    // 6. Kiểm tra Đáp án đúng
    let correctIndex = -1;
    const correctClean = rawCorrect.toUpperCase().trim();
    if (correctClean === "A" || correctClean === "1") correctIndex = 0;
    else if (correctClean === "B" || correctClean === "2") correctIndex = 1;
    else if (correctClean === "C" || correctClean === "3") correctIndex = 2;
    else if (correctClean === "D" || correctClean === "4") correctIndex = 3;

    if (correctIndex < 0 || correctIndex >= options.length) {
      errors.push(
        `Đáp án đúng '${rawCorrect || "Trống"}' không hợp lệ (phải chọn A, B, C hoặc D tương ứng phương án đã điền)`
      );
    }

    items.push({
      rowNumber,
      isValid: errors.length === 0,
      errors,
      data: {
        subject: subjectDoc ? subjectDoc._id : null,
        subjectCode: subjectDoc ? subjectDoc.code : "",
        subjectName: subjectDoc ? subjectDoc.name : rawSubject,
        chapter,
        difficulty,
        content,
        options,
        correctIndex,
        correctLabel: ["A", "B", "C", "D"][correctIndex] || "",
        explanation: explanation || "",
      },
    });
  });

  const validCount = items.filter((it) => it.isValid).length;
  const errorCount = items.length - validCount;

  return {
    totalRows: items.length,
    validCount,
    errorCount,
    items,
  };
};

/**
 * Xác nhận lưu hàng loạt các câu hỏi hợp lệ vào Ngân hàng câu hỏi
 * @param {Array<object>} items Danh sách câu hỏi đã được preview
 * @param {object} user Người dùng hiện tại
 * @returns {Promise<object>} Kết quả lưu
 */
const confirmImportQuestions = async (items, user) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw createAppError("Danh sách câu hỏi cần nhập không được rỗng!", 400);
  }

  const validItems = items.filter((it) => it.isValid && it.data);
  if (validItems.length === 0) {
    throw createAppError("Không có câu hỏi hợp lệ nào để nhập vào ngân hàng!", 400);
  }

  const teacherId = user._id || user.userId;

  const docsToInsert = validItems.map((it) => ({
    subject: it.data.subject,
    chapter: it.data.chapter,
    difficulty: it.data.difficulty,
    content: it.data.content,
    options: it.data.options,
    correctIndex: it.data.correctIndex,
    explanation: it.data.explanation || "",
    teacher: teacherId,
    createdBy: teacherId,
    isActive: true,
    isDeleted: false,
  }));

  const inserted = await Question.insertMany(docsToInsert);

  return {
    successCount: inserted.length,
    questions: inserted,
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
  generateQuestionTemplate,
  previewQuestionsFromExcel,
  confirmImportQuestions,
};
