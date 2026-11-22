const mongoose = require("mongoose");
const Exam = require("../src/models/Exam");
const Question = require("../src/models/Question");
const TeachingAssignment = require("../src/models/TeachingAssignment");
const User = require("../src/models/User");
const lessonPermission = require("../src/middlewares/lessonPermission.middleware");
const {
  canCreateExam,
  canModifyExam,
  canViewExamDetail,
} = require("../src/middlewares/examPermission.middleware");
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
   1. KIỂM THỬ SCHEMA MODEL EXAM
============================================================================ */
describe("Exam Model Schema Validation Tests", () => {
  const dummyTAId = new mongoose.Types.ObjectId();
  const dummyTeacherId = new mongoose.Types.ObjectId();
  const dummyQuestionId = new mongoose.Types.ObjectId();

  it("khởi tạo đề thi hợp lệ với đầy đủ các trường bắt buộc", async () => {
    const doc = new Exam({
      teachingAssignment: dummyTAId,
      title: "Kiểm tra 15 phút Toán học",
      duration: 15,
      questionIds: [dummyQuestionId],
      scoreWeight: 10,
      teacher: dummyTeacherId,
    });

    await expect(doc.validate()).resolves.toBeUndefined();
    expect(doc.status).toBe("draft");
    expect(doc.isPublished).toBe(false);
    expect(doc.scoreWeight).toBe(10);
    expect(doc.questions).toEqual(doc.questionIds);
  });

  it("tự động đồng bộ status = 'published' và publishedAt khi isPublished = true", async () => {
    const doc = new Exam({
      teachingAssignment: dummyTAId,
      title: "Kiểm tra giữa kỳ",
      duration: 45,
      questionIds: [dummyQuestionId],
      teacher: dummyTeacherId,
      isPublished: true,
    });

    await doc.validate();
    expect(doc.status).toBe("published");
    expect(doc.publishedAt).toBeDefined();
  });

  it("báo lỗi khi thiếu các trường bắt buộc: teachingAssignment, title, duration, teacher", async () => {
    const doc = new Exam({});
    let err;
    try {
      await doc.validate();
    } catch (e) {
      err = e;
    }

    expect(err).toBeDefined();
    expect(err.errors.teachingAssignment).toBeDefined();
    expect(err.errors.title).toBeDefined();
    expect(err.errors.duration).toBeDefined();
    expect(err.errors.teacher).toBeDefined();
  });

  it("báo lỗi khi duration nhỏ hơn 1 hoặc vượt quá 300 phút", async () => {
    const doc = new Exam({
      teachingAssignment: dummyTAId,
      title: "Đề thi kiểm tra",
      duration: 0,
      teacher: dummyTeacherId,
    });
    let err;
    try {
      await doc.validate();
    } catch (e) {
      err = e;
    }
    expect(err.errors.duration).toBeDefined();
  });
});

