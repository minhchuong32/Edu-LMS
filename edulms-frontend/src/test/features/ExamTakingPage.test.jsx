import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ExamTakingPage from '@/features/student/exam/ExamTakingPage'
import ExamCountdown from '@/features/student/exam/ExamCountdown'
import ExamQuestion from '@/features/student/exam/ExamQuestion'
import ExamNavPalette from '@/features/student/exam/ExamNavPalette'
import examApi from '@/api/examApi'

vi.mock('@/api/examApi', () => ({
  default: {
    getServerTime: vi.fn(),
    getExamById: vi.fn(),
    submitExam: vi.fn(),
  },
}))

describe('Exam Component Unit Tests', () => {
  it('ExamCountdown renders formatted minutes:seconds and handles progress', () => {
    const { rerender } = render(<ExamCountdown timeLeft={3600} duration={3600} />)
    expect(screen.getByText('60:00')).toBeInTheDocument()

    rerender(<ExamCountdown timeLeft={45} duration={3600} />)
    expect(screen.getByText('00:45')).toBeInTheDocument()
  })

  it('ExamQuestion displays question content, options and responds to clicks', () => {
    const mockQuestion = {
      _id: 'q1',
      content: 'Một tam giác có tổng ba góc bằng bao nhiêu độ?',
      options: ['90', '180', '270', '360'],
    }
    const onSelect = vi.fn()
    render(
      <ExamQuestion
        question={mockQuestion}
        questionIndex={0}
        totalQuestions={1}
        selectedOption={null}
        onSelect={onSelect}
      />
    )

    expect(screen.getByText('Một tam giác có tổng ba góc bằng bao nhiêu độ?')).toBeInTheDocument()
    expect(screen.getByText('180')).toBeInTheDocument()

    fireEvent.click(screen.getByText('180'))
    expect(onSelect).toHaveBeenCalledWith(1)
  })

  it('ExamNavPalette displays progress, allows switching questions and submitting', () => {
    const questions = [{ _id: 'q1' }, { _id: 'q2' }]
    const answers = { q1: 0 }
    const onNavigate = vi.fn()
    const onSubmit = vi.fn()

    render(
      <ExamNavPalette
        questions={questions}
        answers={answers}
        currentIndex={0}
        onNavigate={onNavigate}
        onSubmit={onSubmit}
        isSubmitting={false}
      />
    )

    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '2' }))
    expect(onNavigate).toHaveBeenCalledWith(1)

    fireEvent.click(screen.getByRole('button', { name: /Nộp bài/i }))
    expect(onSubmit).toHaveBeenCalled()
  })
})

describe('ExamTakingPage Integration Tests', () => {
  const mockExam = {
    _id: 'exam_full_1',
    title: 'Kiểm tra 45 phút - Hóa học',
    duration: 45,
    scoreWeight: 10,
    hasSubmitted: false,
    questions: [
      {
        _id: 'q101',
        content: 'Công thức hóa học của nước là gì?',
        options: ['H2O', 'CO2', 'NaCl', 'O2'],
      },
      {
        _id: 'q102',
        content: 'Khí nào chiếm tỉ lệ lớn nhất trong không khí?',
        options: ['Oxy', 'Nito', 'Cacbonic', 'Argon'],
      },
    ],
  }

  const mockSubmitResult = {
    _id: 'attempt_full_1',
    score: 10,
    totalQuestions: 2,
    correctCount: 2,
    wrongCount: 0,
    unansweredCount: 0,
    answers: [
      {
        questionId: 'q101',
        selectedOption: 0,
        correctIndex: 0,
        isCorrect: true,
      },
      {
        questionId: 'q102',
        selectedOption: 1,
        correctIndex: 1,
        isCorrect: true,
      },
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    examApi.getServerTime.mockResolvedValue({
      data: { data: { serverTime: Date.now() } },
    })
    examApi.getExamById.mockResolvedValue({
      data: { data: mockExam },
    })
    examApi.submitExam.mockResolvedValue({
      data: { data: mockSubmitResult },
    })
  })

  it('renders exam page with questions, navigation and server time sync', async () => {
    render(
      <MemoryRouter initialEntries={['/student/exams/exam_full_1/take']}>
        <Routes>
          <Route path="/student/exams/:examId/take" element={<ExamTakingPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Kiểm tra 45 phút - Hóa học')).toBeInTheDocument()
      expect(screen.getByText('Công thức hóa học của nước là gì?')).toBeInTheDocument()
    })

    // Chọn đáp án H2O
    fireEvent.click(screen.getByText('H2O'))

    // Chuyển sang câu 2
    fireEvent.click(screen.getByRole('button', { name: /Câu sau/i }))

    await waitFor(() => {
      expect(screen.getByText('Khí nào chiếm tỉ lệ lớn nhất trong không khí?')).toBeInTheDocument()
    })

    // Chọn đáp án Nito
    fireEvent.click(screen.getByText('Nito'))

    // Nộp bài từ sidebar palette
    const submitBtn = screen.getByRole('button', { name: /^Nộp bài$/i })
    fireEvent.click(submitBtn)

    // Xác nhận trong dialog
    await waitFor(() => {
      expect(screen.getByText('Xác nhận nộp bài')).toBeInTheDocument()
    })

    const confirmBtn = screen.getByRole('button', { name: /Xác nhận nộp/i })
    fireEvent.click(confirmBtn)

    // Kiểm tra kết quả hiển thị sau khi nộp
    await waitFor(() => {
      expect(screen.getByText('Kết quả bài làm')).toBeInTheDocument()
      expect(screen.getByText('10.00')).toBeInTheDocument()
    })
  })
})
