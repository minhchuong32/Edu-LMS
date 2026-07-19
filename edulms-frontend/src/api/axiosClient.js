import axios from "axios";

// Khởi tạo Axios Instance
const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Quan trọng để gửi/nhận cookie (Refresh Token)
});

// Request Interceptor (Gắn Bearer Token)
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor (Đánh chặn 401 & Tự động Refresh)
axiosClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;
    // Nếu lỗi là 401 (Unauthorized) và request này chưa từng được thử lại (_retry)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // Đánh dấu đã thử lại để tránh lặp vô hạn
      try {
        // Sử dụng instance axios gốc để tránh gọi đè vào interceptor của axiosClient
        const response = await axios.post(
          `${import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1"}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        
        // Trích xuất accessToken mới từ cấu trúc ApiResponse của backend
        const token = response.data?.data?.token || response.data?.token;
        localStorage.setItem("accessToken", token);
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return axiosClient(originalRequest); // Gửi lại request ban đầu với token mới
      } catch (refreshError) {
        // Khi Refresh Token hết hạn hoặc không hợp lệ -> Đăng xuất người dùng
        localStorage.removeItem("accessToken");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error.response?.data || error.message);
  }
);

export default axiosClient;
