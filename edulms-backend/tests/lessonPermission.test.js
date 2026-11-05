const mongoose = require("mongoose");
const {
  canCreateLesson,
  canModifyLesson,
} = require("../src/middlewares/lessonPermission.middleware");
const LessonContent = require("../src/models/LessonContent");
const TeachingAssignment = require("../src/models/TeachingAssignment");

jest.mock("../src/models/LessonContent");
jest.mock("../src/models/TeachingAssignment");

describe("LessonContent Permission & IDOR Prevention Middleware Tests", () => {
  let req, res, next;
  const teacherId = new mongoose.Types.ObjectId().toString();
  const anotherTeacherId = new mongoose.Types.ObjectId().toString();
  const assignmentId = new mongoose.Types.ObjectId().toString();
  const lessonId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      user: null,
      body: {},
      params: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  /* ========================================================
     1. KIỂM TRA NGƯỜI DÙNG CHƯA ĐĂNG NHẬP (401 UNAUTHORIZED)
  ======================================================== */
  describe("Trường hợp 1: Người dùng chưa đăng nhập (Missing req.user)", () => {
    it("canCreateLesson từ chối với 401 khi không có req.user", async () => {
      req.user = null;

      await canCreateLesson(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Chưa xác thực thông tin người dùng!",
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("canModifyLesson từ chối với 401 khi không có req.user", async () => {
      req.user = null;
      req.params = { id: lessonId };

      await canModifyLesson(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Chưa xác thực thông tin người dùng!",
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  /* ========================================================
     2. HỌC SINH / PHỤ HUYNH TRUY CẬP (403 FORBIDDEN)
  ======================================================== */
  describe("Trường hợp 2: Học sinh (Student) truy cập API tạo / sửa / xóa", () => {
    it("canCreateLesson chặn học sinh với mã 403", async () => {
      req.user = { userId: "student_123", role: "student" };
      req.body = { teachingAssignment: assignmentId };

      await canCreateLesson(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringMatching(/không có quyền tạo/i),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("canModifyLesson chặn học sinh sửa/xóa bài giảng với mã 403", async () => {
      req.user = { userId: "student_123", role: "student" };
      req.params = { id: lessonId };

      await canModifyLesson(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringMatching(/không có quyền thao tác/i),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  /* ========================================================
     3. GIÁO VIÊN KHÔNG ĐÚNG PHÂN CÔNG (IDOR PREVENTION - 403)
  ======================================================== */
  describe("Trường hợp 3: Giáo viên không đúng phân công (Ngăn chặn IDOR)", () => {
    it("canCreateLesson chặn giáo viên A tạo bài giảng cho phân công của giáo viên B (403)", async () => {
      req.user = { userId: teacherId, role: "teacher" };
      req.body = { teachingAssignment: assignmentId };

      // Phân công này thuộc về anotherTeacherId
      TeachingAssignment.findOne.mockResolvedValue({
        _id: assignmentId,
        teacher: anotherTeacherId,
        isDeleted: false,
      });

      await canCreateLesson(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringMatching(
            /không được phân công giảng dạy lớp học này/i
          ),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("canModifyLesson chặn giáo viên A sửa bài giảng thuộc phân công của giáo viên B (403)", async () => {
      req.user = { userId: teacherId, role: "teacher" };
      req.params = { id: lessonId };

      // Bài giảng liên kết tới assignmentId
      LessonContent.findOne.mockResolvedValue({
        _id: lessonId,
        teachingAssignment: assignmentId,
        isDeleted: false,
      });

      // Phân công lại thuộc về anotherTeacherId
      TeachingAssignment.findOne.mockResolvedValue({
        _id: assignmentId,
        teacher: anotherTeacherId,
        isDeleted: false,
      });

      await canModifyLesson(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringMatching(
            /không phải giáo viên phụ trách bài giảng này/i
          ),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  /* ========================================================
     4. GIÁO VIÊN ĐÚNG PHÂN CÔNG (200 / CHO PHÉP QUA NEXT)
  ======================================================== */
  describe("Trường hợp 4: Giáo viên đúng phân công giảng dạy", () => {
    it("canCreateLesson cho phép giáo viên tạo bài giảng cho đúng phân công của mình", async () => {
      req.user = { userId: teacherId, role: "teacher" };
      req.body = { teachingAssignment: assignmentId };

      const mockAssignment = {
        _id: assignmentId,
        teacher: teacherId,
        isDeleted: false,
      };

      TeachingAssignment.findOne.mockResolvedValue(mockAssignment);

      await canCreateLesson(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.targetAssignment).toBe(mockAssignment);
    });

    it("canModifyLesson cho phép giáo viên sửa/xóa bài giảng đúng phân công của mình", async () => {
      req.user = { userId: teacherId, role: "teacher" };
      req.params = { id: lessonId };

      const mockLesson = {
        _id: lessonId,
        teachingAssignment: assignmentId,
        isDeleted: false,
      };

      const mockAssignment = {
        _id: assignmentId,
        teacher: teacherId,
        isDeleted: false,
      };

      LessonContent.findOne.mockResolvedValue(mockLesson);
      TeachingAssignment.findOne.mockResolvedValue(mockAssignment);

      await canModifyLesson(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.targetLesson).toBe(mockLesson);
      expect(req.targetAssignment).toBe(mockAssignment);
    });
  });

  /* ========================================================
     5. ADMIN CÓ TOÀN QUYỀN THEO CHÍNH SÁCH
  ======================================================== */
  describe("Trường hợp 5: Admin có quyền quản trị theo chính sách", () => {
    it("canCreateLesson cho phép Admin tạo bài giảng cho bất kỳ phân công nào", async () => {
      req.user = { userId: "admin_id", role: "admin" };
      req.body = { teachingAssignment: assignmentId };

      const mockAssignment = {
        _id: assignmentId,
        teacher: anotherTeacherId,
        isDeleted: false,
      };

      TeachingAssignment.findOne.mockResolvedValue(mockAssignment);

      await canCreateLesson(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.targetAssignment).toBe(mockAssignment);
    });

    it("canModifyLesson cho phép Admin sửa/xóa bất kỳ bài giảng nào", async () => {
      req.user = { userId: "admin_id", role: "admin" };
      req.params = { id: lessonId };

      const mockLesson = {
        _id: lessonId,
        teachingAssignment: assignmentId,
        isDeleted: false,
      };

      LessonContent.findOne.mockResolvedValue(mockLesson);

      await canModifyLesson(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.targetLesson).toBe(mockLesson);
    });
  });
});
