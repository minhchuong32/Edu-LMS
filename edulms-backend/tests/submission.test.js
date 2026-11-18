const mongoose = require("mongoose");
const Submission = require("../src/models/Submission");
const Assignment = require("../src/models/Assignment");
const TeachingAssignment = require("../src/models/TeachingAssignment");
const User = require("../src/models/User");
const Class = require("../src/models/Class");
const Notification = require("../src/models/Notification");
const {
  canSubmitAssignment,
  canViewSubmissionsByAssignment,
  canGradeSubmission,
  canViewSubmissionDetail,
} = require("../src/middlewares/submissionPermission.middleware");
const submissionService = require("../src/services/submission.service");
const {
  submitAssignment,
  getSubmissionsByAssignment,
  getMySubmission,
  getSubmissionById,
  gradeSubmission,
  updateSubmissionScore,
  updateSubmissionFeedback,
} = require("../src/controllers/submission.controller");

// Helper tạo mock Mongoose query chain có thể await
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

/* ============================================================================
   1. KIỂM THỬ SCHEMA MODEL SUBMISSION & TỰ ĐỘNG TÍNH TRỄ HẠN (isLate)
============================================================================ */
describe("Submission Model Schema Validation & Late Calculation Tests", () => {
  const dummyAssignmentId = new mongoose.Types.ObjectId();
  const dummyStudentId = new mongoose.Types.ObjectId();

  it("khởi tạo hợp lệ với đầy đủ các trường: assignment, student, fileUrl, submittedAt, isLate, score, feedback", async () => {
    const doc = new Submission({
      assignment: dummyAssignmentId,
      student: dummyStudentId,
      fileUrl: "https://res.cloudinary.com/demo/raw/upload/v1/bai-lam-hs.pdf",
      submittedAt: new Date("2026-11-20T10:00:00.000Z"),
      isLate: false,
      score: 9.5,
      feedback: "Bài làm trình bày rõ ràng, chính xác",
    });

    await expect(doc.validate()).resolves.toBeUndefined();
    expect(doc.fileUrl).toBe(
      "https://res.cloudinary.com/demo/raw/upload/v1/bai-lam-hs.pdf"
    );
    expect(doc.isLate).toBe(false);
    expect(doc.score).toBe(9.5);
    expect(doc.feedback).toBe("Bài làm trình bày rõ ràng, chính xác");
  });

  it("bắt buộc phải có assignment, student và fileUrl", async () => {
    const emptyDoc = new Submission({});

    let err;
    try {
      await emptyDoc.validate();
    } catch (e) {
      err = e;
    }

    expect(err).toBeDefined();
    expect(err.errors.assignment.message).toMatch(/Bài tập.*là bắt buộc/i);
    expect(err.errors.student.message).toMatch(/Học sinh.*là bắt buộc/i);
    expect(err.errors.fileUrl.message).toMatch(
      /Đường dẫn tệp bài nộp.*là bắt buộc/i
    );
  });

  it("kiểm tra giới hạn điểm số score từ 0 đến 10", async () => {
    const invalidScoreDoc = new Submission({
      assignment: dummyAssignmentId,
      student: dummyStudentId,
      fileUrl: "https://res.cloudinary.com/demo/raw/upload/v1/bai-lam.pdf",
      score: 12,
    });

    await expect(invalidScoreDoc.validate()).rejects.toThrow(
      /Điểm số không được lớn hơn 10/i
    );
  });

  it("tự động tính trạng thái trễ hạn (isLate) chính xác dựa trên submittedAt và dueDate", () => {
    const dueDate = new Date("2026-11-25T23:59:59.000Z");

    // Nộp trước hạn -> isLate = false
    const onTimeSubmit = new Date("2026-11-25T20:00:00.000Z");
    expect(submissionService.calculateIsLate(onTimeSubmit, dueDate)).toBe(false);

    // Nộp đúng thời điểm hạn nộp -> isLate = false
    expect(submissionService.calculateIsLate(dueDate, dueDate)).toBe(false);

    // Nộp sau hạn 1 giây -> isLate = true
    const lateSubmit = new Date("2026-11-26T00:00:00.000Z");
    expect(submissionService.calculateIsLate(lateSubmit, dueDate)).toBe(true);
  });
});

