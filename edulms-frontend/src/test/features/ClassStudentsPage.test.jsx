import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ClassStudentsPage from '@/features/admin/ClassStudentsPage'
import academicApi from '@/api/academicApi'

vi.mock('@/api/academicApi')

describe('ClassStudentsPage Component Tests', () => {
  const mockGrades = [
    { _id: 'g10', level: 10, name: 'Khối 10' },
    { _id: 'g11', level: 11, name: 'Khối 11' },
  ]

  const mockClasses = [
    {
      _id: 'c1',
      name: '10A1',
      academicYear: '2025-2026',
      room: 'P101',
      capacity: 45,
      currentStudents: 2,
      studentCount: 2,
      grade: { _id: 'g10', level: 10, name: 'Khối 10' },
      homeroomTeacher: {
        _id: 't1',
        fullName: 'Thầy Nguyễn Văn Toán',
        userCode: 'GV001',
      },
    },
    {
      _id: 'c2',
      name: '10A2',
      academicYear: '2025-2026',
      room: 'P102',
      capacity: 45,
      currentStudents: 1,
      studentCount: 1,
      grade: { _id: 'g10', level: 10, name: 'Khối 10' },
      homeroomTeacher: {
        _id: 't2',
        fullName: 'Cô Trần Thị Văn',
        userCode: 'GV002',
      },
    },
  ]

  const mockStudents = [
    {
      _id: 's1',
      fullName: 'Nguyễn Văn An',
      userCode: 'HS2025001',
      email: 'an@edulms.test',
      className: '10A1',
      classRef: 'c1',
      isActivated: true,
      createdAt: '2026-09-01T08:00:00Z',
    },
    {
      _id: 's2',
      fullName: 'Trần Thị Bình',
      userCode: 'HS2025002',
      email: 'binh@edulms.test',
      className: '10A1',
      classRef: 'c1',
      isActivated: false,
      createdAt: '2026-09-02T08:00:00Z',
    },
  ]

  const mockUnassignedStudents = [
    {
      _id: 's3',
      fullName: 'Lê Hoàng Cường',
      userCode: 'HS2025003',
      email: 'cuong@edulms.test',
      isActivated: true,
      createdAt: '2026-09-03T08:00:00Z',
    },
    {
      _id: 's4',
      fullName: 'Phạm Minh Dũng',
      userCode: 'HS2025004',
      email: 'dung@edulms.test',
      isActivated: false,
      createdAt: '2026-09-04T08:00:00Z',
    },
  ]

  const mockHistory = [
    {
      _id: 'h1',
      action: 'ASSIGN',
      student: { fullName: 'Nguyễn Văn An', userCode: 'HS2025001' },
      fromClass: null,
      toClass: { name: '10A1' },
      changedBy: { fullName: 'Admin' },
      changedAt: '2026-09-01T09:00:00Z',
      note: 'Xếp lớp đầu năm',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()

    academicApi.getGrades.mockResolvedValue({ success: true, data: mockGrades })
    academicApi.getClasses.mockResolvedValue({ success: true, data: mockClasses })
    academicApi.getStudentsByClass.mockResolvedValue({
      success: true,
      data: {
        class: mockClasses[0],
        totalStudents: 2,
        students: mockStudents,
      },
    })
    academicApi.getUnassignedStudents.mockResolvedValue({
      success: true,
      data: mockUnassignedStudents,
    })
    academicApi.getClassHistoryByClassId.mockResolvedValue({
      success: true,
      data: mockHistory,
    })
  })

  it('1. Render tiêu đề, thông tin tổng quan lớp học và danh sách học sinh theo lớp', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/class-students?classId=c1']}>
        <ClassStudentsPage />
      </MemoryRouter>
    )

    // Tiêu đề trang
    expect(
      screen.getByRole('heading', { name: /quản lý danh sách học sinh theo lớp/i })
    ).toBeInTheDocument()

    // Chờ tải danh sách lớp và học sinh
    await waitFor(() => {
      expect(academicApi.getClasses).toHaveBeenCalled()
      expect(academicApi.getStudentsByClass).toHaveBeenCalledWith('c1')
    })

    // Thông tin lớp học
    expect(
      screen.getByRole('heading', { level: 2, name: /lớp 10a1/i })
    ).toBeInTheDocument()
    expect(screen.getByText(/Thầy Nguyễn Văn Toán/i)).toBeInTheDocument()

    // Bảng danh sách học sinh
    expect(screen.getByText('Nguyễn Văn An')).toBeInTheDocument()
    expect(screen.getByText('HS2025001')).toBeInTheDocument()
    expect(screen.getByText('an@edulms.test')).toBeInTheDocument()
    expect(screen.getByText('Đã kích hoạt')).toBeInTheDocument()

    expect(screen.getByText('Trần Thị Bình')).toBeInTheDocument()
    expect(screen.getByText('HS2025002')).toBeInTheDocument()
    expect(screen.getByText('Chưa kích hoạt')).toBeInTheDocument()
  })

  it('2. Hỗ trợ tìm kiếm học sinh trong danh sách lớp', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/class-students?classId=c1']}>
        <ClassStudentsPage />
      </MemoryRouter>
    )

    await screen.findByText('Nguyễn Văn An')

    const searchInput = screen.getByPlaceholderText(
      /tìm kiếm theo họ tên, mã học sinh, email/i
    )

    // Tìm kiếm học sinh "An"
    fireEvent.change(searchInput, { target: { value: 'An' } })

    expect(screen.getByText('Nguyễn Văn An')).toBeInTheDocument()
    expect(screen.queryByText('Trần Thị Bình')).not.toBeInTheDocument()

    // Tìm kiếm từ khóa không tồn tại
    fireEvent.change(searchInput, { target: { value: 'KhôngTồnTại' } })

    expect(screen.getByText(/không tìm thấy học sinh phù hợp/i)).toBeInTheDocument()
  })

  it('3. Mở modal thêm học sinh, chọn học sinh chưa phân lớp và gọi API xếp lớp', async () => {
    academicApi.addStudentsToClass.mockResolvedValue({
      success: true,
      message: 'Xếp 1 học sinh vào lớp 10A1 thành công',
    })

    render(
      <MemoryRouter initialEntries={['/admin/class-students?classId=c1']}>
        <ClassStudentsPage />
      </MemoryRouter>
    )

    await screen.findByText('Nguyễn Văn An')

    // Click nút "Xếp học sinh vào lớp"
    const addBtn = screen.getByRole('button', { name: /xếp học sinh vào lớp/i })
    fireEvent.click(addBtn)

    // Modal hiển thị
    expect(
      await screen.findByText(/Xếp học sinh vào lớp 10A1/i)
    ).toBeInTheDocument()

    // Danh sách học sinh chưa phân lớp được tải
    await waitFor(() => {
      expect(academicApi.getUnassignedStudents).toHaveBeenCalled()
    })
    expect(screen.getByText('Lê Hoàng Cường')).toBeInTheDocument()

    // Chọn học sinh Lê Hoàng Cường
    fireEvent.click(screen.getByText('Lê Hoàng Cường'))

    // Nhập ghi chú
    const noteInput = screen.getByPlaceholderText(
      /xếp lớp đầu năm học, chuyển tuyến/i
    )
    fireEvent.change(noteInput, { target: { value: 'Xếp bổ sung' } })

    // Click nút "Thêm 1 học sinh vào lớp"
    const submitBtn = screen.getByRole('button', {
      name: /thêm 1 học sinh vào lớp/i,
    })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(academicApi.addStudentsToClass).toHaveBeenCalledWith('c1', {
        studentIds: ['s3'],
        note: 'Xếp bổ sung',
      })
    })

    // Thông báo thành công hiển thị
    expect(
      await screen.findByText(/Xếp 1 học sinh vào lớp 10A1 thành công/i)
    ).toBeInTheDocument()
  })

  it('4. Mở modal chuyển lớp, chọn lớp đích, xác nhận và gọi API chuyển lớp', async () => {
    academicApi.transferStudent.mockResolvedValue({
      success: true,
      message: 'Chuyển lớp thành công',
    })

    render(
      <MemoryRouter initialEntries={['/admin/class-students?classId=c1']}>
        <ClassStudentsPage />
      </MemoryRouter>
    )

    await screen.findByText('Nguyễn Văn An')

    // Click nút "Chuyển lớp" của học sinh Nguyễn Văn An
    const transferBtns = screen.getAllByRole('button', { name: /^chuyển lớp$/i })
    fireEvent.click(transferBtns[0])

    // Modal chuyển lớp hiển thị
    expect(
      await screen.findByText(/Chuyển học sinh sang lớp khác/i)
    ).toBeInTheDocument()

    // Nhập ghi chú
    const noteTextarea = screen.getByPlaceholderText(
      /theo nguyện vọng phụ huynh/i
    )
    fireEvent.change(noteTextarea, {
      target: { value: 'Chuyển theo nguyện vọng' },
    })

    // Click "Tiếp tục xác nhận" (Hộp thoại xác nhận trước khi chuyển lớp)
    const nextBtn = screen.getByRole('button', { name: /tiếp tục xác nhận/i })
    fireEvent.click(nextBtn)

    // Màn hình xác nhận bước 2 hiển thị
    expect(
      screen.getByText(/xác nhận chuyển lớp học sinh/i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/xác nhận hành động chuyển lớp học sinh/i)
    ).toBeInTheDocument()

    // Click nút "Xác nhận chuyển ngay"
    const confirmBtn = screen.getByRole('button', {
      name: /xác nhận chuyển ngay/i,
    })
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(academicApi.transferStudent).toHaveBeenCalledWith({
        studentId: 's1',
        fromClassId: 'c1',
        toClassId: 'c2',
        note: 'Chuyển theo nguyện vọng',
      })
    })

    // Thông báo thành công
    expect(await screen.findByText(/chuyển lớp thành công/i)).toBeInTheDocument()
  })

  it('5. Mở modal xóa học sinh khỏi lớp và gọi API xóa', async () => {
    academicApi.removeStudentFromClass.mockResolvedValue({
      success: true,
      message: "Đã xóa học sinh 'Nguyễn Văn An' khỏi lớp '10A1' thành công.",
    })

    render(
      <MemoryRouter initialEntries={['/admin/class-students?classId=c1']}>
        <ClassStudentsPage />
      </MemoryRouter>
    )

    await screen.findByText('Nguyễn Văn An')

    // Click nút "Xóa"
    const removeBtns = screen.getAllByRole('button', { name: /^xóa$/i })
    fireEvent.click(removeBtns[0])

    // Modal xóa hiển thị
    expect(
      await screen.findByText(/xác nhận xóa khỏi lớp/i)
    ).toBeInTheDocument()

    // Nhập lý do xóa
    const noteInput = screen.getByPlaceholderText(
      /rút hồ sơ, chuyển trường, bảo lưu/i
    )
    fireEvent.change(noteInput, { target: { value: 'Chuyển trường' } })

    // Xác nhận xóa
    const confirmRemoveBtn = screen.getByRole('button', {
      name: /xác nhận xóa khỏi lớp/i,
    })
    fireEvent.click(confirmRemoveBtn)

    await waitFor(() => {
      expect(academicApi.removeStudentFromClass).toHaveBeenCalledWith(
        'c1',
        's1',
        { note: 'Chuyển trường' }
      )
    })

    expect(
      await screen.findByText(/Đã xóa học sinh 'Nguyễn Văn An' khỏi lớp '10A1'/i)
    ).toBeInTheDocument()
  })

  it('6. Chuyển sang tab Lịch sử xếp lớp và hiển thị danh sách lịch sử', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/class-students?classId=c1']}>
        <ClassStudentsPage />
      </MemoryRouter>
    )

    await screen.findByText('Nguyễn Văn An')

    // Click tab "Lịch sử xếp lớp & chuyển lớp"
    const historyTab = screen.getByRole('button', {
      name: /lịch sử xếp lớp & chuyển lớp/i,
    })
    fireEvent.click(historyTab)

    await waitFor(() => {
      expect(academicApi.getClassHistoryByClassId).toHaveBeenCalledWith('c1')
    })

    expect(
      await screen.findByText(/XẾP VÀO LỚP/i)
    ).toBeInTheDocument()
    expect(screen.getByText('Xếp lớp đầu năm')).toBeInTheDocument()
  })
})
