import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Header from '@/components/common/Header'
import * as useAuthModule from '@/context/useAuth'

vi.mock('@/context/useAuth')

describe('Header Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('hiển thị Avatar (chữ cái đầu), Tên người dùng và Badge vai trò khi đã đăng nhập', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: { id: 'u1', fullName: 'Trần Văn Nam', role: 'teacher' },
      isAuthenticated: true,
      logout: vi.fn(),
    })

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    )

    // Avatar chữ cái đầu 'T'
    expect(screen.getByText('T')).toBeInTheDocument()
    // Tên đầy đủ
    expect(screen.getByText('Trần Văn Nam')).toBeInTheDocument()
    // Badge vai trò tiếng Việt
    expect(screen.getByText('Giáo viên')).toBeInTheDocument()
  })

  it('gọi hàm logout khi click vào nút Đăng xuất', async () => {
    const logoutMock = vi.fn().mockResolvedValue({})
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: { id: 'u1', fullName: 'Lê Quản Trị', role: 'admin' },
      isAuthenticated: true,
      logout: logoutMock,
    })

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    )

    const logoutBtn = screen.getByRole('button', { name: /đăng xuất/i })
    await act(async () => {
      fireEvent.click(logoutBtn)
    })

    expect(logoutMock).toHaveBeenCalledTimes(1)
  })

  it('hiển thị nút Hamburger và kích hoạt onToggleSidebar khi click trên thiết bị di động', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: { id: 'u1', fullName: 'Lê Quản Trị', role: 'admin' },
      isAuthenticated: true,
      logout: vi.fn(),
    })

    const onToggleMock = vi.fn()

    render(
      <MemoryRouter>
        <Header onToggleSidebar={onToggleMock} isSidebarOpen={false} />
      </MemoryRouter>
    )

    const hamburgerBtn = screen.getByRole('button', { name: /mở menu điều hướng/i })
    expect(hamburgerBtn).toBeInTheDocument()

    fireEvent.click(hamburgerBtn)
    expect(onToggleMock).toHaveBeenCalledTimes(1)
  })
})
