const mongoose = require("mongoose");
const Notification = require("../src/models/Notification");
const User = require("../src/models/User");
const TeachingAssignment = require("../src/models/TeachingAssignment");
const Assignment = require("../src/models/Assignment");
const GradeRecord = require("../src/models/GradeRecord");
const notificationController = require("../src/controllers/notification.controller");
const assignmentService = require("../src/services/assignment.service");
const submissionService = require("../src/services/submission.service");
const gradebookService = require("../src/services/gradebook.service");
const { protect, authorize } = require("../src/middlewares");
const { generateAccessToken } = require("../src/utils/jwt");

/**
 * Helper tạo chainable Mongoose query mock (.sort().populate().select().lean())
 */
const createMockQuery = (resolvedValue) => {
  const query = {
    sort: jest.fn(),
    populate: jest.fn(),
    select: jest.fn(),
    lean: jest.fn(),
  };
  query.sort.mockReturnValue(query);
  query.populate.mockReturnValue(query);
  query.select.mockReturnValue(query);
  query.lean.mockResolvedValue(resolvedValue);
  query.then = (resolve, reject) =>
    Promise.resolve(resolvedValue).then(resolve, reject);
  return query;
};

/**
 * Helper thực thi pipeline Express (protect -> [authorize] -> controller)
 */
const invokeNotificationPipeline = async ({
  token,
  allowedRoles = null,
  controller,
  params = {},
  query = {},
  body = {},
}) => {
  const req = {
    headers: token ? { authorization: `Bearer ${token}` } : {},
    params,
    query,
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

  let nextCalled = false;
  await protect(req, res, () => {
    nextCalled = true;
  });

  if (!nextCalled || jsonBody) {
    return { status: statusCode, body: jsonBody };
  }

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    nextCalled = false;
    const rbacMw = authorize(...allowedRoles);
    rbacMw(req, res, () => {
      nextCalled = true;
    });
    if (!nextCalled || jsonBody) {
      return { status: statusCode, body: jsonBody };
    }
  }

  await controller(req, res, () => {});
  return { status: statusCode, body: jsonBody };
};

