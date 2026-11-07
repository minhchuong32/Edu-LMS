const mongoose = require("mongoose");
const {
  canStudentAccessClassLessons,
  canViewLessonDetail,
} = require("../src/middlewares/lessonPermission.middleware");
const lessonContentController = require("../src/controllers/lessonContent.controller");
const User = require("../src/models/User");
const Class = require("../src/models/Class");
const LessonContent = require("../src/models/LessonContent");
const TeachingAssignment = require("../src/models/TeachingAssignment");

jest.mock("../src/models/User");
jest.mock("../src/models/Class");
jest.mock("../src/models/LessonContent");
jest.mock("../src/models/TeachingAssignment");

describe("PROMPT 2 - Verification of Seed Data & Student Lesson RBAC/IDOR", () => {
  let req, res, next;

  // Mock ID các thực thể
  const student10A1Id = new mongoose.Types.ObjectId().toString();
  const student10A2Id = new mongoose.Types.ObjectId().toString();
  const class10A1Id = new mongoose.Types.ObjectId().toString();
  const class10A2Id = new mongoose.Types.ObjectId().toString();

  const subjectMathId = new mongoose.Types.ObjectId().toString();
  const subjectPhysicsId = new mongoose.Types.ObjectId().toString();
  const subjectInformaticsId = new mongoose.Types.ObjectId().toString();

  const assignment10A1MathId = new mongoose.Types.ObjectId().toString();
  const assignment10A2MathId = new mongoose.Types.ObjectId().toString();

  const lessonVideo10A1Id = new mongoose.Types.ObjectId().toString();
  const lessonPdf10A1Id = new mongoose.Types.ObjectId().toString();
  const lessonEmpty10A1Id = new mongoose.Types.ObjectId().toString();
  const lesson10A2Id = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      user: null,
      params: {},
      query: {},
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  /* ========================================================
     1. KIỂM THỬ XÁC THỰC LỚP HỌC VÀ CHỐNG TRUY CẬP CHÉO LỚP (IDOR)
  ======================================================== */
  describe("1. Kiểm tra quyền truy cập bài giảng theo Lớp học (chống IDOR)", () => {
    it("Cho phép học sinh 10A1 truy cập danh sách bài giảng của lớp 10A1", async () => {
      req.user = { userId: student10A1Id, role: "student" };
      req.query = { classId: class10A1Id, subjectId: subjectMathId };

      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          _id: student10A1Id,
          role: "student",
          classRef: class10A1Id,
          className: "10A1",
        }),
      });

      Class.findOne.mockResolvedValue({
        _id: class10A1Id,
        name: "10A1",
        isDeleted: false,
      });

      await canStudentAccessClassLessons(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.studentClass._id).toBe(class10A1Id);
      expect(req.query.classId).toBe(class10A1Id);
    });

    it("Từ chối 403 nếu học sinh lớp 10A1 cố tình truy cập bài giảng của lớp 10A2", async () => {
      req.user = { userId: student10A1Id, role: "student" };
      // Học sinh 10A1 gửi request yêu cầu xem bài giảng của 10A2
      req.query = { classId: class10A2Id, subjectId: subjectMathId };

      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          _id: student10A1Id,
          role: "student",
          classRef: class10A1Id,
          className: "10A1",
        }),
      });

      Class.findOne.mockResolvedValue({
        _id: class10A1Id,
        name: "10A1",
        isDeleted: false,
      });

      await canStudentAccessClassLessons(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining("Bạn không thuộc lớp học này"),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  /* ========================================================
     2. KIỂM THỬ XEM CHI TIẾT BÀI GIẢNG VÀ CHỐNG TRUY CẬP ID BÀI HỌC LỚP KHÁC
  ======================================================== */
  describe("2. Kiểm tra xem chi tiết bài giảng và phân quyền theo bài học", () => {
    it("Cho phép học sinh 10A1 xem chi tiết bài giảng thuộc lớp 10A1", async () => {
      req.user = { userId: student10A1Id, role: "student" };
      req.params = { id: lessonVideo10A1Id };

      // Lesson thuộc assignment của 10A1
      LessonContent.findOne.mockResolvedValue({
        _id: lessonVideo10A1Id,
        teachingAssignment: assignment10A1MathId,
        isActive: true,
        isDeleted: false,
      });

      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          _id: student10A1Id,
          role: "student",
          classRef: class10A1Id,
          className: "10A1",
        }),
      });

      Class.findOne.mockResolvedValue({
        _id: class10A1Id,
        name: "10A1",
        isDeleted: false,
      });

      TeachingAssignment.findOne.mockResolvedValue({
        _id: assignment10A1MathId,
        class: class10A1Id,
        isDeleted: false,
      });

      await canViewLessonDetail(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.targetLesson).toBeDefined();
    });

    it("Từ chối 403 nếu học sinh 10A1 cố tình gọi API xem bài giảng của lớp 10A2", async () => {
      req.user = { userId: student10A1Id, role: "student" };
      req.params = { id: lesson10A2Id };

      LessonContent.findOne.mockResolvedValue({
        _id: lesson10A2Id,
        teachingAssignment: assignment10A2MathId,
        isActive: true,
        isDeleted: false,
      });

      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          _id: student10A1Id,
          role: "student",
          classRef: class10A1Id,
          className: "10A1",
        }),
      });

      Class.findOne.mockResolvedValue({
        _id: class10A1Id,
        name: "10A1",
        isDeleted: false,
      });

      // Assignment này thuộc lớp 10A2, không khớp với 10A1
      TeachingAssignment.findOne.mockResolvedValue({
        _id: assignment10A2MathId,
        class: class10A2Id,
        isDeleted: false,
      });

      await canViewLessonDetail(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining("Bạn không thuộc lớp học này"),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  /* ========================================================
     3. KIỂM THỬ NỘI DUNG BÀI GIẢNG: THỨ TỰ, VIDEO, PDF & EMPTY STATE
  ======================================================== */
  describe("3. Kiểm tra dữ liệu bài giảng theo thứ tự, Video, PDF và Empty State", () => {
    it("Trả về danh sách bài giảng sắp xếp theo thứ tự order tăng dần và đúng định dạng media", async () => {
      req.user = { userId: student10A1Id, role: "student" };
      req.query = { classId: class10A1Id, subjectId: subjectMathId };

      TeachingAssignment.findOne.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation((callback) =>
          callback({
            _id: assignment10A1MathId,
            class: { _id: class10A1Id, name: "10A1" },
            subject: { _id: subjectMathId, name: "Toán học", code: "TOAN" },
            teacher: { _id: "gv_01", fullName: "Thầy Nguyễn Văn Toán" },
          })
        ),
      });

      LessonContent.countDocuments.mockResolvedValue(3);

      const mockLessons = [
        {
          _id: lessonVideo10A1Id,
          title: "Bài 1: Mệnh đề và Mệnh đề chứa biến",
          contentType: "video",
          resourceUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
          order: 1,
          isActive: true,
        },
        {
          _id: lessonPdf10A1Id,
          title: "Bài 2: Tập hợp và Các phép toán trên tập hợp",
          contentType: "pdf",
          resourceUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
          order: 2,
          isActive: true,
        },
        {
          _id: lessonEmpty10A1Id,
          title: "Bài 6: Ôn tập Chương 1 & Hướng dẫn tự học lý thuyết",
          contentType: "text",
          resourceUrl: "", // Empty State
          order: 6,
          isActive: true,
        },
      ];

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockLessons),
      };

      LessonContent.find.mockReturnValue(mockQueryBuilder);

      await lessonContentController.getLessonsByClassAndSubject(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            lessons: expect.any(Array),
          }),
        })
      );

      const returnedData = res.json.mock.calls[0][0].data;
      const lessons = returnedData.lessons;

      // 1. Kiểm tra số lượng bài học
      expect(lessons.length).toBe(3);

      // 2. Kiểm tra sắp xếp thứ tự tăng dần
      expect(lessons[0].order).toBe(1);
      expect(lessons[1].order).toBe(2);
      expect(lessons[2].order).toBe(6);

      // 3. Kiểm tra bài giảng Video
      expect(lessons[0].contentType).toBe("video");
      expect(lessons[0].resourceUrl).toMatch(/\.mp4$/);

      // 4. Kiểm tra bài giảng PDF
      expect(lessons[1].contentType).toBe("pdf");
      expect(lessons[1].resourceUrl).toMatch(/\.pdf$/);

      // 5. Kiểm tra bài giảng không có tệp đính kèm (Empty State)
      expect(lessons[2].contentType).toBe("text");
      expect(lessons[2].resourceUrl).toBe("");
    });
  });
});
