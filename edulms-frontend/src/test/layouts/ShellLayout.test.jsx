import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import DashboardLayout from '@/layouts/DashboardLayout'
import * as useAuthModule from '@/context/useAuth'

vi.mock('@/context/useAuth')

describe('ShellLayout & Mobile Drawer Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: { id: 'u1', fullName: 'Nguyễn Văn Admin', role: 'admin' },
      isAuthenticated: true,
      logout: vi.fn(),
    })
  })

  it('mở Drawer và hiển thị backdrop khi click vào nút Hamburger trên di động', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<div>Dashboard Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    // Ban đầu chưa có backdrop
    expect(screen.queryByTestId('sidebar-backdrop')).not.toBeInTheDocument()

    // Tìm và click nút Hamburger
    const hamburgerBtn = screen.getByRole('button', { name: /mở menu điều hướng/i })
    fireEvent.click(hamburgerBtn)

    // Drawer mở ra và xuất hiện backdrop
    expect(screen.getByTestId('sidebar-backdrop')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: /menu điều hướng di động/i })).toBeInTheDocument()
  })

  it('đóng Drawer khi người dùng click vào nút Đóng (X)', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<div>Dashboard Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    // Mở Drawer
    const hamburgerBtn = screen.getByRole('button', { name: /mở menu điều hướng/i })
    fireEvent.click(hamburgerBtn)
    expect(screen.getByTestId('sidebar-backdrop')).toBeInTheDocument()

    // Click nút Đóng (X)
    const closeBtn = screen.getByTestId('close-drawer-button')
    fireEvent.click(closeBtn)

    // Backdrop và Drawer đã đóng
    expect(screen.queryByTestId('sidebar-backdrop')).not.toBeInTheDocument()
  })

  it('đóng Drawer khi click vào backdrop', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<div>Dashboard Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    // Mở Drawer
    const hamburgerBtn = screen.getByRole('button', { name: /mở menu điều hướng/i })
    fireEvent.click(hamburgerBtn)

    const backdrop = screen.getByTestId('sidebar-backdrop')
    fireEvent.click(backdrop)

    expect(screen.queryByTestId('sidebar-backdrop')).not.toBeInTheDocument()
  })

  it('đóng Drawer khi nhấn phím Escape', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<div>Dashboard Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    // Mở Drawer
    const hamburgerBtn = screen.getByRole('button', { name: /mở menu điều hướng/i })
    fireEvent.click(hamburgerBtn)
    expect(screen.getByTestId('sidebar-backdrop')).toBeInTheDocument()

    // Bấm Escape
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' })

    expect(screen.queryByTestId('sidebar-backdrop')).not.toBeInTheDocument()
  })
})
