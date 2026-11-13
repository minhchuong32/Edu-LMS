import { useState, useEffect, useCallback, useRef } from 'react'
import AuthContext from './authContext.js'
import authApi from '@/api/authApi'
import { clearAllAuthStorage } from '@/utils/storage'

export const AuthProvider = ({ children }) => {
  // Không khởi tạo trực tiếp user từ localStorage khi chưa xác thực token với server
  // để tránh hiện tượng mở local vẫn hiển thị tài khoản cũ đã đăng nhập trước đó.
  const [user, setUser] = useState(null)

  // Khởi tạo Access Token từ localStorage nếu có
  const [token, setToken] = useState(
    () => localStorage.getItem('token') || null,
  )
  const [loading, setLoading] = useState(true)
  const initializedRef = useRef(false)

  /**
   * Xóa sạch toàn bộ state xác thực và bộ nhớ trình duyệt
   */
  const resetAuthState = useCallback(() => {
    setUser(null)
    setToken(null)
    clearAllAuthStorage()
  }, [])

  /**
   * Đăng xuất: xóa ngay toàn bộ bộ nhớ (localStorage, sessionStorage, cookies, caches),
   * reset state và gọi API vô hiệu hóa Refresh Token trong CSDL.
   */
  const logout = useCallback(async () => {
    try {
      const logoutPromise = authApi.logout()
      resetAuthState()
      await logoutPromise
    } catch (err) {
      console.warn('Logout API error:', err)
    } finally {
      resetAuthState()
    }
  }, [resetAuthState])

  // Khôi phục phiên đăng nhập khi load lại trang
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    let active = true

    const initAuth = async () => {
      const storedToken = localStorage.getItem('token')
      // Không có token -> xóa sạch dữ liệu cũ còn sót lại và kết thúc
      if (!storedToken) {
        clearAllAuthStorage()
        if (active) {
          setUser(null)
          setToken(null)
          setLoading(false)
        }
        return
      }

      try {
        const res = await authApi.getMe()
        const currentUser = res?.data?.user || res?.user

        if (active && currentUser) {
          setUser(currentUser)
          setToken(storedToken)
          localStorage.setItem('user', JSON.stringify(currentUser))
        } else if (active) {
          resetAuthState()
        }
      } catch (error) {
        console.error('Failed to restore session:', error)
        // Xóa toàn bộ bộ nhớ ngay lập tức khi token không còn hợp lệ
        if (active) {
          resetAuthState()
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void initAuth()

    return () => {
      active = false
    }
  }, [resetAuthState])

  // Lắng nghe sự kiện 'auth:logout' từ Axios Interceptor và sự kiện 'storage' đa tab
  useEffect(() => {
    const handleAxiosAutoLogout = () => {
      resetAuthState()
    }

    const handleStorageChange = (event) => {
      if (event.key === null || (event.key === 'token' && !event.newValue)) {
        setUser(null)
        setToken(null)
      }
    }

    window.addEventListener('auth:logout', handleAxiosAutoLogout)
    window.addEventListener('storage', handleStorageChange)
    return () => {
      window.removeEventListener('auth:logout', handleAxiosAutoLogout)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [resetAuthState])

  /**
   * Đăng nhập: Dọn sạch bộ nhớ cũ trước khi lưu thông tin người dùng và token mới
   */
  const login = async (credentials) => {
    setLoading(true)

    try {
      clearAllAuthStorage()
      const res = await authApi.login(credentials)
      const data = res.data || res
      const userData = data.user
      const jwtToken = data.accessToken || data.token

      setUser(userData)
      setToken(jwtToken)

      if (jwtToken) {
        localStorage.setItem('token', jwtToken)
      }
      if (userData) {
        localStorage.setItem('user', JSON.stringify(userData))
      }

      return res
    } finally {
      setLoading(false)
    }
  }

  /**
   * Cập nhật thông tin người dùng trong state & localStorage
   */
  const updateUser = (updatedUserData) => {
    setUser((prev) => {
      const nextUser = { ...prev, ...updatedUserData }
      localStorage.setItem('user', JSON.stringify(nextUser))
      return nextUser
    })
  }

  const value = {
    user,
    token,
    loading,
    isAuthenticated: Boolean(!loading && user && token),
    login,
    logout,
    updateUser,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthContext
