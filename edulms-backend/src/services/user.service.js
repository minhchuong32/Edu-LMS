const User = require("../models/User");
const Class = require("../models/Class");
const bcrypt = require("bcryptjs");
const xlsx = require("xlsx");
const ApiError = require("../utils/ApiError");

/**
 * Generate a random 8-character temporary password
 */
const generateTempPassword = () => {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let password = "";
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

/**
 * Map raw Excel keys to standard schema fields to support various English & Vietnamese headers
 */
const mapHeaders = (rawRow) => {
  const normalized = {};
  for (const key of Object.keys(rawRow)) {
    const cleanKey = key.trim().toLowerCase();
    const cleanVal = String(rawRow[key] !== undefined && rawRow[key] !== null ? rawRow[key] : "").trim();

    if (["họ và tên", "họ tên", "tên học sinh", "tên giáo viên", "fullname", "name", "tên"].includes(cleanKey)) {
      normalized.name = cleanVal;
    } else if (["email", "địa chỉ email", "mail"].includes(cleanKey)) {
      normalized.email = cleanVal;
    } else if (["role", "vai trò", "chức vụ", "loại"].includes(cleanKey)) {
      normalized.role = cleanVal;
    } else if (["mssv", "msgv", "mã học sinh", "mã giáo viên", "mã", "code", "mã số"].includes(cleanKey)) {
      normalized.code = cleanVal;
    } else if (["lớp", "lớp học", "class"].includes(cleanKey)) {
      normalized.class = cleanVal;
    }
  }

  // Fallback to exact properties if not mapped
  if (!normalized.name && rawRow.name) normalized.name = String(rawRow.name).trim();
  if (!normalized.email && rawRow.email) normalized.email = String(rawRow.email).trim();
  if (!normalized.role && rawRow.role) normalized.role = String(rawRow.role).trim();
  if (!normalized.code && rawRow.code) normalized.code = String(rawRow.code).trim();
  if (!normalized.class && rawRow.class) normalized.class = String(rawRow.class).trim();

  return normalized;
};

/**
 * Import Users (Students/Teachers) from Excel buffer
 */
const importUsersFromExcel = async (fileBuffer, defaultRole) => {
  if (!fileBuffer) {
    throw new ApiError(400, "Vui lòng tải lên một tệp tin Excel");
  }

  let workbook;
  try {
    workbook = xlsx.read(fileBuffer, { type: "buffer" });
  } catch (err) {
    throw new ApiError(400, "Không thể đọc tệp tin Excel. Định dạng không hợp lệ hoặc bị lỗi.");
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new ApiError(400, "Tệp tin Excel trống (không tìm thấy trang tính nào).");
  }

  const worksheet = workbook.Sheets[sheetName];
  const rawRows = xlsx.utils.sheet_to_json(worksheet, { raw: false });

  if (rawRows.length === 0) {
    throw new ApiError(400, "Tệp tin Excel không có dữ liệu dòng nào.");
  }

  const normalizedRows = rawRows.map((row, index) => ({
    rawIndex: index + 2, // Excel row number (assuming row 1 is headers, row 2 is index 0)
    data: mapHeaders(row),
    rawData: row
  }));

  // Collect unique emails, codes, and classes for batch DB queries
  const emailsInSheet = new Set();
  const codesInSheet = new Set();
  const classNamesInSheet = new Set();

  normalizedRows.forEach(({ data }) => {
    if (data.email) emailsInSheet.add(data.email.toLowerCase().trim());
    if (data.code) codesInSheet.add(data.code.toUpperCase().trim());
    if (data.class) classNamesInSheet.add(data.class.toLowerCase().trim());
  });

  // Query database in batch to minimize database operations
  const [existingUsers, existingClasses] = await Promise.all([
    User.find({
      $or: [
        { email: { $in: Array.from(emailsInSheet) } },
        { studentCode: { $in: Array.from(codesInSheet) } },
        { teacherCode: { $in: Array.from(codesInSheet) } }
      ]
    }),
    Class.find({
      name: { $in: Array.from(classNamesInSheet).map(c => new RegExp(`^${c}$`, 'i')) }
    })
  ]);

  // Index existing records for O(1) verification checks
  const existingEmailsSet = new Set(existingUsers.map(u => u.email.toLowerCase()));
  const existingStudentCodesSet = new Set(existingUsers.filter(u => u.studentCode).map(u => u.studentCode.toUpperCase()));
  const existingTeacherCodesSet = new Set(existingUsers.filter(u => u.teacherCode).map(u => u.teacherCode.toUpperCase()));

  const classMap = new Map();
  existingClasses.forEach(c => {
    classMap.set(c.name.toLowerCase().trim(), c._id);
  });

  // Track duplicates within the uploaded file itself
  const processedEmails = new Set();
  const processedCodes = new Set();

  const successReports = [];
  const errorReports = [];
  const usersToInsert = [];

  for (const { rawIndex, data, rawData } of normalizedRows) {
    const rowErrors = [];
    const { name, email, code } = data;
    const className = data.class;
    let role = data.role || defaultRole || "student";

    // 1. Validate Name
    if (!name) {
      rowErrors.push("Họ tên không được để trống.");
    }

    // 2. Validate Role
    role = role.toLowerCase().trim();
    if (["hs", "học sinh", "hoc sinh", "student"].includes(role)) {
      role = "student";
    } else if (["gv", "giáo viên", "giao vien", "teacher"].includes(role)) {
      role = "teacher";
    } else {
      rowErrors.push(`Vai trò '${role}' không hợp lệ (chỉ chấp nhận 'student' hoặc 'teacher').`);
    }

    // 3. Validate Email
    if (!email) {
      rowErrors.push("Email không được để trống.");
    } else {
      const emailLower = email.toLowerCase().trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailLower)) {
        rowErrors.push("Định dạng email không hợp lệ.");
      } else if (processedEmails.has(emailLower)) {
        rowErrors.push(`Email '${email}' bị trùng lặp trong tệp tin Excel.`);
      } else if (existingEmailsSet.has(emailLower)) {
        rowErrors.push(`Email '${email}' đã tồn tại trên hệ thống.`);
      } else {
        processedEmails.add(emailLower);
      }
    }

    // 4. Validate Code (studentCode / teacherCode)
    if (!code) {
      if (role === "student") {
        rowErrors.push("Mã học sinh (studentCode) không được để trống.");
      } else if (role === "teacher") {
        rowErrors.push("Mã giáo viên (teacherCode) không được để trống.");
      }
    } else {
      const codeUpper = code.toUpperCase().trim();
      if (processedCodes.has(codeUpper)) {
        rowErrors.push(`Mã định danh '${code}' bị trùng lặp trong tệp tin Excel.`);
      } else {
        if (role === "student" && existingStudentCodesSet.has(codeUpper)) {
          rowErrors.push(`Mã học sinh '${code}' đã tồn tại trên hệ thống.`);
        } else if (role === "teacher" && existingTeacherCodesSet.has(codeUpper)) {
          rowErrors.push(`Mã giáo viên '${code}' đã tồn tại trên hệ thống.`);
        } else {
          processedCodes.add(codeUpper);
        }
      }
    }

    // 5. Validate Class (only relevant for students, optional but must exist if provided)
    let classRef = undefined;
    if (role === "student" && className) {
      const normClassName = className.toLowerCase().trim();
      if (classMap.has(normClassName)) {
        classRef = classMap.get(normClassName);
      } else {
        rowErrors.push(`Lớp học '${className}' không tồn tại trên hệ thống.`);
      }
    }

    // Output row summary
    if (rowErrors.length > 0) {
      errorReports.push({
        row: rawIndex,
        name: name || "",
        email: email || "",
        code: code || "",
        errors: rowErrors,
        rawData
      });
    } else {
      const tempPassword = generateTempPassword();
      usersToInsert.push({
        rawIndex,
        name,
        email: email.toLowerCase().trim(),
        role,
        studentCode: role === "student" ? code.trim() : undefined,
        teacherCode: role === "teacher" ? code.trim() : undefined,
        classRef,
        tempPassword
      });
    }
  }

  // Insert valid users if there are any
  if (usersToInsert.length > 0) {
    const salt = await bcrypt.genSalt(10);

    // Hash passwords in parallel
    const hashedUsers = await Promise.all(
      usersToInsert.map(async (u) => {
        const hashedPassword = await bcrypt.hash(u.tempPassword, salt);
        return {
          name: u.name,
          email: u.email,
          password: hashedPassword,
          role: u.role,
          studentCode: u.studentCode,
          teacherCode: u.teacherCode,
          classRef: u.classRef,
          isActivated: false
        };
      })
    );

    // Batch insert users into database
    await User.insertMany(hashedUsers);

    // Form success details for the report
    usersToInsert.forEach((u) => {
      let resolvedClassName = "";
      if (u.classRef) {
        const cls = existingClasses.find(c => String(c._id) === String(u.classRef));
        if (cls) resolvedClassName = cls.name;
      }

      successReports.push({
        row: u.rawIndex,
        name: u.name,
        email: u.email,
        role: u.role,
        code: u.role === "student" ? u.studentCode : u.teacherCode,
        class: resolvedClassName,
        temporaryPassword: u.tempPassword
      });
    });
  }

  return {
    summary: {
      totalRows: normalizedRows.length,
      successCount: successReports.length,
      failCount: errorReports.length
    },
    importedUsers: successReports,
    errors: errorReports
  };
};

