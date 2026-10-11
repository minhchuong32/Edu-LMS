import axiosClient from './axiosClient'

export const authApi = {
  login: (credentials) => {
    return axiosClient.post('/auth/login', credentials)
  },
  register: (userData) => {
    return axiosClient.post('/auth/register', userData)
  },
  getMe: () => {
    return axiosClient.get('/auth/me')
  },
  logout: () => {
    return axiosClient.post('/auth/logout')
  },
  refreshToken: (refreshToken) => {
    return axiosClient.post('/auth/refresh-token', { refreshToken })
  },
}

export default authApi
