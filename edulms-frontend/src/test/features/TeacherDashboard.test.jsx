import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TeacherDashboard } from '@/features/teacher/TeacherDashboard'
import AuthContext from '@/context/authContext'
import academicApi from '@/api/academicApi'

vi.mock('@/api/academicApi', () => ({
  default: {
    getTeacherDashboardStats: vi.fn(),
    getTeacherSchedule: vi.fn(),
    getAssignments: vi.fn(),
  },
}))

vi.mock('@/api/assignmentApi', () => ({
  default: {
    getAssignments: vi.fn(),
  },
}))

vi.mock('@/api/gradebookApi', () => ({
  default: {
    getGradeRecords: vi.fn(),
  },
}))

const mockTeacherUser = {
  _id: 'teacher_01',
  userId: 'teacher_01',
  fullName: 'Thầy Nguyễn Văn A',
  role: 'teacher',
  email: 'teacher_a@edulms.vn',
}

const mockDashboardPayload = {
  data: {
    teacherId: 'teacher_01',
    classesOverview: [
      {
        _id: 'homeroom_c1',
        classId: 'c1',
        className: '10A1',
        room: 'P.201',
        capacity: 45,
        studentCount: 42,
        roleType: 'homeroom',
        roleLabel: 'Lớp Chủ nhiệm (GVCN)',
        subjectName: 'Chủ nhiệm lớp',
        subjectCode: 'GVCN',
        academicYear: '2025-2026',
        teacherId: 'teacher_01',
      },
      {
        _id: 'ta_subject_c2',
        teachingAssignmentId: 'ta_subject_c2',
        classId: 'c2',
        className: '10A2',
        room: 'P.202',
        capacity: 45,
        studentCount: 40,
        roleType: 'subject_teacher',
        roleLabel: 'Lớp Giảng dạy Bộ môn',
        subjectName: 'Toán học 10',
        subjectCode: 'MATH10',
        academicYear: '2025-2026',
        teacherId: 'teacher_01',
      },
      {
        // Dữ liệu của giáo viên khác (kiểm thử lọc phân quyền ở Frontend)
        _id: 'ta_other_teacher',
        teachingAssignmentId: 'ta_other_teacher',
        classId: 'c99',
        className: '12C9',
        room: 'P.399',
        capacity: 45,
        studentCount: 38,
        roleType: 'subject_teacher',
        roleLabel: 'Lớp Giảng dạy Bộ môn',
        subjectName: 'Vật lý 12',
        subjectCode: 'PHY12',
        academicYear: '2025-2026',
        teacherId: 'teacher_99_unauthorized',
      },
    ],
    pendingAssignments: [
      {
        _id: 'assign_01',
        title: 'Bài tập Phương trình bậc hai',
        dueDate: '2026-04-25T23:59:00.000Z',
        status: 'open',
        className: '10A2',
        subjectName: 'Toán học 10',
        teachingAssignmentId: 'ta_subject_c2',
        totalSubmissions: 35,
        ungradedCount: 8,
        lateCount: 2,
        teacherId: 'teacher_01',
      },
      {
        // Bài tập của giáo viên khác
        _id: 'assign_unauthorized',
        title: 'Bài tập Dao động cơ (Giáo viên khác)',
        dueDate: '2026-04-28T23:59:00.000Z',
        status: 'open',
        className: '12C9',
        subjectName: 'Vật lý 12',
        teachingAssignmentId: 'ta_other_teacher',
        totalSubmissions: 20,
        ungradedCount: 5,
        lateCount: 0,
        teacherId: 'teacher_99_unauthorized',
      },
    ],
    studentAlerts: [
      {
        _id: 'alert_low_01',
        studentId: 'st_01',
        studentName: 'Trần Minh Hoàng',
        userCode: 'HS1001',
        className: '10A2',
        subjectName: 'Toán học 10',
        alertType: 'low_grade',
        alertLabel: 'Điểm kém (< 3.5)',
        severity: 'high',
        averageScore: 3.1,
        detail: 'ĐTB môn Toán học 10: 3.1/10 (Dưới mức đạt 5.0)',
        teacherId: 'teacher_01',
      },
      {
        _id: 'alert_low_02',
        studentId: 'st_02',
        studentName: 'Lê Thu Hà',
        userCode: 'HS1002',
        className: '10A1',
        subjectName: 'Toán học 10',
        alertType: 'low_grade',
        alertLabel: 'Điểm yếu (< 5.0)',
        severity: 'medium',
        averageScore: 4.4,
        detail: 'ĐTB môn Toán học 10: 4.4/10 (Dưới mức đạt 5.0)',
        teacherId: 'teacher_01',
      },
      {
        // Cảnh báo học sinh thuộc lớp của giáo viên khác
        _id: 'alert_unauth_99',
        studentId: 'st_99',
        studentName: 'Phạm Quốc Bảo (Lớp khác)',
        userCode: 'HS1299',
        className: '12C9',
        subjectName: 'Vật lý 12',
        alertType: 'low_grade',
        alertLabel: 'Điểm kém (< 3.5)',
        severity: 'high',
        averageScore: 3.2,
        detail: 'ĐTB môn Vật lý 12: 3.2/10',
        teacherId: 'teacher_99_unauthorized',
      },
    ],
  },
}

