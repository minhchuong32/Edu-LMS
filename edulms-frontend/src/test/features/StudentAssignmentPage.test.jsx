import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import StudentAssignmentPage from '@/features/student/StudentAssignmentPage'
import * as useAuthModule from '@/context/useAuth'
import academicApi from '@/api/academicApi'
import assignmentApi from '@/api/assignmentApi'

vi.mock('@/context/useAuth')
vi.mock('@/api/academicApi', () => ({
  default: {
    getClasses: vi.fn(),
    getAssignments: vi.fn(),
  },
}))
vi.mock('@/api/assignmentApi', () => ({
  default: {
    getAssignments: vi.fn(),
    getMySubmission: vi.fn(),
    submitAssignment: vi.fn(),
  },
}))
vi.mock('@/components/teacher/FileUploadManager', () => ({
  default: ({ title, onUploadSuccess }) => (
    <div data-testid="student-file-upload-manager">
      <span>{title}</span>
      <button
        type="button"
        onClick={() =>
          onUploadSuccess([
            {
              name: 'Bai-lam-em-A.pdf',
              url: 'https://res.cloudinary.com/demo/raw/upload/v1/bai-lam-em-A.pdf',
              publicId: 'edulms/documents/bai-lam-em-A',
              resourceType: 'raw',
            },
          ])
        }
      >
        Giả lập Upload Bài Làm
      </button>
    </div>
  ),
}))

const mockTeachingAssignments = [
  {
    _id: 'ta_math',
    class: { _id: 'class_10a1', name: '10A1' },
    subject: { _id: 'sub_math', name: 'Toán Học', code: 'MATH10' },
    teacher: { _id: 't_1', fullName: 'Thầy Nguyễn Văn Toán' },
  },
]

const mockAssignments = [
  {
    _id: 'asg_unsubmitted',
    teachingAssignment: mockTeachingAssignments[0],
    title: 'Bài tập 1: Phương trình bậc hai (Chưa nộp)',
    description: 'Giải các bài tập trong phiếu học tập số 1',
    dueDate: '2027-12-25T23:59:00.000Z',
    attachmentUrl: 'https://res.cloudinary.com/demo/raw/upload/v1/de-1.pdf',
    status: 'open',
  },
  {
    _id: 'asg_submitted_late',
    teachingAssignment: mockTeachingAssignments[0],
    title: 'Bài tập 2: Hệ phương trình (Đã nộp trễ hạn)',
    description: 'Hoàn thành bài tập chương 2',
    dueDate: '2026-10-10T23:59:00.000Z',
    attachmentUrl: '',
    status: 'open',
  },
  {
    _id: 'asg_graded',
    teachingAssignment: mockTeachingAssignments[0],
    title: 'Bài tập 3: Bất đẳng thức (Đã chấm điểm)',
    description: 'Chứng minh bất đẳng thức Cauchy',
    dueDate: '2026-11-01T23:59:00.000Z',
    attachmentUrl: '',
    status: 'locked',
  },
]

const mockSubmissionsMap = {
  asg_unsubmitted: null,
  asg_submitted_late: {
    _id: 'sub_2',
    assignment: 'asg_submitted_late',
    fileUrl: 'https://res.cloudinary.com/demo/raw/upload/v1/sub2.pdf',
    submittedAt: '2026-10-12T08:00:00.000Z',
    isLate: true,
    score: null,
    feedback: '',
  },
  asg_graded: {
    _id: 'sub_3',
    assignment: 'asg_graded',
    fileUrl: 'https://res.cloudinary.com/demo/raw/upload/v1/sub3.pdf',
    submittedAt: '2026-10-30T20:00:00.000Z',
    isLate: false,
    score: 9.5,
    feedback: 'Lời giải xuất sắc, trình bày rất chặt chẽ!',
  },
}

