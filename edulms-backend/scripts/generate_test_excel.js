const path = require("path");
const xlsx = require("xlsx");

const outputPath = path.resolve(__dirname, "../../import_template_example.xlsx");

// Sample test data rows with various valid and invalid configurations
const data = [
  {
    "Họ và tên": "Le Van An",
    "Email": "an.student@edulms.edu",
    "Vai trò": "student",
    "Mã số": "HS-9001",
    "Lớp": "10A1"
  },
  {
    "Họ và tên": "",
    "Email": "empty.name@edulms.edu",
    "Vai trò": "student",
    "Mã số": "HS-9002",
    "Lớp": "10A1"
  },
  {
    "Họ và tên": "Tran Thi Binh",
    "Email": "binh@edulms.edu",
    "Vai trò": "invalid_role",
    "Mã số": "HS-9003",
    "Lớp": "10A1"
  },
  {
    "Họ và tên": "Nguyen Van Cuong",
    "Email": "",
    "Vai trò": "student",
    "Mã số": "HS-9004",
    "Lớp": "10A1"
  },
  {
    "Họ và tên": "Pham Van Dung",
    "Email": "dung_email_invalid",
    "Vai trò": "student",
    "Mã số": "HS-9005",
    "Lớp": "10A1"
  },
  {
    "Họ và tên": "Hoang Thi Em",
    "Email": "duplicate.sheet@edulms.edu",
    "Vai trò": "student",
    "Mã số": "HS-9006",
    "Lớp": "10A1"
  },
  {
    "Họ và tên": "Hoang Van Giang",
    "Email": "duplicate.sheet@edulms.edu",
    "Vai trò": "student",
    "Mã số": "HS-9007",
    "Lớp": "10A1"
  },
  {
    "Họ và tên": "Vu Van Hai",
    "Email": "student@edulms.edu",
    "Vai trò": "student",
    "Mã số": "HS-9008",
    "Lớp": "10A1"
  },
  {
    "Họ và tên": "Bui Thi Hoa",
    "Email": "hoa@edulms.edu",
    "Vai trò": "student",
    "Mã số": "",
    "Lớp": "10A1"
  },
  {
    "Họ và tên": "Ngo Van Hung",
    "Email": "hung@edulms.edu",
    "Vai trò": "student",
    "Mã số": "HS-9009",
    "Lớp": "10A1"
  },
  {
    "Họ và tên": "Do Van Khanh",
    "Email": "khanh@edulms.edu",
    "Vai trò": "student",
    "Mã số": "HS-9009",
    "Lớp": "10A1"
  },
  {
    "Họ và tên": "Dinh Van Lam",
    "Email": "lam@edulms.edu",
    "Vai trò": "student",
    "Mã số": "HS-1001",
    "Lớp": "10A1"
  },
  {
    "Họ và tên": "Phan Thi Mai",
    "Email": "mai@edulms.edu",
    "Vai trò": "student",
    "Mã số": "HS-9010",
    "Lớp": "10A2"
  },
  {
    "Họ và tên": "Truong Van Nam",
    "Email": "nam.teacher@edulms.edu",
    "Vai trò": "teacher",
    "Mã số": "GV-9001",
    "Lớp": ""
  },
  {
    "Họ và tên": "Vo Van Oanh",
    "Email": "oanh@edulms.edu",
    "Vai trò": "teacher",
    "Mã số": "",
    "Lớp": ""
  },
  {
    "Họ và tên": "Ngo Van Phat",
    "Email": "phat@edulms.edu",
    "Vai trò": "teacher",
    "Mã số": "GV-2002",
    "Lớp": ""
  },
  {
    "Họ và tên": "Le Van Quyet",
    "Email": "quyet@edulms.edu",
    "Vai trò": "admin",
    "Mã số": "AD-9001",
    "Lớp": ""
  },
  {
    "Họ và tên": "Hoang Thi Sen",
    "Email": "sen@edulms.edu",
    "Vai trò": "Học sinh",
    "Mã số": "HS-9011",
    "Lớp": "10A1"
  },
  {
    "Họ và tên": "",
    "Email": "invalid_email",
    "Vai trò": "student",
    "Mã số": "HS-9012",
    "Lớp": "10A1"
  },
  {
    "Họ và tên": "Dang Van Tuan",
    "Email": "tuan@edulms.edu",
    "Vai trò": "Giáo viên",
    "Mã số": "GV-9002",
    "Lớp": ""
  },
  {
    "Họ và tên": "Mai Thi Uyen",
    "Email": "uyen_invalid",
    "Vai trò": "student",
    "Mã số": "HS-9013",
    "Lớp": "12A3"
  }
];

const ws = xlsx.utils.json_to_sheet(data);
const wb = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(wb, ws, "Danh sách người dùng");

xlsx.writeFile(wb, outputPath);
console.log(`Successfully generated test excel template at ${outputPath}`);
