require("dotenv").config();
const mongoose = require("mongoose");
const app = require("../src/app");
const User = require("../src/models/User");
const supertest = require("supertest");
const request = supertest(app);
const { generateAccessToken } = require("../src/utils/jwt");

jest.setTimeout(30000);

let testMongoUri = process.env.MONGO_URI;
if (testMongoUri && testMongoUri.includes("/?")) {
  testMongoUri = testMongoUri.replace("/?", "/edulms_test_upload?");
} else if (testMongoUri && testMongoUri.includes("?")) {
  testMongoUri = testMongoUri.replace("?", "/edulms_test_upload?");
} else {
  testMongoUri = (testMongoUri || "mongodb://localhost:27017") + "/edulms_test_upload";
}

describe("Document & Video Cloudinary Upload API Integration Tests", () => {
  let userToken, testUser;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(testMongoUri);
    }

    await User.deleteMany({});

    testUser = await User.create({
      name: "Upload Test User",
      email: "upload_user@edulms.edu",
      password: "password123",
      role: "teacher",
      isActivated: true,
    });
    userToken = generateAccessToken(testUser);
  });

  afterAll(async () => {
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  describe("Authentication", () => {
    test("Should reject unauthenticated upload requests with 401", async () => {
      const res = await request.post("/api/v1/upload/document");
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe("POST /api/v1/upload/document (PDF <= 10MB)", () => {
    test("Should successfully upload valid PDF file under 10MB", async () => {
      const pdfBuffer = Buffer.from("%PDF-1.4 Mock PDF Content");

      const res = await request
        .post("/api/v1/upload/document")
        .set("Authorization", `Bearer ${userToken}`)
        .attach("file", pdfBuffer, {
          filename: "sample_lecture.pdf",
          contentType: "application/pdf",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.url).toBeDefined();
      expect(res.body.data.url).toContain("cloudinary.com");
    });

    test("Should reject non-PDF file uploaded to document endpoint with 400", async () => {
      const txtBuffer = Buffer.from("Plain text content");

      const res = await request
        .post("/api/v1/upload/document")
        .set("Authorization", `Bearer ${userToken}`)
        .attach("file", txtBuffer, {
          filename: "notes.txt",
          contentType: "text/plain",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Chỉ chấp nhận");
    });

    test("Should reject PDF file exceeding 10MB limit with 400", async () => {
      // 10.5 MB buffer
      const oversizedPdfBuffer = Buffer.alloc(10.5 * 1024 * 1024);

      const res = await request
        .post("/api/v1/upload/document")
        .set("Authorization", `Bearer ${userToken}`)
        .attach("file", oversizedPdfBuffer, {
          filename: "huge_book.pdf",
          contentType: "application/pdf",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("không được vượt quá 10MB");
    });
  });

  describe("POST /api/v1/upload/video (Video <= 30MB)", () => {
    test("Should successfully upload valid MP4 video under 30MB", async () => {
      const videoBuffer = Buffer.from("Mock MP4 Video Header Data");

      const res = await request
        .post("/api/v1/upload/video")
        .set("Authorization", `Bearer ${userToken}`)
        .attach("file", videoBuffer, {
          filename: "lesson_1.mp4",
          contentType: "video/mp4",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.url).toBeDefined();
    });

    test("Should reject non-video file uploaded to video endpoint with 400", async () => {
      const pdfBuffer = Buffer.from("%PDF-1.4 Mock PDF Content");

      const res = await request
        .post("/api/v1/upload/video")
        .set("Authorization", `Bearer ${userToken}`)
        .attach("file", pdfBuffer, {
          filename: "file.pdf",
          contentType: "application/pdf",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Chỉ chấp nhận định dạng tệp Video");
    });

    test("Should reject Video file exceeding 30MB limit with 400", async () => {
      // 30.5 MB buffer
      const oversizedVideoBuffer = Buffer.alloc(30.5 * 1024 * 1024);

      const res = await request
        .post("/api/v1/upload/video")
        .set("Authorization", `Bearer ${userToken}`)
        .attach("file", oversizedVideoBuffer, {
          filename: "large_movie.mp4",
          contentType: "video/mp4",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("không được vượt quá 30MB");
    });
  });

  describe("POST /api/v1/upload/media (Generic Media Upload)", () => {
    test("Should upload PDF document via media endpoint", async () => {
      const pdfBuffer = Buffer.from("%PDF-1.4 Mock PDF Content");

      const res = await request
        .post("/api/v1/upload/media")
        .set("Authorization", `Bearer ${userToken}`)
        .attach("file", pdfBuffer, {
          filename: "chapter1.pdf",
          contentType: "application/pdf",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test("Should upload Video via media endpoint", async () => {
      const videoBuffer = Buffer.from("Mock Video Stream");

      const res = await request
        .post("/api/v1/upload/media")
        .set("Authorization", `Bearer ${userToken}`)
        .attach("file", videoBuffer, {
          filename: "chapter1.webm",
          contentType: "video/webm",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test("Should reject unsupported file extension with 400", async () => {
      const exeBuffer = Buffer.from("Binary Executable Data");

      const res = await request
        .post("/api/v1/upload/media")
        .set("Authorization", `Bearer ${userToken}`)
        .attach("file", exeBuffer, {
          filename: "installer.exe",
          contentType: "application/x-msdownload",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Định dạng tệp không được hỗ trợ");
    });
  });
});
