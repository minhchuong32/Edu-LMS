import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { WeeklyTimetablePage } from '@/features/timetable/WeeklyTimetablePage'
import timetableApi from '@/api/timetableApi'

// Mock useAuth với biến động để test cả Student và Teacher
let currentMockUser = {
  _id: 'student_1',
  userId: 'student_1',
  fullName: 'Nguyễn Văn Học Sinh',
  role: 'student',
  className: '10A1',
  classRef: 'cls_10a1',
}

vi.mock('@/context/useAuth', () => ({
  useAuth: () => ({
    user: currentMockUser,
    isAuthenticated: true,
  }),
}))

vi.mock('@/api/timetableApi', () => ({
  default: {
    getMySchedule: vi.fn(),
    getClassTimetable: vi.fn(),
    getTeacherTimetable: vi.fn(),
    getTimetables: vi.fn(),
  },
}))

vi.mock('@/api/academicApi', () => ({
  default: {
    getClasses: vi.fn(),
    getTeachers: vi.fn(),
  },
}))

const mockTimetableData = {
  class: { _id: 'cls_10a1', name: '10A1', room: 'P101' },
  totalSlots: 2,
  slots: [
    {
      _id: 'slot_1',
      dayOfWeek: 2, // Thứ Hai
      period: 1, // Tiết 1
      academicYear: '2025-2026',
      semester: 'CaNam',
      class: { _id: 'cls_10a1', name: '10A1', room: 'P101' },
      subject: { _id: 'sub_toan', name: 'Toán học', code: 'TOAN' },
      teacher: { _id: 't_toan', fullName: 'Thầy Nguyễn Văn Toán', userCode: 'GV001' },
      room: 'P101',
      note: 'Chuẩn bị bài tập số 3',
    },
    {
      _id: 'slot_2',
      dayOfWeek: 3, // Thứ Ba
      period: 6, // Tiết 6 (Buổi chiều)
      academicYear: '2025-2026',
      semester: 'CaNam',
      class: { _id: 'cls_10a1', name: '10A1', room: 'P101' },
      subject: { _id: 'sub_van', name: 'Ngữ văn', code: 'VAN' },
      teacher: { _id: 't_van', fullName: 'Cô Trần Thị Văn', userCode: 'GV002' },
      room: 'P102',
    },
  ],
}

