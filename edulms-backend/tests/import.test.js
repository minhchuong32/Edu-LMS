const request = require("supertest");
const ExcelJS = require("exceljs");
const app = require("../src/app");
const User = require("../src/models/User");
const { generateAccessToken } = require("../src/utils/jwt");
const {
  validateRow,
  generateTemplate,
  processImport,
} = require("../src/services/import.service");

jest.mock("../src/models/User");

describe("Import Users Service & Controller Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const adminToken = generateAccessToken({
    userId: "admin_id",
    role: "admin",
    email: "admin@edulms.edu.vn",
  });

  const studentToken = generateAccessToken({
    userId: "student_id",
    role: "student",
    email: "student@edulms.edu.vn",
  });

  describe("Service: validateRow", () => {
    it("hợp lệ đối với dòng thông tin học sinh đầy đủ", () => {
      const row = {
        "Họ và Tên": "Nguyễn Văn A",
        "Mã Học Sinh": "HS001",
        "Email": "vana@edulms.edu.vn",
        "Lớp": "10A1",
      };

      const result = validateRow(row, "student");
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.parsed.fullName).toBe("Nguyễn Văn A");
      expect(result.parsed.userCode).toBe("HS001");
      expect(result.parsed.email).toBe("vana@edulms.edu.vn");
      expect(result.parsed.className).toBe("10A1");
    });

    it("hợp lệ đối với dòng thông tin giáo viên (không bắt buộc có Lớp)", () => {
      const row = {
        "Họ và Tên": "Trần Thị Giáo Viên",
        "Mã Giáo Viên": "GV001",
        "Email": "giaovien@edulms.edu.vn",
      };

      const result = validateRow(row, "teacher");
      expect(result.isValid).toBe(true);
      expect(result.parsed.className).toBeNull();
    });

    it("báo lỗi khi thiếu Họ và Tên, Mã, Email hoặc email sai định dạng", () => {
      const emptyRow = {
        "Họ và Tên": "",
        "Mã Học Sinh": "",
        "Email": "invalid-email",
        "Lớp": "",
      };

      const result = validateRow(emptyRow, "student");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Thiếu Họ và Tên");
      expect(result.errors).toContain("Thiếu Mã định danh");
      expect(result.errors.some((e) => e.includes("không hợp lệ"))).toBe(true);
      expect(result.errors).toContain("Thiếu Lớp (bắt buộc với học sinh)");
    });
  });

  describe("Service: generateTemplate", () => {
    it("tạo file Excel mẫu cho học sinh", async () => {
      const buffer = await generateTemplate("student");
      expect(buffer).toBeInstanceOf(Buffer);

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const sheet = workbook.worksheets[0];
      expect(sheet.name).toBe("Danh sách học sinh");
      expect(sheet.getRow(1).values).toContain("Họ và Tên");
      expect(sheet.getRow(1).values).toContain("Mã Học Sinh");
      expect(sheet.getRow(1).values).toContain("Lớp");
    });

    it("tạo file Excel mẫu cho giáo viên", async () => {
      const buffer = await generateTemplate("teacher");
      expect(buffer).toBeInstanceOf(Buffer);

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const sheet = workbook.worksheets[0];
      expect(sheet.name).toBe("Danh sách giáo viên");
      expect(sheet.getRow(1).values).toContain("Họ và Tên");
      expect(sheet.getRow(1).values).toContain("Mã Giáo Viên");
    });
  });

  describe("Service: processImport", () => {
    it("trả về lỗi khi file Excel rỗng hoặc không có dòng dữ liệu", async () => {
      const workbook = new ExcelJS.Workbook();
      workbook.addWorksheet("EmptySheet");
      const emptyBuffer = await workbook.xlsx.writeBuffer();

      const result = await processImport(emptyBuffer, "student");
      expect(result.totalRows).toBe(0);
      expect(result.failCount).toBe(1);
      expect(result.failures[0].errors[0]).toMatch(/không có dữ liệu/i);
    });

    it("phát hiện trùng mã hoặc email trong nội bộ file Excel", async () => {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Sheet1");
      sheet.addRow(["Họ và Tên", "Mã Học Sinh", "Email", "Lớp"]);
      sheet.addRow(["Học Sinh 1", "HS01", "hs01@edulms.edu.vn", "10A1"]);
      sheet.addRow(["Học Sinh 2", "HS01", "hs02@edulms.edu.vn", "10A1"]); // trùng mã HS01
      const buffer = await workbook.xlsx.writeBuffer();

      User.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([]),
      });
      User.insertMany.mockResolvedValue([]);

      const result = await processImport(buffer, "student");
      expect(result.failCount).toBe(1);
      expect(result.failures[0].errors[0]).toMatch(/trùng với dòng/i);
      expect(result.successCount).toBe(1);
    });

    it("phát hiện trùng mã hoặc email với CSDL", async () => {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Sheet1");
      sheet.addRow(["Họ và Tên", "Mã Học Sinh", "Email", "Lớp"]);
      sheet.addRow(["Học Sinh 1", "HS99", "hs99@edulms.edu.vn", "10A1"]);
      const buffer = await workbook.xlsx.writeBuffer();

      User.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([
          { userCode: "HS99", email: "other@edulms.edu.vn" },
        ]),
      });

      const result = await processImport(buffer, "student");
      expect(result.successCount).toBe(0);
      expect(result.failCount).toBe(1);
      expect(result.failures[0].errors[0]).toMatch(/đã tồn tại trong hệ thống/i);
    });

    it("import thành công các tài khoản hợp lệ với mustChangePassword=true, isActivated=false", async () => {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Sheet1");
      sheet.addRow(["Họ và Tên", "Mã Học Sinh", "Email", "Lớp"]);
      sheet.addRow(["Nguyễn Văn Mới", "HS888", "moi@edulms.edu.vn", "10A3"]);
      const buffer = await workbook.xlsx.writeBuffer();

      User.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([]),
      });
      User.insertMany.mockResolvedValue([]);

      const result = await processImport(buffer, "student");
      expect(result.successCount).toBe(1);
      expect(result.failCount).toBe(0);
      expect(result.createdAccounts[0].userCode).toBe("HS888");
      expect(result.createdAccounts[0].tempPassword).toBeDefined();
      expect(User.insertMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            userCode: "HS888",
            isActivated: false,
            mustChangePassword: true,
          }),
        ]),
        { ordered: false }
      );
    });
  });

  describe("API Endpoints: /api/v1/admin/import", () => {
    it("GET /api/v1/admin/import/template/:role trả về 401 khi không đăng nhập", async () => {
      const res = await request(app).get("/api/v1/admin/import/template/student");
      expect(res.status).toBe(401);
    });

    it("GET /api/v1/admin/import/template/:role trả về 403 khi không phải admin", async () => {
      const res = await request(app)
        .get("/api/v1/admin/import/template/student")
        .set("Authorization", `Bearer ${studentToken}`);
      expect(res.status).toBe(403);
    });

    it("GET /api/v1/admin/import/template/:role trả về 400 khi vai trò không hợp lệ", async () => {
      const res = await request(app)
        .get("/api/v1/admin/import/template/unknown")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
    });

    it("GET /api/v1/admin/import/template/:role tải file template thành công cho admin", async () => {
      const res = await request(app)
        .get("/api/v1/admin/import/template/student")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain("spreadsheetml.sheet");
    });

    it("POST /api/v1/admin/import/:role trả về 400 khi không có file đính kèm", async () => {
      const res = await request(app)
        .post("/api/v1/admin/import/student")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Vui lòng tải lên file/i);
    });

    it("POST /api/v1/admin/import/:role trả về 400 khi file không phải định dạng .xlsx", async () => {
      const res = await request(app)
        .post("/api/v1/admin/import/student")
        .set("Authorization", `Bearer ${adminToken}`)
        .attach("file", Buffer.from("dummy text"), "test.txt");
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Chỉ hỗ trợ file Excel/i);
    });

    it("POST /api/v1/admin/import/:role import thành công từ file excel đính kèm", async () => {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Sheet1");
      sheet.addRow(["Họ và Tên", "Mã Giáo Viên", "Email"]);
      sheet.addRow(["Thầy Giáo A", "GV555", "thaya@edulms.edu.vn"]);
      const buffer = await workbook.xlsx.writeBuffer();

      User.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([]),
      });
      User.insertMany.mockResolvedValue([]);

      const res = await request(app)
        .post("/api/v1/admin/import/teacher")
        .set("Authorization", `Bearer ${adminToken}`)
        .attach("file", buffer, "giaovien.xlsx");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.successCount).toBe(1);
    });
  });
});
