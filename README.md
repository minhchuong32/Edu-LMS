# 🎓 EduLMS – Hệ thống Quản lý Học tập

![CI](https://github.com/minhchuong32/Edu-LMS/actions/workflows/ci.yml/badge.svg?branch=dev)

![React](https://img.shields.io/badge/React-19.0-blue)
![Node.js](https://img.shields.io/badge/Node.js-Express-green)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-green)
![JWT](https://img.shields.io/badge/Auth-JWT-orange)
![TailwindCSS](https://img.shields.io/badge/Styling-TailwindCSS-38B2AC)
![License](https://img.shields.io/badge/License-MIT-success)

EduLMS là hệ thống quản lý học tập (LMS) hiện đại, được thiết kế dành cho các trường trung học phổ thông (THPT), nhằm số hóa công tác quản lý học vụ, giảng dạy, học tập, điểm danh, đánh giá kết quả học tập và kết nối giữa nhà trường, phụ huynh với học sinh trên một nền tảng thống nhất.

Ứng dụng sử dụng **kiến trúc Client–Server tách biệt**, trong đó giao diện người dùng (`edulms-frontend`) và máy chủ xử lý nghiệp vụ (`edulms-backend`) được triển khai thành các dịch vụ độc lập. Hệ thống cung cấp cơ chế xác thực an toàn, phân quyền truy cập theo vai trò (RBAC), thông báo theo thời gian thực, theo dõi hạnh kiểm và chuyên cần, nộp bài tập trực tuyến, tự động tính điểm trung bình cùng các công cụ quản trị toàn diện.

---

# ✨ Chức năng theo vai trò

## 👨‍💼 Quản trị viên

- **Quản lý cơ cấu học vụ**: Quản lý khối lớp (10, 11, 12), lớp học, môn học và năm học.
- **Quản lý người dùng và vai trò**: Tạo, cấp tài khoản cho giáo viên, học sinh và phụ huynh theo cơ chế phân quyền RBAC.
- **Phân công giáo viên chủ nhiệm**: Gán giáo viên chủ nhiệm (GVCN) cho từng lớp và quản lý danh sách học sinh.
- **Phân công giảng dạy**: Phân công giáo viên bộ môn phụ trách các lớp và học kỳ cụ thể.
- **Cấu hình hệ thống và bảng điều khiển**: Theo dõi các chỉ số tổng quan, số liệu thống kê và nhật ký hệ thống.

---

## 👨‍🏫 Giáo viên

- **Cổng thông tin môn học và lớp học**: Truy cập các lớp được phân công, tài liệu bài giảng và đề cương môn học.
- **Sổ điểm điện tử**: Nhập và tính điểm theo quy định hệ số: hệ số 1 đối với điểm miệng/15 phút, hệ số 2 đối với bài kiểm tra một tiết, hệ số 3 đối với bài thi học kỳ.
- **Quản lý điểm danh và hạnh kiểm**: Điểm danh theo từng tiết học (tiết 1–10), ghi nhận hạnh kiểm và điểm rèn luyện/kỷ luật của học sinh.
- **Quản lý bài tập và bài kiểm tra**: Tạo bài tập, nhận tệp PDF/tệp tải lên và chấm bài học sinh nộp.
- **Danh sách lớp và tiến độ học tập**: Theo dõi danh sách học sinh, hồ sơ học tập và tổng kết học kỳ.

---

## 👨‍🎓 Học sinh

- **Không gian học tập cá nhân**: Xem tổng quan các môn học, thời khóa biểu và kết quả học tập.
- **Nộp bài tập**: Xem bài tập cần hoàn thành, nộp tệp/ghi chú và kiểm tra nhận xét của giáo viên.
- **Bảng điểm cá nhân**: Theo dõi điểm trung bình, điểm từng môn và xếp hạng học kỳ theo thời gian thực.
- **Thời khóa biểu và tình trạng chuyên cần**: Xem lịch học hằng ngày (tiết 1–10) và lịch sử điểm danh.
- **Cổng thông tin giáo dục và hướng dẫn sử dụng**: Truy cập thông báo chính thức của ngành giáo dục, tin tức và tài liệu hướng dẫn sử dụng.

---

## 👨‍👩‍👧 Phụ huynh

- **Cổng thông tin phụ huynh**: Liên kết tài khoản phụ huynh với hồ sơ học sinh thông qua mã học sinh.
- **Theo dõi theo thời gian thực**: Theo dõi tình hình điểm danh hằng ngày, hạnh kiểm và kết quả kiểm tra của con.
- **Kết nối trực tiếp với nhà trường**: Nhận thông báo chính thức và thông tin từ giáo viên chủ nhiệm.

---

# 🚀 Các tính năng chính

- **Xác thực JWT và làm mới mã thông báo**: Sử dụng Access Token và Refresh Token để bảo vệ phiên đăng nhập.
- **Phân quyền truy cập theo vai trò (RBAC)**: Phân định quyền hạn rõ ràng giữa Quản trị viên, Giáo viên, Học sinh và Phụ huynh.
- **Sổ điểm THPT theo quy định**: Tự động tính điểm trung bình với các hệ số được áp dụng trong chương trình giáo dục Việt Nam.
- **Điểm danh và thời khóa biểu**: Theo dõi chuyên cần theo tiết học (tiết 1–10) và thời khóa biểu hằng tuần.
- **Quản lý danh sách lớp và chuyển lớp**: Quản lý danh sách học sinh và việc chuyển lớp thuận tiện.
- **Cổng thông tin giáo dục và tài liệu công khai**: Cung cấp cổng tin tức liên kết đến các bài viết giáo dục chính thức và tài liệu hướng dẫn dạng PDF.
- **Giao diện hiện đại, tương thích nhiều thiết bị**: Hỗ trợ giao diện sáng/tối, xây dựng bằng React 19, Tailwind CSS và biểu tượng Lucide React.
- **Nhập và xuất dữ liệu Excel**: Nhập/xuất hàng loạt danh sách học sinh và bảng điểm thông qua tệp XLSX.

---

# 🏗️ Kiến trúc hệ thống

```text
       React 19 + Vite + Tailwind CSS (edulms-frontend)
                            │
                            ▼
                     Axios HTTP Client
                            │
                            ▼
             Express.js REST API (edulms-backend)
                            │
      ┌─────────────────────┴─────────────────────┐
      │  • Xác thực JWT và Middleware             │
      │  • Bộ kiểm tra dữ liệu và Controllers     │
      │  • Multer + lưu trữ Cloudinary            │
      │  • Xử lý dữ liệu/Excel (XLSX)             │
      └─────────────────────┬─────────────────────┘
                            ▼
                Cơ sở dữ liệu MongoDB (Mongoose ODM)
```

---

# 🛠️ Công nghệ sử dụng

| Hạng mục                   | Công nghệ                            | Mô tả                                                                            |
| -------------------------- | ------------------------------------ | -------------------------------------------------------------------------------- |
| **Thư viện giao diện**     | React 19, Vite                       | Xây dựng ứng dụng SPA với khả năng cập nhật mô-đun nóng (HMR) nhanh              |
| **Giao diện và kiểu dáng** | Tailwind CSS, Lucide React           | Thiết kế hiện đại, tương thích nhiều kích thước màn hình và bộ biểu tượng vector |
| **Điều hướng và biểu mẫu** | React Router DOM v7, React Hook Form | Khai báo tuyến đường và xây dựng biểu mẫu có cấu trúc                            |
| **Nền tảng máy chủ**       | Node.js, Express 5                   | Máy chủ REST API hiệu năng cao                                                   |
| **Cơ sở dữ liệu**          | MongoDB, Mongoose ODM                | Cơ sở dữ liệu hướng tài liệu và mô hình hóa lược đồ                              |
| **Xác thực**               | JWT (`jsonwebtoken`), `bcryptjs`     | Băm mật khẩu an toàn và xác thực mã thông báo                                    |
| **Lưu trữ tệp**            | Multer, Cloudinary                   | Tải lên và lưu trữ hình ảnh, video, tài liệu                                     |
| **Nhập/xuất dữ liệu**      | SheetJS (XLSX)                       | Đọc, xử lý tệp Excel và tạo báo cáo                                              |
| **Giao tiếp HTTP**         | Axios                                | Xử lý yêu cầu API thông qua interceptor                                          |
| **Triển khai**             | Docker, Docker Compose               | Đóng gói và triển khai ứng dụng bằng container                                   |

---

# 📂 Cấu trúc dự án

```text
Edu-LMS
│
├── edulms-backend/               # Máy chủ Express REST API
│   ├── src/
│   │   ├── config/               # Cấu hình cơ sở dữ liệu và Cloudinary
│   │   ├── controllers/          # Bộ điều khiển xử lý nghiệp vụ
│   │   ├── middleware/           # Middleware xác thực, RBAC và xử lý lỗi
│   │   ├── models/               # Mongoose schema (User, Class, Grade, Subject, Gradebook...)
│   │   ├── routes/               # Khai báo các tuyến API
│   │   ├── services/             # Xử lý logic dịch vụ cốt lõi
│   │   └── server.js             # Điểm khởi chạy ứng dụng Express
│   ├── scripts/                  # Các tập lệnh khởi tạo dữ liệu
│   ├── package.json
│   └── .env.example
│
├── edulms-frontend/              # Ứng dụng giao diện React 19 + Vite
│   ├── src/
│   │   ├── components/           # Thành phần giao diện dùng chung (Header, Footer, Button, Modal...)
│   │   ├── context/              # React Context (AuthContext...)
│   │   ├── features/             # Các mô-đun chức năng (Admin, Teacher, Student, Auth...)
│   │   ├── pages/                # Trang công khai và trang cần đăng nhập (EduPortal, SystemGuide, Terms...)
│   │   ├── router/               # Bộ định tuyến và các thành phần bảo vệ tuyến
│   │   ├── services/             # Các dịch vụ gọi API bằng Axios
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   └── vite.config.js
│
├── docker-compose.yml            # Cấu hình điều phối các container bằng Docker
└── README.md                     # Tài liệu dự án
```

---

# 🔐 Xác thực và phân quyền

EduLMS triển khai cơ chế xác thực an toàn bằng JSON Web Token (JWT).

- **Xác thực bằng Access Token**: Mã thông báo có thời hạn ngắn, được gửi kèm trong tiêu đề `Authorization`.
- **Hỗ trợ Refresh Token**: Cơ chế làm mới mã thông báo để duy trì phiên đăng nhập an toàn.
- **Phân quyền truy cập theo vai trò**: Các API được bảo vệ và chỉ cho phép những vai trò phù hợp truy cập.
- **Axios Interceptors**: Tự động thêm mã thông báo vào yêu cầu và xử lý khi phiên đăng nhập hết hạn.

### Các vai trò người dùng được hỗ trợ

1. **Quản trị viên** (`admin`): Toàn quyền quản lý hệ thống và cấu hình học vụ.
2. **Giáo viên** (`teacher`): Quản lý giảng dạy bộ môn, điểm số, điểm danh và công tác chủ nhiệm.
3. **Học sinh** (`student`): Theo dõi môn học, nộp bài tập và xem điểm.
4. **Phụ huynh** (`parent`): Theo dõi tình hình học tập và trao đổi thông tin với nhà trường.

---

# 📚 Các mô-đun chính

## 1. Mô-đun người dùng và xác thực

- Đăng nhập, đăng ký và quản lý mật khẩu.
- Hồ sơ người dùng và tùy chỉnh ảnh đại diện.
- Quy trình kích hoạt tài khoản bằng mã học sinh.

## 2. Mô-đun cơ cấu học vụ và quản lý lớp

- Quản lý khối lớp 10, 11, 12 và cấu trúc lớp học.
- Phân công giáo viên chủ nhiệm (GVCN).
- Quản lý danh sách học sinh và chuyển lớp.

## 3. Mô-đun sổ điểm điện tử và đánh giá

- Tự động tính điểm trung bình.
- Quy tắc hệ số: hệ số 1 (điểm miệng/15 phút), hệ số 2 (bài kiểm tra một tiết), hệ số 3 (bài thi học kỳ).
- Đánh giá hạnh kiểm và tình hình chuyên cần của học sinh.

## 4. Mô-đun bài tập và tài liệu học tập

- Giáo viên tải lên bài giảng, tài liệu PDF và video.
- Tạo bài tập về nhà và theo dõi bài nộp.
- Chấm bài trực tuyến và gửi nhận xét cho học sinh.

## 5. Cổng thông tin giáo dục công khai và tài liệu hướng dẫn

- Thông báo chính thức từ cơ quan quản lý giáo dục.
- Liên kết trực tiếp đến các bài viết tin tức giáo dục đáng tin cậy.
- Tài liệu hướng dẫn sử dụng hệ thống có nội dung tương tác theo vai trò.
- Chính sách quyền riêng tư và điều khoản sử dụng dành cho môi trường triển khai thực tế.

---

# ⚙️ Cài đặt và thiết lập

## Yêu cầu môi trường

- **Node.js**: phiên bản `v18.0.0` trở lên.
- **MongoDB**: phiên bản `v6.0` trở lên (cài đặt trên máy hoặc sử dụng MongoDB Atlas).
- **npm**: phiên bản `v9.0` trở lên.

---

## 1. Sao chép kho mã nguồn

```bash
git clone https://github.com/minhchuong32/Edu-LMS.git
cd Edu-LMS
```

---

## 2. Thiết lập Backend

```bash
cd edulms-backend
npm install
```

Tạo tệp `.env` bên trong thư mục `edulms-backend`:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/edulms
JWT_SECRET=your_super_secret_jwt_key
JWT_REFRESH_SECRET=your_super_secret_refresh_key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Khởi tạo dữ liệu ban đầu cho cơ sở dữ liệu (không bắt buộc):

```bash
npm run seed
```

Khởi chạy máy chủ Backend ở chế độ phát triển:

```bash
npm run dev
```

Máy chủ API Backend sẽ chạy tại:

```text
http://localhost:5000
```

---

## 3. Thiết lập Frontend

```bash
cd ../edulms-frontend
npm install
```

Tạo tệp `.env` bên trong thư mục `edulms-frontend`:

```env
VITE_API_URL=http://localhost:5000/api
```

> **Lưu ý bảo mật:** Các biến `VITE_*` được nhúng vào bundle trong lúc build và có thể được đọc từ trình duyệt. Chỉ sử dụng chúng cho cấu hình công khai như URL API; không đặt mật khẩu, JWT secret, API key riêng tư hoặc bất kỳ secret nào trong frontend.

Khởi chạy máy chủ Frontend ở chế độ phát triển:

```bash
npm run dev
```

Ứng dụng Frontend sẽ chạy tại:

```text
http://localhost:5173
```

---

# 🌐 Môi trường Staging

Các URL staging hiện tại:

| Thành phần       | URL staging                                       |
| ---------------- | ------------------------------------------------- |
| **Frontend**     | `https://edu-lms-n34z.vercel.app/`                |
| **Backend API**  | `https://edulms-backend-709y.onrender.com/api/v1` |
| **Health check** | `https://edulms-backend-709y.onrender.com/health` |


## Quy trình deploy
1. Tạo nhánh từ `dev`, làm việc, mở PR vào `dev`.
2. Chờ CI xanh rồi merge.
3. Render và Vercel tự deploy lên staging sau vài phút.
4. Không push trực tiếp vào `dev` hoặc `main`.

## Seed dữ liệu staging (env example)

# 🐳 Triển khai bằng Docker

Có thể triển khai toàn bộ hệ thống (Frontend, Backend và MongoDB) bằng Docker Compose:

```bash
docker compose up --build -d
```

### Thông tin các dịch vụ

| Dịch vụ           | Tên container     | URL / Cổng            |
| ----------------- | ----------------- | --------------------- |
| **Frontend**      | `edulms-frontend` | http://localhost:5173 |
| **Backend API**   | `edulms-backend`  | http://localhost:5000 |
| **Cơ sở dữ liệu** | `mongodb`         | localhost:27017       |


# 📈 Định hướng phát triển trong tương lai

- 📱 Tích hợp ứng dụng di động bằng React Native.
- 🤖 Hỗ trợ chấm bài tự luận bằng AI và phân tích kết quả học tập của học sinh.
- 📹 Tích hợp lớp học trực tuyến và hội nghị truyền hình.
- 🔔 Gửi thông báo đẩy thông qua Firebase Cloud Messaging (FCM).
- 📊 Bổ sung tính năng xuất báo cáo PDF và Excel nâng cao dành cho ban giám hiệu.

---

# 👨‍💻 Tác giả

**Phạm Hàn Minh Chương**
**Nguyễn Nhựt Hào**

- **GitHub**: [minhchuong32](https://github.com/minhchuong32)
- **Email**: chuongminh3225@gmail.com

---

# 📄 Giấy phép

Dự án được phát triển phục vụ mục đích giáo dục và nghiên cứu theo **giấy phép MIT**.
