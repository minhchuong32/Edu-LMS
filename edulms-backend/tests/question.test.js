const mongoose = require("mongoose");
const Question = require("../src/models/Question");
const Subject = require("../src/models/Subject");
const TeachingAssignment = require("../src/models/TeachingAssignment");
const {
  canAccessQuestionBank,
  canCreateQuestion,
  canModifyQuestion,
} = require("../src/middlewares/questionPermission.middleware");
const questionService = require("../src/services/question.service");
const questionController = require("../src/controllers/question.controller");

// Helper tạo mock Mongoose query chain có thể await
const createMockQuery = (resolvedValue) => {
  const query = {
    sort: jest.fn(),
    populate: jest.fn(),
    select: jest.fn(),
    skip: jest.fn(),
    limit: jest.fn(),
    lean: jest.fn(),
  };
  query.sort.mockReturnValue(query);
  query.populate.mockReturnValue(query);
  query.select.mockReturnValue(query);
  query.skip.mockReturnValue(query);
  query.limit.mockReturnValue(query);
  query.lean.mockResolvedValue(resolvedValue);
  query.then = (resolve, reject) =>
    Promise.resolve(resolvedValue).then(resolve, reject);
  return query;
};

/* ============================================================================
   1. KIỂM THỬ SCHEMA MODEL QUESTION
============================================================================ */
describe("Question Model Schema Validation Tests", () => {
  const dummySubjectId = new mongoose.Types.ObjectId();
  const dummyTeacherId = new mongoose.Types.ObjectId();

  it("khởi tạo câu hỏi hợp lệ với đầy đủ các trường bắt buộc", async () => {
    const doc = new Question({
      subject: dummySubjectId,
      chapter: "Chương 1: Mệnh đề và tập hợp",
      difficulty: "easy",
      content: "Cho tập hợp A = {1, 2, 3}. Số phần tử của A là bao nhiêu?",
      options: ["1", "2", "3", "4"],
      correctIndex: 2,
      teacher: dummyTeacherId,
      explanation: "Tập hợp A có 3 phần tử là 1, 2 và 3.",
    });

    await expect(doc.validate()).resolves.toBeUndefined();
    expect(doc.difficulty).toBe("easy");
    expect(doc.options.length).toBe(4);
    expect(doc.correctIndex).toBe(2);
    expect(doc.isActive).toBe(true);
    expect(doc.isDeleted).toBe(false);
  });

  it("tự động gán createdBy = teacher khi pre-validate nếu createdBy bị thiếu", async () => {
    const doc = new Question({
      subject: dummySubjectId,
      chapter: "Chương 1",
      difficulty: "medium",
      content: "Nội dung câu hỏi kiểm tra pre-validate?",
      options: ["A", "B"],
      correctIndex: 0,
      teacher: dummyTeacherId,
    });

    await doc.validate();
    expect(doc.createdBy.toString()).toBe(dummyTeacherId.toString());
  });

  it("báo lỗi khi thiếu môn học (subject)", async () => {
    const doc = new Question({
      chapter: "Chương 1",
      difficulty: "medium",
      content: "Nội dung câu hỏi hợp lệ?",
      options: ["A", "B"],
      correctIndex: 0,
      teacher: dummyTeacherId,
    });

    let err;
    try {
      await doc.validate();
    } catch (error) {
      err = error;
    }

    expect(err).toBeDefined();
    expect(err.errors.subject).toBeDefined();
    expect(err.errors.subject.message).toContain("Môn học là bắt buộc");
  });

  it("báo lỗi khi thiếu chương (chapter)", async () => {
    const doc = new Question({
      subject: dummySubjectId,
      chapter: "",
      difficulty: "medium",
      content: "Nội dung câu hỏi?",
      options: ["A", "B"],
      correctIndex: 0,
      teacher: dummyTeacherId,
    });

    let err;
    try {
      await doc.validate();
    } catch (error) {
      err = error;
    }

    expect(err).toBeDefined();
    expect(err.errors.chapter).toBeDefined();
  });

  it("báo lỗi khi độ khó (difficulty) không nằm trong enum", async () => {
    const doc = new Question({
      subject: dummySubjectId,
      chapter: "Chương 1",
      difficulty: "super-extreme",
      content: "Nội dung câu hỏi?",
      options: ["A", "B"],
      correctIndex: 0,
      teacher: dummyTeacherId,
    });

    let err;
    try {
      await doc.validate();
    } catch (error) {
      err = error;
    }

    expect(err).toBeDefined();
    expect(err.errors.difficulty).toBeDefined();
    expect(err.errors.difficulty.message).toContain("không hợp lệ");
  });

  it("chấp nhận các giá trị độ khó tiếng Việt và tiếng Anh hợp lệ", async () => {
    const validLevels = [
      "easy",
      "medium",
      "hard",
      "nhan_biet",
      "thong_hieu",
      "van_dung",
      "van_dung_cao",
    ];

    for (const level of validLevels) {
      const doc = new Question({
        subject: dummySubjectId,
        chapter: "Chương 1",
        difficulty: level,
        content: "Nội dung câu hỏi hợp lệ?",
        options: ["Đáp án 1", "Đáp án 2"],
        correctIndex: 1,
        teacher: dummyTeacherId,
      });
      await expect(doc.validate()).resolves.toBeUndefined();
    }
  });

  it("báo lỗi khi nội dung (content) ngắn hơn 3 ký tự hoặc để trống", async () => {
    const doc = new Question({
      subject: dummySubjectId,
      chapter: "Chương 1",
      difficulty: "medium",
      content: "ab",
      options: ["A", "B"],
      correctIndex: 0,
      teacher: dummyTeacherId,
    });

    let err;
    try {
      await doc.validate();
    } catch (error) {
      err = error;
    }

    expect(err).toBeDefined();
    expect(err.errors.content).toBeDefined();
    expect(err.errors.content.message).toContain("ít nhất 3 ký tự");
  });

  it("báo lỗi khi danh sách options có ít hơn 2 phương án", async () => {
    const doc = new Question({
      subject: dummySubjectId,
      chapter: "Chương 1",
      difficulty: "medium",
      content: "Nội dung câu hỏi hợp lệ?",
      options: ["Duy nhất một đáp án"],
      correctIndex: 0,
      teacher: dummyTeacherId,
    });

    let err;
    try {
      await doc.validate();
    } catch (error) {
      err = error;
    }

    expect(err).toBeDefined();
    expect(err.errors.options).toBeDefined();
    expect(err.errors.options.message).toContain("ít nhất 2 phương án");
  });

  it("báo lỗi khi một trong các phương án trong options là chuỗi rỗng", async () => {
    const doc = new Question({
      subject: dummySubjectId,
      chapter: "Chương 1",
      difficulty: "medium",
      content: "Nội dung câu hỏi hợp lệ?",
      options: ["Phương án A", "   "],
      correctIndex: 0,
      teacher: dummyTeacherId,
    });

    let err;
    try {
      await doc.validate();
    } catch (error) {
      err = error;
    }

    expect(err).toBeDefined();
    expect(err.errors.options).toBeDefined();
    expect(err.errors.options.message).toContain("không được để trống");
  });

  it("báo lỗi khi correctIndex âm hoặc vượt quá số lượng options", async () => {
    const docInvalidNegative = new Question({
      subject: dummySubjectId,
      chapter: "Chương 1",
      difficulty: "medium",
      content: "Nội dung câu hỏi?",
      options: ["A", "B", "C"],
      correctIndex: -1,
      teacher: dummyTeacherId,
    });
    let errNeg;
    try {
      await docInvalidNegative.validate();
    } catch (e) {
      errNeg = e;
    }
    expect(errNeg.errors.correctIndex).toBeDefined();

    const docInvalidOverflow = new Question({
      subject: dummySubjectId,
      chapter: "Chương 1",
      difficulty: "medium",
      content: "Nội dung câu hỏi?",
      options: ["A", "B", "C"],
      correctIndex: 3, // options có length = 3 -> index tối đa là 2
      teacher: dummyTeacherId,
    });
    let errOver;
    try {
      await docInvalidOverflow.validate();
    } catch (e) {
      errOver = e;
    }
    expect(errOver.errors.correctIndex).toBeDefined();
  });

  it("chứa các chỉ mục quan trọng phục vụ tìm kiếm và lọc", () => {
    const indexes = Question.schema.indexes();
    const hasFilterIndex = indexes.some(
      ([idx]) =>
        idx.subject === 1 &&
        idx.chapter === 1 &&
        idx.difficulty === 1 &&
        idx.isDeleted === 1
    );
    const hasSubjectIndex = indexes.some(
      ([idx]) => idx.subject === 1 && idx.isDeleted === 1
    );

    expect(hasFilterIndex).toBe(true);
    expect(hasSubjectIndex).toBe(true);
  });
});

