const express = require("express");
const request = require("supertest");
const {
  uploadFile,
  uploadImage,
  uploadArchive,
  createUploadMiddleware,
  uploadErrorHandler,
} = require("../src/middlewares/upload.middleware");
const { errorHandler } = require("../src/middlewares/error.middleware");
const { detectFileFormat, isLikelyText } = require("../src/utils/fileSignature");
const { FILE_TYPE_CATEGORIES } = require("../src/config/fileTypes");

const MB = 1024 * 1024;

// ===================== Buffer mẫu theo chữ ký thật =====================
const OLE = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
const ole = (streamName) => Buffer.concat([OLE, Buffer.alloc(504), Buffer.from(streamName, "utf16le"), Buffer.alloc(64)]);
const zip = (...entries) => Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(26), ...entries.map((e) => Buffer.from(e)), Buffer.alloc(32)]);

const SAMPLES = {
  pdf: () => Buffer.from("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF", "latin1"),
  doc: () => ole("WordDocument"),
  xls: () => ole("Workbook"),
  ppt: () => ole("PowerPoint Document"),
  docx: () => zip("[Content_Types].xml", "word/document.xml"),
  xlsx: () => zip("[Content_Types].xml", "xl/workbook.xml"),
  pptx: () => zip("[Content_Types].xml", "ppt/presentation.xml"),
  zip: () => zip("bai-tap/de-bai.txt"),
  rar: () => Buffer.concat([Buffer.from([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x01, 0x00]), Buffer.alloc(32)]),
  "7z": () => Buffer.concat([Buffer.from([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c]), Buffer.alloc(32)]),
  jpeg: () => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32)]),
  png: () => Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]),
  webp: () => Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBPVP8 "), Buffer.alloc(32)]),
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
  webm: () => Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x82, 0x84]), Buffer.from("webm"), Buffer.alloc(32)]),
  txt: () => Buffer.from("Bài giảng Toán 10\r\nChương 1: Mệnh đề\tTập hợp\n", "utf8"),
  csv: () => Buffer.from("\uFEFFMã HS,Họ tên,Điểm\nHS001,Nguyễn Văn A,9.5\n", "utf8"),
  rtf: () => Buffer.from("{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Arial;}} Hello}", "latin1"),
  exe: () => Buffer.concat([Buffer.from("MZ"), Buffer.alloc(64)]),
};

const MIME = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
  rtf: "application/rtf",
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

const padTo = (buf, size) => Buffer.concat([buf, Buffer.alloc(size - buf.length)]);

// ===================== App test =====================
const ok = (req, res) =>
  res.status(200).json({
    success: true,
    data: req.file
      ? {
          originalname: req.file.originalname,
          category: req.file.category,
          extension: req.file.extension,
          detectedFormat: req.file.detectedFormat,
          size: req.file.size,
        }
      : null,
  });

const buildApp = () => {
  const app = express();
  app.post("/file", uploadFile, ok);
  app.post("/image", uploadImage, ok);
  app.post("/archive", uploadArchive, ok);
  app.post("/pdf-only", createUploadMiddleware({ categories: ["document"], extensions: [".pdf"] }), ok);
  app.post("/optional", createUploadMiddleware({ categories: ["image"], required: false }), ok);
  app.post("/with-code", uploadImage, ok, uploadErrorHandler);
  app.use(uploadErrorHandler);
  app.use(errorHandler);
  return app;
};

const send = (app, url, buffer, filename, contentType) =>
  request(app).post(url).attach("file", buffer, { filename, contentType });

