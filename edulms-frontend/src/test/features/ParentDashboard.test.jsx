import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ParentDashboard } from '@/features/parent/ParentDashboard'
import AuthContext from '@/context/authContext'
import parentApi from '@/api/parentApi'

vi.mock('@/api/parentApi', () => ({
  default: {
    getLinkedChildren: vi.fn(),
    getChildOverview: vi.fn(),
    getChildGrades: vi.fn(),
    getChildNotifications: vi.fn(),
  },
}))

vi.mock('@/api/gradebookApi', () => ({
  default: {
    getGradeRecords: vi.fn(),
  },
}))

const mockParentMultiUser = {
  _id: 'parent_01',
  userId: 'parent_01',
  fullName: 'Ông Trần Văn Phụ Huynh',
  role: 'parent',
  email: 'parent01@edulms.vn',
  childrenRefs: ['child_01', 'child_02'],
}

const mockParentSingleUser = {
  _id: 'parent_02',
  userId: 'parent_02',
  fullName: 'Bà Lê Thị Mai',
  role: 'parent',
  email: 'parent02@edulms.vn',
  childrenRefs: ['child_01'],
}

const mockChild1Summary = {
  _id: 'child_01',
  fullName: 'Trần Bảo Ngọc',
  userCode: 'HS1001',
  email: 'ngoc@edulms.vn',
  className: '10A1',
  room: 'P.101',
  academicYear: '2025-2026',
  homeroomTeacher: {
    _id: 'gv_01',
    fullName: 'Cô Lê Thị Lan',
    email: 'lan@edulms.vn',
  },
  currentGPA: 8.8,
  academicPerformance: 'Giỏi',
}

const mockChild2Summary = {
  _id: 'child_02',
  fullName: 'Trần Bảo Nam',
  userCode: 'HS1202',
  email: 'nam@edulms.vn',
  className: '12B2',
  room: 'P.302',
  academicYear: '2025-2026',
  homeroomTeacher: {
    _id: 'gv_02',
    fullName: 'Thầy Phạm Quốc Hùng',
    email: 'hung@edulms.vn',
  },
  currentGPA: 7.4,
  academicPerformance: 'Khá',
}

const mockChild1Overview = {
  data: {
    student: mockChild1Summary,
    grades: {
      currentGPA: 8.8,
      academicPerformance: 'Giỏi',
      subjects: [
        {
          subjectId: 'sub_math_10',
          subjectName: 'Toán học 10',
          subjectCode: 'MATH10',
          teacherName: 'Cô Lê Thị Lan',
          average: 9.0,
          academicPerformance: 'Xuất sắc',
          records: [
            { _id: 'r1', gradeType: 'oral', value: 9.0, weight: 1 },
            { _id: 'r2', gradeType: 'midterm', value: 9.0, weight: 2 },
          ],
        },
        {
          subjectId: 'sub_lit_10',
          subjectName: 'Ngữ văn 10',
          subjectCode: 'LIT10',
          teacherName: 'Cô Nguyễn Thu Thủy',
          average: 8.6,
          academicPerformance: 'Giỏi',
          records: [{ _id: 'r3', gradeType: 'final', value: 8.6, weight: 3 }],
        },
      ],
    },
    notifications: [
      {
        _id: 'notif_c1_1',
        type: 'assignment_graded',
        title: 'Đã có điểm chấm bài: Bài tập Hàm số bậc hai',
        message:
          'Bài nộp của Trần Bảo Ngọc đã được chấm 9.5/10 điểm. Nhận xét: Bài làm rất tốt!',
        sender: { fullName: 'Cô Lê Thị Lan', role: 'teacher' },
        metadata: { score: 9.5, feedback: 'Bài làm rất tốt!' },
        createdAt: '2026-11-20T09:30:00.000Z',
      },
      {
        _id: 'notif_c1_2',
        type: 'system',
        title: 'Thông báo họp Phụ huynh Học kỳ 1',
        message: 'Nhà trường kính mời Quý Phụ huynh lớp 10A1 dự họp vào sáng Chủ nhật.',
        sender: { fullName: 'Ban Giám hiệu Nhà trường', role: 'admin' },
        createdAt: '2026-11-18T08:00:00.000Z',
      },
    ],
  },
}

