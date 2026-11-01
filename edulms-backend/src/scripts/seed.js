require("dotenv").config();
require("node:dns").setServers(["8.8.8.8", "1.1.1.1"]);
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User"); // sửa đường dẫn nếu khác

const SAMPLE_USERS = [
  { userCode: "AD001", email: "admin@edulms.test",    fullName: "Quản trị viên",   role: "admin",   className: null },
  { userCode: "GV001", email: "teacher1@edulms.test", fullName: "Giáo viên Toán",  role: "teacher", className: null },
  { userCode: "GV002", email: "teacher2@edulms.test", fullName: "Giáo viên Văn",   role: "teacher", className: null },
  { userCode: "HS001", email: "student1@edulms.test", fullName: "Học sinh 1",      role: "student", className: "10A1" },
  { userCode: "HS002", email: "student2@edulms.test", fullName: "Học sinh 2",      role: "student", className: "10A1" },
  { userCode: "HS003", email: "student3@edulms.test", fullName: "Học sinh 3",      role: "student", className: "11A1" },
  { userCode: "PH001", email: "parent1@edulms.test",  fullName: "Phụ huynh 1",     role: "parent",  className: null },
];

async function main() {
  const uri = process.env.MONGO_URI;
  const password = process.env.SEED_PASSWORD;

  if (!uri || !uri.includes("staging")) {
    console.error("Từ chối: MONGO_URI phải trỏ tới database có chữ 'staging'.");
    process.exit(1);
  }
  if (!password) {
    console.error("Thiếu biến SEED_PASSWORD.");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("Đã kết nối:", mongoose.connection.name);

  const hash = await bcrypt.hash(password, 10);

  for (const u of SAMPLE_USERS) {
    await User.updateOne(
      { email: u.email },
      { $set: { ...u, password: hash, mustChangePassword: false, isActivated: true } },
      { upsert: true, runValidators: true }
    );
    console.log(`OK  ${u.userCode}  ${u.email}`);
  }

  console.log("Seed xong:", await User.countDocuments(), "user trong DB.");
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});