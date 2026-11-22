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
    downloadTemplate: vi.fn(),
    previewImport: vi.fn(),
    confirmImport: vi.fn(),
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

  it('nút Tải file mẫu gọi đúng API downloadTemplate', async () => {
    // Mock URL API for jsdom
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    global.URL.revokeObjectURL = vi.fn()

    questionApi.downloadTemplate.mockResolvedValue({
      data: new Blob(['mock-excel'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    })

    render(
      <MemoryRouter>
        <TeacherQuestionExamPage />
      </MemoryRouter>
    )

    // Chờ tải dữ liệu xong
    await waitFor(() => {
      expect(screen.getByText(/Tải file mẫu/i)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText(/Tải file mẫu/i))

    await waitFor(() => {
      expect(questionApi.downloadTemplate).toHaveBeenCalledTimes(1)
    })
  })

  it('nút Import từ Excel mở modal với hướng dẫn', async () => {
    render(
      <MemoryRouter>
        <TeacherQuestionExamPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Import từ Excel/i)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText(/Import từ Excel/i))

    await waitFor(() => {
      expect(screen.getByText(/Import câu hỏi từ file Excel/i)).toBeInTheDocument()
      expect(screen.getByText(/Hướng dẫn import câu hỏi từ Excel/i)).toBeInTheDocument()
    })
  })

  it('upload file Excel hiển thị màn hình Preview với số câu hợp lệ', async () => {
    const mockPreviewData = {
      totalRows: 3,
      validCount: 2,
      errorCount: 1,
      items: [
        {
          row: 2,
          isValid: true,
          errors: [],
          data: { content: 'Câu hỏi 1 hợp lệ', subjectName: 'Toán học', difficulty: 'easy' },
        },
        {
          row: 3,
          isValid: true,
          errors: [],
          data: { content: 'Câu hỏi 2 hợp lệ', subjectName: 'Toán học', difficulty: 'medium' },
        },
        {
          row: 4,
          isValid: false,
          errors: ['Nội dung câu hỏi không được để trống'],
          data: { content: '', subjectName: 'Toán học', difficulty: 'hard' },
        },
      ],
    }
    questionApi.previewImport.mockResolvedValue({ data: mockPreviewData })

    render(
      <MemoryRouter>
        <TeacherQuestionExamPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Import từ Excel/i)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText(/Import từ Excel/i))

    // Giả lập upload file
    await waitFor(() => {
      expect(screen.getByText(/Hướng dẫn import/i)).toBeInTheDocument()
    })

    const fileInput = document.querySelector('input[type="file"]')
    const mockFile = new File(['mock'], 'test.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    fireEvent.change(fileInput, { target: { files: [mockFile] } })

    await waitFor(() => {
      expect(questionApi.previewImport).toHaveBeenCalledTimes(1)
      expect(screen.getByText('Tổng số dòng')).toBeInTheDocument()
      expect(screen.getByText('Hợp lệ ✓')).toBeInTheDocument()
      expect(screen.getByText('Có lỗi ✗')).toBeInTheDocument()
      expect(screen.getByText('Câu hỏi 1 hợp lệ')).toBeInTheDocument()
      expect(screen.getByText('Nội dung câu hỏi không được để trống')).toBeInTheDocument()
    })
  })

  it('nút Xác nhận Import gọi confirmImport và hiển thị thông báo thành công', async () => {
    const mockPreviewData = {
      totalRows: 2,
      validCount: 2,
      errorCount: 0,
      items: [
        {
          row: 2,
          isValid: true,
          errors: [],
          data: { content: 'Câu hỏi 1', subjectName: 'Toán học', difficulty: 'easy' },
        },
        {
          row: 3,
          isValid: true,
          errors: [],
          data: { content: 'Câu hỏi 2', subjectName: 'Toán học', difficulty: 'medium' },
        },
      ],
    }
    questionApi.previewImport.mockResolvedValue({ data: mockPreviewData })
    questionApi.confirmImport.mockResolvedValue({ data: { inserted: 2 } })

    render(
      <MemoryRouter>
        <TeacherQuestionExamPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Import từ Excel/i)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText(/Import từ Excel/i))

    await waitFor(() => {
      expect(screen.getByText(/Hướng dẫn import/i)).toBeInTheDocument()
    })

    // Upload file
    const fileInput = document.querySelector('input[type="file"]')
    const mockFile = new File(['mock'], 'test.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    fireEvent.change(fileInput, { target: { files: [mockFile] } })

    // Chờ màn hình Preview xuất hiện
    await waitFor(() => {
      expect(screen.getByText(/Xác nhận import 2 câu hỏi/i)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText(/Xác nhận import 2 câu hỏi/i))

    await waitFor(() => {
      expect(questionApi.confirmImport).toHaveBeenCalledTimes(1)
      expect(screen.getByText(/Import thành công!/i)).toBeInTheDocument()
    })
  })
})
