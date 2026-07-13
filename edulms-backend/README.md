# EduLMS Backend - Máy chủ Quản lý Học tập Trường THPT

Dự án máy chủ backend cho hệ thống quản lý học tập **EduLMS**, được xây dựng trên nền tảng Node.js, Express và MongoDB (Mongoose) tuân thủ cấu trúc MVC.

---

## 🛠️ Công nghệ sử dụng
* **Core**: Node.js & Express.js
* **Cơ sở dữ liệu**: MongoDB & Mongoose ORM
* **Bảo mật**: JSON Web Tokens (JWT), bcryptjs, Helmet, Express Rate Limit
* **Đính kèm**: Multer, Cloudinary Storage
* **Giao tiếp**: Nodemailer (gửi email cảnh báo chuyên cần/học tập)

---

## 📁 Cấu trúc thư mục dự án
```bash
edulms-backend/
├── src/
│   ├── config/          # Cấu hình kết nối MongoDB, Cloudinary...
│   ├── models/          # Khai báo các Mongoose Schemas (Cơ sở dữ liệu)
│   ├── routes/          # Các endpoint định tuyến API
│   ├── controllers/     # Logic nghiệp vụ xử lý request/response (MVC)
│   ├── middlewares/     # Kiểm tra Token JWT, Phân quyền restrictTo...
│   ├── services/        # Logic tích hợp bên thứ ba (gửi mail, upload file)
│   ├── utils/           # Các hàm bổ trợ dùng chung
│   ├── app.js           # Khởi tạo Express app và mount Router
│   └── server.js        # Entry point khởi động Server lắng nghe cổng 5000
├── Dockerfile           # Docker image setup cho môi trường deploy/local
├── .env                 # File cấu hình biến môi trường (Local/Secret)
└── package.json         # Danh sách thư viện phụ thuộc
```

---

## 🗄️ Danh sách Database Schemas đã thiết lập
Hệ thống được thiết kế đặc thù cho mô hình THPT (không đăng ký tự do, học sinh thuộc lớp theo phân công):
1. **User**: Quản lý định danh học sinh, giáo viên, phụ huynh và admin. Hỗ trợ mã hóa mật khẩu bcrypt và mã hóa JWT.
2. **Grade & Class**: Quản lý Khối (10, 11, 12) và Lớp học (VD: 10A1) kèm Giáo viên chủ nhiệm.
3. **Subject**: Môn học phổ thông.
4. **TeachingAssignment**: Phân công giảng dạy môn học cụ thể cho lớp học cụ thể.
5. **Timetable & Attendance**: Thời khóa biểu theo tiết học và điểm danh chuyên cần theo buổi.
6. **Assignment & Submission**: Giao bài tập về nhà và quản lý bài nộp từ học sinh.
7. **Question, Exam & ExamAttempt**: Ngân hàng câu hỏi trắc nghiệm, đề thi trực tuyến và kết quả làm bài.
8. **GradeRecord**: Sổ điểm điện tử với hệ số môn học (miệng x1, 15p x1, 1 tiết x2, thi HK x3).
9. **Notification**: Thông báo hệ thống trong app.

---

## 🚀 Cài đặt & Sử dụng cục bộ

### Cách 1: Sử dụng Docker Compose (Khuyên dùng)
Tại thư mục gốc của dự án, khởi chạy lệnh sau để chạy tự động MongoDB và Backend:
```bash
docker compose up --build
```
* **Cơ sở dữ liệu MongoDB** chạy tại cổng: `27017` (Dữ liệu được lưu bền vững qua Docker named volume `mongodb_data`)
* **API Backend** chạy tại cổng: `5000`

### Cách 2: Chạy trực tiếp qua Node.js cục bộ
1. Cài đặt các thư viện:
   ```bash
   cd edulms-backend
   npm install
   ```
2. Cấu hình file `.env` trong thư mục `edulms-backend/`:
   ```env
   PORT=5000
   NODE_ENV=development
   MONGO_URI=mongodb://localhost:27017/edulms
   JWT_SECRET=your_jwt_secret_key_here
   ```
3. Khởi chạy máy chủ ở chế độ phát triển (hot-reload qua nodemon):
   ```bash
   npm run dev
   ```
4. Kiểm tra sức khỏe API: `GET http://localhost:5000/api/v1/auth/refresh`
