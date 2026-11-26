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
 * Trích xuất chuỗi text từ giá trị ô Excel (hỗ trợ Hyperlink, RichText, Formula, Date)
 * Tránh lỗi ô hyperlink bị biến thành chuỗi '[object Object]'
 * @param {any} cellVal
 * @returns {string}
 */
const getCellValue = (cellVal) => {
  if (cellVal === null || cellVal === undefined) return "";
  if (typeof cellVal === "object") {
    // Hyperlink cell: { text: "...", hyperlink: "..." }
    if (cellVal.text !== undefined && cellVal.text !== null) {
      if (
        typeof cellVal.text === "object" &&
        Array.isArray(cellVal.text.richText)
      ) {
        return cellVal.text.richText
          .map((item) => item.text || "")
          .join("")
          .trim();
      }
      return String(cellVal.text).trim();
    }
    // Khi ô chỉ có hyperlink
    if (cellVal.hyperlink) {
      return String(cellVal.hyperlink).replace(/^mailto:/i, "").trim();
    }
    // RichText cell: { richText: [{ text: "..." }] }
    if (Array.isArray(cellVal.richText)) {
      return cellVal.richText
        .map((item) => item.text || "")
        .join("")
        .trim();
    }
    // Formula cell: { formula: "...", result: "..." }
    if (cellVal.result !== undefined && cellVal.result !== null) {
      return String(cellVal.result).trim();
    }
    // Date
    if (cellVal instanceof Date) {
      return cellVal.toISOString();
    }
  }
  return String(cellVal).trim();
};

/**
 * Tách chuỗi danh sách mã học sinh (ví dụ: "HS001, HS002; HS003") thành mảng các mã duy nhất
 * @param {string|Array} rawInput
 * @returns {string[]}
 */
const parseStudentCodesList = (rawInput) => {
  if (!rawInput) return [];
  if (Array.isArray(rawInput)) {
    return [
      ...new Set(
        rawInput
          .map((item) => String(item || "").trim())
          .filter(Boolean)
      ),
    ];
  }
  const text = getCellValue(rawInput);
  if (!text) return [];
  return [
    ...new Set(
      text
        .split(/[,;|]+/)
        .map((code) => code.trim())
        .filter(Boolean)
    ),
  ];
};

/**
 * Đọc và parse dữ liệu từ buffer file Excel
 * @param {Buffer} buffer Dữ liệu file Excel
 * @returns {Promise<Array<object>>} Mảng dữ liệu các dòng
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
      parsedRow[header] = getCellValue(values[index]);
    });
    rows.push(parsedRow);
  });

  return rows;
};

/**
 * Validate 1 dòng dữ liệu import
 * - Hỗ trợ 3 vai trò: 'student' | 'teacher' | 'parent'
 * - Hỗ trợ cột thông tin Phụ huynh ngay trên file Import Học sinh (Họ tên Phụ huynh, Mã Phụ huynh, Email Phụ huynh)
 * - Hỗ trợ cột danh sách Mã Học Sinh Con ("HS001, HS002") trên file Import Phụ huynh
 * @param {object} row Dữ liệu 1 dòng
 * @param {string} role 'student' | 'teacher' | 'parent'
 * @returns {{ isValid: boolean, errors: string[], parsed: object }}
 */
