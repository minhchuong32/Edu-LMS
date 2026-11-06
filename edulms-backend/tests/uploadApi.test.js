const express = require("express");
const request = require("supertest");
const mongoose = require("mongoose");
const uploadRoutes = require("../src/routes/upload.routes");
const { errorHandler } = require("../src/middlewares/error.middleware");
const LessonContent = require("../src/models/LessonContent");

// 1. Quản lý trạng thái Auth mock để test được cả lúc login và chưa login
let mockCurrentUser = {
  _id: "user_123",
  role: "teacher",
  email: "teacher@edulms.edu.vn",
};

jest.mock("../src/middlewares/auth.middleware", () => ({
  protect: (req, res, next) => {
    if (!mockCurrentUser) {
      return res.status(401).json({
        success: false,
        message: "Vui lòng đăng nhập để thực hiện chức năng này",
      });
    }
    req.user = mockCurrentUser;
    next();
  },
  authorize: () => (req, res, next) => next(),
}));

// 2. Mock Cloudinary config
jest.mock("../src/config/cloudinary", () => {
  const actual = jest.requireActual("../src/config/cloudinary");
  return {
    ...actual,
    isCloudinaryConfigured: jest.fn().mockReturnValue(true),
    uploadFileToCloudinary: jest.fn().mockImplementation(async (file) => {
      const storageConfig = actual.getFileStorageConfig(file);
      if (!storageConfig) {
        const err = new Error("Định dạng không hỗ trợ");
        err.statusCode = 415;
        throw err;
      }
      const isRaw = storageConfig.resourceType === "raw";
      const safePublicId = actual.buildPublicId(
        file.originalname,
        storageConfig.resourceType
      );
      const publicId = `${storageConfig.folder}/${safePublicId}`;
      return {
        url: `https://res.cloudinary.com/edulms_cloud/${storageConfig.resourceType}/upload/v1730902800/${publicId}`,
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

// 3. Khởi tạo Buffer hợp lệ theo chữ ký magic bytes thực tế
const OLE = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
const oleBuffer = (streamName) =>
  Buffer.concat([
    OLE,
    Buffer.alloc(504),
    Buffer.from(streamName, "utf16le"),
    Buffer.alloc(64),
  ]);
const zipBuffer = (...entries) =>
  Buffer.concat([
    Buffer.from([0x50, 0x4b, 0x03, 0x04]),
    Buffer.alloc(26),
    ...entries.map((e) => Buffer.from(e)),
    Buffer.alloc(32),
  ]);

const SAMPLES = {
  pdf: () => Buffer.from("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF", "latin1"),
  doc: () => oleBuffer("WordDocument"),
  docx: () => zipBuffer("[Content_Types].xml", "word/document.xml"),
  xls: () => oleBuffer("Workbook"),
  xlsx: () => zipBuffer("[Content_Types].xml", "xl/workbook.xml"),
  csv: () => Buffer.from("\uFEFFMã,Họ tên,Điểm\n001,Nguyễn Văn A,10\n", "utf8"),
  ppt: () => oleBuffer("PowerPoint Document"),
  pptx: () => zipBuffer("[Content_Types].xml", "ppt/presentation.xml"),
  zip: () => zipBuffer("tailieu/readme.txt"),
  rar: () =>
    Buffer.concat([
      Buffer.from([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x01, 0x00]),
      Buffer.alloc(32),
    ]),
  "7z": () =>
    Buffer.concat([
      Buffer.from([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c]),
      Buffer.alloc(32),
    ]),
  jpg: () =>
    Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32)]),
  jpeg: () =>
    Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32)]),
  png: () =>
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.alloc(32),
    ]),
  webp: () =>
    Buffer.concat([
      Buffer.from("RIFF"),
      Buffer.alloc(4),
      Buffer.from("WEBPVP8 "),
      Buffer.alloc(32),
    ]),
  mp4: () => {
    const b = Buffer.alloc(64);
    b.write("ftyp", 4, "latin1");
    b.write("isom", 8, "latin1");
    return b;
  },
  mov: () => {
    const b = Buffer.alloc(64);
    b.write("ftyp", 4, "latin1");
    b.write("qt  ", 8, "latin1");
    return b;
  },
  webm: () =>
    Buffer.concat([
      Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x82, 0x84]),
      Buffer.from("webm"),
      Buffer.alloc(32),
    ]),
  exe: () => Buffer.concat([Buffer.from("MZ"), Buffer.alloc(64)]),
};

const MIMES = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  zip: "application/zip",
  rar: "application/vnd.rar",
  "7z": "application/x-7z-compressed",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
};

const MB = 1024 * 1024;
const padTo = (buf, targetSize) =>
  Buffer.concat([buf, Buffer.alloc(Math.max(0, targetSize - buf.length))]);

