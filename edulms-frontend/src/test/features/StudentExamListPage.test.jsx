import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import StudentExamListPage from '@/features/student/StudentExamListPage'
import examApi from '@/api/examApi'

vi.mock('@/api/examApi', () => ({
  default: {
    getExams: vi.fn(),
    getExamById: vi.fn(),
  },
}))

const mockStudentExams = [
  {
    _id: 'exam_1',
    title: 'Kiểm tra 1 tiết Đại số',
    duration: 45,
    scoreWeight: 10,
    teachingAssignment: {
      class: { name: '10A1' },
      subject: { name: 'Toán học' },
    },
    questionIds: ['q_1', 'q_2'],
  },
]

const mockStudentExamDetail = {
  _id: 'exam_1',
  title: 'Kiểm tra 1 tiết Đại số',
  duration: 45,
  scoreWeight: 10,
  teachingAssignment: {
    class: { name: '10A1' },
    subject: { name: 'Toán học' },
  },
  questionIds: [
    {
      _id: 'q_1',
      chapter: 'Chương 1',
      content: 'Tập hợp các số tự nhiên ký hiệu là gì?',
      options: ['N', 'Z', 'Q', 'R'],
      // Lưu ý: Tuyệt đối không có correctIndex và explanation
    },
  ],
}

describe('StudentExamListPage Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    examApi.getExams.mockResolvedValue({
      data: { exams: mockStudentExams },
    })
    examApi.getExamById.mockResolvedValue({
      data: mockStudentExamDetail,
    })
  })

  it('hiển thị danh sách các đề kiểm tra đã phát hành cho học sinh', async () => {
    render(
      <MemoryRouter>
        <StudentExamListPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(
        screen.getByText('Kiểm tra 1 tiết Đại số')
      ).toBeInTheDocument()
    })

    expect(screen.getByText(/45 phút/i)).toBeInTheDocument()
    expect(screen.getByText(/2 câu hỏi/i)).toBeInTheDocument()
    expect(screen.getByText(/Toán học/i)).toBeInTheDocument()
  })

  it('mở đề kiểm tra và BẢO MẬT: KHÔNG hiển thị đáp án đúng cho học sinh', async () => {
    render(
      <MemoryRouter>
        <StudentExamListPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(
        screen.getByText('Kiểm tra 1 tiết Đại số')
      ).toBeInTheDocument()
    })

    const viewBtn = screen.getByRole('button', { name: /Xem đề & Làm bài/i })
    fireEvent.click(viewBtn)

    await waitFor(() => {
      expect(
        screen.getByText('Tập hợp các số tự nhiên ký hiệu là gì?')
      ).toBeInTheDocument()
    })

    // Các phương án hiển thị để học sinh chọn
    expect(screen.getByText('N')).toBeInTheDocument()
    expect(screen.getByText('Z')).toBeInTheDocument()
    expect(screen.getByText('Q')).toBeInTheDocument()
    expect(screen.getByText('R')).toBeInTheDocument()

    // Khẳng định không có bất kỳ highlight đáp án đúng hay correctIndex nào
    expect(screen.queryByText(/Đáp án đúng/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Lời giải/i)).not.toBeInTheDocument()
  })
})
