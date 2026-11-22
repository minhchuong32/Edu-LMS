const request = require("supertest");
const app = require("../src/app");
const Timetable = require("../src/models/Timetable");
const TeachingAssignment = require("../src/models/TeachingAssignment");
const Class = require("../src/models/Class");
const Subject = require("../src/models/Subject");
const User = require("../src/models/User");
const { generateAccessToken } = require("../src/utils/jwt");

jest.mock("../src/models/Timetable");
jest.mock("../src/models/TeachingAssignment");
jest.mock("../src/models/Class");
jest.mock("../src/models/Subject");
jest.mock("../src/models/User");

const createQueryMock = (resolvedValue = null) => {
  const query = {};
  query.populate = jest.fn().mockReturnValue(query);
  query.select = jest.fn().mockReturnValue(query);
  query.sort = jest.fn().mockReturnValue(query);
  query.lean = jest.fn().mockResolvedValue(resolvedValue);
  query.then = (resolve, reject) => Promise.resolve(resolvedValue).then(resolve, reject);
  return query;
};

describe("Timetable Schema & API Unit & Integration Tests", () => {
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
     1. TẠO THỜI KHÓA BIỂU & LIÊN KẾT TEACHING ASSIGNMENT
  =================================================== */
  describe("Tạo thời khóa biểu & liên kết TeachingAssignment", () => {
    it("cho phép Admin tạo tiết thời khóa biểu khi cung cấp teachingAssignment ID hợp lệ", async () => {
      TeachingAssignment.findOne.mockResolvedValue({
        _id: "ta_toan_10a1",
        class: "cls_10a1",
        subject: "sub_toan",
        teacher: "teacher_123",
        academicYear: "2025-2026",
        semester: "CaNam",
        isDeleted: false,
      });

      Class.findOne.mockResolvedValue({
        _id: "cls_10a1",
        name: "10A1",
        room: "P101",
        isDeleted: false,
      });

      Subject.findOne.mockResolvedValue({
        _id: "sub_toan",
        name: "Toán học",
        isDeleted: false,
      });

      User.findOne.mockResolvedValue({
        _id: "teacher_123",
        fullName: "Thầy Giáo Toán",
        role: "teacher",
      });

      // Không có xung đột (giáo viên và lớp đều trống tiết này)
      Timetable.findOne
        .mockReturnValueOnce(createQueryMock(null))
        .mockReturnValueOnce(createQueryMock(null))
        // Mock cho getTimetableById sau khi tạo
        .mockReturnValueOnce(
          createQueryMock({
            _id: "tt_1",
            class: { name: "10A1", room: "P101" },
            subject: { name: "Toán học", code: "TOAN10" },
            teacher: { fullName: "Thầy Giáo Toán" },
            teachingAssignment: { _id: "ta_toan_10a1" },
            dayOfWeek: 2,
            period: 1,
            academicYear: "2025-2026",
            semester: "CaNam",
          })
        );

      Timetable.create.mockResolvedValue({
        _id: "tt_1",
      });

      const res = await request(app)
        .post("/api/v1/academic/timetables")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          class: "cls_10a1",
          subject: "sub_toan",
          teacher: "teacher_123",
          teachingAssignment: "ta_toan_10a1",
          dayOfWeek: 2,
          period: 1,
          academicYear: "2025-2026",
          semester: "CaNam",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.class.name).toBe("10A1");
      expect(res.body.data.subject.name).toBe("Toán học");
      expect(res.body.data.period).toBe(1);
    });

    it("tự động tra cứu TeachingAssignment khi không truyền teachingAssignment ID", async () => {
      TeachingAssignment.findOne.mockResolvedValue({
        _id: "ta_auto_found",
        class: "cls_10a1",
        subject: "sub_toan",
        teacher: "teacher_123",
        academicYear: "2025-2026",
        semester: "CaNam",
        isDeleted: false,
      });

      Class.findOne.mockResolvedValue({ _id: "cls_10a1", name: "10A1", isDeleted: false });
      Subject.findOne.mockResolvedValue({ _id: "sub_toan", name: "Toán học", isDeleted: false });
      User.findOne.mockResolvedValue({ _id: "teacher_123", role: "teacher" });

      Timetable.findOne
        .mockReturnValueOnce(createQueryMock(null))
        .mockReturnValueOnce(createQueryMock(null))
        .mockReturnValueOnce(
          createQueryMock({
            _id: "tt_auto",
            dayOfWeek: 3,
            period: 2,
          })
        );

      Timetable.create.mockResolvedValue({ _id: "tt_auto" });

      const res = await request(app)
        .post("/api/v1/academic/timetables")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          class: "cls_10a1",
          subject: "sub_toan",
          teacher: "teacher_123",
          dayOfWeek: 3,
          period: 2,
          academicYear: "2025-2026",
          semester: "CaNam",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(TeachingAssignment.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          class: "cls_10a1",
          subject: "sub_toan",
          teacher: "teacher_123",
        })
      );
    });

    it("từ chối khi không tìm thấy phân công giảng dạy tương ứng", async () => {
      TeachingAssignment.findOne.mockResolvedValue(null);

      const res = await request(app)
        .post("/api/v1/academic/timetables")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          class: "cls_10a1",
          subject: "sub_toan",
          teacher: "teacher_123",
          dayOfWeek: 2,
          period: 1,
          academicYear: "2025-2026",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Không tìm thấy phân công giảng dạy phù hợp/);
    });

    it("từ chối thứ hoặc tiết học ngoài phạm vi cho phép (thứ 2-8, tiết 1-10)", async () => {
      const resInvalidDay = await request(app)
        .post("/api/v1/academic/timetables")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          dayOfWeek: 9,
          period: 1,
        });

      expect(resInvalidDay.status).toBe(400);
      expect(resInvalidDay.body.message).toMatch(/Thứ trong tuần không hợp lệ/);

      const resInvalidPeriod = await request(app)
        .post("/api/v1/academic/timetables")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          dayOfWeek: 2,
          period: 15,
        });

      expect(resInvalidPeriod.status).toBe(400);
      expect(resInvalidPeriod.body.message).toMatch(/Tiết học không hợp lệ/);
    });
  });

  /* ===================================================
     2. KIỂM TRA VÀ CHẶN XUNG ĐỘT (CONFLICT VALIDATION)
  =================================================== */
  describe("Kiểm tra và ngăn chặn trùng tiết (Conflict Validation)", () => {
    it("chặn khi giáo viên bị phân công trùng tiết ở 2 lớp khác nhau", async () => {
      TeachingAssignment.findOne.mockResolvedValue({
        _id: "ta_toan_10a2",
        class: "cls_10a2",
        subject: "sub_toan",
        teacher: "teacher_123",
        academicYear: "2025-2026",
        semester: "CaNam",
        isDeleted: false,
      });

      Class.findOne.mockResolvedValue({ _id: "cls_10a2", name: "10A2", isDeleted: false });
      Subject.findOne.mockResolvedValue({ _id: "sub_toan", name: "Toán học", isDeleted: false });
      User.findOne.mockResolvedValue({ _id: "teacher_123", fullName: "Thầy Giáo Toán", role: "teacher" });

      // Phát hiện giáo viên đã có tiết ở lớp 10A1
      Timetable.findOne.mockReturnValueOnce(
        createQueryMock({
          _id: "tt_conflict",
          teacher: { fullName: "Thầy Giáo Toán" },
          class: { name: "10A1" },
          subject: { name: "Toán học" },
        })
      );

      const res = await request(app)
        .post("/api/v1/academic/timetables")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          class: "cls_10a2",
          subject: "sub_toan",
          teacher: "teacher_123",
          dayOfWeek: 2,
          period: 1,
          academicYear: "2025-2026",
          semester: "CaNam",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Giáo viên Thầy Giáo Toán đã có lịch dạy lớp 10A1/);
    });

    it("chặn khi một lớp có 2 môn học trùng cùng một thứ và tiết", async () => {
      TeachingAssignment.findOne.mockResolvedValue({
        _id: "ta_van_10a1",
        class: "cls_10a1",
        subject: "sub_van",
        teacher: "teacher_456",
        academicYear: "2025-2026",
        semester: "CaNam",
        isDeleted: false,
      });

      Class.findOne.mockResolvedValue({ _id: "cls_10a1", name: "10A1", isDeleted: false });
      Subject.findOne.mockResolvedValue({ _id: "sub_van", name: "Ngữ văn", isDeleted: false });
      User.findOne.mockResolvedValue({ _id: "teacher_456", fullName: "Cô Giáo Văn", role: "teacher" });

      // Giáo viên chưa trùng
      Timetable.findOne
        .mockReturnValueOnce(createQueryMock(null))
        // Nhưng lớp 10A1 đã có lịch học môn Toán
        .mockReturnValueOnce(
          createQueryMock({
            _id: "tt_class_conflict",
            class: { name: "10A1" },
            subject: { name: "Toán học" },
            teacher: { fullName: "Thầy Giáo Toán" },
          })
        );

      const res = await request(app)
        .post("/api/v1/academic/timetables")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          class: "cls_10a1",
          subject: "sub_van",
          teacher: "teacher_456",
          dayOfWeek: 2,
          period: 1,
          academicYear: "2025-2026",
          semester: "CaNam",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Lớp 10A1 đã có lịch học môn Toán học/);
    });

    it("hỗ trợ endpoint POST /academic/timetables/check-conflict để kiểm tra lịch trước", async () => {
      // Trường hợp không có trùng lặp
      Timetable.findOne
        .mockReturnValueOnce(createQueryMock(null))
        .mockReturnValueOnce(createQueryMock(null));

      const res = await request(app)
        .post("/api/v1/academic/timetables/check-conflict")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          class: "cls_10a1",
          teacher: "teacher_123",
          dayOfWeek: 4,
          period: 3,
          academicYear: "2025-2026",
          semester: "CaNam",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.hasConflict).toBe(false);
    });
  });

  /* ===================================================
     3. PHÂN QUYỀN TRUY CẬP (RBAC)
  =================================================== */
  describe("Phân quyền truy cập (RBAC)", () => {
    it("từ chối người dùng chưa đăng nhập truy cập API thời khóa biểu", async () => {
      const res = await request(app).get("/api/v1/academic/timetables");
      expect(res.status).toBe(401);
    });

    it("từ chối giáo viên và học sinh tạo hoặc sửa đổi thời khóa biểu (403)", async () => {
      const resTeacher = await request(app)
        .post("/api/v1/academic/timetables")
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({ dayOfWeek: 2, period: 1 });

      expect(resTeacher.status).toBe(403);

      const resStudent = await request(app)
        .post("/api/v1/academic/timetables")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({ dayOfWeek: 2, period: 1 });

      expect(resStudent.status).toBe(403);
    });
  });

  /* ===================================================
     4. TRUY VẤN THỜI KHÓA BIỂU THEO LỚP & GIÁO VIÊN
  =================================================== */
  describe("Truy vấn thời khóa biểu", () => {
    it("cho phép giáo viên xem thời khóa biểu giảng dạy của mình qua /teacher/:teacherId hoặc /teacher/me", async () => {
      User.findOne.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            _id: "teacher_123",
            fullName: "Thầy Giáo Toán",
            role: "teacher",
          }),
        }),
      });

      Timetable.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([
                {
                  _id: "tt_1",
                  dayOfWeek: 2,
                  period: 1,
                  class: { name: "10A1" },
                  subject: { name: "Toán học" },
                },
              ]),
            }),
          }),
        }),
      });

      const res = await request(app)
        .get("/api/v1/academic/timetables/teacher/me")
        .set("Authorization", `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.teacher.fullName).toBe("Thầy Giáo Toán");
      expect(res.body.data.slots).toHaveLength(1);
      expect(res.body.data.grid[2][1]).toBeDefined();
    });

    it("cho phép học sinh xem thời khóa biểu của lớp mình qua /class/:classId", async () => {
      User.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            _id: "student_123",
            classRef: "cls_10a1",
          }),
        }),
      });

      Class.findOne.mockReturnValue(
        createQueryMock({
          _id: "cls_10a1",
          name: "10A1",
        })
      );

      Timetable.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([
                {
                  _id: "tt_1",
                  dayOfWeek: 2,
                  period: 1,
                  subject: { name: "Toán học" },
                  teacher: { fullName: "Thầy Giáo Toán" },
                },
              ]),
            }),
          }),
        }),
      });

      const res = await request(app)
        .get("/api/v1/academic/timetables/class/cls_10a1")
        .set("Authorization", `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.class.name).toBe("10A1");
      expect(res.body.data.slots).toHaveLength(1);
    });

    it("chặn học sinh xem thời khóa biểu của lớp khác (403)", async () => {
      User.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            _id: "student_123",
            classRef: "cls_10a1",
          }),
        }),
      });

      const res = await request(app)
        .get("/api/v1/academic/timetables/class/cls_10a2")
        .set("Authorization", `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Học sinh chỉ được phép xem thời khóa biểu của lớp mình/);
    });

    it("hỗ trợ endpoint /my-schedule trả về lịch học tự động cho học sinh", async () => {
      User.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            _id: "student_123",
            classRef: "cls_10a1",
            fullName: "Nguyễn Văn Học Sinh",
          }),
        }),
      });

      Class.findOne.mockReturnValue(
        createQueryMock({
          _id: "cls_10a1",
          name: "10A1",
        })
      );

      Timetable.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });

      const res = await request(app)
        .get("/api/v1/academic/timetables/my-schedule")
        .set("Authorization", `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.class.name).toBe("10A1");
    });
  });

  /* ===================================================
     5. CẬP NHẬT VÀ XÓA TIẾT THỜI KHÓA BIỂU
  =================================================== */
  describe("Cập nhật và Xóa tiết thời khóa biểu", () => {
    it("cho phép Admin cập nhật tiết thời khóa biểu hợp lệ", async () => {
      const mockExisting = {
        _id: "tt_1",
        class: "cls_10a1",
        subject: "sub_toan",
        teacher: "teacher_123",
        teachingAssignment: "ta_toan_10a1",
        dayOfWeek: 2,
        period: 1,
        academicYear: "2025-2026",
        semester: "CaNam",
        save: jest.fn().mockResolvedValue(true),
      };

      Timetable.findOne
        .mockResolvedValueOnce(mockExisting) // findOne trong updateTimetableEntry
        .mockReturnValueOnce(createQueryMock(null)) // teacher conflict
        .mockReturnValueOnce(createQueryMock(null)) // class conflict
        .mockReturnValueOnce(
          createQueryMock({
            _id: "tt_1",
            dayOfWeek: 2,
            period: 2,
          })
        );

      const res = await request(app)
        .put("/api/v1/academic/timetables/tt_1")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          period: 2,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockExisting.save).toHaveBeenCalled();
    });

    it("cho phép Admin xóa mềm (soft-delete) tiết thời khóa biểu", async () => {
      const mockExisting = {
        _id: "tt_1",
        isDeleted: false,
        isActive: true,
        save: jest.fn().mockResolvedValue(true),
      };

      Timetable.findOne.mockResolvedValue(mockExisting);

      const res = await request(app)
        .delete("/api/v1/academic/timetables/tt_1")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockExisting.isDeleted).toBe(true);
      expect(mockExisting.isActive).toBe(false);
      expect(mockExisting.save).toHaveBeenCalled();
    });
  });

  /* ===================================================
     6. THIẾT LẬP THỜI KHÓA BIỂU HÀNG LOẠT (BATCH SETUP)
  =================================================== */
  describe("Thiết lập thời khóa biểu hàng loạt cho Lớp (Batch Setup)", () => {
    it("từ chối batch nếu trong danh sách gửi lên có 2 tiết bị trùng giờ học của lớp", async () => {
      Class.findOne.mockResolvedValue({ _id: "cls_10a1", name: "10A1", isDeleted: false });

      const res = await request(app)
        .post("/api/v1/academic/timetables/batch")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          class: "cls_10a1",
          academicYear: "2025-2026",
          semester: "CaNam",
          slots: [
            { subject: "sub_1", teacher: "t_1", dayOfWeek: 2, period: 1 },
            { subject: "sub_2", teacher: "t_2", dayOfWeek: 2, period: 1 }, // Trùng thứ 2 tiết 1
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Dữ liệu gửi lên bị trùng tiết học trong lớp/);
    });

    it("cho phép Admin thiết lập thời khóa biểu tuần hàng loạt thành công", async () => {
      Class.findOne
        .mockResolvedValueOnce({ _id: "cls_10a1", name: "10A1", isDeleted: false })
        .mockReturnValueOnce(
          createQueryMock({
            _id: "cls_10a1",
            name: "10A1",
          })
        );

      TeachingAssignment.findOne.mockResolvedValue({
        _id: "ta_1",
        class: "cls_10a1",
        subject: "sub_1",
        teacher: "t_1",
        academicYear: "2025-2026",
        semester: "CaNam",
      });

      // Không trùng giáo viên, không trùng lớp
      Timetable.findOne
        .mockReturnValueOnce(createQueryMock(null))
        .mockReturnValueOnce(createQueryMock(null));

      Timetable.insertMany.mockResolvedValue([{ _id: "tt_batch_1" }]);

      Timetable.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([
                {
                  _id: "tt_batch_1",
                  dayOfWeek: 2,
                  period: 1,
                  subject: { name: "Toán học" },
                  teacher: { fullName: "Thầy Giáo Toán" },
                },
              ]),
            }),
          }),
        }),
      });

      const res = await request(app)
        .post("/api/v1/academic/timetables/batch")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          class: "cls_10a1",
          academicYear: "2025-2026",
          semester: "CaNam",
          slots: [{ subject: "sub_1", teacher: "t_1", dayOfWeek: 2, period: 1 }],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(Timetable.insertMany).toHaveBeenCalled();
    });
  });
});
