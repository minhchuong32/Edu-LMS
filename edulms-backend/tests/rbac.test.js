const mongoose = require("mongoose");
const User = require("../src/models/User");
const Class = require("../src/models/Class");
const TeachingAssignment = require("../src/models/TeachingAssignment");
const { generateAccessToken } = require("../src/utils/jwt");
const { authMiddleware, restrictTo, checkClassScope } = require("../src/middlewares");

jest.mock("../src/models/User");
jest.mock("../src/models/Class");
jest.mock("../src/models/TeachingAssignment");

describe("RBAC & Class Scope Middleware Unit Tests", () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      headers: {},
      params: {},
      body: {},
      query: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  describe("JWT Auth Middleware (authMiddleware)", () => {
    test("Should fail with 401 if Authorization header is missing", async () => {
      await authMiddleware(req, res, next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 401, message: expect.stringContaining("Access Token") })
      );
    });

    test("Should fail with 401 if token is invalid", async () => {
      req.headers.authorization = "Bearer invalid_token";
      await authMiddleware(req, res, next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 401, message: expect.stringContaining("không hợp lệ") })
      );
    });

    test("Should fail with 401 if user does not exist in DB", async () => {
      const token = generateAccessToken({ _id: new mongoose.Types.ObjectId(), email: "test@edulms.edu", role: "student" });
      req.headers.authorization = `Bearer ${token}`;
      User.findById.mockResolvedValue(null);

      await authMiddleware(req, res, next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 401, message: expect.stringContaining("không tồn tại") })
      );
    });

    test("Should attach user and call next() on valid token and existing user", async () => {
      const userId = new mongoose.Types.ObjectId();
      const mockUser = { _id: userId, email: "test@edulms.edu", role: "student" };
      const token = generateAccessToken(mockUser);
      req.headers.authorization = `Bearer ${token}`;
      User.findById.mockResolvedValue(mockUser);

      await authMiddleware(req, res, next);
      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe("restrictTo Middleware (4 Roles)", () => {
    test("Should fail with 401 if req.user is undefined", () => {
      const middleware = restrictTo("admin");
      middleware(req, res, next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 401 })
      );
    });

    test("Should fail with 403 if user role is not allowed", () => {
      req.user = { role: "student" };
      const middleware = restrictTo("teacher", "admin");
      middleware(req, res, next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 403 })
      );
    });

    test("Should pass for student when student role is allowed", () => {
      req.user = { role: "student" };
      const middleware = restrictTo("student");
      middleware(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });

    test("Should pass for teacher when teacher role is allowed", () => {
      req.user = { role: "teacher" };
      const middleware = restrictTo("teacher", "admin");
      middleware(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });

    test("Should pass for parent when parent role is allowed", () => {
      req.user = { role: "parent" };
      const middleware = restrictTo("parent", "admin");
      middleware(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });

    test("Should pass for admin when admin role is allowed", () => {
      req.user = { role: "admin" };
      const middleware = restrictTo("admin");
      middleware(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe("Class Scope Middleware (checkClassScope)", () => {
    const validClassId = new mongoose.Types.ObjectId().toString();

    test("Should return 400 for missing or invalid classId", async () => {
      req.user = { role: "admin" };
      req.params.classId = "invalid_id";

      const middleware = checkClassScope("classId");
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 400, message: expect.stringContaining("Mã lớp học không hợp lệ") })
      );
    });

    test("Admin should pass class scope check for any class", async () => {
      req.user = { role: "admin" };
      req.params.classId = validClassId;

      const middleware = checkClassScope("classId");
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    test("Homeroom teacher should pass class scope check", async () => {
      const teacherId = new mongoose.Types.ObjectId();
      req.user = { _id: teacherId, role: "teacher" };
      req.params.classId = validClassId;

      Class.exists.mockResolvedValue({ _id: validClassId });

      const middleware = checkClassScope("classId");
      await middleware(req, res, next);

      expect(Class.exists).toHaveBeenCalledWith({
        _id: validClassId,
        homeroomTeacherRef: teacherId,
      });
      expect(next).toHaveBeenCalledWith();
    });

    test("Subject teacher should pass class scope check via TeachingAssignment", async () => {
      const teacherId = new mongoose.Types.ObjectId();
      req.user = { _id: teacherId, role: "teacher" };
      req.params.classId = validClassId;

      Class.exists.mockResolvedValue(null);
      TeachingAssignment.exists.mockResolvedValue({ _id: new mongoose.Types.ObjectId() });

      const middleware = checkClassScope("classId");
      await middleware(req, res, next);

      expect(TeachingAssignment.exists).toHaveBeenCalledWith({
        classRef: validClassId,
        teacherRef: teacherId,
      });
      expect(next).toHaveBeenCalledWith();
    });

    test("Teacher NOT homeroom AND NOT subject teacher should be denied with 403", async () => {
      const teacherId = new mongoose.Types.ObjectId();
      req.user = { _id: teacherId, role: "teacher" };
      req.params.classId = validClassId;

      Class.exists.mockResolvedValue(null);
      TeachingAssignment.exists.mockResolvedValue(null);

      const middleware = checkClassScope("classId");
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 403, message: expect.stringContaining("Giáo viên không có quyền") })
      );
    });

    test("Student enrolled in class should pass class scope check", async () => {
      const classIdObj = new mongoose.Types.ObjectId();
      req.user = { role: "student", classRef: classIdObj };
      req.params.classId = classIdObj.toString();

      const middleware = checkClassScope("classId");
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    test("Student NOT enrolled in class should be denied with 403", async () => {
      req.user = { role: "student", classRef: new mongoose.Types.ObjectId() };
      req.params.classId = validClassId;

      const middleware = checkClassScope("classId");
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 403, message: expect.stringContaining("Học sinh không có quyền") })
      );
    });

    test("Parent with child in class should pass class scope check", async () => {
      const childId = new mongoose.Types.ObjectId();
      req.user = { role: "parent", childrenRefs: [childId] };
      req.params.classId = validClassId;

      User.exists.mockResolvedValue({ _id: childId });

      const middleware = checkClassScope("classId");
      await middleware(req, res, next);

      expect(User.exists).toHaveBeenCalledWith({
        _id: { $in: [childId] },
        classRef: validClassId,
      });
      expect(next).toHaveBeenCalledWith();
    });

    test("Parent without child in class should be denied with 403", async () => {
      const childId = new mongoose.Types.ObjectId();
      req.user = { role: "parent", childrenRefs: [childId] };
      req.params.classId = validClassId;

      User.exists.mockResolvedValue(null);

      const middleware = checkClassScope("classId");
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 403, message: expect.stringContaining("Phụ huynh không có quyền") })
      );
    });
  });
});
