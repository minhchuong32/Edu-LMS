import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { AuthProvider } from '@/context/AuthContext.jsx'
import { useAuth } from '@/context/useAuth'
import authApi from '@/api/authApi'

vi.mock('@/api/authApi')

const TestConsumer = () => {
  const { user, token, isAuthenticated, loading, login, logout } = useAuth()
  return (
    <div>
      <div data-testid="loading">{loading ? 'true' : 'false'}</div>
      <div data-testid="auth">{isAuthenticated ? 'authenticated' : 'unauthenticated'}</div>
      <div data-testid="user-email">{user?.email || 'none'}</div>
      <div data-testid="token">{token || 'none'}</div>
      <button
        onClick={() =>
          login({ email: 'test@edulms.edu.vn', password: 'password123' })
        }
      >
        Login
      </button>
      <button onClick={() => logout()}>Logout</button>
    </div>
  )
}

describe('AuthContext & AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('khởi tạo với trạng thái chưa đăng nhập khi localStorage trống', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    // Chờ loading = false
    await act(async () => {})

    expect(screen.getByTestId('auth').textContent).toBe('unauthenticated')
    expect(screen.getByTestId('token').textContent).toBe('none')
    expect(screen.getByTestId('user-email').textContent).toBe('none')
  })

  it('khôi phục session khi có token trong localStorage', async () => {
    localStorage.setItem('token', 'existing_jwt_token')
    authApi.getMe.mockResolvedValue({
      data: {
        user: { fullName: 'Học Sinh Đã Lưu', email: 'saved@edulms.edu.vn', role: 'student' },
      },
    })

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await act(async () => {})

    expect(screen.getByTestId('auth').textContent).toBe('authenticated')
    expect(screen.getByTestId('user-email').textContent).toBe('saved@edulms.edu.vn')
  })

  it('login cập nhật state user, token và lưu vào localStorage', async () => {
    authApi.login.mockResolvedValue({
      data: {
        accessToken: 'new_token_777',
        user: { email: 'login_user@edulms.edu.vn', role: 'teacher' },
      },
    })

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await act(async () => {})

    const loginBtn = screen.getByRole('button', { name: 'Login' })
    await act(async () => {
      loginBtn.click()
    })

    expect(screen.getByTestId('auth').textContent).toBe('authenticated')
    expect(screen.getByTestId('user-email').textContent).toBe('login_user@edulms.edu.vn')
    expect(localStorage.getItem('token')).toBe('new_token_777')
  })

  it('logout dọn dẹp state và localStorage', async () => {
    localStorage.setItem('token', 'token_to_remove')
    localStorage.setItem('user', JSON.stringify({ email: 'user@edu.vn' }))
    authApi.getMe.mockResolvedValue({
      data: { user: { email: 'user@edu.vn' } },
    })
    authApi.logout.mockResolvedValue({})

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await act(async () => {})

    const logoutBtn = screen.getByRole('button', { name: 'Logout' })
    await act(async () => {
      logoutBtn.click()
    })

    expect(screen.getByTestId('auth').textContent).toBe('unauthenticated')
    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('user')).toBeNull()
  })
})
