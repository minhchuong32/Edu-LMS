const mongoose = require("mongoose");
const ExcelJS = require("exceljs");
const User = require("../src/models/User");
const Class = require("../src/models/Class");
const GradeRecord = require("../src/models/GradeRecord");
const Notification = require("../src/models/Notification");
const { protect, authorize } = require("../src/middlewares");
const {
  enforceParentReadOnly,
  verifyParentChildAccess,
} = require("../src/middlewares/parentPermission.middleware");
const {
  canManageGradeRecord,
  canViewGradeRecords,
} = require("../src/middlewares/gradeRecordPermission.middleware");
const {
  getLinkedChildren,
  getLinkedChildAcademicAndAttendance,
  getLinkedChildNotifications,
  linkParentWithChildren,
} = require("../src/controllers/parent.controller");
const {
  validateRow,
  generateTemplate,
  processImport,
} = require("../src/services/import.service");
const { generateAccessToken } = require("../src/utils/jwt");

jest.mock("../src/models/User");
jest.mock("../src/models/Class");
jest.mock("../src/models/GradeRecord");
jest.mock("../src/models/Notification");

/**
 * Helper tạo chainable Mongoose query mock (.populate().select().sort().lean())
 */
const createChainableQuery = (resolvedValue) => {
  const query = {
    populate: jest.fn(),
    select: jest.fn(),
    sort: jest.fn(),
    lean: jest.fn(),
  };
  query.populate.mockReturnValue(query);
  query.select.mockReturnValue(query);
  query.sort.mockReturnValue(query);
  query.lean.mockResolvedValue(resolvedValue);
  query.then = (resolve, reject) =>
    Promise.resolve(resolvedValue).then(resolve, reject);
  return query;
};

/**
 * Helper thực thi pipeline Express (protect -> enforceParentReadOnly -> authorize -> verifyParentChildAccess -> controller)
 */
const invokeParentPipeline = async ({
  token,
  method = "GET",
  allowedRoles = ["parent"],
  useParentVerify = true,
  controller,
  query = {},
  params = {},
  body = {},
}) => {
  const req = {
    method,
    headers: token ? { authorization: `Bearer ${token}` } : {},
    query,
    params,
    body,
  };

  let statusCode = 200;
  let jsonBody = null;

  const res = {
    status: jest.fn((code) => {
      statusCode = code;
      return res;
    }),
    json: jest.fn((payload) => {
      jsonBody = payload;
      return res;
    }),
  };

  const runMiddleware = async (mw) => {
    let nextCalled = false;
    let errCaptured = null;
    await mw(req, res, (err) => {
      if (err) errCaptured = err;
      else nextCalled = true;
    });
    return { nextCalled, errCaptured };
  };

  // 1. protect
  let step = await runMiddleware(protect);
  if (!step.nextCalled || jsonBody) {
    return { status: statusCode, body: jsonBody };
  }

  // 2. enforceParentReadOnly
  step = await runMiddleware(enforceParentReadOnly);
  if (!step.nextCalled || jsonBody) {
    return { status: statusCode, body: jsonBody };
  }

  // 3. authorize
  step = await runMiddleware(authorize(...allowedRoles));
  if (!step.nextCalled || jsonBody) {
    return { status: statusCode, body: jsonBody };
  }

  // 4. verifyParentChildAccess (nếu bật)
  if (useParentVerify) {
    step = await runMiddleware(verifyParentChildAccess);
    if (!step.nextCalled || jsonBody) {
      return { status: statusCode, body: jsonBody };
    }
  }

  // 5. controller
  if (controller) {
    await controller(req, res, () => {});
  }

  return { status: statusCode, body: jsonBody };
};

