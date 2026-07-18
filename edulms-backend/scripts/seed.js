const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const mongoose = require("mongoose");

// Import Database Models
const User = require("../src/models/User");
const Grade = require("../src/models/Grade");
const Class = require("../src/models/Class");
const Subject = require("../src/models/Subject");
const TeachingAssignment = require("../src/models/TeachingAssignment");
const Timetable = require("../src/models/Timetable");
const Attendance = require("../src/models/Attendance");
const Assignment = require("../src/models/Assignment");
const Submission = require("../src/models/Submission");
const Question = require("../src/models/Question");
const Exam = require("../src/models/Exam");
const ExamAttempt = require("../src/models/ExamAttempt");
const GradeRecord = require("../src/models/GradeRecord");
const Notification = require("../src/models/Notification");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/edulms";

async function runSeed() {
  console.log("=== BẮT ĐẦU SEED DỮ LIỆU HỆ THỐNG EDULMS ===");
  
  try {
    // 1. Kết nối cơ sở dữ liệu
    await mongoose.connect(MONGO_URI);
    console.log("-> Đã kết nối cơ sở dữ liệu MongoDB thành công.");

    // 2. Xóa sạch dữ liệu cũ
    console.log("-> Đang xóa dữ liệu cũ trong các collection...");
    await Promise.all([
      User.deleteMany({}),
      Grade.deleteMany({}),
      Class.deleteMany({}),
      Subject.deleteMany({}),
      TeachingAssignment.deleteMany({}),
      Timetable.deleteMany({}),
      Attendance.deleteMany({}),
      Assignment.deleteMany({}),
      Submission.deleteMany({}),
      Question.deleteMany({}),
      Exam.deleteMany({}),
      ExamAttempt.deleteMany({}),
      GradeRecord.deleteMany({}),
      Notification.deleteMany({}),
    ]);
    console.log("-> Đã dọn sạch cơ sở dữ liệu.");

    // 3. Khởi tạo Khối học (Grades)
    console.log("-> Đang tạo dữ liệu Khối học...");
    const [grade10, grade11, grade12] = await Grade.create([
      { name: "10" },
      { name: "11" },
      { name: "12" },
    ]);
    console.log(`Đã tạo: Khối ${grade10.name}, Khối ${grade11.name}, Khối ${grade12.name}`);

    // 4. Khởi tạo Người dùng (Users: Admin, Teacher, Student, Parent)
    console.log("-> Đang tạo dữ liệu Người dùng...");
    
    // Lưu ý: Mật khẩu sẽ được tự động hash qua pre-save hook trong User schema
    const admin = new User({
      name: "Nguyen Minh Chuong",
      email: "admin@edulms.edu",
      password: "adminpassword",
      role: "admin",
      isActivated: true,
    });

    const teacher = new User({
      name: "Tran Minh Thach",
      email: "teacher@edulms.edu",
      password: "teacherpassword",
      role: "teacher",
      teacherCode: "GV-2002",
      isActivated: true,
    });

    const student = new User({
      name: "Le Hoang Nam",
      email: "student@edulms.edu",
      password: "studentpassword",
      role: "student",
      studentCode: "HS-1001",
      isActivated: true,
    });

    const parent = new User({
      name: "Le Dinh Hung",
      email: "parent@edulms.edu",
      password: "parentpassword",
      role: "parent",
      isActivated: true,
    });

    const unactiveStudent = new User({
      name: "Nguyen Unactive",
      email: "unactive@edulms.edu",
      password: "tempPassword123",
      role: "student",
      studentCode: "HS-7777",
      isActivated: false,
    });

    await Promise.all([
      admin.save(),
      teacher.save(),
      student.save(),
      parent.save(),
      unactiveStudent.save()
    ]);
    console.log("Đã tạo người dùng: Admin, Giáo viên, Học sinh, Phụ huynh và Học sinh chưa kích hoạt thành công.");


    // 5. Khởi tạo Lớp học (Class) và liên kết chủ nhiệm
    console.log("-> Đang tạo Lớp học...");
    const class10A1 = await Class.create({
      name: "10A1",
      gradeRef: grade10._id,
      homeroomTeacherRef: teacher._id,
    });
    console.log(`Đã tạo lớp: ${class10A1.name} (Chủ nhiệm: ${teacher.name})`);

    // Cập nhật lớp cho học sinh & con cho phụ huynh
    student.classRef = class10A1._id;
    parent.childrenRefs = [student._id];
    await Promise.all([student.save(), parent.save()]);
    console.log("Đã xếp học sinh vào lớp và liên kết tài khoản Phụ huynh.");

    // 6. Khởi tạo Môn học (Subjects)
    console.log("-> Đang tạo Môn học...");
    const [math, webDev] = await Subject.create([
      { name: "Mathematics", description: "Toán Đại Số & Hình Học cơ bản lớp 10" },
      { name: "Advanced Web Development", description: "Lập trình API Node.js và giao diện React" },
    ]);
    console.log(`Đã tạo môn học: ${math.name}, ${webDev.name}`);

    // 7. Tạo Phân công giảng dạy (TeachingAssignment)
    console.log("-> Đang tạo Phân công giảng dạy...");
    const assignment = await TeachingAssignment.create({
      teacherRef: teacher._id,
      classRef: class10A1._id,
      subjectRef: math._id,
    });
    console.log(`Đã phân công Giáo viên ${teacher.name} dạy môn ${math.name} cho lớp ${class10A1.name}`);

    // 8. Tạo Thời khóa biểu (Timetable)
    console.log("-> Đang tạo Thời khóa biểu...");
    const timetable = await Timetable.create({
      teachingAssignmentRef: assignment._id,
      dayOfWeek: 2, // Thứ Hai
      period: 1,   // Tiết 1
      classroom: "Phòng học 102",
    });
    console.log(`Đã thêm TKB: Thứ Hai - Tiết 1 - môn ${math.name} tại ${timetable.classroom}`);

    // 9. Ghi nhận Điểm danh mẫu (Attendance)
    console.log("-> Đang tạo Điểm danh mẫu...");
    const attendance = await Attendance.create({
      timetableRef: timetable._id,
      studentRef: student._id,
      date: new Date(),
      status: "present",
      note: "Đi học đúng giờ",
    });
    console.log(`Đã ghi nhận điểm danh: Học sinh ${student.name} có mặt ngày hôm nay.`);

    // 10. Tạo bài tập về nhà (Assignment)
    console.log("-> Đang tạo Bài tập về nhà...");
    const homework = await Assignment.create({
      teachingAssignmentRef: assignment._id,
      title: "Bài tập Phương trình bậc hai số 1",
      description: "Làm toàn bộ bài tập trong sách giáo khoa trang 45.",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Hạn nộp 7 ngày sau
    });
    console.log(`Đã giao bài tập: ${homework.title} (Hạn nộp: ${homework.dueDate.toLocaleDateString()})`);

    // 11. Ghi nhận bài nộp của học sinh (Submission)
    console.log("-> Đang tạo Bài nộp của học sinh...");
    const submission = await Submission.create({
      assignmentRef: homework._id,
      studentRef: student._id,
      fileUrl: "https://cloudinary.com/edulms/submissions/algebra_homework_HS1001.pdf",
      score: 9.0,
      feedback: "Bài làm rất tốt, trình bày rõ ràng, đạt điểm tối đa phần tự luận.",
    });
    console.log(`Học sinh ${student.name} đã nộp bài tập. Điểm chấm: ${submission.score}`);

    // 12. Tạo câu hỏi trắc nghiệm (Question) và bài thi trực tuyến (Exam)
    console.log("-> Đang tạo Ngân hàng câu hỏi & Đề kiểm tra...");
    const question = await Question.create({
      subjectRef: math._id,
      chapter: "Chương 1: Đại số đại cương",
      difficulty: "medium",
      content: "Tính biệt thức Delta (D) của phương trình bậc hai: 2x^2 + 5x - 3 = 0?",
      options: ["D = 49", "D = 13", "D = -9", "D = 25"],
      correctIndex: 0, // D = 25 - 4*2*(-3) = 49
    });

    const exam = await Exam.create({
      teachingAssignmentRef: assignment._id,
      title: "Kiểm tra 15 phút Đại số chương 1",
      duration: 15,
      questions: [question._id],
      weight: 1, // Hệ số 1
    });
    console.log(`Đã xuất bản đề thi trắc nghiệm trực tuyến: ${exam.title}`);

    // Tạo lượt làm bài (ExamAttempt)
    const attempt = await ExamAttempt.create({
      examRef: exam._id,
      studentRef: student._id,
      answers: [0], // Chọn đáp án đầu tiên (Đúng)
      score: 10.0,
    });
    console.log(`Học sinh ${student.name} hoàn thành bài kiểm tra trực tuyến. Kết quả: ${attempt.score}/10`);

    // 13. Ghi nhận điểm số chính thức vào Sổ điểm (GradeRecord)
    console.log("-> Đang ghi nhận Sổ điểm học sinh...");
    await GradeRecord.create([
      {
        studentRef: student._id,
        classRef: class10A1._id,
        subjectRef: math._id,
        examType: "mouth",
        score: 9.0,
        weight: 1,
      },
      {
        studentRef: student._id,
        classRef: class10A1._id,
        subjectRef: math._id,
        examType: "15min",
        score: 10.0, // Điểm từ bài thi trắc nghiệm
        weight: 1,
      },
      {
        studentRef: student._id,
        classRef: class10A1._id,
        subjectRef: math._id,
        examType: "1period",
        score: 8.5,
        weight: 2,
      },
      {
        studentRef: student._id,
        classRef: class10A1._id,
        subjectRef: math._id,
        examType: "final",
        score: 9.5,
        weight: 3,
      },
    ]);
    console.log("Đã lập Sổ điểm đầy đủ các cột (Miệng, 15 phút, 1 tiết, Học kỳ) cho học sinh.");

    // 14. Tạo thông báo hệ thống (Notification)
    console.log("-> Đang tạo thông báo mẫu...");
    const notification = await Notification.create({
      recipientRef: student._id,
      type: "grade",
      content: `Kết quả học tập môn ${math.name} của bạn đã được cập nhật đầy đủ các cột điểm.`,
      link: "/student/grades",
    });
    console.log(`Đã phát thông báo: "${notification.content}" đến tài khoản Học sinh.`);

    console.log("=== HOÀN TẤT SEED DỮ LIỆU HỆ THỐNG EDULMS THÀNH CÔNG ===");
  } catch (error) {
    console.error("❌ Xảy ra lỗi trong quá trình seed dữ liệu mẫu:");
    console.error(error);
  } finally {
    await mongoose.disconnect();
    console.log("-> Đã ngắt kết nối cơ sở dữ liệu MongoDB.");
  }
}

runSeed();
