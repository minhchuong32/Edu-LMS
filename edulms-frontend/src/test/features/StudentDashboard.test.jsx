import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { StudentDashboard } from '@/features/student/StudentDashboard'
import AuthContext from '@/context/authContext'
import academicApi from '@/api/academicApi'

vi.mock('@/api/academicApi', () => ({
  default: {
    getStudentDashboardStats: vi.fn(),
  },
}))

vi.mock('@/api/assignmentApi', () => ({
  default: {
    getAssignments: vi.fn(),
  },
}))

vi.mock('@/api/examApi', () => ({
  default: {
    getExams: vi.fn(),
  },
}))

vi.mock('@/api/gradebookApi', () => ({
  default: {
    getGradeRecords: vi.fn(),
  },
}))

const mockStudentUser = {
  _id: 'student_01',
  userId: 'student_01',
  fullName: 'Nguyễn Minh Anh',
  userCode: 'HS1001',
  role: 'student',
  className: '10A1',
}

const mockStudentDashboardPayload = {
  data: {
    studentId: 'student_01',
    studentProfile: {
      _id: 'student_01',
      fullName: 'Nguyễn Minh Anh',
      userCode: 'HS1001',
      className: '10A1',
    },
    gpaOverview: {
      currentGPA: 8.4,
      academicPerformance: 'Giỏi',
      subjectAverages: [
        {
          subjectId: 'sub_math',
          subjectName: 'Toán học 10',
          subjectCode: 'MATH10',
          average: 8.8,
          studentId: 'student_01',
        },
        {
          subjectId: 'sub_lit',
          subjectName: 'Ngữ văn 10',
          subjectCode: 'LIT10',
          average: 8.0,
          studentId: 'student_01',
        },
        {
          // Bản ghi điểm của học sinh khác (kiểm thử lọc quyền dữ liệu cá nhân)
          subjectId: 'sub_other_student',
          subjectName: 'Hóa học (Học sinh khác)',
          subjectCode: 'CHEM10',
          average: 9.5,
          studentId: 'student_99_other',
        },
      ],
    },
    assignmentProgress: {
      totalAssignments: 3,
      submittedCount: 1,
      pendingInTimeCount: 1,
      overdueUnsubmittedCount: 1,
      completionRate: 33,
      items: [
        {
          _id: 'assign_submitted_1',
          studentId: 'student_01',
          title: 'Bài tập Hàm số bậc hai',
          subjectName: 'Toán học 10',
          dueDate: '2026-12-10T23:59:00.000Z',
          hasSubmitted: true,
          isOverdue: false,
          submissionCategory: 'submitted',
          score: 9.0,
        },
        {
          _id: 'assign_pending_2',
          studentId: 'student_01',
          title: 'Bài nghị luận xã hội Học kỳ 1',
          subjectName: 'Ngữ văn 10',
          dueDate: '2026-12-20T23:59:00.000Z',
          hasSubmitted: false,
          isOverdue: false,
          submissionCategory: 'pending_in_time',
          score: null,
        },
        {
          _id: 'assign_overdue_3',
          studentId: 'student_01',
          title: 'Bài tập Vectơ trong mặt phẳng',
          subjectName: 'Toán học 10',
          dueDate: '2026-01-10T23:59:00.000Z',
          hasSubmitted: false,
          isOverdue: true,
          submissionCategory: 'overdue',
          score: null,
        },
        {
          // Bài tập gắn studentId của học sinh khác
          _id: 'assign_other_student',
          studentId: 'student_99_other',
          title: 'Bài tập riêng của học sinh khác',
          subjectName: 'Vật lý 10',
          dueDate: '2026-12-25T23:59:00.000Z',
          hasSubmitted: false,
          isOverdue: false,
          submissionCategory: 'pending_in_time',
        },
      ],
    },
    upcomingExams: [
      {
        _id: 'exam_upcoming_01',
        studentId: 'student_01',
        title: 'Kiểm tra 45 phút Đại số Chương 2',
        subjectName: 'Toán học 10',
        duration: 45,
        totalQuestions: 25,
        isCompleted: false,
        attemptScore: null,
      },
      {
        _id: 'exam_completed_02',
        studentId: 'student_01',
        title: 'Kiểm tra 15 phút Tiếng Việt',
        subjectName: 'Ngữ văn 10',
        duration: 15,
        totalQuestions: 10,
        isCompleted: true,
        attemptScore: 8.5,
      },
      {
        // Đề thi của học sinh khác
        _id: 'exam_other_student_99',
        studentId: 'student_99_other',
        title: 'Đề kiểm tra của học sinh khác',
        subjectName: 'Sinh học 10',
        duration: 30,
        totalQuestions: 20,
        isCompleted: false,
      },
    ],
  },
}

const renderStudentDashboard = (user = mockStudentUser) => {
  return render(
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: true,
        isLoading: false,
      }}
    >
      <MemoryRouter>
        <StudentDashboard />
      </MemoryRouter>
    </AuthContext.Provider>
  )
}

