import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

/**
 * Axios Instance dùng chung cho toàn bộ hệ thống Edu-LMS
 */
const axiosClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Gửi và nhận HttpOnly Cookie (Refresh Token) qua các domain/port
  timeout: 15000,
})

// Request Interceptor: Tự động đính kèm Access Token vào Header Authorization
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

// Response Interceptor: Tự động refresh Access Token khi gặp lỗi 401 Unauthorized
axiosClient.interceptors.response.use(
  (response) => {
    return response.data
  },
  async (error) => {
    const originalRequest = error.config

    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      // Bỏ qua nếu lỗi đến từ các endpoint auth cơ bản để tránh vòng lặp vô hạn
      if (
        originalRequest.url?.includes('/auth/login') ||
        originalRequest.url?.includes('/auth/activate') ||
        originalRequest.url?.includes('/auth/verify-activation') ||
        originalRequest.url?.includes('/auth/refresh') ||
        originalRequest.url?.includes('/auth/logout')
      ) {
        return Promise.reject(error.response?.data || error.message || 'Có lỗi xảy ra!')
      }

      // Nếu đang có request khác thực hiện refresh token, xếp request này vào hàng đợi
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return axiosClient(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const refreshEndpoint = baseURL.endsWith('/v1')
          ? `${baseURL}/auth/refresh`
          : `${baseURL}/v1/auth/refresh`

        // Gọi API Refresh Token (trình duyệt tự gửi HttpOnly Cookie)
        const res = await axios.post(
          refreshEndpoint,
          {},
          { withCredentials: true }
        )

        const newToken = res.data?.data?.accessToken || res.data?.accessToken
        if (newToken) {
          localStorage.setItem('token', newToken)
          axiosClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          processQueue(null, newToken)
          return axiosClient(originalRequest)
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null)
        localStorage.removeItem('token')
        localStorage.removeItem('user')

        // Phát sự kiện đăng xuất toàn ứng dụng tới AuthContext
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:logout'))
        }

        return Promise.reject(refreshErr.response?.data || refreshErr)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error.response?.data || error.message || 'Có lỗi xảy ra!')
  }
)

export default axiosClient