const validateRow = (row, role) => {
  const errors = [];

  const fullName = getCellValue(
    row["Họ và Tên"] ||
      row["Họ tên Phụ huynh"] ||
      row["fullName"]
  );
  const userCode = getCellValue(
    row["Mã Học Sinh"] ||
      row["Mã Giáo Viên"] ||
      row["Mã Phụ Huynh"] ||
      row["Mã Phụ huynh"] ||
      row["userCode"]
  );
  const email = getCellValue(row["Email"] || row["email"]).toLowerCase();
  const className = getCellValue(row["Lớp"] || row["className"]);
  const phone = getCellValue(
    row["Số điện thoại"] ||
      row["Số điện thoại PH"] ||
      row["phone"] ||
      row["parentPhone"]
  );

  // Thông tin liên kết Phụ huynh - Học sinh khi import role = 'parent'
  const rawChildrenCodes =
    row["Mã Học Sinh Con"] ||
    row["Mã Học Sinh Liên Kết"] ||
    row["Danh sách Mã HS"] ||
    row["studentCodes"] ||
    row["childrenCodes"] ||
    (role === "parent" ? row["Mã Học Sinh"] : "");
  const childrenCodes = parseStudentCodesList(rawChildrenCodes);

  // Thông tin Phụ huynh đi kèm trên dòng Import Học sinh (role = 'student')
  const parentName = getCellValue(
    row["Họ tên Phụ huynh"] ||
      row["Tên Phụ Huynh"] ||
      row["Phụ huynh"] ||
      row["parentName"]
  );
  const parentEmail = getCellValue(
    row["Email Phụ huynh"] ||
      row["Email Phụ Huynh"] ||
      row["parentEmail"]
  ).toLowerCase();
  const parentCode = getCellValue(
    row["Mã Phụ huynh"] ||
      row["Mã Phụ Huynh"] ||
      row["parentCode"]
  );
  const parentPhone = getCellValue(
    row["Số điện thoại PH"] ||
      row["SĐT Phụ huynh"] ||
      row["parentPhone"]
  );

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

  if (role === "parent" && childrenCodes.length === 0) {
    errors.push(
      "Thiếu Mã Học Sinh Con để liên kết với tài khoản Phụ huynh"
    );
  }

  // Nếu dòng học sinh có khai báo Email Phụ huynh thì kiểm tra định dạng email phụ huynh
  if (role === "student" && parentEmail && !/^\S+@\S+\.\S+$/.test(parentEmail)) {
    errors.push(`Email Phụ huynh '${parentEmail}' không hợp lệ`);
  }

  const hasInlineParent =
    role === "student" && Boolean(parentEmail || parentCode);

  return {
    isValid: errors.length === 0,
    errors,
    parsed: {
      fullName,
      userCode,
      email,
      role,
      className: role === "student" ? className : null,
      phone: phone || null,
      childrenCodes: role === "parent" ? childrenCodes : [],
      parentInfo: hasInlineParent
        ? {
            fullName: parentName || `Phụ huynh HS ${fullName}`,
            email: parentEmail || null,
            userCode:
              parentCode ||
              (parentEmail
                ? `PH_${userCode}`
                : null),
            phone: parentPhone || phone || null,
          }
        : null,
    },
  };
};

