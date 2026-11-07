import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { TeacherLessonListPage } from '@/features/teacher/TeacherLessonListPage'
import lessonApi from '@/api/lessonApi'
import academicApi from '@/api/academicApi'

// Mock Auth Context
const mockTeacherUser = {
  _id: 'teacher_123',
  userId: 'teacher_123',
  fullName: 'Thầy Nguyễn Văn A',
  role: 'teacher',
  email: 'teacher@edulms.edu.vn',
}

vi.mock('@/context/useAuth', () => ({
  useAuth: () => ({
    user: mockTeacherUser,
    isAuthenticated: true,
  }),
}))

// Mock API
vi.mock('@/api/academicApi', () => ({
  default: {
    getTeacherSchedule: vi.fn(),
  },
}))

vi.mock('@/api/lessonApi', () => ({
  default: {
    getLessons: vi.fn(),
    createLesson: vi.fn(),
    updateLesson: vi.fn(),
    deleteLesson: vi.fn(),
    reorderLessons: vi.fn(),
    uploadMedia: vi.fn(),
    deleteLessonFile: vi.fn(),
    replaceLessonFile: vi.fn(),
    addLessonFile: vi.fn(),
    deleteUploadedMedia: vi.fn(),
  },
}))

const mockAssignments = [
  {
    _id: 'assignment_1',
    academicYear: '2025-2026',
    semester: 'HK1',
    class: { _id: 'class_1', name: '10A1', room: 'P.101' },
    subject: { _id: 'subject_1', name: 'Toán học', code: 'TOAN10' },
  },
  {
    _id: 'assignment_2',
    academicYear: '2025-2026',
    semester: 'HK1',
    class: { _id: 'class_2', name: '10A2', room: 'P.102' },
    subject: { _id: 'subject_2', name: 'Vật lý', code: 'LY10' },
  },
]

const mockLessons = [
  {
    _id: 'lesson_1',
    title: 'Bài 1: Mệnh đề và Tập hợp',
    description: 'Khái niệm mở đầu chương 1',
    contentType: 'video',
    resourceUrl: 'https://res.cloudinary.com/demo/video.mp4',
    order: 1,
    isActive: true,
    createdAt: '2026-11-01T08:00:00Z',
  },
  {
    _id: 'lesson_2',
    title: 'Bài 2: Bất phương trình bậc nhất hai ẩn',
    description: 'Tài liệu lý thuyết và bài tập',
    contentType: 'pdf',
    resourceUrl: 'https://res.cloudinary.com/demo/tailieu.pdf',
    order: 2,
    isActive: true,
    createdAt: '2026-11-02T08:00:00Z',
  },
]

