import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ExamResultReview from '@/features/student/exam/ExamResultReview'
import ExamResultReviewPage from '@/features/student/exam/ExamResultReviewPage'
import examApi from '@/api/examApi'

vi.mock('@/api/examApi', () => ({
  default: {
    getExamResult: vi.fn(),
  },
}))

describe('ExamResultReview Component Tests', () => {
  const mockAttempt = {
    _id: 'attempt_001',
    score: 8.0,
    scoreWeight: 10,
    totalQuestions: 3,
    correctCount: 2,
    wrongCount: 1,
    unansweredCount: 0,
    durationSpent: 900,
    exam: {
      title: 'Kiểm tra 15 phút Toán học',
      teachingAssignment: {
        class: { name: '10A1' },
        subject: { name: 'Toán học' },
      },
    },
    answers: [
      {
        questionId: 'q1',
        question: {
          _id: 'q1',
          content: 'Số nguyên tố chẵn duy nhất là số nào?',
          options: ['0', '1', '2', '4'],
          correctIndex: 2,
          explanation: 'Số 2 là số nguyên tố chẵn duy nhất.',
        },
        selectedOption: 2,
        correctIndex: 2,
        isCorrect: true,
      },
      {
        questionId: 'q2',
        question: {
          _id: 'q2',
          content: 'Giá trị của Pi xấp xỉ bằng bao nhiêu?',
          options: ['3.14', '2.71', '1.41', '1.73'],
          correctIndex: 0,
          explanation: 'Pi xấp xỉ 3.14159...',
        },
        selectedOption: 1,
        correctIndex: 0,
        isCorrect: false,
      },
      {
        questionId: 'q3',
        question: {
          _id: 'q3',
          content: 'Hình vuông có mấy cạnh bằng nhau?',
          options: ['2', '3', '4', '5'],
          correctIndex: 2,
          explanation: 'Hình vuông có 4 cạnh bằng nhau.',
        },
        selectedOption: 2,
        correctIndex: 2,
        isCorrect: true,
      },
    ],
  }

  it('hiển thị đầy đủ tổng quan kết quả: Điểm số, Tổng câu, Đúng, Sai, Thời gian làm bài', () => {
    render(<ExamResultReview attempt={mockAttempt} />)

    // Điểm số
    expect(screen.getByText('8.00')).toBeInTheDocument()
    expect(screen.getByText(/\/ 10 điểm/i)).toBeInTheDocument()

    // Thống kê câu hỏi
    expect(screen.getByText('Tổng số câu')).toBeInTheDocument()
    expect(screen.getByText('Số câu đúng')).toBeInTheDocument()
    expect(screen.getByText('Số câu sai')).toBeInTheDocument()

    // Thời gian làm bài
    expect(screen.getByText(/Thời gian làm bài:/i)).toBeInTheDocument()
    expect(screen.getAllByText(/15 phút/i).length).toBeGreaterThan(0)
  })

  it('hỗ trợ mở rộng / thu gọn từng câu bằng Accordion', () => {
    render(<ExamResultReview attempt={mockAttempt} />)

    // Mặc định câu 1 mở
    expect(
      screen.getAllByText('Số nguyên tố chẵn duy nhất là số nào?').length
    ).toBeGreaterThan(0)

    // Câu 2 tiêu đề hiển thị nhưng lời giải chi tiết chưa hiển thị vì đang đóng
    expect(
      screen.getByText(/Giá trị của Pi xấp xỉ bằng bao nhiêu\?/i)
    ).toBeInTheDocument()
    expect(screen.queryByText('Pi xấp xỉ 3.14159...')).not.toBeInTheDocument()

    // Click vào Header của Câu 2 để mở Accordion
    const q2Button = screen.getByRole('button', {
      name: /Câu 2:.*Giá trị của Pi/i,
    })
    fireEvent.click(q2Button)

    // Lúc này các options của câu 2 và lời giải chi tiết sẽ hiển thị
    expect(screen.getByText('3.14')).toBeInTheDocument()
    expect(screen.getByText('Pi xấp xỉ 3.14159...')).toBeInTheDocument()

    // Bấm lại để đóng Accordion
    fireEvent.click(q2Button)
    expect(screen.queryByText('Pi xấp xỉ 3.14159...')).not.toBeInTheDocument()
  })

  it('phân biệt rõ ràng đáp án học sinh đã chọn, đáp án đúng và trạng thái đúng/sai', () => {
    render(<ExamResultReview attempt={mockAttempt} />)

    // Mở câu 2 (học sinh chọn sai: chọn 1 ("2.71"), đáp án đúng là 0 ("3.14"))
    const q2Button = screen.getByRole('button', {
      name: /Câu 2:.*Giá trị của Pi/i,
    })
    fireEvent.click(q2Button)

    // Kiểm tra huy hiệu "Bạn đã chọn" cho đáp án học sinh chọn sai
    expect(screen.getByText(/Bạn đã chọn/i)).toBeInTheDocument()

    // Kiểm tra huy hiệu "Đáp án đúng"
    expect(screen.getByText(/^Đáp án đúng$/i)).toBeInTheDocument()
  })

  it('hỗ trợ nút Mở rộng tất cả và Thu gọn tất cả', () => {
    render(<ExamResultReview attempt={mockAttempt} />)

    // Bấm Mở rộng tất cả
    const expandAllBtn = screen.getByRole('button', { name: /Mở rộng tất cả/i })
    fireEvent.click(expandAllBtn)

    // Cả 3 câu đều mở chi tiết
    expect(screen.getByText('Số 2 là số nguyên tố chẵn duy nhất.')).toBeInTheDocument()
    expect(screen.getByText('Pi xấp xỉ 3.14159...')).toBeInTheDocument()
    expect(screen.getByText('Hình vuông có 4 cạnh bằng nhau.')).toBeInTheDocument()

    // Bấm Thu gọn tất cả
    const collapseAllBtn = screen.getByRole('button', { name: /Thu gọn tất cả/i })
    fireEvent.click(collapseAllBtn)

    expect(screen.queryByText('Số 2 là số nguyên tố chẵn duy nhất.')).not.toBeInTheDocument()
    expect(screen.queryByText('Pi xấp xỉ 3.14159...')).not.toBeInTheDocument()
    expect(screen.queryByText('Hình vuông có 4 cạnh bằng nhau.')).not.toBeInTheDocument()
  })

  it('hỗ trợ bộ lọc câu hỏi (Đúng / Sai)', () => {
    render(<ExamResultReview attempt={mockAttempt} />)

    // Bấm lọc câu Sai (1 câu)
    const filterWrongBtn = screen.getByRole('button', { name: /Sai \(1\)/i })
    fireEvent.click(filterWrongBtn)

    // Chỉ còn câu 2 hiển thị
    expect(screen.getByText(/Giá trị của Pi xấp xỉ bằng bao nhiêu\?/i)).toBeInTheDocument()
    expect(screen.queryByText(/Số nguyên tố chẵn duy nhất/i)).not.toBeInTheDocument()
  })

  it('kích hoạt onBack khi bấm nút Quay lại lớp học', () => {
    const onBackMock = vi.fn()
    render(
      <ExamResultReview
        attempt={mockAttempt}
        onBack={onBackMock}
        backButtonLabel="Quay lại lớp học"
      />
    )

    const backBtns = screen.getAllByRole('button', { name: /Quay lại lớp học/i })
    expect(backBtns.length).toBeGreaterThan(0)

    fireEvent.click(backBtns[0])
    expect(onBackMock).toHaveBeenCalled()
  })
})