/**
 * Xử lý import hàng loạt từ file Excel
 * - Hỗ trợ role: 'student' | 'teacher' | 'parent'
 * - Tự động xử lý và lưu danh sách học sinh được liên kết vào `childrenRefs` của tài khoản Phụ huynh
 * - Hỗ trợ một Phụ huynh liên kết với một hoặc nhiều Học sinh (cả khi import file 'parent' hoặc nhiều dòng 'student' có cùng Email/Mã Phụ huynh)
 * @param {Buffer} fileBuffer Buffer dữ liệu file
 * @param {string} role 'student' | 'teacher' | 'parent'
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
      linkedParents: [],
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

  const existingUsersQuery = User.find({
    $or: [
      { userCode: { $in: codesToCheck } },
      { email: { $in: emailsToCheck } },
    ],
  });
  const existingUsers =
    existingUsersQuery && typeof existingUsersQuery.select === "function"
      ? await existingUsersQuery.select("_id userCode email role childrenRefs")
      : Array.isArray(existingUsersQuery)
        ? existingUsersQuery
        : [];

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

  // 4. Nếu role === 'parent', đối chiếu danh sách Mã Học Sinh Con (childrenCodes) sang ObjectId (childrenRefs)
  const studentCodeToIdMap = new Map();
  if (role === "parent" && toInsert.length > 0) {
    const allChildCodes = [
      ...new Set(toInsert.flatMap((r) => r.parsed.childrenCodes || [])),
    ];

    if (allChildCodes.length > 0) {
      const findStudentsQuery = User.find({
        userCode: { $in: allChildCodes },
        role: "student",
      });
      const matchedStudents =
        findStudentsQuery && typeof findStudentsQuery.select === "function"
          ? await findStudentsQuery.select("_id userCode fullName className")
          : Array.isArray(findStudentsQuery)
            ? findStudentsQuery
            : [];

      matchedStudents.forEach((st) => {
        if (st && st.userCode && st._id) {
          studentCodeToIdMap.set(st.userCode, st._id);
        }
      });
    }

    // Kiểm tra các dòng parent có mã học sinh không tồn tại trong hệ thống
    const validParentRows = [];
    for (const row of toInsert) {
      const missingCodes = (row.parsed.childrenCodes || []).filter(
        (code) => !studentCodeToIdMap.has(code)
      );
      if (missingCodes.length > 0) {
        invalidRows.push({
          rowIndex: row.rowIndex,
          errors: [
            `Không tìm thấy học sinh có mã: ${missingCodes.join(", ")}`,
          ],
        });
      } else {
        row.parsed.childrenRefs = (row.parsed.childrenCodes || []).map((code) =>
          studentCodeToIdMap.get(code)
        );
        validParentRows.push(row);
      }
    }
    toInsert.length = 0;
    toInsert.push(...validParentRows);
  }

  // 5. Tạo tài khoản hàng loạt
  const createdAccounts = [];
  const linkedParents = [];

  if (toInsert.length > 0) {
    const Class = require("../models/Class");
    const classNames = [
      ...new Set(toInsert.map((r) => r.parsed.className).filter(Boolean)),
    ];
    const matchedClasses =
      classNames.length > 0
        ? await Class.find({
            name: { $in: classNames },
            isDeleted: false,
          }).select("_id name")
        : [];
    const classMap = new Map(matchedClasses.map((c) => [c.name, c._id]));

    const usersToCreate = await Promise.all(
      toInsert.map(async (row) => {
        const tempPassword = generateTempPassword();
        const hashedPassword = await hashPassword(tempPassword);
        const classRef = row.parsed.className
          ? classMap.get(row.parsed.className) || null
          : null;
        const childrenRefs = Array.isArray(row.parsed.childrenRefs)
          ? row.parsed.childrenRefs
          : [];

        const createdItem = {
          rowIndex: row.rowIndex,
          fullName: row.parsed.fullName,
          userCode: row.parsed.userCode,
          email: row.parsed.email,
          role: row.parsed.role,
          tempPassword,
        };

        if (role === "parent") {
          createdItem.childrenCodes = row.parsed.childrenCodes;
          createdItem.childrenRefs = childrenRefs;
        }

        createdAccounts.push(createdItem);

        const userDocPayload = {
          fullName: row.parsed.fullName,
          email: row.parsed.email,
          userCode: row.parsed.userCode,
          role: row.parsed.role,
          className: row.parsed.className,
          classRef,
          password: hashedPassword,
          mustChangePassword: true,
          isActivated: false,
        };

        if (childrenRefs.length > 0) {
          userDocPayload.childrenRefs = childrenRefs;
        }
        if (row.parsed.phone) {
          userDocPayload.phone = row.parsed.phone;
        }

        return userDocPayload;
      })
    );

    const insertedDocs = await User.insertMany(usersToCreate, {
      ordered: false,
    });

    // 6. Xử lý liên kết Phụ huynh - Học sinh đi kèm ngay trong file Import Học sinh (nếu có cột Phụ huynh)
    if (role === "student") {
      const rowsWithParent = toInsert.filter((r) => Boolean(r.parsed.parentInfo));
      if (rowsWithParent.length > 0) {
        // Ánh xạ userCode của học sinh vừa tạo sang _id
        const insertedMapByCode = new Map();
        if (Array.isArray(insertedDocs)) {
          insertedDocs.forEach((doc) => {
            if (doc && doc.userCode && doc._id) {
              insertedMapByCode.set(doc.userCode, doc._id);
            }
          });
        }

        // Nếu User.insertMany trả về mảng rỗng (ví dụ trong mock test), truy vấn lại hoặc tạo ObjectId đại diện
        if (insertedMapByCode.size === 0 && typeof User.find === "function") {
          const studentCodesForParent = rowsWithParent.map(
            (r) => r.parsed.userCode
          );
          const foundStudentsQuery = User.find({
            userCode: { $in: studentCodesForParent },
          });
          const foundStudents =
            foundStudentsQuery && typeof foundStudentsQuery.select === "function"
              ? await foundStudentsQuery.select("_id userCode")
              : Array.isArray(foundStudentsQuery)
                ? foundStudentsQuery
                : [];
          foundStudents.forEach((s) => {
            if (s && s.userCode && s._id) {
              insertedMapByCode.set(s.userCode, s._id);
            }
          });
        }

        // Gom nhóm theo Email Phụ huynh hoặc Mã Phụ huynh (hỗ trợ 1 Phụ huynh có nhiều con trong cùng file Excel)
        const parentGroups = new Map();
        for (const row of rowsWithParent) {
          const pInfo = row.parsed.parentInfo;
          const groupKey = (pInfo.email || pInfo.userCode).toLowerCase();
          if (!parentGroups.has(groupKey)) {
            parentGroups.set(groupKey, {
              fullName: pInfo.fullName,
              email: pInfo.email || `${pInfo.userCode.toLowerCase()}@parent.edulms.vn`,
              userCode: pInfo.userCode,
              phone: pInfo.phone,
              studentCodes: [],
              childrenRefs: [],
            });
          }
          const group = parentGroups.get(groupKey);
          group.studentCodes.push(row.parsed.userCode);
          const stId = insertedMapByCode.get(row.parsed.userCode);
          if (stId) {
            group.childrenRefs.push(stId);
          }
        }

        for (const [, pGroup] of parentGroups) {
          // Kiểm tra tài khoản Phụ huynh đã tồn tại trong DB hay chưa
          let existingParent = null;
          if (typeof User.findOne === "function") {
            existingParent = await User.findOne({
              $or: [
                ...(pGroup.email ? [{ email: pGroup.email }] : []),
                ...(pGroup.userCode ? [{ userCode: pGroup.userCode }] : []),
              ],
            });
          }

          if (existingParent) {
            // Cập nhật bổ sung học sinh mới vào childrenRefs (không ghi đè danh sách con cũ)
            const currentRefs = Array.isArray(existingParent.childrenRefs)
              ? existingParent.childrenRefs.map((id) => id.toString())
              : [];
            const mergedRefs = [
              ...new Set([
                ...currentRefs,
                ...pGroup.childrenRefs.map((id) => id.toString()),
              ]),
            ];
            existingParent.childrenRefs = mergedRefs;
            if (typeof existingParent.save === "function") {
              await existingParent.save();
            } else if (typeof User.findByIdAndUpdate === "function") {
              await User.findByIdAndUpdate(existingParent._id, {
                $addToSet: { childrenRefs: { $each: pGroup.childrenRefs } },
              });
            }
            linkedParents.push({
              userCode: existingParent.userCode,
              email: existingParent.email,
              fullName: existingParent.fullName,
              studentCodes: pGroup.studentCodes,
              childrenRefs: mergedRefs,
              isNewAccount: false,
            });
          } else {
            const tempPassword = generateTempPassword();
            const hashedPassword = await hashPassword(tempPassword);
            const newParentPayload = {
              fullName: pGroup.fullName,
              email: pGroup.email,
              userCode: pGroup.userCode,
              role: "parent",
              phone: pGroup.phone,
              childrenRefs: pGroup.childrenRefs,
              password: hashedPassword,
              mustChangePassword: true,
              isActivated: false,
            };

            if (typeof User.create === "function") {
              await User.create(newParentPayload);
            } else {
              await User.insertMany([newParentPayload], { ordered: false });
            }

            linkedParents.push({
              userCode: pGroup.userCode,
              email: pGroup.email,
              fullName: pGroup.fullName,
              studentCodes: pGroup.studentCodes,
              childrenRefs: pGroup.childrenRefs,
              tempPassword,
              isNewAccount: true,
            });
          }
        }
      }
    }
  }

  // 7. Sắp xếp danh sách lỗi theo dòng
  invalidRows.sort((a, b) => a.rowIndex - b.rowIndex);
  const failures = invalidRows.map((r) => ({
    row: r.rowIndex,
    errors: r.errors,
  }));

  const responsePayload = {
    totalRows: rows.length,
    successCount: createdAccounts.length,
    failCount: failures.length,
    failures,
    createdAccounts,
  };

  if (linkedParents.length > 0) {
    responsePayload.linkedParents = linkedParents;
  }

  return responsePayload;
};

/**
 * Tạo file Excel mẫu (.xlsx) để tải về
 * @param {string} role 'student' | 'teacher' | 'parent'
 * @returns {Promise<Buffer>}
 */
