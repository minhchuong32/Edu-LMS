const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const mongoose = require("mongoose");
const Course = require("../src/models/Course");
const User = require("../src/models/User");
const Subject = require("../src/models/Subject");
const Grade = require("../src/models/Grade");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/edulms";

const coursesData = [
  {
    code: "AUTO-01",
    title: "Thiet ke O to_ Nhom 01_Vua hoc vua lam",
    description: "Khóa học thực hành chuyên sâu về kỹ thuật ô tô, thiết kế hệ thống truyền động và cơ khí ứng dụng. Kết hợp giảng dạy lý thuyết và làm việc trực tiếp tại xưởng.",
    teacherName: "Dang Quy",
    gradeLabel: "Chuyên ngành",
    gradeCode: "vocational",
    category: "Kỹ thuật Ô tô",
    students: 38,
    lessons: 48,
    status: "Vừa học vừa làm",
    badge: "Nhóm 01",
    image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=600&q=80",
    isPublished: true,
  },
  {
    code: "MATH-12",
    title: "Toán Học Nâng Cao 12 & Luyện Thi THPTQG",
    description: "Tổng ôn toàn bộ kiến thức Toán 12, Giải tích và Hình học không gian nâng cao chuẩn bị cho kỳ thi THPT Quốc Gia.",
    teacherName: "ThS. Nguyễn Văn Bình",
    gradeLabel: "Khối 12",
    gradeCode: "k12",
    category: "Toán Học",
    students: 142,
    lessons: 64,
    status: "Đang mở lớp",
    badge: "Luyện thi THPTQG",
    image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=600&q=80",
    isPublished: true,
  },
  {
    code: "PHYS-11",
    title: "Vật Lý 11 - Điện Tích & Dòng Điện Không Đổi",
    description: "Trang bị phương pháp giải toán điện học, định luật Ohm toàn mạch và các thí nghiệm vật lý tương tác.",
    teacherName: "Cô Lê Thị Mai",
    gradeLabel: "Khối 11",
    gradeCode: "k11",
    category: "Vật Lý",
    students: 98,
    lessons: 42,
    status: "Đang mở lớp",
    badge: "Chuẩn Bộ GD",
    image: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=600&q=80",
    isPublished: true,
  },
  {
    code: "CHEM-10",
    title: "Hóa Học 10 - Cấu Tạo Nguyên Tử & Liên Kết Hóa Học",
    description: "Nền tảng Hóa học THPT về cấu trúc vỏ electron nguyên tử, bảng tuần hoàn và các phản ứng hóa học cơ bản.",
    teacherName: "ThS. Trần Hoàng Nam",
    gradeLabel: "Khối 10",
    gradeCode: "k10",
    category: "Hóa Học",
    students: 115,
    lessons: 38,
    status: "Đang mở lớp",
    badge: "Nền tảng 10",
    image: "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=600&q=80",
    isPublished: true,
  },
  {
    code: "IT-WEB",
    title: "Lập Trình Web Fullstack & Ứng Dụng AI Số",
    description: "Xây dựng ứng dụng web hiện đại với React, Node.js, Express, MongoDB và tích hợp các mô hình AI tiên tiến.",
    teacherName: "Dang Quy",
    gradeLabel: "Chuyên ngành",
    gradeCode: "vocational",
    category: "Công Nghệ Thông Tin",
    students: 76,
    lessons: 56,
    status: "Vừa học vừa làm",
    badge: "Thực hành 100%",
    image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80",
    isPublished: true,
  },
  {
    code: "ENG-IELTS",
    title: "Tiếng Anh Giao Tiếp & Luyện Thi IELTS 6.5+",
    description: "Khóa học nâng cao phản xạ tiếng Anh, phát âm chuẩn và kỹ năng làm bài thi IELTS cho học sinh THPT.",
    teacherName: "Ms. Sarah Jenkins",
    gradeLabel: "Khối 11",
    gradeCode: "k11",
    category: "Ngoại Ngữ",
    students: 130,
    lessons: 48,
    status: "Đang mở lớp",
    badge: "Chuẩn Quốc Tế",
    image: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=600&q=80",
    isPublished: true,
  },
];

async function seedCourses() {
  console.log("==========================================");
  console.log("  SEEDING COURSES INTO EDULMS DATABASE    ");
  console.log("==========================================");

  try {
    // 1. Kết nối MongoDB
    console.log(`-> Kết nối cơ sở dữ liệu MongoDB tại: ${MONGO_URI}`);
    await mongoose.connect(MONGO_URI);
    console.log("✓ Kết nối MongoDB thành công.");

    // 2. Tìm hoặc tạo Giáo viên Dang Quy
    let teacherDangQuy = await User.findOne({ email: "dangquy@edulms.edu" });
    if (!teacherDangQuy) {
      teacherDangQuy = new User({
        name: "Dang Quy",
        email: "dangquy@edulms.edu",
        password: "teacherpassword123",
        role: "teacher",
        teacherCode: "GV-8888",
        isActivated: true,
      });
      await teacherDangQuy.save();
      console.log(`✓ Đã tạo tài khoản giáo viên: ${teacherDangQuy.name} (${teacherDangQuy.email})`);
    } else {
      console.log(`✓ Tìm thấy tài khoản giáo viên: ${teacherDangQuy.name}`);
    }

    // 3. Seed/Upsert danh sách khóa học
    console.log("\n-> Đang chèn/cập nhật danh sách khóa học...");
    for (const courseItem of coursesData) {
      const teacherRef = courseItem.teacherName === "Dang Quy" ? teacherDangQuy._id : null;

      const updatedCourse = await Course.findOneAndUpdate(
        { code: courseItem.code },
        { ...courseItem, teacherRef },
        { upsert: true, new: true, runValidators: true }
      );

      console.log(` + [${updatedCourse.code}] ${updatedCourse.title} (GV: ${updatedCourse.teacherName}) - ${updatedCourse.gradeLabel}`);
    }

    // 4. Đảm bảo các Môn học (Subjects) liên quan tồn tại trong DB
    console.log("\n-> Đang cập nhật danh mục Môn học (Subjects)...");
    const subjectsToEnsure = [
      { name: "Thiết kế Ô tô", description: "Môn chuyên ngành Kỹ thuật Ô tô vừa học vừa làm" },
      { name: "Mathematics 12", description: "Toán học nâng cao & Luyện thi THPTQG" },
      { name: "Physics 11", description: "Vật lý 11 - Điện tích và dòng điện" },
      { name: "Chemistry 10", description: "Hóa học 10 - Cấu tạo nguyên tử" },
      { name: "Fullstack Web & AI", description: "Lập trình Web và ứng dụng Trí tuệ nhân tạo" },
      { name: "English IELTS", description: "Tiếng Anh chuẩn quốc tế IELTS" },
    ];

    for (const subj of subjectsToEnsure) {
      await Subject.findOneAndUpdate(
        { name: subj.name },
        { description: subj.description },
        { upsert: true, new: true }
      );
    }
    console.log("✓ Danh mục Môn học đã được đồng bộ vào database.");

    console.log("\n==========================================");
    console.log("✓ HOÀN TẤT SEED CÁC KHÓA HỌC THÀNH CÔNG!");
    console.log("==========================================");
  } catch (error) {
    console.error("❌ Xảy ra lỗi trong quá trình seed khóa học:", error);
  } finally {
    await mongoose.disconnect();
    console.log("-> Đã đóng kết nối MongoDB.");
  }
}

seedCourses();
