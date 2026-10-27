import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import PrivateRoute from '@/routes/PrivateRoute'
import * as useAuthModule from '@/context/useAuth'

vi.mock('@/context/useAuth')

describe('PrivateRoute Guard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('hiển thị LoadingSpinner khi trạng thái auth đang loading', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: null,
      isAuthenticated: false,
      loading: true,
    })

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route element={<PrivateRoute />}>
            <Route path="/protected" element={<div>Protected Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    // LoadingSpinner có role status hoặc spinner text
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('chuyển hướng về /login khi người dùng chưa đăng nhập', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: null,
      isAuthenticated: false,
      loading: false,
    })

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/login" element={<div>Trang Đăng Nhập</div>} />
          <Route element={<PrivateRoute />}>
            <Route path="/protected" element={<div>Protected Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Trang Đăng Nhập')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('cho phép truy cập và render Outlet khi người dùng đã đăng nhập', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: { id: 'u1', name: 'John Doe', role: 'student' },
      isAuthenticated: true,
      loading: false,
    })

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/login" element={<div>Trang Đăng Nhập</div>} />
          <Route element={<PrivateRoute />}>
            <Route path="/protected" element={<div>Protected Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Protected Content')).toBeInTheDocument()
    expect(screen.queryByText('Trang Đăng Nhập')).not.toBeInTheDocument()
  })

  it('render trực tiếp children nếu được truyền', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: { id: 'u1', name: 'John Doe', role: 'student' },
      isAuthenticated: true,
      loading: false,
    })

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <PrivateRoute>
                <div>Direct Children Content</div>
              </PrivateRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Direct Children Content')).toBeInTheDocument()
  })
})
