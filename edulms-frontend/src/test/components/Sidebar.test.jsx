import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Sidebar from '@/components/common/Sidebar'
import * as useAuthModule from '@/context/useAuth'

vi.mock('@/context/useAuth')

describe('Sidebar Component & Role-Based Menu', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('hiển thị menu Quản trị viên (Admin): Cơ cấu học vụ, Quản lý người dùng, Báo cáo', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: { id: 'a1', fullName: 'Nguyễn Quản Trị', role: 'admin' },
      logout: vi.fn(),
    })

    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    )

    expect(screen.getByText(/cơ cấu học vụ/i)).toBeInTheDocument()
    expect(screen.getByText(/quản lý người dùng/i)).toBeInTheDocument()
    expect(screen.getByText(/báo cáo/i)).toBeInTheDocument()
  })

  it('hiển thị menu Giáo viên (Teacher): Lớp của tôi, Điểm danh, Bài tập, Sổ điểm', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: { id: 't1', fullName: 'Thầy Giáo Viên', role: 'teacher' },
      logout: vi.fn(),
    })

    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    )

    expect(screen.getByText(/lớp của tôi/i)).toBeInTheDocument()
    expect(screen.getByText(/điểm danh/i)).toBeInTheDocument()
    expect(screen.getByText(/bài tập/i)).toBeInTheDocument()
    expect(screen.getByText(/sổ điểm/i)).toBeInTheDocument()
  })

  it('hiển thị menu Học sinh (Student): Thời khóa biểu, Bài học, Bài tập, Điểm', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: { id: 's1', fullName: 'Em Học Sinh', role: 'student' },
      logout: vi.fn(),
    })

    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    )

    expect(screen.getByText(/thời khóa biểu/i)).toBeInTheDocument()
    expect(screen.getByText(/bài học/i)).toBeInTheDocument()
    expect(screen.getByText(/bài tập/i)).toBeInTheDocument()
    expect(screen.getByText(/điểm/i)).toBeInTheDocument()
  })

  it('hiển thị menu Phụ huynh (Parent): Điểm và điểm danh của con', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: { id: 'p1', fullName: 'Bác Phụ Huynh', role: 'parent' },
      logout: vi.fn(),
    })

    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    )

    expect(screen.getByText(/điểm và điểm danh của con/i)).toBeInTheDocument()
  })

  it('kích hoạt onItemClick khi người dùng click vào menu item', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: { id: 's1', fullName: 'Em Học Sinh', role: 'student' },
      logout: vi.fn(),
    })

    const onItemClickMock = vi.fn()

    render(
      <MemoryRouter>
        <Sidebar onItemClick={onItemClickMock} isMobile={true} />
      </MemoryRouter>
    )

    const timetableLink = screen.getByText(/thời khóa biểu/i)
    fireEvent.click(timetableLink)

    expect(onItemClickMock).toHaveBeenCalledTimes(1)
  })
})
