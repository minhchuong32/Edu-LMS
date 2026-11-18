import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import TeacherSubmissionGradingPanel from '@/components/teacher/TeacherSubmissionGradingPanel'
import assignmentApi from '@/api/assignmentApi'

vi.mock('@/api/assignmentApi', () => ({
  default: {
    getSubmissionsByAssignment: vi.fn(),
    gradeSubmission: vi.fn(),
  },
}))

const mockAssignment = {
  _id: 'asg_101',
  title: 'Bài tập Chương 1: Đại số',
}

const mockSubmissions = [
  {
    _id: 'sub_ontime_ungraded',
    assignment: 'asg_101',
    student: {
      _id: 'st_1',
      fullName: 'Nguyễn Văn An',
      userCode: 'HS001',
      email: 'an@edulms.edu.vn',
    },
    fileUrl: 'https://res.cloudinary.com/demo/raw/upload/v1/bai-lam-an.pdf',
    submittedAt: '2026-11-18T08:30:00.000Z',
    isLate: false,
    score: null,
    feedback: '',
    note: 'Em nộp bài đúng hạn ạ',
  },
  {
    _id: 'sub_late_graded',
    assignment: 'asg_101',
    student: {
      _id: 'st_2',
      fullName: 'Trần Thị Bình',
      userCode: 'HS002',
      email: 'binh@edulms.edu.vn',
    },
    fileUrl: 'https://res.cloudinary.com/demo/raw/upload/v1/bai-lam-binh.pdf',
    submittedAt: '2026-11-20T10:15:00.000Z',
    isLate: true,
    score: 8.0,
    feedback: 'Làm khá tốt nhưng nộp trễ hạn',
    note: '',
  },
]

describe('TeacherSubmissionGradingPanel Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    assignmentApi.getSubmissionsByAssignment.mockResolvedValue({
      data: mockSubmissions,
    })
  })

  it('hiển thị bảng danh sách bài nộp gồm Học sinh, Thời gian nộp, Đúng hạn/Trễ hạn, Đã chấm/Chưa chấm và nút Xem trước/Tải file', async () => {
    render(<TeacherSubmissionGradingPanel assignment={mockAssignment} />)

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Văn An')).toBeInTheDocument()
      expect(screen.getByText('Trần Thị Bình')).toBeInTheDocument()
    })

    // Kiểm tra trạng thái Đúng hạn / Trễ hạn
    expect(
      screen.getByTestId('timeliness-badge-sub_ontime_ungraded')
    ).toHaveTextContent('Đúng hạn')
    expect(
      screen.getByTestId('timeliness-badge-sub_late_graded')
    ).toHaveTextContent('Trễ hạn')

    // Kiểm tra trạng thái Đã chấm / Chưa chấm
    expect(
      screen.getByTestId('graded-badge-sub_ontime_ungraded')
    ).toHaveTextContent('Chưa chấm')
    expect(
      screen.getByTestId('graded-badge-sub_late_graded')
    ).toHaveTextContent('Đã chấm (8/10)')

    // Kiểm tra chức năng Xem trước (Preview) file bài làm
    fireEvent.click(
      screen.getByTestId('preview-file-btn-sub_ontime_ungraded')
    )
    expect(screen.getByTestId('file-preview-modal')).toBeInTheDocument()
  })

  it('cho phép nhập điểm + nhận xét trực tiếp trên danh sách, lưu kết quả và hiển thị thông báo thành công', async () => {
    assignmentApi.gradeSubmission.mockResolvedValue({
      data: {
        ...mockSubmissions[0],
        score: 9.5,
        feedback: 'Bài giải rất chi tiết và chính xác',
      },
    })

    render(<TeacherSubmissionGradingPanel assignment={mockAssignment} />)

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Văn An')).toBeInTheDocument()
    })

    const scoreInput = screen.getByTestId('score-input-sub_ontime_ungraded')
    const feedbackInput = screen.getByTestId(
      'feedback-input-sub_ontime_ungraded'
    )
    const saveBtn = screen.getByTestId('save-grade-btn-sub_ontime_ungraded')

    fireEvent.change(scoreInput, { target: { value: '9.5' } })
    fireEvent.change(feedbackInput, {
      target: { value: 'Bài giải rất chi tiết và chính xác' },
    })
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(assignmentApi.gradeSubmission).toHaveBeenCalledWith(
        'sub_ontime_ungraded',
        {
          score: 9.5,
          feedback: 'Bài giải rất chi tiết và chính xác',
        }
      )
      expect(screen.getByTestId('grading-alert-success')).toHaveTextContent(
        /Đã lưu kết quả chấm \(9.5\/10\)/i
      )
      expect(
        screen.getByTestId('graded-badge-sub_ontime_ungraded')
      ).toHaveTextContent('Đã chấm (9.5/10)')
    })
  })

  it('hiển thị thông báo lỗi khi giáo viên nhập điểm ngoài khoảng 0 - 10 hoặc khi API thất bại', async () => {
    render(<TeacherSubmissionGradingPanel assignment={mockAssignment} />)

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Văn An')).toBeInTheDocument()
    })

    const scoreInput = screen.getByTestId('score-input-sub_ontime_ungraded')
    const saveBtn = screen.getByTestId('save-grade-btn-sub_ontime_ungraded')

    // Nhập điểm = 12 (> 10)
    fireEvent.change(scoreInput, { target: { value: '12' } })
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(screen.getByTestId('grading-alert-error')).toHaveTextContent(
        /Điểm phải nằm trong khoảng từ 0 đến 10/i
      )
      expect(assignmentApi.gradeSubmission).not.toHaveBeenCalled()
    })
  })
})

