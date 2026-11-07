import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import YouTubeEmbedManager from '@/components/teacher/YouTubeEmbedManager'

describe('YouTubeEmbedManager Component Tests', () => {
  const VALID_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  const VALID_ID = 'dQw4w9WgXcQ'

  it('1. Render giao diện nhập link YouTube với label và placeholder', () => {
    render(<YouTubeEmbedManager />)

    expect(screen.getByLabelText(/Đường dẫn Video YouTube/i)).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText(/https:\/\/www.youtube.com\/watch\?v=\.\.\./i)
    ).toBeInTheDocument()
  })

  it('2. Nhập URL YouTube hợp lệ: tự động trích xuất Video ID và hiển thị Live Preview', async () => {
    const handleChange = vi.fn()
    const handleIdChange = vi.fn()
    const user = userEvent.setup()

    render(
      <YouTubeEmbedManager
        onChange={handleChange}
        onVideoIdChange={handleIdChange}
      />
    )

    const input = screen.getByLabelText(/Đường dẫn Video YouTube/i)
    await user.type(input, VALID_URL)

    // Hiển thị badge Video ID
    expect(screen.getByText(`ID: ${VALID_ID}`)).toBeInTheDocument()

    // Hiển thị iframe xem trước
    const iframe = screen.getByTitle(`YouTube Preview - ${VALID_ID}`)
    expect(iframe).toBeInTheDocument()
    expect(iframe).toHaveAttribute('src', expect.stringContaining(VALID_ID))

    // Gọi callbacks
    expect(handleIdChange).toHaveBeenCalledWith(VALID_ID)
    expect(handleChange).toHaveBeenCalledWith(expect.stringContaining(VALID_ID))
  })

  it('3. Báo lỗi khi người dùng nhập URL không thuộc YouTube hoặc sai định dạng', async () => {
    const user = userEvent.setup()
    render(<YouTubeEmbedManager />)

    const input = screen.getByLabelText(/Đường dẫn Video YouTube/i)
    await user.type(input, 'https://vimeo.com/987654321')

    expect(
      screen.getByText(/Không thể nhận diện Video ID từ đường dẫn này/i)
    ).toBeInTheDocument()
    expect(document.querySelector('iframe')).not.toBeInTheDocument()
  })

  it('4. Chặn dán thẻ iframe HTML và hiển thị cảnh báo bảo mật', async () => {
    const user = userEvent.setup()
    render(<YouTubeEmbedManager />)

    const input = screen.getByLabelText(/Đường dẫn Video YouTube/i)
    await user.type(input, '<iframe src="https://youtube.com"></iframe>')

    expect(
      screen.getByText(/Không được nhập mã HTML hoặc thẻ <iframe>/i)
    ).toBeInTheDocument()
    expect(document.querySelector('iframe')).not.toBeInTheDocument()
  })

  it('5. Nút Xóa làm sạch ô nhập và reset trạng thái', async () => {
    const handleChange = vi.fn()
    const user = userEvent.setup()

    render(<YouTubeEmbedManager value={VALID_URL} onChange={handleChange} />)

    expect(screen.getByText(`ID: ${VALID_ID}`)).toBeInTheDocument()

    const clearBtn = screen.getByRole('button', { name: 'Xóa' })
    await user.click(clearBtn)

    expect(screen.queryByText(`ID: ${VALID_ID}`)).not.toBeInTheDocument()
    expect(handleChange).toHaveBeenCalledWith('')
  })
})