const generateTemplate = async (role) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Edu-LMS";
  const sheetName =
    role === "student"
      ? "Danh sách học sinh"
      : role === "parent"
        ? "Danh sách phụ huynh"
        : "Danh sách giáo viên";
  const worksheet = workbook.addWorksheet(sheetName);

  if (role === "student") {
    worksheet.columns = [
      { header: "Họ và Tên", key: "fullName", width: 25 },
      { header: "Mã Học Sinh", key: "userCode", width: 18 },
      { header: "Email", key: "email", width: 28 },
      { header: "Lớp", key: "className", width: 12 },
      { header: "Họ tên Phụ huynh", key: "parentName", width: 25 },
      { header: "Mã Phụ huynh", key: "parentCode", width: 18 },
      { header: "Email Phụ huynh", key: "parentEmail", width: 28 },
      { header: "Số điện thoại PH", key: "parentPhone", width: 18 },
    ];
    worksheet.addRow({
      fullName: "Nguyễn Văn A",
      userCode: "HS001",
      email: "nguyenvana@edu.vn",
      className: "10A1",
      parentName: "Nguyễn Văn Phụ Huynh",
      parentCode: "PH001",
      parentEmail: "phuhuynha@edu.vn",
      parentPhone: "0901234567",
    });
    worksheet.addRow({
      fullName: "Trần Thị B",
      userCode: "HS002",
      email: "tranthib@edu.vn",
      className: "10A2",
      parentName: "Trần Văn Phụ Huynh",
      parentCode: "PH002",
      parentEmail: "phuhuynhb@edu.vn",
      parentPhone: "0907654321",
    });
  } else if (role === "parent") {
    worksheet.columns = [
      { header: "Họ và Tên", key: "fullName", width: 25 },
      { header: "Mã Phụ Huynh", key: "userCode", width: 18 },
      { header: "Email", key: "email", width: 28 },
      { header: "Mã Học Sinh Con", key: "childrenCodes", width: 25 },
      { header: "Số điện thoại", key: "phone", width: 18 },
    ];
    worksheet.addRow({
      fullName: "Nguyễn Văn Phụ Huynh",
      userCode: "PH001",
      email: "phuhuynh1@edu.vn",
      childrenCodes: "HS001, HS002",
      phone: "0901234567",
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
  parseStudentCodesList,
  validateRow,
  generateTemplate,
};