/* ============================================================================
   2. KIỂM THỬ MIDDLEWARE PHÂN QUYỀN (questionPermission.middleware)
============================================================================ */
describe("Question Permission Middleware Tests", () => {
  let req, res, next;
  const teacherId = new mongoose.Types.ObjectId().toString();
  const otherTeacherId = new mongoose.Types.ObjectId().toString();
  const studentId = new mongoose.Types.ObjectId().toString();
  const subjectId = new mongoose.Types.ObjectId().toString();
  const questionId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    jest.restoreAllMocks();
    req = {
      user: null,
      body: {},
      params: {},
      query: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe("canAccessQuestionBank", () => {
    it("từ chối 401 khi chưa đăng nhập (thiếu req.user)", async () => {
      await canAccessQuestionBank(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it("chặn học sinh ('student') truy cập với mã 403", async () => {
      req.user = { userId: studentId, role: "student" };
      await canAccessQuestionBank(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it("cho phép giáo viên ('teacher') và admin ('admin') truy cập", async () => {
      req.user = { userId: teacherId, role: "teacher" };
      await canAccessQuestionBank(req, res, next);
      expect(next).toHaveBeenCalled();

      next.mockClear();
      req.user = { userId: "admin1", role: "admin" };
      await canAccessQuestionBank(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe("canCreateQuestion", () => {
    it("báo lỗi 400 nếu thiếu subject trong body", async () => {
      req.user = { userId: teacherId, role: "teacher" };
      req.body = {};

      await canCreateQuestion(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    it("báo lỗi 404 nếu subject không tồn tại trong database", async () => {
      req.user = { userId: teacherId, role: "teacher" };
      req.body = { subject: subjectId };

      jest.spyOn(Subject, "findOne").mockResolvedValue(null);

      await canCreateQuestion(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(next).not.toHaveBeenCalled();
    });

    it("từ chối 403 nếu giáo viên không được phân công dạy môn học này", async () => {
      req.user = { userId: teacherId, role: "teacher" };
      req.body = { subject: subjectId };

      jest
        .spyOn(Subject, "findOne")
        .mockResolvedValue({ _id: subjectId, name: "Toán học" });
      jest.spyOn(TeachingAssignment, "exists").mockResolvedValue(null);

      await canCreateQuestion(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it("cho phép giáo viên tạo câu hỏi nếu được phân công dạy môn học này", async () => {
      req.user = { userId: teacherId, role: "teacher" };
      req.body = { subject: subjectId };

      jest
        .spyOn(Subject, "findOne")
        .mockResolvedValue({ _id: subjectId, name: "Toán học" });
      jest.spyOn(TeachingAssignment, "exists").mockResolvedValue({ _id: "ta1" });

      await canCreateQuestion(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.targetSubject).toBeDefined();
    });

    it("cho phép admin tạo câu hỏi mà không cần kiểm tra phân công", async () => {
      req.user = { userId: "admin1", role: "admin" };
      req.body = { subject: subjectId };

      jest
        .spyOn(Subject, "findOne")
        .mockResolvedValue({ _id: subjectId, name: "Toán học" });

      await canCreateQuestion(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe("canModifyQuestion", () => {
    it("báo lỗi 400 nếu id câu hỏi không hợp lệ", async () => {
      req.user = { userId: teacherId, role: "teacher" };
      req.params = { id: "invalid-id" };

      await canModifyQuestion(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    it("báo lỗi 404 nếu câu hỏi không tồn tại", async () => {
      req.user = { userId: teacherId, role: "teacher" };
      req.params = { id: questionId };

      jest.spyOn(Question, "findOne").mockResolvedValue(null);

      await canModifyQuestion(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(next).not.toHaveBeenCalled();
    });

    it("cho phép giáo viên là tác giả tạo câu hỏi sửa/xóa", async () => {
      req.user = { userId: teacherId, role: "teacher" };
      req.params = { id: questionId };

      const mockQuestion = {
        _id: questionId,
        subject: subjectId,
        teacher: teacherId,
        createdBy: teacherId,
      };
      jest.spyOn(Question, "findOne").mockResolvedValue(mockQuestion);

      await canModifyQuestion(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.question).toBe(mockQuestion);
    });

    it("từ chối 403 nếu giáo viên khác môn và không phải tác giả cố tình sửa/xóa", async () => {
      req.user = { userId: otherTeacherId, role: "teacher" };
      req.params = { id: questionId };

      const mockQuestion = {
        _id: questionId,
        subject: subjectId,
        teacher: teacherId,
        createdBy: teacherId,
      };
      jest.spyOn(Question, "findOne").mockResolvedValue(mockQuestion);
      jest.spyOn(TeachingAssignment, "exists").mockResolvedValue(null);

      await canModifyQuestion(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it("cho phép admin sửa/xóa câu hỏi bất kỳ", async () => {
      req.user = { userId: "admin1", role: "admin" };
      req.params = { id: questionId };

      const mockQuestion = {
        _id: questionId,
        subject: subjectId,
        teacher: teacherId,
      };
      jest.spyOn(Question, "findOne").mockResolvedValue(mockQuestion);

      await canModifyQuestion(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });
});

/* ============================================================================
   3. KIỂM THỬ QUESTION SERVICE & CONTROLLER (CRUD & FILTER)
============================================================================ */
describe("Question Service & Controller Unit Tests", () => {
  const dummySubjectId = new mongoose.Types.ObjectId().toString();
  const dummyTeacherId = new mongoose.Types.ObjectId().toString();
  const dummyQuestionId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe("createQuestion", () => {
    it("tạo câu hỏi mới thành công và trả về document đầy đủ", async () => {
      const payload = {
        subject: dummySubjectId,
        chapter: "Chương 2: Hàm số",
        difficulty: "hard",
        content: "Tìm tập xác định của hàm số y = 1/(x-2)?",
        options: ["R \\ {2}", "R", "(2; + vô cùng)", "(- vô cùng; 2)"],
        correctIndex: 0,
        explanation: "Mẫu số x - 2 khác 0 => x khác 2",
      };

      const context = {
        user: { userId: dummyTeacherId, role: "teacher" },
        targetSubject: { _id: dummySubjectId, name: "Toán học" },
      };

      jest.spyOn(Question.prototype, "save").mockResolvedValue(true);
      const mockPopulated = {
        _id: dummyQuestionId,
        ...payload,
        teacher: { _id: dummyTeacherId, fullName: "Thầy Hào" },
      };
      jest
        .spyOn(Question, "findById")
        .mockReturnValue(createMockQuery(mockPopulated));

      const result = await questionService.createQuestion(payload, context);
      expect(result).toBeDefined();
      expect(result.content).toBe(payload.content);
      expect(result.correctIndex).toBe(0);
    });

    it("ném lỗi 400 nếu correctIndex vượt quá số lượng options", async () => {
      const payload = {
        subject: dummySubjectId,
        chapter: "Chương 1",
        difficulty: "easy",
        content: "Câu hỏi hợp lệ?",
        options: ["A", "B"],
        correctIndex: 5,
      };

      const context = {
        user: { userId: dummyTeacherId, role: "teacher" },
        targetSubject: { _id: dummySubjectId },
      };

      await expect(
        questionService.createQuestion(payload, context)
      ).rejects.toThrow("Chỉ số đáp án đúng (5) không hợp lệ");
    });
  });

  describe("getQuestions (Filter & Search)", () => {
    it("lọc câu hỏi theo môn học, chương, độ khó và từ khóa thành công", async () => {
      const mockList = [
        {
          _id: dummyQuestionId,
          content: "Phương trình bậc hai ax^2 + bx + c = 0",
          chapter: "Chương 1",
          difficulty: "medium",
          subject: { name: "Toán học" },
        },
      ];

      jest.spyOn(Question, "find").mockReturnValue(createMockQuery(mockList));
      jest.spyOn(Question, "countDocuments").mockResolvedValue(1);

      const queryParams = {
        subject: dummySubjectId,
        chapter: "Chương 1",
        difficulty: "medium",
        search: "bậc hai",
        page: 1,
        limit: 10,
      };

      const result = await questionService.getQuestions(queryParams, {
        userId: dummyTeacherId,
        role: "teacher",
      });

      expect(result.questions).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.totalPages).toBe(1);
    });
  });

  describe("getQuestionById", () => {
    it("lấy chi tiết câu hỏi theo ID thành công", async () => {
      const mockQuestion = {
        _id: dummyQuestionId,
        content: "Chi tiết câu hỏi",
        options: ["A", "B"],
        correctIndex: 0,
      };
      jest
        .spyOn(Question, "findOne")
        .mockReturnValue(createMockQuery(mockQuestion));

      const res = await questionService.getQuestionById(dummyQuestionId);
      expect(res._id).toBe(dummyQuestionId);
    });

    it("ném lỗi 404 khi không tìm thấy câu hỏi", async () => {
      jest.spyOn(Question, "findOne").mockReturnValue(createMockQuery(null));

      await expect(
        questionService.getQuestionById(dummyQuestionId)
      ).rejects.toThrow("Câu hỏi không tồn tại hoặc đã bị xóa");
    });
  });

  describe("updateQuestion", () => {
    it("cập nhật nội dung và đáp án đúng hợp lệ", async () => {
      const existingDoc = {
        _id: dummyQuestionId,
        content: "Nội dung cũ",
        options: ["A", "B", "C"],
        correctIndex: 0,
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Question, "findOne").mockResolvedValue(existingDoc);

      const updatedPopulated = {
        ...existingDoc,
        content: "Nội dung mới",
        correctIndex: 1,
      };
      jest
        .spyOn(Question, "findById")
        .mockReturnValue(createMockQuery(updatedPopulated));

      const result = await questionService.updateQuestion(
        dummyQuestionId,
        {
          content: "Nội dung mới",
          correctIndex: 1,
        },
        {}
      );

      expect(existingDoc.save).toHaveBeenCalled();
      expect(result.content).toBe("Nội dung mới");
    });
  });

  describe("deleteQuestion (Soft delete)", () => {
    it("đánh dấu isDeleted = true khi xóa câu hỏi", async () => {
      const existingDoc = {
        _id: dummyQuestionId,
        isDeleted: false,
        save: jest.fn().mockResolvedValue(true),
      };

      const result = await questionService.deleteQuestion(dummyQuestionId, {
        preloadedQuestion: existingDoc,
      });

      expect(existingDoc.isDeleted).toBe(true);
      expect(existingDoc.save).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe("getChaptersBySubject", () => {
    it("trả về danh sách tên chương được sắp xếp", async () => {
      jest
        .spyOn(Question, "distinct")
        .mockResolvedValue(["Chương 2", "Chương 1"]);

      const chapters = await questionService.getChaptersBySubject(
        dummySubjectId
      );
      expect(chapters).toEqual(["Chương 1", "Chương 2"]);
    });
  });

  describe("Controller layer standard response", () => {
    let req, res, next;

    beforeEach(() => {
      req = {
        user: { userId: dummyTeacherId, role: "teacher" },
        body: {},
        params: {},
        query: {},
      };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      next = jest.fn();
    });

    it("questionController.createQuestion trả về 201 khi thành công", async () => {
      jest.spyOn(questionService, "createQuestion").mockResolvedValue({
        _id: dummyQuestionId,
      });

      await questionController.createQuestion(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Tạo câu hỏi thành công",
        })
      );
    });

    it("questionController.getQuestions trả về 200 kèm danh sách", async () => {
      jest.spyOn(questionService, "getQuestions").mockResolvedValue({
        questions: [],
        pagination: { total: 0 },
      });

      await questionController.getQuestions(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Lấy danh sách câu hỏi thành công",
        })
      );
    });
  });
});
