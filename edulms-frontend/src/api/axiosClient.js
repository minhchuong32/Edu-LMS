import axios from "axios";

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Crucial for receiving httpOnly refresh tokens in cookies
});

// Request Interceptor: Attach bearer tokens to outgoing API requests
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

// Response Interceptor: Capture authentication failures and handle tokens rotation
axiosClient.interceptors.response.use(
  (response) => {
    return response.data; // Return data block directly for clean controllers usage
  },
  async (error) => {
    const originalRequest = error.config;

    // Trigger Token Rotation if request fails with 401 (Unauthorized) and has not been retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        // Attempt rotation via the refresh API endpoint
        const response = await axios.post(
          `${import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1"}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        const { token } = response.data;

        localStorage.setItem("accessToken", token);
        originalRequest.headers.Authorization = `Bearer ${token}`;

        return axiosClient(originalRequest); // Retry original request with new token
      } catch (refreshError) {
        // Refresh token expired or invalid; clear credentials and redirect to login
        localStorage.removeItem("accessToken");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error.response?.data || error.message);
  }
);

export default axiosClient;