/**
 * Retrieve user list based on query criteria (search, role, & classRef)
 */
const getUsers = async (filters = {}) => {
  const { role, search, classRef } = filters;
  const query = {};

  if (role && ["student", "teacher", "parent", "admin"].includes(role)) {
    query.role = role;
  }

  if (classRef === "unassigned" || classRef === "null") {
    query.classRef = null;
  } else if (classRef) {
    query.classRef = classRef;
  }

  if (search) {
    const searchRegex = new RegExp(search.trim(), "i");
    query.$or = [
      { name: searchRegex },
      { email: searchRegex },
      { studentCode: searchRegex },
      { teacherCode: searchRegex }
    ];
  }

  return await User.find(query)
    .populate("classRef", "name schoolYear")
    .sort({ createdAt: -1 });
};

/**
 * Assign or Remove student from a class
 */
const updateUserClass = async (userId, classRef) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "Không tìm thấy người dùng này.");
  }
  if (user.role !== "student") {
    throw new ApiError(400, "Chỉ có thể xếp lớp hoặc xóa khỏi lớp cho học sinh.");
  }

  if (classRef) {
    const classExists = await Class.findById(classRef);
    if (!classExists) {
      throw new ApiError(404, "Không tìm thấy lớp học này.");
    }
    user.classRef = classRef;
  } else {
    user.classRef = null;
  }

  await user.save();
  return await User.findById(userId).populate("classRef", "name schoolYear");
};