const mockChild2Overview = {
  data: {
    student: mockChild2Summary,
    grades: {
      currentGPA: 7.4,
      academicPerformance: 'Khá',
      subjects: [
        {
          subjectId: 'sub_phys_12',
          subjectName: 'Vật lý 12',
          subjectCode: 'PHY12',
          teacherName: 'Thầy Phạm Quốc Hùng',
          average: 7.4,
          academicPerformance: 'Khá',
          records: [
            { _id: 'r4', gradeType: '45min', value: 7.0, weight: 2 },
            { _id: 'r5', gradeType: 'final', value: 7.6, weight: 3 },
          ],
        },
      ],
    },
    notifications: [
      {
        _id: 'notif_c2_1',
        type: 'assignment_created',
        title: 'Bài tập mới: Dao động điều hòa và Sóng cơ',
        message: 'Giáo viên Vật lý 12 đã giao bài tập ôn tập chương 1 và chương 2.',
        sender: { fullName: 'Thầy Phạm Quốc Hùng', role: 'teacher' },
        createdAt: '2026-11-22T14:00:00.000Z',
      },
    ],
  },
}

const renderParentPortal = (user = mockParentMultiUser) => {
  return render(
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: true,
        isLoading: false,
      }}
    >
      <MemoryRouter>
        <ParentDashboard />
      </MemoryRouter>
    </AuthContext.Provider>
  )
}

