import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AppRoutes from '@/routes/AppRoutes'
import * as useAuthModule from '@/context/useAuth'

vi.mock('@/context/useAuth')

describe('AppRoutes Guard Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('chuyển hướng người dùng chưa đăng nhập về trang đăng nhập khi truy cập dashboard', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: null,
      isAuthenticated: false,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <AppRoutes />
      </MemoryRouter>
    )

    // Sẽ chuyển hướng về trang /login có nút Đăng nhập
    expect(screen.getByRole('button', { name: /đăng nhập/i })).toBeInTheDocument()
  })

  it('cho phép Admin truy cập /admin/dashboard nhưng bị từ chối ở /teacher/dashboard', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: { id: 'a1', name: 'Quản trị viên', role: 'admin' },
      isAuthenticated: true,
      loading: false,
      logout: vi.fn(),
    })

    // Truy cập hợp lệ
    const { unmount } = render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <AppRoutes />
      </MemoryRouter>
    )

    expect(screen.getByText(/cổng quản trị hệ thống/i)).toBeInTheDocument()
    unmount()

    // Truy cập trái phép vào trang Teacher
    render(
      <MemoryRouter initialEntries={['/teacher/dashboard']}>
        <AppRoutes />
      </MemoryRouter>
    )

    expect(screen.getByText(/truy cập bị từ chối/i)).toBeInTheDocument()
  })

  it('cho phép Teacher truy cập /teacher/dashboard nhưng bị từ chối ở /admin/dashboard', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: { id: 't1', name: 'Giáo viên A', role: 'teacher' },
      isAuthenticated: true,
      loading: false,
      logout: vi.fn(),
    })

    const { unmount } = render(
      <MemoryRouter initialEntries={['/teacher/dashboard']}>
        <AppRoutes />
      </MemoryRouter>
    )

    expect(screen.getByText(/cổng giáo viên/i)).toBeInTheDocument()
    unmount()

    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <AppRoutes />
      </MemoryRouter>
    )

    expect(screen.getByText(/truy cập bị từ chối/i)).toBeInTheDocument()
  })

  it('cho phép Student truy cập /student/dashboard nhưng bị từ chối ở /parent/dashboard', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: { id: 's1', name: 'Học sinh B', role: 'student' },
      isAuthenticated: true,
      loading: false,
      logout: vi.fn(),
    })

    const { unmount } = render(
      <MemoryRouter initialEntries={['/student/dashboard']}>
        <AppRoutes />
      </MemoryRouter>
    )

    expect(screen.getByText(/góc học tập học sinh/i)).toBeInTheDocument()
    unmount()

    render(
      <MemoryRouter initialEntries={['/parent/dashboard']}>
        <AppRoutes />
      </MemoryRouter>
    )

    expect(screen.getByText(/truy cập bị từ chối/i)).toBeInTheDocument()
  })

  it('cho phép Parent truy cập /parent/dashboard nhưng bị từ chối ở /student/dashboard', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: { id: 'p1', name: 'Phụ huynh C', role: 'parent' },
      isAuthenticated: true,
      loading: false,
      logout: vi.fn(),
    })

    const { unmount } = render(
      <MemoryRouter initialEntries={['/parent/dashboard']}>
        <AppRoutes />
      </MemoryRouter>
    )

    expect(screen.getByText(/cổng phụ huynh học sinh/i)).toBeInTheDocument()
    unmount()

    render(
      <MemoryRouter initialEntries={['/student/dashboard']}>
        <AppRoutes />
      </MemoryRouter>
    )

    expect(screen.getByText(/truy cập bị từ chối/i)).toBeInTheDocument()
  })
})
