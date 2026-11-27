/**
 * =============================================================================
 * BỘ SCRIPT SEED DỮ LIỆU MẪU HOÀN CHỈNH CHO TOÀN BỘ HỆ THỐNG EDU-LMS
 * File: edulms-backend/src/scripts/seed.js
 * =============================================================================
 *
 * Nguyên tắc thiết kế:
 * 1. Idempotent 100%: Sử dụng `findOneAndUpdate(..., { upsert: true })` theo khóa tự nhiên
 *    duy nhất của từng thực thể. Chạy lại nhiều lần không sinh bản ghi trùng lặp.
 * 2. Bảo vệ môi trường: Chỉ cho phép chạy trên database dev / staging / test / edulms / localhost
 *    (hoặc khi truyền cờ `--force` rõ ràng). Chế độ `--reset` chỉ xóa mềm / dọn dữ liệu seed khi có xác nhận.
 * 3. Hỗ trợ `--dry-run`: Kiểm tra toàn bộ cấu trúc dữ liệu, schema validation của 15 models
 *    và in bảng tài khoản mẫu mà không cần ghi vào MongoDB.
 * 4. KHÔNG chứa bất kỳ dữ liệu hay model nào liên quan đến Điểm danh / Chuyên cần / Vắng học.
 * 5. Bao phủ trọn vẹn các miền nghiệp vụ:
 *    - Tài khoản & Phân quyền (`Admin`, `Teacher`, `Student`, `Parent`) + `childrenRefs` (1 con & nhiều con)
 *    - Khối học (`Grade`), Môn học (`Subject`), Lớp học (`Class` + GVCN), Lịch sử xếp lớp (`ClassHistory`)
 *    - Phân công giảng dạy (`TeachingAssignment`) & Thời khóa biểu (`Timetable`)
 *    - Nội dung bài giảng (`LessonContent` - video, pdf, slide, document, text + attachments)
 *    - Bài tập (`Assignment` - còn hạn, quá hạn, đã khóa) & Bài nộp (`Submission` - đúng hạn, nộp trễ `isLate: true`, đã chấm, chờ chấm `score: null`)
 *    - Ngân hàng câu hỏi (`Question`), Đề kiểm tra (`Exam`) & Lượt làm bài (`ExamAttempt`)
 *    - Sổ điểm (`GradeRecord` - oral, 15min, 45min, midterm, final; có cả HS điểm cao/khá và HS điểm thấp < 5.0 để kích hoạt cảnh báo EL71/EL97)
 *    - Hệ thống Thông báo (`Notification` - cho Student, Teacher, Parent; đủ `isRead: true/false`, kèm thông báo nhà trường/giáo viên có đính kèm tài liệu)
 *    - Nhật ký gửi Email Phụ huynh (`EmailLog` - cảnh báo học lực / báo cáo định kỳ, không có điểm danh)
 */

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const dns = require("node:dns");
try {
  dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);
} catch {
  // Ignore DNS override errors in restricted network environments
}

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Nạp toàn bộ Models của dự án
const User = require("../models/User");
const Grade = require("../models/Grade");
const Subject = require("../models/Subject");
const Class = require("../models/Class");
const ClassHistory = require("../models/ClassHistory");
const TeachingAssignment = require("../models/TeachingAssignment");
const Timetable = require("../models/Timetable");
const LessonContent = require("../models/LessonContent");
const Assignment = require("../models/Assignment");
const Submission = require("../models/Submission");
const Question = require("../models/Question");
const Exam = require("../models/Exam");
const ExamAttempt = require("../models/ExamAttempt");
const GradeRecord = require("../models/GradeRecord");
const Notification = require("../models/Notification");
const EmailLog = require("../models/EmailLog");

const ACADEMIC_YEAR = "2025-2026";
const DEFAULT_SEED_PASSWORD = process.env.SEED_PASSWORD || "EduLMS@2026";

/* ============================================================================
   1. DỮ LIỆU MẪU TÀI KHOẢN (ADMIN, TEACHER, STUDENT, PARENT)
============================================================================ */
const SAMPLE_USERS = [
  // --- QUẢN TRỊ VIÊN (ADMIN) ---
  {
    userCode: "AD001",
    email: "admin@edulms.test",
    fullName: "Nguyễn Quản Trị Hệ Thống",
    role: "admin",
    phone: "0901000001",
    className: null,
  },

  // --- GIÁO VIÊN (TEACHER - GVCN & GV BỘ MÔN) ---
  {
    userCode: "GV001",
    email: "teacher1@edulms.test",
    fullName: "Thầy Nguyễn Văn Toán",
    role: "teacher",
    phone: "0902000001",
    className: null, // GVCN lớp 10A1 + Dạy Toán 10A1, 10A2, 11A1
  },
  {
    userCode: "GV002",
    email: "teacher2@edulms.test",
    fullName: "Cô Trần Thị Văn",
    role: "teacher",
    phone: "0902000002",
    className: null, // GVCN lớp 10A2 + Dạy Ngữ văn 10A1, 10A2
  },
  {
    userCode: "GV003",
    email: "teacher3@edulms.test",
    fullName: "Thầy Lê Văn Anh",
    role: "teacher",
    phone: "0902000003",
    className: null, // GVCN lớp 11A1 + Dạy Tiếng Anh 10A1, 11A1
  },
  {
    userCode: "GV004",
    email: "teacher4@edulms.test",
    fullName: "Cô Phạm Thị Lý",
    role: "teacher",
    phone: "0902000004",
    className: null, // GVCN lớp 12A1 + Dạy Vật lí 10A1, 10A2, 11A1, 12A1
  },
  {
    userCode: "GV005",
    email: "teacher5@edulms.test",
    fullName: "Thầy Hoàng Văn Hóa",
    role: "teacher",
    phone: "0902000005",
    className: null,
  },
  {
    userCode: "GV006",
    email: "teacher6@edulms.test",
    fullName: "Cô Vũ Thị Sinh",
    role: "teacher",
    phone: "0902000006",
    className: null,
  },
  {
    userCode: "GV007",
    email: "teacher7@edulms.test",
    fullName: "Thầy Đỗ Văn Sử",
    role: "teacher",
    phone: "0902000007",
    className: null,
  },
  {
    userCode: "GV008",
    email: "teacher8@edulms.test",
    fullName: "Cô Bùi Thị Địa",
    role: "teacher",
    phone: "0902000008",
    className: null,
  },
  {
    userCode: "GV009",
    email: "teacher9@edulms.test",
    fullName: "Thầy Ngô Văn Tin",
    role: "teacher",
    phone: "0902000009",
    className: null, // Dạy Tin học 10A1, 10A2, 11A1
  },

  // --- HỌC SINH (STUDENT - PHÂN BỔ VÀO CÁC LỚP 10A1, 10A2, 11A1, 11A2, 12A1) ---
  // Lớp 10A1 (Có HS giỏi/khá và HS điểm thấp < 5.0 để test cảnh báo học lực)
  {
    userCode: "HS001",
    email: "student1@edulms.test",
    fullName: "Nguyễn Văn An",
    role: "student",
    phone: "0903000001",
    className: "10A1", // Học lực Giỏi (~8.7) - Con của PH001
  },
  {
    userCode: "HS002",
    email: "student2@edulms.test",
    fullName: "Trần Thị Bình",
    role: "student",
    phone: "0903000002",
    className: "10A1", // Học lực Yếu/Kém (< 5.0 ở môn Toán & Lý) - Con của PH002
  },
  {
    userCode: "HS007",
    email: "student7@edulms.test",
    fullName: "Đặng Quốc Bảo",
    role: "student",
    phone: "0903000007",
    className: "10A1", // Học lực Khá (~7.4) - Con thứ 3 của PH001
  },
  {
    userCode: "HS008",
    email: "student8@edulms.test",
    fullName: "Lý Thanh Thảo",
    role: "student",
    phone: "0903000008",
    className: "10A1", // Học lực Yếu (< 3.5 môn Toán - cảnh báo mức high)
  },

  // Lớp 10A2
  {
    userCode: "HS003",
    email: "student3@edulms.test",
    fullName: "Lê Hoàng Cường",
    role: "student",
    phone: "0903000003",
    className: "10A2", // Học lực Khá (~7.8) - Con thứ 2 của PH001
  },
  {
    userCode: "HS009",
    email: "student9@edulms.test",
    fullName: "Phan Minh Khang",
    role: "student",
    phone: "0903000009",
    className: "10A2", // Học lực Yếu (< 5.0 môn Toán 10A2) - Con của PH003
  },

  // Lớp 11A1
  {
    userCode: "HS004",
    email: "student4@edulms.test",
    fullName: "Phạm Ngọc Dung",
    role: "student",
    phone: "0903000004",
    className: "11A1", // Con của PH003
  },
  {
    userCode: "HS010",
    email: "student10@edulms.test",
    fullName: "Trịnh Gia Huy",
    role: "student",
    phone: "0903000010",
    className: "11A1",
  },

  // Lớp 11A2 & 12A1
  {
    userCode: "HS005",
    email: "student5@edulms.test",
    fullName: "Hoàng Minh Đức",
    role: "student",
    phone: "0903000005",
    className: "11A2",
  },
  {
    userCode: "HS006",
    email: "student6@edulms.test",
    fullName: "Vũ Hải Yến",
    role: "student",
    phone: "0903000006",
    className: "12A1", // Con của PH004
  },

  // --- PHỤ HUYNH (PARENT - LIÊN KẾT QUA childrenRefs) ---
  {
    userCode: "PH001",
    email: "parent1@edulms.test",
    fullName: "Phụ huynh Nguyễn Văn Nam",
    role: "parent",
    phone: "0904000001",
    className: null,
    // Trường hợp 1 Phụ huynh có NHIỀU con học ở các lớp khác nhau (HS001 lớp 10A1, HS003 lớp 10A2, HS007 lớp 10A1)
    linkedChildCodes: ["HS001", "HS003", "HS007"],
  },
  {
    userCode: "PH002",
    email: "parent2@edulms.test",
    fullName: "Phụ huynh Trần Thị Lan",
    role: "parent",
    phone: "0904000002",
    className: null,
    // Trường hợp 1 Phụ huynh liên kết 1 Học sinh (HS002 lớp 10A1 - có điểm thấp để test cảnh báo & email)
    linkedChildCodes: ["HS002"],
  },
  {
    userCode: "PH003",
    email: "parent3@edulms.test",
    fullName: "Phụ huynh Phạm Văn Hùng",
    role: "parent",
    phone: "0904000003",
    className: null,
    // Trường hợp 1 Phụ huynh liên kết 2 Học sinh (HS004 lớp 11A1 và HS009 lớp 10A2)
    linkedChildCodes: ["HS004", "HS009"],
  },
  {
    userCode: "PH004",
    email: "parent4@edulms.test",
    fullName: "Phụ huynh Vũ Thị Mai",
    role: "parent",
    phone: "0904000004",
    className: null,
    // Trường hợp 1 Phụ huynh liên kết 1 Học sinh khối 12 (HS006 lớp 12A1)
    linkedChildCodes: ["HS006"],
  },
];

