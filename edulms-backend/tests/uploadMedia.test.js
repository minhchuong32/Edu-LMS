const express = require("express");
const request = require("supertest");
const {
  uploadDocument,
  uploadVideo,
  detectPdf,
  detectVideo,
} = require("../src/middlewares/upload.middleware");
const { errorHandler } = require("../src/middlewares/error.middleware");

const MB = 1024 * 1024;

// ---------- Buffer mẫu ----------
const pdfBuffer = () =>
  Buffer.from("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF", "latin1");

const mp4Buffer = (brand = "isom") => {
  const buf = Buffer.alloc(64);
  buf.writeUInt32BE(32, 0);
  buf.write("ftyp", 4, "latin1");
  buf.write(brand, 8, "latin1");
  return buf;
};

const webmBuffer = () =>
  Buffer.concat([
    Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x82, 0x84]),
    Buffer.from("webm"),
    Buffer.alloc(32),
  ]);

const exeBuffer = () =>
  Buffer.concat([Buffer.from("MZ", "latin1"), Buffer.alloc(64)]);

const padTo = (buf, size) =>
  Buffer.concat([buf, Buffer.alloc(size - buf.length)]);

// ---------- App test ----------
const buildApp = () => {
  const app = express();
  const ok = (req, res) =>
    res.status(200).json({
      success: true,
      data: {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        detectedFormat: req.file.detectedFormat,
        hasBuffer: Buffer.isBuffer(req.file.buffer),
      },
    });
  app.post("/document", uploadDocument, ok);
  app.post("/video", uploadVideo, ok);
  app.use(errorHandler);
  return app;
};

