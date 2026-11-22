import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import StudentExamListPage from '@/features/student/StudentExamListPage'
import examApi from '@/api/examApi'

vi.mock('@/api/examApi', () => ({
  default: {
    getExams: vi.fn(),
    getExamById: vi.fn(),
    submitExam: vi.fn(),
    getExamResult: vi.fn(),
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
    hasSubmitted: false,
  },
  {
    _id: 'exam_2',
    title: 'Kiểm tra 15 phút Hình học',
    duration: 15,
    scoreWeight: 10,
    teachingAssignment: {
      class: { name: '10A1' },
      subject: { name: 'Hình học' },
    },
    questionIds: ['q_3'],
    hasSubmitted: true,
    attempt: {
      score: 10,
    },
  },
]

const mockStudentExamDetail = {
  _id: 'exam_1',
  title: 'Kiểm tra 1 tiết Đại số',
  duration: 45,
  scoreWeight: 10,
  hasSubmitted: false,
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
      // Tuyệt đối không có correctIndex và explanation
    },
    {
      _id: 'q_2',
      chapter: 'Chương 1',
      content: 'Căn bậc hai của 9 bằng mấy?',
      options: ['1', '2', '3', '4'],
    },
  ],
}

const mockSubmitResult = {
  _id: 'attempt_1',
  score: 10,
  scoreWeight: 10,
  totalQuestions: 2,
  correctCount: 2,
  wrongCount: 0,
  unansweredCount: 0,
  exam: {
    title: 'Kiểm tra 1 tiết Đại số',
  },
  answers: [
    {
      question: {
        _id: 'q_1',
        chapter: 'Chương 1',
        content: 'Tập hợp các số tự nhiên ký hiệu là gì?',
        options: ['N', 'Z', 'Q', 'R'],
        correctIndex: 0,
        explanation: 'Ký hiệu N là Natural numbers',
      },
      selectedOption: 0,
      isCorrect: true,
    },
    {
      question: {
        _id: 'q_2',
        chapter: 'Chương 1',
        content: 'Căn bậc hai của 9 bằng mấy?',
        options: ['1', '2', '3', '4'],
        correctIndex: 2,
        explanation: '3 x 3 = 9',
      },
      selectedOption: 2,
      isCorrect: true,
    },
  ],
}

describe('StudentExamListPage Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    examApi.getExams.mockResolvedValue({
      data: { exams: mockStudentExams },
    })
    examApi.getExamById.mockResolvedValue({
      data: mockStudentExamDetail,
    })
    examApi.submitExam.mockResolvedValue({
      data: mockSubmitResult,
    })
    examApi.getExamResult.mockResolvedValue({
      data: mockSubmitResult,
    })
  })

  it('hiển thị danh sách các đề kiểm tra đã phát hành cho học sinh kèm trạng thái đã nộp / chưa làm', async () => {
    render(
      <MemoryRouter>
        <StudentExamListPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Kiểm tra 1 tiết Đại số')).toBeInTheDocument()
      expect(screen.getByText('Kiểm tra 15 phút Hình học')).toBeInTheDocument()
    })

    expect(screen.getByText(/45 phút/i)).toBeInTheDocument()
    expect(screen.getByText(/2 câu hỏi/i)).toBeInTheDocument()
    expect(screen.getByText(/Toán học/i)).toBeInTheDocument()
    expect(screen.getByText(/Đã nộp bài/i)).toBeInTheDocument()
    expect(screen.getByText(/10 \/ 10 điểm/i)).toBeInTheDocument()
  })

  it('mở đề kiểm tra và BẢO MẬT: KHÔNG hiển thị đáp án đúng cho học sinh trong thời gian làm bài', async () => {
    render(
      <MemoryRouter>
        <StudentExamListPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Kiểm tra 1 tiết Đại số')).toBeInTheDocument()
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
    expect(screen.queryByText(/Lời giải chi tiết/i)).not.toBeInTheDocument()
  })

  it('hỗ trợ chuyển câu hỏi qua lại và chọn đáp án', async () => {
    render(
      <MemoryRouter>
        <StudentExamListPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Kiểm tra 1 tiết Đại số')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Xem đề & Làm bài/i }))

    await waitFor(() => {
      expect(screen.getByText('Tập hợp các số tự nhiên ký hiệu là gì?')).toBeInTheDocument()
    })

    // Chọn đáp án N (index 0) cho câu 1
    const optionN = screen.getByText('N')
    fireEvent.click(optionN)

    // Bấm Câu tiếp theo
    const nextBtn = screen.getByRole('button', { name: /Câu tiếp theo/i })
    fireEvent.click(nextBtn)

    await waitFor(() => {
      expect(screen.getByText('Căn bậc hai của 9 bằng mấy?')).toBeInTheDocument()
    })

    // Bấm Câu trước để quay lại câu 1
    const prevBtn = screen.getByRole('button', { name: /Câu trước/i })
    fireEvent.click(prevBtn)

    await waitFor(() => {
      expect(screen.getByText('Tập hợp các số tự nhiên ký hiệu là gì?')).toBeInTheDocument()
    })
  })

  it('học sinh chủ động nộp bài và nhận kết quả điểm số kèm đáp án đúng sau khi nộp', async () => {
    render(
      <MemoryRouter>
        <StudentExamListPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Kiểm tra 1 tiết Đại số')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Xem đề & Làm bài/i }))

    await waitFor(() => {
      expect(screen.getByText('Tập hợp các số tự nhiên ký hiệu là gì?')).toBeInTheDocument()
    })

    // Bấm Nộp bài kiểm tra
    const submitBtn = screen.getByRole('button', { name: /Nộp bài kiểm tra/i })
    fireEvent.click(submitBtn)

    // Xác nhận nộp bài trong Modal
    await waitFor(() => {
      expect(screen.getByText(/Xác nhận nộp bài kiểm tra/i)).toBeInTheDocument()
    })

    const confirmBtn = screen.getByRole('button', { name: /Đồng ý nộp bài/i })
    fireEvent.click(confirmBtn)

    // Kiểm tra gọi API submitExam
    await waitFor(() => {
      expect(examApi.submitExam).toHaveBeenCalledWith(
        'exam_1',
        expect.objectContaining({
          answers: expect.any(Array),
        })
      )
    })

    // Sau khi nộp thành công: hiển thị kết quả và đáp án đúng
    await waitFor(() => {
      expect(screen.getByText(/Kết quả bài kiểm tra/i)).toBeInTheDocument()
      expect(screen.getByText(/Số câu đúng/i)).toBeInTheDocument()
    })

    // Kiểm tra có badge 'Đáp án đúng' sau khi nộp
    expect(screen.getAllByText('Đáp án đúng').length).toBeGreaterThan(0)
    expect(screen.getByText('Ký hiệu N là Natural numbers')).toBeInTheDocument()
  })

  it('xem lại kết quả bài kiểm tra đã nộp trước đó', async () => {
    render(
      <MemoryRouter>
        <StudentExamListPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Kiểm tra 15 phút Hình học')).toBeInTheDocument()
    })

    const resultBtn = screen.getByRole('button', { name: /Xem kết quả & Đáp án/i })
    fireEvent.click(resultBtn)

    await waitFor(() => {
      expect(examApi.getExamResult).toHaveBeenCalledWith('exam_2')
      expect(screen.getByText(/Kết quả bài kiểm tra/i)).toBeInTheDocument()
    })
  })
})