/* ============================================================================
   2. DỮ LIỆU KHỐI HỌC, MÔN HỌC & LỚP HỌC
============================================================================ */
const SAMPLE_GRADES = [
  { level: 10, name: "Khối 10", description: "Khối lớp 10 THPT", isActive: true },
  { level: 11, name: "Khối 11", description: "Khối lớp 11 THPT", isActive: true },
  { level: 12, name: "Khối 12", description: "Khối lớp 12 THPT", isActive: true },
];

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

const SAMPLE_CLASSES = [
  {
    name: "10A1",
    gradeLevel: 10,
    academicYear: ACADEMIC_YEAR,
    homeroomTeacherCode: "GV001",
    room: "P.101",
    capacity: 45,
    description: "Lớp chọn Khoa học Tự nhiên Khối 10",
  },
  {
    name: "10A2",
    gradeLevel: 10,
    academicYear: ACADEMIC_YEAR,
    homeroomTeacherCode: "GV002",
    room: "P.102",
    capacity: 45,
    description: "Lớp chọn Khoa học Xã hội Khối 10",
  },
  {
    name: "10A3",
    gradeLevel: 10,
    academicYear: ACADEMIC_YEAR,
    homeroomTeacherCode: null,
    room: "P.103",
    capacity: 40,
    description: "Lớp cơ bản Khối 10",
  },
  {
    name: "11A1",
    gradeLevel: 11,
    academicYear: ACADEMIC_YEAR,
    homeroomTeacherCode: "GV003",
    room: "P.201",
    capacity: 42,
    description: "Lớp định hướng Ngoại ngữ & Tin học Khối 11",
  },
  {
    name: "11A2",
    gradeLevel: 11,
    academicYear: ACADEMIC_YEAR,
    homeroomTeacherCode: "GV005",
    room: "P.202",
    capacity: 42,
    description: "Lớp định hướng KHTN Khối 11",
  },
  {
    name: "12A1",
    gradeLevel: 12,
    academicYear: ACADEMIC_YEAR,
    homeroomTeacherCode: "GV004",
    room: "P.301",
    capacity: 40,
    description: "Lớp trọng điểm ôn thi THPT Quốc gia",
  },
  {
    name: "12A2",
    gradeLevel: 12,
    academicYear: ACADEMIC_YEAR,
    homeroomTeacherCode: null,
    room: "P.302",
    capacity: 40,
    description: "Lớp chuẩn bị thi TN THPT",
  },
];

/* ============================================================================
   3. DỮ LIỆU PHÂN CÔNG GIẢNG DẠY (TEACHING ASSIGNMENTS)
============================================================================ */
const SAMPLE_TEACHING_ASSIGNMENTS = [
  // Lớp 10A1
  {
    className: "10A1",
    subjectCode: "TOAN",
    teacherCode: "GV001",
    academicYear: ACADEMIC_YEAR,
    semester: "CaNam",
    periodsPerWeek: 4,
    schedules: [
      { dayOfWeek: 2, startPeriod: 1, endPeriod: 2, room: "P.101" },
      { dayOfWeek: 4, startPeriod: 3, endPeriod: 4, room: "P.101" },
    ],
    note: "Phân công dạy chính môn Toán 10A1",
  },
  {
    className: "10A1",
    subjectCode: "VAN",
    teacherCode: "GV002",
    academicYear: ACADEMIC_YEAR,
    semester: "CaNam",
    periodsPerWeek: 4,
    schedules: [
      { dayOfWeek: 3, startPeriod: 1, endPeriod: 2, room: "P.101" },
      { dayOfWeek: 5, startPeriod: 1, endPeriod: 2, room: "P.101" },
    ],
    note: "Phân công dạy chính môn Ngữ văn 10A1",
  },
  {
    className: "10A1",
    subjectCode: "ANH",
    teacherCode: "GV003",
    academicYear: ACADEMIC_YEAR,
    semester: "CaNam",
    periodsPerWeek: 3,
    schedules: [
      { dayOfWeek: 2, startPeriod: 3, endPeriod: 4, room: "P.101" },
      { dayOfWeek: 6, startPeriod: 1, endPeriod: 1, room: "P.101" },
    ],
    note: "Tiếng Anh 10A1",
  },
  {
    className: "10A1",
    subjectCode: "LY",
    teacherCode: "GV004",
    academicYear: ACADEMIC_YEAR,
    semester: "CaNam",
    periodsPerWeek: 2,
    schedules: [{ dayOfWeek: 3, startPeriod: 3, endPeriod: 4, room: "P.101" }],
    note: "Vật lí 10A1",
  },
  {
    className: "10A1",
    subjectCode: "HOA",
    teacherCode: "GV005",
    academicYear: ACADEMIC_YEAR,
    semester: "CaNam",
    periodsPerWeek: 2,
    schedules: [{ dayOfWeek: 4, startPeriod: 1, endPeriod: 2, room: "P.101" }],
    note: "Hóa học 10A1",
  },
  {
    className: "10A1",
    subjectCode: "SINH",
    teacherCode: "GV006",
    academicYear: ACADEMIC_YEAR,
    semester: "CaNam",
    periodsPerWeek: 2,
    schedules: [{ dayOfWeek: 5, startPeriod: 3, endPeriod: 4, room: "P.101" }],
    note: "Sinh học 10A1",
  },
  {
    className: "10A1",
    subjectCode: "TIN",
    teacherCode: "GV009",
    academicYear: ACADEMIC_YEAR,
    semester: "CaNam",
    periodsPerWeek: 2,
    schedules: [{ dayOfWeek: 6, startPeriod: 2, endPeriod: 3, room: "Lab Tin 1" }],
    note: "Tin học ứng dụng 10A1",
  },

  // Lớp 10A2
  {
    className: "10A2",
    subjectCode: "TOAN",
    teacherCode: "GV001",
    academicYear: ACADEMIC_YEAR,
    semester: "CaNam",
    periodsPerWeek: 4,
    schedules: [
      { dayOfWeek: 2, startPeriod: 3, endPeriod: 4, room: "P.102" },
      { dayOfWeek: 5, startPeriod: 3, endPeriod: 4, room: "P.102" },
    ],
    note: "Toán học 10A2",
  },
  {
    className: "10A2",
    subjectCode: "VAN",
    teacherCode: "GV002",
    academicYear: ACADEMIC_YEAR,
    semester: "CaNam",
    periodsPerWeek: 4,
    schedules: [
      { dayOfWeek: 4, startPeriod: 1, endPeriod: 2, room: "P.102" },
      { dayOfWeek: 6, startPeriod: 1, endPeriod: 2, room: "P.102" },
    ],
    note: "Ngữ văn 10A2",
  },
  {
    className: "10A2",
    subjectCode: "LY",
    teacherCode: "GV004",
    academicYear: ACADEMIC_YEAR,
    semester: "CaNam",
    periodsPerWeek: 2,
    schedules: [{ dayOfWeek: 6, startPeriod: 3, endPeriod: 4, room: "P.102" }],
    note: "Vật lí 10A2",
  },
  {
    className: "10A2",
    subjectCode: "TIN",
    teacherCode: "GV009",
    academicYear: ACADEMIC_YEAR,
    semester: "CaNam",
    periodsPerWeek: 2,
    schedules: [{ dayOfWeek: 5, startPeriod: 1, endPeriod: 2, room: "Lab Tin 1" }],
    note: "Tin học 10A2",
  },
  {
    className: "10A2",
    subjectCode: "SU",
    teacherCode: "GV007",
    academicYear: ACADEMIC_YEAR,
    semester: "CaNam",
    periodsPerWeek: 2,
    schedules: [{ dayOfWeek: 3, startPeriod: 1, endPeriod: 2, room: "P.102" }],
    note: "Lịch sử 10A2",
  },
  {
    className: "10A2",
    subjectCode: "DIA",
    teacherCode: "GV008",
    academicYear: ACADEMIC_YEAR,
    semester: "CaNam",
    periodsPerWeek: 2,
    schedules: [{ dayOfWeek: 3, startPeriod: 3, endPeriod: 4, room: "P.102" }],
    note: "Địa lí 10A2",
  },

  // Lớp 11A1
  {
    className: "11A1",
    subjectCode: "TOAN",
    teacherCode: "GV001",
    academicYear: ACADEMIC_YEAR,
    semester: "CaNam",
    periodsPerWeek: 4,
    schedules: [{ dayOfWeek: 3, startPeriod: 1, endPeriod: 2, room: "P.201" }],
    note: "Toán học 11A1",
  },
  {
    className: "11A1",
    subjectCode: "ANH",
    teacherCode: "GV003",
    academicYear: ACADEMIC_YEAR,
    semester: "CaNam",
    periodsPerWeek: 3,
    schedules: [{ dayOfWeek: 3, startPeriod: 3, endPeriod: 4, room: "P.201" }],
    note: "Tiếng Anh 11A1",
  },
  {
    className: "11A1",
    subjectCode: "LY",
    teacherCode: "GV004",
    academicYear: ACADEMIC_YEAR,
    semester: "CaNam",
    periodsPerWeek: 2,
    schedules: [{ dayOfWeek: 5, startPeriod: 1, endPeriod: 2, room: "P.201" }],
    note: "Vật lí 11A1",
  },
  {
    className: "11A1",
    subjectCode: "TIN",
    teacherCode: "GV009",
    academicYear: ACADEMIC_YEAR,
    semester: "CaNam",
    periodsPerWeek: 2,
    schedules: [{ dayOfWeek: 4, startPeriod: 3, endPeriod: 4, room: "Lab Tin 2" }],
    note: "Tin học 11A1",
  },

  // Lớp 12A1
  {
    className: "12A1",
    subjectCode: "LY",
    teacherCode: "GV004",
    academicYear: ACADEMIC_YEAR,
    semester: "CaNam",
    periodsPerWeek: 3,
    schedules: [{ dayOfWeek: 4, startPeriod: 1, endPeriod: 2, room: "P.301" }],
    note: "Vật lí 12A1 ôn thi THPT",
  },
];

