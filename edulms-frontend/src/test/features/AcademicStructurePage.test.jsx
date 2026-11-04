import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AcademicStructurePage from '@/features/admin/AcademicStructurePage'
import academicApi from '@/api/academicApi'

vi.mock('@/api/academicApi')

describe('AcademicStructurePage Component Tests', () => {
  const mockGrades = [
    { _id: 'g10', level: 10, name: 'Khối 10', classCount: 2 },
    { _id: 'g11', level: 11, name: 'Khối 11', classCount: 1 },
    { _id: 'g12', level: 12, name: 'Khối 12', classCount: 0 },
  ]

  const mockSubjects = [
    {
      _id: 'sub_toan',
      name: 'Toán học',
      code: 'TOAN',
      periodsPerWeek: 4,
      gradeLevel: null,
      assignmentCount: 2,
    },
    {
      _id: 'sub_van',
      name: 'Ngữ văn',
      code: 'VAN',
      periodsPerWeek: 4,
      gradeLevel: null,
      assignmentCount: 1,
    },
  ]

  const mockTeachers = [
    {
      _id: 't1',
      fullName: 'Thầy Nguyễn Văn Toán',
      userCode: 'GV001',
      email: 'toan@edulms.test',
    },
    {
      _id: 't2',
      fullName: 'Cô Trần Thị Văn',
      userCode: 'GV002',
      email: 'van@edulms.test',
    },
  ]

  const mockClasses = [
    {
      _id: 'c1',
      name: '10A1',
      academicYear: '2025-2026',
      room: 'P101',
      capacity: 45,
      studentCount: 42,
      assignmentCount: 2,
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
      studentCount: 38,
      assignmentCount: 0,
      grade: { _id: 'g10', level: 10, name: 'Khối 10' },
      homeroomTeacher: null,
    },
  ]

  const mockAssignments = [
    {
      _id: 'a1',
      class: { _id: 'c1', name: '10A1', academicYear: '2025-2026', grade: { level: 10 } },
      subject: { _id: 'sub_toan', name: 'Toán học', code: 'TOAN' },
      teacher: { _id: 't1', fullName: 'Thầy Nguyễn Văn Toán', userCode: 'GV001' },
      academicYear: '2025-2026',
      semester: 'CaNam',
      periodsPerWeek: 4,
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    academicApi.getGrades.mockResolvedValue({ data: mockGrades })
    academicApi.getSubjects.mockResolvedValue({ data: mockSubjects })
    academicApi.getClasses.mockResolvedValue({ data: mockClasses })
    academicApi.getAssignments.mockResolvedValue({ data: mockAssignments })
    academicApi.getTeachers.mockResolvedValue({ data: mockTeachers })
  })

  it('render tiêu đề và danh sách 4 tabs học vụ chính xác', async () => {
    render(
      <MemoryRouter>
        <AcademicStructurePage />
      </MemoryRouter>
    )

    expect(screen.getByText('Cơ cấu học vụ & Phân công giảng dạy')).toBeInTheDocument()
    expect(screen.getByText('Danh sách Lớp học')).toBeInTheDocument()
    expect(screen.getByText('Phân công giảng dạy')).toBeInTheDocument()
    expect(screen.getByText('Danh mục Môn học')).toBeInTheDocument()
    expect(screen.getByText('Khối học (10, 11, 12)')).toBeInTheDocument()

    // Đợi tải dữ liệu xong và hiển thị lớp học
    await waitFor(() => {
      expect(screen.getByText('10A1')).toBeInTheDocument()
      expect(screen.getByText('10A2')).toBeInTheDocument()
    })
  })

  it('chuyển đổi tab Phân công giảng dạy và hiển thị dữ liệu phân công', async () => {
    render(
      <MemoryRouter>
        <AcademicStructurePage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('10A1')).toBeInTheDocument()
    })

    const assignTab = screen.getByText('Phân công giảng dạy')
    fireEvent.click(assignTab)

    await waitFor(() => {
      expect(screen.getByText('Giáo viên bộ môn')).toBeInTheDocument()
      expect(screen.getByText('Cả năm')).toBeInTheDocument()
    })
  })

  it('chuyển đổi tab Danh mục Môn học và hiển thị danh sách môn học', async () => {
    render(
      <MemoryRouter>
        <AcademicStructurePage />
      </MemoryRouter>
    )

    const subjectTab = screen.getByText('Danh mục Môn học')
    fireEvent.click(subjectTab)

    await waitFor(() => {
      expect(screen.getByText('Tên môn học')).toBeInTheDocument()
      expect(screen.getByText('Toán học')).toBeInTheDocument()
      expect(screen.getByText('TOAN')).toBeInTheDocument()
      expect(screen.getByText('Ngữ văn')).toBeInTheDocument()
    })
  })

  it('chuyển đổi tab Khối học và hiển thị khối 10, 11, 12', async () => {
    render(
      <MemoryRouter>
        <AcademicStructurePage />
      </MemoryRouter>
    )

    const gradeTab = screen.getByText('Khối học (10, 11, 12)')
    fireEvent.click(gradeTab)

    await waitFor(() => {
      expect(screen.getByText('Khối 10')).toBeInTheDocument()
      expect(screen.getByText('Khối 11')).toBeInTheDocument()
      expect(screen.getByText('Khối 12')).toBeInTheDocument()
    })
  })

  it('mở Modal Thêm lớp mới và đóng modal thành công', async () => {
    render(
      <MemoryRouter>
        <AcademicStructurePage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('add-class-btn')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('add-class-btn'))

    expect(screen.getByText('Thêm Lớp học mới')).toBeInTheDocument()
    expect(screen.getByText('Lưu lớp học')).toBeInTheDocument()

    // Click nút Hủy
    fireEvent.click(screen.getByText('Hủy'))

    await waitFor(() => {
      expect(screen.queryByText('Thêm Lớp học mới')).not.toBeInTheDocument()
    })
  })

  it('lọc danh sách lớp học theo từ khóa tìm kiếm', async () => {
    render(
      <MemoryRouter>
        <AcademicStructurePage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('10A1')).toBeInTheDocument()
      expect(screen.getByText('10A2')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText(/Tìm kiếm theo tên lớp/i)
    fireEvent.change(searchInput, { target: { value: '10A1' } })

    expect(screen.getByText('10A1')).toBeInTheDocument()
    expect(screen.queryByText('10A2')).not.toBeInTheDocument()
  })
})
