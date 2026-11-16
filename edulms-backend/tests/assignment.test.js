const mongoose = require("mongoose");
const Assignment = require("../src/models/Assignment");
const TeachingAssignment = require("../src/models/TeachingAssignment");
const User = require("../src/models/User");
const Class = require("../src/models/Class");
const {
  canCreateAssignment,
  canModifyAssignment,
  canAccessTeachingAssignment,
  canViewAssignmentDetail,
} = require("../src/middlewares/assignmentPermission.middleware");
const {
  createAssignment,
  getAssignments,
  getAssignmentsByClassAndSubject,
  getAssignmentById,
  updateAssignment,
  deleteAssignment,
  updateAssignmentStatus,
  lockAssignment,
  openAssignment,
} = require("../src/controllers/assignment.controller");

// Helper tạo mock Mongoose query chain có thể await
const createMockQuery = (resolvedValue) => {
  const query = {
    sort: jest.fn(),
    populate: jest.fn(),
    select: jest.fn(),
    skip: jest.fn(),
    limit: jest.fn(),
    lean: jest.fn(),
  };
  query.sort.mockReturnValue(query);
  query.populate.mockReturnValue(query);
  query.select.mockReturnValue(query);
  query.skip.mockReturnValue(query);
  query.limit.mockReturnValue(query);
  query.lean.mockResolvedValue(resolvedValue);
  query.then = (resolve, reject) =>
    Promise.resolve(resolvedValue).then(resolve, reject);
  return query;
};

/* ============================================================================
   1. KIỂM THỬ SCHEMA MODEL ASSIGNMENT
============================================================================ */
describe("Assignment Model Schema Validation Tests", () => {
  const dummyTeachingAssignmentId = new mongoose.Types.ObjectId();

  it("khởi tạo hợp lệ với đầy đủ các trường và mặc định status = 'open'", async () => {
    const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const doc = new Assignment({
      teachingAssignment: dummyTeachingAssignmentId,
      title: "Bài tập chương 1: Đại số tuyến tính",
      description: "Hoàn thành bài 1 đến bài 5 trang 24",
      dueDate,
      attachmentUrl: "https://res.cloudinary.com/demo/raw/upload/v1/de-bai.pdf",
    });

    await expect(doc.validate()).resolves.toBeUndefined();
    expect(doc.title).toBe("Bài tập chương 1: Đại số tuyến tính");
    expect(doc.status).toBe("open");
    expect(doc.isActive).toBe(true);
    expect(doc.isDeleted).toBe(false);
  });

  it("bắt buộc phải có teachingAssignment, title và dueDate", async () => {
    const emptyDoc = new Assignment({});

    let err;
    try {
      await emptyDoc.validate();
    } catch (e) {
      err = e;
    }

    expect(err).toBeDefined();
    expect(err.errors.teachingAssignment.message).toMatch(
      /Phân công giảng dạy là bắt buộc/i
    );
    expect(err.errors.title.message).toMatch(/Tiêu đề bài tập là bắt buộc/i);
    expect(err.errors.dueDate.message).toMatch(/Hạn nộp bài.*là bắt buộc/i);
  });

  it("chấp nhận status là 'open' hoặc 'locked' và từ chối giá trị ngoài enum", async () => {
    const lockedDoc = new Assignment({
      teachingAssignment: dummyTeachingAssignmentId,
      title: "Bài tập kiểm tra 15 phút",
      dueDate: new Date(),
      status: "locked",
    });
    await expect(lockedDoc.validate()).resolves.toBeUndefined();
    expect(lockedDoc.status).toBe("locked");

    const invalidStatusDoc = new Assignment({
      teachingAssignment: dummyTeachingAssignmentId,
      title: "Bài tập lỗi trạng thái",
      dueDate: new Date(),
      status: "closed_invalid",
    });
    await expect(invalidStatusDoc.validate()).rejects.toThrow(
      /Trạng thái bài tập 'closed_invalid' không hợp lệ/i
    );
  });

  it("kiểm tra cấu hình index cho teachingAssignment, dueDate và status", () => {
    const indexes = Assignment.schema.indexes();
    const hasDueDateIndex = indexes.some(
      ([idx]) =>
        idx.teachingAssignment === 1 && idx.dueDate === 1 && idx.isDeleted === 1
    );
    const hasStatusIndex = indexes.some(
      ([idx]) =>
        idx.teachingAssignment === 1 && idx.status === 1 && idx.isDeleted === 1
    );

    expect(hasDueDateIndex).toBe(true);
    expect(hasStatusIndex).toBe(true);
  });
});