/* ============================================================================
   4. DỮ LIỆU NỘI DUNG BÀI GIẢNG (LESSON CONTENTS - EL37..EL40)
============================================================================ */
const SAMPLE_LESSONS_BY_TA = {
  "10A1_TOAN": [
    {
      order: 1,
      title: "Bài 1: Mệnh đề và Mệnh đề chứa biến",
      description:
        "Khái niệm mệnh đề toán học, mệnh đề phủ định, mệnh đề kéo theo và mệnh đề tương đương.",
      contentType: "video",
      resourceUrl:
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      videoProvider: "custom",
      attachments: [
        {
          name: "Slide_Bai_1_Menh_De.pdf",
          url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
          fileType: "document",
          fileSize: 254800,
          format: "pdf",
        },
      ],
      isActive: true,
    },
    {
      order: 2,
      title: "Bài 2: Tập hợp và các phép toán trên tập hợp",
      description:
        "Tập con, hai tập hợp bằng nhau. Các phép toán giao, hợp, hiệu của hai tập hợp và biểu đồ Ven.",
      contentType: "pdf",
      resourceUrl:
        "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      attachments: [
        {
          name: "Tai_lieu_Tap_hop_Toan_10.pdf",
          url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
          fileType: "document",
          fileSize: 312000,
          format: "pdf",
        },
      ],
      isActive: true,
    },
    {
      order: 3,
      title: "Bài 3: Bất phương trình bậc nhất hai ẩn & Miền nghiệm",
      description:
        "Biểu diễn miền nghiệm của bất phương trình và hệ bất phương trình bậc nhất hai ẩn trên mặt phẳng Oxy.",
      contentType: "slide",
      resourceUrl:
        "https://view.officeapps.live.com/op/view.aspx?src=https://filesamples.com/samples/document/pptx/sample1.pptx",
      attachments: [],
      isActive: true,
    },
    {
      order: 4,
      title: "Bài 4: Đề cương ôn tập Chương 1 Đại số 10 (Tài liệu Word)",
      description:
        "Tổng hợp 50 câu hỏi trắc nghiệm và 10 bài toán tự luận trọng tâm Chương 1.",
      contentType: "document",
      resourceUrl: "https://calibre-ebook.com/downloads/demos/demo.docx",
      attachments: [
        {
          name: "De_cuong_Chuong_1_Toan_10.docx",
          url: "https://calibre-ebook.com/downloads/demos/demo.docx",
          fileType: "document",
          fileSize: 420000,
          format: "docx",
        },
      ],
      isActive: true,
    },
    {
      order: 5,
      title: "Bài 5: Hướng dẫn tự học lý thuyết Hàm số bậc hai",
      description:
        "Tóm tắt lý thuyết trục đối xứng, đỉnh parabol và bảng biến thiên của hàm số y = ax² + bx + c.",
      contentType: "text",
      resourceUrl: "",
      attachments: [],
      isActive: true,
    },
  ],
  "10A1_VAN": [
    {
      order: 1,
      title: "Bài 1: Chiến thắng Mtao Mxây (Trích Sử thi Đăm Săn)",
      description:
        "Hình tượng người anh hùng sử thi Đăm Săn và nghệ thuật miêu tả, phóng đại trong sử thi Tây Nguyên.",
      contentType: "video",
      resourceUrl:
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
      videoProvider: "custom",
      attachments: [],
      isActive: true,
    },
    {
      order: 2,
      title: "Bài 2: Văn bản Chữ người tử tù (Nguyễn Tuân)",
      description:
        "Phân tích hình tượng nhân vật Huấn Cao, viên quản ngục và cảnh cho chữ trong nhà giam.",
      contentType: "pdf",
      resourceUrl:
        "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      attachments: [],
      isActive: true,
    },
  ],
  "10A1_LY": [
    {
      order: 1,
      title: "Bài 1: Độ dịch chuyển và Quãng đường đi được",
      description:
        "Phân biệt đại lượng vô hướng và vecto trong chuyển động cơ học. Đồ thị độ dịch chuyển – thời gian.",
      contentType: "video",
      resourceUrl:
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      videoProvider: "custom",
      attachments: [],
      isActive: true,
    },
    {
      order: 2,
      title: "Bài 2: Gia tốc và Chuyển động thẳng biến đổi đều",
      description:
        "Các phương trình vận tốc, độ dịch chuyển và công thức độc lập thời gian v² - v0² = 2ad.",
      contentType: "pdf",
      resourceUrl:
        "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      attachments: [],
      isActive: true,
    },
  ],
  "10A1_TIN": [
    {
      order: 1,
      title: "Bài 1: Làm quen với ngôn ngữ lập trình Python",
      description:
        "Cấu trúc chương trình Python, biến, kiểu dữ liệu cơ bản và các phép toán số học.",
      contentType: "video",
      resourceUrl:
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
      videoProvider: "custom",
      attachments: [],
      isActive: true,
    },
    {
      order: 2,
      title: "Bài 2: Cấu trúc rẽ nhánh if - elif - else và Vòng lặp for/while",
      description:
        "Hướng dẫn giải các bài toán lập trình cơ bản bằng cấu trúc điều khiển trong Python.",
      contentType: "pdf",
      resourceUrl:
        "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      attachments: [],
      isActive: true,
    },
  ],
  "10A2_TOAN": [
    {
      order: 1,
      title: "Bài 1: Định lí Côsin và Định lí Sin trong tam giác",
      description:
        "Các hệ thức lượng trong tam giác và ứng dụng đo đạc thực tế.",
      contentType: "video",
      resourceUrl:
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      videoProvider: "custom",
      attachments: [],
      isActive: true,
    },
    {
      order: 2,
      title: "Bài 2: Khái niệm Vecto và Tổng hiệu hai Vecto",
      description:
        "Quy tắc 3 điểm, quy tắc hình bình hành và tính chất trung điểm đoạn thẳng, trọng tâm tam giác.",
      contentType: "pdf",
      resourceUrl:
        "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      attachments: [],
      isActive: true,
    },
  ],
  "11A1_TIN": [
    {
      order: 1,
      title: "Bài 1: Hệ quản trị Cơ sở dữ liệu quan hệ & Ngôn ngữ SQL",
      description:
        "Khóa chính, khóa ngoại và các câu lệnh truy vấn SELECT, INNER JOIN, GROUP BY.",
      contentType: "pdf",
      resourceUrl:
        "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      attachments: [],
      isActive: true,
    },
  ],
};

/* ============================================================================
   5. HÀM KIỂM TRA BẢO VỆ MÔI TRƯỜNG
============================================================================ */
function verifyEnvironmentSafety(uri, { isDryRun = false, isForce = false } = {}) {
  if (isDryRun) return true;

  if (!uri) {
    throw new Error(
      "Thiếu biến môi trường MONGO_URI trong file .env! (Có thể chạy với cờ --dry-run để kiểm tra không cần DB)"
    );
  }

  const lowerUri = String(uri).toLowerCase();
  const isSafeTarget =
    lowerUri.includes("localhost") ||
    lowerUri.includes("127.0.0.1") ||
    lowerUri.includes("dev") ||
    lowerUri.includes("test") ||
    lowerUri.includes("staging") ||
    lowerUri.includes("edulms");

  const isProdEnv =
    String(process.env.NODE_ENV || "").toLowerCase() === "production";

  if ((isProdEnv || !isSafeTarget) && !isForce) {
    throw new Error(
      "BẢO VỆ MÔI TRƯỜNG: Từ chối chạy seed trên môi trường nghi ngờ Production. Nếu chắc chắn, hãy truyền thêm cờ --force."
    );
  }

  return true;
}

