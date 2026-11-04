const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
require("node:dns").setServers(["8.8.8.8", "1.1.1.1"]);
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("../models/User");
const Grade = require("../models/Grade");
const Class = require("../models/Class");
const Subject = require("../models/Subject");
const TeachingAssignment = require("../models/TeachingAssignment");

// Danh sách Tài khoản mẫu
const SAMPLE_USERS = [
  // Quản trị viên
  {
    userCode: "AD001",
    email: "admin@edulms.test",
    fullName: "Quản trị viên Hệ thống",
    role: "admin",
    className: null,
  },
  // Giáo viên
  {
    userCode: "GV001",
    email: "teacher1@edulms.test",
    fullName: "Thầy Nguyễn Văn Toán",
    role: "teacher",
    className: null,
  },
  {
    userCode: "GV002",
    email: "teacher2@edulms.test",
    fullName: "Cô Trần Thị Văn",
    role: "teacher",
    className: null,
  },
  {
    userCode: "GV003",
    email: "teacher3@edulms.test",
    fullName: "Thầy Lê Văn Anh",
    role: "teacher",
    className: null,
  },
  {
    userCode: "GV004",
    email: "teacher4@edulms.test",
    fullName: "Cô Phạm Thị Lý",
    role: "teacher",
    className: null,
  },
  {
    userCode: "GV005",
    email: "teacher5@edulms.test",
    fullName: "Thầy Hoàng Văn Hóa",
    role: "teacher",
    className: null,
  },
  {
    userCode: "GV006",
    email: "teacher6@edulms.test",
    fullName: "Cô Vũ Thị Sinh",
    role: "teacher",
    className: null,
  },
  {
    userCode: "GV007",
    email: "teacher7@edulms.test",
    fullName: "Thầy Đỗ Văn Sử",
    role: "teacher",
    className: null,
  },
  {
    userCode: "GV008",
    email: "teacher8@edulms.test",
    fullName: "Cô Bùi Thị Địa",
    role: "teacher",
    className: null,
  },
  {
    userCode: "GV009",
    email: "teacher9@edulms.test",
    fullName: "Thầy Ngô Văn Tin",
    role: "teacher",
    className: null,
  },
  // Học sinh
  {
    userCode: "HS001",
    email: "student1@edulms.test",
    fullName: "Nguyễn Văn An",
    role: "student",
    className: "10A1",
  },
  {
    userCode: "HS002",
    email: "student2@edulms.test",
    fullName: "Trần Thị Bình",
    role: "student",
    className: "10A1",
  },
  {
    userCode: "HS003",
    email: "student3@edulms.test",
    fullName: "Lê Hoàng Cường",
    role: "student",
    className: "10A2",
  },
  {
    userCode: "HS004",
    email: "student4@edulms.test",
    fullName: "Phạm Ngọc Dung",
    role: "student",
    className: "11A1",
  },
  {
    userCode: "HS005",
    email: "student5@edulms.test",
    fullName: "Hoàng Minh Đức",
    role: "student",
    className: "11A2",
  },
  {
    userCode: "HS006",
    email: "student6@edulms.test",
    fullName: "Vũ Hải Yến",
    role: "student",
    className: "12A1",
  },
  // Phụ huynh
  {
    userCode: "PH001",
    email: "parent1@edulms.test",
    fullName: "Phụ huynh Nguyễn Văn Nam",
    role: "parent",
    className: null,
  },
  {
    userCode: "PH002",
    email: "parent2@edulms.test",
    fullName: "Phụ huynh Trần Thị Lan",
    role: "parent",
    className: null,
  },
];

// Danh sách Khối học mẫu
const SAMPLE_GRADES = [
  { level: 10, name: "Khối 10", description: "Khối lớp 10 THPT", isActive: true },
  { level: 11, name: "Khối 11", description: "Khối lớp 11 THPT", isActive: true },
  { level: 12, name: "Khối 12", description: "Khối lớp 12 THPT", isActive: true },
];

