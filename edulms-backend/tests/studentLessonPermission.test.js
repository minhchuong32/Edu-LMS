const mongoose = require("mongoose");
const {
  canStudentAccessClassLessons,
  canViewLessonDetail,
} = require("../src/middlewares/lessonPermission.middleware");
const User = require("../src/models/User");
const Class = require("../src/models/Class");
const LessonContent = require("../src/models/LessonContent");
const TeachingAssignment = require("../src/models/TeachingAssignment");

jest.mock("../src/models/User");
jest.mock("../src/models/Class");
jest.mock("../src/models/LessonContent");
jest.mock("../src/models/TeachingAssignment");

describe("Student Lesson Access Permission & IDOR Prevention Tests", () => {
  let req, res, next;
  const studentAId = new mongoose.Types.ObjectId().toString();
  const classAId = new mongoose.Types.ObjectId().toString();
  const classBId = new mongoose.Types.ObjectId().toString();
  const subjectId = new mongoose.Types.ObjectId().toString();
  const assignmentAId = new mongoose.Types.ObjectId().toString();
  const assignmentBId = new mongoose.Types.ObjectId().toString();
  const lessonAId = new mongoose.Types.ObjectId().toString();
  const lessonBId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    jest.clearAllMocks();
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

  /* ========================================================
     1. NGƯỜI DÙNG CHƯA ĐĂNG NHẬP (401 UNAUTHORIZED)
  ======================================================== */
  describe("Trường hợp 1: Người dùng chưa đăng nhập", () => {
    it("canStudentAccessClassLessons từ chối với mã 401 nếu req.user không tồn tại", async () => {
      req.user = null;

      await canStudentAccessClassLessons(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Chưa xác thực thông tin người dùng!",
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("canViewLessonDetail từ chối với mã 401 nếu req.user không tồn tại", async () => {
      req.user = null;
      req.params = { id: lessonAId };

      await canViewLessonDetail(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  /* ========================================================
     2. HỌC SINH KHÔNG CÓ LỚP ĐƯỢC PHÂN CÔNG (403 FORBIDDEN)
  ======================================================== */
  describe("Trường hợp 2: Học sinh chưa có lớp được phân công", () => {
    it("canStudentAccessClassLessons từ chối 403 nếu học sinh chưa có classRef và className", async () => {
      req.user = { userId: studentAId, role: "student" };
      req.query = { classId: classAId, subjectId };

      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          _id: studentAId,
          role: "student",
          classRef: null,
          className: null,
        }),
      });

      await canStudentAccessClassLessons(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Học sinh chưa được phân công vào bất kỳ lớp học nào!",
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  /* ========================================================
     3. HỌC SINH THUỘC LỚP A XEM NỘI DUNG LỚP A (200 / NEXT)
  ======================================================== */
  describe("Trường hợp 3: Học sinh thuộc Lớp A xem nội dung Lớp A", () => {
    it("canStudentAccessClassLessons cho phép học sinh lớp A xem bài giảng lớp A", async () => {
      req.user = { userId: studentAId, role: "student" };
      req.query = { classId: classAId, subjectId };

      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          _id: studentAId,
          role: "student",
          classRef: classAId,
          className: "10A1",
        }),
      });

      Class.findOne.mockResolvedValue({
        _id: classAId,
        name: "10A1",
        isDeleted: false,
      });

      await canStudentAccessClassLessons(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.studentClass._id).toBe(classAId);
      expect(req.query.classId).toBe(classAId);
    });

    it("canViewLessonDetail cho phép học sinh lớp A xem chi tiết bài giảng của lớp A", async () => {
      req.user = { userId: studentAId, role: "student" };
      req.params = { id: lessonAId };

      LessonContent.findOne.mockResolvedValue({
        _id: lessonAId,
        teachingAssignment: assignmentAId,
        isActive: true,
        isDeleted: false,
      });

      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          _id: studentAId,
          role: "student",
          classRef: classAId,
        }),
      });

      Class.findOne.mockResolvedValue({
        _id: classAId,
        name: "10A1",
        isDeleted: false,
      });

      TeachingAssignment.findOne.mockResolvedValue({
        _id: assignmentAId,
        class: classAId,
        isDeleted: false,
      });

      await canViewLessonDetail(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.targetLesson._id).toBe(lessonAId);
    });
  });

  /* ========================================================
     4. HỌC SINH LỚP A TRUY CẬP NỘI DUNG LỚP B (IDOR - 403 FORBIDDEN)
  ======================================================== */
  describe("Trường hợp 4: Học sinh lớp A cố ý truy cập nội dung Lớp B", () => {
    it("canStudentAccessClassLessons chặn học sinh lớp A truyền ID lớp B (403)", async () => {
      req.user = { userId: studentAId, role: "student" };
      req.query = { classId: classBId, subjectId }; // Học sinh lớp A cố ý truyền classBId

      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          _id: studentAId,
          role: "student",
          classRef: classAId,
          className: "10A1",
        }),
      });

      Class.findOne.mockResolvedValue({
        _id: classAId,
        name: "10A1",
        isDeleted: false,
      });

      await canStudentAccessClassLessons(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message:
            "Bạn không thuộc lớp học này, không có quyền truy cập nội dung bài giảng!",
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("canViewLessonDetail chặn học sinh lớp A xem bài giảng của Lớp B (403)", async () => {
      req.user = { userId: studentAId, role: "student" };
      req.params = { id: lessonBId }; // Bài giảng thuộc lớp B

      LessonContent.findOne.mockResolvedValue({
        _id: lessonBId,
        teachingAssignment: assignmentBId,
        isActive: true,
        isDeleted: false,
      });

      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          _id: studentAId,
          role: "student",
          classRef: classAId,
        }),
      });

      Class.findOne.mockResolvedValue({
        _id: classAId,
        name: "10A1",
        isDeleted: false,
      });

      // Assignment này thuộc classBId
      TeachingAssignment.findOne.mockResolvedValue({
        _id: assignmentBId,
        class: classBId,
        isDeleted: false,
      });

      await canViewLessonDetail(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message:
            "Bạn không thuộc lớp học này, không có quyền truy cập nội dung bài giảng!",
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });
});