/* ============================================================================
   6. HÀM THỰC THI SEED TỔNG HỢP
============================================================================ */
async function runMasterSeed(options = {}) {
  const args = process.argv.slice(2);
  const isDryRun = Boolean(options.dryRun || args.includes("--dry-run"));
  const isReset = Boolean(options.reset || args.includes("--reset"));
  const isForce = Boolean(options.force || args.includes("--force"));

  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  const seedPassword = options.password || DEFAULT_SEED_PASSWORD;

  verifyEnvironmentSafety(uri, { isDryRun, isForce });

  console.log("======================================================================");
  console.log("   EDU-LMS MASTER SEEDER — KHỞI TẠO DỮ LIỆU MẪU TOÀN HỆ THỐNG");
  console.log("======================================================================");
  console.log(`- Chế độ chạy: ${isDryRun ? "DRY-RUN (Kiểm tra Schema, không ghi DB)" : isReset ? "RESET & UPSERT" : "IDEMPOTENT UPSERT"}`);

  const passwordHash = await bcrypt.hash(seedPassword, 10);

  // Nếu chạy chế độ --dry-run: Khởi tạo và validate toàn bộ document mẫu bằng Mongoose Schema
  if (isDryRun) {
    const sampleUserDoc = new User({
      fullName: SAMPLE_USERS[0].fullName,
      email: SAMPLE_USERS[0].email,
      userCode: SAMPLE_USERS[0].userCode,
      role: SAMPLE_USERS[0].role,
      password: passwordHash,
      isActivated: true,
    });
    await sampleUserDoc.validate();

    const sampleGradeDoc = new Grade(SAMPLE_GRADES[0]);
    await sampleGradeDoc.validate();

    const sampleSubjectDoc = new Subject(SAMPLE_SUBJECTS[0]);
    await sampleSubjectDoc.validate();

    const sampleClassDoc = new Class({
      name: "10A1",
      grade: sampleGradeDoc._id,
      academicYear: ACADEMIC_YEAR,
      homeroomTeacher: sampleUserDoc._id,
      room: "P.101",
      capacity: 45,
    });
    await sampleClassDoc.validate();

    const sampleTaDoc = new TeachingAssignment({
      class: sampleClassDoc._id,
      subject: sampleSubjectDoc._id,
      teacher: sampleUserDoc._id,
      academicYear: ACADEMIC_YEAR,
      semester: "CaNam",
      periodsPerWeek: 4,
    });
    await sampleTaDoc.validate();

    const sampleLessonDoc = new LessonContent({
      ...SAMPLE_LESSONS_BY_TA["10A1_TOAN"][0],
      teachingAssignment: sampleTaDoc._id,
    });
    await sampleLessonDoc.validate();

    const sampleAssignmentDoc = new Assignment({
      teachingAssignment: sampleTaDoc._id,
      title: "Bài tập Chương 1: Mệnh đề và Tập hợp",
      description: "Giải các bài tập tự luận trang 15-16 SGK Toán 10.",
      dueDate: new Date(Date.now() + 5 * 24 * 3600 * 1000),
      status: "open",
    });
    await sampleAssignmentDoc.validate();

    const sampleSubmissionDoc = new Submission({
      assignment: sampleAssignmentDoc._id,
      student: sampleUserDoc._id,
      fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      isLate: false,
      score: null,
    });
    await sampleSubmissionDoc.validate();

    const sampleGradeRecDoc = new GradeRecord({
      student: sampleUserDoc._id,
      teachingAssignment: sampleTaDoc._id,
      semester: "HK1",
      gradeType: "midterm",
      value: 8.5,
      weight: 2,
    });
    await sampleGradeRecDoc.validate();

    const sampleNotifDoc = new Notification({
      recipient: sampleUserDoc._id,
      sender: sampleUserDoc._id,
      type: "general",
      title: "Thông báo họp Phụ huynh học kỳ 1",
      content: "Kính mời Quý Phụ huynh tham dự họp phụ huynh lớp 10A1.",
      link: "/parent/dashboard",
      isRead: false,
    });
    await sampleNotifDoc.validate();

    console.log("\n[DRY-RUN PASS] Toàn bộ Mongoose Schemas (User, Grade, Subject, Class, TeachingAssignment, LessonContent, Assignment, Submission, GradeRecord, Notification) đều hợp lệ 100%!");
    printSampleAccountsTable(seedPassword);
    return {
      dryRun: true,
      usersCount: SAMPLE_USERS.length,
    };
  }

  // Kết nối MongoDB thực tế
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 15000,
  });
  console.log(`- Đã kết nối MongoDB: ${mongoose.connection.name}`);

  try {
    // Nếu có cờ --reset: dọn sạch các bản ghi nằm trong tập dữ liệu seed mẫu trước khi nạp lại
    if (isReset) {
      console.log("\n--- [RESET] Đang làm sạch dữ liệu seed mẫu cũ ---");
      const seedUserCodes = SAMPLE_USERS.map((u) => u.userCode);
      await Promise.all([
        Notification.deleteMany({ "metadata.isSeedData": true }),
        EmailLog.deleteMany({ "metadata.isSeedData": true }),
        ExamAttempt.deleteMany({}),
        Exam.deleteMany({ "description": /\[SEED\]/i }),
        Question.deleteMany({ "explanation": /\[SEED\]/i }),
        Submission.deleteMany({ "note": /\[SEED\]/i }),
        Assignment.deleteMany({ "description": /\[SEED\]/i }),
        GradeRecord.deleteMany({ "note": /\[SEED\]/i }),
        User.deleteMany({ userCode: { $in: seedUserCodes } }),
      ]);
      console.log("  ✓ Đã làm sạch các bản ghi seed cũ an toàn.");
    }

    /* ------------------------------------------------------------------------
       BƯỚC 1: SEED KHỐI HỌC (GRADES) & MÔN HỌC (SUBJECTS)
    ------------------------------------------------------------------------ */
    console.log("\n--- [1/10] Seed Khối học (Grades) & Môn học (Subjects) ---");
    const gradeMap = new Map();
    for (const g of SAMPLE_GRADES) {
      const doc = await Grade.findOneAndUpdate(
        { level: g.level },
        {
          $set: {
            name: g.name,
            description: g.description,
            isActive: true,
            isDeleted: false,
          },
        },
        { upsert: true, new: true, runValidators: true }
      );
      gradeMap.set(g.level, doc);
    }

    const subjectMap = new Map();
    for (const s of SAMPLE_SUBJECTS) {
      const doc = await Subject.findOneAndUpdate(
        { code: s.code },
        {
          $set: {
            name: s.name,
            periodsPerWeek: s.periodsPerWeek,
            description: s.description,
            isActive: true,
            isDeleted: false,
          },
        },
        { upsert: true, new: true, runValidators: true }
      );
      subjectMap.set(s.code, doc);
    }
    console.log(`  ✓ Đã đồng bộ ${gradeMap.size} Khối học và ${subjectMap.size} Môn học.`);

    /* ------------------------------------------------------------------------
       BƯỚC 2: SEED TÀI KHOẢN NGƯỜI DÙNG (ADMIN, TEACHER, STUDENT, PARENT)
    ------------------------------------------------------------------------ */
    console.log("\n--- [2/10] Seed Tài khoản (Admin, Teacher, Student, Parent) ---");
    const userMap = new Map(); // userCode -> User doc
    for (const u of SAMPLE_USERS) {
      const doc = await User.findOneAndUpdate(
        { userCode: u.userCode },
        {
          $set: {
            userCode: u.userCode,
            email: u.email,
            fullName: u.fullName,
            role: u.role,
            phone: u.phone || null,
            className: u.className || null,
            password: passwordHash,
            mustChangePassword: false,
            isActivated: true,
            isDeleted: false,
          },
        },
        { upsert: true, new: true, runValidators: true }
      );
      userMap.set(u.userCode, doc);
    }
    console.log(`  ✓ Đã đồng bộ ${userMap.size} tài khoản người dùng.`);

    /* ------------------------------------------------------------------------
       BƯỚC 3: SEED LỚP HỌC (CLASSES + GVCN), GÁN classRef & childrenRefs
    ------------------------------------------------------------------------ */
    console.log("\n--- [3/10] Seed Lớp học (Classes), Gán classRef Học sinh & childrenRefs Phụ huynh ---");
    const classMap = new Map(); // className -> Class doc
    for (const c of SAMPLE_CLASSES) {
      const gradeDoc = gradeMap.get(c.gradeLevel);
      const homeroomTeacher = c.homeroomTeacherCode
        ? userMap.get(c.homeroomTeacherCode)
        : null;

      const studentCountInClass = SAMPLE_USERS.filter(
        (u) => u.role === "student" && u.className === c.name
      ).length;

      const classDoc = await Class.findOneAndUpdate(
        { name: c.name, academicYear: c.academicYear },
        {
          $set: {
            grade: gradeDoc._id,
            academicYear: c.academicYear,
            homeroomTeacher: homeroomTeacher ? homeroomTeacher._id : null,
            room: c.room,
            capacity: c.capacity,
            currentStudents: studentCountInClass,
            description: c.description,
            isActive: true,
            isDeleted: false,
          },
        },
        { upsert: true, new: true, runValidators: true }
      );
      classMap.set(c.name, classDoc);
    }

    // Đồng bộ classRef cho từng Học sinh và ghi nhận ClassHistory
    const adminUser = userMap.get("AD001");
    for (const u of SAMPLE_USERS.filter((item) => item.role === "student")) {
      const targetClass = classMap.get(u.className);
      if (!targetClass) continue;

      const updatedStudent = await User.findOneAndUpdate(
        { userCode: u.userCode },
        {
          $set: {
            classRef: targetClass._id,
            className: targetClass.name,
          },
        },
        { new: true }
      );
      userMap.set(u.userCode, updatedStudent);

      if (adminUser) {
        await ClassHistory.findOneAndUpdate(
          {
            student: updatedStudent._id,
            toClass: targetClass._id,
            action: "ASSIGN",
            academicYear: ACADEMIC_YEAR,
          },
          {
            $set: {
              fromClass: null,
              note: `[SEED] Xếp lớp đầu năm học ${ACADEMIC_YEAR} vào lớp ${targetClass.name}`,
              changedBy: adminUser._id,
            },
          },
          { upsert: true, new: true }
        );
      }
    }

    // Đồng bộ childrenRefs cho từng Phụ huynh (1 Phụ huynh -> 1 Học sinh & 1 Phụ huynh -> Nhiều Học sinh)
    for (const p of SAMPLE_USERS.filter((item) => item.role === "parent")) {
      const childObjectIds = (p.linkedChildCodes || [])
        .map((code) => userMap.get(code)?._id)
        .filter(Boolean);

      const updatedParent = await User.findOneAndUpdate(
        { userCode: p.userCode },
        {
          $set: {
            childrenRefs: childObjectIds,
          },
        },
        { new: true }
      );
      userMap.set(p.userCode, updatedParent);
      console.log(
        `  ✓ Phụ huynh [${p.userCode}] ${p.fullName} -> Liên kết ${childObjectIds.length} con: ${(p.linkedChildCodes || []).join(", ")}`
      );
    }

    /* ------------------------------------------------------------------------
       BƯỚC 4: SEED PHÂN CÔNG GIẢNG DẠY (TEACHING ASSIGNMENTS) & THỜI KHÓA BIỂU (TIMETABLE)
    ------------------------------------------------------------------------ */
    console.log("\n--- [4/10] Seed Phân công giảng dạy (TeachingAssignment) & Thời khóa biểu (Timetable) ---");
    const taMap = new Map(); // `${className}_${subjectCode}` -> TeachingAssignment doc
    let timetableSlotsCount = 0;

    for (const ta of SAMPLE_TEACHING_ASSIGNMENTS) {
      const classDoc = classMap.get(ta.className);
      const subjectDoc = subjectMap.get(ta.subjectCode);
      const teacherDoc = userMap.get(ta.teacherCode);
      if (!classDoc || !subjectDoc || !teacherDoc) continue;

      const taDoc = await TeachingAssignment.findOneAndUpdate(
        {
          class: classDoc._id,
          subject: subjectDoc._id,
          academicYear: ta.academicYear,
          semester: ta.semester,
        },
        {
          $set: {
            teacher: teacherDoc._id,
            periodsPerWeek: ta.periodsPerWeek,
            schedules: ta.schedules,
            status: "active",
            note: ta.note,
            isActive: true,
            isDeleted: false,
          },
        },
        { upsert: true, new: true, runValidators: true }
      );

      taMap.set(`${ta.className}_${ta.subjectCode}`, taDoc);

      // Tạo các tiết học tương ứng trong bảng Timetable
      for (const slot of ta.schedules || []) {
        for (let period = slot.startPeriod; period <= slot.endPeriod; period++) {
          await Timetable.findOneAndUpdate(
            {
              class: classDoc._id,
              academicYear: ta.academicYear,
              semester: ta.semester,
              dayOfWeek: slot.dayOfWeek,
              period,
            },
            {
              $set: {
                subject: subjectDoc._id,
                teacher: teacherDoc._id,
                teachingAssignment: taDoc._id,
                room: slot.room || classDoc.room || "P.101",
                note: ta.note,
                isActive: true,
                isDeleted: false,
              },
            },
            { upsert: true, new: true, runValidators: true }
          );
          timetableSlotsCount++;
        }
      }
    }
    console.log(
      `  ✓ Đã đồng bộ ${taMap.size} phân công giảng dạy và ${timetableSlotsCount} tiết thời khóa biểu.`
    );

    /* ------------------------------------------------------------------------
       BƯỚC 5: SEED NỘI DUNG BÀI GIẢNG (LESSON CONTENTS - EL37..EL40)
    ------------------------------------------------------------------------ */
    console.log("\n--- [5/10] Seed Nội dung bài giảng (LessonContent) ---");
    let lessonCount = 0;
    for (const [taKey, lessons] of Object.entries(SAMPLE_LESSONS_BY_TA)) {
      const taDoc = taMap.get(taKey);
      if (!taDoc) continue;

      for (const item of lessons) {
        await LessonContent.findOneAndUpdate(
          {
            teachingAssignment: taDoc._id,
            order: item.order,
          },
          {
            $set: {
              title: item.title,
              description: item.description,
              contentType: item.contentType,
              resourceUrl: item.resourceUrl || "",
              videoProvider: item.videoProvider || null,
              attachments: item.attachments || [],
              order: item.order,
              teachingAssignment: taDoc._id,
              isActive: item.isActive !== false,
              isDeleted: false,
            },
          },
          { upsert: true, new: true, runValidators: true }
        );
        lessonCount++;
      }
    }
    console.log(`  ✓ Đã đồng bộ ${lessonCount} bài giảng mẫu.`);

    /* ------------------------------------------------------------------------
       BƯỚC 6: SEED BÀI TẬP (ASSIGNMENTS) & BÀI NỘP (SUBMISSIONS - EL50..EL55, EL71, EL97)
    ------------------------------------------------------------------------ */
    console.log("\n--- [6/10] Seed Bài tập (Assignment) & Bài nộp (Submission) ---");
    const now = Date.now();
    const taToan10A1 = taMap.get("10A1_TOAN");
    const taVan10A1 = taMap.get("10A1_VAN");
    const taLy10A1 = taMap.get("10A1_LY");
    const taToan10A2 = taMap.get("10A2_TOAN");
    const taTin11A1 = taMap.get("11A1_TIN");

    const SAMPLE_ASSIGNMENT_DEFS = [
      {
        key: "ASN_TOAN_10A1_1",
        ta: taToan10A1,
        title: "Bài tập Chương 1: Mệnh đề và Tập hợp (Còn hạn nộp)",
        description:
          "[SEED] Giải chi tiết các bài tập số 1 đến số 6 trang 18 SGK Toán 10 và nộp file PDF lời giải.",
        dueDate: new Date(now + 5 * 24 * 3600 * 1000), // Còn hạn 5 ngày
        status: "open",
        attachmentUrl:
          "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        attachments: [
          {
            name: "De_bai_Tap_hop_10A1.pdf",
            url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
            fileType: "document",
            fileSize: 185000,
            format: "pdf",
          },
        ],
      },
      {
        key: "ASN_TOAN_10A1_2",
        ta: taToan10A1,
        title: "Bài tập lớn: Hệ bất phương trình bậc nhất hai ẩn (Đã quá hạn - Chờ chấm)",
        description:
          "[SEED] Lập mô hình bài toán quy hoạch tuyến tính và vẽ miền nghiệm trên hệ trục Oxy.",
        dueDate: new Date(now - 3 * 24 * 3600 * 1000), // Đã quá hạn 3 ngày
        status: "open",
        attachmentUrl:
          "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        attachments: [],
      },
      {
        key: "ASN_VAN_10A1_1",
        ta: taVan10A1,
        title: "Bài viết Nghị luận văn học: Phân tích nhân vật Huấn Cao",
        description:
          "[SEED] Viết bài văn nghị luận (khoảng 600 chữ) phân tích vẻ đẹp nhân cách Huấn Cao trong Chữ người tử tù.",
        dueDate: new Date(now + 4 * 24 * 3600 * 1000),
        status: "open",
        attachmentUrl: "",
        attachments: [],
      },
      {
        key: "ASN_LY_10A1_1",
        ta: taLy10A1,
        title: "Báo cáo thực hành: Đo gia tốc rơi tự do (Đã khóa nhận bài)",
        description:
          "[SEED] Hoàn thành bảng số liệu đo 5 lần và tính sai số phép đo gia tốc rơi tự do g.",
        dueDate: new Date(now - 7 * 24 * 3600 * 1000),
        status: "locked",
        attachmentUrl: "",
        attachments: [],
      },
      {
        key: "ASN_TOAN_10A2_1",
        ta: taToan10A2,
        title: "Phiếu bài tập Hệ thức lượng trong tam giác (Lớp 10A2)",
        description:
          "[SEED] Áp dụng định lí Côsin và định lí Sin giải các bài toán thực tế đo chiều cao.",
        dueDate: new Date(now + 6 * 24 * 3600 * 1000),
        status: "open",
        attachmentUrl: "",
        attachments: [],
      },
      {
        key: "ASN_TIN_11A1_1",
        ta: taTin11A1,
        title: "Bài tập thực hành Truy vấn CSDL SQL (Lớp 11A1)",
        description:
          "[SEED] Viết các câu lệnh SELECT, JOIN và GROUP BY trên lược đồ CSDL Quản lý thư viện.",
        dueDate: new Date(now + 3 * 24 * 3600 * 1000),
        status: "open",
        attachmentUrl: "",
        attachments: [],
      },
    ];

    const assignmentMap = new Map();
    for (const aDef of SAMPLE_ASSIGNMENT_DEFS) {
      if (!aDef.ta) continue;
      const doc = await Assignment.findOneAndUpdate(
        {
          teachingAssignment: aDef.ta._id,
          title: aDef.title,
        },
        {
          $set: {
            description: aDef.description,
            dueDate: aDef.dueDate,
            status: aDef.status,
            attachmentUrl: aDef.attachmentUrl,
            attachments: aDef.attachments,
            isActive: true,
            isDeleted: false,
          },
        },
        { upsert: true, new: true, runValidators: true }
      );
      assignmentMap.set(aDef.key, doc);
    }

    // Seed Submissions với đầy đủ trạng thái:
    // 1. Đã nộp đúng hạn + Đã chấm điểm
    // 2. Đã nộp đúng hạn + Chưa chấm (score: null -> hiển thị trong Danh sách bài tập cần chấm trên TeacherDashboard)
    // 3. Nộp muộn (isLate: true) + Chưa chấm (score: null)
    // 4. Nộp muộn (isLate: true) + Đã chấm điểm thấp
    const teacherToan = userMap.get("GV001");
    const teacherVan = userMap.get("GV002");
    const SAMPLE_SUBMISSION_DEFS = [
      // Bài tập 1 Toán 10A1
      {
        assignmentKey: "ASN_TOAN_10A1_1",
        studentCode: "HS001",
        fileUrl:
          "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        note: "[SEED] Em Nguyễn Văn An nộp bài tập Chương 1 đúng hạn ạ.",
        submittedAt: new Date(now - 1 * 24 * 3600 * 1000),
        isLate: false,
        score: 9.0,
        feedback: "Bài làm trình bày rất khoa học, lập luận chặt chẽ và chính xác!",
        gradedBy: teacherToan?._id,
        gradedAt: new Date(now - 12 * 3600 * 1000),
      },
      {
        assignmentKey: "ASN_TOAN_10A1_1",
        studentCode: "HS002",
        fileUrl:
          "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        note: "[SEED] Em Trần Thị Bình nộp bài tập Chương 1.",
        submittedAt: new Date(now - 6 * 3600 * 1000),
        isLate: false,
        score: null, // CHỜ CHẤM
        feedback: "",
        gradedBy: null,
        gradedAt: null,
      },
      {
        assignmentKey: "ASN_TOAN_10A1_1",
        studentCode: "HS007",
        fileUrl:
          "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        note: "[SEED] Em Đặng Quốc Bảo nộp bài tập Chương 1.",
        submittedAt: new Date(now - 4 * 3600 * 1000),
        isLate: false,
        score: null, // CHỜ CHẤM
        feedback: "",
        gradedBy: null,
        gradedAt: null,
      },

      // Bài tập 2 Toán 10A1 (Đã quá hạn)
      {
        assignmentKey: "ASN_TOAN_10A1_2",
        studentCode: "HS001",
        fileUrl:
          "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        note: "[SEED] Bài nộp đúng hạn trước ngày khóa.",
        submittedAt: new Date(now - 4 * 24 * 3600 * 1000),
        isLate: false,
        score: 8.5,
        feedback: "Vẽ miền nghiệm chính xác, kết luận đúng giá trị tối ưu.",
        gradedBy: teacherToan?._id,
        gradedAt: new Date(now - 2 * 24 * 3600 * 1000),
      },
      {
        assignmentKey: "ASN_TOAN_10A1_2",
        studentCode: "HS002",
        fileUrl:
          "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        note: "[SEED] Em nộp trễ do bổ sung hình vẽ miền nghiệm.",
        submittedAt: new Date(now - 1 * 24 * 3600 * 1000),
        isLate: true, // NỘP TRỄ + CHỜ CHẤM
        score: null,
        feedback: "",
        gradedBy: null,
        gradedAt: null,
      },
      {
        assignmentKey: "ASN_TOAN_10A1_2",
        studentCode: "HS008",
        fileUrl:
          "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        note: "[SEED] Em Lý Thanh Thảo nộp bài trễ hạn.",
        submittedAt: new Date(now - 20 * 3600 * 1000),
        isLate: true,
        score: 4.0,
        feedback: "Nộp bài trễ hạn, còn sai sót khi xác định tọa độ đỉnh miền nghiệm.",
        gradedBy: teacherToan?._id,
        gradedAt: new Date(now - 10 * 3600 * 1000),
      },

      // Bài tập Văn 10A1
      {
        assignmentKey: "ASN_VAN_10A1_1",
        studentCode: "HS001",
        fileUrl: "https://calibre-ebook.com/downloads/demos/demo.docx",
        note: "[SEED] Bài nghị luận văn học của Nguyễn Văn An.",
        submittedAt: new Date(now - 10 * 3600 * 1000),
        isLate: false,
        score: 8.0,
        feedback: "Cảm thụ văn học tốt, dẫn chứng chọn lọc.",
        gradedBy: teacherVan?._id,
        gradedAt: new Date(now - 2 * 3600 * 1000),
      },

      // Bài tập Toán 10A2
      {
        assignmentKey: "ASN_TOAN_10A2_1",
        studentCode: "HS003",
        fileUrl:
          "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        note: "[SEED] Em Lê Hoàng Cường lớp 10A2 nộp bài.",
        submittedAt: new Date(now - 5 * 3600 * 1000),
        isLate: false,
        score: null, // CHỜ CHẤM
        feedback: "",
        gradedBy: null,
        gradedAt: null,
      },
    ];

    const submissionMap = new Map();
    for (const sDef of SAMPLE_SUBMISSION_DEFS) {
      const assignDoc = assignmentMap.get(sDef.assignmentKey);
      const studentDoc = userMap.get(sDef.studentCode);
      if (!assignDoc || !studentDoc) continue;

      const subDoc = await Submission.findOneAndUpdate(
        {
          assignment: assignDoc._id,
          student: studentDoc._id,
        },
        {
          $set: {
            fileUrl: sDef.fileUrl,
            attachments: [
              {
                name: `${sDef.studentCode}_BaiNop.pdf`,
                url: sDef.fileUrl,
                fileType: "document",
                fileSize: 210000,
                format: "pdf",
              },
            ],
            note: sDef.note,
            submittedAt: sDef.submittedAt,
            isLate: sDef.isLate,
            score: sDef.score,
            feedback: sDef.feedback,
            gradedBy: sDef.gradedBy || null,
            gradedAt: sDef.gradedAt || null,
            isDeleted: false,
          },
        },
        { upsert: true, new: true, runValidators: true }
      );
      submissionMap.set(`${sDef.assignmentKey}_${sDef.studentCode}`, subDoc);
    }
    console.log(
      `  ✓ Đã đồng bộ ${assignmentMap.size} bài tập và ${submissionMap.size} bài nộp (gồm đã chấm, chờ chấm và nộp trễ).`
    );

    /* ------------------------------------------------------------------------
       BƯỚC 7: SEED NGÂN HÀNG CÂU HỎI (QUESTIONS), ĐỀ THI (EXAMS) & LƯỢT THI (EXAM ATTEMPTS)
    ------------------------------------------------------------------------ */
    console.log("\n--- [7/10] Seed Ngân hàng câu hỏi (Question), Đề thi (Exam) & Lượt làm bài (ExamAttempt) ---");
    const subjToan = subjectMap.get("TOAN");
    const SAMPLE_QUESTIONS = [
      {
        chapter: "Chương 1: Mệnh đề và Tập hợp",
        difficulty: "easy",
        content: "Trong các câu sau, câu nào là một mệnh đề toán học?",
        options: [
          "Số 17 là một số nguyên tố.",
          "Hôm nay trời đẹp quá!",
          "Bạn đã làm bài tập Toán chưa?",
          "Hãy đứng lên trả lời!",
        ],
        correctIndex: 0,
        explanation: "[SEED] Mệnh đề toán học là câu khẳng định có tính đúng hoặc sai rõ ràng.",
      },
      {
        chapter: "Chương 1: Mệnh đề và Tập hợp",
        difficulty: "medium",
        content: "Cho tập hợp A = {1; 2; 3; 4} và B = {3; 4; 5; 6}. Tập hợp A ∩ B là:",
        options: ["{1; 2}", "{3; 4}", "{5; 6}", "{1; 2; 3; 4; 5; 6}"],
        correctIndex: 1,
        explanation: "[SEED] Giao của hai tập hợp A và B gồm các phần tử thuộc cả A và B.",
      },
      {
        chapter: "Chương 2: Bất phương trình bậc nhất hai ẩn",
        difficulty: "medium",
        content: "Cặp số (x; y) nào sau đây là nghiệm của bất phương trình 2x + y - 3 > 0?",
        options: ["(0; 0)", "(1; 1)", "(2; 1)", "(-1; 2)"],
        correctIndex: 2,
        explanation: "[SEED] Thay (2; 1) vào vế trái: 2(2) + 1 - 3 = 2 > 0 (đúng).",
      },
      {
        chapter: "Chương 3: Hệ thức lượng trong tam giác",
        difficulty: "hard",
        content: "Cho tam giác ABC có b = 6, c = 8 và góc A = 60°. Độ dài cạnh a bằng:",
        options: ["2√13", "10", "2√37", "7"],
        correctIndex: 0,
        explanation: "[SEED] Áp dụng định lí Côsin: a² = b² + c² - 2bc.cos60° = 36 + 64 - 48 = 52 => a = 2√13.",
      },
    ];

    const questionIds = [];
    if (subjToan && teacherToan) {
      for (const qDef of SAMPLE_QUESTIONS) {
        const qDoc = await Question.findOneAndUpdate(
          {
            subject: subjToan._id,
            content: qDef.content,
          },
          {
            $set: {
              chapter: qDef.chapter,
              difficulty: qDef.difficulty,
              options: qDef.options,
              correctIndex: qDef.correctIndex,
              teacher: teacherToan._id,
              createdBy: teacherToan._id,
              explanation: qDef.explanation,
              isActive: true,
              isDeleted: false,
            },
          },
          { upsert: true, new: true, runValidators: true }
        );
        questionIds.push(qDoc._id);
      }
    }

    let examDoc = null;
    if (taToan10A1 && teacherToan && questionIds.length > 0) {
      examDoc = await Exam.findOneAndUpdate(
        {
          teachingAssignment: taToan10A1._id,
          title: "Đề kiểm tra 15 phút Chương 1 Đại số 10",
        },
        {
          $set: {
            description:
              "[SEED] Đề kiểm tra trắc nghiệm đánh giá kiến thức Mệnh đề, Tập hợp và Bất phương trình.",
            duration: 15,
            questionIds,
            scoreWeight: 10,
            teacher: teacherToan._id,
            status: "published",
            isPublished: true,
            publishedAt: new Date(now - 5 * 24 * 3600 * 1000),
            startTime: new Date(now - 5 * 24 * 3600 * 1000),
            endTime: new Date(now + 10 * 24 * 3600 * 1000),
            isActive: true,
            isDeleted: false,
          },
        },
        { upsert: true, new: true, runValidators: true }
      );

      // Tạo lượt làm bài cho HS001 (10/10) và HS002 (5.0/10)
      const hs1 = userMap.get("HS001");
      const hs2 = userMap.get("HS002");
      if (hs1) {
        await ExamAttempt.findOneAndUpdate(
          { exam: examDoc._id, student: hs1._id },
          {
            $set: {
              answers: questionIds.map((qId, idx) => ({
                question: qId,
                selectedOption: SAMPLE_QUESTIONS[idx].correctIndex,
                isCorrect: true,
              })),
              score: 10,
              scoreWeight: 10,
              totalQuestions: questionIds.length,
              correctCount: questionIds.length,
              wrongCount: 0,
              unansweredCount: 0,
              durationSpent: 480,
              status: "completed",
              isDeleted: false,
            },
          },
          { upsert: true, new: true, runValidators: true }
        );
      }
      if (hs2) {
        await ExamAttempt.findOneAndUpdate(
          { exam: examDoc._id, student: hs2._id },
          {
            $set: {
              answers: questionIds.map((qId, idx) => ({
                question: qId,
                selectedOption: idx < 2 ? SAMPLE_QUESTIONS[idx].correctIndex : 3,
                isCorrect: idx < 2,
              })),
              score: 5.0,
              scoreWeight: 10,
              totalQuestions: questionIds.length,
              correctCount: 2,
              wrongCount: 2,
              unansweredCount: 0,
              durationSpent: 720,
              status: "completed",
              isDeleted: false,
            },
          },
          { upsert: true, new: true, runValidators: true }
        );
      }
    }
    console.log(
      `  ✓ Đã đồng bộ ${questionIds.length} câu hỏi trắc nghiệm, ${examDoc ? 1 : 0} đề thi và 2 lượt làm bài.`
    );

    /* ------------------------------------------------------------------------
       BƯỚC 8: SEED SỔ ĐIỂM (GRADE RECORDS - EL65..EL67, EL71, EL72, EL75, EL97)
       Bao gồm cả học sinh điểm cao/khá và học sinh điểm thấp (< 5.0 & < 3.5)
    ------------------------------------------------------------------------ */
    console.log("\n--- [8/10] Seed Sổ điểm (GradeRecord - nhiều môn, hệ số 1/2/3, có HS điểm cao & điểm thấp < 5.0) ---");
    const taAnh10A1 = taMap.get("10A1_ANH");
    const taTin10A1 = taMap.get("10A1_TIN");
    const taVan10A2 = taMap.get("10A2_VAN");
    const taToan11A1 = taMap.get("11A1_TOAN");
    const taAnh11A1 = taMap.get("11A1_ANH");
    const taLy12A1 = taMap.get("12A1_LY");

    // Cấu trúc helper: [studentCode, taDoc, semester, { oral, "15min", "45min", midterm, final }]
    const GRADEBOOK_ROWS = [
      // 1. HS001 (Nguyễn Văn An - 10A1 - Con của PH001): Học sinh Giỏi (~8.6)
      ["HS001", taToan10A1, "HK1", { oral: 9.0, "15min": 8.5, "45min": 9.0, midterm: 8.5, final: 9.0 }],
      ["HS001", taVan10A1, "HK1", { oral: 8.0, "15min": 8.0, "45min": 8.5, midterm: 8.0, final: 8.5 }],
      ["HS001", taAnh10A1, "HK1", { oral: 9.0, "15min": 9.0, "45min": 8.5, midterm: 9.0, final: 8.8 }],
      ["HS001", taLy10A1, "HK1", { oral: 8.5, "15min": 8.0, "45min": 8.5, midterm: 8.5, final: 8.5 }],
      ["HS001", taTin10A1, "HK1", { oral: 9.5, "15min": 9.0, "45min": 9.0, midterm: 9.5, final: 9.5 }],

      // 2. HS002 (Trần Thị Bình - 10A1 - Con của PH002): Có môn Toán & Lý điểm thấp (< 5.0) -> Kích hoạt cảnh báo điểm yếu
      ["HS002", taToan10A1, "HK1", { oral: 4.5, "15min": 4.0, "45min": 4.5, midterm: 4.0, final: 4.2 }], // ĐTB ~ 4.2 (< 5.0)
      ["HS002", taLy10A1, "HK1", { oral: 4.0, "15min": 4.5, "45min": 4.0, midterm: 4.5, final: 4.0 }], // ĐTB ~ 4.2 (< 5.0)
      ["HS002", taVan10A1, "HK1", { oral: 7.0, "15min": 6.5, "45min": 7.0, midterm: 6.5, final: 7.0 }],
      ["HS002", taAnh10A1, "HK1", { oral: 6.5, "15min": 6.0, "45min": 6.5, midterm: 6.0, final: 6.5 }],

      // 3. HS007 (Đặng Quốc Bảo - 10A1 - Con thứ 3 của PH001): Học sinh Khá (~7.5)
      ["HS007", taToan10A1, "HK1", { oral: 7.5, "15min": 7.0, "45min": 7.5, midterm: 7.5, final: 7.8 }],
      ["HS007", taVan10A1, "HK1", { oral: 7.0, "15min": 7.5, "45min": 7.0, midterm: 7.5, final: 7.5 }],
      ["HS007", taLy10A1, "HK1", { oral: 8.0, "15min": 7.5, "45min": 8.0, midterm: 7.5, final: 8.0 }],

      // 4. HS008 (Lý Thanh Thảo - 10A1): Điểm kém (< 3.5) môn Toán -> Kích hoạt cảnh báo severity 'high'
      ["HS008", taToan10A1, "HK1", { oral: 3.5, "15min": 3.0, "45min": 3.0, midterm: 3.2, final: 3.0 }], // ĐTB ~ 3.1 (< 3.5)
      ["HS008", taVan10A1, "HK1", { oral: 6.0, "15min": 6.5, "45min": 6.0, midterm: 6.0, final: 6.5 }],

      // 5. HS003 (Lê Hoàng Cường - 10A2 - Con thứ 2 của PH001): Học sinh Khá/Giỏi (~8.0)
      ["HS003", taToan10A2, "HK1", { oral: 8.0, "15min": 8.5, "45min": 8.0, midterm: 8.0, final: 8.2 }],
      ["HS003", taVan10A2, "HK1", { oral: 7.5, "15min": 8.0, "45min": 7.5, midterm: 8.0, final: 8.0 }],

      // 6. HS009 (Phan Minh Khang - 10A2 - Con của PH003): Điểm yếu môn Toán 10A2 (< 5.0)
      ["HS009", taToan10A2, "HK1", { oral: 4.5, "15min": 4.5, "45min": 4.0, midterm: 4.5, final: 4.5 }], // ĐTB ~ 4.4 (< 5.0)
      ["HS009", taVan10A2, "HK1", { oral: 6.5, "15min": 7.0, "45min": 6.5, midterm: 7.0, final: 6.8 }],

      // 7. HS004 (Phạm Ngọc Dung - 11A1 - Con của PH003): Học sinh Giỏi (~8.4)
      ["HS004", taToan11A1, "HK1", { oral: 8.5, "15min": 8.0, "45min": 8.5, midterm: 8.5, final: 8.5 }],
      ["HS004", taAnh11A1, "HK1", { oral: 9.0, "15min": 8.5, "45min": 9.0, midterm: 8.5, final: 9.0 }],
      ["HS004", taTin11A1, "HK1", { oral: 8.5, "15min": 9.0, "45min": 8.5, midterm: 8.5, final: 8.8 }],

      // 8. HS006 (Vũ Hải Yến - 12A1 - Con của PH004)
      ["HS006", taLy12A1, "HK1", { oral: 8.0, "15min": 8.5, "45min": 8.0, midterm: 8.5, final: 8.5 }],
    ];

    let gradeRecordCount = 0;
    let sampleLowGradeRecordDoc = null;

    for (const [studentCode, taDoc, semester, scoresObj] of GRADEBOOK_ROWS) {
      const studentDoc = userMap.get(studentCode);
      if (!studentDoc || !taDoc) continue;

      for (const [gradeType, value] of Object.entries(scoresObj)) {
        const weight = GradeRecord.DEFAULT_GRADE_WEIGHTS[gradeType] || 1;
        const recDoc = await GradeRecord.findOneAndUpdate(
          {
            student: studentDoc._id,
            teachingAssignment: taDoc._id,
            semester,
            gradeType,
          },
          {
            $set: {
              value,
              weight,
              note: `[SEED] Điểm ${gradeType} học kỳ ${semester}`,
              createdBy: taDoc.teacher,
              updatedBy: taDoc.teacher,
              isDeleted: false,
            },
          },
          { upsert: true, new: true, runValidators: true }
        );
        gradeRecordCount++;
        if (studentCode === "HS002" && gradeType === "midterm" && taDoc === taToan10A1) {
          sampleLowGradeRecordDoc = recDoc;
        }
      }
    }
    console.log(`  ✓ Đã đồng bộ ${gradeRecordCount} đầu điểm trong Sổ điểm (GradeRecord).`);

    /* ------------------------------------------------------------------------
       BƯỚC 9: SEED HỆ THỐNG THÔNG BÁO (NOTIFICATIONS - EL75, EL77, EL78)
       Đầy đủ cho Student, Teacher, Parent; có cả đã đọc (isRead: true) & chưa đọc (isRead: false)
    ------------------------------------------------------------------------ */
    console.log("\n--- [9/10] Seed Hệ thống Thông báo (Notification cho Student, Teacher, Parent) ---");
    const hs1 = userMap.get("HS001");
    const hs2 = userMap.get("HS002");
    const hs3 = userMap.get("HS003");
    const hs4 = userMap.get("HS004");
    const ph1 = userMap.get("PH001");
    const ph2 = userMap.get("PH002");
    const ph3 = userMap.get("PH003");
    const asnToan1 = assignmentMap.get("ASN_TOAN_10A1_1");
    const subHs1Toan1 = submissionMap.get("ASN_TOAN_10A1_1_HS001");

    const SAMPLE_NOTIFICATIONS = [
      // --- THÔNG BÁO CHO HỌC SINH HS001 (cũng hiển thị trên Tab Thông báo của Phụ huynh PH001) ---
      {
        recipient: hs1?._id,
        sender: teacherToan?._id,
        type: "assignment_created",
        title: "Bài tập mới môn Toán học: Bài tập Chương 1: Mệnh đề và Tập hợp",
        content:
          'Giáo viên Nguyễn Văn Toán vừa giao bài tập mới "Bài tập Chương 1: Mệnh đề và Tập hợp" (Toán học).',
        link: asnToan1
          ? `/student/assignments?assignmentId=${asnToan1._id}`
          : "/student/assignments",
        assignment: asnToan1?._id || null,
        isRead: false,
        metadata: {
          isSeedData: true,
          subjectName: "Toán học",
          assignmentTitle: "Bài tập Chương 1: Mệnh đề và Tập hợp",
        },
      },
      {
        recipient: hs1?._id,
        sender: teacherToan?._id,
        type: "assignment_graded",
        title: "Đã có điểm chấm bài: Bài tập Chương 1: Mệnh đề và Tập hợp",
        content:
          'Bài nộp của bạn cho "Bài tập Chương 1: Mệnh đề và Tập hợp" đã được chấm 9/10 điểm. Nhận xét: "Bài làm trình bày rất khoa học, lập luận chặt chẽ và chính xác!"',
        link: asnToan1
          ? `/student/assignments?assignmentId=${asnToan1._id}`
          : "/student/assignments",
        assignment: asnToan1?._id || null,
        submission: subHs1Toan1?._id || null,
        isRead: true,
        readAt: new Date(now - 6 * 3600 * 1000),
        metadata: {
          isSeedData: true,
          score: 9.0,
          feedback: "Bài làm trình bày rất khoa học, lập luận chặt chẽ và chính xác!",
        },
      },
      {
        recipient: hs1?._id,
        sender: teacherToan?._id,
        type: "grade_created",
        title: "Điểm mới môn Toán học: Điểm cuối kỳ",
        content:
          "Điểm cuối kỳ môn Toán học (HK1) của bạn vừa có điểm mới: 9.0/10 điểm.",
        link: "/student/grades?semester=HK1",
        isRead: false,
        metadata: {
          isSeedData: true,
          gradeType: "final",
          value: 9.0,
          weight: 3,
          semester: "HK1",
          subjectName: "Toán học",
        },
      },
      {
        recipient: hs1?._id,
        sender: adminUser?._id,
        type: "system",
        title: "Thông báo Nhà trường: Lịch họp Phụ huynh sơ kết Học kỳ 1 năm học 2025-2026",
        content:
          "Trường THPT thông báo lịch họp Phụ huynh học sinh toàn trường vào 08:00 Chủ nhật tuần này tại phòng học của từng lớp. Đính kèm thư mời và kế hoạch học tập HK2.",
        link: "/student/dashboard",
        isRead: false,
        metadata: {
          isSeedData: true,
          attachments: [
            {
              fileName: "Thu_moi_hop_Phu_huynh_HK1_2025_2026.pdf",
              fileUrl:
                "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
              fileType: "document",
              fileSize: 256000,
            },
          ],
        },
      },

      // --- THÔNG BÁO CHO HỌC SINH HS002 (Điểm thấp < 5.0 - Con của PH002) ---
      {
        recipient: hs2?._id,
        sender: teacherToan?._id,
        type: "grade_updated",
        title: "Cảnh báo kết quả học tập môn Toán học: Điểm giữa kỳ 4.0/10",
        content:
          "Điểm giữa kỳ môn Toán học (HK1) của Trần Thị Bình đạt 4.0/10 điểm (dưới mức đạt 5.0). Đề nghị học sinh và Quý Phụ huynh phối hợp ôn tập bổ sung kiến thức Chương 1 & 2.",
        link: "/student/grades?semester=HK1",
        gradeRecord: sampleLowGradeRecordDoc?._id || null,
        isRead: false,
        metadata: {
          isSeedData: true,
          gradeType: "midterm",
          value: 4.0,
          weight: 2,
          semester: "HK1",
          subjectName: "Toán học",
        },
      },
      {
        recipient: hs2?._id,
        sender: teacherToan?._id,
        type: "general",
        title: "Thông báo GVCN Lớp 10A1: Lịch phụ đạo miễn phí môn Toán & Vật lí",
        content:
          "Thầy Nguyễn Văn Toán (GVCN 10A1) tổ chức buổi ôn tập củng cố kiến thức cơ bản cho học sinh lớp 10A1 vào chiều Thứ Sáu tại phòng P.101.",
        link: "/student/timetable",
        isRead: true,
        readAt: new Date(now - 24 * 3600 * 1000),
        metadata: { isSeedData: true },
      },

      // --- THÔNG BÁO CHO HỌC SINH HS003 (Lớp 10A2 - Con thứ 2 của PH001) ---
      {
        recipient: hs3?._id,
        sender: teacherVan?._id,
        type: "system",
        title: "Thông báo GVCN Lớp 10A2: Kế hoạch ngoại khóa & Đề cương ôn tập Học kỳ 1",
        content:
          "Cô Trần Thị Văn (GVCN 10A2) gửi Quý Phụ huynh và các em học sinh lớp 10A2 đề cương ôn tập tổng hợp các môn Học kỳ 1.",
        link: "/student/lessons",
        isRead: false,
        metadata: { isSeedData: true },
      },

      // --- THÔNG BÁO CHO HỌC SINH HS004 (Lớp 11A1 - Con của PH003) ---
      {
        recipient: hs4?._id,
        sender: userMap.get("GV003")?._id,
        type: "grade_created",
        title: "Điểm mới môn Tiếng Anh: Điểm cuối kỳ 9.0/10",
        content:
          "Điểm cuối kỳ môn Tiếng Anh (HK1) của Phạm Ngọc Dung vừa được cập nhật: 9.0/10 điểm.",
        link: "/student/grades?semester=HK1",
        isRead: false,
        metadata: { isSeedData: true, score: 9.0, subjectName: "Tiếng Anh" },
      },

      // --- THÔNG BÁO TRỰC TIẾP CHO TÀI KHOẢN PHỤ HUYNH (PH001, PH002, PH003 - HIỂN THỊ TRÊN CHUÔNG HEADER EL78) ---
      {
        recipient: ph1?._id,
        sender: teacherToan?._id,
        type: "system",
        title: "Thư mời họp Phụ huynh Học kỳ 1 - Lớp 10A1 & 10A2",
        content:
          "Kính mời Phụ huynh Nguyễn Văn Nam tham dự buổi họp Phụ huynh sơ kết Học kỳ 1 năm học 2025-2026 của em Nguyễn Văn An (10A1) và Lê Hoàng Cường (10A2).",
        link: "/parent/dashboard",
        isRead: false,
        metadata: { isSeedData: true },
      },
      {
        recipient: ph1?._id,
        sender: teacherToan?._id,
        type: "grade_created",
        title: "Thông báo kết quả học tập của con: Nguyễn Văn An đạt 9.0 điểm Cuối kỳ Toán",
        content:
          "Em Nguyễn Văn An (Lớp 10A1) vừa đạt 9.0/10 điểm thi Cuối kỳ 1 môn Toán học. Điểm trung bình tổng kết hiện tại đạt loại Giỏi.",
        link: "/parent/grades",
        isRead: true,
        readAt: new Date(now - 3 * 3600 * 1000),
        metadata: { isSeedData: true, score: 9.0 },
      },
      {
        recipient: ph2?._id,
        sender: teacherToan?._id,
        type: "grade_updated",
        title: "[Cảnh báo học lực] Điểm trung bình môn Toán của em Trần Thị Bình dưới 5.0",
        content:
          "Kính gửi Phụ huynh Trần Thị Lan, điểm trung bình môn Toán học (HK1) của em Trần Thị Bình (10A1) hiện là 4.2/10. Nhà trường kính đề nghị Quý Phụ huynh phối hợp đôn đốc em ôn tập.",
        link: "/parent/grades",
        isRead: false,
        metadata: { isSeedData: true, score: 4.2 },
      },
      {
        recipient: ph3?._id,
        sender: userMap.get("GV003")?._id,
        type: "general",
        title: "Báo cáo tình hình học tập định kỳ Lớp 11A1 & 10A2",
        content:
          "Giáo viên chủ nhiệm đã cập nhật bảng điểm tổng kết Học kỳ 1 của em Phạm Ngọc Dung (11A1) và Phan Minh Khang (10A2) trên Cổng thông tin Phụ huynh.",
        link: "/parent/dashboard",
        isRead: false,
        metadata: { isSeedData: true },
      },

      // --- THÔNG BÁO CHO GIÁO VIÊN (GV001 - CHUÔNG HEADER CỦA TEACHER) ---
      {
        recipient: teacherToan?._id,
        sender: hs2?._id,
        type: "submission_updated",
        title: "Có 3 bài nộp mới đang chờ chấm điểm ở lớp 10A1",
        content:
          'Học sinh Trần Thị Bình và Đặng Quốc Bảo (10A1) vừa nộp bài cho "Bài tập Chương 1: Mệnh đề và Tập hợp".',
        link: "/teacher/assignments",
        isRead: false,
        metadata: { isSeedData: true },
      },
    ];

    let notificationCount = 0;
    for (const nDef of SAMPLE_NOTIFICATIONS) {
      if (!nDef.recipient) continue;
      await Notification.findOneAndUpdate(
        {
          recipient: nDef.recipient,
          title: nDef.title,
        },
        {
          $set: {
            sender: nDef.sender || null,
            type: nDef.type,
            content: nDef.content,
            message: nDef.content,
            link: nDef.link || "",
            assignment: nDef.assignment || null,
            submission: nDef.submission || null,
            gradeRecord: nDef.gradeRecord || null,
            isRead: Boolean(nDef.isRead),
            readAt: nDef.readAt || null,
            metadata: nDef.metadata || { isSeedData: true },
            isDeleted: false,
          },
        },
        { upsert: true, new: true, runValidators: true }
      );
      notificationCount++;
    }
    console.log(`  ✓ Đã đồng bộ ${notificationCount} thông báo (Notification).`);

    /* ------------------------------------------------------------------------
       BƯỚC 10: SEED NHẬT KÝ EMAIL GỬI PHỤ HUYNH (EMAIL LOGS - EL79, KHÔNG CÓ ĐIỂM DANH)
    ------------------------------------------------------------------------ */
    console.log("\n--- [10/10] Seed Nhật ký gửi Email Phụ huynh (EmailLog - Cảnh báo điểm thấp & Báo cáo học tập) ---");
    let emailLogCount = 0;
    if (hs2 && ph2) {
      await EmailLog.findOneAndUpdate(
        {
          eventKey: `seed_low_grade_alert_${hs2._id}_TOAN_HK1`,
          recipientEmail: ph2.email,
        },
        {
          $set: {
            eventType: "low_grade_alert",
            student: hs2._id,
            parent: ph2._id,
            subject:
              "[EduLMS - Cảnh báo học tập] Học sinh Trần Thị Bình (10A1) có điểm môn Toán học dưới 5.0",
            htmlContent:
              "<p>Kính gửi Quý Phụ huynh <strong>Trần Thị Lan</strong>, hệ thống EduLMS thông báo điểm kiểm tra Giữa kỳ 1 môn Toán học của em <strong>Trần Thị Bình</strong> (Lớp 10A1) đạt <strong>4.0/10</strong>.</p>",
            textContent:
              "Cảnh báo học tập: Học sinh Trần Thị Bình (10A1) đạt 4.0/10 môn Toán học HK1.",
            status: "sent",
            attempts: 1,
            maxRetries: 3,
            messageId: "<seed-msg-low-grade-hs002@edulms.test>",
            sentAt: new Date(now - 2 * 3600 * 1000),
            lastAttemptAt: new Date(now - 2 * 3600 * 1000),
            metadata: {
              isSeedData: true,
              subjectName: "Toán học",
              score: 4.0,
              semester: "HK1",
            },
          },
        },
        { upsert: true, new: true, runValidators: true }
      );
      emailLogCount++;
    }

    if (hs1 && ph1) {
      await EmailLog.findOneAndUpdate(
        {
          eventKey: `seed_periodic_report_${hs1._id}_HK1_2025_2026`,
          recipientEmail: ph1.email,
        },
        {
          $set: {
            eventType: "periodic_academic_report",
            student: hs1._id,
            parent: ph1._id,
            subject:
              "[EduLMS - Báo cáo học tập định kỳ] Tổng hợp kết quả Học kỳ 1 của em Nguyễn Văn An (10A1)",
            htmlContent:
              "<p>Kính gửi Quý Phụ huynh <strong>Nguyễn Văn Nam</strong>, Điểm trung bình tổng kết Học kỳ 1 của em <strong>Nguyễn Văn An</strong> (Lớp 10A1) đạt <strong>8.7/10</strong> (Xếp loại: <strong>Giỏi</strong>).</p>",
            textContent:
              "Báo cáo học tập định kỳ HK1: Em Nguyễn Văn An (10A1) đạt GPA 8.7/10 (Loại Giỏi).",
            status: "sent",
            attempts: 1,
            maxRetries: 3,
            messageId: "<seed-msg-periodic-hs001@edulms.test>",
            sentAt: new Date(now - 1 * 3600 * 1000),
            lastAttemptAt: new Date(now - 1 * 3600 * 1000),
            metadata: {
              isSeedData: true,
              gpa: 8.7,
              academicPerformance: "Giỏi",
              semester: "HK1",
            },
          },
        },
        { upsert: true, new: true, runValidators: true }
      );
      emailLogCount++;
    }
    console.log(`  ✓ Đã đồng bộ ${emailLogCount} nhật ký gửi Email Phụ huynh (EmailLog).`);

    /* ------------------------------------------------------------------------
       TỔNG KẾT SỐ LƯỢNG BẢN GHI & IN BẢNG TÀI KHOẢN MẪU
    ------------------------------------------------------------------------ */
    console.log("\n======================================================================");
    console.log("   TỔNG KẾT DỮ LIỆU ĐÃ SEED THÀNH CÔNG TRÊN MONGODB");
    console.log("======================================================================");
    console.log(`- Users (Tài khoản):               ${await User.countDocuments({ isDeleted: { $ne: true } })}`);
    console.log(`- Grades (Khối học):               ${await Grade.countDocuments({ isDeleted: { $ne: true } })}`);
    console.log(`- Subjects (Môn học):              ${await Subject.countDocuments({ isDeleted: { $ne: true } })}`);
    console.log(`- Classes (Lớp học):               ${await Class.countDocuments({ isDeleted: { $ne: true } })}`);
    console.log(`- ClassHistory (Lịch sử xếp lớp):  ${await ClassHistory.countDocuments()}`);
    console.log(`- TeachingAssignments (Phân công): ${await TeachingAssignment.countDocuments({ isDeleted: { $ne: true } })}`);
    console.log(`- Timetables (Thời khóa biểu):     ${await Timetable.countDocuments({ isDeleted: { $ne: true } })}`);
    console.log(`- LessonContents (Bài giảng):      ${await LessonContent.countDocuments({ isDeleted: { $ne: true } })}`);
    console.log(`- Assignments (Bài tập):           ${await Assignment.countDocuments({ isDeleted: { $ne: true } })}`);
    console.log(`- Submissions (Bài nộp):           ${await Submission.countDocuments({ isDeleted: { $ne: true } })}`);
    console.log(`- Questions (Câu hỏi trắc nghiệm): ${await Question.countDocuments({ isDeleted: { $ne: true } })}`);
    console.log(`- Exams (Đề kiểm tra):             ${await Exam.countDocuments({ isDeleted: { $ne: true } })}`);
    console.log(`- ExamAttempts (Lượt làm bài):     ${await ExamAttempt.countDocuments({ isDeleted: { $ne: true } })}`);
    console.log(`- GradeRecords (Đầu điểm sổ điểm): ${await GradeRecord.countDocuments({ isDeleted: { $ne: true } })}`);
    console.log(`- Notifications (Thông báo):       ${await Notification.countDocuments({ isDeleted: { $ne: true } })}`);
    console.log(`- EmailLogs (Nhật ký Email PH):    ${await EmailLog.countDocuments()}`);

    printSampleAccountsTable(seedPassword);
  } finally {
    await mongoose.disconnect();
    console.log("Đã đóng kết nối MongoDB an toàn.\n");
  }
}

