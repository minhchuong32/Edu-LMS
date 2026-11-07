import { useState, useMemo, useId } from 'react'
import {
  Video,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Sparkles,
  Info,
} from 'lucide-react'
import {
  extractYouTubeVideoId,
  getYouTubeEmbedUrl,
  getYouTubeThumbnailUrl,
} from '@/utils/youtubeUtils'

/**
 * Component quản lý nhúng Video YouTube cho Giáo viên (YouTube Embed Manager)
 * - Tự động trích xuất Video ID từ các định dạng URL YouTube
 * - Kiểm tra tính hợp lệ và chặn HTML/iframe injection
 * - Hiển thị Live Preview Video 16:9 trước khi lưu
 * - Cho phép giáo viên đổi đường dẫn hoặc xóa làm lại
 */
export const YouTubeEmbedManager = ({
  value = '',
  onChange,
  onVideoIdChange,
  disabled = false,
  autoPreview = true,
}) => {
  const inputId = useId()

  // Đồng bộ prop value từ parent khi thay đổi (ví dụ mở modal chỉnh sửa) theo chuẩn React
  const [prevPropValue, setPrevPropValue] = useState(value)
  const [urlInput, setUrlInput] = useState(value || '')
  const [isPreviewMode, setIsPreviewMode] = useState(autoPreview)

  if (value !== prevPropValue) {
    setPrevPropValue(value)
    setUrlInput(value || '')
  }

  // Tính toán Video ID và lỗi trực tiếp từ urlInput (Derived State)
  const extractedId = useMemo(() => extractYouTubeVideoId(urlInput), [urlInput])

  const errorMessage = useMemo(() => {
    if (!urlInput.trim()) return null
    if (
      urlInput.includes('<') ||
      urlInput.includes('>') ||
      urlInput.toLowerCase().includes('<iframe')
    ) {
      return 'Không được nhập mã HTML hoặc thẻ <iframe>. Vui lòng chỉ dán đường dẫn (URL) YouTube!'
    }
    if (!extractedId) {
      return 'Không thể nhận diện Video ID từ đường dẫn này. Vui lòng kiểm tra lại liên kết YouTube!'
    }
    return null
  }, [urlInput, extractedId])

  const handleInputChange = (e) => {
    const rawVal = e.target.value
    setUrlInput(rawVal)

    if (!rawVal.trim()) {
      onChange?.('')
      onVideoIdChange?.(null)
      return
    }

    if (rawVal.includes('<') || rawVal.includes('>') || rawVal.toLowerCase().includes('<iframe')) {
      return
    }

    const videoId = extractYouTubeVideoId(rawVal)

    if (videoId) {
      const cleanEmbedUrl = getYouTubeEmbedUrl(videoId)
      onChange?.(cleanEmbedUrl)
      onVideoIdChange?.(videoId)
    } else {
      onChange?.(rawVal)
      onVideoIdChange?.(null)
    }
  }

  const handleClear = () => {
    setUrlInput('')
    onChange?.('')
    onVideoIdChange?.(null)
  }

  const embedUrl = extractedId ? getYouTubeEmbedUrl(extractedId) : ''
  const thumbnailUrl = extractedId ? getYouTubeThumbnailUrl(extractedId) : ''

  return (
    <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl transition-all">
      {/* Tiêu đề vùng nhập video */}
      <div className="flex items-center justify-between">
        <label
          htmlFor={inputId}
          className="text-xs font-semibold text-slate-800 flex items-center gap-1.5"
        >
          <div className="w-5 h-5 rounded-md bg-red-600 text-white flex items-center justify-center">
            <Video className="w-3 h-3" />
          </div>
          <span>Đường dẫn Video YouTube <span className="text-red-500">*</span></span>
        </label>
        {extractedId && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>ID: {extractedId}</span>
          </span>
        )}
      </div>

      {/* Ô nhập liên kết */}
      <div className="relative">
        <input
          id={inputId}
          type="text"
          value={urlInput}
          onChange={handleInputChange}
          disabled={disabled}
          placeholder="https://www.youtube.com/watch?v=... hoặc https://youtu.be/..."
          className={`w-full text-xs px-3.5 py-2.5 bg-white border rounded-xl pr-20 transition-all focus:outline-hidden focus:ring-2 ${
            errorMessage
              ? 'border-red-300 focus:ring-red-400 bg-red-50/20'
              : extractedId
              ? 'border-emerald-300 focus:ring-emerald-400'
              : 'border-slate-300 focus:ring-blue-500'
          }`}
        />

        {urlInput && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-medium text-slate-400 hover:text-slate-600 px-2 py-1 rounded-md hover:bg-slate-100 transition-colors"
          >
            Xóa
          </button>
        )}
      </div>

      {/* Thông báo lỗi nếu URL không hợp lệ */}
      {errorMessage && (
        <div className="flex items-start gap-1.5 text-xs text-red-600 bg-red-50/80 p-2.5 rounded-xl border border-red-200">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Hướng dẫn định dạng hỗ trợ khi chưa nhập */}
      {!urlInput && !errorMessage && (
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>
            Hỗ trợ link máy tính (watch?v=), link chia sẻ (youtu.be), Shorts hoặc Video ID 11 ký tự.
          </span>
        </div>
      )}

      {/* Khu vực Live Video Preview trước khi lưu */}
      {extractedId && (
        <div className="space-y-2 pt-1 border-t border-slate-200/80">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Xem trước video (Preview)</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPreviewMode((prev) => !prev)}
                className="text-[11px] text-blue-600 hover:text-blue-700 font-medium"
              >
                {isPreviewMode ? 'Hiển thị ảnh bìa' : 'Mở khung phát trực tiếp'}
              </button>
              <a
                href={`https://www.youtube.com/watch?v=${extractedId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-slate-500 hover:text-slate-800 inline-flex items-center gap-0.5 font-medium"
              >
                <span>Mở YouTube</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black shadow-inner border border-slate-800">
            {isPreviewMode ? (
              <iframe
                title={`YouTube Preview - ${extractedId}`}
                src={embedUrl}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div
                className="relative w-full h-full flex items-center justify-center group cursor-pointer"
                onClick={() => setIsPreviewMode(true)}
              >
                <img
                  src={thumbnailUrl}
                  alt="YouTube thumbnail preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                    <Video className="w-6 h-6 ml-0.5" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default YouTubeEmbedManager