/**
 * Create a new user (admin/teacher/student/parent)
 */
const createUser = async (data) => {
  const { name, email, password, role, studentCode, teacherCode, classRef, childrenRefs, isActivated } = data;

  if (!name || !name.trim()) {
    throw new ApiError(400, "Họ và tên không được để trống.");
  }
  if (!email || !email.trim()) {
    throw new ApiError(400, "Email không được để trống.");
  }

  const emailLower = email.toLowerCase().trim();
  const existingEmail = await User.findOne({ email: emailLower });
  if (existingEmail) {
    throw new ApiError(400, `Email '${email}' đã được sử dụng.`);
  }

  const validRoles = ["student", "teacher", "admin", "parent"];
  const userRole = role && validRoles.includes(role) ? role : "student";

  // Code uniqueness check
  let finalStudentCode = undefined;
  let finalTeacherCode = undefined;

  if (userRole === "student" && studentCode && studentCode.trim()) {
    const codeUpper = studentCode.trim().toUpperCase();
    const existingCode = await User.findOne({ studentCode: codeUpper });
    if (existingCode) {
      throw new ApiError(400, `Mã học sinh '${studentCode}' đã tồn tại.`);
    }
    finalStudentCode = codeUpper;
  }

  if (userRole === "teacher" && teacherCode && teacherCode.trim()) {
    const codeUpper = teacherCode.trim().toUpperCase();
    const existingCode = await User.findOne({ teacherCode: codeUpper });
    if (existingCode) {
      throw new ApiError(400, `Mã giáo viên '${teacherCode}' đã tồn tại.`);
    }
    finalTeacherCode = codeUpper;
  }

  // Validate Class for student
  let finalClassRef = undefined;
  if (userRole === "student" && classRef) {
    const classExists = await Class.findById(classRef);
    if (!classExists) {
      throw new ApiError(404, "Lớp học được chọn không tồn tại.");
    }
    finalClassRef = classRef;
  }

  // Handle password
  let userPassword = password;
  if (!userPassword || !userPassword.trim()) {
    userPassword = generateTempPassword();
  } else if (userPassword.trim().length < 6) {
    throw new ApiError(400, "Mật khẩu phải có ít nhất 6 ký tự.");
  }

  const newUser = await User.create({
    name: name.trim(),
    email: emailLower,
    password: userPassword,
    role: userRole,
    studentCode: finalStudentCode,
    teacherCode: finalTeacherCode,
    classRef: finalClassRef,
    childrenRefs: Array.isArray(childrenRefs) ? childrenRefs : [],
    isActivated: isActivated !== undefined ? Boolean(isActivated) : true,
  });

  return await User.findById(newUser._id)
    .populate("classRef", "name schoolYear")
    .populate("childrenRefs", "name email studentCode");
};

