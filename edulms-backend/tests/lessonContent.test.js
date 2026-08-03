require("dotenv").config();
const mongoose = require("mongoose");
const app = require("../src/app");
const User = require("../src/models/User");
const Grade = require("../src/models/Grade");
const Class = require("../src/models/Class");
const Subject = require("../src/models/Subject");
const TeachingAssignment = require("../src/models/TeachingAssignment");
const LessonContent = require("../src/models/LessonContent");
const supertest = require("supertest");
const request = supertest(app);
const { generateAccessToken } = require("../src/utils/jwt");

jest.setTimeout(30000);

let testMongoUri = process.env.MONGO_URI;
if (testMongoUri && testMongoUri.includes("/?")) {
  testMongoUri = testMongoUri.replace("/?", "/edulms_test_lesson_content?");
} else if (testMongoUri && testMongoUri.includes("?")) {
  testMongoUri = testMongoUri.replace("?", "/edulms_test_lesson_content?");
} else {
  testMongoUri = (testMongoUri || "mongodb://localhost:27017") + "/edulms_test_lesson_content";
}

describe("Lesson Content API Integration Tests", () => {
  let adminToken, assignedTeacherToken, otherTeacherToken, studentAToken, studentBToken;
  let adminUser, assignedTeacher, otherTeacher, studentInClassA, studentInClassB;
  let sampleGrade, classA, classB, subjectMath, assignmentA, assignmentB;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(testMongoUri);
    }

    await User.deleteMany({});
    await Grade.deleteMany({});
    await Class.deleteMany({});
    await Subject.deleteMany({});
    await TeachingAssignment.deleteMany({});
    await LessonContent.deleteMany({});

    // Seed Users
    adminUser = await User.create({
      name: "Admin User",
      email: "admin_lc@edulms.edu",
      password: "password123",
      role: "admin",
      isActivated: true,
    });
    adminToken = generateAccessToken(adminUser);

    assignedTeacher = await User.create({
      name: "Assigned Teacher",
      email: "teacher_a@edulms.edu",
      password: "password123",
      role: "teacher",
      teacherCode: "GV001",
      isActivated: true,
    });
    assignedTeacherToken = generateAccessToken(assignedTeacher);

    otherTeacher = await User.create({
      name: "Other Teacher",
      email: "teacher_b@edulms.edu",
      password: "password123",
      role: "teacher",
      teacherCode: "GV002",
      isActivated: true,
    });
    otherTeacherToken = generateAccessToken(otherTeacher);

    // Seed Academic Entities
    sampleGrade = await Grade.create({ name: "10" });

    classA = await Class.create({
      name: "10A1",
      gradeRef: sampleGrade._id,
      homeroomTeacherRef: assignedTeacher._id,
      schoolYear: "2025-2026",
    });

    classB = await Class.create({
      name: "10A2",
      gradeRef: sampleGrade._id,
      homeroomTeacherRef: otherTeacher._id,
      schoolYear: "2025-2026",
    });

    subjectMath = await Subject.create({
      name: "Toán Học",
      description: "Môn Toán lớp 10",
    });

    // Seed Students
    studentInClassA = await User.create({
      name: "Student Class A",
      email: "student_a@edulms.edu",
      password: "password123",
      role: "student",
      studentCode: "HS001",
      classRef: classA._id,
      isActivated: true,
    });
    studentAToken = generateAccessToken(studentInClassA);

    studentInClassB = await User.create({
      name: "Student Class B",
      email: "student_b@edulms.edu",
      password: "password123",
      role: "student",
      studentCode: "HS002",
      classRef: classB._id,
      isActivated: true,
    });
    studentBToken = generateAccessToken(studentInClassB);

    // Teaching Assignments
    assignmentA = await TeachingAssignment.create({
      teacherRef: assignedTeacher._id,
      classRef: classA._id,
      subjectRef: subjectMath._id,
    });

    assignmentB = await TeachingAssignment.create({
      teacherRef: otherTeacher._id,
      classRef: classB._id,
      subjectRef: subjectMath._id,
    });
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Grade.deleteMany({});
    await Class.deleteMany({});
    await Subject.deleteMany({});
    await TeachingAssignment.deleteMany({});
    await LessonContent.deleteMany({});
    await mongoose.connection.close();
  });

  describe("POST /api/v1/lesson-contents (Create)", () => {
    test("Assigned teacher should successfully create lesson content", async () => {
      const res = await request
        .post("/api/v1/lesson-contents")
        .set("Authorization", `Bearer ${assignedTeacherToken}`)
        .send({
          teachingAssignmentRef: assignmentA._id,
          title: "Bài 1: Mệnh đề toán học",
          description: "Nội dung tổng quan bài 1",
          contentType: "document",
          attachmentUrl: "https://example.com/slide1.pdf",
          order: 1,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe("Bài 1: Mệnh đề toán học");
      expect(res.body.data.teachingAssignmentRef.toString()).toBe(assignmentA._id.toString());
    });

    test("Admin should successfully create lesson content for any assignment", async () => {
      const res = await request
        .post("/api/v1/lesson-contents")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          teachingAssignmentRef: assignmentA._id,
          title: "Bài 2: Tập hợp",
          contentType: "video",
          order: 2,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe("Bài 2: Tập hợp");
    });

    test("Non-assigned teacher should fail to create lesson content (403)", async () => {
      const res = await request
        .post("/api/v1/lesson-contents")
        .set("Authorization", `Bearer ${otherTeacherToken}`)
        .send({
          teachingAssignmentRef: assignmentA._id,
          title: "Bài tạo trái phép",
          contentType: "document",
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    test("Student should fail to create lesson content (403)", async () => {
      const res = await request
        .post("/api/v1/lesson-contents")
        .set("Authorization", `Bearer ${studentAToken}`)
        .send({
          teachingAssignmentRef: assignmentA._id,
          title: "Học sinh tự tạo bài",
        });

      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/v1/lesson-contents & /api/v1/lesson-contents/:id (Read)", () => {
    let createdContent;

    beforeAll(async () => {
      createdContent = await LessonContent.create({
        teachingAssignmentRef: assignmentA._id,
        title: "Bài 3: Các phép toán trên tập hợp",
        description: "Mô tả bài 3",
        contentType: "exercise",
        order: 3,
      });
    });

    test("Should list lesson contents", async () => {
      const res = await request
        .get(`/api/v1/lesson-contents?teachingAssignmentRef=${assignmentA._id}`)
        .set("Authorization", `Bearer ${studentAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    test("Should get lesson content by ID", async () => {
      const res = await request
        .get(`/api/v1/lesson-contents/${createdContent._id}`)
        .set("Authorization", `Bearer ${studentAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id.toString()).toBe(createdContent._id.toString());
    });
  });

  describe("GET /api/v1/lesson-contents/class-subject (Student Class Validation)", () => {
    test("Student should successfully get lesson content for their own class", async () => {
      const res = await request
        .get(`/api/v1/lesson-contents/class-subject?classId=${classA._id}&subjectId=${subjectMath._id}`)
        .set("Authorization", `Bearer ${studentAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test("Student should be rejected when requesting content for a different class (403)", async () => {
      const res = await request
        .get(`/api/v1/lesson-contents/class-subject?classId=${classB._id}&subjectId=${subjectMath._id}`)
        .set("Authorization", `Bearer ${studentAToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Học sinh không thuộc lớp học này");
    });

    test("Teacher/Admin can access content for any class-subject", async () => {
      const res = await request
        .get(`/api/v1/lesson-contents/class-subject?classId=${classA._id}&subjectId=${subjectMath._id}`)
        .set("Authorization", `Bearer ${assignedTeacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe("PUT /api/v1/lesson-contents/:id (Update)", () => {
    let contentToUpdate;

    beforeEach(async () => {
      contentToUpdate = await LessonContent.create({
        teachingAssignmentRef: assignmentA._id,
        title: "Bài chưa cập nhật",
        contentType: "document",
        order: 10,
      });
    });

    test("Assigned teacher should update content successfully", async () => {
      const res = await request
        .put(`/api/v1/lesson-contents/${contentToUpdate._id}`)
        .set("Authorization", `Bearer ${assignedTeacherToken}`)
        .send({
          title: "Bài đã cập nhật bởi giáo viên",
          description: "Mô tả mới",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe("Bài đã cập nhật bởi giáo viên");
    });

    test("Other teacher should fail to update content (403)", async () => {
      const res = await request
        .put(`/api/v1/lesson-contents/${contentToUpdate._id}`)
        .set("Authorization", `Bearer ${otherTeacherToken}`)
        .send({
          title: "Cố tình sửa",
        });

      expect(res.status).toBe(403);
    });
  });

  describe("DELETE /api/v1/lesson-contents/:id (Delete)", () => {
    let contentToDelete;

    beforeEach(async () => {
      contentToDelete = await LessonContent.create({
        teachingAssignmentRef: assignmentA._id,
        title: "Bài sắp bị xóa",
        contentType: "document",
      });
    });

    test("Other teacher should fail to delete content (403)", async () => {
      const res = await request
        .delete(`/api/v1/lesson-contents/${contentToDelete._id}`)
        .set("Authorization", `Bearer ${otherTeacherToken}`);

      expect(res.status).toBe(403);
    });

    test("Assigned teacher should delete content successfully", async () => {
      const res = await request
        .delete(`/api/v1/lesson-contents/${contentToDelete._id}`)
        .set("Authorization", `Bearer ${assignedTeacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const found = await LessonContent.findById(contentToDelete._id);
      expect(found).toBeNull();
    });
  });
});
