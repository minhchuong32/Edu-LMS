const mongoose = require("mongoose");
const ExamAttempt = require("../src/models/ExamAttempt");
const Exam = require("../src/models/Exam");
const Question = require("../src/models/Question");
const lessonPermission = require("../src/middlewares/lessonPermission.middleware");
const examService = require("../src/services/exam.service");
const examController = require("../src/controllers/exam.controller");

// Helper mock Mongoose query chain
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
   1. KIỂM THỬ SCHEMA MODEL EXAM ATTEMPT
============================================================================ */
describe("ExamAttempt Model Schema Validation Tests", () => {
  const dummyExamId = new mongoose.Types.ObjectId();
  const dummyStudentId = new mongoose.Types.ObjectId();
  const dummyQuestionId = new mongoose.Types.ObjectId();

  it("khởi tạo lượt làm bài hợp lệ với đầy đủ các trường bắt buộc", async () => {
    const attempt = new ExamAttempt({
      exam: dummyExamId,
      student: dummyStudentId,
      score: 8.5,
      scoreWeight: 10,
      totalQuestions: 10,
      correctCount: 8,
      wrongCount: 1,
      unansweredCount: 1,
      durationSpent: 600,
      answers: [
        {
          question: dummyQuestionId,
          selectedOption: 2,
          isCorrect: true,
        },
      ],
      status: "completed",
    });

    await expect(attempt.validate()).resolves.toBeUndefined();
    expect(attempt.status).toBe("completed");
    expect(attempt.score).toBe(8.5);
    expect(attempt.scoreWeight).toBe(10);
    expect(attempt.answers.length).toBe(1);
    expect(attempt.answers[0].selectedOption).toBe(2);
    expect(attempt.answers[0].isCorrect).toBe(true);
  });

  it("báo lỗi khi thiếu các trường bắt buộc (exam, student, score)", async () => {
    const invalidAttempt = new ExamAttempt({});
    let error;
    try {
      await invalidAttempt.validate();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.errors.exam).toBeDefined();
    expect(error.errors.student).toBeDefined();
    expect(error.errors.score).toBeDefined();
  });

  it("báo lỗi khi trạng thái status không nằm trong enum cho phép", async () => {
    const invalidAttempt = new ExamAttempt({
      exam: dummyExamId,
      student: dummyStudentId,
      score: 10,
      status: "invalid_status",
    });

    let error;
    try {
      await invalidAttempt.validate();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.errors.status).toBeDefined();
  });
});

