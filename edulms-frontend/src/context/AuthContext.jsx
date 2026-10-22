import { useState, useEffect, useCallback } from 'react'
import AuthContext from './authContext'
import authApi from '@/api/authApi'


export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user')
      return savedUser ? JSON.parse(savedUser) : null
    } catch {
      localStorage.removeItem('user')
      return null
    }
  })

  const [token, setToken] = useState(
    () => localStorage.getItem('token') || null,
  )
  const [loading, setLoading] = useState(true)

  // Khai báo logout trước useEffect để tránh lỗi sử dụng trước khai báo.
  const logout = useCallback(() => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }, [])

  useEffect(() => {
    let active = true

    const initAuth = async () => {
      try {
        if (token) {
          const res = await authApi.getMe()

          if (active && res.user) {
            setUser(res.user)
            localStorage.setItem('user', JSON.stringify(res.user))
          }
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
  }, [token, logout])

  const login = async (credentials) => {
    setLoading(true)

    try {
      const res = await authApi.login(credentials)
      const { user: userData, token: jwtToken } = res.data || res

      setUser(userData)
      setToken(jwtToken)

      localStorage.setItem('token', jwtToken)
      localStorage.setItem('user', JSON.stringify(userData))

      return res
    } finally {
      setLoading(false)
    }
  }

  const value = {
    user,
    token,
    loading,
    isAuthenticated: Boolean(user && token),
    login,
    logout,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthContext
