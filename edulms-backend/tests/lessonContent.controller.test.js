const mongoose = require("mongoose");
const {
  createLessonContent,
  getLessonContents,
  getLessonContentById,
  updateLessonContent,
  deleteLessonContent,
} = require("../src/controllers/lessonContent.controller");
const LessonContent = require("../src/models/LessonContent");
const TeachingAssignment = require("../src/models/TeachingAssignment");

jest.mock("../src/models/LessonContent");
jest.mock("../src/models/TeachingAssignment");

describe("LessonContent Controller Unit Tests", () => {
  let req, res, next;
  const validAssignmentId = new mongoose.Types.ObjectId().toString();
  const validLessonId = new mongoose.Types.ObjectId().toString();

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

      LessonContent.prototype.save = jest.fn().mockResolvedValue(mockSavedLesson);

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
        lean: jest.fn().mockResolvedValue([
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

