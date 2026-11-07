import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { StudentLessonViewerPage } from '@/features/student/StudentLessonViewerPage'
import lessonApi from '@/api/lessonApi'
import academicApi from '@/api/academicApi'

// Mock useAuth
const mockStudentUser = {
  _id: 'student_10a1_1',
  userId: 'student_10a1_1',
  fullName: 'Nguyễn Văn Học Sinh',
  role: 'student',
  className: '10A1',
  classRef: 'class_10a1_id',
  email: 'student1@edulms.test',
}

vi.mock('@/context/useAuth', () => ({
  useAuth: () => ({
    user: mockStudentUser,
    isAuthenticated: true,
  }),
}))

// Mock API
vi.mock('@/api/academicApi', () => ({
  default: {
    getAssignments: vi.fn(),
    getClasses: vi.fn(),
  },
}))

vi.mock('@/api/lessonApi', () => ({
  default: {
    getLessonsByClassAndSubject: vi.fn(),
    getLessons: vi.fn(),
  },
}))

// Dữ liệu mẫu môn học và phân công lớp 10A1
const mockAssignments = [
  {
    _id: 'assignment_toan_10a1',
    academicYear: '2025-2026',
    semester: 'CaNam',
    class: { _id: 'class_10a1_id', name: '10A1' },
    subject: { _id: 'subject_toan_id', name: 'Toán học', code: 'TOAN' },
    teacher: { _id: 'teacher_toan', fullName: 'Thầy Nguyễn Văn Toán' },
  },
  {
    _id: 'assignment_ly_10a1',
    academicYear: '2025-2026',
    semester: 'CaNam',
    class: { _id: 'class_10a1_id', name: '10A1' },
    subject: { _id: 'subject_ly_id', name: 'Vật lí', code: 'LY' },
    teacher: { _id: 'teacher_ly', fullName: 'Cô Phạm Thị Lý' },
  },
]

// Dữ liệu mẫu bài giảng Toán 10
const mockLessonsMath = [
  {
    _id: 'lesson_math_1',
    title: 'Bài 1: Mệnh đề và tập hợp',
    description: 'Nắm vững các phép toán trên tập hợp và mệnh đề kéo theo.',
    contentType: 'video',
    resourceUrl: 'https://res.cloudinary.com/demo/video/upload/menh-de.mp4',
    order: 1,
    isActive: true,
    createdAt: '2026-11-01T08:00:00Z',
  },
  {
    _id: 'lesson_math_2',
    title: 'Bài 2: Bất phương trình bậc nhất hai ẩn',
    description: 'Học lý thuyết và giải các bài toán biểu diễn miền nghiệm.',
    contentType: 'pdf',
    resourceUrl: 'https://res.cloudinary.com/demo/raw/upload/bat-phuong-trinh.pdf',
    order: 2,
    isActive: true,
    createdAt: '2026-11-02T08:00:00Z',
  },
  {
    _id: 'lesson_math_3',
    title: 'Bài 3: Hệ bất phương trình bậc nhất hai ẩn',
    description: 'Tài liệu bài trình chiếu tổng hợp kiến thức trọng tâm.',
    contentType: 'slide',
    resourceUrl: 'https://res.cloudinary.com/demo/raw/upload/he-bpt.pptx',
    order: 3,
    isActive: true,
    createdAt: '2026-11-03T08:00:00Z',
  },
]

// Dữ liệu mẫu bài giảng Vật lí 10
const mockLessonsPhysics = [
  {
    _id: 'lesson_ly_1',
    title: 'Bài 1: Chuyển động thẳng đều',
    description: 'Khái niệm vận tốc, quãng đường và phương trình chuyển động.',
    contentType: 'video',
    resourceUrl: 'https://res.cloudinary.com/demo/video/upload/chuyen-dong.mp4',
    order: 1,
    isActive: true,
    createdAt: '2026-11-01T09:00:00Z',
  },
]

