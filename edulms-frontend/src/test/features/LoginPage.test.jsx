import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import LoginPage from '@/features/auth/LoginPage'
import * as useAuthModule from '@/context/useAuth'

vi.mock('@/context/useAuth')

describe('LoginPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('render đầy đủ tiêu đề, các trường nhập và liên kết kích hoạt', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      login: vi.fn(),
    })

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    )

    expect(screen.getByText('Đăng nhập hệ thống')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('example@edulms.edu.vn')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /đăng nhập/i })).toBeInTheDocument()
    expect(screen.getByText(/kích hoạt tài khoản ngay/i)).toBeInTheDocument()
  })

  it('báo lỗi validation khi để trống email hoặc mật khẩu', async () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      login: vi.fn(),
    })

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    )

    const submitBtn = screen.getByRole('button', { name: /đăng nhập/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText('Vui lòng nhập địa chỉ email.')).toBeInTheDocument()
      expect(screen.getByText('Vui lòng nhập mật khẩu.')).toBeInTheDocument()
    })
  })

  it('báo lỗi validation khi email sai định dạng', async () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      login: vi.fn(),
    })

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    )

    const emailInput = screen.getByPlaceholderText('example@edulms.edu.vn')
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } })

    const submitBtn = screen.getByRole('button', { name: /đăng nhập/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText('Địa chỉ email không đúng định dạng.')).toBeInTheDocument()
    })
  })

  it('toggle ẩn/hiện mật khẩu khi click icon con mắt', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      login: vi.fn(),
    })

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    )

    const passwordInput = screen.getByPlaceholderText('••••••••')
    expect(passwordInput).toHaveAttribute('type', 'password')

    const toggleBtn = passwordInput.parentElement.querySelector('button')
    fireEvent.click(toggleBtn)
    expect(passwordInput).toHaveAttribute('type', 'text')

    fireEvent.click(toggleBtn)
    expect(passwordInput).toHaveAttribute('type', 'password')
  })

  it('hiển thị thông báo lỗi khi đăng nhập thất bại', async () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      login: vi.fn().mockRejectedValue({
        message: 'Email hoặc mật khẩu không chính xác!',
      }),
    })

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    )

    fireEvent.change(screen.getByPlaceholderText('example@edulms.edu.vn'), {
      target: { value: 'user@edulms.edu.vn' },
    })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'wrongpassword' },
    })

    fireEvent.click(screen.getByRole('button', { name: /đăng nhập/i }))

    await waitFor(() => {
      expect(screen.getByText('Email hoặc mật khẩu không chính xác!')).toBeInTheDocument()
    })
  })

  it('hiển thị link gợi ý kích hoạt khi tài khoản chưa được kích hoạt', async () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      login: vi.fn().mockRejectedValue({
        message: 'Tài khoản chưa được kích hoạt. Vui lòng kích hoạt tài khoản trước khi đăng nhập!',
        status: 403,
      }),
    })

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    )

    fireEvent.change(screen.getByPlaceholderText('example@edulms.edu.vn'), {
      target: { value: 'newuser@edulms.edu.vn' },
    })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'temppass123' },
    })

    fireEvent.click(screen.getByRole('button', { name: /đăng nhập/i }))

    await waitFor(() => {
      expect(screen.getByText(/bấm vào đây để kích hoạt tài khoản ngay/i)).toBeInTheDocument()
    })
  })

  it('đăng nhập thành công và điều hướng đúng theo role admin', async () => {
    const loginMock = vi.fn().mockResolvedValue({
      data: {
        user: { role: 'admin', fullName: 'Quản Trị Viên' },
      },
    })
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      login: loginMock,
    })

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin/dashboard" element={<div>Trang Admin Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    )

    fireEvent.change(screen.getByPlaceholderText('example@edulms.edu.vn'), {
      target: { value: 'admin@edulms.edu.vn' },
    })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'AdminPassword123' },
    })

    fireEvent.click(screen.getByRole('button', { name: /đăng nhập/i }))

    await waitFor(() => {
      expect(screen.getByText('Trang Admin Dashboard')).toBeInTheDocument()
    })
  })
})