// Danh sách Môn học mẫu
const SAMPLE_SUBJECTS = [
  { code: "TOAN", name: "Toán học", periodsPerWeek: 4, description: "Môn Toán học THPT", isActive: true },
  { code: "VAN", name: "Ngữ văn", periodsPerWeek: 4, description: "Môn Ngữ văn THPT", isActive: true },
  { code: "ANH", name: "Tiếng Anh", periodsPerWeek: 3, description: "Môn Tiếng Anh THPT", isActive: true },
  { code: "LY", name: "Vật lí", periodsPerWeek: 2, description: "Môn Vật lí THPT", isActive: true },
  { code: "HOA", name: "Hóa học", periodsPerWeek: 2, description: "Môn Hóa học THPT", isActive: true },
  { code: "SINH", name: "Sinh học", periodsPerWeek: 2, description: "Môn Sinh học THPT", isActive: true },
  { code: "SU", name: "Lịch sử", periodsPerWeek: 2, description: "Môn Lịch sử THPT", isActive: true },
  { code: "DIA", name: "Địa lí", periodsPerWeek: 2, description: "Môn Địa lí THPT", isActive: true },
  { code: "TIN", name: "Tin học", periodsPerWeek: 2, description: "Môn Tin học ứng dụng", isActive: true },
  { code: "GDCD", name: "Giáo dục công dân", periodsPerWeek: 1, description: "Môn GDCD & Pháp luật", isActive: true },
  { code: "GDTC", name: "Giáo dục thể chất", periodsPerWeek: 2, description: "Môn Thể dục thể thao", isActive: true },
];

