import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { StudentGradeLookupPage } from '@/features/student/StudentGradeLookupPage'
import academicApi from '@/api/academicApi'
import gradebookApi from '@/api/gradebookApi'
import * as useAuthModule from '@/context/useAuth'

vi.mock('@/context/useAuth')

vi.mock('@/api/academicApi', () => ({
  default: {
    getAssignments: vi.fn(),
    getClasses: vi.fn(),
  },
}))

vi.mock('@/api/gradebookApi', () => ({
  default: {
    getGradeRecords: vi.fn(),
  },
}))

const mockStudentUser = {
  _id: 'student_1',
  userId: 'student_1',
  userCode: 'HS001',
  fullName: 'Nguyễn Văn An',
  role: 'student',
  className: '10A1',
  classRef: 'class_10a1',
}

const mockParentUser = {
  _id: 'parent_1',
  userId: 'parent_1',
  userCode: 'PH001',
  fullName: 'Phụ huynh Nguyễn Văn Nam',
  role: 'parent',
  studentName: 'Nguyễn Văn An',
  studentCode: 'HS001',
  className: '10A1',
}

const mockTeachingAssignments = [
  {
    _id: 'ta_toan',
    class: { _id: 'class_10a1', name: '10A1' },
    subject: { _id: 'sub_toan', name: 'Toán học', code: 'TOAN' },
    teacher: { _id: 'gv_1', fullName: 'Thầy Nguyễn Văn Toán' },
  },
  {
    _id: 'ta_van',
    class: { _id: 'class_10a1', name: '10A1' },
    subject: { _id: 'sub_van', name: 'Ngữ văn', code: 'VAN' },
    teacher: { _id: 'gv_2', fullName: 'Cô Trần Thị Văn' },
  },
]

const mockGradeRecords = [
  {
    _id: 'g_1',
    student: mockStudentUser,
    teachingAssignment: mockTeachingAssignments[0],
    semester: 'HK1',
    gradeType: 'oral',
    value: 8,
    weight: 1,
    createdAt: '2026-10-05T08:00:00Z',
  },
  {
    _id: 'g_2',
    student: mockStudentUser,
    teachingAssignment: mockTeachingAssignments[0],
    semester: 'HK1',
    gradeType: 'midterm',
    value: 8.5,
    weight: 2,
    createdAt: '2026-10-20T08:00:00Z',
  },
  {
    _id: 'g_3',
    student: mockStudentUser,
    teachingAssignment: mockTeachingAssignments[0],
    semester: 'HK1',
    gradeType: 'final',
    value: 9,
    weight: 3,
    createdAt: '2026-11-15T08:00:00Z',
  },
  {
    _id: 'g_4',
    student: mockStudentUser,
    teachingAssignment: mockTeachingAssignments[1],
    semester: 'HK1',
    gradeType: 'oral',
    value: 7,
    weight: 1,
    createdAt: '2026-10-10T08:00:00Z',
  },
  {
    _id: 'g_5',
    student: mockStudentUser,
    teachingAssignment: mockTeachingAssignments[1],
    semester: 'HK1',
    gradeType: 'midterm',
    value: 7.5,
    weight: 2,
    createdAt: '2026-10-25T08:00:00Z',
  },
]

