const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../src/app");
const User = require("../src/models/User");
const RefreshToken = require("../src/models/RefreshToken");
const { hashPassword } = require("../src/utils/password");
const authService = require("../src/services/auth.service");

// Mocking User & RefreshToken mongoose models
jest.mock("../src/models/User");
jest.mock("../src/models/RefreshToken");

describe("Authentication & Account Activation API Unit & Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Service: activateAccount", () => {
    it("kích hoạt tài khoản thành công khi mã định danh và email khớp cùng tài khoản", async () => {
      const mockUser = {
        _id: "user123",
        fullName: "Nguyễn Văn Học Sinh",
        userCode: "HS2026",
        email: "hocsinh@edulms.edu.vn",
        password: "oldHashedPassword",
        role: "student",
        className: "10A1",
        isActivated: false,
        mustChangePassword: true,
        save: jest.fn().mockResolvedValue(true),
      };

      User.findOne.mockResolvedValue(mockUser);

      const result = await authService.activateAccount({
        userCode: "HS2026",
        email: "hocsinh@edulms.edu.vn",
        password: "NewPassword123",
      });

      expect(User.findOne).toHaveBeenCalledWith({ userCode: "HS2026" });
      expect(mockUser.isActivated).toBe(true);
      expect(mockUser.mustChangePassword).toBe(false);
      expect(mockUser.save).toHaveBeenCalled();
      expect(result.isActivated).toBe(true);
      expect(result.email).toBe("hocsinh@edulms.edu.vn");
    });

    it("ném lỗi khi thiếu mã định danh, email hoặc mật khẩu", async () => {
      await expect(
        authService.activateAccount({ userCode: "", email: "test@test.com", password: "123" })
      ).rejects.toThrow(/Vui lòng cung cấp đầy đủ/i);
    });

    it("ném lỗi khi email không đúng định dạng", async () => {
      await expect(
        authService.activateAccount({ userCode: "HS01", email: "invalid-email", password: "123456password" })
      ).rejects.toThrow(/không đúng định dạng/i);
    });

    it("ném lỗi khi mật khẩu mới dưới 6 ký tự", async () => {
      await expect(
        authService.activateAccount({ userCode: "HS01", email: "test@edulms.edu.vn", password: "123" })
      ).rejects.toThrow(/ít nhất 6 ký tự/i);
    });

    it("ném lỗi khi mã định danh không tồn tại hoặc email không khớp", async () => {
      User.findOne.mockResolvedValue({
        userCode: "HS01",
        email: "other@edulms.edu.vn",
        isActivated: false,
      });

      await expect(
        authService.activateAccount({ userCode: "HS01", email: "mismatch@edulms.edu.vn", password: "password123" })
      ).rejects.toThrow(/không chính xác hoặc không khớp/i);
    });

    it("ném lỗi khi tài khoản đã được kích hoạt trước đó", async () => {
      User.findOne.mockResolvedValue({
        userCode: "HS01",
        email: "activated@edulms.edu.vn",
        isActivated: true,
      });

      await expect(
        authService.activateAccount({ userCode: "HS01", email: "activated@edulms.edu.vn", password: "password123" })
      ).rejects.toThrow(/đã được kích hoạt trước đó/i);
    });
  });

  describe("Service: verifyActivationInfo (Bước 1)", () => {
    it("xác thực thông tin bước 1 thành công khi mã định danh và email khớp", async () => {
      User.findOne.mockResolvedValue({
        fullName: "Học Sinh Bước 1",
        userCode: "HS123",
        email: "hs123@edulms.edu.vn",
        role: "student",
        className: "10A1",
        isActivated: false,
      });

      const res = await authService.verifyActivationInfo({
        userCode: "HS123",
        email: "hs123@edulms.edu.vn",
      });

      expect(res.fullName).toBe("Học Sinh Bước 1");
      expect(res.userCode).toBe("HS123");
      expect(res.email).toBe("hs123@edulms.edu.vn");
    });

    it("từ chối xác thực bước 1 nếu tài khoản đã kích hoạt", async () => {
      User.findOne.mockResolvedValue({
        userCode: "HS123",
        email: "hs123@edulms.edu.vn",
        isActivated: true,
      });

      await expect(
        authService.verifyActivationInfo({
          userCode: "HS123",
          email: "hs123@edulms.edu.vn",
        })
      ).rejects.toThrow(/đã được kích hoạt trước đó/i);
    });
  });

  describe("Service: loginUser", () => {
    it("từ chối đăng nhập khi tài khoản chưa được kích hoạt", async () => {
      User.findOne.mockResolvedValue({
        _id: "user123",
        email: "unactivated@edulms.edu.vn",
        password: "hashedPassword",
        isActivated: false,
      });

      await expect(
        authService.loginUser({ email: "unactivated@edulms.edu.vn", password: "password123" })
      ).rejects.toThrow(/chưa được kích hoạt/i);
    });

    it("từ chối đăng nhập khi email không tồn tại hoặc mật khẩu sai", async () => {
      User.findOne.mockResolvedValue(null);

      await expect(
        authService.loginUser({ email: "notfound@edulms.edu.vn", password: "password123" })
      ).rejects.toThrow(/không chính xác/i);
    });

    it("đăng nhập thành công trả về Access Token (15m), Refresh Token và lưu Refresh Token vào DB", async () => {
      const plainPassword = "correctPassword123";
      const hashedPassword = await hashPassword(plainPassword);

      const mockUser = {
        _id: "507f1f77bcf86cd799439011",
        fullName: "Nguyễn Văn Admin",
        userCode: "AD001",
        email: "admin@edulms.edu.vn",
        password: hashedPassword,
        role: "admin",
        isActivated: true,
        mustChangePassword: false,
      };

      User.findOne.mockResolvedValue(mockUser);
      RefreshToken.create.mockResolvedValue({ token: "ref_token_123" });

      const result = await authService.loginUser({
        email: "admin@edulms.edu.vn",
        password: plainPassword,
      });

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.email).toBe("admin@edulms.edu.vn");

      // Kiểm tra thời hạn Access Token là 15 phút (900s)
      const decodedAccess = jwt.decode(result.accessToken);
      expect(decodedAccess.exp - decodedAccess.iat).toBe(900);

      // Kiểm tra lưu CSDL
      expect(RefreshToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          token: result.refreshToken,
          user: mockUser._id,
        })
      );
    });
  });

  describe("Service: refreshSession (Token Rotation)", () => {
    it("làm mới phiên thành công, xóa refresh token cũ và lưu token mới (xoay vòng token)", async () => {
      const userId = "507f1f77bcf86cd799439011";
      const oldRefreshToken = authService.generateRefreshToken
        ? authService.generateRefreshToken({ userId })
        : jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET || "default_jwt_refresh_secret_key", { expiresIn: "7d" });

      RefreshToken.findOne.mockResolvedValue({
        _id: "tokenDoc123",
        token: oldRefreshToken,
        user: userId,
        isRevoked: false,
      });

      User.findById.mockResolvedValue({
        _id: userId,
        fullName: "Học sinh Rotate",
        userCode: "HS99",
        email: "rotate@edulms.edu.vn",
        role: "student",
        isActivated: true,
      });

      RefreshToken.deleteOne.mockResolvedValue({ deletedCount: 1 });
      RefreshToken.create.mockResolvedValue(true);

      const result = await authService.refreshSession(oldRefreshToken);

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.refreshToken).not.toBe(oldRefreshToken);

      // Đảm bảo token cũ bị xóa
      expect(RefreshToken.deleteOne).toHaveBeenCalledWith({ _id: "tokenDoc123" });
      // Đảm bảo token mới được lưu
      expect(RefreshToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          token: result.refreshToken,
          user: userId,
        })
      );
    });

    it("ném lỗi nếu không có refresh token", async () => {
      await expect(authService.refreshSession(null)).rejects.toThrow(/Không tìm thấy Refresh Token/i);
    });

    it("phát hiện token reuse và thu hồi toàn bộ token của người dùng", async () => {
      const userId = "507f1f77bcf86cd799439011";
      const revokedToken = jwt.sign(
        { userId },
        process.env.JWT_REFRESH_SECRET || "default_jwt_refresh_secret_key",
        { expiresIn: "7d" }
      );

      RefreshToken.findOne.mockResolvedValue({
        _id: "tokenDoc123",
        token: revokedToken,
        user: userId,
        isRevoked: true,
      });

      RefreshToken.deleteMany.mockResolvedValue({ deletedCount: 5 });

      await expect(authService.refreshSession(revokedToken)).rejects.toThrow(
        /không hợp lệ hoặc đã bị vô hiệu hóa/i
      );

      // Verify that all tokens for the user were deleted due to reuse detection
      expect(RefreshToken.deleteMany).toHaveBeenCalledWith({ user: userId });
    });
  });

  describe("Service: logoutUser", () => {
    it("xóa refresh token khỏi CSDL khi đăng xuất", async () => {
      RefreshToken.deleteMany.mockResolvedValue({ deletedCount: 1 });
      await authService.logoutUser("sample_refresh_token");
      expect(RefreshToken.deleteMany).toHaveBeenCalledWith({ token: "sample_refresh_token" });
    });
  });

  describe("API Endpoints Integration (HTTP & Cookies)", () => {
    it("POST /api/auth/verify-activation xác thực thông tin bước 1 thành công", async () => {
      User.findOne.mockResolvedValue({
        fullName: "Lê Học Sinh",
        userCode: "HS888",
        email: "hs888@edulms.edu.vn",
        role: "student",
        className: "10A2",
        isActivated: false,
      });

      const res = await request(app)
        .post("/api/auth/verify-activation")
        .send({
          userCode: "HS888",
          email: "hs888@edulms.edu.vn",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.fullName).toBe("Lê Học Sinh");
    });

    it("POST /api/v1/auth/activate thành công", async () => {
      User.findOne.mockResolvedValue({
        _id: "u1",
        fullName: "Nguyễn Văn A",
        userCode: "HS101",
        email: "hs101@edulms.edu.vn",
        password: "hash",
        role: "student",
        isActivated: false,
        mustChangePassword: true,
        save: jest.fn().mockResolvedValue(true),
      });

      const res = await request(app)
        .post("/api/v1/auth/activate")
        .send({
          userCode: "HS101",
          email: "hs101@edulms.edu.vn",
          password: "MySecurePassword123",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/Kích hoạt tài khoản thành công/i);
    });

    it("POST /api/auth/activate (không có /v1) và hỗ trợ alias studentCode + newPassword thành công", async () => {
      User.findOne.mockResolvedValue({
        _id: "u1_alias",
        fullName: "Trần Học Sinh",
        userCode: "HS999",
        email: "hs999@edulms.edu.vn",
        password: "hash",
        role: "student",
        isActivated: false,
        mustChangePassword: true,
        save: jest.fn().mockResolvedValue(true),
      });

      const res = await request(app)
        .post("/api/auth/activate")
        .send({
          studentCode: "HS999",
          email: "hs999@edulms.edu.vn",
          newPassword: "AliasSecurePassword123",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/Kích hoạt tài khoản thành công/i);
    });

    it("POST /api/v1/auth/login trả về Access Token và HttpOnly Cookie", async () => {
      const password = "password123";
      const hashedPassword = await hashPassword(password);

      User.findOne.mockResolvedValue({
        _id: "u2",
        fullName: "Giáo viên B",
        userCode: "GV202",
        email: "gv202@edulms.edu.vn",
        password: hashedPassword,
        role: "teacher",
        isActivated: true,
        mustChangePassword: false,
      });

      RefreshToken.create.mockResolvedValue(true);

      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "gv202@edulms.edu.vn",
          password,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();

      // Kiểm tra HttpOnly Cookie trong response header
      const cookies = res.headers["set-cookie"];
      expect(cookies).toBeDefined();
      const refCookie = cookies.find((c) => c.startsWith("refreshToken="));
      expect(refCookie).toBeDefined();
      expect(refCookie).toMatch(/HttpOnly/i);
    });

    it("POST /api/v1/auth/logout xóa HttpOnly Cookie và vô hiệu hóa token", async () => {
      RefreshToken.deleteMany.mockResolvedValue({ deletedCount: 1 });

      const res = await request(app)
        .post("/api/v1/auth/logout")
        .set("Cookie", ["refreshToken=token_to_delete"]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Header phải xóa cookie (Max-Age=0)
      const cookies = res.headers["set-cookie"];
      const refCookie = cookies.find((c) => c.startsWith("refreshToken="));
      expect(refCookie).toMatch(/Max-Age=0|expires=/i);
    });
  });
});