/* ============================================================================
   2. KIỂM THỬ BẢO MẬT & PHÂN QUYỀN (EXAM PERMISSION MIDDLEWARES)
============================================================================ */
describe("Exam Permission Middleware Tests", () => {
  let req, res, next;
  const teacherId = new mongoose.Types.ObjectId().toString();
  const otherTeacherId = new mongoose.Types.ObjectId().toString();
  const studentId = new mongoose.Types.ObjectId().toString();
  const taId = new mongoose.Types.ObjectId().toString();
  const examId = new mongoose.Types.ObjectId().toString();
  const classId = new mongoose.Types.ObjectId().toString();

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

  describe("canCreateExam", () => {
    it("từ chối 401 nếu chưa đăng nhập", async () => {
      await canCreateExam(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it("chặn học sinh tạo đề kiểm tra với mã 403", async () => {
      req.user = { userId: studentId, role: "student" };
      await canCreateExam(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it("chặn giáo viên tạo đề nếu không được phân công dạy TeachingAssignment này (chống IDOR)", async () => {
      req.user = { userId: teacherId, role: "teacher" };
      req.body = { teachingAssignment: taId };

      jest.spyOn(TeachingAssignment, "findOne").mockResolvedValue({
        _id: taId,
        teacher: otherTeacherId,
      });

      await canCreateExam(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it("cho phép giáo viên phụ trách TeachingAssignment tạo đề", async () => {
      req.user = { userId: teacherId, role: "teacher" };
      req.body = { teachingAssignment: taId };

      const mockTA = { _id: taId, teacher: teacherId };
      jest.spyOn(TeachingAssignment, "findOne").mockResolvedValue(mockTA);

      await canCreateExam(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.targetTeachingAssignment).toBe(mockTA);
    });

    it("cho phép admin tạo đề cho bất kỳ TeachingAssignment nào", async () => {
      req.user = { userId: "admin1", role: "admin" };
      req.body = { teachingAssignment: taId };

      jest.spyOn(TeachingAssignment, "findOne").mockResolvedValue({
        _id: taId,
        teacher: otherTeacherId,
      });

      await canCreateExam(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe("canModifyExam", () => {
    it("báo lỗi 404 nếu không tìm thấy đề kiểm tra", async () => {
      req.user = { userId: teacherId, role: "teacher" };
      req.params = { id: examId };

      jest
        .spyOn(Exam, "findOne")
        .mockReturnValue(createMockQuery(null));

      await canModifyExam(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(next).not.toHaveBeenCalled();
    });

    it("từ chối 403 nếu giáo viên khác không liên quan cố sửa/xóa đề", async () => {
      req.user = { userId: otherTeacherId, role: "teacher" };
      req.params = { id: examId };

      const mockExam = {
        _id: examId,
        teacher: teacherId,
        teachingAssignment: { teacher: teacherId },
      };
      jest
        .spyOn(Exam, "findOne")
        .mockReturnValue(createMockQuery(mockExam));

      await canModifyExam(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it("cho phép giáo viên tạo đề hoặc phụ trách môn sửa/xóa đề", async () => {
      req.user = { userId: teacherId, role: "teacher" };
      req.params = { id: examId };

      const mockExam = {
        _id: examId,
        teacher: teacherId,
        teachingAssignment: { teacher: teacherId },
      };
      jest
        .spyOn(Exam, "findOne")
        .mockReturnValue(createMockQuery(mockExam));

      await canModifyExam(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe("canViewExamDetail", () => {
    it("chặn học sinh truy cập nếu đề kiểm tra chưa được publish (trạng thái draft)", async () => {
      req.user = { userId: studentId, role: "student" };
      req.params = { id: examId };

      const mockExam = {
        _id: examId,
        status: "draft",
        isPublished: false,
        teachingAssignment: { class: classId },
      };
      jest
        .spyOn(Exam, "findOne")
        .mockReturnValue(createMockQuery(mockExam));

      await canViewExamDetail(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it("chặn học sinh thuộc lớp khác truy cập đề kiểm tra của lớp này", async () => {
      req.user = { userId: studentId, role: "student" };
      req.params = { id: examId };

      const otherClassId = new mongoose.Types.ObjectId();
      const mockExam = {
        _id: examId,
        status: "published",
        isPublished: true,
        teachingAssignment: { class: classId },
      };
      jest
        .spyOn(Exam, "findOne")
        .mockReturnValue(createMockQuery(mockExam));

      jest.spyOn(lessonPermission, "getStudentEnrolledClass").mockResolvedValue({
        studentClass: { _id: otherClassId },
      });

      await canViewExamDetail(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it("cho phép học sinh cùng lớp xem đề khi đã được publish", async () => {
      req.user = { userId: studentId, role: "student" };
      req.params = { id: examId };

      const mockExam = {
        _id: examId,
        status: "published",
        isPublished: true,
        teachingAssignment: { class: classId },
      };
      jest
        .spyOn(Exam, "findOne")
        .mockReturnValue(createMockQuery(mockExam));

      jest.spyOn(lessonPermission, "getStudentEnrolledClass").mockResolvedValue({
        studentClass: { _id: classId },
      });

      await canViewExamDetail(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });
});

/* ============================================================================
   3. KIỂM THỬ SERVICE & BẢO MẬT ĐÁP ÁN (CORRECTINDEX STRIPPING)
============================================================================ */
describe("Exam Service & Answer Security Tests", () => {
  const dummySubjectId = new mongoose.Types.ObjectId().toString();
  const dummyTeacherId = new mongoose.Types.ObjectId().toString();
  const dummyTAId = new mongoose.Types.ObjectId().toString();
  const dummyExamId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe("formatExamForUser (Bảo mật đáp án)", () => {
    it("giữ nguyên correctIndex và explanation khi người dùng là teacher hoặc admin", () => {
      const exam = {
        _id: dummyExamId,
        title: "Đề kiểm tra",
        questionIds: [
          {
            _id: "q1",
            content: "1 + 1 = ?",
            options: ["1", "2", "3"],
            correctIndex: 1,
            explanation: "Vì 1 cộng 1 bằng 2",
          },
        ],
      };

      const teacherResult = examService.formatExamForUser(exam, "teacher");
      expect(teacherResult.questionIds[0].correctIndex).toBe(1);
      expect(teacherResult.questionIds[0].explanation).toBe("Vì 1 cộng 1 bằng 2");

      const adminResult = examService.formatExamForUser(exam, "admin");
      expect(adminResult.questionIds[0].correctIndex).toBe(1);
    });

    it("LOẠI BỎ HOÀN TOÀN correctIndex và explanation khi người dùng là student", () => {
      const exam = {
        _id: dummyExamId,
        title: "Đề kiểm tra",
        questionIds: [
          {
            _id: "q1",
            content: "1 + 1 = ?",
            options: ["1", "2", "3"],
            correctIndex: 1,
            explanation: "Vì 1 cộng 1 bằng 2",
          },
        ],
      };

      const studentResult = examService.formatExamForUser(exam, "student");
      expect(studentResult.questionIds[0].correctIndex).toBeUndefined();
      expect(studentResult.questionIds[0].explanation).toBeUndefined();
      expect(studentResult.questionIds[0].content).toBe("1 + 1 = ?");
      expect(studentResult.questionIds[0].options).toHaveLength(3);
    });
  });

  describe("createManualExam (Tạo đề thủ công)", () => {
    it("tạo đề thủ công thành công khi câu hỏi hợp lệ và cùng môn học", async () => {
      const q1Id = new mongoose.Types.ObjectId().toString();
      const q2Id = new mongoose.Types.ObjectId().toString();

      const payload = {
        teachingAssignment: dummyTAId,
        title: "Kiểm tra 15 phút Số học",
        duration: 15,
        questionIds: [q1Id, q2Id],
        scoreWeight: 10,
      };

      const context = {
        user: { userId: dummyTeacherId, role: "teacher" },
        targetTeachingAssignment: {
          _id: dummyTAId,
          subject: dummySubjectId,
        },
      };

      jest.spyOn(Question, "find").mockResolvedValue([
        { _id: q1Id, subject: dummySubjectId },
        { _id: q2Id, subject: dummySubjectId },
      ]);

      jest.spyOn(Exam.prototype, "save").mockResolvedValue(true);
      jest
        .spyOn(Exam, "findById")
        .mockReturnValue(createMockQuery({ _id: dummyExamId, ...payload }));

      const result = await examService.createManualExam(payload, context);
      expect(result).toBeDefined();
      expect(result.title).toBe(payload.title);
    });

    it("từ chối 400 nếu câu hỏi thuộc môn học khác với môn của phân công giảng dạy", async () => {
      const q1Id = new mongoose.Types.ObjectId().toString();
      const otherSubjectId = new mongoose.Types.ObjectId().toString();

      const payload = {
        teachingAssignment: dummyTAId,
        title: "Kiểm tra Toán",
        duration: 15,
        questionIds: [q1Id],
      };

      const context = {
        user: { userId: dummyTeacherId, role: "teacher" },
        targetTeachingAssignment: {
          _id: dummyTAId,
          subject: dummySubjectId,
        },
      };

      jest.spyOn(Question, "find").mockResolvedValue([
        { _id: q1Id, subject: otherSubjectId },
      ]);

      await expect(
        examService.createManualExam(payload, context)
      ).rejects.toThrow("Tất cả câu hỏi trong đề phải thuộc cùng môn học");
    });
  });

  describe("sampleRandomQuestions & createRandomExam (Tạo đề ngẫu nhiên)", () => {
    it("báo lỗi 400 rõ ràng khi số lượng câu hỏi trong ngân hàng không đủ theo tiêu chí", async () => {
      jest.spyOn(Question, "countDocuments").mockResolvedValue(5); // Chỉ có 5 câu

      const config = {
        totalQuestions: 10, // Yêu cầu 10 câu
        difficulty: "hard",
      };

      await expect(
        examService.sampleRandomQuestions(dummySubjectId, config)
      ).rejects.toThrow("Không đủ số lượng câu hỏi trong ngân hàng! Yêu cầu 10 câu, nhưng chỉ có 5 câu khả dụng");
    });

    it("chọn ngẫu nhiên câu hỏi thành công khi số lượng câu hỏi trong ngân hàng đáp ứng đủ", async () => {
      jest.spyOn(Question, "countDocuments").mockResolvedValue(20);
      const sampleResult = [
        { _id: new mongoose.Types.ObjectId() },
        { _id: new mongoose.Types.ObjectId() },
      ];
      jest.spyOn(Question, "aggregate").mockResolvedValue(sampleResult);

      const config = {
        totalQuestions: 2,
        difficulty: "medium",
      };

      const selectedIds = await examService.sampleRandomQuestions(
        dummySubjectId,
        config
      );
      expect(selectedIds).toHaveLength(2);
    });

    it("hỗ trợ tạo đề ngẫu nhiên theo ma trận độ khó và chương (criteria matrix)", async () => {
      jest.spyOn(Question, "countDocuments").mockResolvedValue(10);
      const sampledEasy = [{ _id: new mongoose.Types.ObjectId() }];
      const sampledHard = [{ _id: new mongoose.Types.ObjectId() }];

      jest
        .spyOn(Question, "aggregate")
        .mockResolvedValueOnce(sampledEasy)
        .mockResolvedValueOnce(sampledHard);

      const criteria = [
        { count: 1, difficulty: "easy", chapter: "Chương 1" },
        { count: 1, difficulty: "hard", chapter: "Chương 2" },
      ];

      const selectedIds = await examService.sampleRandomQuestions(
        dummySubjectId,
        { criteria }
      );
      expect(selectedIds).toHaveLength(2);
    });
  });

  describe("updateExam & publishExam", () => {
    it("cho phép cập nhật câu hỏi khi đề đang ở trạng thái draft", async () => {
      const q1 = new mongoose.Types.ObjectId().toString();
      const existingExam = {
        _id: dummyExamId,
        status: "draft",
        isPublished: false,
        teachingAssignment: { _id: dummyTAId, subject: dummySubjectId },
        questionIds: [],
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Exam, "findOne").mockReturnValue(createMockQuery(existingExam));
      jest.spyOn(TeachingAssignment, "findById").mockResolvedValue({
        _id: dummyTAId,
        subject: dummySubjectId,
      });
      jest.spyOn(Question, "find").mockResolvedValue([
        { _id: q1, subject: dummySubjectId },
      ]);
      jest
        .spyOn(Exam, "findById")
        .mockReturnValue(createMockQuery({ ...existingExam, questionIds: [q1] }));

      const res = await examService.updateExam(
        dummyExamId,
        { questionIds: [q1] },
        { preloadedExam: existingExam }
      );
      expect(existingExam.save).toHaveBeenCalled();
      expect(res.questionIds).toEqual([q1]);
    });

    it("CHẶN chỉnh sửa danh sách câu hỏi nếu đề thi đã được phát hành (published)", async () => {
      const existingExam = {
        _id: dummyExamId,
        status: "published",
        isPublished: true,
      };

      await expect(
        examService.updateExam(
          dummyExamId,
          { questionIds: ["q1"] },
          { preloadedExam: existingExam }
        )
      ).rejects.toThrow("Không thể chỉnh sửa danh sách câu hỏi sau khi đề kiểm tra đã được phát hành");
    });

    it("phát hành đề kiểm tra thành công và cập nhật status = 'published'", async () => {
      const existingExam = {
        _id: dummyExamId,
        status: "draft",
        isPublished: false,
        questionIds: [new mongoose.Types.ObjectId()],
        teachingAssignment: { class: new mongoose.Types.ObjectId() },
        save: jest.fn().mockResolvedValue(true),
      };

      jest
        .spyOn(Exam, "findById")
        .mockReturnValue(createMockQuery({ ...existingExam, status: "published" }));
      jest.spyOn(User, "find").mockReturnValue(createMockQuery([]));

      const res = await examService.publishExam(dummyExamId, {
        preloadedExam: existingExam,
      });

      expect(existingExam.status).toBe("published");
      expect(existingExam.isPublished).toBe(true);
      expect(existingExam.save).toHaveBeenCalled();
      expect(res.status).toBe("published");
    });
  });

  describe("Controller layer responses", () => {
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

    it("examController.createManualExam trả về 201", async () => {
      jest.spyOn(examService, "createManualExam").mockResolvedValue({
        _id: dummyExamId,
      });

      await examController.createManualExam(req, res, next);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Tạo đề kiểm tra thành công",
        })
      );
    });

    it("examController.createRandomExam trả về 201", async () => {
      jest.spyOn(examService, "createRandomExam").mockResolvedValue({
        _id: dummyExamId,
      });

      await examController.createRandomExam(req, res, next);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Tạo đề kiểm tra ngẫu nhiên thành công",
        })
      );
    });

    it("examController.publishExam trả về 200", async () => {
      jest.spyOn(examService, "publishExam").mockResolvedValue({
        _id: dummyExamId,
        status: "published",
      });

      await examController.publishExam(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Phát hành đề kiểm tra thành công",
        })
      );
    });
  });
});