describe('StudentGradeLookupPage Component (Read-Only Student & Parent Grade Lookup)', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: mockStudentUser,
      isAuthenticated: true,
    })

    academicApi.getAssignments.mockResolvedValue({
      data: mockTeachingAssignments,
    })

    gradebookApi.getGradeRecords.mockResolvedValue({
      data: {
        records: mockGradeRecords,
        weightConfig: {
          oral: 1,
          '15min': 1,
          regular: 1,
          '45min': 2,
          midterm: 2,
          final: 3,
        },
      },
    })
  })

  it('hiển thị bảng điểm theo môn/học kỳ, các loại điểm thành phần và làm nổi bật ĐTB môn cùng ĐTB học kỳ', async () => {
    render(
      <MemoryRouter>
        <StudentGradeLookupPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(
        screen.getByTestId('student-gradebook-table')
      ).toBeInTheDocument()
    })

    // 1. Kiểm tra hiển thị 2 môn học Toán học và Ngữ văn
    expect(
      screen.getByTestId('subject-grade-row-sub_toan')
    ).toBeInTheDocument()
    expect(
      screen.getByTestId('subject-grade-row-sub_van')
    ).toBeInTheDocument()

    // 2. Kiểm tra ĐTB môn Toán học: (8*1 + 8.5*2 + 9*3) / (1 + 2 + 3) = 52 / 6 = 8.7 (Giỏi)
    expect(
      screen.getByTestId('subject-average-badge-sub_toan')
    ).toHaveTextContent('8.7')
    expect(
      screen.getByTestId('subject-performance-badge-sub_toan')
    ).toHaveTextContent('Giỏi')

    // 3. Kiểm tra ĐTB môn Ngữ văn: (7*1 + 7.5*2) / (1 + 2) = 22 / 3 = 7.3 (Khá)
    expect(
      screen.getByTestId('subject-average-badge-sub_van')
    ).toHaveTextContent('7.3')
    expect(
      screen.getByTestId('subject-performance-badge-sub_van')
    ).toHaveTextContent('Khá')

    // 4. Kiểm tra Card Điểm trung bình học kỳ nổi bật: (8.7 + 7.3) / 2 = 8.0 (Giỏi)
    expect(screen.getByTestId('semester-gpa-card')).toBeInTheDocument()
    expect(screen.getByTestId('semester-gpa-value')).toHaveTextContent('8.0')
    expect(
      screen.getByTestId('semester-performance-badge')
    ).toHaveTextContent('Giỏi')
    expect(screen.getByTestId('table-footer-semester-gpa')).toHaveTextContent(
      '8.0'
    )

    // 5. Kiểm tra Card ĐTB Môn Cao Nhất
    expect(screen.getByTestId('best-subject-card')).toHaveTextContent(
      'Toán học'
    )
    expect(screen.getByTestId('best-subject-average')).toHaveTextContent(
      '8.7 / 10'
    )
  })

  it('hiển thị biểu đồ xu hướng điểm theo thời gian và cho phép lọc xu hướng theo từng môn học', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <StudentGradeLookupPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('grade-trend-chart')).toBeInTheDocument()
    })

    // Biểu đồ SVG hiển thị đủ 5 mốc điểm của tất cả môn học theo thời gian
    expect(screen.getByTestId('grade-trend-svg')).toBeInTheDocument()
    expect(screen.getByTestId('trend-point-0')).toBeInTheDocument()
    expect(screen.getByTestId('trend-point-4')).toBeInTheDocument()

    // Lọc biểu đồ xu hướng chỉ riêng môn Toán học (3 mốc điểm: 8 -> 8.5 -> 9)
    const trendFilter = screen.getByTestId('trend-subject-filter')
    await user.selectOptions(trendFilter, 'sub_toan')

    expect(screen.getByTestId('trend-point-0')).toBeInTheDocument()
    expect(screen.getByTestId('trend-point-2')).toBeInTheDocument()
    expect(screen.queryByTestId('trend-point-3')).not.toBeInTheDocument()
  })

  it('kiểm soát chặt chẽ quyền Chỉ đọc (Read-Only) đối với Học sinh và Phụ huynh: không có ô nhập, sửa hoặc xóa điểm', async () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: mockParentUser,
      isAuthenticated: true,
    })

    render(
      <MemoryRouter>
        <StudentGradeLookupPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(
        screen.getByTestId('student-gradebook-table')
      ).toBeInTheDocument()
    })

    // Hiển thị tiêu đề Phụ huynh & Badge Chỉ xem (Read-Only)
    expect(
      screen.getByText(/Tra cứu Kết quả Học tập của Con/i)
    ).toBeInTheDocument()
    expect(screen.getByTestId('readonly-mode-badge')).toHaveTextContent(
      /Chỉ xem \(Read-Only\)/i
    )
    expect(screen.getByTestId('readonly-access-card')).toHaveTextContent(
      /Không cho phép thêm \/ sửa \/ xóa/i
    )

    // Tuyệt đối không có bất kỳ ô input sửa điểm hay nút Lưu/Thêm/Sửa/Xóa điểm nào trong bảng điểm
    expect(
      screen.queryByTestId(/grade-input-/i)
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /lưu bảng điểm|thêm điểm|xóa điểm|chỉnh sửa điểm/i })
    ).not.toBeInTheDocument()
  })
})