describe("Upload Media Middleware (Multer + magic bytes)", () => {
  const app = buildApp();

  describe("Upload PDF", () => {
    it("chấp nhận PDF hợp lệ, lưu trong memory (buffer)", async () => {
      const res = await request(app)
        .post("/document")
        .attach("file", pdfBuffer(), {
          filename: "bai-giang.pdf",
          contentType: "application/pdf",
        });
      expect(res.status).toBe(200);
      expect(res.body.data.detectedFormat).toBe("pdf");
      expect(res.body.data.hasBuffer).toBe(true);
    });

    it("từ chối MIME type sai (image/png) -> 415", async () => {
      const res = await request(app)
        .post("/document")
        .attach("file", pdfBuffer(), {
          filename: "a.pdf",
          contentType: "image/png",
        });
      expect(res.status).toBe(415);
      expect(res.body.success).toBe(false);
    });

    it("từ chối extension không khớp MIME (.docx + application/pdf) -> 415", async () => {
      const res = await request(app)
        .post("/document")
        .attach("file", pdfBuffer(), {
          filename: "a.docx",
          contentType: "application/pdf",
        });
      expect(res.status).toBe(415);
    });

    it("từ chối file .exe đổi tên thành .pdf (giả mạo nội dung) -> 415", async () => {
      const res = await request(app)
        .post("/document")
        .attach("file", exeBuffer(), {
          filename: "virus.pdf",
          contentType: "application/pdf",
        });
      expect(res.status).toBe(415);
      expect(res.body.message).toMatch(/giả mạo/);
    });

    it("từ chối PDF vượt 10MB -> 413", async () => {
      const big = padTo(pdfBuffer(), 10 * MB + 1);
      const res = await request(app)
        .post("/document")
        .attach("file", big, {
          filename: "big.pdf",
          contentType: "application/pdf",
        });
      expect(res.status).toBe(413);
      expect(res.body.message).toMatch(/10MB/);
    });

    it("chấp nhận PDF đúng 10MB", async () => {
      const exact = padTo(pdfBuffer(), 10 * MB);
      const res = await request(app)
        .post("/document")
        .attach("file", exact, {
          filename: "exact.pdf",
          contentType: "application/pdf",
        });
      expect(res.status).toBe(200);
    });

    it("thiếu file -> 400", async () => {
      const res = await request(app).post("/document").field("title", "abc");
      expect(res.status).toBe(400);
    });

    it("sai tên field -> 400", async () => {
      const res = await request(app)
        .post("/document")
        .attach("document", pdfBuffer(), {
          filename: "a.pdf",
          contentType: "application/pdf",
        });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/'file'/);
    });

    it("gửi 2 file -> 400", async () => {
      const res = await request(app)
        .post("/document")
        .attach("file", pdfBuffer(), {
          filename: "a.pdf",
          contentType: "application/pdf",
        })
        .attach("file", pdfBuffer(), {
          filename: "b.pdf",
          contentType: "application/pdf",
        });
      expect(res.status).toBe(400);
    });

    it("file rỗng -> 400", async () => {
      const res = await request(app)
        .post("/document")
        .attach("file", Buffer.alloc(0), {
          filename: "empty.pdf",
          contentType: "application/pdf",
        });
      expect(res.status).toBe(400);
    });
  });

  describe("Upload Video", () => {
    it("chấp nhận MP4 hợp lệ", async () => {
      const res = await request(app)
        .post("/video")
        .attach("file", mp4Buffer(), {
          filename: "lesson.mp4",
          contentType: "video/mp4",
        });
      expect(res.status).toBe(200);
      expect(res.body.data.detectedFormat).toBe("mp4");
    });

    it("chấp nhận MOV (brand qt)", async () => {
      const res = await request(app)
        .post("/video")
        .attach("file", mp4Buffer("qt  "), {
          filename: "lesson.mov",
          contentType: "video/quicktime",
        });
      expect(res.status).toBe(200);
      expect(res.body.data.detectedFormat).toBe("mov");
    });

    it("chấp nhận WebM", async () => {
      const res = await request(app)
        .post("/video")
        .attach("file", webmBuffer(), {
          filename: "lesson.webm",
          contentType: "video/webm",
        });
      expect(res.status).toBe(200);
      expect(res.body.data.detectedFormat).toBe("webm");
    });

    it("từ chối PDF gửi lên endpoint video -> 415", async () => {
      const res = await request(app)
        .post("/video")
        .attach("file", pdfBuffer(), {
          filename: "a.pdf",
          contentType: "application/pdf",
        });
      expect(res.status).toBe(415);
    });

    it("từ chối file giả mạo .mp4 (nội dung PDF) -> 415", async () => {
      const res = await request(app)
        .post("/video")
        .attach("file", pdfBuffer(), {
          filename: "fake.mp4",
          contentType: "video/mp4",
        });
      expect(res.status).toBe(415);
    });

    it("từ chối nội dung MP4 đặt tên .webm -> 415", async () => {
      const res = await request(app)
        .post("/video")
        .attach("file", mp4Buffer(), {
          filename: "x.webm",
          contentType: "video/webm",
        });
      expect(res.status).toBe(415);
      expect(res.body.message).toMatch(/không khớp/);
    });

    it("từ chối video vượt 30MB -> 413", async () => {
      const big = padTo(mp4Buffer(), 30 * MB + 1);
      const res = await request(app)
        .post("/video")
        .attach("file", big, { filename: "big.mp4", contentType: "video/mp4" });
      expect(res.status).toBe(413);
      expect(res.body.message).toMatch(/30MB/);
    });
  });

  describe("Hàm nhận diện magic bytes", () => {
    it("detectPdf", () => {
      expect(detectPdf(pdfBuffer())).toBe("pdf");
      expect(detectPdf(exeBuffer())).toBeNull();
    });

    it("detectVideo", () => {
      expect(detectVideo(mp4Buffer("mp42"))).toBe("mp4");
      expect(detectVideo(mp4Buffer("qt  "))).toBe("mov");
      expect(detectVideo(webmBuffer())).toBe("webm");
      expect(detectVideo(exeBuffer())).toBeNull();
      expect(detectVideo(Buffer.alloc(4))).toBeNull();
    });
  });
});
