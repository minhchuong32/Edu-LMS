import axiosClient from './axiosClient'

export const authApi = {
  /**
   * Xác thực thông tin Bước 1 (mã định danh & email) trước khi kích hoạt
   */
  verifyActivation: ({ userCode, email }) => {
    return axiosClient.post('/v1/auth/verify-activation', { userCode, email })
  },

  /**
   * Kích hoạt tài khoản bằng mã định danh (userCode), email và thiết lập mật khẩu mới (Bước 2)
   */
  activate: ({ userCode, email, password }) => {
    return axiosClient.post('/v1/auth/activate', { userCode, email, password })
  },

  /**
   * Đăng nhập hệ thống (nhận Access Token và HttpOnly Cookie Refresh Token)
   */
  login: (credentials) => {
    return axiosClient.post('/v1/auth/login', credentials)
  },

  /**
   * Lấy thông tin tài khoản hiện tại
   */
  getMe: () => {
    return axiosClient.get('/v1/auth/me')
  },

  /**
   * Đăng xuất, vô hiệu hóa Refresh Token và xóa cookie
   */
  logout: () => {
    return axiosClient.post('/v1/auth/logout')
  },

  /**
   * Làm mới Access Token và xoay vòng Refresh Token
   */
  refreshToken: (refreshToken) => {
    return axiosClient.post('/v1/auth/refresh', { refreshToken })
  },
}

export default authApi
