const mongoose = require("mongoose");
const app = require("../src/app");
const User = require("../src/models/User");
const supertest = require("supertest");
const request = supertest(app);

// Use a separate test database inside the same cluster to avoid polluting development data
let testMongoUri = process.env.MONGO_URI;
if (testMongoUri && testMongoUri.includes("/?")) {
  testMongoUri = testMongoUri.replace("/?", "/edulms_test?");
} else if (testMongoUri && testMongoUri.includes("?")) {
  testMongoUri = testMongoUri.replace("?", "/edulms_test?");
} else {
  testMongoUri = (testMongoUri || "mongodb://localhost:27017") + "/edulms_test";
}

describe("Auth Activation API (POST /api/v1/auth/activate)", () => {
  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(testMongoUri);
  });

  afterAll(async () => {
    // Close DB connection
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear user collection before each test
    await User.deleteMany({});
  });

  test("Should activate account successfully with correct details and hash password", async () => {
    // Create an unactivated student
    const testUser = await User.create({
      name: "Nguyen Van Test",
      email: "teststudent@edulms.edu",
      password: "tempPassword123", // Will be hashed in pre-save hook
      role: "student",
      studentCode: "HS-9999",
      isActivated: false,
    });

    const response = await request
      .post("/api/v1/auth/activate")
      .send({
        code: "HS-9999",
        email: "teststudent@edulms.edu",
        password: "newSecurePassword123",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("Kích hoạt tài khoản thành công.");

    // Verify user update in DB
    const updatedUser = await User.findById(testUser._id);
    expect(updatedUser.isActivated).toBe(true);
    expect(updatedUser.password).not.toBe("newSecurePassword123");
    
    // Verify password is correctly hashed and comparePassword works
    const isMatch = await updatedUser.comparePassword("newSecurePassword123");
    expect(isMatch).toBe(true);
  });

  test("Should support case-insensitive matching for studentCode and teacherCode", async () => {
    // Create an unactivated teacher
    const testUser = await User.create({
      name: "Tran Thi Test",
      email: "testteacher@edulms.edu",
      password: "tempPassword123",
      role: "teacher",
      teacherCode: "GV-8888",
      isActivated: false,
    });

    // Send lowercase code gv-8888 to match uppercase GV-8888
    const response = await request
      .post("/api/v1/auth/activate")
      .send({
        code: "gv-8888",
        email: "testteacher@edulms.edu",
        password: "newSecurePassword123",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    const updatedUser = await User.findById(testUser._id);
    expect(updatedUser.isActivated).toBe(true);
  });

  test("Should block reactivation if account is already activated", async () => {
    // Create an already activated student
    await User.create({
      name: "Nguyen Van Active",
      email: "active@edulms.edu",
      password: "alreadyHashedPassword",
      role: "student",
      studentCode: "HS-7777",
      isActivated: true,
    });

    const response = await request
      .post("/api/v1/auth/activate")
      .send({
        code: "HS-7777",
        email: "active@edulms.edu",
        password: "anotherNewPassword123",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Tài khoản đã được kích hoạt trước đó.");
  });

  test("Should fail activation if student/teacher code does not match email", async () => {
    // Create an unactivated student
    await User.create({
      name: "Nguyen Van Test",
      email: "teststudent@edulms.edu",
      password: "tempPassword123",
      role: "student",
      studentCode: "HS-9999",
      isActivated: false,
    });

    // Mismatched code
    const response = await request
      .post("/api/v1/auth/activate")
      .send({
        code: "HS-1111", // Wrong code
        email: "teststudent@edulms.edu",
        password: "newSecurePassword123",
      });

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("Không tìm thấy tài khoản");
  });

  test("Should fail activation if password is too short (less than 6 chars)", async () => {
    await User.create({
      name: "Nguyen Van Test",
      email: "teststudent@edulms.edu",
      password: "tempPassword123",
      role: "student",
      studentCode: "HS-9999",
      isActivated: false,
    });

    const response = await request
      .post("/api/v1/auth/activate")
      .send({
        code: "HS-9999",
        email: "teststudent@edulms.edu",
        password: "123", // Too short
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Mật khẩu phải chứa ít nhất 6 ký tự.");
  });

  test("Should fail activation if required fields are missing", async () => {
    const response = await request
      .post("/api/v1/auth/activate")
      .send({
        code: "HS-9999",
        email: "", // Missing
        password: "newSecurePassword123",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Vui lòng nhập đầy đủ mã định danh, email và mật khẩu mới.");
  });
});

describe("Auth Activation Verification API (POST /api/v1/auth/verify-activation)", () => {
  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(testMongoUri);
    }
  });

  afterAll(async () => {
    // Close DB connection
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear user collection before each test
    await User.deleteMany({});
  });

  test("Should verify details successfully with correct unactivated details", async () => {
    const testUser = await User.create({
      name: "Nguyen Van Verification",
      email: "verifystudent@edulms.edu",
      password: "tempPassword123",
      role: "student",
      studentCode: "HS-5555",
      isActivated: false,
    });

    const response = await request
      .post("/api/v1/auth/verify-activation")
      .send({
        code: "HS-5555",
        email: "verifystudent@edulms.edu",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe("Nguyen Van Verification");
  });

  test("Should support case-insensitive matching for studentCode", async () => {
    await User.create({
      name: "Tran Thi Verification",
      email: "verifyteacher@edulms.edu",
      password: "tempPassword123",
      role: "teacher",
      teacherCode: "GV-4444",
      isActivated: false,
    });

    const response = await request
      .post("/api/v1/auth/verify-activation")
      .send({
        code: "gv-4444",
        email: "verifyteacher@edulms.edu",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  test("Should fail verification if already activated", async () => {
    await User.create({
      name: "Nguyen Van Active",
      email: "active@edulms.edu",
      password: "alreadyHashedPassword",
      role: "student",
      studentCode: "HS-7777",
      isActivated: true,
    });

    const response = await request
      .post("/api/v1/auth/verify-activation")
      .send({
        code: "HS-7777",
        email: "active@edulms.edu",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Tài khoản đã được kích hoạt trước đó.");
  });

  test("Should fail verification if student/teacher code does not match email", async () => {
    await User.create({
      name: "Nguyen Van Test",
      email: "teststudent@edulms.edu",
      password: "tempPassword123",
      role: "student",
      studentCode: "HS-9999",
      isActivated: false,
    });

    const response = await request
      .post("/api/v1/auth/verify-activation")
      .send({
        code: "HS-1111", // Mismatched code
        email: "teststudent@edulms.edu",
      });

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("Không tìm thấy tài khoản");
  });

  test("Should fail verification if required fields are missing", async () => {
    const response = await request
      .post("/api/v1/auth/verify-activation")
      .send({
        code: "HS-9999",
        email: "",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Vui lòng nhập đầy đủ mã định danh và email.");
  });
});