describe("Upload đa định dạng (Multer + magic bytes)", () => {
  const app = buildApp();

  describe("Chấp nhận đúng định dạng và phân nhóm", () => {
    it.each([
      ["giao-trinh.pdf", "pdf", "pdf", "document", "pdf"],
      ["bai-tap.doc", "doc", "doc", "document", "doc"],
      ["bai-tap.docx", "docx", "docx", "document", "docx"],
      ["ghi-chu.txt", "txt", "txt", "document", "text"],
      ["de-cuong.rtf", "rtf", "rtf", "document", "rtf"],
      ["diem.xls", "xls", "xls", "spreadsheet", "xls"],
      ["diem.xlsx", "xlsx", "xlsx", "spreadsheet", "xlsx"],
      ["diem.csv", "csv", "csv", "spreadsheet", "text"],
      ["slide.ppt", "ppt", "ppt", "presentation", "ppt"],
      ["slide.pptx", "pptx", "pptx", "presentation", "pptx"],
      ["source.zip", "zip", "zip", "archive", "zip"],
      ["source.rar", "rar", "rar", "archive", "rar"],
      ["source.7z", "7z", "7z", "archive", "7z"],
      ["anh.jpg", "jpeg", "jpg", "image", "jpeg"],
      ["anh.jpeg", "jpeg", "jpeg", "image", "jpeg"],
      ["anh.png", "png", "png", "image", "png"],
      ["anh.webp", "webp", "webp", "image", "webp"],
      ["clip.mp4", "mp4", "mp4", "video", "mp4"],
      ["clip.mov", "mov", "mov", "video", "mov"],
      ["clip.webm", "webm", "webm", "video", "webm"],
    ])("%s", async (filename, sample, mimeKey, category, detected) => {
      const res = await send(app, "/file", SAMPLES[sample](), filename, MIME[mimeKey]);
      expect(res.status).toBe(200);
      expect(res.body.data.category).toBe(category);
      expect(res.body.data.detectedFormat).toBe(detected);
    });

    it("chấp nhận RAR với MIME application/octet-stream (trình duyệt không nhận diện)", async () => {
      const res = await send(app, "/file", SAMPLES.rar(), "a.rar", "application/octet-stream");
      expect(res.status).toBe(200);
    });

    it("chấp nhận CSV Excel gửi dạng application/vnd.ms-excel", async () => {
      const res = await send(app, "/file", SAMPLES.csv(), "diem.csv", "application/vnd.ms-excel");
      expect(res.status).toBe(200);
    });

    it("chấp nhận DOCX đổi đuôi thành .zip (bản chất là ZIP hợp lệ)", async () => {
      const res = await send(app, "/file", SAMPLES.docx(), "a.zip", MIME.zip);
      expect(res.status).toBe(200);
    });

    it("giữ đúng tên file tiếng Việt", async () => {
      const res = await send(app, "/file", SAMPLES.pdf(), "Bài giảng Toán.pdf", MIME.pdf);
      expect(res.status).toBe(200);
      expect(res.body.data.originalname).toBe("Bài giảng Toán.pdf");
    });
  });

  describe("Từ chối file ngoài danh sách / sai MIME", () => {
    it.each([
      ["virus.exe", "exe", "application/x-msdownload"],
      ["anh.gif", "png", "image/gif"],
      ["script.js", "txt", "text/javascript"],
      ["khong-duoi", "pdf", "application/pdf"],
      ["anh.png", "png", "application/octet-stream"], // octet-stream chỉ cho file nén
      ["a.pdf", "pdf", "image/png"],
      ["a.docx", "docx", "application/pdf"],
    ])("%s (%s, %s) -> 415", async (filename, sample, mime) => {
      const res = await send(app, "/file", SAMPLES[sample](), filename, mime);
      expect(res.status).toBe(415);
      expect(res.body.success).toBe(false);
    });

    it("route chỉ nhận ảnh từ chối PDF hợp lệ", async () => {
      const res = await send(app, "/image", SAMPLES.pdf(), "a.pdf", MIME.pdf);
      expect(res.status).toBe(415);
    });

    it("route chỉ nhận PDF từ chối DOCX hợp lệ", async () => {
      const res = await send(app, "/pdf-only", SAMPLES.docx(), "a.docx", MIME.docx);
      expect(res.status).toBe(415);
    });
  });

  describe("Chống giả mạo nội dung (magic bytes)", () => {
    it.each([
      ["exe đổi tên .png", "exe", "virus.png", "png"],
      ["exe đổi tên .docx", "exe", "virus.docx", "docx"],
      ["exe đổi tên .zip", "exe", "virus.zip", "zip"],
      ["exe đổi tên .txt (nhị phân)", "exe", "virus.txt", "txt"],
      ["exe đổi tên .csv", "exe", "virus.csv", "csv"],
      ["PNG đổi tên .jpg", "png", "anh.jpg", "jpg"],
      ["ZIP thường đổi tên .docx", "zip", "fake.docx", "docx"],
      ["DOCX đổi tên .xlsx", "docx", "fake.xlsx", "xlsx"],
      ["DOC đổi tên .xls", "doc", "fake.xls", "xls"],
      ["PDF đổi tên .mp4", "pdf", "fake.mp4", "mp4"],
      ["RAR đổi tên .7z", "rar", "fake.7z", "7z"],
      ["PDF đổi tên .txt", "pdf", "fake.txt", "txt"],
    ])("%s -> 415", async (_title, sample, filename, mimeKey) => {
      const res = await send(app, "/file", SAMPLES[sample](), filename, MIME[mimeKey]);
      expect(res.status).toBe(415);
    });

    it("chặn file văn bản ở đầu nhưng chứa nhị phân phía sau", async () => {
      const polyglot = Buffer.concat([Buffer.from("Hello world\n"), SAMPLES.exe()]);
      const res = await send(app, "/file", polyglot, "a.txt", MIME.txt);
      expect(res.status).toBe(415);
    });
  });

  describe("Giới hạn dung lượng riêng theo nhóm", () => {
    it.each([
      ["ảnh > 5MB", "png", "a.png", "png", 5 * MB + 1, /5MB/],
      ["tài liệu > 10MB", "pdf", "a.pdf", "pdf", 10 * MB + 1, /10MB/],
      ["bảng tính > 10MB", "xlsx", "a.xlsx", "xlsx", 10 * MB + 1, /10MB/],
      ["trình chiếu > 10MB", "pptx", "a.pptx", "pptx", 10 * MB + 1, /10MB/],
      ["file nén > 20MB", "zip", "a.zip", "zip", 20 * MB + 1, /20MB/],
      ["video > 30MB", "mp4", "a.mp4", "mp4", 30 * MB + 1, /30MB/],
    ])("%s -> 413", async (_title, sample, filename, mimeKey, size, msg) => {
      const res = await send(app, "/file", padTo(SAMPLES[sample](), size), filename, MIME[mimeKey]);
      expect(res.status).toBe(413);
      expect(res.body.message).toMatch(msg);
    });

    it.each([
      ["ảnh đúng 5MB", "png", "a.png", "png", 5 * MB],
      ["file nén 15MB (vượt mức ảnh/tài liệu nhưng trong mức file nén)", "zip", "a.zip", "zip", 15 * MB],
      ["video 25MB", "mp4", "a.mp4", "mp4", 25 * MB],
    ])("%s -> 200", async (_title, sample, filename, mimeKey, size) => {
      const res = await send(app, "/file", padTo(SAMPLES[sample](), size), filename, MIME[mimeKey]);
      expect(res.status).toBe(200);
      expect(res.body.data.size).toBe(size);
    });

    it("route file nén giới hạn 20MB", async () => {
      expect(uploadArchive.maxFileSize).toBe(20 * MB);
      const res = await send(app, "/archive", padTo(SAMPLES.zip(), 20 * MB + 1), "a.zip", MIME.zip);
      expect(res.status).toBe(413);
    });
  });

  describe("Thiếu file / request không hợp lệ", () => {
    it("không có file -> 400", async () => {
      const res = await request(app).post("/file").field("title", "abc");
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Vui lòng chọn tập tin/);
    });

    it("không phải multipart -> 400", async () => {
      const res = await request(app).post("/file").send({ title: "abc" });
      expect(res.status).toBe(400);
    });

    it("required=false cho phép không gửi file", async () => {
      const res = await request(app).post("/optional").field("title", "abc");
      expect(res.status).toBe(200);
      expect(res.body.data).toBeNull();
    });

    it("file rỗng -> 400", async () => {
      const res = await send(app, "/file", Buffer.alloc(0), "a.pdf", MIME.pdf);
      expect(res.status).toBe(400);
    });

    it("uploadErrorHandler trả về mã lỗi `code` cho frontend", async () => {
      const res = await send(app, "/with-code", padTo(SAMPLES.png(), 5 * MB + 1), "a.png", MIME.png);
      expect(res.status).toBe(413);
      expect(res.body.code).toBe("FILE_TOO_LARGE");
    });
  });

  describe("Cấu hình", () => {
    it("giới hạn dung lượng theo nhóm đúng yêu cầu", () => {
      expect(FILE_TYPE_CATEGORIES.document.maxSize).toBe(10 * MB);
      expect(FILE_TYPE_CATEGORIES.spreadsheet.maxSize).toBe(10 * MB);
      expect(FILE_TYPE_CATEGORIES.presentation.maxSize).toBe(10 * MB);
      expect(FILE_TYPE_CATEGORIES.archive.maxSize).toBe(20 * MB);
      expect(FILE_TYPE_CATEGORIES.image.maxSize).toBe(5 * MB);
      expect(FILE_TYPE_CATEGORIES.video.maxSize).toBe(30 * MB);
    });

    it("ném lỗi khi cấu hình nhóm hoặc extension không hợp lệ", () => {
      expect(() => createUploadMiddleware({ categories: ["audio"] })).toThrow();
      expect(() => createUploadMiddleware({ categories: ["image"], extensions: [".pdf"] })).toThrow();
    });
  });

  describe("fileSignature", () => {
    it("nhận diện đúng các định dạng", () => {
      expect(detectFileFormat(SAMPLES.xls())).toBe("xls");
      expect(detectFileFormat(SAMPLES.pptx())).toBe("pptx");
      expect(detectFileFormat(SAMPLES.exe())).toBeNull();
      expect(detectFileFormat(Buffer.alloc(0))).toBeNull();
      expect(detectFileFormat(Buffer.concat([OLE, Buffer.alloc(64)]))).toBe("ole");
    });

    it("isLikelyText chấp nhận UTF-8/UTF-16, từ chối nhị phân", () => {
      expect(isLikelyText(SAMPLES.csv())).toBe(true);
      expect(isLikelyText(Buffer.from([0xff, 0xfe, 0x41, 0x00]))).toBe(true);
      expect(isLikelyText(Buffer.from([0x41, 0x00, 0x42]))).toBe(false);
    });
  });
});