/* ============================================================================
   2. KIỂM THỬ MIDDLEWARE QUYỀN HỌC SINH, CHẶN NỘP KHI LOCKED & QUYỀN XEM BÀI NỘP
============================================================================ */
describe("Submission Permission Middleware Tests", () => {
  let req, res, next;
  const studentId = new mongoose.Types.ObjectId().toString();
  const teacherId = new mongoose.Types.ObjectId().toString();
  const otherTeacherId = new mongoose.Types.ObjectId().toString();
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

  it("canSubmitAssignment chặn khi bài tập đã ở trạng thái 'locked' (403)", async () => {
    req.user = { userId: studentId, role: "student" };
    req.body = {
      assignment: assignmentId,
      fileUrl: "https://res.cloudinary.com/demo/raw/upload/v1/bai.pdf",
    };

    jest.spyOn(Assignment, "findOne").mockResolvedValue({
      _id: assignmentId,
      teachingAssignment: teachingAssignmentId,
      status: "locked",
      isActive: true,
      isDeleted: false,
    });

    await canSubmitAssignment(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringMatching(/đã bị khóa nhận bài/i),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("canSubmitAssignment chặn học sinh lớp A nộp bài vào bài tập của lớp B (403 IDOR)", async () => {
    req.user = { userId: studentId, role: "student" };
    req.body = {
      assignment: assignmentId,
      fileUrl: "https://res.cloudinary.com/demo/raw/upload/v1/bai.pdf",
    };

    jest.spyOn(Assignment, "findOne").mockResolvedValue({
      _id: assignmentId,
      teachingAssignment: teachingAssignmentId,
      status: "open",
      isActive: true,
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

    // TeachingAssignment thuộc về classBId
    jest.spyOn(TeachingAssignment, "findOne").mockResolvedValue({
      _id: teachingAssignmentId,
      class: classBId,
      teacher: teacherId,
      isDeleted: false,
    });

    await canSubmitAssignment(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringMatching(/không thuộc lớp học của bài tập này/i),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("canSubmitAssignment cho phép học sinh đúng lớp nộp bài khi bài tập đang 'open'", async () => {
    req.user = { userId: studentId, role: "student" };
    req.body = {
      assignment: assignmentId,
      fileUrl: "https://res.cloudinary.com/demo/raw/upload/v1/bai.pdf",
    };

    jest.spyOn(Assignment, "findOne").mockResolvedValue({
      _id: assignmentId,
      teachingAssignment: teachingAssignmentId,
      status: "open",
      isActive: true,
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

    jest.spyOn(TeachingAssignment, "findOne").mockResolvedValue({
      _id: teachingAssignmentId,
      class: classAId,
      teacher: teacherId,
      isDeleted: false,
    });

    await canSubmitAssignment(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("canViewSubmissionsByAssignment chặn giáo viên không phụ trách xem danh sách bài nộp (403)", async () => {
    req.user = { userId: otherTeacherId, role: "teacher" };
    req.params = { assignmentId };

    jest.spyOn(Assignment, "findOne").mockResolvedValue({
      _id: assignmentId,
      teachingAssignment: teachingAssignmentId,
      isDeleted: false,
    });

    jest.spyOn(TeachingAssignment, "findOne").mockResolvedValue({
      _id: teachingAssignmentId,
      teacher: teacherId,
      isDeleted: false,
    });

    await canViewSubmissionsByAssignment(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});

/* ============================================================================
   3. KIỂM THỬ CONTROLLER & SERVICE NỘP BÀI, TÍNH isLate VÀ LẤY DANH SÁCH BÀI NỘP
============================================================================ */
describe("Submission Controller & Service Unit Tests", () => {
  let req, res, next;
  const studentId = new mongoose.Types.ObjectId().toString();
  const teacherId = new mongoose.Types.ObjectId().toString();
  const classAId = new mongoose.Types.ObjectId().toString();
  const teachingAssignmentId = new mongoose.Types.ObjectId().toString();
  const assignmentId = new mongoose.Types.ObjectId().toString();
  const submissionId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    jest.restoreAllMocks();
    req = {
      user: { userId: studentId, role: "student" },
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

  it("submitAssignment nộp bài ĐÚNG HẠN (submittedAt <= dueDate) -> tự động gán isLate = false", async () => {
    const dueDate = new Date("2026-12-20T23:59:00.000Z");
    const submittedAt = new Date("2026-12-19T14:30:00.000Z");

    req.targetAssignmentDoc = {
      _id: assignmentId,
      teachingAssignment: teachingAssignmentId,
      dueDate,
      status: "open",
      isActive: true,
    };
    req.studentClass = { _id: classAId };
    req.body = {
      assignment: assignmentId,
      fileUrl: "https://res.cloudinary.com/demo/raw/upload/v1/bai-nop-dung-han.pdf",
      submittedAt: submittedAt.toISOString(),
    };

    jest.spyOn(Submission, "findOne").mockResolvedValue(null);
    jest.spyOn(Submission.prototype, "save").mockImplementation(function () {
      return Promise.resolve(this);
    });

    await submitAssignment(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    const responsePayload = res.json.mock.calls[0][0];
    expect(responsePayload.success).toBe(true);
    expect(responsePayload.data.isLate).toBe(false);
    expect(responsePayload.message).toMatch(/Đúng hạn/i);
  });

  it("submitAssignment nộp bài TRỄ HẠN (submittedAt > dueDate) -> tự động gán isLate = true", async () => {
    const dueDate = new Date("2026-12-20T23:59:00.000Z");
    const submittedAt = new Date("2026-12-21T08:15:00.000Z");

    req.targetAssignmentDoc = {
      _id: assignmentId,
      teachingAssignment: teachingAssignmentId,
      dueDate,
      status: "open",
      isActive: true,
    };
    req.studentClass = { _id: classAId };
    req.body = {
      assignment: assignmentId,
      fileUrl: "https://res.cloudinary.com/demo/raw/upload/v1/bai-nop-tre-han.pdf",
      submittedAt: submittedAt.toISOString(),
    };

    jest.spyOn(Submission, "findOne").mockResolvedValue(null);
    jest.spyOn(Submission.prototype, "save").mockImplementation(function () {
      return Promise.resolve(this);
    });

    await submitAssignment(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    const responsePayload = res.json.mock.calls[0][0];
    expect(responsePayload.success).toBe(true);
    expect(responsePayload.data.isLate).toBe(true);
    expect(responsePayload.message).toMatch(/Nộp trễ hạn/i);
  });

  it("submitAssignment từ chối nộp bài khi Assignment ở trạng thái 'locked' (403)", async () => {
    req.targetAssignmentDoc = {
      _id: assignmentId,
      teachingAssignment: teachingAssignmentId,
      dueDate: new Date("2026-12-20T23:59:00.000Z"),
      status: "locked",
      isActive: true,
    };
    req.studentClass = { _id: classAId };
    req.body = {
      assignment: assignmentId,
      fileUrl: "https://res.cloudinary.com/demo/raw/upload/v1/bai-nop.pdf",
    };

    await submitAssignment(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringMatching(/đã bị khóa nhận bài/i),
      })
    );
  });

  it("getSubmissionsByAssignment trả về danh sách bài nộp của bài tập cho giáo viên phụ trách", async () => {
    req.user = { userId: teacherId, role: "teacher" };
    req.params = { assignmentId };
    req.targetAssignmentDoc = {
      _id: assignmentId,
      teachingAssignment: teachingAssignmentId,
    };

    const mockSubmissions = [
      {
        _id: submissionId,
        assignment: assignmentId,
        student: { _id: studentId, fullName: "Nguyễn Văn Học Sinh" },
        fileUrl: "https://res.cloudinary.com/demo/raw/upload/v1/bai-1.pdf",
        isLate: false,
      },
    ];

    jest
      .spyOn(Submission, "find")
      .mockReturnValue(createMockQuery(mockSubmissions));

    await getSubmissionsByAssignment(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: mockSubmissions,
      })
    );
  });

  it("getMySubmission trả về bài nộp của học sinh hiện tại", async () => {
    req.params = { assignmentId };

    const mockMySub = {
      _id: submissionId,
      assignment: assignmentId,
      student: studentId,
      fileUrl: "https://res.cloudinary.com/demo/raw/upload/v1/my-sub.pdf",
      isLate: false,
    };

    jest
      .spyOn(Submission, "findOne")
      .mockReturnValue(createMockQuery(mockMySub));

    await getMySubmission(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: mockMySub,
      })
    );
  });

  it("gradeSubmission cho phép giáo viên phụ trách chấm điểm, lưu nhận xét và tự động tạo thông báo cho học sinh", async () => {
    req.user = { userId: teacherId, role: "teacher" };
    req.params = { id: submissionId };
    req.body = { score: 8.5, feedback: "Làm tốt, cần trình bày kỹ hơn câu 3" };

    const mockSubDoc = {
      _id: submissionId,
      assignment: assignmentId,
      student: studentId,
      score: null,
      feedback: "",
      save: jest.fn().mockImplementation(function () {
        return Promise.resolve(this);
      }),
    };
    req.targetSubmissionDoc = mockSubDoc;
    req.targetAssignmentDoc = {
      _id: assignmentId,
      title: "Bài tập chương 1",
    };

    const notifySaveSpy = jest
      .spyOn(Notification.prototype, "save")
      .mockImplementation(function () {
        return Promise.resolve(this);
      });

    await gradeSubmission(req, res, next);

    expect(mockSubDoc.score).toBe(8.5);
    expect(mockSubDoc.feedback).toBe("Làm tốt, cần trình bày kỹ hơn câu 3");
    expect(notifySaveSpy).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("updateSubmissionScore kiểm tra điểm nằm trong khoảng hợp lệ (0 - 10), từ chối điểm < 0 hoặc > 10 (400)", async () => {
    req.user = { userId: teacherId, role: "teacher" };
    req.params = { id: submissionId };
    req.body = { score: 11.5 };

    await updateSubmissionScore(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringMatching(/nằm trong khoảng từ 0 đến 10/i),
      })
    );
  });

  it("updateSubmissionFeedback lưu nhận xét của giáo viên và gửi thông báo cho học sinh", async () => {
    req.user = { userId: teacherId, role: "teacher" };
    req.params = { id: submissionId };
    req.body = { feedback: "Bài giải có hướng tư duy rất sáng tạo!" };

    const mockSubDoc = {
      _id: submissionId,
      assignment: assignmentId,
      student: studentId,
      score: 9,
      feedback: "",
      save: jest.fn().mockImplementation(function () {
        return Promise.resolve(this);
      }),
    };
    req.targetSubmissionDoc = mockSubDoc;
    req.targetAssignmentDoc = { _id: assignmentId, title: "Bài tập Hình học" };

    const notifySaveSpy = jest
      .spyOn(Notification.prototype, "save")
      .mockImplementation(function () {
        return Promise.resolve(this);
      });

    await updateSubmissionFeedback(req, res, next);

    expect(mockSubDoc.feedback).toBe("Bài giải có hướng tư duy rất sáng tạo!");
    expect(notifySaveSpy).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("canGradeSubmission chặn giáo viên không phụ trách Assignment chấm hoặc sửa điểm (403)", async () => {
    const otherTeacherId = new mongoose.Types.ObjectId().toString();
    req.user = { userId: otherTeacherId, role: "teacher" };
    req.params = { id: submissionId };

    jest.spyOn(Submission, "findOne").mockResolvedValue({
      _id: submissionId,
      assignment: assignmentId,
      student: studentId,
      isDeleted: false,
    });

    jest.spyOn(Assignment, "findOne").mockResolvedValue({
      _id: assignmentId,
      teachingAssignment: teachingAssignmentId,
      isDeleted: false,
    });

    jest.spyOn(TeachingAssignment, "findOne").mockResolvedValue({
      _id: teachingAssignmentId,
      teacher: teacherId,
      isDeleted: false,
    });

    await canGradeSubmission(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringMatching(/không phải giáo viên phụ trách/i),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("canViewSubmissionDetail & getSubmissionById đảm bảo học sinh chỉ có quyền xem điểm và nhận xét của chính mình (403 nếu xem của bạn khác)", async () => {
    const otherStudentId = new mongoose.Types.ObjectId().toString();
    req.user = { userId: studentId, role: "student" };
    req.params = { id: submissionId };

    // Bài nộp thuộc về otherStudentId
    jest.spyOn(Submission, "findOne").mockResolvedValue({
      _id: submissionId,
      assignment: assignmentId,
      student: otherStudentId,
      score: 9,
      feedback: "Tốt",
      isDeleted: false,
    });

    await canViewSubmissionDetail(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringMatching(
          /chỉ có quyền xem điểm và nhận xét của chính mình/i
        ),
      })
    );
    expect(next).not.toHaveBeenCalled();

    // Khi xem đúng bài nộp của chính mình (studentId) -> 200 OK
    const ownSub = {
      _id: submissionId,
      assignment: assignmentId,
      student: { _id: studentId, fullName: "Học Sinh Chính Chủ" },
      score: 9.5,
      feedback: "Xuất sắc",
    };
    jest.spyOn(Submission, "findOne").mockReturnValue(createMockQuery(ownSub));

    res.status.mockClear();
    res.json.mockClear();
    await getSubmissionById(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: ownSub,
      })
    );
  });
});