describe('StudentAssignmentPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: {
        _id: 'student_1',
        fullName: 'Em Lê Học Sinh',
        role: 'student',
        classRef: 'class_10a1',
        className: '10A1',
      },
      isAuthenticated: true,
    })

    academicApi.getAssignments.mockResolvedValue({
      data: mockTeachingAssignments,
    })
    assignmentApi.getAssignments.mockResolvedValue({
      data: mockAssignments,
    })
    assignmentApi.getMySubmission.mockImplementation((id) =>
      Promise.resolve({ data: mockSubmissionsMap[id] || null })
    )
  })

  it('hiển thị danh sách bài tập cùng đầy đủ 4 loại badge trạng thái: Chưa nộp, Đã nộp, Trễ hạn, Đã chấm', async () => {
    render(
      <MemoryRouter>
        <StudentAssignmentPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(
        screen.getByTestId('student-assignment-item-asg_unsubmitted')
      ).toBeInTheDocument()
      expect(
        screen.getByText('Bài tập 2: Hệ phương trình (Đã nộp trễ hạn)')
      ).toBeInTheDocument()
      expect(
        screen.getByText('Bài tập 3: Bất đẳng thức (Đã chấm điểm)')
      ).toBeInTheDocument()
    })

    // Kiểm tra đầy đủ 4 badge trạng thái trên danh sách
    await waitFor(() => {
      expect(
        screen.getByTestId('list-badge-unsubmitted-asg_unsubmitted')
      ).toHaveTextContent('Chưa nộp')
      expect(
        screen.getByTestId('list-badge-submitted-asg_submitted_late')
      ).toHaveTextContent('Đã nộp')
      expect(
        screen.getByTestId('list-badge-late-asg_submitted_late')
      ).toHaveTextContent('Trễ hạn')
      expect(
        screen.getByTestId('list-badge-graded-asg_graded')
      ).toHaveTextContent('Đã chấm (9.5/10)')
    })
  })

  it('cho phép học sinh upload file bài làm và nộp bài khi bài tập đang mở', async () => {
    assignmentApi.submitAssignment.mockResolvedValue({
      data: {
        _id: 'sub_new',
        assignment: 'asg_unsubmitted',
        fileUrl: 'https://res.cloudinary.com/demo/raw/upload/v1/bai-lam-em-A.pdf',
        submittedAt: '2026-11-17T10:00:00.000Z',
        isLate: false,
        score: null,
        feedback: '',
      },
    })

    render(
      <MemoryRouter>
        <StudentAssignmentPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('student-submit-form')).toBeInTheDocument()
    })

    // Upload file bài làm
    fireEvent.click(
      screen.getByRole('button', { name: /Giả lập Upload Bài Làm/i })
    )

    // Nhập ghi chú và bấm Nộp bài tập
    fireEvent.change(
      screen.getByPlaceholderText(
        /Nhập lời nhắn hoặc ghi chú về bài nộp của bạn/i
      ),
      { target: { value: 'Em xin nộp bài tập số 1 ạ' } }
    )

    fireEvent.click(screen.getByRole('button', { name: /Nộp bài tập/i }))

    await waitFor(() => {
      expect(assignmentApi.submitAssignment).toHaveBeenCalledWith(
        expect.objectContaining({
          assignment: 'asg_unsubmitted',
          fileUrl:
            'https://res.cloudinary.com/demo/raw/upload/v1/bai-lam-em-A.pdf',
          note: 'Em xin nộp bài tập số 1 ạ',
        })
      )
      // Sau khi nộp xong, badge trên bài tập 1 chuyển sang Đã nộp
      expect(
        screen.getByTestId('detail-badge-submitted-asg_unsubmitted')
      ).toHaveTextContent('Đã nộp')
    })
  })

  it('ẩn khu vực nộp bài khi bài tập đã bị khóa (status = locked) và hiển thị điểm kèm nhận xét sau khi được chấm', async () => {
    render(
      <MemoryRouter>
        <StudentAssignmentPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(
        screen.getByText('Bài tập 3: Bất đẳng thức (Đã chấm điểm)')
      ).toBeInTheDocument()
    })

    // Chọn bài tập 3 (đã khóa và đã được chấm điểm)
    fireEvent.click(screen.getByTestId('student-assignment-item-asg_graded'))

    await waitFor(() => {
      // Không hiển thị form nộp bài khi bài tập đã khóa
      expect(
        screen.queryByTestId('student-submit-form')
      ).not.toBeInTheDocument()
      expect(
        screen.getByTestId('locked-assignment-notice')
      ).toBeInTheDocument()

      // Hiển thị điểm và nhận xét của giáo viên
      expect(screen.getByTestId('graded-result-panel')).toBeInTheDocument()
      expect(screen.getByTestId('submission-score')).toHaveTextContent(
        'Điểm: 9.5 / 10'
      )
      expect(screen.getByTestId('submission-feedback')).toHaveTextContent(
        'Lời giải xuất sắc, trình bày rất chặt chẽ!'
      )
    })
  })
})
