const express = require("express");
const request = require("supertest");
const uploadRoutes = require("../src/routes/upload.routes");
const { errorHandler } = require("../src/middlewares/error.middleware");

// Mock middleware protect để giả lập user đã đăng nhập
jest.mock("../src/middlewares/auth.middleware", () => ({
  protect: (req, res, next) => {
    req.user = {
      _id: "user_123",
      role: "teacher",
      email: "teacher@edulms.edu.vn",
    };
    next();
  },
  authorize: () => (req, res, next) => next(),
}));

// Mock Cloudinary config
jest.mock("../src/config/cloudinary", () => {
  const actual = jest.requireActual("../src/config/cloudinary");
  return {
    ...actual,
    isCloudinaryConfigured: jest.fn().mockReturnValue(true),
    uploadFileToCloudinary: jest.fn().mockImplementation(async (file) => {
      const storageConfig = actual.getFileStorageConfig(file);
      const isRaw = storageConfig.resourceType === "raw";
      const publicId = `${storageConfig.folder}/test-file-123${isRaw ? storageConfig.extension : ""}`;
      return {
        url: `https://res.cloudinary.com/demo/${storageConfig.resourceType}/upload/${publicId}`,
        publicId,
        resourceType: storageConfig.resourceType,
        folder: storageConfig.folder,
        category: storageConfig.category,
        format: storageConfig.extension.replace(".", ""),
        bytes: file.buffer.length,
        originalName: file.originalname,
      };
    }),
  };
});

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use("/api/v1/upload", uploadRoutes);
  app.use(errorHandler);
  return app;
};

// Mẫu Buffer cho các loại file
const pdfBuffer = Buffer.from(
  "%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF",
  "latin1"
);
const mp4Buffer = () => {
  const b = Buffer.alloc(64);
  b.write("ftyp", 4, "latin1");
  b.write("isom", 8, "latin1");
  return b;
};
const pngBuffer = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(32),
]);
const zipBuffer = Buffer.concat([
  Buffer.from([0x50, 0x4b, 0x03, 0x04]),
  Buffer.alloc(32),
]);

describe("API Upload Routes & Controller Unit Tests", () => {
  const app = buildApp();
  const {
    isCloudinaryConfigured,
    uploadFileToCloudinary,
  } = require("../src/config/cloudinary");

  beforeEach(() => {
    jest.clearAllMocks();
    isCloudinaryConfigured.mockReturnValue(true);
  });

  describe("POST /api/v1/upload (Tất cả định dạng hợp lệ)", () => {
    it("upload thành công file PDF và trả về đầy đủ các trường theo yêu cầu", async () => {
      const res = await request(app)
        .post("/api/v1/upload")
        .attach("file", pdfBuffer, {
          filename: "giao-trinh-toan.pdf",
          contentType: "application/pdf",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Tải lên tập tin thành công");
      expect(res.body.originalName).toBe("giao-trinh-toan.pdf");
      expect(res.body.fileName).toMatch(/test-file-123\.pdf/);
      expect(res.body.fileType).toBe("document");
      expect(res.body.fileSize).toBe(pdfBuffer.length);
      expect(res.body.url).toContain("https://res.cloudinary.com");
      expect(res.body.publicId).toBe("edulms/documents/test-file-123.pdf");
      expect(res.body.resourceType).toBe("raw");
      expect(res.body.format).toBe("pdf");
    });

    it("upload thành công file video MP4 và trả về resourceType là 'video'", async () => {
      const video = mp4Buffer();
      const res = await request(app)
        .post("/api/v1/upload")
        .attach("file", video, {
          filename: "bai-giang-so-1.mp4",
          contentType: "video/mp4",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.fileType).toBe("video");
      expect(res.body.resourceType).toBe("video");
      expect(res.body.format).toBe("mp4");
      expect(res.body.url).toContain("video/upload");
    });

    it("upload thành công file hình ảnh PNG và trả về resourceType là 'image'", async () => {
      const res = await request(app)
        .post("/api/v1/upload")
        .attach("file", pngBuffer, {
          filename: "so-do.png",
          contentType: "image/png",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.fileType).toBe("image");
      expect(res.body.resourceType).toBe("image");
      expect(res.body.format).toBe("png");
    });

    it("upload thành công file nén ZIP và trả về resourceType là 'raw'", async () => {
      const res = await request(app)
        .post("/api/v1/upload")
        .attach("file", zipBuffer, {
          filename: "tai-lieu-tham-khao.zip",
          contentType: "application/zip",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.fileType).toBe("archive");
      expect(res.body.resourceType).toBe("raw");
    });
  });

  describe("Xử lý lỗi và validation", () => {
    it("trả về 400 nếu client không đính kèm file trong request", async () => {
      const res = await request(app)
        .post("/api/v1/upload")
        .field("title", "Không có file đính kèm");

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Vui lòng chọn tập tin/);
    });

    it("trả về 415 nếu client upload file định dạng không được hỗ trợ (.exe)", async () => {
      const exeBuffer = Buffer.concat([Buffer.from("MZ"), Buffer.alloc(64)]);
      const res = await request(app)
        .post("/api/v1/upload")
        .attach("file", exeBuffer, {
          filename: "phan-mem.exe",
          contentType: "application/x-msdownload",
        });

      expect(res.status).toBe(415);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/không được hỗ trợ/);
    });

    it("trả về 415 nếu phát hiện giả mạo file (ví dụ file exe đổi tên thành pdf)", async () => {
      const fakePdf = Buffer.concat([Buffer.from("MZ"), Buffer.alloc(64)]);
      const res = await request(app)
        .post("/api/v1/upload")
        .attach("file", fakePdf, {
          filename: "gia-mao.pdf",
          contentType: "application/pdf",
        });

      expect(res.status).toBe(415);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/giả mạo/);
    });

    it("trả về 500 nếu Cloudinary chưa được cấu hình biến môi trường trên server", async () => {
      isCloudinaryConfigured.mockReturnValue(false);

      const res = await request(app)
        .post("/api/v1/upload")
        .attach("file", pdfBuffer, {
          filename: "tai-lieu.pdf",
          contentType: "application/pdf",
        });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/chưa được cấu hình/);
    });
  });
});
