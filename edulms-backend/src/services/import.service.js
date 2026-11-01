const ExcelJS = require("exceljs");
const crypto = require("crypto");
const User = require("../models/User");
const { hashPassword } = require("../utils/password");

/**
 * Tạo mật khẩu tạm thời ngẫu nhiên (8 ký tự)
 */
const generateTempPassword = () => {
  return crypto.randomBytes(4).toString("hex");
};

/**
 * Đọc và parse dữ liệu từ buffer file Excel
 * @param {Buffer} buffer Dữ liệu file Excel
 * @returns {Array<object>} Mảng dữ liệu các dòng
 */
const parseExcelBuffer = async (buffer) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) return [];


  const headers = worksheet.getRow(1).values.slice(1).map(String);
  const rows = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const values = row.values.slice(1);
    const parsedRow = {};
    headers.forEach((header, index) => {
      parsedRow[header] = values[index] ?? "";
    });
    rows.push(parsedRow);
  });

  return rows;
};

/**
 * Validate 1 dòng dữ liệu import
 * @param {object} row Dữ liệu 1 dòng
 * @param {string} role 'student' | 'teacher'
 * @param {number} rowIndex Số thứ tự dòng (hiển thị lỗi)
 * @returns {{ isValid: boolean, errors: string[], parsed: object }}
 */
const validateRow = (row, role) => {
  const errors = [];

  const fullName = String(row["Họ và Tên"] || row["fullName"] || "").trim();
  const userCode = String(
    row["Mã Học Sinh"] || row["Mã Giáo Viên"] || row["userCode"] || ""
  ).trim();
  const email = String(row["Email"] || row["email"] || "")
    .trim()
    .toLowerCase();
  const className = String(row["Lớp"] || row["className"] || "").trim();

  if (!fullName) errors.push("Thiếu Họ và Tên");
  if (!userCode) errors.push("Thiếu Mã định danh");
  if (!email) {
    errors.push("Thiếu Email");
  } else if (!/^\S+@\S+\.\S+$/.test(email)) {
    errors.push(`Email '${email}' không hợp lệ`);
  }
  if (role === "student" && !className) {
    errors.push("Thiếu Lớp (bắt buộc với học sinh)");
  }

  return {
    isValid: errors.length === 0,
    errors,
    parsed: {
      fullName,
      userCode,
      email,
      role,
      className: role === "student" ? className : null,
    },
  };
};

/**
 * Xử lý import hàng loạt từ file Excel
 * @param {Buffer} fileBuffer Buffer dữ liệu file
 * @param {string} role 'student' | 'teacher'
 * @returns {Promise<object>} Kết quả import chi tiết
 */