/* ============================================================================
   2. KIỂM THỬ ENGINE TỰ ĐỘNG CHẤM ĐIỂM (gradeExamAnswers)
============================================================================ */
describe("Auto-Grading Engine Tests (gradeExamAnswers)", () => {
  const q1Id = new mongoose.Types.ObjectId();
  const q2Id = new mongoose.Types.ObjectId();
  const q3Id = new mongoose.Types.ObjectId();
  const q4Id = new mongoose.Types.ObjectId();

  const mockQuestions = [
    {
      _id: q1Id,
      content: "Câu hỏi 1",
      options: ["A", "B", "C", "D"],
      correctIndex: 1, // B đúng
    },
    {
      _id: q2Id,
      content: "Câu hỏi 2",
      options: ["A", "B", "C", "D"],
      correctIndex: 0, // A đúng
    },
    {
      _id: q3Id,
      content: "Câu hỏi 3",
      options: ["A", "B", "C", "D"],
      correctIndex: 3, // D đúng
    },
    {
      _id: q4Id,
      content: "Câu hỏi 4",
      options: ["A", "B", "C", "D"],
      correctIndex: 2, // C đúng
    },
  ];

  it("chấm điểm chính xác khi học sinh làm đúng 100% (4/4 câu)", () => {
    const studentAnswers = [
      { questionId: q1Id.toString(), selectedOption: 1 },
      { questionId: q2Id.toString(), selectedOption: 0 },
      { questionId: q3Id.toString(), selectedOption: 3 },
      { questionId: q4Id.toString(), selectedOption: 2 },
    ];

    const result = examService.gradeExamAnswers(mockQuestions, studentAnswers, 10);

    expect(result.totalQuestions).toBe(4);
    expect(result.correctCount).toBe(4);
    expect(result.wrongCount).toBe(0);
    expect(result.unansweredCount).toBe(0);
    expect(result.score).toBe(10);
    expect(result.processedAnswers.every((a) => a.isCorrect)).toBe(true);
  });

  it("chấm điểm chính xác với bài làm có cả câu đúng, câu sai và câu bỏ trống", () => {
    const studentAnswers = [
      { questionId: q1Id.toString(), selectedOption: 1 }, // Đúng
      { questionId: q2Id.toString(), selectedOption: 2 }, // Sai (đúng là 0)
      // q3 bỏ trống
      { questionId: q4Id.toString(), selectedOption: null }, // Bỏ trống
    ];

    const result = examService.gradeExamAnswers(mockQuestions, studentAnswers, 10);

    expect(result.totalQuestions).toBe(4);
    expect(result.correctCount).toBe(1);
    expect(result.wrongCount).toBe(1);
    expect(result.unansweredCount).toBe(2);
    // Điểm: (1/4) * 10 = 2.5
    expect(result.score).toBe(2.5);
  });

  it("hỗ trợ nhận định dạng đáp án dạng Object/Map { [questionId]: selectedOption }", () => {
    const studentAnswers = {
      [q1Id.toString()]: 1, // Đúng
      [q2Id.toString()]: 0, // Đúng
      [q3Id.toString()]: 3, // Đúng
    };

    const result = examService.gradeExamAnswers(mockQuestions, studentAnswers, 10);

    expect(result.correctCount).toBe(3);
    expect(result.wrongCount).toBe(0);
    expect(result.unansweredCount).toBe(1);
    // Điểm: (3/4) * 10 = 7.5
    expect(result.score).toBe(7.5);
  });

  it("xử lý an toàn khi học sinh gửi phương án không hợp lệ (ngoài khoảng phương án)", () => {
    const studentAnswers = [
      { questionId: q1Id.toString(), selectedOption: 99 }, // ngoài khoảng 0-3
      { questionId: q2Id.toString(), selectedOption: -1 },
      { questionId: q3Id.toString(), selectedOption: "invalid" },
    ];

    const result = examService.gradeExamAnswers(mockQuestions, studentAnswers, 10);

    expect(result.correctCount).toBe(0);
    expect(result.unansweredCount).toBe(4);
    expect(result.score).toBe(0);
  });

  it("tính điểm chính xác theo thang điểm tùy biến (scoreWeight)", () => {
    const studentAnswers = [
      { questionId: q1Id.toString(), selectedOption: 1 },
      { questionId: q2Id.toString(), selectedOption: 0 },
    ];

    // Thang điểm 100: 2/4 câu đúng => 50 điểm
    const result100 = examService.gradeExamAnswers(mockQuestions, studentAnswers, 100);
    expect(result100.score).toBe(50);
    expect(result100.scoreWeight).toBe(100);
  });
});

