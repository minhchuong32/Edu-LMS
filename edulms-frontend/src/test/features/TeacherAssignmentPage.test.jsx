import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import TeacherAssignmentPage from '@/features/teacher/TeacherAssignmentPage'
import * as useAuthModule from '@/context/useAuth'
import academicApi from '@/api/academicApi'
import assignmentApi from '@/api/assignmentApi'

vi.mock('@/context/useAuth')
vi.mock('@/api/academicApi', () => ({
  default: {
    getTeacherSchedule: vi.fn(),
    getAssignments: vi.fn(),
  },
}))
vi.mock('@/api/assignmentApi', () => ({
  default: {
    getAssignments: vi.fn(),
    createAssignment: vi.fn(),
    updateAssignment: vi.fn(),
    deleteAssignment: vi.fn(),
    updateAssignmentStatus: vi.fn(),
  },
}))
vi.mock('@/components/teacher/FileUploadManager', () => ({
  default: ({ title, onUploadSuccess }) => (
    <div data-testid="file-upload-manager">
      <span>{title}</span>
      <button
        type="button"
        onClick={() =>
          onUploadSuccess([
            {
              name: 'De-bai-chuong-1.pdf',
              url: 'https://res.cloudinary.com/demo/raw/upload/v1/de-bai-chuong-1.pdf',
              publicId: 'edulms/documents/de-bai-chuong-1',
              resourceType: 'raw',
            },
          ])
        }
      >
        Giả lập Upload File Đề Bài
      </button>
    </div>
  ),
}))

const mockTeachingAssignments = [
  {
    _id: 'ta_1',
    class: { _id: 'c_1', name: '10A1' },
    subject: { _id: 's_1', name: 'Toán Học', code: 'MATH10' },
    academicYear: '2025-2026',
    semester: 'HK1',
  },
  {
    _id: 'ta_2',
    class: { _id: 'c_2', name: '11B2' },
    subject: { _id: 's_2', name: 'Vật Lý', code: 'PHYS11' },
    academicYear: '2025-2026',
    semester: 'HK1',
  },
]

const mockAssignments = [
  {
    _id: 'hw_1',
    teachingAssignment: 'ta_1',
    title: 'Bài tập Chương 1: Mệnh đề và Tập hợp',
    description: 'Làm bài 1 đến bài 5 trang 20 SGK',
    dueDate: '2026-12-20T23:59:00.000Z',
    attachmentUrl: 'https://res.cloudinary.com/demo/raw/upload/v1/bt-chuong-1.pdf',
    attachments: [
      {
        name: 'bt-chuong-1.pdf',
        url: 'https://res.cloudinary.com/demo/raw/upload/v1/bt-chuong-1.pdf',
      },
    ],
    status: 'open',
  },
  {
    _id: 'hw_2',
    teachingAssignment: 'ta_1',
    title: 'Bài kiểm tra 15 phút số 1',
    description: 'Trắc nghiệm kết hợp tự luận',
    dueDate: '2026-12-15T17:00:00.000Z',
    attachmentUrl: '',
    attachments: [],
    status: 'locked',
  },
]

describe('TeacherAssignmentPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: { _id: 'teacher_1', fullName: 'Thầy Nguyễn Văn A', role: 'teacher' },
      isAuthenticated: true,
    })
    academicApi.getTeacherSchedule.mockResolvedValue({
      data: mockTeachingAssignments,
    })
    assignmentApi.getAssignments.mockResolvedValue({
      data: mockAssignments,
    })
  })

  it('hiển thị danh sách Lớp - Môn được phân công, danh sách bài tập đã giao và trạng thái Đang mở / Đã khóa', async () => {
    render(
      <MemoryRouter>
        <TeacherAssignmentPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(
        screen.getByText('Bài tập Chương 1: Mệnh đề và Tập hợp')
      ).toBeInTheDocument()
      expect(screen.getByText('Bài kiểm tra 15 phút số 1')).toBeInTheDocument()
    })

    // Kiểm tra hiển thị badge trạng thái Đang mở và Đã khóa
    expect(screen.getByTestId('status-badge-hw_1')).toHaveTextContent('Đang mở')
    expect(screen.getByTestId('status-badge-hw_2')).toHaveTextContent('Đã khóa')

    // Kiểm tra hiển thị file đính kèm
    expect(screen.getByText('bt-chuong-1.pdf')).toBeInTheDocument()
  })

  it('mở form tạo bài tập, chọn hạn nộp trên Date Picker, upload file đề bài và tạo bài tập thành công', async () => {
    assignmentApi.createAssignment.mockResolvedValue({
      data: {
        _id: 'hw_new',
        title: 'Bài tập Hàm số bậc hai',
        status: 'open',
      },
    })

    render(
      <MemoryRouter>
        <TeacherAssignmentPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Tạo bài tập mới')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /tạo bài tập mới/i }))

    // Điền tiêu đề và nội dung yêu cầu
    fireEvent.change(
      screen.getByPlaceholderText(
        /Ví dụ: Bài tập về nhà Chương 1 - Hàm số bậc hai/i
      ),
      { target: { value: 'Bài tập Hàm số bậc hai' } }
    )

    fireEvent.change(
      screen.getByPlaceholderText(
        /Nhập hướng dẫn làm bài, yêu cầu định dạng nộp bài/i
      ),
      { target: { value: 'Giải chi tiết và nộp file PDF' } }
    )

    // Chọn hạn nộp qua Date Picker
    const datePicker = screen.getByTestId('due-date-picker')
    fireEvent.change(datePicker, { target: { value: '2026-12-25T23:59' } })
    expect(datePicker.value).toBe('2026-12-25T23:59')

    // Upload file đề bài
    fireEvent.click(
      screen.getByRole('button', { name: /Giả lập Upload File Đề Bài/i })
    )

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /Giao bài tập/i }))

    await waitFor(() => {
      expect(assignmentApi.createAssignment).toHaveBeenCalledWith(
        expect.objectContaining({
          teachingAssignment: 'ta_1',
          title: 'Bài tập Hàm số bậc hai',
          description: 'Giải chi tiết và nộp file PDF',
          attachmentUrl:
            'https://res.cloudinary.com/demo/raw/upload/v1/de-bai-chuong-1.pdf',
          status: 'open',
        })
      )
    })
  })

  it('cho phép giáo viên khóa hoặc mở lại nhận bài trực tiếp trên danh sách', async () => {
    assignmentApi.updateAssignmentStatus.mockResolvedValue({
      data: { ...mockAssignments[0], status: 'locked' },
    })

    render(
      <MemoryRouter>
        <TeacherAssignmentPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(
        screen.getByText('Bài tập Chương 1: Mệnh đề và Tập hợp')
      ).toBeInTheDocument()
    })

    // Ban đầu hw_1 đang mở -> có nút "Khóa nhận bài"
    const lockBtn = screen.getByRole('button', { name: /Khóa nhận bài/i })
    fireEvent.click(lockBtn)

    await waitFor(() => {
      expect(assignmentApi.updateAssignmentStatus).toHaveBeenCalledWith(
        'hw_1',
        'locked'
      )
      expect(screen.getByTestId('status-badge-hw_1')).toHaveTextContent(
        'Đã khóa'
      )
    })
  })
})

