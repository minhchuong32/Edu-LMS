import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { TeacherGradebookPage } from '@/features/teacher/TeacherGradebookPage'
import academicApi from '@/api/academicApi'
import gradebookApi from '@/api/gradebookApi'

const mockTeacherUser = {
  _id: 'teacher_toan_1',
  userId: 'teacher_toan_1',
  fullName: 'Thầy Nguyễn Văn Toán',
  role: 'teacher',
  email: 'teacher1@edulms.test',
}

vi.mock('@/context/useAuth', () => ({
  useAuth: () => ({
    user: mockTeacherUser,
    isAuthenticated: true,
  }),
}))

vi.mock('@/api/academicApi', () => ({
  default: {
    getTeacherSchedule: vi.fn(),
    getAssignments: vi.fn(),
    getStudentsByClass: vi.fn(),
  },
}))

vi.mock('@/api/gradebookApi', () => ({
  default: {
    getGradeRecords: vi.fn(),
    bulkSaveGradeRecords: vi.fn(),
    createGradeRecord: vi.fn(),
    updateGradeRecord: vi.fn(),
  },
}))

const mockTeachingAssignments = [
  {
    _id: 'ta_toan_10a1',
    academicYear: '2025-2026',
    semester: 'CaNam',
    class: { _id: 'class_10a1', name: '10A1' },
    subject: { _id: 'sub_toan', name: 'Toán học', code: 'TOAN' },
    teacher: { _id: 'teacher_toan_1', fullName: 'Thầy Nguyễn Văn Toán' },
  },
]

const mockClassStudents = [
  {
    _id: 'st_1',
    userCode: 'HS001',
    fullName: 'Nguyễn Văn An',
    email: 'student1@edulms.test',
    className: '10A1',
  },
  {
    _id: 'st_2',
    userCode: 'HS002',
    fullName: 'Trần Thị Bình',
    email: 'student2@edulms.test',
    className: '10A1',
  },
]

const mockInitialRecords = [
  {
    _id: 'rec_1',
    student: mockClassStudents[0],
    teachingAssignment: mockTeachingAssignments[0],
    semester: 'HK1',
    gradeType: 'oral',
    value: 8,
    weight: 1,
  },
  {
    _id: 'rec_2',
    student: mockClassStudents[0],
    teachingAssignment: mockTeachingAssignments[0],
    semester: 'HK1',
    gradeType: 'midterm',
    value: 7,
    weight: 2,
  },
]