describe('TeacherLessonListPage Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    academicApi.getTeacherSchedule.mockResolvedValue({ data: mockAssignments })
    lessonApi.getLessons.mockResolvedValue({ data: mockLessons })
  })

  it('render tiêu đề và danh sách phân công lớp học của giáo viên', async () => {
    render(
      <MemoryRouter>
        <TeacherLessonListPage />
      </MemoryRouter>
    )

    // Kiểm tra tiêu đề chính
    expect(screen.getByText('Quản lý bài giảng & Nội dung học tập')).toBeInTheDocument()

    // Chờ danh sách phân công xuất hiện
    await waitFor(() => {
      expect(screen.getByText('Toán học')).toBeInTheDocument()
      expect(screen.getByText('Vật lý')).toBeInTheDocument()
      expect(screen.getByText('Lớp 10A1')).toBeInTheDocument()
      expect(screen.getByText('Lớp 10A2')).toBeInTheDocument()
    })
  })

  it('hiển thị danh sách bài giảng với đầy đủ thông tin: tên, loại, thứ tự, ngày tạo', async () => {
    render(
      <MemoryRouter>
        <TeacherLessonListPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Toán học')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByText('Bài 1: Mệnh đề và Tập hợp')).toBeInTheDocument()
      expect(screen.getByText('Bài 2: Bất phương trình bậc nhất hai ẩn')).toBeInTheDocument()
      expect(screen.getByText('#1')).toBeInTheDocument()
      expect(screen.getByText('#2')).toBeInTheDocument()
      expect(screen.getAllByText('Video bài giảng').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Tài liệu PDF').length).toBeGreaterThan(0)
    }, { timeout: 4000 })
  })

  it('lọc danh sách bài giảng theo từ khóa tìm kiếm', async () => {
    render(
      <MemoryRouter>
        <TeacherLessonListPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Bài 1: Mệnh đề và Tập hợp')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('Tìm kiếm bài giảng theo tên, mô tả...')
    fireEvent.change(searchInput, { target: { value: 'Bất phương trình' } })

    expect(screen.getByText('Bài 2: Bất phương trình bậc nhất hai ẩn')).toBeInTheDocument()
    expect(screen.queryByText('Bài 1: Mệnh đề và Tập hợp')).not.toBeInTheDocument()
  })

  it('mở modal tạo bài giảng mới và đóng modal thành công', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <TeacherLessonListPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Thêm bài giảng mới')).toBeInTheDocument()
    })

    // Mở modal
    await user.click(screen.getByText('Thêm bài giảng mới'))

    expect(screen.getByRole('heading', { name: 'Thêm bài giảng mới' })).toBeInTheDocument()
    expect(screen.getByLabelText(/Tiêu đề bài giảng/)).toBeInTheDocument()

    // Bấm nút Hủy bỏ
    await user.click(screen.getByText('Hủy bỏ'))

    expect(screen.queryByRole('heading', { name: 'Thêm bài giảng mới' })).not.toBeInTheDocument()
  })

  it('mở modal xác nhận xóa bài giảng và gọi API delete', async () => {
    const user = userEvent.setup()
    lessonApi.deleteLesson.mockResolvedValue({ success: true })

    render(
      <MemoryRouter>
        <TeacherLessonListPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Bài 1: Mệnh đề và Tập hợp')).toBeInTheDocument()
    })

    // Tìm các nút xóa
    const deleteButtons = screen.getAllByLabelText('Xóa')
    await user.click(deleteButtons[0])

    // Kiểm tra hộp thoại xác nhận xóa xuất hiện
    expect(screen.getByText('Xóa bài giảng?')).toBeInTheDocument()
    expect(screen.getAllByText(/Bài 1: Mệnh đề và Tập hợp/).length).toBeGreaterThan(0)

    // Bấm nút xác nhận xóa
    await user.click(screen.getByText('Xác nhận xóa'))

    await waitFor(() => {
      expect(lessonApi.deleteLesson).toHaveBeenCalledWith('lesson_1')
    })
  })

  it('hiển thị trạng thái empty khi giáo viên chưa được phân công lớp nào', async () => {
    academicApi.getTeacherSchedule.mockResolvedValue({ data: [] })

    render(
      <MemoryRouter>
        <TeacherLessonListPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Chưa có phân công giảng dạy')).toBeInTheDocument()
      expect(screen.queryByText('Thêm bài giảng mới')).not.toBeInTheDocument()
    })
  })

  it('nhúng video bài giảng YouTube và tạo bài giảng thành công', async () => {
    const user = userEvent.setup()
    lessonApi.createLesson.mockResolvedValue({
      data: {
        _id: 'new_video_lesson',
        title: 'Video Bài Giảng Toán 10',
        contentType: 'video',
        resourceUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=0&rel=0&modestbranding=1',
      },
    })

    render(
      <MemoryRouter>
        <TeacherLessonListPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Thêm bài giảng mới')).toBeInTheDocument()
    })

    // Mở modal tạo bài giảng
    await user.click(screen.getByText('Thêm bài giảng mới'))

    // Nhập tiêu đề
    const titleInput = screen.getByLabelText(/Tiêu đề bài giảng/)
    await user.type(titleInput, 'Video Bài Giảng Toán 10')

    // Chọn loại nội dung video
    const typeSelect = screen.getByLabelText(/Loại nội dung/)
    await user.selectOptions(typeSelect, 'video')

    // Nhập đường dẫn YouTube
    const ytInput = screen.getByLabelText(/Đường dẫn Video YouTube/)
    fireEvent.change(ytInput, { target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' } })

    // Kiểm tra hiển thị iframe preview
    await waitFor(() => {
      expect(screen.getByTitle('YouTube Preview - dQw4w9WgXcQ')).toBeInTheDocument()
    })

    // Bấm nút Tạo bài giảng
    const saveButton = screen.getByRole('button', { name: /Tạo bài giảng/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(lessonApi.createLesson).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Video Bài Giảng Toán 10',
          contentType: 'video',
          resourceUrl: expect.stringContaining('dQw4w9WgXcQ'),
        })
      )
    })
  })

  it('cho phép giáo viên click trực tiếp vào ô bài học để mở giao diện chỉnh sửa', async () => {
    render(
      <MemoryRouter>
        <TeacherLessonListPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Bài 1: Mệnh đề và Tập hợp')).toBeInTheDocument()
    })

    // Click trực tiếp vào ô/thẻ bài học
    const lessonCards = screen.getAllByTitle('Nhấp vào thẻ bài học để chỉnh sửa', {
      exact: false,
    })
    fireEvent.click(lessonCards[0])

    // Modal chỉnh sửa phải được mở ra
    expect(screen.getByRole('heading', { name: 'Chỉnh sửa bài giảng' })).toBeInTheDocument()
    expect(screen.getByDisplayValue('Bài 1: Mệnh đề và Tập hợp')).toBeInTheDocument()
  })

  it('hiển thị đầy đủ tệp đính kèm trong bài học và cho phép thao tác xóa tệp', async () => {
    const user = userEvent.setup()
    lessonApi.deleteLessonFile.mockResolvedValue({ success: true })

    render(
      <MemoryRouter>
        <TeacherLessonListPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Bài 2: Bất phương trình bậc nhất hai ẩn')).toBeInTheDocument()
    })

    // Click vào thẻ Bài 2 (dạng pdf)
    const cards = screen.getAllByTitle('Nhấp vào thẻ bài học để chỉnh sửa', { exact: false })
    fireEvent.click(cards[1])

    expect(screen.getByRole('heading', { name: 'Chỉnh sửa bài giảng' })).toBeInTheDocument()

    // Phải hiển thị tệp đính kèm hiện có của bài học
    await waitFor(() => {
      expect(screen.getByText(/Tệp bài giảng hiện có/)).toBeInTheDocument()
      expect(screen.getByText('tailieu.pdf')).toBeInTheDocument()
      expect(screen.getAllByText('Mở xem').length).toBeGreaterThan(0)
      expect(screen.getByText('Thay thế')).toBeInTheDocument()
    })

    // Click nút xóa tệp
    const deleteFileBtn = screen.getByLabelText('Xóa tệp tailieu.pdf')
    await user.click(deleteFileBtn)

    await waitFor(() => {
      expect(lessonApi.deleteLessonFile).toHaveBeenCalledWith('lesson_2', expect.anything())
    })
  })
})
