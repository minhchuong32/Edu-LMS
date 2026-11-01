import { useState, useEffect, useCallback, useRef } from 'react'
import AuthContext from './authContext.js'
import authApi from '@/api/authApi'

export const AuthProvider = ({ children }) => {
  // Khởi tạo thông tin user từ localStorage nếu có
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user')
      return savedUser ? JSON.parse(savedUser) : null
    } catch {
      localStorage.removeItem('user')
      return null
    }
  })

  // Khởi tạo Access Token từ localStorage nếu có
  const [token, setToken] = useState(
    () => localStorage.getItem('token') || null,
  )
  const [loading, setLoading] = useState(true)
  const initializedRef = useRef(false)

  /**
   * Đăng xuất: gọi API vô hiệu hóa Refresh Token trong CSDL, xóa cookie và reset state
   */
  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch (err) {
      console.warn('Logout API error:', err)
    } finally {
      setUser(null)
      setToken(null)
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
  }, [])

  // Khôi phục phiên đăng nhập khi load lại trang
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    let active = true

    const initAuth = async () => {
      const storedToken = localStorage.getItem('token')
      // Không có token -> không cần khôi phục session
      if (!storedToken) {
        if (active) setLoading(false)
        return
      }

      try {
        const res = await authApi.getMe()
        const currentUser = res.data?.user || res.user

        if (active && currentUser) {
          setUser(currentUser)
          localStorage.setItem('user', JSON.stringify(currentUser))
        }
      } catch (error) {
        console.error('Failed to restore session:', error)

        if (active) {
          logout()
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
  }, [logout])

  // Lắng nghe sự kiện 'auth:logout' phát ra từ Axios Interceptor khi Refresh Token không còn hợp lệ
  useEffect(() => {
    const handleAxiosAutoLogout = () => {
      setUser(null)
      setToken(null)
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }

    window.addEventListener('auth:logout', handleAxiosAutoLogout)
    return () => {
      window.removeEventListener('auth:logout', handleAxiosAutoLogout)
    }
  }, [])

  /**
   * Đăng nhập: Lưu thông tin người dùng và token vào state & localStorage
   */
  const login = async (credentials) => {
    setLoading(true)

    try {
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
    isAuthenticated: Boolean(user && token),
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