describe('TeacherGradebookPage Component (Spreadsheet Gradebook UI)', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    academicApi.getTeacherSchedule.mockResolvedValue({
      data: mockTeachingAssignments,
    })
    academicApi.getStudentsByClass.mockResolvedValue({
      data: mockClassStudents,
    })
    gradebookApi.getGradeRecords.mockResolvedValue({
      data: {
        records: mockInitialRecords,
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

  it('hiển thị bảng điểm dạng spreadsheet với hàng là học sinh, cột là các loại điểm và tự động tính ĐTB môn', async () => {
    render(
      <MemoryRouter>
        <TeacherGradebookPage />
      </MemoryRouter>
    )

    // Chờ bảng điểm tải xong
    await waitFor(() => {
      expect(
        screen.getByTestId('gradebook-spreadsheet-table')
      ).toBeInTheDocument()
    })

    // Hiển thị danh sách học sinh của lớp 10A1
    expect(screen.getByText('Nguyễn Văn An')).toBeInTheDocument()
    expect(screen.getByText('Trần Thị Bình')).toBeInTheDocument()

    // Kiểm tra điểm đã nạp vào ô inline của HS001 (oral = 8, midterm = 7)
    const oralInputSt1 = screen.getByTestId('grade-input-st_1-oral')
    const midtermInputSt1 = screen.getByTestId('grade-input-st_1-midterm')
    expect(oralInputSt1).toHaveValue('8')
    expect(midtermInputSt1).toHaveValue('7')

    // ĐTB môn tự động của HS001: (8*1 + 7*2) / (1 + 2) = 22 / 3 = 7.3
    expect(screen.getByTestId('student-average-st_1')).toHaveTextContent('7.3')
    expect(screen.getByTestId('student-performance-st_1')).toHaveTextContent(
      'Khá'
    )
  })

  it('cho phép inline edit trực tiếp, tự động cập nhật ĐTB môn và kiểm tra validate điểm ngoài khoảng 0 - 10', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <TeacherGradebookPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(
        screen.getByTestId('gradebook-spreadsheet-table')
      ).toBeInTheDocument()
    })

    // 1. Nhập điểm Cuối kỳ (hệ số 3) = 9 cho Nguyễn Văn An (st_1)
    const finalInputSt1 = screen.getByTestId('grade-input-st_1-final')
    await user.clear(finalInputSt1)
    await user.type(finalInputSt1, '9')

    // ĐTB môn tự động cập nhật: (8*1 + 7*2 + 9*3) / (1 + 2 + 3) = 49 / 6 = 8.2 (Giỏi)
    expect(screen.getByTestId('student-average-st_1')).toHaveTextContent('8.2')
    expect(screen.getByTestId('student-performance-st_1')).toHaveTextContent(
      'Giỏi'
    )

    // 2. Nhập điểm không hợp lệ (> 10) cho Trần Thị Bình (st_2)
    const oralInputSt2 = screen.getByTestId('grade-input-st_2-oral')
    await user.type(oralInputSt2, '11.5')

    // Hiển thị cảnh báo lỗi inline 0 - 10 và chặn lưu hàng loạt
    expect(screen.getByTestId('grade-error-st_2-oral')).toHaveTextContent(
      '0 – 10'
    )

    const bulkSaveBtn = screen.getByTestId('bulk-save-grades-btn')
    await user.click(bulkSaveBtn)

    expect(gradebookApi.bulkSaveGradeRecords).not.toHaveBeenCalled()
    expect(screen.getByTestId('gradebook-status-banner')).toHaveTextContent(
      /không hợp lệ/i
    )
  })

  it('hỗ trợ lưu hàng loạt nhiều điểm của nhiều học sinh trong một lần thao tác (Bulk Save)', async () => {
    const user = userEvent.setup()

    gradebookApi.bulkSaveGradeRecords.mockResolvedValue({
      data: {
        count: 3,
        records: [
          {
            _id: 'rec_3',
            student: 'st_1',
            gradeType: 'final',
            value: 9,
            weight: 3,
          },
          {
            _id: 'rec_4',
            student: 'st_2',
            gradeType: 'oral',
            value: 8.5,
            weight: 1,
          },
          {
            _id: 'rec_5',
            student: 'st_2',
            gradeType: 'midterm',
            value: 9,
            weight: 2,
          },
        ],
      },
    })

    render(
      <MemoryRouter>
        <TeacherGradebookPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(
        screen.getByTestId('gradebook-spreadsheet-table')
      ).toBeInTheDocument()
    })

    // Nhập nhiều đầu điểm trên nhiều học sinh
    await user.type(screen.getByTestId('grade-input-st_1-final'), '9')
    await user.type(screen.getByTestId('grade-input-st_2-oral'), '8.5')
    await user.type(screen.getByTestId('grade-input-st_2-midterm'), '9')

    // Kiểm tra số đầu điểm chờ lưu = 3
    expect(screen.getByTestId('dirty-count-stat')).toHaveTextContent(
      '3 đầu điểm chờ lưu'
    )

    // Bấm nút Lưu bảng điểm hàng loạt
    await user.click(screen.getByTestId('bulk-save-grades-btn'))

    await waitFor(() => {
      expect(gradebookApi.bulkSaveGradeRecords).toHaveBeenCalledTimes(1)
    })

    const payload = gradebookApi.bulkSaveGradeRecords.mock.calls[0][0]
    expect(payload.teachingAssignment).toBe('ta_toan_10a1')
    expect(payload.semester).toBe('HK1')
    expect(payload.records).toHaveLength(3)

    // Hiển thị thông báo lưu hàng loạt thành công
    expect(screen.getByTestId('gradebook-status-banner')).toHaveTextContent(
      /Đã lưu hàng loạt thành công 3 đầu điểm/i
    )
    expect(screen.getByTestId('dirty-count-stat')).toHaveTextContent(
      'Đã đồng bộ'
    )
  })
})

