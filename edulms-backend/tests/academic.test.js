const request = require("supertest");
const app = require("../src/app");
const Grade = require("../src/models/Grade");
const Subject = require("../src/models/Subject");
const Class = require("../src/models/Class");
const TeachingAssignment = require("../src/models/TeachingAssignment");
const User = require("../src/models/User");
const { generateAccessToken } = require("../src/utils/jwt");

jest.mock("../src/models/Grade");
jest.mock("../src/models/Subject");
jest.mock("../src/models/Class");
jest.mock("../src/models/TeachingAssignment");
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
      TeachingAssignment.countDocuments.mockResolvedValue(2); // Có 2 phân công

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
      TeachingAssignment.countDocuments.mockResolvedValue(10);

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
     4. TESTS: PHÂN CÔNG GIẢNG DẠY (TEACHING ASSIGNMENT)
  =================================================== */
  describe("Phân công Giảng dạy (Teaching Assignments)", () => {
    it("cho phép phân công giáo viên bộ môn cho cặp Lớp - Môn học", async () => {
      Class.findOne.mockResolvedValue({
        _id: "cls_10a1",
        name: "10A1",
        academicYear: "2025-2026",
      });
      Subject.findOne.mockResolvedValue({
        _id: "sub_toan",
        name: "Toán học",
        periodsPerWeek: 4,
      });
      User.findOne.mockResolvedValue({
        _id: "gv_toan",
        fullName: "Thầy Dạy Toán",
        role: "teacher",
      });
      TeachingAssignment.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null), // Chưa có phân công trùng
      });

      TeachingAssignment.create.mockResolvedValue({
        _id: "assign_1",
        class: "cls_10a1",
        subject: "sub_toan",
        teacher: "gv_toan",
        academicYear: "2025-2026",
        semester: "CaNam",
      });

      TeachingAssignment.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue({
              _id: "assign_1",
              class: { name: "10A1" },
              subject: { name: "Toán học" },
              teacher: { fullName: "Thầy Dạy Toán" },
              academicYear: "2025-2026",
              semester: "CaNam",
            }),
          }),
        }),
      });

      const res = await request(app)
        .post("/api/v1/academic/assignments")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          class: "cls_10a1",
          subject: "sub_toan",
          teacher: "gv_toan",
          academicYear: "2025-2026",
          semester: "CaNam",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.teacher.fullName).toBe("Thầy Dạy Toán");
    });

    it("chặn việc phân công nhiều giáo viên cùng phụ trách một Lớp - Môn học trong cùng thời gian", async () => {
      Class.findOne.mockResolvedValue({
        _id: "cls_10a1",
        name: "10A1",
        academicYear: "2025-2026",
      });
      Subject.findOne.mockResolvedValue({
        _id: "sub_toan",
        name: "Toán học",
      });
      User.findOne.mockResolvedValue({
        _id: "gv_toan_2",
        fullName: "Thầy Toán Khác",
        role: "teacher",
      });

      // Đã có phân công trước đó cho Thầy Dạy Toán 1
      TeachingAssignment.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue({
          _id: "assign_old",
          semester: "CaNam",
          teacher: { fullName: "Thầy Dạy Toán 1" },
        }),
      });

      const res = await request(app)
        .post("/api/v1/academic/assignments")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          class: "cls_10a1",
          subject: "sub_toan",
          teacher: "gv_toan_2",
          academicYear: "2025-2026",
          semester: "CaNam",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Không được phân công trùng lặp/);
    });

    it("từ chối người dùng vai trò Student thực hiện phân công học vụ", async () => {
      const res = await request(app)
        .post("/api/v1/academic/assignments")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({
          class: "cls_1",
          subject: "sub_1",
          teacher: "gv_1",
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("hủy phân công giảng dạy bằng soft-delete", async () => {
      const mockAssignment = {
        _id: "assign_del",
        isDeleted: false,
        isActive: true,
        save: jest.fn().mockResolvedValue(true),
      };
      TeachingAssignment.findOne.mockResolvedValue(mockAssignment);

      const res = await request(app)
        .delete("/api/v1/academic/assignments/assign_del")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockAssignment.isDeleted).toBe(true);
      expect(mockAssignment.isActive).toBe(false);
      expect(mockAssignment.save).toHaveBeenCalled();
    });

    it("từ chối phân công khi dữ liệu Lớp, Môn học hoặc Giáo viên không tồn tại", async () => {
      Class.findOne.mockResolvedValue(null); // Lớp không tồn tại

      const res = await request(app)
        .post("/api/v1/academic/assignments")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          class: "cls_nonexistent",
          subject: "sub_1",
          teacher: "gv_1",
          academicYear: "2025-2026",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Lớp học không tồn tại/);
    });

    it("phát hiện và chặn khi giáo viên bị trùng lịch dạy lớp khác vào cùng thứ và tiết", async () => {
      Class.findOne.mockResolvedValue({
        _id: "cls_10a2",
        name: "10A2",
        academicYear: "2025-2026",
      });
      Subject.findOne.mockResolvedValue({
        _id: "sub_ly",
        name: "Vật lí",
      });
      User.findOne.mockResolvedValue({
        _id: "gv_ly",
        fullName: "Thầy Dạy Lý",
        role: "teacher",
      });

      // Không trùng Cặp Lớp - Môn
      TeachingAssignment.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });

      // Nhưng giáo viên đã có lịch dạy lớp 10A1 vào Thứ 2 (Tiết 1-2)
      TeachingAssignment.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue([
              {
                _id: "assign_existing_slot",
                class: { name: "10A1" },
                subject: { name: "Vật lí" },
                teacher: { fullName: "Thầy Dạy Lý" },
                schedules: [{ dayOfWeek: 2, startPeriod: 1, endPeriod: 2 }],
              },
            ]),
          }),
        }),
      });

      const res = await request(app)
        .post("/api/v1/academic/assignments")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          class: "cls_10a2",
          subject: "sub_ly",
          teacher: "gv_ly",
          academicYear: "2025-2026",
          semester: "HK1",
          schedules: [{ dayOfWeek: 2, startPeriod: 2, endPeriod: 3 }], // Trùng tiết 2 vào Thứ 2
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/đã có lịch dạy lớp 10A1 môn Vật lí vào Thứ 2/);
    });

    it("hỗ trợ API POST /assignments/check-conflict để kiểm tra lịch trước", async () => {
      TeachingAssignment.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });
      TeachingAssignment.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      const res = await request(app)
        .post("/api/v1/academic/assignments/check-conflict")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          class: "cls_10a1",
          subject: "sub_toan",
          teacher: "gv_toan",
          academicYear: "2025-2026",
          semester: "CaNam",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.hasConflict).toBe(false);
    });

    it("lấy thời khóa biểu/lịch dạy của giáo viên qua GET /assignments/teacher/:id", async () => {
      TeachingAssignment.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([
              {
                _id: "assign_schedule_1",
                class: { name: "10A1", room: "P101" },
                subject: { name: "Toán học", code: "TOAN" },
                schedules: [{ dayOfWeek: 2, startPeriod: 1, endPeriod: 2 }],
              },
            ]),
          }),
        }),
      });

      const res = await request(app)
        .get("/api/v1/academic/assignments/teacher/gv_toan?academicYear=2025-2026")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].subject.code).toBe("TOAN");
    });
  });
});
