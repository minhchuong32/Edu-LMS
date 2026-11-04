const ExcelJS = require("exceljs");
const path = require("path");

async function generateSampleFiles() {
  const outputDir = path.resolve(__dirname, "../../../");

  // 1. File mẫu Học sinh
  const wbStudent = new ExcelJS.Workbook();
  wbStudent.creator = "Edu-LMS";
  const wsStudent = wbStudent.addWorksheet("Danh sách học sinh");

  wsStudent.columns = [
    { header: "Họ và Tên", key: "fullName", width: 26 },
    { header: "Mã Học Sinh", key: "userCode", width: 18 },
    { header: "Email", key: "email", width: 30 },
    { header: "Lớp", key: "className", width: 16 },
  ];

  const studentData = [
    { fullName: "Nguyễn Hoàng Nam", userCode: "HS101", email: "hoangnam@example.com", className: "10A1" },
    { fullName: "Trần Mai Phương", userCode: "HS102", email: "maiphuong@example.com", className: "10A1" },
    { fullName: "Lê Quốc Bảo", userCode: "HS103", email: "quocbao@example.com", className: "10A2" },
    { fullName: "Phạm Thùy Linh", userCode: "HS104", email: "thuylinh@example.com", className: "10A2" },
    { fullName: "Đặng Minh Quân", userCode: "HS105", email: "minhquan@example.com", className: "11A1" },
  ];

  studentData.forEach((row) => wsStudent.addRow(row));

  // Style header
  const studentHeader = wsStudent.getRow(1);
  studentHeader.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  studentHeader.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2563EB" }, // Primary blue
  };
  studentHeader.alignment = { vertical: "middle", horizontal: "center" };
  studentHeader.height = 24;

  const studentPath = path.join(outputDir, "mau_import_hoc_sinh.xlsx");
  await wbStudent.xlsx.writeFile(studentPath);
  console.log("Đã tạo file mẫu học sinh:", studentPath);

  // 2. File mẫu Giáo viên
  const wbTeacher = new ExcelJS.Workbook();
  wbTeacher.creator = "Edu-LMS";
  const wsTeacher = wbTeacher.addWorksheet("Danh sách giáo viên");

  wsTeacher.columns = [
    { header: "Họ và Tên", key: "fullName", width: 26 },
    { header: "Mã Giáo Viên", key: "userCode", width: 18 },
    { header: "Email", key: "email", width: 30 },
  ];

  const teacherData = [
    { fullName: "Nguyễn Tiến Đạt", userCode: "GV101", email: "tiendat.teacher@example.com" },
    { fullName: "Trần Hồng Hạnh", userCode: "GV102", email: "honghanh.teacher@example.com" },
    { fullName: "Võ Minh Khang", userCode: "GV103", email: "minhkhang.teacher@example.com" },
  ];

  teacherData.forEach((row) => wsTeacher.addRow(row));

  // Style header
  const teacherHeader = wsTeacher.getRow(1);
  teacherHeader.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  teacherHeader.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF059669" }, // Emerald green
  };
  teacherHeader.alignment = { vertical: "middle", horizontal: "center" };
  teacherHeader.height = 24;

  const teacherPath = path.join(outputDir, "mau_import_giao_vien.xlsx");
  await wbTeacher.xlsx.writeFile(teacherPath);
  console.log("Đã tạo file mẫu giáo viên:", teacherPath);
}

generateSampleFiles().catch(console.error);