describe("Kiểm thử toàn diện API Upload & Tích hợp Cloudinary", () => {
  const app = buildApp();
  const {
    isCloudinaryConfigured,
    uploadFileToCloudinary,
  } = require("../src/config/cloudinary");

  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentUser = {
      _id: "user_123",
      role: "teacher",
      email: "teacher@edulms.edu.vn",
    };
    isCloudinaryConfigured.mockReturnValue(true);
  });

  // ==========================================
  // PHẦN 1: KIỂM THỬ TẤT CẢ CÁC ĐỊNH DẠNG HỢP LỆ
  // ==========================================
  describe("1. Kiểm thử định dạng hợp lệ", () => {
    it.each([
      // Tài liệu
      ["giao-trinh.pdf", "pdf", "pdf", "document", "raw"],
      ["bai-tap.doc", "doc", "doc", "document", "raw"],
      ["de-cuong.docx", "docx", "docx", "document", "raw"],
      // Bảng tính
      ["danh-sach.xls", "xls", "xls", "spreadsheet", "raw"],
      ["bang-diem.xlsx", "xlsx", "xlsx", "spreadsheet", "raw"],
      ["du-lieu.csv", "csv", "csv", "spreadsheet", "raw"],
      // Trình chiếu
      ["bai-giang.ppt", "ppt", "ppt", "presentation", "raw"],
      ["thuyet-trinh.pptx", "pptx", "pptx", "presentation", "raw"],
      // File nén
      ["source-code.zip", "zip", "zip", "archive", "raw"],
      ["tai-nguyen.rar", "rar", "rar", "archive", "raw"],
      ["du-lieu-lon.7z", "7z", "7z", "archive", "raw"],
      // Hình ảnh
      ["anh-dai-dien.jpg", "jpg", "jpg", "image", "image"],
      ["hinh-anh.jpeg", "jpeg", "jpeg", "image", "image"],
      ["so-do.png", "png", "png", "image", "image"],
      ["banner.webp", "webp", "webp", "image", "image"],
      // Video
      ["bai-hoc.mp4", "mp4", "mp4", "video", "video"],
      ["huong-dan.mov", "mov", "mov", "video", "video"],
      ["quay-man-hinh.webm", "webm", "webm", "video", "video"],
    ])(
      "upload thành công %s (%s) -> nhóm: %s, resourceType: %s",
      async (
        filename,
        sampleKey,
        mimeKey,
        expectedCategory,
        expectedResourceType
      ) => {
        const buffer = SAMPLES[sampleKey]();
        const res = await request(app)
          .post("/api/v1/upload")
          .attach("file", buffer, { filename, contentType: MIMES[mimeKey] });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe("Tải lên tập tin thành công");
        expect(res.body.originalName).toBe(filename);
        expect(res.body.fileType).toBe(expectedCategory);
        expect(res.body.resourceType).toBe(expectedResourceType);
        expect(res.body.url).toContain(expectedResourceType);
        expect(res.body.publicId).toBeDefined();
        expect(res.body.fileName).toBeDefined();
      }
    );
  });

  // ==========================================
  // PHẦN 2: KIỂM THỬ GIỚI HẠN DUNG LƯỢNG
  // ==========================================
  describe("2. Kiểm thử giới hạn dung lượng", () => {
    it("từ chối tài liệu (PDF) vượt quá 10MB -> 413", async () => {
      const bigPdf = padTo(SAMPLES.pdf(), 10 * MB + 1024);
      const res = await request(app)
        .post("/api/v1/upload")
        .attach("file", bigPdf, {
          filename: "tai-lieu-lon.pdf",
          contentType: MIMES.pdf,
        });

      expect(res.status).toBe(413);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/vượt quá giới hạn tối đa cho phép/);
      expect(res.body.message).toContain("10MB");
    });

    it("từ chối file nén (ZIP) vượt quá 20MB -> 413", async () => {
      const bigZip = padTo(SAMPLES.zip(), 20 * MB + 1024);
      const res = await request(app)
        .post("/api/v1/upload")
        .attach("file", bigZip, {
          filename: "backup.zip",
          contentType: MIMES.zip,
        });

      expect(res.status).toBe(413);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("20MB");
    });

    it("từ chối hình ảnh (PNG) vượt quá 5MB -> 413", async () => {
      const bigPng = padTo(SAMPLES.png(), 5 * MB + 1024);
      const res = await request(app)
        .post("/api/v1/upload")
        .attach("file", bigPng, {
          filename: "anh-goc.png",
          contentType: MIMES.png,
        });

      expect(res.status).toBe(413);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("5MB");
    });

    it("từ chối video (MP4) vượt quá 30MB -> 413", async () => {
      const bigVideo = padTo(SAMPLES.mp4(), 30 * MB + 1024);
      const res = await request(app)
        .post("/api/v1/upload")
        .attach("file", bigVideo, {
          filename: "video-dai.mp4",
          contentType: MIMES.mp4,
        });

      expect(res.status).toBe(413);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("30MB");
    });
  });

  // ==========================================
  // PHẦN 3: KIỂM THỬ LỖI VÀ BẢO MẬT
  // ==========================================
  describe("3. Kiểm thử lỗi và bảo mật", () => {
    it("từ chối file không nằm trong danh sách cho phép (.exe, .bat, .sh) -> 415", async () => {
      const res = await request(app)
        .post("/api/v1/upload")
        .attach("file", SAMPLES.exe(), {
          filename: "trojan.exe",
          contentType: "application/x-msdownload",
        });

      expect(res.status).toBe(415);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/không được hỗ trợ/);
    });

    it("từ chối file giả mạo phần mở rộng (file EXE đổi tên thành .pdf) -> 415", async () => {
      const res = await request(app)
        .post("/api/v1/upload")
        .attach("file", SAMPLES.exe(), {
          filename: "bao-cao-tai-chinh.pdf",
          contentType: MIMES.pdf,
        });

      expect(res.status).toBe(415);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/giả mạo định dạng/);
    });

    it("từ chối MIME type không phù hợp (gửi header image/png cho file PDF) -> 415", async () => {
      const res = await request(app)
        .post("/api/v1/upload")
        .attach("file", SAMPLES.pdf(), {
          filename: "tai-lieu.pdf",
          contentType: "image/png",
        });

      expect(res.status).toBe(415);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Định dạng tập tin không hợp lệ/);
    });

    it("từ chối khi client không gửi file trong request -> 400", async () => {
      const res = await request(app)
        .post("/api/v1/upload")
        .field("title", "Không có file");

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Vui lòng chọn tập tin để upload/);
    });

    it("xử lý an toàn khi Cloudinary bị lỗi mạng/kết nối -> 500 không lộ secret", async () => {
      uploadFileToCloudinary.mockRejectedValueOnce(
        new Error("Cloudinary API connection timeout")
      );

      const res = await request(app)
        .post("/api/v1/upload")
        .attach("file", SAMPLES.pdf(), {
          filename: "test.pdf",
          contentType: MIMES.pdf,
        });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Cloudinary API connection timeout");
      // Tuyệt đối không để lộ key hay secret
      expect(JSON.stringify(res.body)).not.toContain("CLOUDINARY_API_SECRET");
    });

    it("chặn người dùng chưa đăng nhập (không có JWT) -> 401", async () => {
      mockCurrentUser = null; // Giả lập chưa login
      const res = await request(app)
        .post("/api/v1/upload")
        .attach("file", SAMPLES.pdf(), {
          filename: "test.pdf",
          contentType: MIMES.pdf,
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Vui lòng đăng nhập/);
    });

    it("chuẩn hóa an toàn tên file chứa tiếng Việt có dấu và ký tự đặc biệt", async () => {
      const strangeName = "Đề Cương & Bài Giảng (HK1) - 2026 #Toán @!.pdf";
      const res = await request(app)
        .post("/api/v1/upload")
        .attach("file", SAMPLES.pdf(), {
          filename: strangeName,
          contentType: MIMES.pdf,
        });

      expect(res.status).toBe(200);
      expect(res.body.originalName).toBe(strangeName);
      // PublicId đã được chuẩn hóa không còn dấu và ký tự đặc biệt
      expect(res.body.publicId).toMatch(/de-cuong-bai-giang-hk1-2026-toan/);
      expect(res.body.publicId).not.toContain("&");
      expect(res.body.publicId).not.toContain("@");
    });
  });

  // ==========================================
  // PHẦN 4: KIỂM THỬ KHẢ NĂNG LƯU VÀO LESSONCONTENT
  // ==========================================
  describe("4. Tích hợp: Lưu URL vào Model LessonContent", () => {
    it("URL trả về từ upload hợp lệ với validator resourceUrl của LessonContent", async () => {
      // Giả lập upload 1 video
      const res = await request(app)
        .post("/api/v1/upload")
        .attach("file", SAMPLES.mp4(), {
          filename: "bai-1-menh-de.mp4",
          contentType: MIMES.mp4,
        });

      expect(res.status).toBe(200);
      const returnedUrl = res.body.url;

      // Khởi tạo LessonContent với resourceUrl này
      const lessonDoc = new LessonContent({
        title: "Bài 1: Mệnh Đề Toán Học",
        description: "Video bài giảng chi tiết",
        contentType: "video",
        resourceUrl: returnedUrl,
        order: 1,
        teachingAssignment: new mongoose.Types.ObjectId(),
      });

      // Validate schema
      const validationError = lessonDoc.validateSync();
      expect(validationError).toBeUndefined();
      expect(lessonDoc.resourceUrl).toBe(returnedUrl);
    });

    it("URL trả về từ upload tài liệu PDF hợp lệ khi tạo LessonContent dạng pdf", async () => {
      const res = await request(app)
        .post("/api/v1/upload")
        .attach("file", SAMPLES.pdf(), {
          filename: "tai-lieu.pdf",
          contentType: MIMES.pdf,
        });

      expect(res.status).toBe(200);
      const returnedUrl = res.body.url;

      const lessonDoc = new LessonContent({
        title: "Tài liệu ôn tập Chương 1",
        contentType: "pdf",
        resourceUrl: returnedUrl,
        order: 2,
        teachingAssignment: new mongoose.Types.ObjectId(),
      });

      const validationError = lessonDoc.validateSync();
      expect(validationError).toBeUndefined();
      expect(lessonDoc.resourceUrl).toBe(returnedUrl);
    });
  });
});