describe('Parent Portal (ParentDashboard) Feature Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    parentApi.getLinkedChildren.mockResolvedValue({
      data: {
        children: [mockChild1Summary, mockChild2Summary],
      },
    })

    parentApi.getChildOverview.mockImplementation((studentId) => {
      if (studentId === 'child_02') {
        return Promise.resolve(mockChild2Overview)
      }
      return Promise.resolve(mockChild1Overview)
    })

    parentApi.getChildNotifications.mockImplementation((studentId) => {
      if (studentId === 'child_02') {
        return Promise.resolve({
          data: {
            notifications: mockChild2Overview.data.notifications,
          },
        })
      }
      return Promise.resolve({
        data: {
          notifications: mockChild1Overview.data.notifications,
        },
      })
    })
  })

  it('hiển thị dropdown chọn học sinh khi Parent có nhiều học sinh, và ẩn dropdown khi chỉ có 1 học sinh', async () => {
    // 1. Trường hợp Parent có 2 học sinh -> Hiển thị Dropdown chọn học sinh
    const { unmount } = renderParentPortal(mockParentMultiUser)

    await waitFor(() => {
      expect(
        screen.getByTestId('parent-child-select-dropdown')
      ).toBeInTheDocument()
    })

    expect(
      screen.getByTestId('parent-linked-count-badge')
    ).toHaveTextContent('Học sinh liên kết: 2')
    unmount()

    // 2. Trường hợp Parent chỉ có 1 học sinh -> Không cần hiển thị Dropdown chọn học sinh
    parentApi.getLinkedChildren.mockResolvedValueOnce({
      data: {
        children: [mockChild1Summary],
      },
    })

    renderParentPortal(mockParentSingleUser)

    await waitFor(() => {
      expect(screen.getByTestId('selected-child-name')).toHaveTextContent(
        'Học sinh: Trần Bảo Ngọc'
      )
    })

    expect(
      screen.queryByTestId('parent-child-select-dropdown')
    ).not.toBeInTheDocument()
  })

  it('khi chuyển đổi học sinh trên dropdown, cập nhật chính xác thông tin học sinh, dữ liệu Điểm số và Thông báo tương ứng', async () => {
    renderParentPortal(mockParentMultiUser)

    // Mặc định hiển thị học sinh thứ 1: Trần Bảo Ngọc (Lớp 10A1, GPA 8.8)
    await waitFor(() => {
      expect(screen.getByTestId('selected-child-gpa')).toHaveTextContent(
        '8.8 / 10'
      )
    })

    expect(screen.getByTestId('selected-child-name')).toHaveTextContent(
      'Học sinh: Trần Bảo Ngọc'
    )
    expect(screen.getByTestId('selected-child-class')).toHaveTextContent(
      'Lớp: 10A1'
    )
    expect(
      screen.getByTestId('parent-grade-row-sub_math_10')
    ).toHaveTextContent('Toán học 10')

    // Chuyển sang học sinh thứ 2: Trần Bảo Nam (child_02 - Lớp 12B2, GPA 7.4)
    const selectDropdown = screen.getByTestId('parent-child-select-dropdown')
    fireEvent.change(selectDropdown, { target: { value: 'child_02' } })

    await waitFor(() => {
      expect(screen.getByTestId('selected-child-gpa')).toHaveTextContent(
        '7.4 / 10'
      )
    })

    expect(screen.getByTestId('selected-child-name')).toHaveTextContent(
      'Học sinh: Trần Bảo Nam'
    )
    expect(screen.getByTestId('selected-child-class')).toHaveTextContent(
      'Lớp: 12B2'
    )
    expect(
      screen.getByTestId('parent-grade-row-sub_phys_12')
    ).toHaveTextContent('Vật lý 12')
    expect(
      screen.queryByTestId('parent-grade-row-sub_math_10')
    ).not.toBeInTheDocument()

    // Chuyển sang Tab "Thông báo" để kiểm tra thông báo của Trần Bảo Nam
    fireEvent.click(screen.getByTestId('parent-tab-notifications'))

    await waitFor(() => {
      expect(
        screen.getByTestId('parent-notification-item-notif_c2_1')
      ).toBeInTheDocument()
    })

    expect(
      screen.getByTestId('parent-notification-item-notif_c2_1')
    ).toHaveTextContent('Bài tập mới: Dao động điều hòa và Sóng cơ')
    expect(
      screen.queryByTestId('parent-notification-item-notif_c1_1')
    ).not.toBeInTheDocument()
  })

  it('hiển thị đầy đủ 2 tab Điểm số (bảng desktop & thẻ mobile responsive) và Thông báo từ nhà trường/giáo viên', async () => {
    renderParentPortal(mockParentMultiUser)

    await waitFor(() => {
      expect(screen.getByTestId('parent-grades-table')).toBeInTheDocument()
    })

    // Kiểm tra bảng điểm Desktop & danh sách thẻ Mobile responsive đều được render sẵn sàng
    expect(screen.getByTestId('parent-grades-tab-panel')).toBeInTheDocument()
    expect(
      screen.getByTestId('parent-grades-mobile-cards')
    ).toBeInTheDocument()
    expect(
      screen.getByTestId('parent-table-overall-gpa')
    ).toHaveTextContent('8.8')

    // Chuyển sang Tab Thông báo
    fireEvent.click(screen.getByTestId('parent-tab-notifications'))

    await waitFor(() => {
      expect(
        screen.getByTestId('parent-notifications-tab-panel')
      ).toBeInTheDocument()
    })

    expect(
      screen.getByTestId('parent-notification-item-notif_c1_1')
    ).toHaveTextContent('Đã có điểm chấm bài: Bài tập Hàm số bậc hai')
    expect(
      screen.getByTestId('parent-notification-item-notif_c1_2')
    ).toHaveTextContent('Thông báo họp Phụ huynh Học kỳ 1')
  })

  it('đảm bảo chế độ chỉ đọc (Read-only): không hiển thị các nút Thêm, Sửa, Xóa hay Lưu điểm và lọc bỏ học sinh ngoài childrenRefs', async () => {
    // Giả lập API trả kèm 1 học sinh lạ (unlinked_99) không nằm trong user.childrenRefs
    parentApi.getLinkedChildren.mockResolvedValueOnce({
      data: {
        children: [
          mockChild1Summary,
          mockChild2Summary,
          {
            _id: 'unlinked_99',
            fullName: 'Học Sinh Lạ Ngoài Danh Sách',
            userCode: 'HS9999',
            className: '11C5',
          },
        ],
      },
    })

    renderParentPortal(mockParentMultiUser)

    await waitFor(() => {
      expect(screen.getByTestId('parent-readonly-badge')).toHaveTextContent(
        'Chế độ chỉ đọc (Read-only)'
      )
    })

    // Học sinh lạ không thuộc childrenRefs phải bị lọc bỏ khỏi dropdown
    expect(
      screen.queryByText(/Học Sinh Lạ Ngoài Danh Sách/i)
    ).not.toBeInTheDocument()

    // Không có bất kỳ nút Thêm / Sửa / Xóa / Lưu điểm nào trên giao diện Parent
    expect(
      screen.queryByRole('button', {
        name: /thêm|chỉnh sửa|sửa điểm|xóa|lưu bảng điểm|nhập điểm/i,
      })
    ).not.toBeInTheDocument()
  })

  it('xử lý chính xác các trạng thái Empty state và Error state khi tải dữ liệu', async () => {
    // 1. Empty state khi Phụ huynh chưa được liên kết học sinh nào
    parentApi.getLinkedChildren.mockResolvedValueOnce({
      data: { children: [] },
    })

    const { unmount } = renderParentPortal({
      ...mockParentMultiUser,
      childrenRefs: [],
    })

    await waitFor(() => {
      expect(
        screen.getByTestId('parent-no-children-empty')
      ).toBeInTheDocument()
    })
    unmount()

    // 2. Error state khi API gặp lỗi
    parentApi.getLinkedChildren.mockRejectedValueOnce(
      new Error('Lỗi kết nối máy chủ Cổng Phụ huynh')
    )

    renderParentPortal(mockParentMultiUser)

    await waitFor(() => {
      expect(screen.getByTestId('parent-portal-error')).toHaveTextContent(
        'Lỗi kết nối máy chủ Cổng Phụ huynh'
      )
    })
  })
})
