import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import Header from '@/components/common/Header'
import * as useAuthModule from '@/context/useAuth'
import notificationApi from '@/api/notificationApi'

vi.mock('@/context/useAuth')
vi.mock('@/api/notificationApi', () => ({
  default: {
    getMyNotifications: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
  },
}))

const mockNotificationsList = [
  {
    _id: 'notif_unread_1',
    recipient: 'student_01',
    type: 'assignment_created',
    title: 'Bài tập mới môn Toán học 10: Phương trình bậc hai',
    content:
      'Giáo viên vừa giao bài tập mới "Phương trình bậc hai" (Toán học 10). Hạn nộp: 20/12/2026.',
    link: '/student/assignments?assignmentId=assign_01',
    isRead: false,
    createdAt: '2026-11-26T09:00:00.000Z',
  },
  {
    _id: 'notif_unread_2',
    recipient: 'student_01',
    type: 'grade_created',
    title: 'Điểm mới môn Toán học 10: Điểm giữa kỳ',
    content:
      'Điểm giữa kỳ môn Toán học 10 (HK1) của bạn vừa có điểm mới: 9.0/10 điểm.',
    link: '/student/grades?semester=HK1',
    isRead: false,
    createdAt: '2026-11-26T08:30:00.000Z',
  },
  {
    _id: 'notif_read_3',
    recipient: 'student_01',
    type: 'system',
    title: 'Thông báo lịch học tuần mới',
    content: 'Thời khóa biểu tuần 12 đã được cập nhật trên hệ thống.',
    link: '/student/timetable',
    isRead: true,
    createdAt: '2026-11-25T15:00:00.000Z',
  },
]

const LocationDisplay = () => {
  const location = useLocation()
  return (
    <div data-testid="current-location-display">
      {location.pathname}
      {location.search}
    </div>
  )
}

const renderHeaderWithRouter = (initialEntry = '/student/dashboard') => {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Header />
      <LocationDisplay />
      <Routes>
        <Route path="*" element={<div />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('NotificationBell & Header Notification Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: {
        _id: 'student_01',
        userId: 'student_01',
        fullName: 'Nguyễn Minh Anh',
        role: 'student',
      },
      isAuthenticated: true,
      logout: vi.fn(),
    })

    notificationApi.getMyNotifications.mockResolvedValue({
      data: {
        notifications: mockNotificationsList,
        unreadCount: 2,
      },
    })
    notificationApi.markAsRead.mockResolvedValue({ data: { isRead: true } })
    notificationApi.markAllAsRead.mockResolvedValue({ data: null })
  })

  it('hiển thị icon chuông trên Header kèm badge số lượng thông báo chưa đọc', async () => {
    renderHeaderWithRouter()

    const bellButton = screen.getByTestId('notification-bell-button')
    expect(bellButton).toBeInTheDocument()

    await waitFor(() => {
      expect(
        screen.getByTestId('notification-unread-badge')
      ).toHaveTextContent('2')
    })
  })

  it('click vào chuông mở dropdown danh sách thông báo và phân biệt rõ thông báo đã đọc / chưa đọc', async () => {
    renderHeaderWithRouter()

    await waitFor(() => {
      expect(
        screen.getByTestId('notification-unread-badge')
      ).toHaveTextContent('2')
    })

    // Ban đầu dropdown chưa mở
    expect(
      screen.queryByTestId('notification-dropdown-panel')
    ).not.toBeInTheDocument()

    // Click vào chuông để mở dropdown
    fireEvent.click(screen.getByTestId('notification-bell-button'))

    expect(
      screen.getByTestId('notification-dropdown-panel')
    ).toBeInTheDocument()
    expect(
      screen.getByTestId('dropdown-unread-count-pill')
    ).toHaveTextContent('2 chưa đọc')

    // Kiểm tra phân biệt trạng thái chưa đọc (unread) và đã đọc (read)
    const unreadItem1 = screen.getByTestId('notification-item-notif_unread_1')
    const readItem3 = screen.getByTestId('notification-item-notif_read_3')

    expect(unreadItem1).toHaveAttribute('data-read-status', 'unread')
    expect(
      screen.getByTestId('notification-status-label-notif_unread_1')
    ).toHaveTextContent('Chưa đọc')
    expect(
      screen.getByTestId('notification-unread-dot-notif_unread_1')
    ).toBeInTheDocument()

    expect(readItem3).toHaveAttribute('data-read-status', 'read')
    expect(
      screen.getByTestId('notification-status-label-notif_read_3')
    ).toHaveTextContent('Đã đọc')
    expect(
      screen.queryByTestId('notification-unread-dot-notif_read_3')
    ).not.toBeInTheDocument()

    // Kiểm tra bộ lọc tab "Chưa đọc"
    fireEvent.click(screen.getByTestId('filter-notifications-unread'))
    expect(
      screen.getByTestId('notification-item-notif_unread_1')
    ).toBeInTheDocument()
    expect(
      screen.queryByTestId('notification-item-notif_read_3')
    ).not.toBeInTheDocument()
  })

  it('click vào thông báo chưa đọc: tự động đánh dấu đã đọc, giảm số badge chưa đọc và điều hướng đến nội dung liên quan theo link', async () => {
    renderHeaderWithRouter('/student/dashboard')

    await waitFor(() => {
      expect(
        screen.getByTestId('notification-unread-badge')
      ).toHaveTextContent('2')
    })

    // Mở dropdown
    fireEvent.click(screen.getByTestId('notification-bell-button'))

    // Click vào thông báo bài tập mới (notif_unread_1 -> link: /student/assignments?assignmentId=assign_01)
    fireEvent.click(screen.getByTestId('notification-item-notif_unread_1'))

    await waitFor(() => {
      expect(notificationApi.markAsRead).toHaveBeenCalledWith('notif_unread_1')
    })

    // Badge số lượng chưa đọc giảm từ 2 xuống 1
    expect(screen.getByTestId('notification-unread-badge')).toHaveTextContent(
      '1'
    )

    // Đã điều hướng tới đúng link của thông báo và tự động đóng dropdown
    expect(
      screen.getByTestId('current-location-display')
    ).toHaveTextContent('/student/assignments?assignmentId=assign_01')
    expect(
      screen.queryByTestId('notification-dropdown-panel')
    ).not.toBeInTheDocument()
  })

  it('hỗ trợ đánh dấu tất cả thông báo là đã đọc và ẩn badge khi không còn thông báo chưa đọc', async () => {
    renderHeaderWithRouter()

    await waitFor(() => {
      expect(
        screen.getByTestId('notification-unread-badge')
      ).toHaveTextContent('2')
    })

    fireEvent.click(screen.getByTestId('notification-bell-button'))
    fireEvent.click(screen.getByTestId('mark-all-notifications-read-btn'))

    await waitFor(() => {
      expect(notificationApi.markAllAsRead).toHaveBeenCalledTimes(1)
    })

    // Badge đỏ biến mất khi unreadCount === 0
    expect(
      screen.queryByTestId('notification-unread-badge')
    ).not.toBeInTheDocument()
    expect(
      screen.getByTestId('dropdown-unread-count-pill')
    ).toHaveTextContent('0 chưa đọc')
  })
})