/* ============================================================================
   3. KIỂM THỬ NGHIỆP VỤ NỘP BÀI VÀ BẢO MẬT (submitExam & getExamAttempt)
============================================================================ */
describe("Exam Service - Submit and Security Tests", () => {
  const dummyExamId = new mongoose.Types.ObjectId();
  const dummyStudentId = new mongoose.Types.ObjectId();
  const dummyClassId = new mongoose.Types.ObjectId();
  const dummyOtherClassId = new mongoose.Types.ObjectId();
  const dummyQuestionId = new mongoose.Types.ObjectId();

  const mockExam = {
    _id: dummyExamId,
    title: "Kiểm tra 15 phút Toán 10",
    duration: 15,
    scoreWeight: 10,
    status: "published",
    isPublished: true,
    isDeleted: false,
    questionIds: [dummyQuestionId],
    teachingAssignment: {
      _id: new mongoose.Types.ObjectId(),
      class: dummyClassId,
    },
  };

  const mockQuestion = {
    _id: dummyQuestionId,
    content: "1 + 1 = ?",
    options: ["1", "2", "3", "4"],
    correctIndex: 1, // '2'
    explanation: "Vì 1 cộng 1 bằng 2",
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("submitExam", () => {
    it("từ chối 401 nếu chưa xác thực người dùng", async () => {
      await expect(
        examService.submitExam(dummyExamId.toString(), {}, {})
      ).rejects.toMatchObject({
        message: expect.stringContaining("Chưa xác thực"),
        statusCode: 401,
      });
    });

    it("từ chối 403 nếu đề thi chưa phát hành (đang ở trạng thái draft)", async () => {
      jest.spyOn(Exam, "findOne").mockReturnValue(
        createMockQuery({
          ...mockExam,
          status: "draft",
          isPublished: false,
        })
      );

      await expect(
        examService.submitExam(
          dummyExamId.toString(),
          {},
          { user: { userId: dummyStudentId, role: "student" } }
        )
      ).rejects.toMatchObject({
        message: expect.stringContaining("chưa được phát hành"),
        statusCode: 403,
      });
    });

    it("chặn học sinh lớp khác nộp bài vào đề thi của lớp này (chống IDOR)", async () => {
      jest.spyOn(Exam, "findOne").mockReturnValue(createMockQuery(mockExam));
      jest
        .spyOn(lessonPermission, "getStudentEnrolledClass")
        .mockResolvedValue({ studentClass: { _id: dummyOtherClassId } });

      await expect(
        examService.submitExam(
          dummyExamId.toString(),
          {},
          { user: { userId: dummyStudentId, role: "student" } }
        )
      ).rejects.toMatchObject({
        message: expect.stringContaining("không thuộc lớp học"),
        statusCode: 403,
      });
    });

    it("CHẶN nộp lại bài khi học sinh đã nộp trước đó (chống ghi đè kết quả)", async () => {
      jest.spyOn(Exam, "findOne").mockReturnValue(createMockQuery(mockExam));
      jest
        .spyOn(lessonPermission, "getStudentEnrolledClass")
        .mockResolvedValue({ studentClass: { _id: dummyClassId } });

      // Giả lập đã có attempt trước đó
      jest.spyOn(ExamAttempt, "findOne").mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        score: 10,
        status: "completed",
      });

      await expect(
        examService.submitExam(
          dummyExamId.toString(),
          { answers: [{ questionId: dummyQuestionId.toString(), selectedOption: 1 }] },
          { user: { userId: dummyStudentId, role: "student" } }
        )
      ).rejects.toMatchObject({
        message: expect.stringContaining("đã nộp bài kiểm tra này rồi"),
        statusCode: 400,
      });
    });

    it("nộp bài và chấm điểm thành công, lưu kết quả và trả về đáp án đúng sau khi nộp", async () => {
      jest.spyOn(Exam, "findOne").mockReturnValue(createMockQuery(mockExam));
      jest
        .spyOn(lessonPermission, "getStudentEnrolledClass")
        .mockResolvedValue({ studentClass: { _id: dummyClassId } });
      jest.spyOn(ExamAttempt, "findOne").mockResolvedValue(null);
      jest.spyOn(Question, "find").mockResolvedValue([mockQuestion]);

      // Mock ExamAttempt save & findById populate
      const mockSavedAttempt = {
        _id: new mongoose.Types.ObjectId(),
        exam: mockExam,
        student: { _id: dummyStudentId, fullName: "Học sinh A" },
        score: 10,
        scoreWeight: 10,
        totalQuestions: 1,
        correctCount: 1,
        wrongCount: 0,
        unansweredCount: 0,
        status: "completed",
        answers: [
          {
            question: mockQuestion,
            selectedOption: 1,
            isCorrect: true,
          },
        ],
      };

      jest.spyOn(ExamAttempt.prototype, "save").mockResolvedValue(true);
      jest.spyOn(ExamAttempt, "findById").mockReturnValue(createMockQuery(mockSavedAttempt));

      const result = await examService.submitExam(
        dummyExamId.toString(),
        {
          answers: [{ questionId: dummyQuestionId.toString(), selectedOption: 1 }],
          durationSpent: 300,
        },
        { user: { userId: dummyStudentId, role: "student" } }
      );

      expect(result).toBeDefined();
      expect(result.score).toBe(10);
      expect(result.correctCount).toBe(1);
      // Kiểm tra đáp án đúng và giải thích chỉ xuất hiện sau khi nộp
      expect(result.answers[0].question.correctIndex).toBe(1);
      expect(result.answers[0].question.explanation).toBe("Vì 1 cộng 1 bằng 2");
    });
  });

  describe("getExamAttempt", () => {
    it("báo lỗi 404 nếu học sinh chưa làm bài kiểm tra", async () => {
      jest.spyOn(ExamAttempt, "findOne").mockReturnValue(createMockQuery(null));

      await expect(
        examService.getExamAttempt(
          dummyExamId.toString(),
          {},
          { user: { userId: dummyStudentId, role: "student" } }
        )
      ).rejects.toMatchObject({
        message: expect.stringContaining("Chưa tìm thấy bài làm"),
        statusCode: 404,
      });
    });

    it("trả về kết quả bài làm chi tiết kèm đáp án đúng cho học sinh đã nộp", async () => {
      const mockCompletedAttempt = {
        _id: new mongoose.Types.ObjectId(),
        exam: mockExam,
        student: { _id: dummyStudentId, fullName: "Học sinh A" },
        score: 10,
        answers: [
          {
            question: mockQuestion,
            selectedOption: 1,
            isCorrect: true,
          },
        ],
      };

      jest.spyOn(ExamAttempt, "findOne").mockReturnValue(createMockQuery(mockCompletedAttempt));

      const result = await examService.getExamAttempt(
        dummyExamId.toString(),
        {},
        { user: { userId: dummyStudentId, role: "student" } }
      );

      expect(result).toBeDefined();
      expect(result.score).toBe(10);
      expect(result.answers[0].question.correctIndex).toBe(1);
    });
  });

  describe("getExamById with submission status", () => {
    it("gắn cờ hasSubmitted = true và attemptId nếu học sinh đã nộp bài", async () => {
      jest.spyOn(Exam, "findOne").mockReturnValue(createMockQuery(mockExam));
      jest.spyOn(ExamAttempt, "findOne").mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        score: 10,
        scoreWeight: 10,
        status: "completed",
      });

      const exam = await examService.getExamById(dummyExamId.toString(), {
        userId: dummyStudentId,
        role: "student",
      });

      expect(exam.hasSubmitted).toBe(true);
      expect(exam.attemptId).toBeDefined();
      expect(exam.attempt.score).toBe(10);
    });

    it("gắn cờ hasSubmitted = false nếu học sinh chưa nộp bài", async () => {
      jest.spyOn(Exam, "findOne").mockReturnValue(createMockQuery(mockExam));
      jest.spyOn(ExamAttempt, "findOne").mockResolvedValue(null);

      const exam = await examService.getExamById(dummyExamId.toString(), {
        userId: dummyStudentId,
        role: "student",
      });

      expect(exam.hasSubmitted).toBe(false);
      expect(exam.attemptId).toBeNull();
    });
  });

  describe("Exam Controllers", () => {
    it("examController.submitExam trả về status 201 cùng kết quả", async () => {
      const mockAttempt = { _id: "attempt123", score: 10 };
      jest.spyOn(examService, "submitExam").mockResolvedValue(mockAttempt);

      const req = {
        params: { id: dummyExamId.toString() },
        body: { answers: [] },
        user: { userId: dummyStudentId, role: "student" },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      await examController.submitExam(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockAttempt,
        })
      );
    });

    it("examController.getExamAttempt trả về status 200", async () => {
      const mockAttempt = { _id: "attempt123", score: 10 };
      jest.spyOn(examService, "getExamAttempt").mockResolvedValue(mockAttempt);

      const req = {
        params: { id: dummyExamId.toString() },
        query: {},
        user: { userId: dummyStudentId, role: "student" },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      await examController.getExamAttempt(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockAttempt,
        })
      );
    });

    it("examController.getServerTime trả về serverTime và iso timestamp", () => {
      const req = {};
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      examController.getServerTime(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            serverTime: expect.any(Number),
            iso: expect.any(String),
          }),
        })
      );
    });
  });
});