/**
 * Get user by ID
 */
const getUserById = async (id) => {
  const user = await User.findById(id)
    .populate("classRef", "name schoolYear")
    .populate("childrenRefs", "name email studentCode");
  if (!user) {
    throw new ApiError(404, "Không tìm thấy người dùng này.");
  }
  return user;
};

/**
 * Update user profile / role / class / status
 */
const updateUser = async (id, data) => {
  const user = await User.findById(id);
  if (!user) {
    throw new ApiError(404, "Không tìm thấy người dùng này.");
  }

  const { name, email, password, role, studentCode, teacherCode, classRef, childrenRefs, isActivated } = data;

  if (name !== undefined) {
    if (!name.trim()) throw new ApiError(400, "Họ và tên không được để trống.");
    user.name = name.trim();
  }

  if (email !== undefined) {
    const emailLower = email.toLowerCase().trim();
    if (!emailLower) throw new ApiError(400, "Email không được để trống.");
    if (emailLower !== user.email) {
      const existingEmail = await User.findOne({ email: emailLower });
      if (existingEmail) throw new ApiError(400, `Email '${email}' đã được sử dụng bởi người dùng khác.`);
      user.email = emailLower;
    }
  }

  if (role !== undefined) {
    const validRoles = ["student", "teacher", "admin", "parent"];
    if (validRoles.includes(role)) {
      user.role = role;
    }
  }

  // Update codes based on role
  if (studentCode !== undefined) {
    if (studentCode && studentCode.trim()) {
      const codeUpper = studentCode.trim().toUpperCase();
      if (codeUpper !== user.studentCode) {
        const existingCode = await User.findOne({ studentCode: codeUpper });
        if (existingCode && existingCode._id.toString() !== id) {
          throw new ApiError(400, `Mã học sinh '${studentCode}' đã tồn tại.`);
        }
      }
      user.studentCode = codeUpper;
    } else {
      user.studentCode = undefined;
    }
  }

  if (teacherCode !== undefined) {
    if (teacherCode && teacherCode.trim()) {
      const codeUpper = teacherCode.trim().toUpperCase();
      if (codeUpper !== user.teacherCode) {
        const existingCode = await User.findOne({ teacherCode: codeUpper });
        if (existingCode && existingCode._id.toString() !== id) {
          throw new ApiError(400, `Mã giáo viên '${teacherCode}' đã tồn tại.`);
        }
      }
      user.teacherCode = codeUpper;
    } else {
      user.teacherCode = undefined;
    }
  }

  if (classRef !== undefined) {
    if (classRef) {
      const classExists = await Class.findById(classRef);
      if (!classExists) throw new ApiError(404, "Lớp học được chọn không tồn tại.");
      user.classRef = classRef;
    } else {
      user.classRef = null;
    }
  }

  if (childrenRefs !== undefined) {
    user.childrenRefs = Array.isArray(childrenRefs) ? childrenRefs : [];
  }

  if (isActivated !== undefined) {
    user.isActivated = Boolean(isActivated);
  }

  // Password reset if provided
  if (password && password.trim()) {
    if (password.trim().length < 6) {
      throw new ApiError(400, "Mật khẩu mới phải có ít nhất 6 ký tự.");
    }
    user.password = password.trim();
  }

  await user.save();

  return await User.findById(id)
    .populate("classRef", "name schoolYear")
    .populate("childrenRefs", "name email studentCode");
};

/**
 * Delete user
 */
const deleteUser = async (id, currentUser) => {
  if (currentUser && currentUser._id.toString() === id.toString()) {
    throw new ApiError(400, "Bạn không thể tự xóa tài khoản quản trị viên của chính mình.");
  }

  const user = await User.findById(id);
  if (!user) {
    throw new ApiError(404, "Không tìm thấy người dùng này.");
  }

  await User.findByIdAndDelete(id);
  return { id, deleted: true };
};

module.exports = {
  importUsersFromExcel,
  getUsers,
  updateUserClass,
  createUser,
  getUserById,
  updateUser,
  deleteUser,
};


