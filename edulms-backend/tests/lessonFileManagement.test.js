const mongoose = require("mongoose");
const {
  deleteLessonFile,
  replaceLessonFile,
  addLessonFile,
  deleteLessonContent,
} = require("../src/controllers/lessonContent.controller");
const cloudinaryConfig = require("../src/config/cloudinary");

jest.mock("../src/models/LessonContent");
jest.mock("../src/models/TeachingAssignment");
jest.mock("../src/config/cloudinary", () => {
  const actual = jest.requireActual("../src/config/cloudinary");
  return {
    ...actual,
    safeDeleteFromCloudinary: jest.fn().mockResolvedValue({ success: true }),
  };
});

describe("Lesson File Management & Cloudinary Sync Tests", () => {
  let req, res, next;
  const validLessonId = new mongoose.Types.ObjectId().toString();
  const file1Id = new mongoose.Types.ObjectId().toString();
  const file2Id = new mongoose.Types.ObjectId().toString();

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

  describe("deleteLessonFile", () => {
    it("xóa đúng file chỉ định trên Cloudinary và gỡ khỏi attachments trong Database", async () => {
      const mockLesson = {
        _id: validLessonId,
        title: "Bài 1",
        contentType: "pdf",
        resourceUrl: "https://res.cloudinary.com/edulms/raw/upload/file1.pdf",
        attachments: [
          {
            _id: { toString: () => file1Id },
            url: "https://res.cloudinary.com/edulms/raw/upload/file1.pdf",
            publicId: "edulms/documents/file1.pdf",
            resourceType: "raw",
          },
          {
            _id: { toString: () => file2Id },
            url: "https://res.cloudinary.com/edulms/raw/upload/file2.docx",
            publicId: "edulms/documents/file2.docx",
            resourceType: "raw",
          },
        ],
        save: jest.fn().mockResolvedValue(true),
      };

      req.params = { id: validLessonId, fileId: file1Id };
      req.targetLesson = mockLesson;

      await deleteLessonFile(req, res, next);

      // Kiểm tra gọi xóa đúng file 1 trên Cloudinary
      expect(cloudinaryConfig.safeDeleteFromCloudinary).toHaveBeenCalledWith(
        "edulms/documents/file1.pdf",
        "raw"
      );
      // Không được xóa file 2
      expect(cloudinaryConfig.safeDeleteFromCloudinary).not.toHaveBeenCalledWith(
        "edulms/documents/file2.docx",
        expect.anything()
      );

      // File 1 bị gỡ khỏi attachments
      expect(mockLesson.attachments.length).toBe(1);
      expect(mockLesson.attachments[0]._id.toString()).toBe(file2Id);

      // resourceUrl tự động chuyển sang file 2 còn lại
      expect(mockLesson.resourceUrl).toBe("https://res.cloudinary.com/edulms/raw/upload/file2.docx");
      expect(mockLesson.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringContaining("Đã xóa tệp đính kèm"),
        })
      );
    });

    it("trả về 404 nếu không tìm thấy tệp đính kèm cần xóa", async () => {
      const mockLesson = {
        _id: validLessonId,
        attachments: [],
        resourceUrl: "",
      };
      req.params = { id: validLessonId, fileId: "non_existent_id" };
      req.targetLesson = mockLesson;

      await deleteLessonFile(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining("Không tìm thấy tệp đính kèm"),
        })
      );
    });
  });

  describe("replaceLessonFile", () => {
    it("thay thế file: xóa file cũ trên Cloudinary và cập nhật file mới trong Database", async () => {
      const mockLesson = {
        _id: validLessonId,
        contentType: "pdf",
        resourceUrl: "https://res.cloudinary.com/edulms/raw/upload/old.pdf",
        attachments: [
          {
            _id: { toString: () => file1Id },
            url: "https://res.cloudinary.com/edulms/raw/upload/old.pdf",
            publicId: "edulms/documents/old.pdf",
            resourceType: "raw",
          },
        ],
        save: jest.fn().mockResolvedValue(true),
      };

      req.params = { id: validLessonId, fileId: file1Id };
      req.body = {
        name: "new_file.pdf",
        url: "https://res.cloudinary.com/edulms/raw/upload/new.pdf",
        publicId: "edulms/documents/new.pdf",
        resourceType: "raw",
        fileType: "document",
        fileSize: 2048,
        format: "pdf",
      };
      req.targetLesson = mockLesson;

      await replaceLessonFile(req, res, next);

      // Phải xóa file cũ khỏi Cloudinary
      expect(cloudinaryConfig.safeDeleteFromCloudinary).toHaveBeenCalledWith(
        "edulms/documents/old.pdf",
        "raw"
      );

      // File mới được lưu vào lesson
      expect(mockLesson.attachments[0].url).toBe(
        "https://res.cloudinary.com/edulms/raw/upload/new.pdf"
      );
      expect(mockLesson.resourceUrl).toBe(
        "https://res.cloudinary.com/edulms/raw/upload/new.pdf"
      );
      expect(mockLesson.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("addLessonFile", () => {
    it("thêm tệp mới vào attachments và tự gán resourceUrl nếu chưa có", async () => {
      const mockLesson = {
        _id: validLessonId,
        contentType: "pdf",
        resourceUrl: "",
        attachments: [],
        save: jest.fn().mockResolvedValue(true),
      };

      req.params = { id: validLessonId };
      req.body = {
        name: "tai-lieu-them.pdf",
        url: "https://res.cloudinary.com/edulms/raw/upload/tai-lieu-them.pdf",
        publicId: "edulms/documents/tai-lieu-them.pdf",
      };
      req.targetLesson = mockLesson;

      await addLessonFile(req, res, next);

      expect(mockLesson.attachments.length).toBe(1);
      expect(mockLesson.resourceUrl).toBe(
        "https://res.cloudinary.com/edulms/raw/upload/tai-lieu-them.pdf"
      );
      expect(mockLesson.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("deleteLessonContent", () => {
    it("xóa toàn bộ file đính kèm trên Cloudinary khi giáo viên xóa bài học", async () => {
      const mockLesson = {
        _id: validLessonId,
        isDeleted: false,
        resourceUrl: "https://res.cloudinary.com/edulms/raw/upload/file1.pdf",
        attachments: [
          {
            url: "https://res.cloudinary.com/edulms/raw/upload/file1.pdf",
            publicId: "edulms/documents/file1.pdf",
            resourceType: "raw",
          },
          {
            url: "https://res.cloudinary.com/edulms/raw/upload/file2.docx",
            publicId: "edulms/documents/file2.docx",
            resourceType: "raw",
          },
        ],
        save: jest.fn().mockResolvedValue(true),
      };

      req.params = { id: validLessonId };
      req.targetLesson = mockLesson;

      await deleteLessonContent(req, res, next);

      // Kiểm tra cả 2 file đều được gọi xóa trên Cloudinary
      expect(cloudinaryConfig.safeDeleteFromCloudinary).toHaveBeenCalledWith(
        "edulms/documents/file1.pdf",
        "raw"
      );
      expect(cloudinaryConfig.safeDeleteFromCloudinary).toHaveBeenCalledWith(
        "edulms/documents/file2.docx",
        "raw"
      );

      // Đánh dấu isDeleted
      expect(mockLesson.isDeleted).toBe(true);
      expect(mockLesson.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("xử lý an toàn khi xóa Cloudinary bị lỗi, không làm gián đoạn việc soft delete trong DB", async () => {
      cloudinaryConfig.safeDeleteFromCloudinary.mockRejectedValueOnce(
        new Error("Cloudinary connection timeout")
      );

      const mockLesson = {
        _id: validLessonId,
        isDeleted: false,
        resourceUrl: "https://res.cloudinary.com/edulms/raw/upload/file1.pdf",
        attachments: [
          {
            url: "https://res.cloudinary.com/edulms/raw/upload/file1.pdf",
            publicId: "edulms/documents/file1.pdf",
          },
        ],
        save: jest.fn().mockResolvedValue(true),
      };

      req.params = { id: validLessonId };
      req.targetLesson = mockLesson;

      await deleteLessonContent(req, res, next);

      expect(mockLesson.isDeleted).toBe(true);
      expect(mockLesson.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
