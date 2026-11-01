import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ImportUsersPage from '@/features/admin/ImportUsersPage'
import importApi from '@/api/importApi'

vi.mock('@/api/importApi')

describe('ImportUsersPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url')
    global.URL.revokeObjectURL = vi.fn()
  })

  it('render giao diện Import tài khoản với tiêu đề và 2 tab vai trò', () => {
    render(
      <MemoryRouter>
        <ImportUsersPage />
      </MemoryRouter>
    )

    // Tiêu đề thực tế
    expect(screen.getByText('Import tài khoản từ Excel')).toBeInTheDocument()
    // Tab học sinh
    expect(screen.getByRole('button', { name: /học sinh/i })).toBeInTheDocument()
    // Tab giáo viên
    expect(screen.getByRole('button', { name: /giáo viên/i })).toBeInTheDocument()
    // Drop zone text
    expect(screen.getByText(/kéo thả file excel vào đây/i)).toBeInTheDocument()
  })

  it('chuyển đổi vai trò khi click tab Giáo viên - cột bắt buộc thay đổi', () => {
    render(
      <MemoryRouter>
        <ImportUsersPage />
      </MemoryRouter>
    )

    const teacherBtn = screen.getByRole('button', { name: /giáo viên/i })
    fireEvent.click(teacherBtn)

    // Khi switch sang teacher, header cột "Mã Giáo Viên" xuất hiện trong bảng mẫu
    expect(screen.getByText('Mã Giáo Viên')).toBeInTheDocument()
  })

  it('báo lỗi khi chọn file không phải định dạng .xlsx', () => {
    render(
      <MemoryRouter>
        <ImportUsersPage />
      </MemoryRouter>
    )

    const fileInput = document.querySelector('input[type="file"]')
    const invalidFile = new File(['dummy content'], 'test.csv', { type: 'text/csv' })

    fireEvent.change(fileInput, { target: { files: [invalidFile] } })

    expect(screen.getByText('Chỉ hỗ trợ file Excel (.xlsx)')).toBeInTheDocument()
  })

  it('gọi API downloadTemplate khi bấm nút Tải file mẫu', async () => {
    importApi.downloadTemplate.mockResolvedValue(new Blob(['mock excel data']))

    render(
      <MemoryRouter>
        <ImportUsersPage />
      </MemoryRouter>
    )

    // Nút tải file mẫu (button id="btn-download-template")
    const downloadBtn = document.getElementById('btn-download-template')
    fireEvent.click(downloadBtn)

    await waitFor(() => {
      expect(importApi.downloadTemplate).toHaveBeenCalledWith('student')
      expect(global.URL.createObjectURL).toHaveBeenCalled()
    })
  })

  it('import thành công và hiển thị bảng tài khoản đã tạo', async () => {
    importApi.importUsers.mockResolvedValue({
      totalRows: 2,
      successCount: 1,
      failCount: 1,
      failures: [{ row: 3, errors: ["Mã 'HS02' đã tồn tại trong hệ thống"] }],
      createdAccounts: [
        {
          rowIndex: 2,
          fullName: 'Học Sinh A',
          userCode: 'HS01',
          email: 'hs01@edu.vn',
          tempPassword: 'pass_temp_abc',
        },
      ],
    })

    render(
      <MemoryRouter>
        <ImportUsersPage />
      </MemoryRouter>
    )

    const fileInput = document.querySelector('input[type="file"]')
    const validFile = new File(['valid excel content'], 'students.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })

    fireEvent.change(fileInput, { target: { files: [validFile] } })

    const startImportBtn = document.getElementById('btn-import')
    fireEvent.click(startImportBtn)

    await waitFor(() => {
      // Heading kết quả thực tế: "Tài khoản đã tạo thành công (1)"
      expect(screen.getByText(/tài khoản đã tạo thành công/i)).toBeInTheDocument()
      // Dữ liệu tài khoản
      expect(screen.getByText('Học Sinh A')).toBeInTheDocument()
      expect(screen.getByText('HS01')).toBeInTheDocument()
      // Lỗi row 3
      expect(screen.getByText(/Mã 'HS02' đã tồn tại trong hệ thống/i)).toBeInTheDocument()
    })
  })
})
