import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import FileUploadManager from '@/components/teacher/FileUploadManager'
import lessonApi from '@/api/lessonApi'

vi.mock('@/api/lessonApi', () => ({
  default: {
    uploadMedia: vi.fn(),
  },
}))

describe('FileUploadManager Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('render giao diện upload với dropzone và nút chọn tệp', () => {
    render(<FileUploadManager />)

    expect(screen.getByText('Tải lên tài liệu hoặc video bài giảng')).toBeInTheDocument()
    expect(screen.getByText('Chọn tệp từ thiết bị')).toBeInTheDocument()
  })

  it('hiển thị danh sách tệp được chọn gồm tên, kích thước và định dạng', async () => {
    render(<FileUploadManager />)

    const file = new File(['test content pdf'], 'giao-trinh.pdf', {
      type: 'application/pdf',
    })
    const input = document.getElementById('file-upload-input')

    fireEvent.change(input, { target: { files: [file] } })

    expect(screen.getByText('Danh sách tệp (1)')).toBeInTheDocument()
    expect(screen.getByText('giao-trinh.pdf')).toBeInTheDocument()
    expect(screen.getByText(/Tối đa: 10 MB/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tải lên' })).toBeInTheDocument()
  })

  it('báo lỗi trước khi upload nếu tệp sai định dạng (.exe)', () => {
    render(<FileUploadManager />)

    const invalidFile = new File(['malicious'], 'trojan.exe', {
      type: 'application/x-msdownload',
    })
    const input = document.getElementById('file-upload-input')

    fireEvent.change(input, { target: { files: [invalidFile] } })

    expect(screen.getByText(/không được hỗ trợ/)).toBeInTheDocument()
  })

  it('báo lỗi trước khi upload nếu tệp vượt quá dung lượng giới hạn', () => {
    render(<FileUploadManager />)

    // Tạo file ảnh giả lập vượt quá 5MB
    const bigFile = new File(['x'.repeat(6 * 1024 * 1024)], 'anh-lon.jpg', {
      type: 'image/jpeg',
    })
    Object.defineProperty(bigFile, 'size', { value: 6 * 1024 * 1024 })

    const input = document.getElementById('file-upload-input')
    fireEvent.change(input, { target: { files: [bigFile] } })

    expect(screen.getByText(/vượt quá giới hạn tối đa cho phép/)).toBeInTheDocument()
    expect(screen.getAllByText(/5 MB/).length).toBeGreaterThan(0)
  })

  it('cho phép xóa tệp khỏi danh sách trước khi tải lên', async () => {
    const user = userEvent.setup()
    render(<FileUploadManager />)

    const file = new File(['content'], 'sample.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })
    const input = document.getElementById('file-upload-input')

    fireEvent.change(input, { target: { files: [file] } })
    expect(screen.getByText('sample.docx')).toBeInTheDocument()

    // Bấm nút xóa
    const deleteBtn = screen.getByLabelText('Xóa tệp sample.docx')
    await user.click(deleteBtn)

    expect(screen.queryByText('sample.docx')).not.toBeInTheDocument()
  })

  it('hiển thị thanh tiến trình và thông báo thành công sau khi upload', async () => {
    const user = userEvent.setup()
    const onUploadSuccess = vi.fn()

    lessonApi.uploadMedia.mockImplementation((file, onProgress) => {
      onProgress(50)
      return Promise.resolve({
        url: 'https://res.cloudinary.com/edulms/video/upload/lesson.mp4',
        data: {
          url: 'https://res.cloudinary.com/edulms/video/upload/lesson.mp4',
          fileName: 'lesson.mp4',
        },
      })
    })

    render(<FileUploadManager onUploadSuccess={onUploadSuccess} />)

    const file = new File(['dummy video'], 'lesson.mp4', { type: 'video/mp4' })
    const input = document.getElementById('file-upload-input')

    fireEvent.change(input, { target: { files: [file] } })

    const uploadBtn = screen.getByRole('button', { name: 'Tải lên' })
    await user.click(uploadBtn)

    await waitFor(() => {
      expect(screen.getByText('Thành công')).toBeInTheDocument()
      expect(screen.getByText(/Đã tải lên Cloudinary/)).toBeInTheDocument()
      expect(onUploadSuccess).toHaveBeenCalledWith(
        'https://res.cloudinary.com/edulms/video/upload/lesson.mp4',
        expect.anything()
      )
    })
  })

  it('hiển thị lỗi và nút thử lại khi upload thất bại', async () => {
    const user = userEvent.setup()

    lessonApi.uploadMedia.mockRejectedValueOnce(
      new Error('Mạng bị ngắt kết nối. Không thể kết nối tới Cloudinary!')
    )

    render(<FileUploadManager />)

    const file = new File(['dummy data'], 'slide.pptx', {
      type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    })
    const input = document.getElementById('file-upload-input')

    fireEvent.change(input, { target: { files: [file] } })

    const uploadBtn = screen.getByRole('button', { name: 'Tải lên' })
    await user.click(uploadBtn)

    await waitFor(() => {
      expect(screen.getByText(/Mạng bị ngắt kết nối/)).toBeInTheDocument()
      expect(screen.getByTitle('Thử tải lại')).toBeInTheDocument()
    })

    // Mock thành công cho lần thử lại
    lessonApi.uploadMedia.mockResolvedValueOnce({
      url: 'https://res.cloudinary.com/edulms/raw/upload/slide.pptx',
      data: { url: 'https://res.cloudinary.com/edulms/raw/upload/slide.pptx' },
    })

    const retryBtn = screen.getByTitle('Thử tải lại')
    await user.click(retryBtn)

    await waitFor(() => {
      expect(screen.getByText('Thành công')).toBeInTheDocument()
    })
  })
})
