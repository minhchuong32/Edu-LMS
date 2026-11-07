const mongoose = require("mongoose");
const {
  createLessonContent,
  updateLessonContent,
} = require("../src/controllers/lessonContent.controller");
const LessonContent = require("../src/models/LessonContent");
const TeachingAssignment = require("../src/models/TeachingAssignment");

jest.mock("../src/models/LessonContent");
jest.mock("../src/models/TeachingAssignment");

describe("YouTube Lesson Integration Tests (Controller & RBAC)", () => {
  let req, res, next;
  const mockTeacherId = "teacher_owner_123";
  const mockAssignmentId = new mongoose.Types.ObjectId().toString();
  const mockLessonId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      user: { userId: mockTeacherId, role: "teacher" },
      body: {},
      params: {},
      query: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    next = jest.fn();

    // Mock TeachingAssignment thuộc sở hữu của mockTeacherId
    TeachingAssignment.findOne.mockResolvedValue({
      _id: mockAssignmentId,
      teacher: mockTeacherId,
      isDeleted: false,
    });
    TeachingAssignment.findById.mockResolvedValue({
      _id: mockAssignmentId,
      teacher: mockTeacherId,
      isDeleted: false,
    });

    LessonContent.findOne.mockReturnValue({
      sort: jest.fn().mockResolvedValue({ order: 1 }),
    });
  });

  describe("1. Tạo bài giảng dạng Video YouTube", () => {
    it("tạo bài giảng video thành công với liên kết YouTube chuẩn", async () => {
      req.body = {
        title: "Bài giảng 1: Giới thiệu Đại số 10",
        contentType: "video",
        resourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        teachingAssignment: mockAssignmentId,
      };

      const savedDoc = {
        _id: mockLessonId,
        title: req.body.title,
        contentType: "video",
        videoProvider: "youtube",
        videoId: "dQw4w9WgXcQ",
        originalVideoUrl: req.body.resourceUrl,
        resourceUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=0&rel=0&modestbranding=1",
        order: 2,
        teachingAssignment: mockAssignmentId,
      };

      LessonContent.prototype.save = jest.fn().mockResolvedValue(savedDoc);

      await createLessonContent(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            videoProvider: "youtube",
            videoId: "dQw4w9WgXcQ",
          }),
        })
      );
    });

    it("chấp nhận link rút gọn youtu.be và tự động trích xuất Video ID", async () => {
      req.body = {
        title: "Bài giảng 2: Bất phương trình",
        contentType: "video",
        resourceUrl: "https://youtu.be/9bZkp7q19f0?t=30",
        teachingAssignment: mockAssignmentId,
      };

      LessonContent.prototype.save = jest.fn().mockResolvedValue({
        _id: mockLessonId,
        videoId: "9bZkp7q19f0",
        videoProvider: "youtube",
      });

      await createLessonContent(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("từ chối URL không thuộc YouTube (ví dụ Vimeo hoặc domain ngoài)", async () => {
      req.body = {
        title: "Bài giảng lỗi",
        contentType: "video",
        resourceUrl: "https://vimeo.com/76979871",
        teachingAssignment: mockAssignmentId,
      };

      await createLessonContent(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining("Đường dẫn video YouTube không hợp lệ"),
        })
      );
    });

    it("từ chối URL rỗng đối với loại nội dung video", async () => {
      req.body = {
        title: "Bài giảng video rỗng",
        contentType: "video",
        resourceUrl: "",
        teachingAssignment: mockAssignmentId,
      };

      await createLessonContent(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("chặn việc dán thẻ iframe HTML hoặc mã độc script injection", async () => {
      req.body = {
        title: "Bài giảng XSS",
        contentType: "video",
        resourceUrl: '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>',
        teachingAssignment: mockAssignmentId,
      };

      await createLessonContent(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("tương thích ngược: Cho phép giữ nguyên video Cloudinary cũ (.mp4)", async () => {
      req.body = {
        title: "Bài giảng video cũ Cloudinary",
        contentType: "video",
        resourceUrl: "https://res.cloudinary.com/demo/video/upload/sample.mp4",
        teachingAssignment: mockAssignmentId,
      };

      LessonContent.prototype.save = jest.fn().mockResolvedValue({
        _id: mockLessonId,
        videoProvider: "cloudinary",
        resourceUrl: req.body.resourceUrl,
      });

      await createLessonContent(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe("2. Cập nhật bài giảng Video YouTube", () => {
    it("giáo viên phụ trách cập nhật link video YouTube mới thành công", async () => {
      req.params = { id: mockLessonId };
      req.body = {
        title: "Bài 1 đã cập nhật",
        resourceUrl: "https://www.youtube.com/watch?v=kJQP7kiw5Fk",
      };

      const existingLesson = {
        _id: mockLessonId,
        title: "Bài 1",
        contentType: "video",
        teachingAssignment: mockAssignmentId,
        save: jest.fn().mockImplementation(function () {
          return Promise.resolve(this);
        }),
      };

      req.targetLesson = existingLesson;

      await updateLessonContent(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(existingLesson.videoId).toBe("kJQP7kiw5Fk");
      expect(existingLesson.videoProvider).toBe("youtube");
      expect(existingLesson.resourceUrl).toContain("https://www.youtube.com/embed/kJQP7kiw5Fk");
    });

    it("từ chối khi giáo viên cập nhật link video sai định dạng", async () => {
      req.params = { id: mockLessonId };
      req.body = {
        resourceUrl: "https://not-youtube.com/video.mp4",
      };

      const existingLesson = {
        _id: mockLessonId,
        contentType: "video",
        teachingAssignment: mockAssignmentId,
        save: jest.fn(),
      };

      req.targetLesson = existingLesson;

      await updateLessonContent(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(existingLesson.save).not.toHaveBeenCalled();
    });
  });
});