const renderTeacherDashboard = (user = mockTeacherUser) => {
  return render(
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: true,
        isLoading: false,
      }}
    >
      <MemoryRouter>
        <TeacherDashboard />
      </MemoryRouter>
    </AuthContext.Provider>
  )
}

describe('TeacherDashboard Feature Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    academicApi.getTeacherDashboardStats.mockResolvedValue(mockDashboardPayload)
  })

  it('hiển thị tổng quan các lớp chủ nhiệm và lớp giảng dạy kèm sĩ số học sinh', async () => {
    renderTeacherDashboard()

    await waitFor(() => {
      expect(
        screen.getByTestId('class-overview-card-homeroom_c1')
      ).toBeInTheDocument()
    })

    // Kiểm tra lớp chủ nhiệm 10A1 và lớp giảng dạy 10A2
    expect(
      screen.getByTestId('class-overview-card-homeroom_c1')
    ).toHaveTextContent('Lớp 10A1')
    expect(screen.getByTestId('class-size-homeroom_c1')).toHaveTextContent(
      '42 / 45 học sinh'
    )

    expect(
      screen.getByTestId('class-overview-card-ta_subject_c2')
    ).toHaveTextContent('Lớp 10A2 • Toán học 10')
    expect(screen.getByTestId('class-size-ta_subject_c2')).toHaveTextContent(
      '40 / 45 học sinh'
    )

    // Kiểm tra bộ lọc vai trò lớp (Lớp Chủ nhiệm vs Lớp Bộ môn)
    fireEvent.click(screen.getByTestId('filter-class-homeroom'))
    expect(
      screen.getByTestId('class-overview-card-homeroom_c1')
    ).toBeInTheDocument()
    expect(
      screen.queryByTestId('class-overview-card-ta_subject_c2')
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId('filter-class-subject'))
    expect(
      screen.queryByTestId('class-overview-card-homeroom_c1')
    ).not.toBeInTheDocument()
    expect(
      screen.getByTestId('class-overview-card-ta_subject_c2')
    ).toBeInTheDocument()
  })

  it('hiển thị danh sách bài tập cần chấm với số lượng bài chờ chấm và nộp trễ', async () => {
    renderTeacherDashboard()

    await waitFor(() => {
      expect(
        screen.getByTestId('pending-assignment-item-assign_01')
      ).toBeInTheDocument()
    })

    expect(
      screen.getByTestId('pending-assignment-item-assign_01')
    ).toHaveTextContent('Bài tập Phương trình bậc hai')
    expect(screen.getByTestId('ungraded-badge-assign_01')).toHaveTextContent(
      '8 bài chờ chấm'
    )
    expect(
      screen.getByTestId('pending-grading-count-stat')
    ).toHaveTextContent('8 bài nộp')
  })

  it('hiển thị cảnh báo học sinh điểm thấp (< 5.0) và hỗ trợ lọc theo mức độ điểm thấp', async () => {
    renderTeacherDashboard()

    await waitFor(() => {
      expect(
        screen.getByTestId('student-alert-item-alert_low_01')
      ).toBeInTheDocument()
    })

    expect(
      screen.getByTestId('student-alert-item-alert_low_01')
    ).toHaveTextContent('Trần Minh Hoàng')
    expect(
      screen.getByTestId('student-alert-item-alert_low_01')
    ).toHaveTextContent('3.1/10')

    expect(
      screen.getByTestId('student-alert-item-alert_low_02')
    ).toHaveTextContent('Lê Thu Hà')
    expect(
      screen.getByTestId('student-alert-item-alert_low_02')
    ).toHaveTextContent('4.4/10')

    // Lọc chỉ xem cảnh báo Điểm kém (< 3.5)
    const filterSelect = screen.getByTestId('alert-severity-filter')
    fireEvent.change(filterSelect, { target: { value: 'high' } })

    expect(
      screen.getByTestId('student-alert-item-alert_low_01')
    ).toBeInTheDocument()
    expect(
      screen.queryByTestId('student-alert-item-alert_low_02')
    ).not.toBeInTheDocument()

    // Lọc chỉ xem cảnh báo Điểm yếu (3.5 - < 5.0)
    fireEvent.change(filterSelect, { target: { value: 'medium' } })
    expect(
      screen.queryByTestId('student-alert-item-alert_low_01')
    ).not.toBeInTheDocument()
    expect(
      screen.getByTestId('student-alert-item-alert_low_02')
    ).toBeInTheDocument()
  })

  it('kiểm tra phân quyền dữ liệu: chỉ hiển thị lớp, bài tập và cảnh báo thuộc phạm vi Giáo viên được phép truy cập', async () => {
    renderTeacherDashboard()

    await waitFor(() => {
      expect(screen.getByTestId('stat-total-classes')).toHaveTextContent(
        '2 lớp'
      )
    })

    // Lớp 12C9, bài tập và cảnh báo của giáo viên khác (teacher_99_unauthorized) phải bị loại bỏ hoàn toàn
    expect(
      screen.queryByTestId('class-overview-card-ta_other_teacher')
    ).not.toBeInTheDocument()
    expect(screen.queryByText(/Lớp 12C9/i)).not.toBeInTheDocument()
    expect(
      screen.queryByTestId('pending-assignment-item-assign_unauthorized')
    ).not.toBeInTheDocument()
    expect(
      screen.queryByTestId('student-alert-item-alert_unauth_99')
    ).not.toBeInTheDocument()
  })
})