describe("Parent-Child Linking (childrenRefs), Excel Import, Linked Children APIs & Read-Only Enforcement Tests", () => {
  const adminId = new mongoose.Types.ObjectId().toString();
  const parentMultiChildrenId = new mongoose.Types.ObjectId().toString();
  const child1Id = new mongoose.Types.ObjectId().toString();
  const child2Id = new mongoose.Types.ObjectId().toString();
  const unlinkedStudentId = new mongoose.Types.ObjectId().toString();
  const class10A1Id = new mongoose.Types.ObjectId().toString();
  const class12B2Id = new mongoose.Types.ObjectId().toString();

  const adminToken = generateAccessToken({
    userId: adminId,
    role: "admin",
    email: "admin@edulms.edu.vn",
  });

  const parentToken = generateAccessToken({
    userId: parentMultiChildrenId,
    role: "parent",
    email: "parent_multi@edulms.edu.vn",
  });

  const student1Token = generateAccessToken({
    userId: child1Id,
    role: "student",
    email: "child1@edulms.edu.vn",
  });

  beforeEach(() => {
    jest.clearAllMocks();
    Class.find.mockReturnValue(createChainableQuery([]));
    Notification.find.mockReturnValue(createChainableQuery([]));
  });

  /* =========================================================================
     1. MỞ RỘNG IMPORT EXCEL & LƯU DANH SÁCH HỌC SINH VÀO childrenRefs
  ========================================================================= */
  describe("1. Mở rộng Import Excel hỗ trợ liên kết Phụ huynh – Học sinh & lưu childrenRefs", () => {
    it("validateRow đọc và tách đúng danh sách nhiều Mã Học Sinh Con ('HS001, HS002') khi import role = 'parent'", () => {
      const row = {
        "Họ và Tên": "Nguyễn Văn Phụ Huynh",
        "Mã Phụ Huynh": "PH100",
        "Email": "ph100@edulms.edu.vn",
        "Mã Học Sinh Con": "HS001, HS002; HS001", // Có trùng lặp để test deduplicate
        "Số điện thoại": "0901234567",
      };

      const result = validateRow(row, "parent");
      expect(result.isValid).toBe(true);
      expect(result.parsed.role).toBe("parent");
      expect(result.parsed.userCode).toBe("PH100");
      expect(result.parsed.childrenCodes).toEqual(["HS001", "HS002"]);
    });

    it("validateRow báo lỗi khi import Phụ huynh nhưng thiếu cột Mã Học Sinh Con", () => {
      const row = {
        "Họ và Tên": "Nguyễn Văn Phụ Huynh",
        "Mã Phụ Huynh": "PH101",
        "Email": "ph101@edulms.edu.vn",
        "Mã Học Sinh Con": "",
      };

      const result = validateRow(row, "parent");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Thiếu Mã Học Sinh Con để liên kết với tài khoản Phụ huynh"
      );
    });

    it("validateRow đọc được cột thông tin Phụ huynh đi kèm ngay trên dòng Import Học sinh", () => {
      const row = {
        "Họ và Tên": "Nguyễn Minh Anh",
        "Mã Học Sinh": "HS001",
        "Email": "minhanh@edulms.edu.vn",
        "Lớp": "10A1",
        "Họ tên Phụ huynh": "Nguyễn Văn Ba",
        "Mã Phụ huynh": "PH001",
        "Email Phụ huynh": "vanba@edulms.edu.vn",
        "Số điện thoại PH": "0912345678",
      };

      const result = validateRow(row, "student");
      expect(result.isValid).toBe(true);
      expect(result.parsed.parentInfo).toEqual({
        fullName: "Nguyễn Văn Ba",
        email: "vanba@edulms.edu.vn",
        userCode: "PH001",
        phone: "0912345678",
      });
    });

    it("generateTemplate tạo file Excel mẫu cho Phụ huynh và Học sinh có đầy đủ cột liên kết Phụ huynh - Học sinh", async () => {
      const parentBuf = await generateTemplate("parent");
      const wbParent = new ExcelJS.Workbook();
      await wbParent.xlsx.load(parentBuf);
      const sheetParent = wbParent.worksheets[0];
      expect(sheetParent.name).toBe("Danh sách phụ huynh");
      expect(sheetParent.getRow(1).values).toContain("Mã Phụ Huynh");
      expect(sheetParent.getRow(1).values).toContain("Mã Học Sinh Con");

      const studentBuf = await generateTemplate("student");
      const wbStudent = new ExcelJS.Workbook();
      await wbStudent.xlsx.load(studentBuf);
      const sheetStudent = wbStudent.worksheets[0];
      expect(sheetStudent.getRow(1).values).toContain("Họ tên Phụ huynh");
      expect(sheetStudent.getRow(1).values).toContain("Email Phụ huynh");
    });

    it("processImport (role = 'parent') ánh xạ nhiều mã học sinh sang ObjectId và lưu mảng childrenRefs cho một Phụ huynh có nhiều con", async () => {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Danh sách phụ huynh");
      sheet.addRow([
        "Họ và Tên",
        "Mã Phụ Huynh",
        "Email",
        "Mã Học Sinh Con",
        "Số điện thoại",
      ]);
      sheet.addRow([
        "Trần Văn Phụ Huynh (2 con)",
        "PH200",
        "ph200@edulms.edu.vn",
        "HS101, HS102",
        "0988777666",
      ]);
      const buffer = await workbook.xlsx.writeBuffer();

      // Lần gọi User.find thứ 1: kiểm tra trùng userCode/email của Phụ huynh -> rỗng
      // Lần gọi User.find thứ 2: tìm học sinh theo mã HS101, HS102 -> trả về 2 học sinh
      User.find
        .mockReturnValueOnce(createChainableQuery([]))
        .mockReturnValueOnce(
          createChainableQuery([
            {
              _id: new mongoose.Types.ObjectId(child1Id),
              userCode: "HS101",
              fullName: "Trần Bảo Ngọc",
              className: "10A1",
            },
            {
              _id: new mongoose.Types.ObjectId(child2Id),
              userCode: "HS102",
              fullName: "Trần Bảo Nam",
              className: "12B2",
            },
          ])
        );

      User.insertMany.mockResolvedValue([]);

      const result = await processImport(buffer, "parent");

      expect(result.successCount).toBe(1);
      expect(result.failCount).toBe(0);
      expect(result.createdAccounts[0].userCode).toBe("PH200");
      expect(result.createdAccounts[0].childrenCodes).toEqual(["HS101", "HS102"]);
      expect(
        result.createdAccounts[0].childrenRefs.map((id) => id.toString())
      ).toEqual([child1Id, child2Id]);

      expect(User.insertMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            userCode: "PH200",
            role: "parent",
            childrenRefs: [
              new mongoose.Types.ObjectId(child1Id),
              new mongoose.Types.ObjectId(child2Id),
            ],
          }),
        ]),
        { ordered: false }
      );
    });

    it("processImport (role = 'student') tự động gộp nhiều học sinh có cùng Email Phụ huynh vào chung 1 tài khoản Phụ huynh với childrenRefs chứa cả 2 học sinh", async () => {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Danh sách học sinh");
      sheet.addRow([
        "Họ và Tên",
        "Mã Học Sinh",
        "Email",
        "Lớp",
        "Họ tên Phụ huynh",
        "Mã Phụ huynh",
        "Email Phụ huynh",
      ]);
      sheet.addRow([
        "Con Thứ Nhất",
        "HS301",
        "hs301@edulms.edu.vn",
        "10A1",
        "Phụ Huynh Chung",
        "PH300",
        "ph300@edulms.edu.vn",
      ]);
      sheet.addRow([
        "Con Thứ Hai",
        "HS302",
        "hs302@edulms.edu.vn",
        "12B2",
        "Phụ Huynh Chung",
        "PH300",
        "ph300@edulms.edu.vn",
      ]);
      const buffer = await workbook.xlsx.writeBuffer();

      User.find.mockReturnValue(createChainableQuery([]));
      User.insertMany.mockResolvedValue([
        { _id: new mongoose.Types.ObjectId(child1Id), userCode: "HS301" },
        { _id: new mongoose.Types.ObjectId(child2Id), userCode: "HS302" },
      ]);
      User.findOne.mockResolvedValue(null);
      User.create = jest.fn().mockResolvedValue({
        _id: new mongoose.Types.ObjectId(parentMultiChildrenId),
        userCode: "PH300",
        role: "parent",
      });

      const result = await processImport(buffer, "student");

      expect(result.successCount).toBe(2);
      expect(result.linkedParents).toHaveLength(1);
      expect(result.linkedParents[0].userCode).toBe("PH300");
      expect(result.linkedParents[0].studentCodes).toEqual(["HS301", "HS302"]);
      expect(
        result.linkedParents[0].childrenRefs.map((id) => id.toString())
      ).toEqual([child1Id, child2Id]);
      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userCode: "PH300",
          role: "parent",
          childrenRefs: [
            new mongoose.Types.ObjectId(child1Id),
            new mongoose.Types.ObjectId(child2Id),
          ],
        })
      );
    });
  });

  /* =========================================================================
     2. KIỂM THỬ TRƯỜNG HỢP MỘT PARENT CÓ NHIỀU HỌC SINH (childrenRefs)
        & API TRUY VẤN DANH SÁCH CON, ĐIỂM SỐ, ĐIỂM DANH
  ========================================================================= */
  describe("2. Trường hợp một Parent có nhiều học sinh: API lấy danh sách con & API lấy điểm/điểm danh từng con", () => {
    beforeEach(() => {
      // Hồ sơ Phụ huynh có 2 học sinh trong childrenRefs: child1Id (lớp 10A1) và child2Id (lớp 12B2)
      User.findOne.mockImplementation((filter) => {
        if (filter && filter.role === "parent") {
          return createChainableQuery({
            _id: parentMultiChildrenId,
            fullName: "Ông Trần Văn Phụ Huynh",
            userCode: "PH200",
            email: "parent_multi@edulms.edu.vn",
            role: "parent",
            childrenRefs: [
              new mongoose.Types.ObjectId(child1Id),
              new mongoose.Types.ObjectId(child2Id),
            ],
          });
        }
        if (filter && filter._id?.toString() === child1Id) {
          return createChainableQuery({
            _id: child1Id,
            fullName: "Trần Bảo Ngọc (Con thứ 1)",
            userCode: "HS101",
            email: "ngoc@edulms.edu.vn",
            role: "student",
            className: "10A1",
            classRef: class10A1Id,
            attendanceRate: 98,
            absentCount: 1,
            excusedAbsentCount: 1,
            totalSessions: 45,
          });
        }
        if (filter && filter._id?.toString() === child2Id) {
          return createChainableQuery({
            _id: child2Id,
            fullName: "Trần Bảo Nam (Con thứ 2)",
            userCode: "HS102",
            email: "nam@edulms.edu.vn",
            role: "student",
            className: "12B2",
            classRef: class12B2Id,
            attendanceRate: 92,
            absentCount: 3,
            excusedAbsentCount: 2,
            totalSessions: 45,
          });
        }
        return createChainableQuery(null);
      });

      // Danh sách cả 2 người con khi gọi GET /api/v1/parent/children
      User.find.mockReturnValue(
        createChainableQuery([
          {
            _id: child1Id,
            fullName: "Trần Bảo Ngọc (Con thứ 1)",
            userCode: "HS101",
            email: "ngoc@edulms.edu.vn",
            className: "10A1",
            classRef: class10A1Id,
            attendanceRate: 98,
            absentCount: 1,
          },
          {
            _id: child2Id,
            fullName: "Trần Bảo Nam (Con thứ 2)",
            userCode: "HS102",
            email: "nam@edulms.edu.vn",
            className: "12B2",
            classRef: class12B2Id,
            attendanceRate: 92,
            absentCount: 3,
          },
        ])
      );

      Class.findOne.mockImplementation((filter) => {
        if (filter && filter._id?.toString() === class10A1Id) {
          return createChainableQuery({
            _id: class10A1Id,
            name: "10A1",
            room: "P.101",
            academicYear: "2025-2026",
            homeroomTeacher: {
              _id: "gvcn_1",
              fullName: "Cô Lê Thị Lan",
              email: "lan@edulms.edu.vn",
            },
          });
        }
        return createChainableQuery({
          _id: class12B2Id,
          name: "12B2",
          room: "P.302",
          academicYear: "2025-2026",
          homeroomTeacher: {
            _id: "gvcn_2",
            fullName: "Thầy Phạm Quốc Hùng",
            email: "hung@edulms.edu.vn",
          },
        });
      });

      // Điểm của từng học sinh:
      // - Con thứ 1 (child1Id): Toán 9.0
      // - Con thứ 2 (child2Id): Toán 7.5
      GradeRecord.find.mockImplementation((filter) => {
        const stId = filter?.student?.toString();
        if (stId === child1Id) {
          return createChainableQuery([
            {
              _id: "gr_c1_1",
              student: child1Id,
              semester: "HK1",
              gradeType: "midterm",
              value: 9.0,
              weight: 2,
              teachingAssignment: {
                _id: "ta_10a1_math",
                subject: { _id: "sub_math", name: "Toán học 10", code: "MATH10" },
                teacher: { fullName: "Cô Lê Thị Lan" },
              },
            },
          ]);
        }
        if (stId === child2Id) {
          return createChainableQuery([
            {
              _id: "gr_c2_1",
              student: child2Id,
              semester: "HK1",
              gradeType: "final",
              value: 7.5,
              weight: 3,
              teachingAssignment: {
                _id: "ta_12b2_math",
                subject: { _id: "sub_math12", name: "Toán học 12", code: "MATH12" },
                teacher: { fullName: "Thầy Phạm Quốc Hùng" },
              },
            },
          ]);
        }
        return createChainableQuery([]);
      });
    });

    it("GET /api/v1/parent/children trả về đầy đủ danh sách nhiều học sinh được liên kết trong childrenRefs kèm GPA và chuyên cần", async () => {
      const res = await invokeParentPipeline({
        token: parentToken,
        method: "GET",
        controller: getLinkedChildren,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalChildren).toBe(2);
      expect(res.body.data.children).toHaveLength(2);

      const [firstChild, secondChild] = res.body.data.children;
      expect(firstChild).toMatchObject({
        _id: child1Id,
        fullName: "Trần Bảo Ngọc (Con thứ 1)",
        userCode: "HS101",
        className: "10A1",
        currentGPA: 9.0,
        academicPerformance: "Xuất sắc",
        attendanceRate: 98,
        absentCount: 1,
      });

      expect(secondChild).toMatchObject({
        _id: child2Id,
        fullName: "Trần Bảo Nam (Con thứ 2)",
        userCode: "HS102",
        className: "12B2",
        currentGPA: 7.5,
        academicPerformance: "Khá",
        attendanceRate: 92,
        absentCount: 3,
      });
    });

    it("GET /api/v1/parent/children/:studentId trả về chính xác điểm số và điểm danh của từng người con trong childrenRefs", async () => {
      // Truy vấn con thứ 1 (child1Id)
      const resChild1 = await invokeParentPipeline({
        token: parentToken,
        method: "GET",
        params: { studentId: child1Id },
        controller: getLinkedChildAcademicAndAttendance,
      });

      expect(resChild1.status).toBe(200);
      expect(resChild1.body.data.student._id).toBe(child1Id);
      expect(resChild1.body.data.grades.currentGPA).toBe(9.0);
      expect(resChild1.body.data.attendance).toMatchObject({
        attendanceRate: 98,
        absentCount: 1,
        excusedAbsentCount: 1,
        unexcusedAbsentCount: 0,
      });

      // Truy vấn con thứ 2 (child2Id)
      const resChild2 = await invokeParentPipeline({
        token: parentToken,
        method: "GET",
        params: { studentId: child2Id },
        controller: getLinkedChildAcademicAndAttendance,
      });

      expect(resChild2.status).toBe(200);
      expect(resChild2.body.data.student._id).toBe(child2Id);
      expect(resChild2.body.data.grades.currentGPA).toBe(7.5);
      expect(resChild2.body.data.attendance).toMatchObject({
        attendanceRate: 92,
        absentCount: 3,
        excusedAbsentCount: 2,
        unexcusedAbsentCount: 1,
      });
    });

    it("trả về HTTP 403 khi Phụ huynh cố truy vấn điểm/điểm danh của một học sinh KHÔNG nằm trong childrenRefs", async () => {
      const res = await invokeParentPipeline({
        token: parentToken,
        method: "GET",
        params: { studentId: unlinkedStudentId },
        controller: getLinkedChildAcademicAndAttendance,
      });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(
        /không nằm trong danh sách con được liên kết \(childrenRefs\)/i
      );
    });

    it("GET /api/v1/parent/children/:studentId/notifications trả về đúng danh sách thông báo của từng người con và chặn 403 nếu ngoài childrenRefs", async () => {
      Notification.find.mockImplementation((filter) => {
        const recId = filter?.recipient?.toString();
        if (recId === child1Id) {
          return createChainableQuery([
            {
              _id: "notif_c1",
              recipient: child1Id,
              type: "assignment_graded",
              title: "Thông báo điểm Toán lớp 10A1",
              message: "Con đạt 9.0 điểm",
              isRead: false,
            },
          ]);
        }
        return createChainableQuery([
          {
            _id: "notif_c2",
            recipient: child2Id,
            type: "system",
            title: "Thông báo họp phụ huynh lớp 12B2",
            message: "Họp sáng Chủ nhật",
            isRead: true,
          },
        ]);
      });

      const resNotif1 = await invokeParentPipeline({
        token: parentToken,
        method: "GET",
        params: { studentId: child1Id },
        controller: getLinkedChildNotifications,
      });
      expect(resNotif1.status).toBe(200);
      expect(resNotif1.body.data.totalNotifications).toBe(1);
      expect(resNotif1.body.data.notifications[0].title).toBe(
        "Thông báo điểm Toán lớp 10A1"
      );

      const resNotif2 = await invokeParentPipeline({
        token: parentToken,
        method: "GET",
        params: { studentId: child2Id },
        controller: getLinkedChildNotifications,
      });
      expect(resNotif2.status).toBe(200);
      expect(resNotif2.body.data.notifications[0].title).toBe(
        "Thông báo họp phụ huynh lớp 12B2"
      );

      const resBlocked = await invokeParentPipeline({
        token: parentToken,
        method: "GET",
        params: { studentId: unlinkedStudentId },
        controller: getLinkedChildNotifications,
      });
      expect(resBlocked.status).toBe(403);
    });

    it("canViewGradeRecords cho phép Phụ huynh xem điểm của con trong childrenRefs nhưng trả về 403 nếu xem học sinh ngoài childrenRefs", async () => {
      // Hợp lệ: xem child2Id nằm trong childrenRefs
      const reqAllowed = {
        user: { userId: parentMultiChildrenId, role: "parent" },
        params: {},
        query: { studentId: child2Id },
        body: {},
      };
      const resAllowed = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const nextAllowed = jest.fn();

      await canViewGradeRecords(reqAllowed, resAllowed, nextAllowed);
      expect(nextAllowed).toHaveBeenCalledTimes(1);
      expect(reqAllowed.authorizedChildrenIds).toEqual([child1Id, child2Id]);

      // Trái phép: xem unlinkedStudentId ngoài childrenRefs -> 403
      const reqBlocked = {
        user: { userId: parentMultiChildrenId, role: "parent" },
        params: {},
        query: { studentId: unlinkedStudentId },
        body: {},
      };
      const resBlocked = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const nextBlocked = jest.fn();

      await canViewGradeRecords(reqBlocked, resBlocked, nextBlocked);
      expect(resBlocked.status).toHaveBeenCalledWith(403);
      expect(nextBlocked).not.toHaveBeenCalled();
    });

    it("Admin có thể liên kết hoặc bổ sung nhiều học sinh vào childrenRefs của Phụ huynh qua linkParentWithChildren", async () => {
      const mockParentDoc = {
        _id: new mongoose.Types.ObjectId(parentMultiChildrenId),
        fullName: "Ông Trần Văn Phụ Huynh",
        userCode: "PH200",
        role: "parent",
        childrenRefs: [new mongoose.Types.ObjectId(child1Id)],
        save: jest.fn().mockResolvedValue(true),
      };

      User.findOne.mockResolvedValue(mockParentDoc);
      User.find.mockReturnValue(
        createChainableQuery([
          { _id: child1Id, fullName: "Con 1", userCode: "HS101" },
          { _id: child2Id, fullName: "Con 2", userCode: "HS102" },
        ])
      );

      const res = await invokeParentPipeline({
        token: adminToken,
        method: "PUT",
        allowedRoles: ["admin"],
        useParentVerify: false,
        params: { parentId: parentMultiChildrenId },
        body: { studentIds: [child1Id, child2Id], mode: "append" },
        controller: linkParentWithChildren,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.childrenRefs).toEqual([child1Id, child2Id]);
      expect(mockParentDoc.save).toHaveBeenCalledTimes(1);
    });
  });

  /* =========================================================================
     3. MIDDLEWARE GIỚI HẠN QUYỀN GHI ĐỐI VỚI PARENT (CHỈ CHO PHÉP ĐỌC DỮ LIỆU)
  ========================================================================= */
  describe("3. Middleware enforceParentReadOnly: Từ chối mọi request ghi dữ liệu từ role = 'parent'", () => {
    it.each(["POST", "PUT", "PATCH", "DELETE"])(
      "từ chối request %s từ tài khoản Phụ huynh (role = 'parent') với HTTP 403",
      async (httpMethod) => {
        const res = await invokeParentPipeline({
          token: parentToken,
          method: httpMethod,
          controller: getLinkedChildren,
        });

        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(
          /chỉ có quyền xem dữ liệu \(Read-only\), không được phép thêm, sửa hoặc xóa/i
        );
      }
    );

    it("canManageGradeRecord từ chối Phụ huynh thêm hoặc sửa điểm với HTTP 403", async () => {
      const req = {
        user: { userId: parentMultiChildrenId, role: "parent" },
        body: { teachingAssignment: new mongoose.Types.ObjectId().toString() },
        params: {},
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const next = jest.fn();

      await canManageGradeRecord(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it("từ chối Học sinh truy cập vào API cổng Phụ huynh (/api/v1/parent/children) với HTTP 403", async () => {
      const res = await invokeParentPipeline({
        token: student1Token,
        method: "GET",
        controller: getLinkedChildren,
      });

      expect(res.status).toBe(403);
    });
  });
});

