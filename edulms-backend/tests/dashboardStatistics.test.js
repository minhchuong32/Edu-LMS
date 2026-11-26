const mongoose = require("mongoose");
const Class = require("../src/models/Class");
const User = require("../src/models/User");
const TeachingAssignment = require("../src/models/TeachingAssignment");
const Assignment = require("../src/models/Assignment");
const Submission = require("../src/models/Submission");
const Exam = require("../src/models/Exam");
const ExamAttempt = require("../src/models/ExamAttempt");
const GradeRecord = require("../src/models/GradeRecord");
const { protect, authorize } = require("../src/middlewares");
const {
  getTeacherDashboardStats,
} = require("../src/controllers/teacherDashboard.controller");
const {
  getStudentDashboardStats,
} = require("../src/controllers/studentDashboard.controller");
const { generateAccessToken } = require("../src/utils/jwt");

jest.mock("../src/models/Class");
jest.mock("../src/models/User");
jest.mock("../src/models/TeachingAssignment");
jest.mock("../src/models/Assignment");
jest.mock("../src/models/Submission");
jest.mock("../src/models/Exam");
jest.mock("../src/models/ExamAttempt");
jest.mock("../src/models/GradeRecord");

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
 * Helper thực thi pipeline Express (protect -> authorize -> controller) mà không cần mở TCP socket
 */