const processImport = async (fileBuffer, role) => {
  const rows = await parseExcelBuffer(fileBuffer);

  if (!rows || rows.length === 0) {
    return {
      totalRows: 0,
      successCount: 0,
      failCount: 1,
      failures: [{ row: 0, errors: ["File Excel không có dữ liệu"] }],
      createdAccounts: [],
    };
  }

  // 1. Validate từng dòng
  const validatedRows = rows.map((row, i) => ({
    rowIndex: i + 2, // +2 vì Excel bắt đầu từ 1 và dòng 1 là header
    ...validateRow(row, role, i + 2),
  }));

  const invalidRows = validatedRows.filter((r) => !r.isValid);
  const validRows = validatedRows.filter((r) => r.isValid);

  // 2. Kiểm tra trùng lặp trong file (nội bộ)
  const seenCodes = new Map();
  const seenEmails = new Map();
  const deduplicatedValid = [];

  for (const row of validRows) {
    const dupErrors = [];
    if (seenCodes.has(row.parsed.userCode)) {
      dupErrors.push(
        `Mã '${row.parsed.userCode}' trùng với dòng ${seenCodes.get(row.parsed.userCode)}`
      );
    }
    if (seenEmails.has(row.parsed.email)) {
      dupErrors.push(
        `Email '${row.parsed.email}' trùng với dòng ${seenEmails.get(row.parsed.email)}`
      );
    }

    if (dupErrors.length > 0) {
      invalidRows.push({ rowIndex: row.rowIndex, errors: dupErrors });
    } else {
      seenCodes.set(row.parsed.userCode, row.rowIndex);
      seenEmails.set(row.parsed.email, row.rowIndex);
      deduplicatedValid.push(row);
    }
  }

  // 3. Kiểm tra trùng trong DB
  const codesToCheck = deduplicatedValid.map((r) => r.parsed.userCode);
  const emailsToCheck = deduplicatedValid.map((r) => r.parsed.email);

  const existingUsers = await User.find({
    $or: [
      { userCode: { $in: codesToCheck } },
      { email: { $in: emailsToCheck } },
    ],
  }).select("userCode email");

  const existingCodes = new Set(existingUsers.map((u) => u.userCode));
  const existingEmails = new Set(existingUsers.map((u) => u.email));

  const toInsert = [];
  for (const row of deduplicatedValid) {
    const dbErrors = [];
    if (existingCodes.has(row.parsed.userCode)) {
      dbErrors.push(`Mã '${row.parsed.userCode}' đã tồn tại trong hệ thống`);
    }
    if (existingEmails.has(row.parsed.email)) {
      dbErrors.push(`Email '${row.parsed.email}' đã tồn tại trong hệ thống`);
    }

    if (dbErrors.length > 0) {
      invalidRows.push({ rowIndex: row.rowIndex, errors: dbErrors });
    } else {
      toInsert.push(row);
    }
  }

  // 4. Tạo tài khoản hàng loạt
  const createdAccounts = [];
  if (toInsert.length > 0) {
    const usersToCreate = await Promise.all(
      toInsert.map(async (row) => {
        const tempPassword = generateTempPassword();
        const hashedPassword = await hashPassword(tempPassword);
        createdAccounts.push({
          rowIndex: row.rowIndex,
          fullName: row.parsed.fullName,
          userCode: row.parsed.userCode,
          email: row.parsed.email,
          tempPassword,
        });
        return {
          fullName: row.parsed.fullName,
          email: row.parsed.email,
          userCode: row.parsed.userCode,
          role: row.parsed.role,
          className: row.parsed.className,
          password: hashedPassword,
          mustChangePassword: true,
          isActivated: false,
        };
      })
    );

    await User.insertMany(usersToCreate, { ordered: false });
  }

  // 5. Sắp xếp danh sách lỗi theo dòng
  invalidRows.sort((a, b) => a.rowIndex - b.rowIndex);
  const failures = invalidRows.map((r) => ({
    row: r.rowIndex,
    errors: r.errors,
  }));

  return {
    totalRows: rows.length,
    successCount: createdAccounts.length,
    failCount: failures.length,
    failures,
    createdAccounts,
  };
};

/**
 * Tạo file Excel mẫu (.xlsx) để tải về
 * @param {string} role 'student' | 'teacher'
 * @returns {Promise<Buffer>}
 */
const generateTemplate = async (role) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Edu-LMS";
  const sheetName = role === "student" ? "Danh sách học sinh" : "Danh sách giáo viên";
  const worksheet = workbook.addWorksheet(sheetName);

  if (role === "student") {
    worksheet.columns = [
      { header: "Họ và Tên", key: "fullName", width: 25 },
      { header: "Mã Học Sinh", key: "userCode", width: 18 },
      { header: "Email", key: "email", width: 28 },
      { header: "Lớp", key: "className", width: 15 },
    ];
    worksheet.addRow({
      fullName: "Nguyễn Văn A",
      userCode: "HS001",
      email: "nguyenvana@edu.vn",
      className: "10A1",
    });
    worksheet.addRow({
      fullName: "Trần Thị B",
      userCode: "HS002",
      email: "tranthib@edu.vn",
      className: "10A2",
    });
  } else {
    worksheet.columns = [
      { header: "Họ và Tên", key: "fullName", width: 25 },
      { header: "Mã Giáo Viên", key: "userCode", width: 18 },
      { header: "Email", key: "email", width: 28 },
    ];
    worksheet.addRow({
      fullName: "Lê Văn C",
      userCode: "GV001",
      email: "levanc@edu.vn",
    });
    worksheet.addRow({
      fullName: "Phạm Thị D",
      userCode: "GV002",
      email: "phamthid@edu.vn",
    });
  }

  // Header styling
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FF1E3A8A" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0E7FF" },
  };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
};

module.exports = {
  processImport,
  parseExcelBuffer,
  validateRow,
  generateTemplate,
};
