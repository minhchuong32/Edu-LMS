const request = require("supertest");
const app = require("../src/app");
const Class = require("../src/models/Class");
const User = require("../src/models/User");
const ClassHistory = require("../src/models/ClassHistory");
const { generateAccessToken } = require("../src/utils/jwt");

jest.mock("../src/models/Class");
jest.mock("../src/models/User");
jest.mock("../src/models/ClassHistory");

describe("Quản lý Phân lớp & Xếp/Chuyển học sinh (Student Assignment API)", () => {
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
     1. XEM DANH SÁCH HỌC SINH THEO LỚP & CHƯA PHÂN LỚP
  =================================================== */
  describe("Xem danh sách học sinh theo lớp và chưa phân lớp", () => {
    it("cho phép xem danh sách học sinh theo từng lớp học", async () => {
      const mockClass = {
        _id: "class_10a1",
        name: "10A1",
        academicYear: "2025-2026",
        capacity: 45,
        currentStudents: 2,
        isDeleted: false,
      };

      Class.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockClass),
          }),
        }),
      });

      const mockStudents = [
        {
          _id: "s1",
          fullName: "Nguyễn Văn A",
          userCode: "HS001",
          email: "nva@edu.vn",
          className: "10A1",
          classRef: "class_10a1",
        },
        {
          _id: "s2",
          fullName: "Trần Thị B",
          userCode: "HS002",
          email: "ttb@edu.vn",
          className: "10A1",
          classRef: "class_10a1",
        },
      ];

      User.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockStudents),
          }),
        }),
      });

      const res = await request(app)
        .get("/api/v1/academic/classes/class_10a1/students")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.students).toHaveLength(2);
      expect(res.body.data.class.name).toBe("10A1");
      expect(res.body.data.totalStudents).toBe(2);
    });

    it("cho phép Admin lấy danh sách học sinh chưa phân lớp", async () => {
      const mockUnassigned = [
        {
          _id: "s3",
          fullName: "Lê Văn C",
          userCode: "HS003",
          email: "lvc@edu.vn",
        },
      ];

      User.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockUnassigned),
          }),
        }),
      });

      const res = await request(app)
        .get("/api/v1/academic/students/unassigned")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].userCode).toBe("HS003");
    });

    it("từ chối người dùng không phải Admin lấy danh sách học sinh chưa phân lớp", async () => {
      const res = await request(app)
        .get("/api/v1/academic/students/unassigned")
        .set("Authorization", `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });
  });

  /* ===================================================
     2. THÊM HỌC SINH VÀO LỚP
  =================================================== */
  describe("Thêm học sinh vào lớp (Xếp lớp)", () => {
    it("cho phép Admin thêm học sinh vào lớp và cập nhật sĩ số, lưu lịch sử", async () => {
      const mockClass = {
        _id: "class_10a1",
        name: "10A1",
        academicYear: "2025-2026",
        capacity: 45,
        currentStudents: 0,
        isDeleted: false,
        save: jest.fn().mockResolvedValue(true),
      };
      Class.findOne.mockResolvedValue(mockClass);

      const mockStudent = {
        _id: "s1",
        fullName: "Nguyễn Văn A",
        userCode: "HS001",
        role: "student",
        className: null,
        classRef: null,
        save: jest.fn().mockResolvedValue(true),
      };
      User.findById.mockResolvedValue(mockStudent);
      User.countDocuments.mockResolvedValueOnce(0).mockResolvedValueOnce(1);
      ClassHistory.insertMany.mockResolvedValue([]);

      const res = await request(app)
        .post("/api/v1/academic/classes/class_10a1/students")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          studentIds: ["s1"],
          note: "Đầu năm học mới",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(mockStudent.classRef).toBe("class_10a1");
      expect(mockStudent.className).toBe("10A1");
      expect(mockStudent.save).toHaveBeenCalled();
      expect(ClassHistory.insertMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            student: "s1",
            action: "ASSIGN",
            toClass: "class_10a1",
          }),
        ])
      );
      expect(mockClass.currentStudents).toBe(1);
      expect(mockClass.save).toHaveBeenCalled();
    });

    it("ngăn chặn xếp học sinh khi học sinh đã thuộc lớp khác (không thuộc nhiều lớp)", async () => {
      const mockClass = {
        _id: "class_10a1",
        name: "10A1",
        capacity: 45,
        isDeleted: false,
      };
      Class.findOne.mockResolvedValue(mockClass);

      const mockStudent = {
        _id: "s1",
        fullName: "Nguyễn Văn A",
        userCode: "HS001",
        role: "student",
        className: "10A2",
        classRef: "class_10a2",
      };
      User.findById.mockResolvedValue(mockStudent);
      User.countDocuments.mockResolvedValue(10);

      const res = await request(app)
        .post("/api/v1/academic/classes/class_10a1/students")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ studentId: "s1" });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/hiện đang thuộc lớp khác/);
    });

    it("ngăn chặn thêm học sinh nếu vượt quá sĩ số tối đa của lớp (capacity)", async () => {
      const mockClass = {
        _id: "class_10a1",
        name: "10A1",
        capacity: 45,
        isDeleted: false,
      };
      Class.findOne.mockResolvedValue(mockClass);

      User.countDocuments.mockResolvedValue(45); // Lớp đã đầy

      const res = await request(app)
        .post("/api/v1/academic/classes/class_10a1/students")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ studentId: "s1" });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/vượt quá giới hạn tối đa/);
    });

    it("từ chối phân quyền nếu giáo viên thực hiện thêm học sinh vào lớp", async () => {
      const res = await request(app)
        .post("/api/v1/academic/classes/class_10a1/students")
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({ studentId: "s1" });

      expect(res.status).toBe(403);
    });
  });

  /* ===================================================
     3. XÓA HỌC SINH KHỎI LỚP
  =================================================== */
  describe("Xóa học sinh khỏi lớp", () => {
    it("cho phép Admin xóa học sinh khỏi lớp và cập nhật sĩ số, lưu lịch sử REMOVE", async () => {
      const mockClass = {
        _id: "class_10a1",
        name: "10A1",
        academicYear: "2025-2026",
        capacity: 45,
        currentStudents: 1,
        isDeleted: false,
        save: jest.fn().mockResolvedValue(true),
      };
      Class.findOne.mockResolvedValue(mockClass);

      const mockStudent = {
        _id: "s1",
        fullName: "Nguyễn Văn A",
        userCode: "HS001",
        role: "student",
        className: "10A1",
        classRef: "class_10a1",
        save: jest.fn().mockResolvedValue(true),
      };
      User.findById.mockResolvedValue(mockStudent);
      User.countDocuments.mockResolvedValue(0); // Sau khi xóa còn 0
      ClassHistory.create.mockResolvedValue({});

      const res = await request(app)
        .delete("/api/v1/academic/classes/class_10a1/students/s1")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockStudent.classRef).toBeNull();
      expect(mockStudent.className).toBeNull();
      expect(mockStudent.save).toHaveBeenCalled();
      expect(ClassHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          student: "s1",
          action: "REMOVE",
          fromClass: "class_10a1",
          toClass: null,
        })
      );
      expect(mockClass.currentStudents).toBe(0);
      expect(mockClass.save).toHaveBeenCalled();
    });

    it("báo lỗi nếu học sinh không thuộc lớp học cần xóa", async () => {
      const mockClass = {
        _id: "class_10a1",
        name: "10A1",
        isDeleted: false,
      };
      Class.findOne.mockResolvedValue(mockClass);

      const mockStudent = {
        _id: "s1",
        fullName: "Nguyễn Văn A",
        userCode: "HS001",
        role: "student",
        className: "10A2",
        classRef: "class_10a2",
      };
      User.findById.mockResolvedValue(mockStudent);

      const res = await request(app)
        .delete("/api/v1/academic/classes/class_10a1/students/s1")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/không thuộc lớp/);
    });
  });

  /* ===================================================
     4. CHUYỂN HỌC SINH TỪ LỚP NÀY SANG LỚP KHÁC
  =================================================== */
  describe("Chuyển học sinh giữa các lớp", () => {
    it("cho phép Admin chuyển học sinh thành công, cập nhật sĩ số 2 lớp và lưu lịch sử TRANSFER", async () => {
      const mockFromClass = {
        _id: "class_10a1",
        name: "10A1",
        academicYear: "2025-2026",
        capacity: 45,
        currentStudents: 20,
        isDeleted: false,
        save: jest.fn().mockResolvedValue(true),
      };

      const mockToClass = {
        _id: "class_10a2",
        name: "10A2",
        academicYear: "2025-2026",
        capacity: 45,
        currentStudents: 15,
        isDeleted: false,
        save: jest.fn().mockResolvedValue(true),
      };

      const mockStudent = {
        _id: "s1",
        fullName: "Nguyễn Văn A",
        userCode: "HS001",
        role: "student",
        className: "10A1",
        classRef: "class_10a1",
        save: jest.fn().mockResolvedValue(true),
      };

      Class.findOne
        .mockResolvedValueOnce(mockFromClass)
        .mockResolvedValueOnce(mockToClass);
      User.findById.mockResolvedValue(mockStudent);

      // Kiểm tra sĩ số lớp đích
      User.countDocuments.mockResolvedValueOnce(15);
      // Cập nhật lại sĩ số 2 lớp
      User.countDocuments.mockResolvedValueOnce(19).mockResolvedValueOnce(16);

      const mockHistory = {
        _id: "hist_1",
        action: "TRANSFER",
        fromClass: "class_10a1",
        toClass: "class_10a2",
      };
      ClassHistory.create.mockResolvedValue(mockHistory);

      const res = await request(app)
        .post("/api/v1/academic/classes/transfer-student")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          studentId: "s1",
          fromClassId: "class_10a1",
          toClassId: "class_10a2",
          note: "Chuyển theo nguyện vọng chuyên môn",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockStudent.classRef).toBe("class_10a2");
      expect(mockStudent.className).toBe("10A2");
      expect(mockStudent.save).toHaveBeenCalled();
      expect(ClassHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          student: "s1",
          action: "TRANSFER",
          fromClass: "class_10a1",
          toClass: "class_10a2",
        })
      );
      expect(mockFromClass.currentStudents).toBe(19);
      expect(mockToClass.currentStudents).toBe(16);
      expect(mockFromClass.save).toHaveBeenCalled();
      expect(mockToClass.save).toHaveBeenCalled();
    });

    it("từ chối chuyển học sinh nếu lớp chuyển đến trùng lớp hiện tại", async () => {
      const res = await request(app)
        .post("/api/v1/academic/classes/transfer-student")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          studentId: "s1",
          fromClassId: "class_10a1",
          toClassId: "class_10a1",
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/phải khác lớp hiện tại/);
    });

    it("từ chối chuyển nếu lớp đích đã đủ sĩ số tối đa", async () => {
      const mockFromClass = {
        _id: "class_10a1",
        name: "10A1",
        isDeleted: false,
      };

      const mockToClass = {
        _id: "class_10a2",
        name: "10A2",
        capacity: 45,
        isDeleted: false,
      };

      const mockStudent = {
        _id: "s1",
        role: "student",
        className: "10A1",
        classRef: "class_10a1",
      };

      Class.findOne
        .mockResolvedValueOnce(mockFromClass)
        .mockResolvedValueOnce(mockToClass);
      User.findById.mockResolvedValue(mockStudent);
      User.countDocuments.mockResolvedValue(45); // Lớp đích đã đầy 45/45

      const res = await request(app)
        .post("/api/v1/academic/classes/transfer-student")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          studentId: "s1",
          fromClassId: "class_10a1",
          toClassId: "class_10a2",
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/đã đủ sĩ số tối đa/);
    });
  });

  /* ===================================================
     5. LỊCH SỬ XẾP LỚP & CHUYỂN LỚP
  =================================================== */
  describe("Truy vấn Lịch sử phân lớp và chuyển lớp", () => {
    it("cho phép Admin truy vấn toàn bộ lịch sử phân lớp", async () => {
      const mockHistories = [
        {
          _id: "hist_1",
          student: { fullName: "Nguyễn Văn A", userCode: "HS001" },
          action: "TRANSFER",
          fromClass: { name: "10A1" },
          toClass: { name: "10A2" },
          changedAt: new Date(),
        },
      ];

      ClassHistory.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              populate: jest.fn().mockReturnValue({
                sort: jest.fn().mockReturnValue({
                  lean: jest.fn().mockResolvedValue(mockHistories),
                }),
              }),
            }),
          }),
        }),
      });

      const res = await request(app)
        .get("/api/v1/academic/class-history")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].action).toBe("TRANSFER");
    });
  });
});
