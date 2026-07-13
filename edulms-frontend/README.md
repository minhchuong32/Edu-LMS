# EduLMS Frontend - Giao diện Quản lý Học tập Trường THPT

Dự án giao diện client-side cho hệ thống quản lý học tập **EduLMS**, được phát triển bằng React, Vite, TailwindCSS, React Router v6 và Axios.

---

## 🎨 Cấu hình Design System
Giao diện áp dụng các tiêu chuẩn thiết kế trực quan hiện đại:
* **Màu sắc**:
  * **Primary (Indigo)**: `#4F46E5` (Active/CTA) / Hover: `#4338CA` / Light Active: `#EEF2FF`
  * **Success (Emerald)**: `#10B981` (Hoàn thành, có mặt)
  * **Warning (Amber)**: `#F59E0B` (Trễ hạn, có phép)
  * **Danger (Rose)**: `#F43F5E` (Vắng không phép, sai số)
  * **Neutrals**: Nền trang `#F9FAFB`, Viền `#E5E7EB`, Chữ phụ `#4B5563`, Chữ tiêu đề `#111827`.
* **Bo góc (Rounded corners)**:
  * Thẻ hiển thị (Card): `12px` (`rounded-xl`)
  * Nút bấm, Ô nhập liệu, Nhãn (Button/Input/Badge): `8px` (`rounded-lg`)
* **Kiểu chữ (Font family)**:
  * Google Fonts **Inter** và **Outfit** cho các tiêu đề sang trọng.
* **Vai trò Badge (Role Badges)**:
  * **Student**: Xanh dương nhạt.
  * **Teacher**: Tím nhạt.
  * **Admin**: Cam nhạt.
  * **Parent**: Xanh lá nhạt.

---

## 📁 Cấu trúc thư mục dự án
```bash
edulms-frontend/
├── src/
│   ├── api/             # Khởi tạo Axios instance (axiosClient) & Interceptors
│   ├── components/
│   │   └── common/      # Các UI component tái sử dụng (Button, Card, Input, Badge)
│   ├── context/         # AuthContext quản lý session, login/logout, JWT tokens
│   ├── features/
│   │   ├── auth/        # Màn hình Đăng nhập (Login) & Kích hoạt (Activate)
│   │   └── dashboard/   # Bảng điều khiển Switcher và các widget con
│   ├── layouts/         # Các layouts Admin, Teacher, Student, Parent có Sidebar 260px và Mobile Drawer
│   ├── routes/          # Cấu hình AppRouter và Route Guards (PrivateRoute, RoleRoute)
│   ├── index.css        # Import directives của TailwindCSS
│   ├── main.jsx         # Điểm gắn thẻ Root React
│   └── App.jsx          # Wrap AuthProvider và AppRouter
├── tailwind.config.js   # Khai báo màu sắc, font chữ design system
└── index.html           # Khai báo meta, viewport và import Google Fonts
```

---

## 🚀 Cài đặt & Sử dụng cục bộ

1. Cài đặt các thư viện:
   ```bash
   cd edulms-frontend
   npm install
   ```
2. Cấu hình file `.env` trong thư mục `edulms-frontend/`:
   ```env
   VITE_API_URL=http://localhost:5000/api/v1
   ```
3. Khởi chạy máy chủ phát triển cục bộ:
   ```bash
   npm run dev
   ```
   * Ứng dụng sẽ khả dụng tại địa chỉ: `http://localhost:5173`

4. Biên dịch gói Production:
   ```bash
   npm run build
   ```
