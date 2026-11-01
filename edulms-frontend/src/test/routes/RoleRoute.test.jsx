import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import RoleRoute from '@/routes/RoleRoute'
import * as useAuthModule from '@/context/useAuth'

vi.mock('@/context/useAuth')

describe('RoleRoute Guard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('hiển thị LoadingSpinner khi loading = true', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: null,
      isAuthenticated: false,
      loading: true,
    })

    render(
      <MemoryRouter initialEntries={['/admin-zone']}>
        <Routes>
          <Route element={<RoleRoute allowedRoles={['admin']} />}>
            <Route path="/admin-zone" element={<div>Admin Zone</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    expect(screen.queryByText('Admin Zone')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('chuyển hướng về /login nếu chưa xác thực', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: null,
      isAuthenticated: false,
      loading: false,
    })

    render(
      <MemoryRouter initialEntries={['/admin-zone']}>
        <Routes>
          <Route path="/login" element={<div>Trang Đăng Nhập</div>} />
          <Route element={<RoleRoute allowedRoles={['admin']} />}>
            <Route path="/admin-zone" element={<div>Admin Zone</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Trang Đăng Nhập')).toBeInTheDocument()
    expect(screen.queryByText('Admin Zone')).not.toBeInTheDocument()
  })

  it('chuyển hướng về /unauthorized khi vai trò không nằm trong allowedRoles', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: { id: 'u1', role: 'student' },
      isAuthenticated: true,
      loading: false,
    })

    render(
      <MemoryRouter initialEntries={['/admin-zone']}>
        <Routes>
          <Route path="/unauthorized" element={<div>Không có quyền truy cập</div>} />
          <Route element={<RoleRoute allowedRoles={['admin']} />}>
            <Route path="/admin-zone" element={<div>Admin Zone</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Không có quyền truy cập')).toBeInTheDocument()
    expect(screen.queryByText('Admin Zone')).not.toBeInTheDocument()
  })

  it('cho phép tuyến đường hỗ trợ nhiều vai trò (ví dụ: admin và teacher)', () => {
    // 1. Kiểm tra với Teacher
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: { id: 't1', role: 'teacher' },
      isAuthenticated: true,
      loading: false,
    })

    const { unmount } = render(
      <MemoryRouter initialEntries={['/shared-zone']}>
        <Routes>
          <Route path="/unauthorized" element={<div>Không có quyền</div>} />
          <Route element={<RoleRoute allowedRoles={['admin', 'teacher']} />}>
            <Route path="/shared-zone" element={<div>Khu vực chung Admin & Giáo viên</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Khu vực chung Admin & Giáo viên')).toBeInTheDocument()
    unmount()

    // 2. Kiểm tra với Student -> phải bị từ chối
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: { id: 's1', role: 'student' },
      isAuthenticated: true,
      loading: false,
    })

    render(
      <MemoryRouter initialEntries={['/shared-zone']}>
        <Routes>
          <Route path="/unauthorized" element={<div>Không có quyền</div>} />
          <Route element={<RoleRoute allowedRoles={['admin', 'teacher']} />}>
            <Route path="/shared-zone" element={<div>Khu vực chung Admin & Giáo viên</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Không có quyền')).toBeInTheDocument()
    expect(screen.queryByText('Khu vực chung Admin & Giáo viên')).not.toBeInTheDocument()
  })

  describe('Kiểm tra quyền truy cập với cả 4 vai trò của hệ thống', () => {
    const roles = ['admin', 'teacher', 'student', 'parent']

    roles.forEach((targetRole) => {
      it(`cho phép vai trò '${targetRole}' truy cập tuyến đường dành cho '${targetRole}'`, () => {
        vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
          user: { id: 'u123', role: targetRole },
          isAuthenticated: true,
          loading: false,
        })

        render(
          <MemoryRouter initialEntries={[`/${targetRole}-page`]}>
            <Routes>
              <Route path="/unauthorized" element={<div>Không có quyền</div>} />
              <Route element={<RoleRoute allowedRoles={[targetRole]} />}>
                <Route path={`/${targetRole}-page`} element={<div>Nội dung của {targetRole}</div>} />
              </Route>
            </Routes>
          </MemoryRouter>
        )

        expect(screen.getByText(`Nội dung của ${targetRole}`)).toBeInTheDocument()
      })

      it(`từ chối các vai trò khác khi truy cập tuyến đường chỉ dành riêng cho '${targetRole}'`, () => {
        const otherRoles = roles.filter((r) => r !== targetRole)
        const testedOtherRole = otherRoles[0] // Lấy một vai trò khác để test

        vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
          user: { id: 'u456', role: testedOtherRole },
          isAuthenticated: true,
          loading: false,
        })

        render(
          <MemoryRouter initialEntries={[`/${targetRole}-page`]}>
            <Routes>
              <Route path="/unauthorized" element={<div>Không có quyền</div>} />
              <Route element={<RoleRoute allowedRoles={[targetRole]} />}>
                <Route path={`/${targetRole}-page`} element={<div>Nội dung của {targetRole}</div>} />
              </Route>
            </Routes>
          </MemoryRouter>
        )

        expect(screen.getByText('Không có quyền')).toBeInTheDocument()
        expect(screen.queryByText(`Nội dung của ${targetRole}`)).not.toBeInTheDocument()
      })
    })
  })
})