async function main() {
  const uri = process.env.MONGO_URI;
  const password = process.env.SEED_PASSWORD;

  const isAllowedDb =
    uri &&
    (uri.includes("staging") ||
      uri.includes("dev") ||
      uri.includes("edulms") ||
      uri.includes("localhost") ||
      uri.includes("127.0.0.1"));

  if (!isAllowedDb) {
    console.error("Từ chối: MONGO_URI phải trỏ tới database có chữ 'dev', 'staging' hoặc 'edulms'.");
    process.exit(1);
  }
  if (!password) {
    console.error("Thiếu biến SEED_PASSWORD.");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("=== ĐÃ KẾT NỐI MONGODB ===");
  console.log("Database:", mongoose.connection.name);

  const hash = await bcrypt.hash(password, 10);

  // 1. SEED USERS
  console.log("\n--- 1. SEED USERS ---");
  const userMap = new Map(); // userCode -> User doc
  for (const u of SAMPLE_USERS) {
    const userDoc = await User.findOneAndUpdate(
      { email: u.email },
      {
        $set: {
          ...u,
          password: hash,
          mustChangePassword: false,
          isActivated: true,
          isDeleted: false,
        },
      },
      { upsert: true, new: true, runValidators: true }
    );
    userMap.set(u.userCode, userDoc);
    console.log(`[USER] ${u.userCode} | ${u.role.padEnd(8)} | ${u.email} (${u.fullName})`);
  }

  // 2. SEED GRADES
  console.log("\n--- 2. SEED GRADES (KHỐI HỌC) ---");
  const gradeMap = new Map(); // level -> Grade doc
  for (const g of SAMPLE_GRADES) {
    const gradeDoc = await Grade.findOneAndUpdate(
      { level: g.level },
      {
        $set: {
          name: g.name,
          description: g.description,
          isActive: g.isActive,
          isDeleted: false,
        },
      },
      { upsert: true, new: true, runValidators: true }
    );
    gradeMap.set(g.level, gradeDoc);
    console.log(`[GRADE] ${gradeDoc.name} (Khối ${gradeDoc.level}) - ID: ${gradeDoc._id}`);
  }

  // 3. SEED SUBJECTS
  console.log("\n--- 3. SEED SUBJECTS (MÔN HỌC) ---");
  const subjectMap = new Map(); // code -> Subject doc
  for (const s of SAMPLE_SUBJECTS) {
    const subjectDoc = await Subject.findOneAndUpdate(
      { code: s.code },
      {
        $set: {
          name: s.name,
          periodsPerWeek: s.periodsPerWeek,
          description: s.description,
          isActive: s.isActive,
          isDeleted: false,
        },
      },
      { upsert: true, new: true, runValidators: true }
    );
    subjectMap.set(s.code, subjectDoc);
    console.log(`[SUBJECT] ${s.code.padEnd(6)} | ${s.name} (${s.periodsPerWeek} tiết/tuần)`);
  }

  // 4. SEED CLASSES
  console.log("\n--- 4. SEED CLASSES (LỚP HỌC & GV CHỦ NHIỆM) ---");
  const academicYear = "2025-2026";
  const SAMPLE_CLASSES = [
    {
      name: "10A1",
      gradeLevel: 10,
      academicYear,
      homeroomTeacherCode: "GV001", // Thầy Nguyễn Văn Toán
      room: "P.101",
      capacity: 45,
      description: "Lớp chọn Tự nhiên Khối 10",
    },
    {
      name: "10A2",
      gradeLevel: 10,
      academicYear,
      homeroomTeacherCode: "GV002", // Cô Trần Thị Văn
      room: "P.102",
      capacity: 45,
      description: "Lớp chọn Xã hội Khối 10",
    },
    {
      name: "10A3",
      gradeLevel: 10,
      academicYear,
      homeroomTeacherCode: null,
      room: "P.103",
      capacity: 40,
      description: "Lớp cơ bản Khối 10",
    },
    {
      name: "11A1",
      gradeLevel: 11,
      academicYear,
      homeroomTeacherCode: "GV003", // Thầy Lê Văn Anh
      room: "P.201",
      capacity: 42,
      description: "Lớp chuyên Ngoại ngữ Khối 11",
    },
    {
      name: "11A2",
      gradeLevel: 11,
      academicYear,
      homeroomTeacherCode: null,
      room: "P.202",
      capacity: 42,
      description: "Lớp định hướng KHTN Khối 11",
    },
    {
      name: "12A1",
      gradeLevel: 12,
      academicYear,
      homeroomTeacherCode: "GV004", // Cô Phạm Thị Lý
      room: "P.301",
      capacity: 40,
      description: "Lớp chọn Khối 12",
    },
    {
      name: "12A2",
      gradeLevel: 12,
      academicYear,
      homeroomTeacherCode: null,
      room: "P.302",
      capacity: 40,
      description: "Lớp chuẩn bị thi TN THPT",
    },
  ];

  const classMap = new Map(); // className -> Class doc
  for (const c of SAMPLE_CLASSES) {
    const gradeDoc = gradeMap.get(c.gradeLevel);
    const homeroomTeacherDoc = c.homeroomTeacherCode
      ? userMap.get(c.homeroomTeacherCode)
      : null;

    const classDoc = await Class.findOneAndUpdate(
      { name: c.name, academicYear: c.academicYear },
      {
        $set: {
          grade: gradeDoc._id,
          academicYear: c.academicYear,
          homeroomTeacher: homeroomTeacherDoc ? homeroomTeacherDoc._id : null,
          room: c.room,
          capacity: c.capacity,
          description: c.description,
          isActive: true,
          isDeleted: false,
        },
      },
      { upsert: true, new: true, runValidators: true }
    );
    classMap.set(c.name, classDoc);
    const gvcnText = homeroomTeacherDoc
      ? `GVCN: ${homeroomTeacherDoc.fullName} (${c.homeroomTeacherCode})`
      : "Chưa có GVCN";
    console.log(`[CLASS] ${c.name} | Năm: ${c.academicYear} | Khối ${c.gradeLevel} | Phòng ${c.room} | ${gvcnText}`);
  }

  // 5. SEED TEACHING ASSIGNMENTS (PHÂN CÔNG GIẢNG DẠY)
  console.log("\n--- 5. SEED TEACHING ASSIGNMENTS (PHÂN CÔNG BỘ MÔN) ---");
  const SAMPLE_ASSIGNMENTS = [
    // Lớp 10A1
    {
      className: "10A1",
      subjectCode: "TOAN",
      teacherCode: "GV001", // Thầy Toán
      academicYear,
      semester: "CaNam",
      periodsPerWeek: 4,
      schedules: [
        { dayOfWeek: 2, startPeriod: 1, endPeriod: 2, room: "P.101" },
        { dayOfWeek: 4, startPeriod: 3, endPeriod: 4, room: "P.101" },
      ],
      note: "Phân công dạy chính môn Toán",
    },
    {
      className: "10A1",
      subjectCode: "VAN",
      teacherCode: "GV002", // Cô Văn
      academicYear,
      semester: "CaNam",
      periodsPerWeek: 4,
      schedules: [
        { dayOfWeek: 3, startPeriod: 1, endPeriod: 2, room: "P.101" },
        { dayOfWeek: 5, startPeriod: 1, endPeriod: 2, room: "P.101" },
      ],
      note: "Phân công dạy chính môn Ngữ văn",
    },
    {
      className: "10A1",
      subjectCode: "ANH",
      teacherCode: "GV003", // Thầy Anh
      academicYear,
      semester: "CaNam",
      periodsPerWeek: 3,
      schedules: [
        { dayOfWeek: 2, startPeriod: 3, endPeriod: 4, room: "P.101" },
        { dayOfWeek: 6, startPeriod: 1, endPeriod: 1, room: "P.101" },
      ],
      note: "Tiếng Anh hệ 10 năm",
    },
    {
      className: "10A1",
      subjectCode: "LY",
      teacherCode: "GV004", // Cô Lý
      academicYear,
      semester: "CaNam",
      periodsPerWeek: 2,
      schedules: [
        { dayOfWeek: 3, startPeriod: 3, endPeriod: 4, room: "P.101" },
      ],
      note: "Vật lí cơ bản",
    },
    {
      className: "10A1",
      subjectCode: "HOA",
      teacherCode: "GV005", // Thầy Hóa
      academicYear,
      semester: "CaNam",
      periodsPerWeek: 2,
      schedules: [
        { dayOfWeek: 4, startPeriod: 1, endPeriod: 2, room: "P.101" },
      ],
      note: "Hóa học cơ bản",
    },
    {
      className: "10A1",
      subjectCode: "SINH",
      teacherCode: "GV006", // Cô Sinh
      academicYear,
      semester: "CaNam",
      periodsPerWeek: 2,
      schedules: [
        { dayOfWeek: 5, startPeriod: 3, endPeriod: 4, room: "P.101" },
      ],
      note: "Sinh học thực nghiệm",
    },
    {
      className: "10A1",
      subjectCode: "TIN",
      teacherCode: "GV009", // Thầy Tin
      academicYear,
      semester: "CaNam",
      periodsPerWeek: 2,
      schedules: [
        { dayOfWeek: 6, startPeriod: 2, endPeriod: 3, room: "Lab Tin 1" },
      ],
      note: "Thực hành phòng máy 1",
    },

    // Lớp 10A2
    {
      className: "10A2",
      subjectCode: "TOAN",
      teacherCode: "GV001", // Thầy Toán dạy thêm 10A2
      academicYear,
      semester: "CaNam",
      periodsPerWeek: 4,
      schedules: [
        { dayOfWeek: 2, startPeriod: 3, endPeriod: 4, room: "P.102" },
        { dayOfWeek: 5, startPeriod: 3, endPeriod: 4, room: "P.102" },
      ],
      note: "Toán học lớp 10A2",
    },
    {
      className: "10A2",
      subjectCode: "VAN",
      teacherCode: "GV002", // Cô Văn
      academicYear,
      semester: "CaNam",
      periodsPerWeek: 4,
      schedules: [
        { dayOfWeek: 4, startPeriod: 1, endPeriod: 2, room: "P.102" },
        { dayOfWeek: 6, startPeriod: 1, endPeriod: 2, room: "P.102" },
      ],
      note: "Ngữ văn nâng cao lớp 10A2",
    },
    {
      className: "10A2",
      subjectCode: "SU",
      teacherCode: "GV007", // Thầy Sử
      academicYear,
      semester: "CaNam",
      periodsPerWeek: 2,
      schedules: [
        { dayOfWeek: 3, startPeriod: 1, endPeriod: 2, room: "P.102" },
      ],
      note: "Lịch sử Việt Nam và thế giới",
    },
    {
      className: "10A2",
      subjectCode: "DIA",
      teacherCode: "GV008", // Cô Địa
      academicYear,
      semester: "CaNam",
      periodsPerWeek: 2,
      schedules: [
        { dayOfWeek: 3, startPeriod: 3, endPeriod: 4, room: "P.102" },
      ],
      note: "Địa lí tự nhiên",
    },

    // Lớp 11A1
    {
      className: "11A1",
      subjectCode: "ANH",
      teacherCode: "GV003", // Thầy Anh
      academicYear,
      semester: "CaNam",
      periodsPerWeek: 3,
      schedules: [
        { dayOfWeek: 3, startPeriod: 3, endPeriod: 4, room: "P.201" },
      ],
      note: "Tiếng Anh nâng cao 11A1",
    },
    {
      className: "11A1",
      subjectCode: "HOA",
      teacherCode: "GV005", // Thầy Hóa
      academicYear,
      semester: "CaNam",
      periodsPerWeek: 2,
      schedules: [
        { dayOfWeek: 2, startPeriod: 1, endPeriod: 2, room: "P.201" },
      ],
      note: "Hóa học vô cơ 11A1",
    },

    // Lớp 12A1
    {
      className: "12A1",
      subjectCode: "LY",
      teacherCode: "GV004", // Cô Lý
      academicYear,
      semester: "CaNam",
      periodsPerWeek: 2,
      schedules: [
        { dayOfWeek: 4, startPeriod: 1, endPeriod: 2, room: "P.301" },
      ],
      note: "Vật lí 12 luyện thi",
    },
  ];

  for (const a of SAMPLE_ASSIGNMENTS) {
    const classDoc = classMap.get(a.className);
    const subjectDoc = subjectMap.get(a.subjectCode);
    const teacherDoc = userMap.get(a.teacherCode);

    if (!classDoc || !subjectDoc || !teacherDoc) {
      console.warn(`[WARN] Bỏ qua assignment không đủ dữ liệu: ${a.className} - ${a.subjectCode} - ${a.teacherCode}`);
      continue;
    }

    await TeachingAssignment.findOneAndUpdate(
      {
        class: classDoc._id,
        subject: subjectDoc._id,
        academicYear: a.academicYear,
        semester: a.semester,
      },
      {
        $set: {
          teacher: teacherDoc._id,
          periodsPerWeek: a.periodsPerWeek,
          schedules: a.schedules,
          status: "active",
          note: a.note,
          isActive: true,
          isDeleted: false,
        },
      },
      { upsert: true, new: true, runValidators: true }
    );
    console.log(
      `[ASSIGNMENT] Lớp ${a.className} | Môn ${a.subjectCode.padEnd(5)} | GV: ${teacherDoc.fullName} (${a.teacherCode}) | ${a.semester}`
    );
  }

  console.log("\n=================================");
  console.log(" TỔNG KẾT DỮ LIỆU ĐÃ SEED THÀNH CÔNG");
  console.log("=================================");
  console.log(`- Users:               ${await User.countDocuments({ isDeleted: { $ne: true } })} users`);
  console.log(`- Grades (Khối):       ${await Grade.countDocuments({ isDeleted: { $ne: true } })} khối`);
  console.log(`- Classes (Lớp học):   ${await Class.countDocuments({ isDeleted: { $ne: true } })} lớp`);
  console.log(`- Subjects (Môn học):  ${await Subject.countDocuments({ isDeleted: { $ne: true } })} môn`);
  console.log(`- Assignments:         ${await TeachingAssignment.countDocuments({ isDeleted: { $ne: true } })} phân công`);
  console.log("\nMật khẩu chung cho tất cả tài khoản seed:", password);
  console.log("=================================\n");

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("LỖI KHI CHẠY SEED:", err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});