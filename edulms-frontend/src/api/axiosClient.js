import axios from "axios";

//  (Middleman) cho mọi giao tiếp HTTP giữa Frontend và Backend, giúp ứng dụng
//  Tập trung cấu hình HTTP
//  Tự động đính kèm Access Token
//  Tự động gia hạn phiên làm việc
//  Tự động đăng xuất khi phiên làm việc hết hạn hoàn toàn
//   Làm sạch dữ liệu phản hồi

// URL Backend API
const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api/v1";

// Tạo Axios Instance dùng chung cho toàn bộ app
const axiosClient = axios.create({
  baseURL: API_URL,

  // Dữ liệu gửi lên Backend dạng JSON
  headers: {
    "Content-Type": "application/json",
  },

  // Cho phép gửi Cookie (Refresh Token)
  withCredentials: true,
});

// ======================================================
// REQUEST INTERCEPTOR
// Tự động thêm Access Token vào mỗi request
// ======================================================

axiosClient.interceptors.request.use(
  (config) => {
    // Lấy Access Token từ localStorage
    const token = localStorage.getItem("accessToken");

    if (token) {
      // Gửi Token cho Backend
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },

  (error) => Promise.reject(error)
);

// ======================================================
// RESPONSE INTERCEPTOR
// Xử lý response và tự động Refresh Token khi 401
// ======================================================

axiosClient.interceptors.response.use(
  // Request thành công → trả về data
  (response) => response.data,

  // Request thất bại
  async (error) => {
    const originalRequest = error.config;

    // Access Token hết hạn → Backend trả 401
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      // Đánh dấu đã retry để tránh vòng lặp vô hạn
      originalRequest._retry = true;

      try {
        // Gọi API Refresh Token bằng Axios gốc
        const response = await axios.post(
          `${API_URL}/auth/refresh`,
          {},
          {
            // Gửi Refresh Token Cookie
            withCredentials: true,
          }
        );

        // Lấy Access Token mới
        const token =
          response.data?.data?.accessToken ||
          response.data?.accessToken ||
          response.data?.data?.token ||
          response.data?.token;

        if (!token) {
          throw new Error("Không tìm thấy Access Token");
        }

        // Lưu Access Token mới
        localStorage.setItem("accessToken", token);

        // Gắn Token mới vào request cũ
        originalRequest.headers.Authorization =
          `Bearer ${token}`;

        // Gửi lại request ban đầu
        return axiosClient(originalRequest);

      } catch (refreshError) {
        // Refresh thất bại → đăng xuất
        localStorage.removeItem("accessToken");

        // Chuyển về trang đăng nhập
        window.location.href = "/login";

        return Promise.reject(refreshError);
      }
    }

    // Trả lỗi từ Backend
    return Promise.reject(
      error.response?.data || error.message
    );
  }
);

export default axiosClient;