/**
 * In bảng danh sách tài khoản mẫu theo từng Role để dễ đăng nhập kiểm thử
 */
function printSampleAccountsTable(password) {
  console.log("\n======================================================================");
  console.log("   BẢNG TÀI KHOẢN MẪU ĐỂ ĐĂNG NHẬP KIỂM THỬ (TẤT CẢ ROLES)");
  console.log("======================================================================");
  console.log(`Mật khẩu chung cho mọi tài khoản: ${password}\n`);
  console.log(
    `${"Mã".padEnd(8)} | ${"Vai trò".padEnd(10)} | ${"Email đăng nhập".padEnd(24)} | ${"Họ và tên / Ghi chú nghiệp vụ"}`
  );
  console.log("-".repeat(95));
  for (const u of SAMPLE_USERS) {
    let note = "";
    if (u.userCode === "GV001") note = " (GVCN 10A1 + Dạy Toán 10A1, 10A2, 11A1)";
    else if (u.userCode === "GV002") note = " (GVCN 10A2 + Dạy Văn 10A1, 10A2)";
    else if (u.userCode === "GV003") note = " (GVCN 11A1 + Dạy Anh 10A1, 11A1)";
    else if (u.userCode === "GV004") note = " (GVCN 12A1 + Dạy Lý 10A1, 10A2, 11A1, 12A1)";
    else if (u.userCode === "HS001") note = " (Lớp 10A1 - Học sinh Giỏi ~8.7)";
    else if (u.userCode === "HS002") note = " (Lớp 10A1 - Có điểm thấp < 5.0 Toán & Lý)";
    else if (u.userCode === "HS008") note = " (Lớp 10A1 - Có điểm kém < 3.5 Toán)";
    else if (u.className) note = ` (Lớp ${u.className})`;
    else if (u.linkedChildCodes)
      note = ` (Liên kết ${u.linkedChildCodes.length} con: ${u.linkedChildCodes.join(", ")})`;

    console.log(
      `${u.userCode.padEnd(8)} | ${u.role.padEnd(10)} | ${u.email.padEnd(24)} | ${u.fullName}${note}`
    );
  }
  console.log("======================================================================\n");
}

if (require.main === module) {
  runMasterSeed().catch(async (err) => {
    console.error("LỖI KHI CHẠY SEED:", err.message || err);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
}

module.exports = {
  runMasterSeed,
  verifyEnvironmentSafety,
  SAMPLE_USERS,
  SAMPLE_GRADES,
  SAMPLE_SUBJECTS,
  SAMPLE_CLASSES,
  SAMPLE_TEACHING_ASSIGNMENTS,
  SAMPLE_LESSONS_BY_TA,
};