describe('WeeklyTimetablePage Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentMockUser = {
      _id: 'student_1',
      userId: 'student_1',
      fullName: 'Nguyễn Văn Học Sinh',
      role: 'student',
      className: '10A1',
      classRef: 'cls_10a1',
    }
  })

  it('1. Hiển thị dạng bảng lưới 7 ngày và đầy đủ 2 buổi sáng/chiều', async () => {
    timetableApi.getMySchedule.mockResolvedValue({
      data: { data: mockTimetableData },
    })

    render(<WeeklyTimetablePage />)

    // Chờ tải xong dữ liệu
    await waitFor(() => {
      expect(screen.getByText(/Thời khóa biểu lớp 10A1/i)).toBeInTheDocument()
    })

    // Kiểm tra đủ 7 ngày trong tuần
    expect(screen.getByText(/Thứ Hai/i)).toBeInTheDocument()
    expect(screen.getByText(/Thứ Ba/i)).toBeInTheDocument()
    expect(screen.getByText(/Thứ Tư/i)).toBeInTheDocument()
    expect(screen.getByText(/Thứ Năm/i)).toBeInTheDocument()
    expect(screen.getByText(/Thứ Sáu/i)).toBeInTheDocument()
    expect(screen.getByText(/Thứ Bảy/i)).toBeInTheDocument()
    expect(screen.getByText(/Chủ Nhật/i)).toBeInTheDocument()

    // Kiểm tra header 2 buổi
    expect(screen.getByText(/BUỔI SÁNG \(Tiết 1 đến Tiết 5\)/i)).toBeInTheDocument()
    expect(screen.getByText(/BUỔI CHIỀU \(Tiết 6 đến Tiết 10\)/i)).toBeInTheDocument()
  })

  it('2. Hiển thị thông tin tiết học: Môn học, Giáo viên, Lớp học, Tiết học', async () => {
    timetableApi.getMySchedule.mockResolvedValue({
      data: { data: mockTimetableData },
    })

    render(<WeeklyTimetablePage />)

    await waitFor(() => {
      expect(screen.getByText('Toán học')).toBeInTheDocument()
    })

    // Môn học
    expect(screen.getByText('Toán học')).toBeInTheDocument()
    expect(screen.getByText('Ngữ văn')).toBeInTheDocument()

    // Giáo viên
    expect(screen.getByText('Thầy Nguyễn Văn Toán')).toBeInTheDocument()
    expect(screen.getByText('Cô Trần Thị Văn')).toBeInTheDocument()

    // Lớp học
    const classLabels = screen.getAllByText('10A1')
    expect(classLabels.length).toBeGreaterThanOrEqual(1)

    // Phòng học
    expect(screen.getByText('P.P101')).toBeInTheDocument()
  })

  it('3. Chế độ xem Giáo viên: hiển thị lịch giảng dạy của bản thân', async () => {
    currentMockUser = {
      _id: 'teacher_1',
      userId: 'teacher_1',
      fullName: 'Cô Trần Thị Văn',
      role: 'teacher',
    }

    timetableApi.getMySchedule.mockResolvedValue({
      data: {
        data: {
          teacher: { fullName: 'Cô Trần Thị Văn' },
          totalSlots: 1,
          slots: [mockTimetableData.slots[1]],
        },
      },
    })

    render(<WeeklyTimetablePage />)

    await waitFor(() => {
      expect(screen.getByText(/Lịch giảng dạy - Cô Trần Thị Văn/i)).toBeInTheDocument()
    })

    expect(screen.getByText('Ngữ văn')).toBeInTheDocument()
    expect(timetableApi.getMySchedule).toHaveBeenCalled()
  })

  it('4. Chuyển đổi giữa các tuần: Tuần trước, Tuần sau, Hôm nay', async () => {
    timetableApi.getMySchedule.mockResolvedValue({
      data: { data: mockTimetableData },
    })

    render(<WeeklyTimetablePage />)

    await waitFor(() => {
      expect(screen.getByText(/Thời khóa biểu lớp 10A1/i)).toBeInTheDocument()
    })

    const prevButton = screen.getByTitle('Tuần trước')
    const nextButton = screen.getByTitle('Tuần sau')
    const currentWeekButton = screen.getByTitle('Quay lại tuần hiện tại')

    // Click tuần sau
    fireEvent.click(nextButton)
    // Click tuần trước
    fireEvent.click(prevButton)
    // Click quay lại hôm nay
    fireEvent.click(currentWeekButton)

    const todayLabels = screen.getAllByText(/Hôm nay/i)
    expect(todayLabels.length).toBeGreaterThanOrEqual(1)
  })

  it('5. Responsive trên mobile: có phần tử cuộn ngang và banner nhắc nhở', async () => {
    timetableApi.getMySchedule.mockResolvedValue({
      data: { data: mockTimetableData },
    })

    render(<WeeklyTimetablePage />)

    await waitFor(() => {
      expect(screen.getByText(/Thời khóa biểu lớp 10A1/i)).toBeInTheDocument()
    })

    // Banner nhắc vuốt ngang trên màn hình nhỏ
    expect(screen.getByText(/Vuốt ngang bảng để xem tất cả các ngày/i)).toBeInTheDocument()
  })

  it('6. Mở Modal hiển thị chi tiết khi nhấp vào một tiết học', async () => {
    timetableApi.getMySchedule.mockResolvedValue({
      data: { data: mockTimetableData },
    })

    render(<WeeklyTimetablePage />)

    await waitFor(() => {
      expect(screen.getByText('Toán học')).toBeInTheDocument()
    })

    // Nhấp vào tiết Toán học
    fireEvent.click(screen.getByText('Toán học'))

    // Modal xuất hiện
    await waitFor(() => {
      expect(screen.getByText('Chi tiết tiết học')).toBeInTheDocument()
    })

    expect(screen.getByText('Chuẩn bị bài tập số 3')).toBeInTheDocument()

    // Đóng Modal bằng nút 'Đóng'
    const closeButtons = screen.getAllByRole('button', { name: 'Đóng' })
    fireEvent.click(closeButtons[0])

    await waitFor(() => {
      expect(screen.queryByText('Chi tiết tiết học')).not.toBeInTheDocument()
    })
  })
})