describe('StudentDashboard Feature Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    academicApi.getStudentDashboardStats.mockResolvedValue(
      mockStudentDashboardPayload
    )
  })

  it('hiển thị Card điểm trung bình hiện tại (GPA), xếp loại học lực và điểm trung bình từng môn', async () => {
    renderStudentDashboard()

    await waitFor(() => {
      expect(
        screen.getByTestId('student-current-gpa-value')
      ).toHaveTextContent('8.4')
    })

    expect(
      screen.getByTestId('student-gpa-performance-badge')
    ).toHaveTextContent('Học lực: Giỏi')

    const subjectList = screen.getByTestId('student-subject-averages-list')
    expect(subjectList).toHaveTextContent('Toán học 10')
    expect(subjectList).toHaveTextContent('8.8')
    expect(subjectList).toHaveTextContent('Ngữ văn 10')
    expect(subjectList).toHaveTextContent('8.0')
  })

  it('hiển thị tiến độ bài tập và phân biệt rõ bài Đã nộp, Chưa nộp & Còn hạn, và Quá hạn', async () => {
    renderStudentDashboard()

    await waitFor(() => {
      expect(
        screen.getByTestId('assignment-completion-rate')
      ).toHaveTextContent('33%')
    })

    expect(
      screen.getByTestId('stat-assignments-submitted')
    ).toHaveTextContent('1 bài')
    expect(
      screen.getByTestId('stat-assignments-pending-in-time')
    ).toHaveTextContent('1 bài')
    expect(screen.getByTestId('stat-assignments-overdue')).toHaveTextContent(
      '1 bài'
    )

    // Kiểm tra nhãn phân biệt 3 trạng thái bài tập
    expect(
      screen.getByTestId('assignment-status-badge-assign_submitted_1')
    ).toHaveTextContent('Đã nộp • 9/10 điểm')
    expect(
      screen.getByTestId('assignment-status-badge-assign_pending_2')
    ).toHaveTextContent('Chưa nộp • Còn hạn')
    expect(
      screen.getByTestId('assignment-status-badge-assign_overdue_3')
    ).toHaveTextContent('Chưa nộp • Quá hạn')

    // Kiểm tra bộ lọc tab bài tập
    fireEvent.click(screen.getByTestId('filter-assignments-pending-in-time'))
    expect(
      screen.getByTestId('student-assignment-item-assign_pending_2')
    ).toBeInTheDocument()
    expect(
      screen.queryByTestId('student-assignment-item-assign_submitted_1')
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId('filter-assignments-submitted'))
    expect(
      screen.getByTestId('student-assignment-item-assign_submitted_1')
    ).toBeInTheDocument()
    expect(
      screen.queryByTestId('student-assignment-item-assign_pending_2')
    ).not.toBeInTheDocument()
  })

  it('hiển thị danh sách lịch kiểm tra sắp tới và hỗ trợ lọc bài sắp thi / đã hoàn thành', async () => {
    renderStudentDashboard()

    await waitFor(() => {
      expect(
        screen.getByTestId('upcoming-exam-item-exam_upcoming_01')
      ).toBeInTheDocument()
    })

    expect(
      screen.getByTestId('upcoming-exam-item-exam_upcoming_01')
    ).toHaveTextContent('Kiểm tra 45 phút Đại số Chương 2')
    expect(
      screen.getByTestId('exam-status-badge-exam_upcoming_01')
    ).toHaveTextContent('Sắp tới • Chưa làm bài')

    expect(
      screen.getByTestId('upcoming-exam-item-exam_completed_02')
    ).toHaveTextContent('Kiểm tra 15 phút Tiếng Việt')
    expect(
      screen.getByTestId('exam-status-badge-exam_completed_02')
    ).toHaveTextContent('Đã hoàn thành • 8.5/10')

    // Lọc chỉ xem các bài kiểm tra Sắp thi / Chưa làm
    fireEvent.click(screen.getByTestId('filter-exams-upcoming'))
    expect(
      screen.getByTestId('upcoming-exam-item-exam_upcoming_01')
    ).toBeInTheDocument()
    expect(
      screen.queryByTestId('upcoming-exam-item-exam_completed_02')
    ).not.toBeInTheDocument()
  })

  it('kiểm tra quyền truy cập dữ liệu cá nhân: chỉ hiển thị dữ liệu của học sinh đang đăng nhập', async () => {
    renderStudentDashboard()

    await waitFor(() => {
      expect(
        screen.getByTestId('student-personal-scope-badge')
      ).toHaveTextContent('Dữ liệu cá nhân: Nguyễn Minh Anh')
    })

    // Các bản ghi điểm, bài tập và lịch kiểm tra của học sinh khác (student_99_other) phải bị lọc bỏ
    expect(
      screen.queryByText(/Hóa học \(Học sinh khác\)/i)
    ).not.toBeInTheDocument()
    expect(
      screen.queryByTestId('student-assignment-item-assign_other_student')
    ).not.toBeInTheDocument()
    expect(
      screen.queryByTestId('upcoming-exam-item-exam_other_student_99')
    ).not.toBeInTheDocument()
  })
})

