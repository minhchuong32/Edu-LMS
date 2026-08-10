require("dotenv").config();
const mongoose = require("mongoose");
const app = require("../src/app");
const User = require("../src/models/User");
const Grade = require("../src/models/Grade");
const Class = require("../src/models/Class");
const Subject = require("../src/models/Subject");
const TeachingAssignment = require("../src/models/TeachingAssignment");
const GradeRecord = require("../src/models/GradeRecord");
const ClassHistory = require("../src/models/ClassHistory");
const supertest = require("supertest");
const request = supertest(app);
const { generateAccessToken } = require("../src/utils/jwt");

// Increase Jest timeout for DB interactions
jest.setTimeout(30000);

let testMongoUri = process.env.MONGO_URI;
if (testMongoUri && testMongoUri.includes("/?")) {
  testMongoUri = testMongoUri.replace("/?", "/edulms_test_academic?");
} else if (testMongoUri && testMongoUri.includes("?")) {
  testMongoUri = testMongoUri.replace("?", "/edulms_test_academic?");
} else {
  testMongoUri = (testMongoUri || "mongodb://localhost:27017") + "/edulms_test_academic";
}

describe("Academic Structures API Integration Tests (Real Database)", () => {
  let adminToken, teacherToken, studentToken;
  let adminUser, teacherUser, studentUser;
  let sampleGrade, sampleTeacher;

  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(testMongoUri);
    }

    // Clean up test collections
    await User.deleteMany({});
    await Grade.deleteMany({});
    await Class.deleteMany({});
    await Subject.deleteMany({});
    await TeachingAssignment.deleteMany({});
    await GradeRecord.deleteMany({});
    await ClassHistory.deleteMany({});

    // Seed test users
    adminUser = await User.create({
      name: "Admin User",
      email: "admin@edulms.edu",
      password: "password123",
      role: "admin",
      isActivated: true,
    });
    adminToken = generateAccessToken(adminUser);

    teacherUser = await User.create({
      name: "Teacher User",
      email: "teacher@edulms.edu",
      password: "password123",
      role: "teacher",
      teacherCode: "GV-0001",
      isActivated: true,
    });
    teacherToken = generateAccessToken(teacherUser);

    studentUser = await User.create({
      name: "Student User",
      email: "student@edulms.edu",
      password: "password123",
      role: "student",
      studentCode: "HS-0001",
      isActivated: true,
    });
    studentToken = generateAccessToken(studentUser);

    // Seed a baseline grade and teacher for general class tests
    sampleGrade = await Grade.create({ name: "10" });
    sampleTeacher = await User.create({
      name: "Homeroom Teacher",
      email: "homeroom@edulms.edu",
      password: "password123",
      role: "teacher",
      teacherCode: "GV-0002",
      isActivated: true,
    });
  }, 30000);

  afterAll(async () => {
    // Clean up database after tests
    await User.deleteMany({});
    await Grade.deleteMany({});
    await Class.deleteMany({});
    await Subject.deleteMany({});
    await TeachingAssignment.deleteMany({});
    await GradeRecord.deleteMany({});
    await ClassHistory.deleteMany({});
    
    // Close connection
    await mongoose.connection.close();
  });

  describe("Authentication & RBAC checks", () => {
    test("Should reject request if token is missing", async () => {
      const response = await request.get("/api/v1/academic/grades");
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test("Should allow read operations for non-admin users (e.g. students)", async () => {
      const response = await request
        .get("/api/v1/academic/grades")
        .set("Authorization", `Bearer ${studentToken}`);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test("Should prevent non-admin users from creating a Grade", async () => {
      const response = await request
        .post("/api/v1/academic/grades")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({ name: "11" });
      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    test("Should prevent non-admin users from creating a Class", async () => {
      const response = await request
        .post("/api/v1/academic/classes")
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({ name: "10A2", gradeRef: sampleGrade._id, homeroomTeacherRef: sampleTeacher._id, schoolYear: "2025-2026" });
      expect(response.status).toBe(403);
    });
  });

  describe("Grades (Khối) CRUD API", () => {
    let createdGradeId;

    test("Admin can create a valid Grade (11)", async () => {
      const response = await request
        .post("/api/v1/academic/grades")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "11" });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe("11");
      createdGradeId = response.body.data._id;
    });

    test("Create Grade fails for invalid enum value", async () => {
      const response = await request
        .post("/api/v1/academic/grades")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "9" });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("danh sách: 10, 11, 12");
    });

    test("Create Grade fails for duplicates", async () => {
      const response = await request
        .post("/api/v1/academic/grades")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "11" });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("đã tồn tại");
    });

    test("Get all grades returns populated list", async () => {
      const response = await request
        .get("/api/v1/academic/grades")
        .set("Authorization", `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2); // 10 and 11
    });

    test("Get grade by ID returns correct grade", async () => {
      const response = await request
        .get(`/api/v1/academic/grades/${createdGradeId}`)
        .set("Authorization", `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe("11");
    });

    test("Admin can update Grade name", async () => {
      const response = await request
        .put(`/api/v1/academic/grades/${createdGradeId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "12" });

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe("12");
    });

    test("Prevent deleting Grade if classes are linked", async () => {
      // Create a class linked to sampleGrade ("10")
      await Class.create({
        name: "10A1",
        gradeRef: sampleGrade._id,
        homeroomTeacherRef: sampleTeacher._id,
        schoolYear: "2025-2026"
      });

      const response = await request
        .delete(`/api/v1/academic/grades/${sampleGrade._id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("lớp học thuộc khối này");

      // Cleanup class for subsequent tests
      await Class.deleteMany({});
    });

    test("Admin can delete Grade if no classes are linked", async () => {
      const response = await request
        .delete(`/api/v1/academic/grades/${createdGradeId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const findCheck = await Grade.findById(createdGradeId);
      expect(findCheck).toBeNull();
    });
  });

  describe("Classes (Lớp) CRUD API", () => {
    let classId;

    test("Admin can create a valid Class", async () => {
      const response = await request
        .post("/api/v1/academic/classes")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "10A1",
          gradeRef: sampleGrade._id,
          homeroomTeacherRef: sampleTeacher._id,
          schoolYear: "2025-2026"
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe("10A1");
      expect(response.body.data.schoolYear).toBe("2025-2026");
      classId = response.body.data._id;
    });

    test("Fails when duplicating class name in the SAME school year", async () => {
      // Setup a new teacher to avoid homeroom teacher conflict
      const extraTeacher = await User.create({
        name: "Extra Teacher",
        email: "extra@edulms.edu",
        password: "password123",
        role: "teacher",
        teacherCode: "GV-0003",
        isActivated: true,
      });

      const response = await request
        .post("/api/v1/academic/classes")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "10A1", // Duplicate name
          gradeRef: sampleGrade._id,
          homeroomTeacherRef: extraTeacher._id,
          schoolYear: "2025-2026" // Same year
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("đã tồn tại trong năm học 2025-2026");
    });

    test("Succeeds when duplicating class name in a DIFFERENT school year", async () => {
      const extraTeacher = await User.create({
        name: "Extra Teacher 2",
        email: "extra2@edulms.edu",
        password: "password123",
        role: "teacher",
        teacherCode: "GV-0004",
        isActivated: true,
      });

      const response = await request
        .post("/api/v1/academic/classes")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "10A1", // Duplicate name
          gradeRef: sampleGrade._id,
          homeroomTeacherRef: extraTeacher._id,
          schoolYear: "2026-2027" // Different year
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe("10A1");
      expect(response.body.data.schoolYear).toBe("2026-2027");
    });

    test("Fails when assigning same homeroom teacher to multiple classes in the SAME school year", async () => {
      const response = await request
        .post("/api/v1/academic/classes")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "10A2",
          gradeRef: sampleGrade._id,
          homeroomTeacherRef: sampleTeacher._id, // Already homeroom for 10A1 in 2025-2026
          schoolYear: "2025-2026"
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("đã chủ nhiệm lớp");
    });

    test("Succeeds when assigning same homeroom teacher to classes in DIFFERENT school years", async () => {
      const response = await request
        .post("/api/v1/academic/classes")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "10A3",
          gradeRef: sampleGrade._id,
          homeroomTeacherRef: sampleTeacher._id, // Already homeroom for 10A1 in 2025-2026
          schoolYear: "2027-2028" // Different school year
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    test("Fails when assigning a non-teacher as homeroom teacher", async () => {
      const response = await request
        .post("/api/v1/academic/classes")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "10A4",
          gradeRef: sampleGrade._id,
          homeroomTeacherRef: studentUser._id, // Student
          schoolYear: "2025-2026"
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("phải có vai trò là giáo viên");
    });

    test("Get classes with query filters", async () => {
      const response = await request
        .get("/api/v1/academic/classes")
        .set("Authorization", `Bearer ${adminToken}`)
        .query({ schoolYear: "2025-2026" });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(1); // Only 10A1 is in 2025-2026
      expect(response.body.data[0].name).toBe("10A1");
    });

    test("Admin can update class details", async () => {
      const response = await request
        .put(`/api/v1/academic/classes/${classId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "10A1-Modified" });

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe("10A1-Modified");
    });

    test("Prevent class deletion if students are enrolled", async () => {
      // Link studentUser to the class
      await User.findByIdAndUpdate(studentUser._id, { classRef: classId });

      const response = await request
        .delete(`/api/v1/academic/classes/${classId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("đang có học sinh thuộc lớp này");

      // Cleanup enrollment
      await User.findByIdAndUpdate(studentUser._id, { $unset: { classRef: "" } });
    });

    test("Admin can delete Class if empty", async () => {
      const response = await request
        .delete(`/api/v1/academic/classes/${classId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const findCheck = await Class.findById(classId);
      expect(findCheck).toBeNull();
    });
  });

  describe("Subjects (Môn học) CRUD API", () => {
    let subjectId;

    test("Admin can create a valid Subject", async () => {
      const response = await request
        .post("/api/v1/academic/subjects")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Toán học", description: "Môn toán THPT" });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe("Toán học");
      subjectId = response.body.data._id;
    });

    test("Fails when creating duplicate Subject (case-insensitive)", async () => {
      const response = await request
        .post("/api/v1/academic/subjects")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "toán học" });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("đã tồn tại");
    });

    test("Get all subjects lists created subjects", async () => {
      const response = await request
        .get("/api/v1/academic/subjects")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.some(s => s.name === "Toán học")).toBe(true);
    });

    test("Admin can update Subject details", async () => {
      const response = await request
        .put(`/api/v1/academic/subjects/${subjectId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Toán học nâng cao" });

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe("Toán học nâng cao");
    });

    test("Prevent subject deletion if teaching assignments exist", async () => {
      // Create a dummy class and teaching assignment
      const dummyClass = await Class.create({
        name: "10A9",
        gradeRef: sampleGrade._id,
        homeroomTeacherRef: sampleTeacher._id,
        schoolYear: "2025-2026"
      });

      await TeachingAssignment.create({
        teacherRef: sampleTeacher._id,
        classRef: dummyClass._id,
        subjectRef: subjectId
      });

      const response = await request
        .delete(`/api/v1/academic/subjects/${subjectId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("đang có phân công giảng dạy");

      // Cleanup dummy associations
      await TeachingAssignment.deleteMany({});
      await Class.deleteMany({});
    });

    test("Admin can delete Subject if unlinked", async () => {
      const response = await request
        .delete(`/api/v1/academic/subjects/${subjectId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const findCheck = await Subject.findById(subjectId);
      expect(findCheck).toBeNull();
    });
  });

  describe("Teaching Assignments CRUD API", () => {
    let createdAssignmentId;
    let localSubject;
    let localClass;

    beforeAll(async () => {
      // Seed a local subject and class for testing assignments
      localSubject = await Subject.create({ name: "Math Test Assignment", description: "Math description" });
      localClass = await Class.create({
        name: "10A10-Test",
        gradeRef: sampleGrade._id,
        homeroomTeacherRef: sampleTeacher._id,
        schoolYear: "2025-2026"
      });
    });

    afterAll(async () => {
      await Subject.deleteOne({ _id: localSubject._id });
      await Class.deleteOne({ _id: localClass._id });
    });

    test("Admin can create a valid TeachingAssignment using alias fields", async () => {
      const response = await request
        .post("/api/v1/academic/teaching-assignments")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          teacher: sampleTeacher._id,
          class: localClass._id,
          subject: localSubject._id
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.teacherRef).toBe(sampleTeacher._id.toString());
      expect(response.body.data.classRef).toBe(localClass._id.toString());
      expect(response.body.data.subjectRef).toBe(localSubject._id.toString());
      createdAssignmentId = response.body.data._id;
    });

    test("Prevent duplicate teaching assignment for same class and subject", async () => {
      const response = await request
        .post("/api/v1/academic/teaching-assignments")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          teacher: sampleTeacher._id,
          class: localClass._id,
          subject: localSubject._id
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("đã được phân công");
    });

    test("Prevent assigning a non-teacher role as teacher", async () => {
      const anotherSubject = await Subject.create({ name: "Physics Test Assignment" });
      const response = await request
        .post("/api/v1/academic/teaching-assignments")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          teacher: studentUser._id, // Student
          class: localClass._id,
          subject: anotherSubject._id
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("phải có vai trò là giáo viên");
      await Subject.deleteOne({ _id: anotherSubject._id });
    });

    test("Fails if teacher, class, or subject is not found", async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request
        .post("/api/v1/academic/teaching-assignments")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          teacher: nonExistentId,
          class: localClass._id,
          subject: localSubject._id
        });

      expect(response.status).toBe(404);
    });

    test("Students/Teachers cannot create, update, or delete teaching assignments", async () => {
      // Create test
      let res = await request
        .post("/api/v1/academic/teaching-assignments")
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({ teacher: sampleTeacher._id, class: localClass._id, subject: localSubject._id });
      expect(res.status).toBe(403);

      // Update test
      res = await request
        .put(`/api/v1/academic/teaching-assignments/${createdAssignmentId}`)
        .set("Authorization", `Bearer ${studentToken}`)
        .send({ teacher: teacherUser._id });
      expect(res.status).toBe(403);

      // Delete test
      res = await request
        .delete(`/api/v1/academic/teaching-assignments/${createdAssignmentId}`)
        .set("Authorization", `Bearer ${teacherToken}`);
      expect(res.status).toBe(403);
    });

    test("Teachers/Students can retrieve teaching assignments list", async () => {
      const sampleTeacherToken = generateAccessToken(sampleTeacher);
      const response = await request
        .get("/api/v1/academic/teaching-assignments")
        .set("Authorization", `Bearer ${sampleTeacherToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    });

    test("Admin can update teaching assignment", async () => {
      const response = await request
        .put(`/api/v1/academic/teaching-assignments/${createdAssignmentId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          teacher: teacherUser._id
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.teacherRef._id).toBe(teacherUser._id.toString());
    });

    test("Prevent deletion if classroom assignments (Assignments) are linked", async () => {
      const Assignment = require("../src/models/Assignment");
      const dummyAssignment = await Assignment.create({
        teachingAssignmentRef: createdAssignmentId,
        title: "Test Assignment",
        dueDate: new Date(Date.now() + 86400000)
      });

      const response = await request
        .delete(`/api/v1/academic/teaching-assignments/${createdAssignmentId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("bài tập lớp học được liên kết");

      // Cleanup
      await Assignment.deleteOne({ _id: dummyAssignment._id });
    });

    test("Prevent deletion if exams are linked", async () => {
      const Exam = require("../src/models/Exam");
      const dummyExam = await Exam.create({
        teachingAssignmentRef: createdAssignmentId,
        title: "Test Exam",
        duration: 45
      });

      const response = await request
        .delete(`/api/v1/academic/teaching-assignments/${createdAssignmentId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("đề thi được liên kết");

      // Cleanup
      await Exam.deleteOne({ _id: dummyExam._id });
    });

    test("Admin can delete teaching assignment if unlinked", async () => {
      const response = await request
        .delete(`/api/v1/academic/teaching-assignments/${createdAssignmentId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const findCheck = await TeachingAssignment.findById(createdAssignmentId);
      expect(findCheck).toBeNull();
    });
  });

  describe("Student Class Transfer & ClassHistory API", () => {
    let testClass1, testClass2, testStudent1, testStudent2;

    beforeAll(async () => {
      // Create 2 test classes
      testClass1 = await Class.create({
        name: "10A1_TRANSFER",
        gradeRef: sampleGrade._id,
        homeroomTeacherRef: sampleTeacher._id,
        schoolYear: "2025-2026",
      });

      const teacher2 = await User.create({
        name: "Homeroom Teacher 2",
        email: "homeroom2@edulms.edu",
        password: "password123",
        role: "teacher",
        teacherCode: "GV-0099",
        isActivated: true,
      });

      testClass2 = await Class.create({
        name: "10A2_TRANSFER",
        gradeRef: sampleGrade._id,
        homeroomTeacherRef: teacher2._id,
        schoolYear: "2025-2026",
      });

      // Create test students
      testStudent1 = await User.create({
        name: "Transfer Student 1",
        email: "student_transfer1@edulms.edu",
        password: "password123",
        role: "student",
        studentCode: "HS-TR01",
        classRef: testClass1._id,
        isActivated: true,
      });

      testStudent2 = await User.create({
        name: "Transfer Student 2",
        email: "student_transfer2@edulms.edu",
        password: "password123",
        role: "student",
        studentCode: "HS-TR02",
        classRef: testClass1._id,
        isActivated: true,
      });
    });

    test("Admin can transfer a student from Class 1 to Class 2 and record ClassHistory", async () => {
      const response = await request
        .post("/api/v1/academic/classes/transfer")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          studentRef: testStudent1._id,
          toClassRef: testClass2._id,
          reason: "Chuyển lớp theo nguyện vọng",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.studentRef._id).toBe(testStudent1._id.toString());
      expect(response.body.data.fromClassRef._id).toBe(testClass1._id.toString());
      expect(response.body.data.toClassRef._id).toBe(testClass2._id.toString());
      expect(response.body.data.reason).toBe("Chuyển lớp theo nguyện vọng");

      // Verify User record updated in DB
      const updatedUser = await User.findById(testStudent1._id);
      expect(updatedUser.classRef.toString()).toBe(testClass2._id.toString());

      // Verify ClassHistory recorded
      const history = await ClassHistory.findOne({ studentRef: testStudent1._id });
      expect(history).not.toBeNull();
      expect(history.fromClassRef.toString()).toBe(testClass1._id.toString());
      expect(history.toClassRef.toString()).toBe(testClass2._id.toString());
    });

    test("Should reject transfer if transferring to the same class", async () => {
      const response = await request
        .post("/api/v1/academic/classes/transfer")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          studentRef: testStudent1._id,
          toClassRef: testClass2._id,
          reason: "Duplicate transfer test",
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("đã thuộc lớp học này");
    });

    test("Non-admin user cannot transfer student", async () => {
      const response = await request
        .post("/api/v1/academic/classes/transfer")
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({
          studentRef: testStudent2._id,
          toClassRef: testClass2._id,
          reason: "Unauthorized transfer",
        });

      expect(response.status).toBe(403);
    });

    test("Admin can batch transfer students to new class", async () => {
      const response = await request
        .post("/api/v1/academic/classes/batch-transfer")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          studentRefs: [testStudent2._id.toString()],
          toClassRef: testClass2._id.toString(),
          reason: "Điều chuyển hàng loạt",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.successCount).toBe(1);

      const updatedUser2 = await User.findById(testStudent2._id);
      expect(updatedUser2.classRef.toString()).toBe(testClass2._id.toString());
    });

    test("Can fetch transfer history", async () => {
      const response = await request
        .get("/api/v1/academic/classes/transfer-history")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Student Scoped Class & Subject Access Restrictions", () => {
    let assignedClass, unassignedClass, assignedSubject, unassignedSubject, scopedStudent, scopedStudentToken;

    beforeEach(async () => {
      assignedClass = await Class.create({
        name: "11A1",
        gradeRef: sampleGrade._id,
        homeroomTeacherRef: sampleTeacher._id,
        schoolYear: "2025-2026",
      });

      unassignedClass = await Class.create({
        name: "11A2",
        gradeRef: sampleGrade._id,
        homeroomTeacherRef: sampleTeacher._id,
        schoolYear: "2025-2026",
      });

      assignedSubject = await Subject.create({ name: "Sinh học 11" });
      unassignedSubject = await Subject.create({ name: "Hóa học 11" });

      await TeachingAssignment.create({
        teacherRef: sampleTeacher._id,
        classRef: assignedClass._id,
        subjectRef: assignedSubject._id,
      });

      scopedStudent = await User.create({
        name: "Scoped Student",
        email: "scopedstudent@edulms.edu",
        password: "password123",
        role: "student",
        studentCode: "HS-8888",
        classRef: assignedClass._id,
        isActivated: true,
      });
      scopedStudentToken = generateAccessToken(scopedStudent);
    });

    test("Student can only see assigned class in GET /classes", async () => {
      const response = await request
        .get("/api/v1/academic/classes")
        .set("Authorization", `Bearer ${scopedStudentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0]._id.toString()).toBe(assignedClass._id.toString());
    });

    test("Student receives 403 when requesting an unassigned class ID in GET /classes/:id", async () => {
      const response = await request
        .get(`/api/v1/academic/classes/${unassignedClass._id}`)
        .set("Authorization", `Bearer ${scopedStudentToken}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toContain("Học sinh không có quyền truy cập lớp học này");
    });

    test("Student can only see assigned subjects in GET /subjects", async () => {
      const response = await request
        .get("/api/v1/academic/subjects")
        .set("Authorization", `Bearer ${scopedStudentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].name).toBe("Sinh học 11");
    });

    test("Student receives 403 when requesting an unassigned subject ID in GET /subjects/:id", async () => {
      const response = await request
        .get(`/api/v1/academic/subjects/${unassignedSubject._id}`)
        .set("Authorization", `Bearer ${scopedStudentToken}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toContain("không thuộc chương trình được phân công");
    });
  });
});