/* ============================================================================
   2. KIỂM THỬ MIDDLEWARE PHÂN QUYỀN & CHỐNG IDOR THEO TEACHING ASSIGNMENT
============================================================================ */
describe("Assignment Permission Middleware & IDOR Prevention Tests", () => {
  let req, res, next;
  const teacherId = new mongoose.Types.ObjectId().toString();
  const otherTeacherId = new mongoose.Types.ObjectId().toString();
  const studentId = new mongoose.Types.ObjectId().toString();
  const classAId = new mongoose.Types.ObjectId().toString();
  const classBId = new mongoose.Types.ObjectId().toString();
  const teachingAssignmentId = new mongoose.Types.ObjectId().toString();
  const assignmentId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    jest.restoreAllMocks();
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

  it("canCreateAssignment chặn học sinh với mã 403", async () => {
    req.user = { userId: studentId, role: "student" };
    req.body = { teachingAssignment: teachingAssignmentId };

    await canCreateAssignment(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("canCreateAssignment chặn giáo viên không được phân công tạo bài tập (403 IDOR)", async () => {
    req.user = { userId: teacherId, role: "teacher" };
    req.body = { teachingAssignment: teachingAssignmentId };

    jest.spyOn(TeachingAssignment, "findOne").mockResolvedValue({
      _id: teachingAssignmentId,
      teacher: otherTeacherId,
      isDeleted: false,
    });

    await canCreateAssignment(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringMatching(/không được phân công giảng dạy/i),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("canCreateAssignment cho phép giáo viên phụ trách tạo bài tập", async () => {
    req.user = { userId: teacherId, role: "teacher" };
    req.body = { teachingAssignment: teachingAssignmentId };

    const mockTa = {
      _id: teachingAssignmentId,
      teacher: teacherId,
      isDeleted: false,
    };
    jest.spyOn(TeachingAssignment, "findOne").mockResolvedValue(mockTa);

    await canCreateAssignment(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.targetTeachingAssignment).toBe(mockTa);
  });

  it("canModifyAssignment chặn giáo viên khác sửa/xóa/khóa bài tập không thuộc phân công của mình (403)", async () => {
    req.user = { userId: teacherId, role: "teacher" };
    req.params = { id: assignmentId };

    jest.spyOn(Assignment, "findOne").mockResolvedValue({
      _id: assignmentId,
      teachingAssignment: teachingAssignmentId,
      isDeleted: false,
    });
    jest.spyOn(TeachingAssignment, "findOne").mockResolvedValue({
      _id: teachingAssignmentId,
      teacher: otherTeacherId,
      isDeleted: false,
    });

    await canModifyAssignment(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringMatching(/không phải giáo viên phụ trách bài tập này/i),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("canAccessTeachingAssignment chặn học sinh lớp A truy cập bài tập của lớp B (403)", async () => {
    req.user = { userId: studentId, role: "student" };
    req.query = { teachingAssignment: teachingAssignmentId };

    jest.spyOn(TeachingAssignment, "findOne").mockResolvedValue({
      _id: teachingAssignmentId,
      class: classBId,
      teacher: teacherId,
      isDeleted: false,
    });

    jest.spyOn(User, "findById").mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: studentId,
        role: "student",
        classRef: classAId,
      }),
    });

    jest.spyOn(Class, "findOne").mockResolvedValue({
      _id: classAId,
      name: "10A1",
      isDeleted: false,
    });

    await canAccessTeachingAssignment(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringMatching(/không thuộc lớp học này/i),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("canViewAssignmentDetail cho phép học sinh đúng lớp xem chi tiết bài tập", async () => {
    req.user = { userId: studentId, role: "student" };
    req.params = { id: assignmentId };

    jest.spyOn(Assignment, "findOne").mockResolvedValue({
      _id: assignmentId,
      teachingAssignment: teachingAssignmentId,
      isActive: true,
      isDeleted: false,
    });

    jest.spyOn(TeachingAssignment, "findOne").mockResolvedValue({
      _id: teachingAssignmentId,
      class: classAId,
      teacher: teacherId,
      isDeleted: false,
    });

    jest.spyOn(User, "findById").mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: studentId,
        role: "student",
        classRef: classAId,
      }),
    });

    jest.spyOn(Class, "findOne").mockResolvedValue({
      _id: classAId,
      name: "10A1",
      isDeleted: false,
    });

    await canViewAssignmentDetail(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});

/* ============================================================================
   3. KIỂM THỬ CONTROLLER CRUD & MỞ / KHÓA NHẬN BÀI TẬP
============================================================================ */
describe("Assignment Controller CRUD & Lock/Unlock Unit Tests", () => {
  let req, res, next;
  const teacherId = new mongoose.Types.ObjectId().toString();
  const otherTeacherId = new mongoose.Types.ObjectId().toString();
  const teachingAssignmentId = new mongoose.Types.ObjectId().toString();
  const assignmentId = new mongoose.Types.ObjectId().toString();
  const classId = new mongoose.Types.ObjectId().toString();
  const subjectId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    jest.restoreAllMocks();
    req = {
      user: { userId: teacherId, role: "teacher" },
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

  describe("createAssignment", () => {
    it("tạo bài tập thành công (201) khi giáo viên được phân công hợp lệ", async () => {
      const dueDate = new Date(Date.now() + 86400000).toISOString();
      req.body = {
        teachingAssignment: teachingAssignmentId,
        title: "Bài tập lớn số 1",
        description: "Nộp file báo cáo PDF",
        dueDate,
        attachmentUrl: "https://res.cloudinary.com/demo/raw/upload/v1/btl1.pdf",
        status: "open",
      };

      jest.spyOn(TeachingAssignment, "findOne").mockResolvedValue({
        _id: teachingAssignmentId,
        teacher: teacherId,
        isDeleted: false,
      });

      const mockSaved = {
        _id: assignmentId,
        ...req.body,
        isActive: true,
        isDeleted: false,
      };
      jest.spyOn(Assignment.prototype, "save").mockResolvedValue(mockSaved);

      await createAssignment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Tạo bài tập thành công",
          data: mockSaved,
        })
      );
    });

    it("báo lỗi 400 khi thiếu hạn nộp dueDate hoặc tiêu đề", async () => {
      req.body = {
        teachingAssignment: teachingAssignmentId,
        title: "Bài tập thiếu hạn nộp",
      };

      await createAssignment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Hạn nộp bài (dueDate) là bắt buộc",
        })
      );
    });
  });

  describe("getAssignments & getAssignmentsByClassAndSubject & getAssignmentById", () => {
    it("getAssignments trả về danh sách bài tập thuộc phân công của giáo viên", async () => {
      req.query = { teachingAssignment: teachingAssignmentId };

      jest.spyOn(TeachingAssignment, "findOne").mockResolvedValue({
        _id: teachingAssignmentId,
        teacher: teacherId,
        isDeleted: false,
      });

      const mockList = [
        {
          _id: assignmentId,
          title: "Bài tập 1",
          status: "open",
          teachingAssignment: teachingAssignmentId,
        },
      ];
      jest.spyOn(Assignment, "find").mockReturnValue(createMockQuery(mockList));

      await getAssignments(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockList,
        })
      );
    });

    it("getAssignmentsByClassAndSubject lấy danh sách bài tập theo lớp và môn học", async () => {
      req.query = { classId, subjectId };

      jest.spyOn(TeachingAssignment, "find").mockReturnValue(
        createMockQuery([
          { _id: teachingAssignmentId, class: classId, subject: subjectId, teacher: teacherId },
        ])
      );

      const mockList = [{ _id: assignmentId, title: "Bài tập Lớp - Môn" }];
      jest.spyOn(Assignment, "find").mockReturnValue(createMockQuery(mockList));

      await getAssignmentsByClassAndSubject(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockList,
        })
      );
    });

    it("getAssignmentById trả về chi tiết bài tập khi đúng giáo viên phụ trách", async () => {
      req.params = { id: assignmentId };

      const mockDetail = {
        _id: assignmentId,
        title: "Bài tập chi tiết",
        status: "open",
        teachingAssignment: {
          _id: teachingAssignmentId,
          teacher: { _id: teacherId },
        },
      };
      jest
        .spyOn(Assignment, "findOne")
        .mockReturnValue(createMockQuery(mockDetail));

      await getAssignmentById(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockDetail,
        })
      );
    });
  });

  describe("updateAssignment & deleteAssignment", () => {
    it("updateAssignment cập nhật thông tin bài tập thành công", async () => {
      req.params = { id: assignmentId };
      req.body = {
        title: "Bài tập đã cập nhật",
        description: "Mô tả mới",
        status: "locked",
      };

      const mockDoc = {
        _id: assignmentId,
        teachingAssignment: teachingAssignmentId,
        title: "Bài tập cũ",
        description: "",
        status: "open",
        attachments: [],
        attachmentUrl: "",
        save: jest.fn().mockImplementation(function () {
          return Promise.resolve(this);
        }),
      };

      jest.spyOn(Assignment, "findOne").mockResolvedValue(mockDoc);
      jest.spyOn(TeachingAssignment, "findOne").mockResolvedValue({
        _id: teachingAssignmentId,
        teacher: teacherId,
        isDeleted: false,
      });

      await updateAssignment(req, res, next);

      expect(mockDoc.title).toBe("Bài tập đã cập nhật");
      expect(mockDoc.status).toBe("locked");
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("deleteAssignment xóa mềm bài tập thành công khi đúng giáo viên phụ trách", async () => {
      req.params = { id: assignmentId };

      const mockDoc = {
        _id: assignmentId,
        teachingAssignment: teachingAssignmentId,
        isDeleted: false,
        isActive: true,
        attachments: [],
        attachmentUrl: "",
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Assignment, "findOne").mockResolvedValue(mockDoc);
      jest.spyOn(TeachingAssignment, "findOne").mockResolvedValue({
        _id: teachingAssignmentId,
        teacher: teacherId,
        isDeleted: false,
      });

      await deleteAssignment(req, res, next);

      expect(mockDoc.isDeleted).toBe(true);
      expect(mockDoc.isActive).toBe(false);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Xóa bài tập thành công",
        })
      );
    });
  });

  describe("API Mở / Khóa nhận bài (updateAssignmentStatus, lockAssignment, openAssignment)", () => {
    it("lockAssignment chuyển trạng thái bài tập sang 'locked'", async () => {
      req.params = { id: assignmentId };

      const mockDoc = {
        _id: assignmentId,
        teachingAssignment: teachingAssignmentId,
        status: "open",
        save: jest.fn().mockImplementation(function () {
          return Promise.resolve(this);
        }),
      };

      jest.spyOn(Assignment, "findOne").mockResolvedValue(mockDoc);
      jest.spyOn(TeachingAssignment, "findOne").mockResolvedValue({
        _id: teachingAssignmentId,
        teacher: teacherId,
        isDeleted: false,
      });

      await lockAssignment(req, res, next);

      expect(mockDoc.status).toBe("locked");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Khóa nhận bài tập thành công",
        })
      );
    });

    it("openAssignment chuyển trạng thái bài tập sang 'open'", async () => {
      req.params = { id: assignmentId };

      const mockDoc = {
        _id: assignmentId,
        teachingAssignment: teachingAssignmentId,
        status: "locked",
        save: jest.fn().mockImplementation(function () {
          return Promise.resolve(this);
        }),
      };

      jest.spyOn(Assignment, "findOne").mockResolvedValue(mockDoc);
      jest.spyOn(TeachingAssignment, "findOne").mockResolvedValue({
        _id: teachingAssignmentId,
        teacher: teacherId,
        isDeleted: false,
      });

      await openAssignment(req, res, next);

      expect(mockDoc.status).toBe("open");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Mở nhận bài tập thành công",
        })
      );
    });

    it("updateAssignmentStatus tự động đảo trạng thái (toggle) nếu không truyền status và chặn giáo viên khác (403)", async () => {
      req.params = { id: assignmentId };
      req.user = { userId: otherTeacherId, role: "teacher" };

      const mockDoc = {
        _id: assignmentId,
        teachingAssignment: teachingAssignmentId,
        status: "open",
        save: jest.fn(),
      };

      jest.spyOn(Assignment, "findOne").mockResolvedValue(mockDoc);
      jest.spyOn(TeachingAssignment, "findOne").mockResolvedValue({
        _id: teachingAssignmentId,
        teacher: teacherId,
        isDeleted: false,
      });

      await updateAssignmentStatus(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockDoc.save).not.toHaveBeenCalled();
    });
  });
});