describe('StudentLessonViewerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    academicApi.getAssignments.mockResolvedValue({
      data: mockAssignments,
    })
    academicApi.getClasses.mockResolvedValue({
      data: [{ _id: 'class_10a1_id', name: '10A1' }],
    })
    lessonApi.getLessonsByClassAndSubject.mockImplementation(({ subjectId }) => {
      if (subjectId === 'subject_toan_id') {
        return Promise.resolve({
          data: {
            teachingAssignment: mockAssignments[0],
            lessons: mockLessonsMath,
          },
        })
      }
      return Promise.resolve({
        data: {
          teachingAssignment: mockAssignments[1],
          lessons: mockLessonsPhysics,
        },
      })
    })
  })

  it('1. Hiển thị danh sách môn học, lớp của học sinh và tự động chọn bài học đầu tiên', async () => {
    render(
      <MemoryRouter>
        <StudentLessonViewerPage />
      </MemoryRouter>
    )

    // Chờ tải xong giao diện và kiểm tra tiêu đề trang cùng badge lớp học
    await waitFor(() => {
      expect(screen.getByText('Bài Học Trực Tuyến')).toBeInTheDocument()
    })
    expect(screen.getAllByText(/10A1/i).length).toBeGreaterThan(0)

    // Kiểm tra hiển thị các môn học trong lớp
    expect(screen.getAllByText('Toán học').length).toBeGreaterThan(0)
    expect(screen.getByText('Vật lí')).toBeInTheDocument()

    // Chờ tải danh sách bài học môn Toán
    await waitFor(() => {
      expect(screen.getAllByText('Bài 1: Mệnh đề và tập hợp').length).toBeGreaterThan(0)
      expect(screen.getByText('Bài 2: Bất phương trình bậc nhất hai ẩn')).toBeInTheDocument()
      expect(screen.getByText('Bài 3: Hệ bất phương trình bậc nhất hai ẩn')).toBeInTheDocument()
    })

    // Kiểm tra bài học đầu tiên (Video) được tự động chọn và hiển thị ở cột phải
    expect(screen.getByText('Nắm vững các phép toán trên tập hợp và mệnh đề kéo theo.')).toBeInTheDocument()
    expect(screen.getAllByText('GV: Thầy Nguyễn Văn Toán').length).toBeGreaterThan(0)
    expect(screen.getByText('Đang phát video bài giảng')).toBeInTheDocument()
  })

  it('2. Hiển thị HTML5 Video Player cho bài giảng dạng video và xử lý lỗi phát video', async () => {
    render(
      <MemoryRouter>
        <StudentLessonViewerPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getAllByText('Bài 1: Mệnh đề và tập hợp').length).toBeGreaterThan(0)
    })

    // Kiểm tra thẻ video HTML5
    const videoElement = document.querySelector('video')
    expect(videoElement).toBeInTheDocument()
    expect(videoElement).toHaveAttribute('controls')

    // Mô phỏng video gặp lỗi tải nguồn
    fireEvent.error(videoElement)

    // Kiểm tra hiển thị thông báo lỗi và các nút xử lý
    expect(
      screen.getByText('Không thể phát video trực tiếp trên trình duyệt')
    ).toBeInTheDocument()
    expect(screen.getByText('Thử tải lại')).toBeInTheDocument()
    expect(screen.getByText('Mở video tab mới')).toBeInTheDocument()
  })

  it('3. Chuyển đổi bài giảng và hiển thị PDF Viewer cùng nút Tải về', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <StudentLessonViewerPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Bài 2: Bất phương trình bậc nhất hai ẩn')).toBeInTheDocument()
    })

    // Nhấp vào bài 2 (PDF)
    await user.click(screen.getByText('Bài 2: Bất phương trình bậc nhất hai ẩn'))

    // Kiểm tra hiển thị iframe xem PDF và nút tải về
    await waitFor(() => {
      expect(screen.getByTitle('Bài 2: Bất phương trình bậc nhất hai ẩn')).toBeInTheDocument()
      expect(screen.getByText('Tài liệu PDF trực tuyến')).toBeInTheDocument()
      expect(screen.getByText('Tải về PDF')).toBeInTheDocument()
      expect(screen.getByText('Toàn màn hình')).toBeInTheDocument()
    })
  })

  it('4. Hiển thị File Card cho tài liệu trình chiếu Slide (PPTX)', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <StudentLessonViewerPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Bài 3: Hệ bất phương trình bậc nhất hai ẩn')).toBeInTheDocument()
    })

    // Nhấp vào bài 3 (Slide)
    await user.click(screen.getByText('Bài 3: Hệ bất phương trình bậc nhất hai ẩn'))

    // Kiểm tra File Card hiển thị định dạng và nút tải về
    await waitFor(() => {
      expect(screen.getByText('PPTX')).toBeInTheDocument()
      expect(screen.getByText('Tài nguyên học tập đính kèm')).toBeInTheDocument()
      expect(screen.getByText('Tải xuống')).toBeInTheDocument()
      expect(screen.getByText('Mở tệp')).toBeInTheDocument()
    })
  })

  it('5. Điều hướng bài học qua nút Bài trước / Bài sau', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <StudentLessonViewerPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getAllByText('Bài 1: Mệnh đề và tập hợp').length).toBeGreaterThan(0)
    })

    const prevButton = screen.getByTitle('Bài trước')
    const nextButton = screen.getByTitle('Bài tiếp theo')

    // Ở bài 1: Nút Bài trước bị disabled
    expect(prevButton).toBeDisabled()
    expect(nextButton).not.toBeDisabled()

    // Bấm nút Bài sau -> chuyển sang Bài 2
    await user.click(nextButton)
    await waitFor(() => {
      expect(screen.getByTitle('Bài 2: Bất phương trình bậc nhất hai ẩn')).toBeInTheDocument()
    })

    // Bấm nút Bài trước -> quay lại Bài 1
    await user.click(prevButton)
    await waitFor(() => {
      expect(document.querySelector('video')).toBeInTheDocument()
    })
  })

  it('6. Chuyển sang môn học khác và cập nhật danh sách bài giảng', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <StudentLessonViewerPage />
      </MemoryRouter>
    )

    // Chờ tải xong môn học và bài giảng ban đầu (Toán học)
    await waitFor(() => {
      expect(screen.getAllByText('Bài 1: Mệnh đề và tập hợp').length).toBeGreaterThan(0)
      expect(screen.getByText('Vật lí')).toBeInTheDocument()
    })

    // Bấm chọn môn Vật lí
    await user.click(screen.getByText('Vật lí'))

    // Kiểm tra bài giảng môn Vật lí hiển thị
    await waitFor(() => {
      expect(
        screen.getAllByText('Bài 1: Chuyển động thẳng đều').length
      ).toBeGreaterThan(0)
      expect(
        screen.getByText('Khái niệm vận tốc, quãng đường và phương trình chuyển động.')
      ).toBeInTheDocument()
      expect(screen.getAllByText('GV: Cô Phạm Thị Lý').length).toBeGreaterThan(0)
    })
  })

  it('7. Tìm kiếm bài giảng theo tên trong môn học', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <StudentLessonViewerPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getAllByText('Bài 1: Mệnh đề và tập hợp').length).toBeGreaterThan(0)
    })

    const searchInput = screen.getByPlaceholderText('Tìm tên bài học...')
    await user.type(searchInput, 'Hệ bất phương trình')

    // Bài 3 xuất hiện trong danh sách kết quả tìm kiếm
    expect(screen.getByText('Bài 3: Hệ bất phương trình bậc nhất hai ẩn')).toBeInTheDocument()
    // Bài 2 bị lọc khỏi danh sách kết quả
    expect(screen.queryByText('Bài 2: Bất phương trình bậc nhất hai ẩn')).not.toBeInTheDocument()
  })

  it('8. Bảo mật RBAC: Không hiển thị bất kỳ nút quản trị nào của Giáo viên/Admin', async () => {
    render(
      <MemoryRouter>
        <StudentLessonViewerPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getAllByText('Bài 1: Mệnh đề và tập hợp').length).toBeGreaterThan(0)
    })

    // Đảm bảo không có các nút tạo, sửa, xóa bài giảng
    expect(screen.queryByText('Thêm bài giảng')).not.toBeInTheDocument()
    expect(screen.queryByText('Chỉnh sửa')).not.toBeInTheDocument()
    expect(screen.queryByText('Xóa bài giảng')).not.toBeInTheDocument()
    expect(screen.queryByText('Lưu thứ tự')).not.toBeInTheDocument()
  })

  it('9. Hiển thị thông báo khi lớp học sinh chưa có môn học nào', async () => {
    academicApi.getAssignments.mockResolvedValueOnce({ data: [] })

    render(
      <MemoryRouter>
        <StudentLessonViewerPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(
        screen.getByText('Chưa có môn học nào được phân công')
      ).toBeInTheDocument()
    })
  })
})
