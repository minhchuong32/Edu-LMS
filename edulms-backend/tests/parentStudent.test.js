require("dotenv").config();
const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../src/app");
const User = require("../src/models/User");
const { generateAccessToken } = require("../src/utils/jwt");

let testMongoUri = process.env.MONGO_URI;
if (testMongoUri && testMongoUri.includes("/?")) {
  testMongoUri = testMongoUri.replace("/?", "/edulms_test_parentstudent?");
} else if (testMongoUri && testMongoUri.includes("?")) {
  testMongoUri = testMongoUri.replace("?", "/edulms_test_parentstudent?");
} else {
  testMongoUri = (testMongoUri || "mongodb://localhost:27017") + "/edulms_test_parentstudent";
}

jest.setTimeout(30000);

describe("Parent-Student Relationship & Authorization Integration Tests", () => {
  let adminUser, adminToken;
  let teacherUser, teacherToken;
  let studentUser1, studentToken1;
  let studentUser2, studentToken2;
  let parentUser1, parentToken1;
  let parentUser2, parentToken2;

  beforeAll(async () => {
    await mongoose.connect(testMongoUri);

    // 1. Create Admin
    adminUser = await User.create({
      name: "Admin User",
      email: "admin_ps_test@edulms.edu",
      password: "password123",
      role: "admin",
      isActivated: true,
    });
    adminToken = generateAccessToken(adminUser);

    // 2. Create Teacher
    teacherUser = await User.create({
      name: "Teacher User",
      email: "teacher_ps_test@edulms.edu",
      password: "password123",
      role: "teacher",
      teacherCode: "GV-9991",
      isActivated: true,
    });
    teacherToken = generateAccessToken(teacherUser);

    // 3. Create Student 1 & Student 2
    studentUser1 = await User.create({
      name: "Student One",
      email: "student1_ps_test@edulms.edu",
      password: "password123",
      role: "student",
      studentCode: "HS-9991",
      isActivated: true,
    });
    studentToken1 = generateAccessToken(studentUser1);

    studentUser2 = await User.create({
      name: "Student Two",
      email: "student2_ps_test@edulms.edu",
      password: "password123",
      role: "student",
      studentCode: "HS-9992",
      isActivated: true,
    });
    studentToken2 = generateAccessToken(studentUser2);

    // 4. Create Parent 1 (linked to Student 1)
    parentUser1 = await User.create({
      name: "Parent One",
      email: "parent1_ps_test@edulms.edu",
      password: "password123",
      role: "parent",
      relationship: "father",
      childrenRefs: [studentUser1._id],
      isActivated: true,
    });
    parentToken1 = generateAccessToken(parentUser1);

    // 5. Create Parent 2 (linked to Student 2)
    parentUser2 = await User.create({
      name: "Parent Two",
      email: "parent2_ps_test@edulms.edu",
      password: "password123",
      role: "parent",
      relationship: "mother",
      childrenRefs: [studentUser2._id],
      isActivated: true,
    });
    parentToken2 = generateAccessToken(parentUser2);
  });

  afterAll(async () => {
    await User.deleteMany({
      email: {
        $in: [
          "admin_ps_test@edulms.edu",
          "teacher_ps_test@edulms.edu",
          "student1_ps_test@edulms.edu",
          "student2_ps_test@edulms.edu",
          "parent1_ps_test@edulms.edu",
          "parent2_ps_test@edulms.edu",
        ],
      },
    });
    await mongoose.connection.close();
  });

  describe("Authentication Isolation (No Embedded Parents)", () => {
    test("POST /api/v1/auth/login should NOT return parents array", async () => {
      const response = await request(app).post("/api/v1/auth/login").send({
        email: "student1_ps_test@edulms.edu",
        password: "password123",
      });

      expect(response.status).toBe(200);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.parents).toBeUndefined();
    });

    test("GET /api/v1/auth/me should NOT return parents array", async () => {
      const response = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${studentToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.parents).toBeUndefined();
    });
  });

  describe("GET /api/v1/students/:studentId/parents Authorization", () => {
    test("Admin can view parents of any student", async () => {
      const response = await request(app)
        .get(`/api/v1/students/${studentUser1._id}/parents`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].email).toBe("parent1_ps_test@edulms.edu");
    });

    test("Student 1 can view parents of Student 1 (self)", async () => {
      const response = await request(app)
        .get(`/api/v1/students/${studentUser1._id}/parents`)
        .set("Authorization", `Bearer ${studentToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].name).toBe("Parent One");
    });

    test("Student 1 receives 403 when attempting to view parents of Student 2", async () => {
      const response = await request(app)
        .get(`/api/v1/students/${studentUser2._id}/parents`)
        .set("Authorization", `Bearer ${studentToken1}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toContain("không có quyền");
    });

    test("Parent 1 can view parents of their child (Student 1)", async () => {
      const response = await request(app)
        .get(`/api/v1/students/${studentUser1._id}/parents`)
        .set("Authorization", `Bearer ${parentToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(1);
    });

    test("Parent 1 receives 403 when attempting to view Student 2 (not their child)", async () => {
      const response = await request(app)
        .get(`/api/v1/students/${studentUser2._id}/parents`)
        .set("Authorization", `Bearer ${parentToken1}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toContain("không có quyền");
    });
  });

  describe("POST /api/v1/students/:studentId/parents Linking & Authorization", () => {
    test("Admin can link Parent 2 to Student 1", async () => {
      const response = await request(app)
        .post(`/api/v1/students/${studentUser1._id}/parents`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          parentId: parentUser2._id,
          relationship: "mother",
        });

      expect(response.status).toBe(201);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(2);
    });

    test("Admin linking duplicate Parent 2 to Student 1 returns 409 Conflict", async () => {
      const response = await request(app)
        .post(`/api/v1/students/${studentUser1._id}/parents`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          parentId: parentUser2._id,
          relationship: "mother",
        });

      expect(response.status).toBe(409);
      expect(response.body.message).toContain("đã được liên kết");
    });

    test("Student cannot self-link parent (403 Forbidden)", async () => {
      const response = await request(app)
        .post(`/api/v1/students/${studentUser1._id}/parents`)
        .set("Authorization", `Bearer ${studentToken1}`)
        .send({
          parentId: parentUser2._id,
          relationship: "mother",
        });

      expect(response.status).toBe(403);
    });

    test("Parent cannot self-link to student (403 Forbidden)", async () => {
      const response = await request(app)
        .post(`/api/v1/students/${studentUser2._id}/parents`)
        .set("Authorization", `Bearer ${parentToken1}`)
        .send({
          parentId: parentUser1._id,
          relationship: "father",
        });

      expect(response.status).toBe(403);
    });

    test("Linking non-parent user returns 400 Bad Request", async () => {
      const response = await request(app)
        .post(`/api/v1/students/${studentUser1._id}/parents`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          parentId: teacherUser._id,
          relationship: "guardian",
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("không phải là phụ huynh");
    });
  });

  describe("DELETE /api/v1/students/:studentId/parents/:parentId Unlinking & Authorization", () => {
    test("Student cannot unlink parent (403 Forbidden)", async () => {
      const response = await request(app)
        .delete(`/api/v1/students/${studentUser1._id}/parents/${parentUser2._id}`)
        .set("Authorization", `Bearer ${studentToken1}`);

      expect(response.status).toBe(403);
    });

    test("Admin can unlink Parent 2 from Student 1", async () => {
      const response = await request(app)
        .delete(`/api/v1/students/${studentUser1._id}/parents/${parentUser2._id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(1);
    });

    test("Unlinking non-existing relationship returns 404 Not Found", async () => {
      const response = await request(app)
        .delete(`/api/v1/students/${studentUser1._id}/parents/${parentUser2._id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toContain("không tồn tại");
    });
  });

  describe("GET /api/v1/parents/me/children Authorization", () => {
    test("Parent 1 gets their own children (Student 1)", async () => {
      const response = await request(app)
        .get("/api/v1/parents/me/children")
        .set("Authorization", `Bearer ${parentToken1}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0]._id.toString()).toBe(studentUser1._id.toString());
    });

    test("Student receives 403 when calling /api/v1/parents/me/children", async () => {
      const response = await request(app)
        .get("/api/v1/parents/me/children")
        .set("Authorization", `Bearer ${studentToken1}`);

      expect(response.status).toBe(403);
    });
  });
});
