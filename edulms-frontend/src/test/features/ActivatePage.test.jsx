import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import ActivatePage from '@/features/auth/ActivatePage'
import authApi from '@/api/authApi'

vi.mock('@/api/authApi')

describe('ActivatePage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('render Bước 1: Yêu cầu nhập Mã định danh và Email', () => {
    render(
      <MemoryRouter>
        <ActivatePage />
      </MemoryRouter>
    )

    // Tiêu đề thực tế trong component
    expect(screen.getByText('Kích hoạt tài khoản EduLMS')).toBeInTheDocument()
    // Placeholder thực tế
    expect(screen.getByPlaceholderText('Ví dụ: HS2026 hoặc GV001')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('example@edulms.edu.vn')).toBeInTheDocument()
    // Nút bước 1
    expect(screen.getByRole('button', { name: /tiếp tục \(kiểm tra thông tin\)/i })).toBeInTheDocument()
  })

  it('báo lỗi validation khi để trống thông tin ở Bước 1', async () => {
    render(
      <MemoryRouter>
        <ActivatePage />
      </MemoryRouter>
    )

    const nextBtn = screen.getByRole('button', { name: /tiếp tục \(kiểm tra thông tin\)/i })
    fireEvent.click(nextBtn)

    await waitFor(() => {
      expect(screen.getByText('Vui lòng nhập mã định danh (Học sinh hoặc Giáo viên).')).toBeInTheDocument()
      expect(screen.getByText('Vui lòng nhập địa chỉ email đã đăng ký.')).toBeInTheDocument()
    })
  })

  it('chuyển sang Bước 2 khi xác thực thông tin thành công', async () => {
    authApi.verifyActivation.mockResolvedValue({
      data: {
        fullName: 'Nguyễn Văn Em',
        role: 'student',
        className: '10A1',
      },
    })

    render(
      <MemoryRouter>
        <ActivatePage />
      </MemoryRouter>
    )

    fireEvent.change(screen.getByPlaceholderText('Ví dụ: HS2026 hoặc GV001'), {
      target: { value: 'HS007' },
    })
    fireEvent.change(screen.getByPlaceholderText('example@edulms.edu.vn'), {
      target: { value: 'hs007@edulms.edu.vn' },
    })

    fireEvent.click(screen.getByRole('button', { name: /tiếp tục \(kiểm tra thông tin\)/i }))

    await waitFor(() => {
      // Bước 2 indicator hiện lên
      expect(screen.getByText('Thiết lập mật khẩu')).toBeInTheDocument()
      // Tên người dùng đã xác thực hiện lên
      expect(screen.getByText('Nguyễn Văn Em')).toBeInTheDocument()
      // Input mật khẩu mới
      expect(screen.getByPlaceholderText('Tối thiểu 6 ký tự')).toBeInTheDocument()
    })
  })

  it('báo lỗi nếu mật khẩu nhập lại không khớp ở Bước 2', async () => {
    authApi.verifyActivation.mockResolvedValue({
      data: {
        fullName: 'Nguyễn Văn Em',
        role: 'student',
      },
    })

    render(
      <MemoryRouter>
        <ActivatePage />
      </MemoryRouter>
    )

    // Bước 1
    fireEvent.change(screen.getByPlaceholderText('Ví dụ: HS2026 hoặc GV001'), {
      target: { value: 'HS007' },
    })
    fireEvent.change(screen.getByPlaceholderText('example@edulms.edu.vn'), {
      target: { value: 'hs007@edulms.edu.vn' },
    })
    fireEvent.click(screen.getByRole('button', { name: /tiếp tục \(kiểm tra thông tin\)/i }))

    // Chờ sang Bước 2
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Tối thiểu 6 ký tự')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByPlaceholderText('Tối thiểu 6 ký tự'), {
      target: { value: 'Password123' },
    })
    fireEvent.change(screen.getByPlaceholderText('Nhập lại mật khẩu vừa đặt'), {
      target: { value: 'DifferentPassword' },
    })

    fireEvent.click(screen.getByRole('button', { name: /hoàn tất kích hoạt/i }))

    await waitFor(() => {
      // Thông báo lỗi thực tế trong component
      expect(screen.getByText('Mật khẩu xác nhận không trùng khớp.')).toBeInTheDocument()
    })
  })

  it('hoàn tất kích hoạt thành công và hiển thị thông báo thành công', async () => {
    authApi.verifyActivation.mockResolvedValue({
      data: {
        fullName: 'Nguyễn Văn Em',
        role: 'student',
      },
    })
    authApi.activate.mockResolvedValue({
      message: 'Kích hoạt tài khoản thành công! Vui lòng đăng nhập bằng mật khẩu vừa thiết lập.',
    })

    render(
      <MemoryRouter initialEntries={['/activate']}>
        <Routes>
          <Route path="/activate" element={<ActivatePage />} />
          <Route path="/login" element={<div>Trang Đăng Nhập</div>} />
        </Routes>
      </MemoryRouter>
    )

    // Bước 1
    fireEvent.change(screen.getByPlaceholderText('Ví dụ: HS2026 hoặc GV001'), {
      target: { value: 'HS007' },
    })
    fireEvent.change(screen.getByPlaceholderText('example@edulms.edu.vn'), {
      target: { value: 'hs007@edulms.edu.vn' },
    })
    fireEvent.click(screen.getByRole('button', { name: /tiếp tục \(kiểm tra thông tin\)/i }))

    // Bước 2
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Tối thiểu 6 ký tự')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByPlaceholderText('Tối thiểu 6 ký tự'), {
      target: { value: 'ValidPass123' },
    })
    fireEvent.change(screen.getByPlaceholderText('Nhập lại mật khẩu vừa đặt'), {
      target: { value: 'ValidPass123' },
    })

    fireEvent.click(screen.getByRole('button', { name: /hoàn tất kích hoạt/i }))

    await waitFor(() => {
      // Thông báo thành công từ API
      expect(
        screen.getByText('Kích hoạt tài khoản thành công! Vui lòng đăng nhập bằng mật khẩu vừa thiết lập.')
      ).toBeInTheDocument()
    })
  })
})