describe("In-App Notification System (Model, APIs, Triggers & Authorization Tests)", () => {
  const teacherId = new mongoose.Types.ObjectId().toString();
  const student1Id = new mongoose.Types.ObjectId().toString();
  const student2Id = new mongoose.Types.ObjectId().toString();
  const class10A1Id = new mongoose.Types.ObjectId().toString();
  const taMath10A1Id = new mongoose.Types.ObjectId().toString();
  const assignmentId = new mongoose.Types.ObjectId().toString();
  const submissionId = new mongoose.Types.ObjectId().toString();
  const gradeRecordId = new mongoose.Types.ObjectId().toString();
  const notif1Id = new mongoose.Types.ObjectId().toString();

  const teacherToken = generateAccessToken({
    userId: teacherId,
    role: "teacher",
    email: "teacher@edulms.edu.vn",
  });

  const student1Token = generateAccessToken({
    userId: student1Id,
    role: "student",
    email: "student1@edulms.edu.vn",
  });

  const student2Token = generateAccessToken({
    userId: student2Id,
    role: "student",
    email: "student2@edulms.edu.vn",
  });

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  /* =========================================================================
     1. THIẾT KẾ MODEL NOTIFICATION (recipient, type, content, isRead, link, createdAt)
  ========================================================================= */
  describe("1. Model Notification Schema Validation", () => {
    it("khởi tạo hợp lệ với đầy đủ các trường: recipient, type, content, isRead, link, createdAt", async () => {
      const doc = new Notification({
        recipient: new mongoose.Types.ObjectId(student1Id),
        type: "assignment_created",
        content: "Giáo viên vừa giao bài tập mới môn Toán học 10.",
        isRead: false,
        link: `/student/assignments?assignmentId=${assignmentId}`,
      });

      await expect(doc.validate()).resolves.toBeUndefined();
      expect(doc.recipient.toString()).toBe(student1Id);
      expect(doc.type).toBe("assignment_created");
      expect(doc.content).toBe("Giáo viên vừa giao bài tập mới môn Toán học 10.");
      expect(doc.message).toBe("Giáo viên vừa giao bài tập mới môn Toán học 10.");
      expect(doc.isRead).toBe(false);
      expect(doc.link).toBe(`/student/assignments?assignmentId=${assignmentId}`);
    });

    it("bắt buộc phải có recipient và content, đồng thời kiểm tra enum của type", async () => {
      const emptyDoc = new Notification({ type: "invalid_type_xyz" });
      let err;
      try {
        await emptyDoc.validate();
      } catch (e) {
        err = e;
      }

      expect(err).toBeDefined();
      expect(err.errors.recipient).toBeDefined();
      expect(err.errors.content).toBeDefined();
      expect(err.errors.type).toBeDefined();
    });
  });

  /* =========================================================================
     2. API TẠO THÔNG BÁO, LẤY DANH SÁCH & ĐÁNH DẤU ĐÃ ĐỌC
  ========================================================================= */
  describe("2. API Tạo thông báo, Lấy danh sách thông báo & Đánh dấu đã đọc", () => {
    it("POST /api/v1/notifications cho phép Giáo viên/Admin tạo thông báo mới cho người nhận", async () => {
      jest
        .spyOn(Notification.prototype, "save")
        .mockImplementation(function () {
          return Promise.resolve(this);
        });

      const res = await invokeNotificationPipeline({
        token: teacherToken,
        allowedRoles: ["teacher", "admin"],
        controller: notificationController.createNotification,
        body: {
          recipient: student1Id,
          type: "assignment_created",
          content: "Nhắc nhở nộp bài tập Đại số trước 23:59 tối nay",
          link: "/student/assignments",
        },
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.recipient.toString()).toBe(student1Id);
      expect(res.body.data.type).toBe("assignment_created");
      expect(res.body.data.content).toBe(
        "Nhắc nhở nộp bài tập Đại số trước 23:59 tối nay"
      );
      expect(res.body.data.link).toBe("/student/assignments");
      expect(res.body.data.isRead).toBe(false);
    });

    it("GET /api/v1/notifications trả về danh sách thông báo của người dùng hiện tại kèm số lượng chưa đọc (unreadCount)", async () => {
      const mockNotifs = [
        {
          _id: notif1Id,
          recipient: student1Id,
          type: "grade_created",
          content: "Điểm giữa kỳ môn Toán (HK1) của bạn vừa có điểm mới: 9/10 điểm.",
          link: "/student/grades?semester=HK1",
          isRead: false,
          createdAt: new Date("2026-11-26T10:00:00.000Z"),
        },
      ];

      jest.spyOn(Notification, "find").mockReturnValue(createMockQuery(mockNotifs));
      jest.spyOn(Notification, "countDocuments").mockResolvedValue(1);

      const res = await invokeNotificationPipeline({
        token: student1Token,
        controller: notificationController.getMyNotifications,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.notifications).toHaveLength(1);
      expect(res.body.data.unreadCount).toBe(1);
      expect(res.body.data.notifications[0].content).toMatch(/9\/10 điểm/i);
    });

    it("PATCH /api/v1/notifications/:id/read đánh dấu một thông báo thuộc tài khoản hiện tại là đã đọc (isRead = true)", async () => {
      const mockDoc = {
        _id: notif1Id,
        recipient: new mongoose.Types.ObjectId(student1Id),
        type: "assignment_created",
        content: "Bài tập mới",
        isRead: false,
        readAt: null,
        save: jest.fn().mockImplementation(function () {
          return Promise.resolve(this);
        }),
      };

      jest.spyOn(Notification, "findOne").mockResolvedValue(mockDoc);

      const res = await invokeNotificationPipeline({
        token: student1Token,
        controller: notificationController.markNotificationAsRead,
        params: { id: notif1Id },
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockDoc.isRead).toBe(true);
      expect(mockDoc.readAt).toBeInstanceOf(Date);
      expect(mockDoc.save).toHaveBeenCalledTimes(1);
    });

    it("PATCH /api/v1/notifications/read-all đánh dấu tất cả thông báo của người dùng hiện tại là đã đọc", async () => {
      const updateManySpy = jest
        .spyOn(Notification, "updateMany")
        .mockResolvedValue({ modifiedCount: 3 });

      const res = await invokeNotificationPipeline({
        token: student1Token,
        controller: notificationController.markAllNotificationsAsRead,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(updateManySpy).toHaveBeenCalledWith(
        { recipient: student1Id, isRead: false, isDeleted: false },
        expect.objectContaining({
          $set: expect.objectContaining({ isRead: true }),
        })
      );
    });
  });

  /* =========================================================================
     3. TỰ ĐỘNG TẠO THÔNG BÁO (TRIGGER TỪ MODULE BÀI TẬP & ĐIỂM)
  ========================================================================= */
  describe("3. Tích hợp Trigger tự động tạo thông báo từ module Bài tập và Điểm", () => {
    it("Trigger 1: Tự động tạo thông báo (type = 'assignment_created') cho học sinh trong lớp khi Giáo viên giao bài tập mới", async () => {
      jest.spyOn(TeachingAssignment, "findOne").mockResolvedValue({
        _id: taMath10A1Id,
        class: { _id: class10A1Id, name: "10A1" },
        subject: { _id: "sub_math", name: "Toán học 10" },
        teacher: teacherId,
        isDeleted: false,
      });

      jest.spyOn(Assignment.prototype, "save").mockImplementation(function () {
        this._id = new mongoose.Types.ObjectId(assignmentId);
        return Promise.resolve(this);
      });

      // Lớp 10A1 có 2 học sinh: student1Id và student2Id
      jest.spyOn(User, "find").mockReturnValue(
        createMockQuery([{ _id: student1Id }, { _id: student2Id }])
      );

      const savedNotifications = [];
      jest
        .spyOn(Notification.prototype, "save")
        .mockImplementation(function () {
          savedNotifications.push(this);
          return Promise.resolve(this);
        });

      await assignmentService.createAssignment(
        {
          teachingAssignment: taMath10A1Id,
          title: "Bài tập Phương trình lượng giác",
          description: "Làm bài 1 đến bài 5 trang 32",
          dueDate: "2026-12-20T23:59:00.000Z",
        },
        {
          user: { userId: teacherId, role: "teacher" },
        }
      );

      expect(savedNotifications).toHaveLength(2);
      expect(savedNotifications[0].recipient.toString()).toBe(student1Id);
      expect(savedNotifications[1].recipient.toString()).toBe(student2Id);
      expect(savedNotifications[0].type).toBe("assignment_created");
      expect(savedNotifications[0].content).toMatch(
        /Bài tập Phương trình lượng giác/i
      );
      expect(savedNotifications[0].link).toBe(
        `/student/assignments?assignmentId=${assignmentId}`
      );
    });

    it("Trigger 2A: Tự động tạo thông báo (type = 'grade_created' & 'grade_updated') khi Giáo viên nhập điểm mới hoặc cập nhật điểm trong Sổ điểm", async () => {
      const mockTaDoc = {
        _id: taMath10A1Id,
        class: class10A1Id,
        subject: { name: "Toán học 10" },
        teacher: teacherId,
        isDeleted: false,
      };

      jest.spyOn(User, "findOne").mockResolvedValue({
        _id: student1Id,
        role: "student",
        classRef: class10A1Id,
      });

      jest.spyOn(GradeRecord.prototype, "save").mockImplementation(function () {
        this._id = new mongoose.Types.ObjectId(gradeRecordId);
        return Promise.resolve(this);
      });

      const savedNotifications = [];
      jest
        .spyOn(Notification.prototype, "save")
        .mockImplementation(function () {
          savedNotifications.push(this);
          return Promise.resolve(this);
        });

      // 1. Nhập điểm mới -> tạo thông báo type = 'grade_created'
      await gradebookService.createGradeRecord(
        {
          student: student1Id,
          teachingAssignment: taMath10A1Id,
          semester: "HK1",
          gradeType: "midterm",
          value: 8.5,
        },
        {
          user: { userId: teacherId, role: "teacher" },
          targetTeachingAssignment: mockTaDoc,
        }
      );

      expect(savedNotifications).toHaveLength(1);
      expect(savedNotifications[0].recipient.toString()).toBe(student1Id);
      expect(savedNotifications[0].type).toBe("grade_created");
      expect(savedNotifications[0].content).toMatch(/8\.5\/10 điểm/i);
      expect(savedNotifications[0].link).toBe("/student/grades?semester=HK1");

      // 2. Cập nhật điểm -> tạo thông báo type = 'grade_updated'
      const existingGradeDoc = {
        _id: gradeRecordId,
        student: student1Id,
        teachingAssignment: taMath10A1Id,
        semester: "HK1",
        gradeType: "midterm",
        value: 8.5,
        weight: 2,
        save: jest.fn().mockImplementation(function () {
          return Promise.resolve(this);
        }),
      };

      await gradebookService.updateGradeRecord(
        gradeRecordId,
        { value: 9.2 },
        {
          user: { userId: teacherId, role: "teacher" },
          targetGradeRecord: existingGradeDoc,
          targetTeachingAssignment: mockTaDoc,
        }
      );

      expect(savedNotifications).toHaveLength(2);
      expect(savedNotifications[1].type).toBe("grade_updated");
      expect(savedNotifications[1].content).toMatch(/vừa được cập nhật: 9\.2\/10 điểm/i);
    });

    it("Trigger 2B: Tự động tạo thông báo (type = 'assignment_graded') khi Giáo viên chấm điểm bài nộp của học sinh", async () => {
      const mockSubmissionDoc = {
        _id: submissionId,
        assignment: assignmentId,
        student: student1Id,
        score: null,
        feedback: "",
        save: jest.fn().mockImplementation(function () {
          return Promise.resolve(this);
        }),
      };

      const savedNotifications = [];
      jest
        .spyOn(Notification.prototype, "save")
        .mockImplementation(function () {
          savedNotifications.push(this);
          return Promise.resolve(this);
        });

      await submissionService.gradeSubmission(
        submissionId,
        { score: 9.5, feedback: "Bài giải chính xác và rõ ràng" },
        {
          user: { userId: teacherId, role: "teacher" },
          targetSubmissionDoc: mockSubmissionDoc,
          targetAssignmentDoc: {
            _id: assignmentId,
            title: "Bài tập Hình học không gian",
          },
        }
      );

      expect(savedNotifications).toHaveLength(1);
      expect(savedNotifications[0].recipient.toString()).toBe(student1Id);
      expect(savedNotifications[0].type).toBe("assignment_graded");
      expect(savedNotifications[0].content).toMatch(/9\.5\/10 điểm/i);
      expect(savedNotifications[0].link).toBe(
        `/student/assignments?assignmentId=${assignmentId}`
      );
    });
  });

  /* =========================================================================
     4. KIỂM TRA PHÂN QUYỀN TRUY CẬP THÔNG BÁO (CHỈ TRUY CẬP TÀI KHOẢN CỦA MÌNH)
  ========================================================================= */
  describe("4. Kiểm tra phân quyền truy cập: Người dùng chỉ được truy cập thông báo thuộc tài khoản của mình", () => {
    it("từ chối HTTP 403 khi người dùng A cố đánh dấu đã đọc thông báo của người dùng B", async () => {
      // Thông báo thuộc về student1Id
      jest.spyOn(Notification, "findOne").mockResolvedValue({
        _id: notif1Id,
        recipient: new mongoose.Types.ObjectId(student1Id),
        content: "Thông báo riêng của Học sinh 1",
        isRead: false,
        isDeleted: false,
      });

      // student2Token cố gọi PATCH /api/v1/notifications/:id/read trên thông báo của student1
      const res = await invokeNotificationPipeline({
        token: student2Token,
        controller: notificationController.markNotificationAsRead,
        params: { id: notif1Id },
      });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/không có quyền/i);
    });

    it("từ chối HTTP 403 khi người dùng cố truy vấn danh sách thông báo của tài khoản khác qua query recipient/userId", async () => {
      const res = await invokeNotificationPipeline({
        token: student2Token,
        controller: notificationController.getMyNotifications,
        query: { recipient: student1Id },
      });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(
        /chỉ được phép truy cập danh sách thông báo thuộc tài khoản của chính mình/i
      );
    });

    it("từ chối HTTP 403 khi Học sinh cố gọi API POST /api/v1/notifications để tạo thông báo giả mạo", async () => {
      const res = await invokeNotificationPipeline({
        token: student1Token,
        allowedRoles: ["teacher", "admin"],
        controller: notificationController.createNotification,
        body: {
          recipient: student2Id,
          type: "general",
          content: "Thông báo giả mạo",
        },
      });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });
});
