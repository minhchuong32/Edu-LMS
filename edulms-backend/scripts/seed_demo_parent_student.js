require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../src/models/User");
const Class = require("../src/models/Class");
const ApiError = require("../src/utils/ApiError");

const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/edulms";

const seedDemoParentStudent = async () => {
  try {
    console.log("-> Đang kết nối tới MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("✓ Kết nối MongoDB thành công.");

    // 1. Tìm hoặc lấy lớp học 10A1 mặc định
    let targetClass = await Class.findOne({ name: "10A1" });
    if (!targetClass) {
      targetClass = await Class.create({
        name: "10A1",
        schoolYear: "2025-2026",
      });
      console.log("✓ Đã khởi tạo Lớp 10A1.");
    }

    // 2. Tạo/Cập nhật Học sinh 1 (Lê Hoàng Nam - HS-1001)
    let student1 = await User.findOne({ email: "student@edulms.edu" });
    if (student1) {
      student1.name = "Lê Hoàng Nam";
      student1.role = "student";
      student1.studentCode = "HS-1001";
      student1.isActivated = true;
      student1.classRef = targetClass._id;
      await student1.save();
    } else {
      student1 = await User.create({
        name: "Lê Hoàng Nam",
        email: "student@edulms.edu",
        password: "studentpassword",
        role: "student",
        studentCode: "HS-1001",
        isActivated: true,
        classRef: targetClass._id,
      });
    }

    // 3. Tạo/Cập nhật Học sinh 2 (Lê Minh Anh - HS-1002)
    let student2 = await User.findOne({ email: "student2@edulms.edu" });
    if (student2) {
      student2.name = "Lê Minh Anh";
      student2.role = "student";
      student2.studentCode = "HS-1002";
      student2.isActivated = true;
      student2.classRef = targetClass._id;
      await student2.save();
    } else {
      student2 = await User.create({
        name: "Lê Minh Anh",
        email: "student2@edulms.edu",
        password: "studentpassword",
        role: "student",
        studentCode: "HS-1002",
        isActivated: true,
        classRef: targetClass._id,
      });
    }

    // 4. Tạo/Cập nhật Phụ huynh (Lê Định Hùng - parent@edulms.edu)
    let parent = await User.findOne({ email: "parent@edulms.edu" });
    if (parent) {
      parent.name = "Lê Định Hùng";
      parent.role = "parent";
      parent.relationship = "father";
      parent.childrenRefs = [student1._id, student2._id];
      parent.isActivated = true;
      await parent.save();
    } else {
      parent = await User.create({
        name: "Lê Định Hùng",
        email: "parent@edulms.edu",
        password: "parentpassword",
        role: "parent",
        relationship: "father",
        childrenRefs: [student1._id, student2._id],
        isActivated: true,
      });
    }

    console.log("\n==========================================");
    console.log("🎉 KHỞI TẠO TÀI KHOẢN DEMO PHỤ HUYNH - HỌC SINH THÀNH CÔNG");
    console.log("==========================================");
    console.log("👨‍👦 TÀI KHOẢN PHỤ HUYNH:");
    console.log(` - Email: ${parent.email}`);
    console.log(` - Mật khẩu: parentpassword`);
    console.log(` - Họ tên: ${parent.name}`);
    console.log(` - Vai trò quan hệ: Cha (Father)`);
    console.log(` - Các con liên kết: ${student1.name} (${student1.studentCode}), ${student2.name} (${student2.studentCode})`);
    console.log("\n🎓 TÀI KHOẢN HỌC SINH 1:");
    console.log(` - Email: ${student1.email}`);
    console.log(` - Mật khẩu: studentpassword`);
    console.log(` - Mã số học sinh: ${student1.studentCode}`);
    console.log(` - Trạng thái: Đang học (Lớp 10A1)`);
    console.log("\n🎓 TÀI KHOẢN HỌC SINH 2:");
    console.log(` - Email: ${student2.email}`);
    console.log(` - Mật khẩu: studentpassword`);
    console.log(` - Mã số học sinh: ${student2.studentCode}`);
    console.log(` - Trạng thái: Đang học (Lớp 10A1)`);
    console.log("==========================================\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Lỗi khi khởi tạo tài khoản demo:", error);
    process.exit(1);
  }
};

seedDemoParentStudent();
