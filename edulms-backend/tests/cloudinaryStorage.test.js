const { Writable } = require("stream");
const {
  cloudinary,
  CLOUDINARY_FOLDERS,
  RESOURCE_TYPES,
  SUPPORTED_EXTENSIONS,
  getFileStorageConfig,
  buildPublicId,
  uploadFileToCloudinary,
  uploadStreamToCloudinary,
} = require("../src/config/cloudinary");

jest.mock("cloudinary", () => ({
  v2: {
    config: jest.fn(),
    api: { ping: jest.fn() },
    uploader: { upload_stream: jest.fn(), destroy: jest.fn() },
  },
}));

const mockUploadSuccess = (resultFactory) => {
  cloudinary.uploader.upload_stream.mockImplementation((options, callback) => {
    const writable = new Writable({
      write(_chunk, _enc, next) {
        next();
      },
    });
    writable.on("finish", () => callback(null, resultFactory(options)));
    return writable;
  });
};

describe("Cloudinary - phân loại đa định dạng file", () => {
  beforeEach(() => jest.clearAllMocks());

  it("định nghĩa đủ 6 thư mục lưu trữ", () => {
    expect(CLOUDINARY_FOLDERS).toEqual({
      DOCUMENTS: "edulms/documents",
      SPREADSHEETS: "edulms/spreadsheets",
      PRESENTATIONS: "edulms/presentations",
      ARCHIVES: "edulms/archives",
      IMAGES: "edulms/images",
      VIDEOS: "edulms/videos",
    });
  });

  it("hỗ trợ đúng danh sách extension yêu cầu", () => {
    expect([...SUPPORTED_EXTENSIONS].sort()).toEqual(
      [
        ".pdf",
        ".doc",
        ".docx",
        ".txt",
        ".rtf",
        ".xls",
        ".xlsx",
        ".csv",
        ".ppt",
        ".pptx",
        ".zip",
        ".rar",
        ".7z",
        ".jpg",
        ".jpeg",
        ".png",
        ".webp",
        ".mp4",
        ".mov",
        ".webm",
      ].sort()
    );
  });

  it.each([
    ["giao-trinh.pdf", "application/pdf", "edulms/documents", "raw"],
    [
      "bai-tap.docx",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "edulms/documents",
      "raw",
    ],
    ["ghi-chu.txt", "text/plain", "edulms/documents", "raw"],
    ["de-cuong.rtf", "application/rtf", "edulms/documents", "raw"],
    [
      "diem.xlsx",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "edulms/spreadsheets",
      "raw",
    ],
    ["diem.csv", "application/vnd.ms-excel", "edulms/spreadsheets", "raw"],
    [
      "slide.pptx",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "edulms/presentations",
      "raw",
    ],
    ["source.zip", "application/x-zip-compressed", "edulms/archives", "raw"],
    ["source.rar", "application/octet-stream", "edulms/archives", "raw"],
    ["source.7z", "application/x-7z-compressed", "edulms/archives", "raw"],
    ["anh.JPG", "image/jpeg", "edulms/images", "image"],
    ["anh.webp", "image/webp", "edulms/images", "image"],
    ["bai-giang.mp4", "video/mp4", "edulms/videos", "video"],
    ["bai-giang.mov", "video/quicktime", "edulms/videos", "video"],
    ["bai-giang.webm", "video/webm", "edulms/videos", "video"],
  ])("%s (%s) -> %s / %s", (originalname, mimetype, folder, resourceType) => {
    const config = getFileStorageConfig({ originalname, mimetype });
    expect(config).not.toBeNull();
    expect(config.folder).toBe(folder);
    expect(config.resourceType).toBe(resourceType);
  });

  it.each([
    ["virus.exe", "application/x-msdownload"],
    ["script.js", "text/javascript"],
    ["anh.gif", "image/gif"],
    ["fake.png", "application/x-msdownload"], // MIME không khớp extension
    ["fake.pdf", "image/png"],
    ["anh.png", "application/octet-stream"], // octet-stream chỉ chấp nhận cho file nén
    ["khong-duoi", "application/pdf"],
  ])("từ chối %s (%s)", (originalname, mimetype) => {
    expect(getFileStorageConfig({ originalname, mimetype })).toBeNull();
  });

  describe("buildPublicId", () => {
    it("loại bỏ dấu tiếng Việt, ký tự đặc biệt và giữ extension cho raw", () => {
      const id = buildPublicId(
        "Đề cương Môn Toán (HK1).pdf",
        RESOURCE_TYPES.RAW
      );
      expect(id).toMatch(/^de-cuong-mon-toan-hk1-\d+-[a-f0-9]{8}\.pdf$/);
    });

    it("không gắn extension cho image/video (Cloudinary tự quản lý format)", () => {
      expect(buildPublicId("anh.png", RESOURCE_TYPES.IMAGE)).not.toMatch(
        /\.png$/
      );
      expect(buildPublicId("clip.mp4", RESOURCE_TYPES.VIDEO)).not.toMatch(
        /\.mp4$/
      );
    });

    it("chặn path traversal trong tên file", () => {
      const id = buildPublicId("../../etc/passwd.txt", RESOURCE_TYPES.RAW);
      expect(id).not.toContain("/");
      expect(id).not.toContain("..");
    });
  });

  describe("uploadFileToCloudinary", () => {
    it("tự chọn folder + resource_type và chỉ trả về thông tin cần thiết", async () => {
      mockUploadSuccess((options) => ({
        secure_url: `https://res.cloudinary.com/demo/raw/upload/${options.folder}/${options.public_id}`,
        public_id: `${options.folder}/${options.public_id}`,
        resource_type: options.resource_type,
        bytes: 123,
        api_key: "SHOULD_NOT_LEAK",
      }));

      const result = await uploadFileToCloudinary({
        buffer: Buffer.from("PK zip content"),
        originalname: "slide bai 1.pptx",
        mimetype:
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      });

      const options = cloudinary.uploader.upload_stream.mock.calls[0][0];
      expect(options.folder).toBe("edulms/presentations");
      expect(options.resource_type).toBe("raw");
      expect(options.public_id).toMatch(/\.pptx$/);
      expect(result.category).toBe("presentation");
      expect(result.url).toContain("edulms/presentations");
      expect(result).not.toHaveProperty("api_key");
    });

    it("không cho extraOptions ghi đè folder/resource_type", async () => {
      mockUploadSuccess((options) => ({
        secure_url: "u",
        public_id: options.public_id,
      }));

      await uploadFileToCloudinary(
        {
          buffer: Buffer.from("x"),
          originalname: "a.png",
          mimetype: "image/png",
        },
        { folder: "hack", resource_type: "raw", tags: ["lesson"] }
      );

      const options = cloudinary.uploader.upload_stream.mock.calls[0][0];
      expect(options.folder).toBe("edulms/images");
      expect(options.resource_type).toBe("image");
      expect(options.tags).toEqual(["lesson"]);
    });

    it("ném lỗi 415 với định dạng không hỗ trợ và không gọi Cloudinary", async () => {
      await expect(
        uploadFileToCloudinary({
          buffer: Buffer.from("MZ"),
          originalname: "virus.exe",
          mimetype: "application/x-msdownload",
        })
      ).rejects.toMatchObject({ statusCode: 415 });
      expect(cloudinary.uploader.upload_stream).not.toHaveBeenCalled();
    });
  });

  it("uploadStreamToCloudinary từ chối buffer rỗng", async () => {
    await expect(uploadStreamToCloudinary(Buffer.alloc(0))).rejects.toThrow(
      /rỗng/
    );
    expect(cloudinary.uploader.upload_stream).not.toHaveBeenCalled();
  });
});
