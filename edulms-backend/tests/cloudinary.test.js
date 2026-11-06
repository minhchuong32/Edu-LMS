const {
  cloudinary,
  CLOUDINARY_FOLDERS,
  checkCloudinaryConnection,
  uploadStreamToCloudinary,
  deleteFromCloudinary,
} = require("../src/config/cloudinary");

jest.mock("cloudinary", () => {
  const mCloudinary = {
    v2: {
      config: jest.fn(),
      api: {
        ping: jest.fn(),
      },
      uploader: {
        upload_stream: jest.fn(),
        destroy: jest.fn(),
      },
    },
  };
  return mCloudinary;
});

describe("Cloudinary Config & Helpers Unit Tests", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("Cấu hình thư mục (Folders)", () => {
    it("định nghĩa chính xác thư mục edulms/documents và edulms/videos", () => {
      expect(CLOUDINARY_FOLDERS.DOCUMENTS).toBe("edulms/documents");
      expect(CLOUDINARY_FOLDERS.VIDEOS).toBe("edulms/videos");
    });
  });

  describe("checkCloudinaryConnection", () => {
    it("thông báo lỗi nếu thiếu biến môi trường cần thiết", async () => {
      delete process.env.CLOUDINARY_CLOUD_NAME;
      delete process.env.CLOUDINARY_API_KEY;
      delete process.env.CLOUDINARY_API_SECRET;

      const result = await checkCloudinaryConnection();

      expect(result.success).toBe(false);
      expect(result.message).toContain("Thiếu biến môi trường Cloudinary");
    });

    it("kết nối thành công khi API ping trả về trạng thái ok", async () => {
      process.env.CLOUDINARY_CLOUD_NAME = "test_cloud";
      process.env.CLOUDINARY_API_KEY = "test_key";
      process.env.CLOUDINARY_API_SECRET = "test_secret";

      cloudinary.api.ping.mockResolvedValue({ status: "ok" });

      const result = await checkCloudinaryConnection();

      expect(result.success).toBe(true);
      expect(result.status).toBe("ok");
    });

    it("xử lý lỗi khi API ping ném lỗi kết nối", async () => {
      process.env.CLOUDINARY_CLOUD_NAME = "test_cloud";
      process.env.CLOUDINARY_API_KEY = "test_key";
      process.env.CLOUDINARY_API_SECRET = "test_secret";

      cloudinary.api.ping.mockRejectedValue(new Error("Invalid API Key"));

      const result = await checkCloudinaryConnection();

      expect(result.success).toBe(false);
      expect(result.message).toContain("Invalid API Key");
    });
  });

  describe("uploadStreamToCloudinary", () => {
    it("tải buffer lên đúng thư mục và trả về kết quả", async () => {
      const mockResult = {
        secure_url: "https://res.cloudinary.com/demo/image/upload/sample.pdf",
        public_id: "edulms/documents/sample",
      };

      cloudinary.uploader.upload_stream.mockImplementation(
        (options, callback) => {
          expect(options.folder).toBe(CLOUDINARY_FOLDERS.DOCUMENTS);
          // Mô phỏng luồng thành công
          const { Writable } = require("stream");
          const writable = new Writable({
            write(_chunk, _encoding, next) {
              next();
            },
          });
          writable.on("finish", () => {
            callback(null, mockResult);
          });
          return writable;
        }
      );

      const buffer = Buffer.from("test document content");
      const result = await uploadStreamToCloudinary(buffer, {
        folder: CLOUDINARY_FOLDERS.DOCUMENTS,
      });

      expect(result.secure_url).toBe(mockResult.secure_url);
    });
  });

  describe("deleteFromCloudinary", () => {
    it("gọi uploader.destroy với đúng public_id và resource_type", async () => {
      cloudinary.uploader.destroy.mockResolvedValue({ result: "ok" });

      const result = await deleteFromCloudinary(
        "edulms/videos/video_123",
        "video"
      );

      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith(
        "edulms/videos/video_123",
        {
          resource_type: "video",
        }
      );
      expect(result.result).toBe("ok");
    });
  });
});
