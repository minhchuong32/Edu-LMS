import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import TeacherQuestionExamPage from '@/features/teacher/TeacherQuestionExamPage'
import * as useAuthModule from '@/context/useAuth'
import academicApi from '@/api/academicApi'
import questionApi from '@/api/questionApi'
import examApi from '@/api/examApi'

vi.mock('@/context/useAuth')
vi.mock('@/api/academicApi', () => ({
  default: {
    getTeachingAssignments: vi.fn(),
    getSubjects: vi.fn(),
  },
}))
vi.mock('@/api/questionApi', () => ({
  default: {
    getQuestions: vi.fn(),
    createQuestion: vi.fn(),
    updateQuestion: vi.fn(),
    deleteQuestion: vi.fn(),
    getChapters: vi.fn(),
    getSummary: vi.fn(),
  },
}))
vi.mock('@/api/examApi', () => ({
  default: {
    getExams: vi.fn(),
    createManualExam: vi.fn(),
    createRandomExam: vi.fn(),
    previewRandom: vi.fn(),
    publishExam: vi.fn(),
    deleteExam: vi.fn(),
  },
}))

const mockSubjects = [
  { _id: 'sub_1', name: 'Toán học', code: 'MATH' },
  { _id: 'sub_2', name: 'Vật lý', code: 'PHYS' },
]

const mockTeachingAssignments = [
  {
    _id: 'ta_1',
    class: { _id: 'cls_1', name: '10A1' },
    subject: mockSubjects[0],
    academicYear: '2025-2026',
  },
]

const mockQuestions = [
  {
    _id: 'q_1',
    subject: mockSubjects[0],
    chapter: 'Chương 1',
    difficulty: 'easy',
    content: '1 + 1 bằng mấy?',
    options: ['1', '2', '3', '4'],
    correctIndex: 1,
    explanation: 'Vì 1 + 1 = 2',
  },
]

describe('TeacherQuestionExamPage Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: { userId: 'teacher_1', fullName: 'Thầy Hào', role: 'teacher' },
    })

    academicApi.getTeachingAssignments.mockResolvedValue({
      data: mockTeachingAssignments,
    })
    academicApi.getSubjects.mockResolvedValue({
      data: mockSubjects,
    })
    questionApi.getQuestions.mockResolvedValue({
      data: {
        questions: mockQuestions,
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
      },
    })
    questionApi.getChapters.mockResolvedValue({
      data: ['Chương 1'],
    })
    examApi.getExams.mockResolvedValue({
      data: { exams: [] },
    })
  })

  it('kết xuất giao diện chính với các tab điều hướng', async () => {
    render(
      <MemoryRouter>
        <TeacherQuestionExamPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1 })
      ).toHaveTextContent(/Ngân hàng câu hỏi & Tạo đề kiểm tra/i)
    })

    expect(
      screen.getByRole('button', { name: /^Ngân hàng câu hỏi$/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /^Tạo đề kiểm tra$/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Đề kiểm tra đã tạo/i })
    ).toBeInTheDocument()
  })

  it('hiển thị danh sách câu hỏi trong ngân hàng và đáp án đúng', async () => {
    render(
      <MemoryRouter>
        <TeacherQuestionExamPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('1 + 1 bằng mấy?')).toBeInTheDocument()
    })

    expect(screen.getByText('Chương 1')).toBeInTheDocument()
    expect(screen.getByText(/Vì 1 \+ 1 = 2/i)).toBeInTheDocument()
  })

  it('mở modal tạo câu hỏi và gửi form thành công', async () => {
    questionApi.createQuestion.mockResolvedValue({
      data: { _id: 'q_new' },
    })

    render(
      <MemoryRouter>
        <TeacherQuestionExamPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Thêm câu hỏi mới/i)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText(/Thêm câu hỏi mới/i))

    expect(
      screen.getByRole('heading', { name: /Tạo mới câu hỏi trắc nghiệm/i })
    ).toBeInTheDocument()

    const contentInput = screen.getByPlaceholderText(
      /Nhập nội dung câu hỏi trắc nghiệm.../i
    )
    fireEvent.change(contentInput, {
      target: { value: 'Nội dung câu hỏi kiểm tra tự động?' },
    })

    // Điền đầy đủ 4 phương án A, B, C, D
    const optionA = screen.getByPlaceholderText(/Nội dung phương án A.../i)
    const optionB = screen.getByPlaceholderText(/Nội dung phương án B.../i)
    const optionC = screen.getByPlaceholderText(/Nội dung phương án C.../i)
    const optionD = screen.getByPlaceholderText(/Nội dung phương án D.../i)
    fireEvent.change(optionA, { target: { value: 'Đáp án A' } })
    fireEvent.change(optionB, { target: { value: 'Đáp án B' } })
    fireEvent.change(optionC, { target: { value: 'Đáp án C' } })
    fireEvent.change(optionD, { target: { value: 'Đáp án D' } })

    const submitBtn = screen.getByRole('button', { name: /^Tạo câu hỏi$/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(questionApi.createQuestion).toHaveBeenCalled()
    })
  })

  it('chuyển sang tab Tạo đề kiểm tra và hỗ trợ phương thức thủ công & ngẫu nhiên', async () => {
    render(
      <MemoryRouter>
        <TeacherQuestionExamPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /^Tạo đề kiểm tra$/i })
      ).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /^Tạo đề kiểm tra$/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/1\. Chọn câu hỏi thủ công/i)
      ).toBeInTheDocument()
      expect(
        screen.getByText(/2\. Tạo đề ngẫu nhiên \(Random\)/i)
      ).toBeInTheDocument()
    })
  })

  it('mở modal xem trước đề thi với tổng số câu và thang điểm', async () => {
    render(
      <MemoryRouter>
        <TeacherQuestionExamPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /^Tạo đề kiểm tra$/i })
      ).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /^Tạo đề kiểm tra$/i }))

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText(/Ví dụ: Kiểm tra 15 phút/i)
      ).toBeInTheDocument()
    })

    const titleInput = screen.getByPlaceholderText(/Ví dụ: Kiểm tra 15 phút/i)
    fireEvent.change(titleInput, { target: { value: 'Đề kiểm tra 15 phút' } })

    // Bấm chọn tất cả câu hỏi thủ công
    await waitFor(() => {
      expect(screen.getByText('Chọn tất cả')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('Chọn tất cả'))

    // Bấm xem trước đề
    const previewBtn = screen.getByRole('button', {
      name: /Xem trước đề kiểm tra/i,
    })
    fireEvent.click(previewBtn)

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /Xem trước đề kiểm tra/i })
      ).toBeInTheDocument()
      expect(screen.getAllByText(/1 câu/i).length).toBeGreaterThan(0)
      expect(screen.getByText(/10 điểm/i)).toBeInTheDocument()
    })
  })
})