describe('ExamResultReviewPage Integration Tests', () => {
  const mockAttemptData = {
    _id: 'attempt_page_1',
    score: 9.0,
    scoreWeight: 10,
    totalQuestions: 2,
    correctCount: 2,
    wrongCount: 0,
    unansweredCount: 0,
    durationSpent: 600,
    exam: {
      title: 'Kiểm tra 1 tiết Vật lý',
      teachingAssignment: {
        class: { name: '10A2' },
        subject: { name: 'Vật lý' },
      },
    },
    answers: [
      {
        questionId: 'q_phys_1',
        question: {
          _id: 'q_phys_1',
          content: 'Đơn vị đo lực trong hệ SI là gì?',
          options: ['Joule', 'Newton', 'Watt', 'Pascal'],
          correctIndex: 1,
          explanation: 'Lực đo bằng Newton (N)',
        },
        selectedOption: 1,
        correctIndex: 1,
        isCorrect: true,
      },
      {
        questionId: 'q_phys_2',
        question: {
          _id: 'q_phys_2',
          content: 'Vận tốc là đại lượng nào?',
          options: ['Vô hướng', 'Vector', 'Không đổi', 'Cả 3 sai'],
          correctIndex: 1,
          explanation: 'Vận tốc là đại lượng vector có hướng và độ lớn',
        },
        selectedOption: 1,
        correctIndex: 1,
        isCorrect: true,
      },
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('tải và hiển thị kết quả từ API getExamResult', async () => {
    examApi.getExamResult.mockResolvedValue({
      data: { data: mockAttemptData },
    })

    render(
      <MemoryRouter initialEntries={['/student/exams/exam_123/result']}>
        <Routes>
          <Route path="/student/exams/:examId/result" element={<ExamResultReviewPage />} />
        </Routes>
      </MemoryRouter>
    )

    // Loading hiển thị
    expect(screen.getByText(/Đang tải kết quả bài làm/i)).toBeInTheDocument()

    // Sau khi tải thành công
    await waitFor(() => {
      expect(screen.getByText('Kiểm tra 1 tiết Vật lý')).toBeInTheDocument()
      expect(screen.getByText('9.00')).toBeInTheDocument()
      expect(
        screen.getAllByText('Đơn vị đo lực trong hệ SI là gì?').length
      ).toBeGreaterThan(0)
    })
  })

  it('hiển thị thông báo lỗi khi API thất bại hoặc bài thi chưa nộp', async () => {
    examApi.getExamResult.mockRejectedValue({
      response: {
        data: { message: 'Chưa tìm thấy bài làm của học sinh cho đề kiểm tra này!' },
      },
    })

    render(
      <MemoryRouter initialEntries={['/student/exams/exam_123/result']}>
        <Routes>
          <Route path="/student/exams/:examId/result" element={<ExamResultReviewPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Không thể xem kết quả/i)).toBeInTheDocument()
      expect(
        screen.getByText(/Chưa tìm thấy bài làm của học sinh cho đề kiểm tra này!/i)
      ).toBeInTheDocument()
    })
  })
})
