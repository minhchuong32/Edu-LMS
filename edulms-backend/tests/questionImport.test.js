const mongoose = require("mongoose");
const Question = require("../src/models/Question");
const Subject = require("../src/models/Subject");
const TeachingAssignment = require("../src/models/TeachingAssignment");
const questionService = require("../src/services/question.service");
const questionController = require("../src/controllers/question.controller");

describe("Question Bank Excel Import Tests", () => {
  const dummySubjectId = new mongoose.Types.ObjectId().toString();
  const dummyTeacherId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Service: generateQuestionTemplate", () => {
    it("tạo file excel template có đầy đủ cấu hình dropdown và sheet phụ _DanhMuc", async () => {
      jest.spyOn(TeachingAssignment, "find").mockReturnValue({
        populate: jest.fn().mockResolvedValue([
          {
            subject: {
              _id: dummySubjectId,
              code: "TOAN",
              name: "Toán học",
              isDeleted: false,
            },
          },
        ]),
      });

      const buffer = await questionService.generateQuestionTemplate({
        userId: dummyTeacherId,
        role: "teacher",
      });

      expect(buffer).toBeDefined();
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it("tạo template cho admin với tất cả các môn học", async () => {
      jest.spyOn(Subject, "find").mockResolvedValue([
        {
          _id: dummySubjectId,
          code: "TOAN",
          name: "Toán học",
          isDeleted: false,
          isActive: true,
        },
      ]);

      const buffer = await questionService.generateQuestionTemplate({
        userId: new mongoose.Types.ObjectId().toString(),
        role: "admin",
      });

      expect(buffer).toBeDefined();
      expect(Buffer.isBuffer(buffer)).toBe(true);
    });
  });

  describe("Service: previewQuestionsFromExcel", () => {
    it("phân tích chính xác dữ liệu câu hỏi từ buffer template", async () => {
      jest.spyOn(Subject, "find").mockResolvedValue([
        {
          _id: dummySubjectId,
          code: "TOAN",
          name: "Toán học",
          isDeleted: false,
        },
      ]);
      jest.spyOn(TeachingAssignment, "find").mockImplementation(() => {
        const promise = Promise.resolve([
          {
            subject: dummySubjectId,
          },
        ]);
        promise.populate = jest.fn().mockResolvedValue([
          {
            subject: {
              _id: dummySubjectId,
              code: "TOAN",
              name: "Toán học",
              isDeleted: false,
            },
          },
        ]);
        return promise;
      });

      const buffer = await questionService.generateQuestionTemplate({
        userId: dummyTeacherId,
        role: "teacher",
      });

      const preview = await questionService.previewQuestionsFromExcel(buffer, {
        userId: dummyTeacherId,
        role: "teacher",
      });

      expect(preview.totalRows).toBeGreaterThanOrEqual(2);
      expect(preview.validCount).toBeGreaterThanOrEqual(2);
      expect(preview.errorCount).toBe(0);
      expect(preview.items[0].isValid).toBe(true);
      expect(preview.items[0].data.chapter).toBe("Chương 1: Mệnh đề và Tập hợp");
      expect(preview.items[0].data.difficulty).toBe("easy");
      expect(preview.items[0].data.correctIndex).toBe(1);
    });

    it("báo lỗi nếu giáo viên không được phân công dạy môn học trong file", async () => {
      const otherSubjectId = new mongoose.Types.ObjectId().toString();
      jest.spyOn(Subject, "find").mockResolvedValue([
        {
          _id: otherSubjectId,
          code: "LY",
          name: "Vật lí",
          isDeleted: false,
        },
      ]);
      // Giáo viên chỉ được phân công dạy môn dummySubjectId, không phải otherSubjectId
      jest.spyOn(TeachingAssignment, "find").mockResolvedValue([
        {
          subject: dummySubjectId,
        },
      ]);

      // Tạo template với môn LY
      jest.spyOn(TeachingAssignment, "find").mockReturnValueOnce({
        populate: jest.fn().mockResolvedValue([
          {
            subject: {
              _id: otherSubjectId,
              code: "LY",
              name: "Vật lí",
              isDeleted: false,
            },
          },
        ]),
      });
      const buffer = await questionService.generateQuestionTemplate({
        userId: dummyTeacherId,
        role: "teacher",
      });

      const preview = await questionService.previewQuestionsFromExcel(buffer, {
        userId: dummyTeacherId,
        role: "teacher",
      });

      expect(preview.errorCount).toBeGreaterThan(0);
      expect(preview.items[0].isValid).toBe(false);
      expect(preview.items[0].errors[0]).toContain(
        "Bạn không được phân công giảng dạy môn"
      );
    });
  });

  describe("Service: confirmImportQuestions", () => {
    it("lưu thành công các câu hỏi hợp lệ vào database", async () => {
      const mockItems = [
        {
          isValid: true,
          data: {
            subject: dummySubjectId,
            chapter: "Chương 1",
            difficulty: "easy",
            content: "Nội dung câu hỏi hợp lệ",
            options: ["A", "B", "C", "D"],
            correctIndex: 0,
            explanation: "Giải thích chi tiết",
          },
        },
      ];

      jest.spyOn(Question, "insertMany").mockResolvedValue([
        {
          _id: new mongoose.Types.ObjectId(),
          ...mockItems[0].data,
        },
      ]);

      const result = await questionService.confirmImportQuestions(mockItems, {
        userId: dummyTeacherId,
        role: "teacher",
      });

      expect(result.successCount).toBe(1);
      expect(result.questions).toHaveLength(1);
    });

    it("ném lỗi khi danh sách items rỗng hoặc không có câu hỏi hợp lệ", async () => {
      await expect(
        questionService.confirmImportQuestions([], {
          userId: dummyTeacherId,
        })
      ).rejects.toThrow("Danh sách câu hỏi cần nhập không được rỗng!");

      await expect(
        questionService.confirmImportQuestions([{ isValid: false, errors: ["Lỗi"] }], {
          userId: dummyTeacherId,
        })
      ).rejects.toThrow("Không có câu hỏi hợp lệ nào để nhập vào ngân hàng!");
    });
  });

  describe("Controller: Question Import Endpoints", () => {
    let req;
    let res;
    let next;

    beforeEach(() => {
      req = {
        user: { userId: dummyTeacherId, role: "teacher" },
        file: null,
        body: {},
      };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        setHeader: jest.fn(),
        send: jest.fn(),
      };
      next = jest.fn();
    });

    it("downloadTemplate trả về file excel template", async () => {
      const mockBuffer = Buffer.from("mock excel buffer");
      jest.spyOn(questionService, "generateQuestionTemplate").mockResolvedValue(mockBuffer);

      await questionController.downloadTemplate(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      expect(res.send).toHaveBeenCalledWith(mockBuffer);
    });

    it("previewImport trả về 200 kèm kết quả preview khi có file", async () => {
      req.file = { buffer: Buffer.from("dummy-buffer") };
      jest.spyOn(questionService, "previewQuestionsFromExcel").mockResolvedValue({
        totalRows: 2,
        validCount: 2,
        errorCount: 0,
        items: [],
      });

      await questionController.previewImport(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Phân tích file Excel thành công",
        })
      );
    });

    it("previewImport trả về 400 khi thiếu file upload", async () => {
      req.file = null;
      await questionController.previewImport(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Vui lòng chọn tập tin Excel để tải lên!",
        })
      );
    });

    it("confirmImport trả về 201 khi lưu thành công", async () => {
      req.body = { items: [{ isValid: true, data: {} }] };
      jest.spyOn(questionService, "confirmImportQuestions").mockResolvedValue({
        successCount: 1,
        questions: [{ _id: "q1" }],
      });

      await questionController.confirmImport(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Nhập thành công 1 câu hỏi vào ngân hàng",
        })
      );
    });
  });
});