const invokeApiPipeline = async ({
  token,
  allowedRoles,
  controller,
  query = {},
  params = {},
}) => {
  const req = {
    headers: token ? { authorization: `Bearer ${token}` } : {},
    query,
    params,
    body: {},
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
  let capturedError = null;

  await protect(req, res, (err) => {
    if (err) capturedError = err;
    else nextCalled = true;
  });

  if (!nextCalled || jsonBody) {
    return { status: statusCode, body: jsonBody, error: capturedError };
  }

  nextCalled = false;
  const rbacMw = authorize(...allowedRoles);
  rbacMw(req, res, (err) => {
    if (err) capturedError = err;
    else nextCalled = true;
  });

  if (!nextCalled || jsonBody) {
    return { status: statusCode, body: jsonBody, error: capturedError };
  }

  await controller(req, res, (err) => {
    if (err) capturedError = err;
  });

  return { status: statusCode, body: jsonBody, error: capturedError };
};

describe("Teacher & Student Statistics API (MongoDB Aggregation & Scope Authorization Tests)", () => {
  const teacher1Id = new mongoose.Types.ObjectId().toString();
  const teacher2Id = new mongoose.Types.ObjectId().toString();
  const student1Id = new mongoose.Types.ObjectId().toString();
  const student2Id = new mongoose.Types.ObjectId().toString();
  const parent1Id = new mongoose.Types.ObjectId().toString();

  const class10A1Id = new mongoose.Types.ObjectId().toString();
  const class10A2Id = new mongoose.Types.ObjectId().toString();
  const class12C9UnauthorizedId = new mongoose.Types.ObjectId().toString();

  const taMath10A2Id = new mongoose.Types.ObjectId().toString();
  const taPhysics12C9UnauthorizedId = new mongoose.Types.ObjectId().toString();

  const assign1Id = new mongoose.Types.ObjectId().toString();
  const assign2Id = new mongoose.Types.ObjectId().toString();
  const assign3Id = new mongoose.Types.ObjectId().toString();

  const exam1Id = new mongoose.Types.ObjectId().toString();
  const exam2Id = new mongoose.Types.ObjectId().toString();

  const teacher1Token = generateAccessToken({
    userId: teacher1Id,
    role: "teacher",
    email: "teacher1@edulms.edu.vn",
  });

  const student1Token = generateAccessToken({
    userId: student1Id,
    role: "student",
    email: "student1@edulms.edu.vn",
  });

  const parent1Token = generateAccessToken({
    userId: parent1Id,
    role: "parent",
    email: "parent1@edulms.edu.vn",
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /* =========================================================================
     1. API THỐNG KÊ CHO GIÁO VIÊN: GET /api/v1/academic/teacher-dashboard
  ========================================================================= */
  describe("1. API Thống kê cho Giáo viên (/api/v1/academic/teacher-dashboard)", () => {
    beforeEach(() => {
      // Lớp chủ nhiệm của Teacher 1: 10A1
      Class.find.mockReturnValue(
        createChainableQuery([
          {
            _id: class10A1Id,
            name: "10A1",
            room: "P.201",
            capacity: 45,
            academicYear: "2025-2026",
            homeroomTeacher: { _id: teacher1Id, fullName: "GV Nguyễn Văn A" },
          },
        ])
      );

      // Phân công giảng dạy của Teacher 1: Dạy Toán lớp 10A2
      TeachingAssignment.find.mockReturnValue(
        createChainableQuery([
          {
            _id: taMath10A2Id,
            class: {
              _id: class10A2Id,
              name: "10A2",
              room: "P.202",
              capacity: 45,
              academicYear: "2025-2026",
            },
            subject: { _id: "sub_math", name: "Toán học 10", code: "MATH10" },
            teacher: { _id: teacher1Id, fullName: "GV Nguyễn Văn A" },
            academicYear: "2025-2026",
            semester: "HK1",
          },
        ])
      );

      // MongoDB Aggregation 1: Thống kê sĩ số học sinh theo từng lớp phụ trách
      User.aggregate = jest.fn().mockResolvedValue([
        { _id: new mongoose.Types.ObjectId(class10A1Id), studentCount: 42 },
        { _id: new mongoose.Types.ObjectId(class10A2Id), studentCount: 38 },
      ]);

      // MongoDB Aggregation 2: Thống kê điểm trung bình từng học sinh theo TeachingAssignment & điểm trung bình lớp
      // - Học sinh 1 (student1Id) tại lớp 10A2 đạt ĐTB = 8.0
      // - Học sinh 2 (student2Id) tại lớp 10A2 đạt ĐTB = 4.0 (< 5.0 -> nằm trong danh sách học sinh điểm thấp)
      // => Điểm trung bình lớp 10A2 = (8.0 + 4.0) / 2 = 6.0
      GradeRecord.aggregate = jest.fn().mockResolvedValue([
        {
          studentId: new mongoose.Types.ObjectId(student1Id),
          teachingAssignmentId: new mongoose.Types.ObjectId(taMath10A2Id),
          recordCount: 3,
          averageScore: 8.0,
          studentInfo: {
            _id: student1Id,
            fullName: "Nguyễn Minh Anh",
            userCode: "HS1001",
            className: "10A2",
          },
        },
        {
          studentId: new mongoose.Types.ObjectId(student2Id),
          teachingAssignmentId: new mongoose.Types.ObjectId(taMath10A2Id),
          recordCount: 3,
          averageScore: 4.0,
          studentInfo: {
            _id: student2Id,
            fullName: "Trần Hoàng Nam",
            userCode: "HS1002",
            className: "10A2",
          },
        },
      ]);

      // Danh sách bài tập thuộc TeachingAssignment của Teacher 1
      Assignment.find.mockReturnValue(
        createChainableQuery([
          {
            _id: assign1Id,
            title: "Bài tập Phương trình bậc hai",
            dueDate: new Date("2026-12-15T23:59:00.000Z"),
            status: "open",
            teachingAssignment: {
              _id: taMath10A2Id,
              class: { name: "10A2" },
              subject: { name: "Toán học 10", code: "MATH10" },
            },
          },
        ])
      );

      // MongoDB Aggregation 3: Thống kê số bài tập cần chấm (ungradedCount)
      Submission.aggregate = jest.fn().mockResolvedValue([
        {
          _id: new mongoose.Types.ObjectId(assign1Id),
          totalSubmissions: 25,
          ungradedCount: 7,
          lateCount: 2,
        },
      ]);
    });

    it("tổng hợp chính xác sĩ số lớp, điểm trung bình từng lớp, số bài tập cần chấm và danh sách học sinh điểm thấp bằng MongoDB Aggregation", async () => {
      const res = await invokeApiPipeline({
        token: teacher1Token,
        allowedRoles: ["teacher", "admin"],
        controller: getTeacherDashboardStats,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const {
        summary,
        classesOverview,
        classAverageStats,
        pendingAssignments,
        lowGradeStudents,
        studentAlerts,
      } = res.body.data;

      // Xác nhận các hàm MongoDB Aggregation đã được gọi
      expect(User.aggregate).toHaveBeenCalledTimes(1);
      expect(GradeRecord.aggregate).toHaveBeenCalledTimes(1);
      expect(Submission.aggregate).toHaveBeenCalledTimes(1);

      // 1. Kiểm tra thống kê sĩ số học sinh trong các lớp phụ trách (42 + 38 = 80)
      expect(summary.totalClasses).toBe(2);
      expect(summary.homeroomCount).toBe(1);
      expect(summary.teachingSubjectCount).toBe(1);
      expect(summary.totalStudents).toBe(80);

      const homeroomCard = classesOverview.find(
        (c) => c.classId === class10A1Id
      );
      const subjectCard = classesOverview.find(
        (c) => c.classId === class10A2Id
      );
      expect(homeroomCard.studentCount).toBe(42);
      expect(subjectCard.studentCount).toBe(38);

      // 2. Kiểm tra thống kê điểm trung bình của từng lớp ((8.0 + 4.0) / 2 = 6.0)
      expect(subjectCard.classAverage).toBe(6.0);
      expect(subjectCard.averageScore).toBe(6.0);
      expect(summary.overallClassAverage).toBe(6.0);
      expect(classAverageStats).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            classId: class10A2Id,
            className: "10A2",
            studentCount: 38,
            averageScore: 6.0,
          }),
        ])
      );

      // 3. Kiểm tra thống kê số bài tập cần chấm (7 bài nộp chưa chấm)
      expect(summary.totalPendingGrading).toBe(7);
      expect(pendingAssignments).toHaveLength(1);
      expect(pendingAssignments[0]).toMatchObject({
        _id: assign1Id,
        title: "Bài tập Phương trình bậc hai",
        totalSubmissions: 25,
        ungradedCount: 7,
        gradedCount: 18,
        lateCount: 2,
      });

      // 4. Kiểm tra danh sách học sinh có điểm thấp (< 5.0) trong các lớp phụ trách
      expect(lowGradeStudents).toHaveLength(1);
      expect(studentAlerts).toHaveLength(1);
      expect(lowGradeStudents[0]).toMatchObject({
        studentId: student2Id,
        studentName: "Trần Hoàng Nam",
        className: "10A2",
        subjectName: "Toán học 10",
        averageScore: 4.0,
        alertType: "low_grade",
      });
    });

    it("trả về HTTP 403 khi Giáo viên cố truy cập thống kê của một Giáo viên khác (teacherId ngoài phạm vi)", async () => {
      const res = await invokeApiPipeline({
        token: teacher1Token,
        allowedRoles: ["teacher", "admin"],
        controller: getTeacherDashboardStats,
        query: { teacherId: teacher2Id },
      });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/không có quyền/i);
    });

    it("trả về HTTP 403 khi Giáo viên cố truy cập thống kê của lớp (classId) không thuộc phạm vi giảng dạy hoặc chủ nhiệm", async () => {
      const res = await invokeApiPipeline({
        token: teacher1Token,
        allowedRoles: ["teacher", "admin"],
        controller: getTeacherDashboardStats,
        query: { classId: class12C9UnauthorizedId },
      });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(
        /lớp nằm ngoài phạm vi giảng dạy hoặc chủ nhiệm/i
      );
    });

    it("trả về HTTP 403 khi Giáo viên cố truy cập thống kê của phân công giảng dạy (teachingAssignmentId) ngoài phạm vi phụ trách", async () => {
      const res = await invokeApiPipeline({
        token: teacher1Token,
        allowedRoles: ["teacher", "admin"],
        controller: getTeacherDashboardStats,
        query: { teachingAssignmentId: taPhysics12C9UnauthorizedId },
      });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(
        /phân công giảng dạy nằm ngoài phạm vi phụ trách/i
      );
    });

    it("trả về HTTP 403 khi tài khoản Học sinh hoặc Phụ huynh cố gọi API thống kê của Giáo viên", async () => {
      const studentRes = await invokeApiPipeline({
        token: student1Token,
        allowedRoles: ["teacher", "admin"],
        controller: getTeacherDashboardStats,
      });
      expect(studentRes.status).toBe(403);

      const parentRes = await invokeApiPipeline({
        token: parent1Token,
        allowedRoles: ["teacher", "admin"],
        controller: getTeacherDashboardStats,
      });
      expect(parentRes.status).toBe(403);
    });
  });

  /* =========================================================================
     2. API THỐNG KÊ CHO HỌC SINH: GET /api/v1/academic/student-dashboard
  ========================================================================= */
  describe("2. API Thống kê cho Học sinh (/api/v1/academic/student-dashboard)", () => {
    beforeEach(() => {
      // Hồ sơ Học sinh 1 (thuộc lớp 10A2)
      User.findOne.mockReturnValue(
        createChainableQuery({
          _id: student1Id,
          fullName: "Nguyễn Minh Anh",
          userCode: "HS1001",
          email: "student1@edulms.edu.vn",
          role: "student",
          className: "10A2",
          classRef: class10A2Id,
        })
      );

      // Phân công giảng dạy của lớp 10A2
      TeachingAssignment.find.mockReturnValue(
        createChainableQuery([
          {
            _id: taMath10A2Id,
            class: { _id: class10A2Id, name: "10A2", room: "P.202" },
            subject: { _id: "sub_math", name: "Toán học 10", code: "MATH10" },
            teacher: { _id: teacher1Id, fullName: "GV Nguyễn Văn A" },
          },
        ])
      );

      // MongoDB Aggregation 1: Thống kê điểm trung bình hiện tại của cá nhân học sinh
      GradeRecord.aggregate = jest.fn().mockResolvedValue([
        {
          teachingAssignmentId: new mongoose.Types.ObjectId(taMath10A2Id),
          recordCount: 4,
          average: 8.6,
        },
      ]);

      // Danh sách 3 bài tập của lớp 10A2:
      // - assign1: Đã nộp (submitted)
      // - assign2: Chưa nộp & Còn hạn (pending_in_time - hạn năm 2028)
      // - assign3: Chưa nộp & Quá hạn (overdue - hạn năm 2020)
      Assignment.find.mockReturnValue(
        createChainableQuery([
          {
            _id: assign1Id,
            title: "Bài tập Hàm số bậc hai",
            dueDate: new Date("2028-05-10T23:59:00.000Z"),
            status: "open",
            teachingAssignment: {
              _id: taMath10A2Id,
              class: { name: "10A2" },
              subject: { name: "Toán học 10", code: "MATH10" },
            },
          },
          {
            _id: assign2Id,
            title: "Bài tập Bất phương trình",
            dueDate: new Date("2028-06-15T23:59:00.000Z"),
            status: "open",
            teachingAssignment: {
              _id: taMath10A2Id,
              class: { name: "10A2" },
              subject: { name: "Toán học 10", code: "MATH10" },
            },
          },
          {
            _id: assign3Id,
            title: "Bài tập Mệnh đề Tập hợp",
            dueDate: new Date("2020-01-01T23:59:00.000Z"),
            status: "open",
            teachingAssignment: {
              _id: taMath10A2Id,
              class: { name: "10A2" },
              subject: { name: "Toán học 10", code: "MATH10" },
            },
          },
        ])
      );

      // MongoDB Aggregation 2: Bài nộp cá nhân của học sinh (chỉ nộp assign1)
      Submission.aggregate = jest.fn().mockResolvedValue([
        {
          assignment: new mongoose.Types.ObjectId(assign1Id),
          student: new mongoose.Types.ObjectId(student1Id),
          fileUrl: "https://res.cloudinary.com/demo/raw/upload/v1/bai-nop.pdf",
          score: 9.0,
          isLate: false,
          submittedAt: new Date("2026-11-10T10:00:00.000Z"),
        },
      ]);

      // Danh sách đề kiểm tra đã phát hành của lớp 10A2
      Exam.find.mockReturnValue(
        createChainableQuery([
          {
            _id: exam1Id,
            title: "Kiểm tra 45 phút Đại số Chương 2",
            duration: 45,
            totalQuestions: 25,
            scoreWeight: 2,
            teachingAssignment: {
              _id: taMath10A2Id,
              class: { name: "10A2" },
              subject: { name: "Toán học 10", code: "MATH10" },
              teacher: { fullName: "GV Nguyễn Văn A" },
            },
          },
          {
            _id: exam2Id,
            title: "Kiểm tra 15 phút Hình học",
            duration: 15,
            totalQuestions: 10,
            scoreWeight: 1,
            teachingAssignment: {
              _id: taMath10A2Id,
              class: { name: "10A2" },
              subject: { name: "Toán học 10", code: "MATH10" },
              teacher: { fullName: "GV Nguyễn Văn A" },
            },
          },
        ])
      );

      // MongoDB Aggregation 3: Lượt làm bài kiểm tra của học sinh (đã làm exam2, chưa làm exam1)
      ExamAttempt.aggregate = jest.fn().mockResolvedValue([
        {
          exam: new mongoose.Types.ObjectId(exam2Id),
          student: new mongoose.Types.ObjectId(student1Id),
          score: 8.5,
          status: "completed",
        },
      ]);
    });

    it("tổng hợp chính xác điểm trung bình hiện tại của cá nhân, tiến độ bài tập (đã nộp / còn hạn / quá hạn) và danh sách bài kiểm tra sắp tới", async () => {
      const res = await invokeApiPipeline({
        token: student1Token,
        allowedRoles: ["student"],
        controller: getStudentDashboardStats,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const {
        studentId,
        gpaOverview,
        assignmentProgress,
        upcomingExams,
      } = res.body.data;

      expect(studentId).toBe(student1Id);
      expect(GradeRecord.aggregate).toHaveBeenCalledTimes(1);
      expect(Submission.aggregate).toHaveBeenCalledTimes(1);
      expect(ExamAttempt.aggregate).toHaveBeenCalledTimes(1);

      // 1. Điểm trung bình hiện tại của cá nhân
      expect(gpaOverview.currentGPA).toBe(8.6);
      expect(gpaOverview.academicPerformance).toBe("Giỏi");
      expect(gpaOverview.totalGradeRecords).toBe(4);
      expect(gpaOverview.subjectAverages[0]).toMatchObject({
        subjectName: "Toán học 10",
        average: 8.6,
        performance: "Giỏi",
      });

      // 2. Tiến độ bài tập (1 đã nộp, 1 chưa nộp còn hạn, 1 quá hạn -> tỷ lệ 33%)
      expect(assignmentProgress.totalAssignments).toBe(3);
      expect(assignmentProgress.submittedCount).toBe(1);
      expect(assignmentProgress.pendingInTimeCount).toBe(1);
      expect(assignmentProgress.overdueUnsubmittedCount).toBe(1);
      expect(assignmentProgress.completionRate).toBe(33);

      const submittedItem = assignmentProgress.items.find(
        (i) => i._id === assign1Id
      );
      const pendingInTimeItem = assignmentProgress.items.find(
        (i) => i._id === assign2Id
      );
      const overdueItem = assignmentProgress.items.find(
        (i) => i._id === assign3Id
      );

      expect(submittedItem.submissionCategory).toBe("submitted");
      expect(submittedItem.score).toBe(9.0);
      expect(pendingInTimeItem.submissionCategory).toBe("pending_in_time");
      expect(overdueItem.submissionCategory).toBe("overdue");

      // 3. Danh sách bài kiểm tra sắp tới
      expect(upcomingExams).toHaveLength(2);
      const upcomingExam = upcomingExams.find((e) => e._id === exam1Id);
      const completedExam = upcomingExams.find((e) => e._id === exam2Id);

      expect(upcomingExam.isCompleted).toBe(false);
      expect(upcomingExam.duration).toBe(45);
      expect(completedExam.isCompleted).toBe(true);
      expect(completedExam.attemptScore).toBe(8.5);
    });

    it("trả về HTTP 403 khi Học sinh cố truy cập dữ liệu thống kê của một Học sinh khác (studentId khác req.user.userId)", async () => {
      const res = await invokeApiPipeline({
        token: student1Token,
        allowedRoles: ["student"],
        controller: getStudentDashboardStats,
        query: { studentId: student2Id },
      });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(
        /chỉ được phép truy cập dữ liệu.*của chính mình/i
      );
    });

    it("trả về HTTP 403 khi Học sinh cố truy cập dữ liệu thống kê của một Lớp học khác (classId ngoài phạm vi)", async () => {
      const res = await invokeApiPipeline({
        token: student1Token,
        allowedRoles: ["student"],
        controller: getStudentDashboardStats,
        query: { classId: class10A1Id },
      });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(
        /không có quyền truy cập dữ liệu thống kê của lớp học khác/i
      );
    });

    it("trả về HTTP 403 khi tài khoản Giáo viên hoặc Phụ huynh cố gọi API thống kê cá nhân của Học sinh", async () => {
      const teacherRes = await invokeApiPipeline({
        token: teacher1Token,
        allowedRoles: ["student"],
        controller: getStudentDashboardStats,
      });
      expect(teacherRes.status).toBe(403);

      const parentRes = await invokeApiPipeline({
        token: parent1Token,
        allowedRoles: ["student"],
        controller: getStudentDashboardStats,
      });
      expect(parentRes.status).toBe(403);
    });
  });
});
