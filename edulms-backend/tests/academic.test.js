const request = require("supertest");
const app = require("../src/app");
const Grade = require("../src/models/Grade");
const Subject = require("../src/models/Subject");
const Class = require("../src/models/Class");
const User = require("../src/models/User");
const { generateAccessToken } = require("../src/utils/jwt");

jest.mock("../src/models/Grade");
jest.mock("../src/models/Subject");
jest.mock("../src/models/Class");
jest.mock("../src/models/User");

describe("Academic Structure & Teaching Assignment API Unit & Integration Tests", () => {
  const adminToken = generateAccessToken({
    userId: "admin_123",
    role: "admin",
    email: "admin@edulms.edu.vn",
  });

  const teacherToken = generateAccessToken({
    userId: "teacher_123",
    role: "teacher",
    email: "teacher@edulms.edu.vn",
  });

  const studentToken = generateAccessToken({
    userId: "student_123",
    role: "student",
    email: "student@edulms.edu.vn",
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /* ===================================================
     1. TESTS: KHỐI HỌC (GRADES 10, 11, 12)
  =================================================== */
  describe("Quản lý Khối học (Grades)", () => {
    it("cho phép người dùng xem danh sách khối học", async () => {
      Grade.findOne.mockResolvedValue({ level: 10 });
      Grade.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            { _id: "g10", level: 10, name: "Khối 10", isActive: true },
            { _id: "g11", level: 11, name: "Khối 11", isActive: true },
            { _id: "g12", level: 12, name: "Khối 12", isActive: true },
          ]),
        }),
      });
      Class.countDocuments.mockResolvedValue(4);

      const res = await request(app)
        .get("/api/v1/academic/grades")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(3);
      expect(res.body.data[0].classCount).toBe(4);
    });

    it("cho phép Admin tạo khối học hợp lệ", async () => {
      Grade.findOne.mockResolvedValue(null);
      Grade.create.mockResolvedValue({
        _id: "g10_new",
        level: 10,
        name: "Khối 10",
        isActive: true,
        isDeleted: false,
      });

      const res = await request(app)
        .post("/api/v1/academic/grades")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ level: 10, name: "Khối 10", description: "Khối 10 THPT" });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.level).toBe(10);
    });

    it("từ chối tạo khối học ngoài phạm vi 10, 11, 12", async () => {
      const res = await request(app)
        .post("/api/v1/academic/grades")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ level: 9, name: "Khối 9" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/10, 11 hoặc 12/);
    });

    it("chặn xóa khối học khi đang có lớp trực thuộc", async () => {
      Grade.findOne.mockResolvedValue({
        _id: "g10",
        level: 10,
        name: "Khối 10",
        isDeleted: false,
      });
      Class.countDocuments.mockResolvedValue(3); // Đang có 3 lớp

      const res = await request(app)
        .delete("/api/v1/academic/grades/g10")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Không thể xóa Khối 10 vì đang có 3 lớp học trực thuộc/);
    });
  });

  /* ===================================================
     2. TESTS: MÔN HỌC (SUBJECTS)
  =================================================== */
  describe("Quản lý Môn học (Subjects)", () => {
    it("cho phép Admin thêm mới môn học và chuẩn hóa mã môn thành in hoa", async () => {
      Subject.countDocuments.mockResolvedValue(10);
      Subject.findOne.mockResolvedValue(null);
      Subject.create.mockResolvedValue({
        _id: "sub_toan",
        name: "Toán học nâng cao",
        code: "TOAN_NC",
        periodsPerWeek: 4,
        isActive: true,
        isDeleted: false,
      });

      const res = await request(app)
        .post("/api/v1/academic/subjects")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Toán học nâng cao",
          code: "toan_nc",
          periodsPerWeek: 4,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toBe("TOAN_NC");
    });

    it("báo lỗi khi tạo môn học bị trùng mã môn", async () => {
      Subject.countDocuments.mockResolvedValue(10);
      Subject.findOne.mockResolvedValue({
        _id: "sub_old",
        code: "TOAN",
        isDeleted: false,
      });

      const res = await request(app)
        .post("/api/v1/academic/subjects")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Toán học 2",
          code: "TOAN",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/đã tồn tại/);
    });

    it("thực hiện soft-delete khi xóa môn học đang có dữ liệu phân công giảng dạy", async () => {
      const mockSubject = {
        _id: "sub_1",
        name: "Vật lí",
        code: "LY",
        isDeleted: false,
        isActive: true,
        save: jest.fn().mockResolvedValue(true),
      };
      Subject.findOne.mockResolvedValue(mockSubject);

      const res = await request(app)
        .delete("/api/v1/academic/subjects/sub_1")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockSubject.isDeleted).toBe(true);
      expect(mockSubject.isActive).toBe(false);
      expect(mockSubject.save).toHaveBeenCalled();
      expect(res.body.data.hasRelatedData).toBe(true);
    });
  });

  /* ===================================================
     3. TESTS: LỚP HỌC (CLASSES) & GV CHỦ NHIỆM
  =================================================== */
  describe("Quản lý Lớp học (Classes)", () => {
    it("cho phép Admin tạo lớp học với đầy đủ khối, năm học và GVCN", async () => {
      Grade.findOne.mockResolvedValue({ _id: "g10", level: 10, name: "Khối 10" });
      User.findOne.mockResolvedValue({
        _id: "gv01",
        fullName: "Thầy Giáo Viên",
        role: "teacher",
      });
      Class.findOne.mockResolvedValue(null); // Không bị trùng

      Class.create.mockResolvedValue({
        _id: "cls_10a1",
        name: "10A1",
        grade: "g10",
        academicYear: "2025-2026",
        homeroomTeacher: "gv01",
      });

      Class.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue({
            _id: "cls_10a1",
            name: "10A1",
            academicYear: "2025-2026",
            grade: { _id: "g10", level: 10, name: "Khối 10" },
            homeroomTeacher: { _id: "gv01", fullName: "Thầy Giáo Viên" },
          }),
        }),
      });

      const res = await request(app)
        .post("/api/v1/academic/classes")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "10a1",
          grade: "g10",
          academicYear: "2025-2026",
          homeroomTeacher: "gv01",
          room: "P101",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe("10A1");
    });    it("cho phép giáo viên xem danh sách lớp học", async () => {
      Class.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([
                { _id: "cls_1", name: "10A1", academicYear: "2025-2026" },
              ]),
            }),
          }),
        }),
      });
      User.countDocuments.mockResolvedValue(40);

      const res = await request(app)
        .get("/api/v1/academic/classes")
        .set("Authorization", `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });


    it("chặn việc trùng tên lớp trong cùng một năm học", async () => {
      Grade.findOne.mockResolvedValue({ _id: "g10", level: 10 });
      Class.findOne.mockResolvedValue({
        _id: "cls_existing",
        name: "10A1",
        academicYear: "2025-2026",
        isDeleted: false,
      });

      const res = await request(app)
        .post("/api/v1/academic/classes")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "10A1",
          grade: "g10",
          academicYear: "2025-2026",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/đã tồn tại trong năm học 2025-2026/);
    });

    it("cập nhật và phân công giáo viên chủ nhiệm cho lớp", async () => {
      const mockClass = {
        _id: "cls_10a2",
        name: "10A2",
        academicYear: "2025-2026",
        homeroomTeacher: null,
        save: jest.fn().mockResolvedValue(true),
      };
      Class.findOne.mockResolvedValueOnce(mockClass).mockResolvedValueOnce(null);
      User.findOne.mockResolvedValue({
        _id: "gv02",
        fullName: "Cô Chủ Nhiệm",
        role: "teacher",
      });

      Class.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue({
            _id: "cls_10a2",
            name: "10A2",
            homeroomTeacher: { _id: "gv02", fullName: "Cô Chủ Nhiệm" },
          }),
        }),
      });

      const res = await request(app)
        .patch("/api/v1/academic/classes/cls_10a2/homeroom")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ teacherId: "gv02" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockClass.homeroomTeacher).toBe("gv02");
      expect(mockClass.save).toHaveBeenCalled();
    });

    it("chặn phân công nếu giáo viên đã làm chủ nhiệm lớp khác trong cùng năm học", async () => {
      const mockClass = {
        _id: "cls_10a3",
        name: "10A3",
        academicYear: "2025-2026",
      };
      const existingHomeroomClass = {
        _id: "cls_10a1",
        name: "10A1",
        academicYear: "2025-2026",
      };
      Class.findOne
        .mockResolvedValueOnce(mockClass)
        .mockResolvedValueOnce(existingHomeroomClass);
      User.findOne.mockResolvedValue({
        _id: "gv01",
        fullName: "Thầy Giáo Viên",
        role: "teacher",
      });

      const res = await request(app)
        .patch("/api/v1/academic/classes/cls_10a3/homeroom")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ teacherId: "gv01" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/đang là Giáo viên chủ nhiệm của lớp 10A1/);
    });

    it("ngăn phân công giáo viên chủ nhiệm nếu tài khoản không có quyền giáo viên", async () => {
      Class.findOne.mockResolvedValue({ _id: "cls_10a2", isDeleted: false });
      User.findOne.mockResolvedValue(null); // Không tìm thấy hoặc không phải role 'teacher'

      const res = await request(app)
        .patch("/api/v1/academic/classes/cls_10a2/homeroom")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ teacherId: "student_id" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/không có quyền giáo viên/);
    });
  });

  /* ===================================================
});
