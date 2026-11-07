const mongoose = require("mongoose");
const {
  createLessonContent,
  getLessonContents,
  getLessonsByClassAndSubject,
  getLessonContentById,
  updateLessonContent,
  deleteLessonContent,
} = require("../src/controllers/lessonContent.controller");
const LessonContent = require("../src/models/LessonContent");
const TeachingAssignment = require("../src/models/TeachingAssignment");

jest.mock("../src/models/LessonContent");
jest.mock("../src/models/TeachingAssignment");

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

describe("LessonContent Controller Unit Tests", () => {
  let req, res, next;
  const validAssignmentId = new mongoose.Types.ObjectId().toString();
  const validLessonId = new mongoose.Types.ObjectId().toString();
  const validClassId = new mongoose.Types.ObjectId().toString();
  const validSubjectId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      user: { userId: "teacher_123", role: "teacher" },
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

  describe("createLessonContent", () => {
    it("tạo bài giảng thành công khi dữ liệu hợp lệ và người dùng là giáo viên phụ trách", async () => {
      req.body = {
        title: "Bài 1: Giới thiệu Express",
        description: "Học Express.js cơ bản",
        contentType: "video",
        resourceUrl: "https://youtube.com/watch?v=123",
        teachingAssignment: validAssignmentId,
      };

      TeachingAssignment.findOne.mockResolvedValue({
        _id: validAssignmentId,
        teacher: "teacher_123",
        isDeleted: false,
      });

      LessonContent.findOne.mockReturnValue({
        sort: jest.fn().mockResolvedValue({ order: 2 }),
      });

      const mockSavedLesson = {
        _id: validLessonId,
        ...req.body,
        order: 3,
        isActive: true,
        isDeleted: false,
      };

      LessonContent.prototype.save = jest
        .fn()
        .mockResolvedValue(mockSavedLesson);

      await createLessonContent(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Tạo nội dung bài giảng thành công",
        })
      );
    });

    it("báo lỗi 400 nếu thiếu tiêu đề", async () => {
      req.body = {
        contentType: "video",
        teachingAssignment: validAssignmentId,
      };

      await createLessonContent(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Tiêu đề bài giảng là bắt buộc",
        })
      );
    });

    it("báo lỗi 404 nếu TeachingAssignment không tồn tại", async () => {
      req.body = {
        title: "Bài giảng",
        contentType: "video",
        teachingAssignment: validAssignmentId,
      };

      TeachingAssignment.findOne.mockResolvedValue(null);

      await createLessonContent(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringMatching(/không tồn tại hoặc đã bị xóa/i),
        })
      );
    });

    it("báo lỗi 403 nếu giáo viên không phụ trách phân công giảng dạy này", async () => {
      req.body = {
        title: "Bài giảng",
        contentType: "video",
        teachingAssignment: validAssignmentId,
      };

      TeachingAssignment.findOne.mockResolvedValue({
        _id: validAssignmentId,
        teacher: "another_teacher_id",
        isDeleted: false,
      });

      await createLessonContent(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringMatching(/không có quyền tạo/i),
        })
      );
    });
  });

  describe("getLessonContents", () => {
    it("lấy danh sách bài giảng thành công và tự động lọc isActive cho học sinh", async () => {
      req.user = { userId: "student_1", role: "student" };
      req.query = { teachingAssignment: validAssignmentId };

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest
          .fn()
          .mockResolvedValue([
            { _id: validLessonId, title: "Bài 1", order: 1, isActive: true },
          ]),
      };

      LessonContent.find.mockReturnValue(mockQuery);

      await getLessonContents(req, res, next);

      expect(LessonContent.find).toHaveBeenCalledWith(
        expect.objectContaining({
          isDeleted: false,
          teachingAssignment: validAssignmentId,
          isActive: true,
        })
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Array),
        })
      );
    });
  });

  describe("getLessonsByClassAndSubject", () => {
    it("lấy danh sách bài giảng theo Lớp và Môn học thành công (sắp xếp order, trả về đúng trường)", async () => {
      req.query = {
        classId: validClassId,
        subjectId: validSubjectId,
        academicYear: "2025-2026",
      };

      const mockAssignment = {
        _id: validAssignmentId,
        class: { _id: validClassId, name: "10A1" },
        subject: { _id: validSubjectId, name: "Toán học" },
        teacher: { _id: "teacher_123", fullName: "Nguyễn Văn A" },
        academicYear: "2025-2026",
        semester: "CaNam",
      };

      const assignmentQuery = createMockQuery(mockAssignment);
      TeachingAssignment.findOne.mockReturnValue(assignmentQuery);

      LessonContent.countDocuments.mockResolvedValue(2);

      const mockLessons = [
        {
          _id: "lesson_1",
          title: "Bài 1: Mệnh đề",
          description: "Khái niệm mệnh đề toán học",
          contentType: "video",
          resourceUrl: "https://example.com/video1.mp4",
          order: 1,
          isActive: true,
        },
        {
          _id: "lesson_2",
          title: "Bài 2: Tập hợp",
          description: "Các phép toán trên tập hợp",
          contentType: "pdf",
          resourceUrl: "https://example.com/tap-hop.pdf",
          order: 2,
          isActive: true,
        },
      ];

      const lessonQuery = createMockQuery(mockLessons);
      LessonContent.find.mockReturnValue(lessonQuery);

      await getLessonsByClassAndSubject(req, res, next);

      expect(TeachingAssignment.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          class: validClassId,
          subject: validSubjectId,
          isDeleted: false,
          academicYear: "2025-2026",
        })
      );
      expect(LessonContent.find).toHaveBeenCalledWith(
        expect.objectContaining({
          teachingAssignment: validAssignmentId,
          isDeleted: false,
        })
      );
      expect(lessonQuery.sort).toHaveBeenCalledWith({ order: 1, createdAt: 1 });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            teachingAssignment: expect.objectContaining({
              _id: validAssignmentId,
            }),
            lessons: mockLessons,
            total: 2,
          }),
        })
      );
    });

    it("hỗ trợ phân trang khi client truyền page và limit", async () => {
      req.query = {
        classId: validClassId,
        subjectId: validSubjectId,
        page: "2",
        limit: "1",
      };

      const mockAssignment = {
        _id: validAssignmentId,
        class: { _id: validClassId },
        subject: { _id: validSubjectId },
      };

      TeachingAssignment.findOne.mockReturnValue(
        createMockQuery(mockAssignment)
      );
      LessonContent.countDocuments.mockResolvedValue(3);

      const mockLessons = [{ title: "Bài 2", order: 2 }];
      const lessonQuery = createMockQuery(mockLessons);
      LessonContent.find.mockReturnValue(lessonQuery);

      await getLessonsByClassAndSubject(req, res, next);

      expect(lessonQuery.skip).toHaveBeenCalledWith(1); // (page 2 - 1) * 1 = 1
      expect(lessonQuery.limit).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            pagination: {
              total: 3,
              page: 2,
              limit: 1,
              totalPages: 3,
            },
          }),
        })
      );
    });

    it("báo lỗi 400 nếu thiếu classId hoặc subjectId", async () => {
      req.query = { classId: validClassId };

      await getLessonsByClassAndSubject(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Thông tin môn học (subjectId) là bắt buộc",
        })
      );
    });

    it("báo lỗi 400 nếu classId không hợp lệ", async () => {
      req.query = { classId: "invalid-id", subjectId: validSubjectId };

      await getLessonsByClassAndSubject(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringMatching(/không đúng định dạng ObjectId/i),
        })
      );
    });

    it("báo lỗi 404 nếu không tìm thấy TeachingAssignment tương ứng", async () => {
      req.query = { classId: validClassId, subjectId: validSubjectId };

      TeachingAssignment.findOne.mockReturnValue(createMockQuery(null));

      await getLessonsByClassAndSubject(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringMatching(/Không tìm thấy phân công giảng dạy/i),
        })
      );
    });

    it("chỉ trả về các bài học có isActive: true cho học sinh (Student)", async () => {
      req.user = { userId: "student_1", role: "student" };
      req.params = { classId: validClassId, subjectId: validSubjectId };

      const mockAssignment = { _id: validAssignmentId };
      TeachingAssignment.findOne.mockReturnValue(
        createMockQuery(mockAssignment)
      );

      LessonContent.countDocuments.mockResolvedValue(1);
      const lessonQuery = createMockQuery([{ title: "Bài 1", isActive: true }]);
      LessonContent.find.mockReturnValue(lessonQuery);

      await getLessonsByClassAndSubject(req, res, next);

      expect(LessonContent.find).toHaveBeenCalledWith(
        expect.objectContaining({
          teachingAssignment: validAssignmentId,
          isActive: true,
          isDeleted: false,
        })
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("getLessonsByClassAndSubject", () => {
    it("lấy danh sách bài giảng theo Lớp và Môn học thành công (sắp xếp order, trả về đúng trường)", async () => {
      req.query = {
        classId: validClassId,
        subjectId: validSubjectId,
        academicYear: "2025-2026",
      };

      const mockAssignment = {
        _id: validAssignmentId,
        class: { _id: validClassId, name: "10A1" },
        subject: { _id: validSubjectId, name: "Toán học" },
        teacher: { _id: "teacher_123", fullName: "Nguyễn Văn A" },
        academicYear: "2025-2026",
        semester: "CaNam",
      };

      const assignmentQuery = createMockQuery(mockAssignment);
      TeachingAssignment.findOne.mockReturnValue(assignmentQuery);

      LessonContent.countDocuments.mockResolvedValue(2);

      const mockLessons = [
        {
          _id: "lesson_1",
          title: "Bài 1: Mệnh đề",
          description: "Khái niệm mệnh đề toán học",
          contentType: "video",
          resourceUrl: "https://example.com/video1.mp4",
          order: 1,
          isActive: true,
        },
        {
          _id: "lesson_2",
          title: "Bài 2: Tập hợp",
          description: "Các phép toán trên tập hợp",
          contentType: "pdf",
          resourceUrl: "https://example.com/tap-hop.pdf",
          order: 2,
          isActive: true,
        },
      ];

      const lessonQuery = createMockQuery(mockLessons);
      LessonContent.find.mockReturnValue(lessonQuery);

      await getLessonsByClassAndSubject(req, res, next);

      expect(TeachingAssignment.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          class: validClassId,
          subject: validSubjectId,
          isDeleted: false,
          academicYear: "2025-2026",
        })
      );
      expect(LessonContent.find).toHaveBeenCalledWith(
        expect.objectContaining({
          teachingAssignment: validAssignmentId,
          isDeleted: false,
        })
      );
      expect(lessonQuery.sort).toHaveBeenCalledWith({ order: 1, createdAt: 1 });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            teachingAssignment: expect.objectContaining({ _id: validAssignmentId }),
            lessons: mockLessons,
            total: 2,
          }),
        })
      );
    });

    it("hỗ trợ phân trang khi client truyền page và limit", async () => {
      req.query = {
        classId: validClassId,
        subjectId: validSubjectId,
        page: "2",
        limit: "1",
      };

      const mockAssignment = {
        _id: validAssignmentId,
        class: { _id: validClassId },
        subject: { _id: validSubjectId },
      };

      TeachingAssignment.findOne.mockReturnValue(createMockQuery(mockAssignment));
      LessonContent.countDocuments.mockResolvedValue(3);

      const mockLessons = [{ title: "Bài 2", order: 2 }];
      const lessonQuery = createMockQuery(mockLessons);
      LessonContent.find.mockReturnValue(lessonQuery);

      await getLessonsByClassAndSubject(req, res, next);

      expect(lessonQuery.skip).toHaveBeenCalledWith(1); // (page 2 - 1) * 1 = 1
      expect(lessonQuery.limit).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            pagination: {
              total: 3,
              page: 2,
              limit: 1,
              totalPages: 3,
            },
          }),
        })
      );
    });

    it("báo lỗi 400 nếu thiếu classId hoặc subjectId", async () => {
      req.query = { classId: validClassId };

      await getLessonsByClassAndSubject(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Thông tin môn học (subjectId) là bắt buộc",
        })
      );
    });

    it("báo lỗi 400 nếu classId không hợp lệ", async () => {
      req.query = { classId: "invalid-id", subjectId: validSubjectId };

      await getLessonsByClassAndSubject(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringMatching(/không đúng định dạng ObjectId/i),
        })
      );
    });

    it("báo lỗi 404 nếu không tìm thấy TeachingAssignment tương ứng", async () => {
      req.query = { classId: validClassId, subjectId: validSubjectId };

      TeachingAssignment.findOne.mockReturnValue(createMockQuery(null));

      await getLessonsByClassAndSubject(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringMatching(/Không tìm thấy phân công giảng dạy/i),
        })
      );
    });

    it("chỉ trả về các bài học có isActive: true cho học sinh (Student)", async () => {
      req.user = { userId: "student_1", role: "student" };
      req.params = { classId: validClassId, subjectId: validSubjectId };

      const mockAssignment = { _id: validAssignmentId };
      TeachingAssignment.findOne.mockReturnValue(createMockQuery(mockAssignment));

      LessonContent.countDocuments.mockResolvedValue(1);
      const lessonQuery = createMockQuery([{ title: "Bài 1", isActive: true }]);
      LessonContent.find.mockReturnValue(lessonQuery);

      await getLessonsByClassAndSubject(req, res, next);

      expect(LessonContent.find).toHaveBeenCalledWith(
        expect.objectContaining({
          teachingAssignment: validAssignmentId,
          isActive: true,
          isDeleted: false,
        })
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("getLessonContentById", () => {
    it("lấy chi tiết bài giảng thành công", async () => {
      req.params = { id: validLessonId };

      LessonContent.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue({
          _id: validLessonId,
          title: "Bài 1",
          isActive: true,
        }),
      });

      await getLessonContentById(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ _id: validLessonId }),
        })
      );
    });

    it("trả về 404 nếu bài giảng không tồn tại", async () => {
      req.params = { id: validLessonId };

      LessonContent.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });

      await getLessonContentById(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringMatching(/không tồn tại hoặc đã bị xóa/i),
        })
      );
    });
  });

  describe("updateLessonContent", () => {
    it("cập nhật bài giảng thành công", async () => {
      req.params = { id: validLessonId };
      req.body = { title: "Tiêu đề mới cập nhật" };

      const mockLesson = {
        _id: validLessonId,
        title: "Tiêu đề cũ",
        teachingAssignment: validAssignmentId,
        save: jest.fn().mockResolvedValue({
          _id: validLessonId,
          title: "Tiêu đề mới cập nhật",
        }),
      };

      LessonContent.findOne.mockResolvedValue(mockLesson);
      TeachingAssignment.findById.mockResolvedValue({
        _id: validAssignmentId,
        teacher: "teacher_123",
      });

      await updateLessonContent(req, res, next);

      expect(mockLesson.title).toBe("Tiêu đề mới cập nhật");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Cập nhật nội dung bài giảng thành công",
        })
      );
    });
  });

  describe("deleteLessonContent", () => {
    it("xóa mềm bài giảng thành công (isDeleted: true)", async () => {
      req.params = { id: validLessonId };

      const mockLesson = {
        _id: validLessonId,
        teachingAssignment: validAssignmentId,
        isDeleted: false,
        save: jest.fn().mockResolvedValue(true),
      };

      LessonContent.findOne.mockResolvedValue(mockLesson);
      TeachingAssignment.findById.mockResolvedValue({
        _id: validAssignmentId,
        teacher: "teacher_123",
      });

      await deleteLessonContent(req, res, next);

      expect(mockLesson.isDeleted).toBe(true);
      expect(mockLesson.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Xóa nội dung bài giảng thành công",
        })
      );
    });
  });
});
