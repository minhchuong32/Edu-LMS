import { useState, useRef, useMemo } from 'react'
import {
  Upload,
  FileText,
  Video,
  FileSpreadsheet,
  Presentation,
  Archive,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  Trash2,
  ExternalLink,
  Loader2,
  Paperclip,
} from 'lucide-react'
import lessonApi from '@/api/lessonApi'
import {
  validateUploadFile,
  formatFileSize,
  getFileRule,
} from '@/utils/uploadValidation'

/**
 * Lấy icon và màu đại diện theo định dạng tệp
 */
const getFileIcon = (filename) => {
  const rule = getFileRule(filename)
  if (!rule) return { icon: FileText, color: 'text-slate-500 bg-slate-100 border-slate-200' }

  switch (rule.category) {
    case 'video':
      return { icon: Video, color: 'text-rose-600 bg-rose-50 border-rose-200' }
    case 'spreadsheet':
      return { icon: FileSpreadsheet, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' }
    case 'presentation':
      return { icon: Presentation, color: 'text-amber-600 bg-amber-50 border-amber-200' }
    case 'archive':
      return { icon: Archive, color: 'text-purple-600 bg-purple-50 border-purple-200' }
    case 'image':
      return { icon: ImageIcon, color: 'text-sky-600 bg-sky-50 border-sky-200' }
    default:
      return { icon: FileText, color: 'text-blue-600 bg-blue-50 border-blue-200' }
  }
}

/**
 * Component Upload tệp tài liệu / video cho bài giảng
 * Hỗ trợ kéo-thả, chọn tệp, preview danh sách, validate dung lượng/định dạng,
 * hiển thị tiến trình % qua onUploadProgress, thử lại khi lỗi, và hoàn tất gắn link.
 */
export const FileUploadManager = ({
  onUploadSuccess,
  currentResourceUrl = '',
  attachments = [],
  onDeleteAttachment,
  onReplaceAttachment,
  accept,
  title = 'Tải lên tài liệu hoặc video bài giảng',
  helperText,
}) => {
  const [selectedFiles, setSelectedFiles] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const [replacingFileId, setReplacingFileId] = useState(null)
  const fileInputRef = useRef(null)

  // Danh sách tệp bài giảng hiện có
  const attachedFiles = useMemo(() => {
    if (Array.isArray(attachments) && attachments.length > 0) {
      return attachments
    }
    if (currentResourceUrl) {
      const cleanName =
        decodeURIComponent(currentResourceUrl.split('/').pop().split('?')[0]) ||
        'Tài nguyên bài giảng'
      return [
        {
          _id: 'primary',
          id: 'primary',
          name: cleanName,
          url: currentResourceUrl,
          format: '',
          fileSize: 0,
        },
      ]
    }
    return []
  }, [attachments, currentResourceUrl])

  // Xử lý thay thế tệp
  const handleTriggerReplace = async (fileItem, newFile) => {
    if (!newFile) return
    const validation = validateUploadFile(newFile)
    if (!validation.valid) {
      alert(validation.error || 'Tập tin không hợp lệ!')
      return
    }

    if (onReplaceAttachment) {
      onReplaceAttachment(fileItem, newFile)
      return
    }

    try {
      setReplacingFileId(fileItem._id || fileItem.id || fileItem.url)
      const res = await lessonApi.uploadMedia(newFile)
      const data = res.data || res
      if (onUploadSuccess && data.url) {
        onUploadSuccess(data.url, data)
      }
    } catch (err) {
      console.error('Lỗi khi thay thế tệp:', err)
      alert(err?.message || 'Không thể thay thế tệp. Vui lòng thử lại!')
    } finally {
      setReplacingFileId(null)
    }
  }

  // Xử lý xóa tệp
  const handleTriggerDelete = (fileItem) => {
    if (onDeleteAttachment) {
      onDeleteAttachment(fileItem)
    } else if (onUploadSuccess) {
      onUploadSuccess('', null)
    }
  }

  // Xử lý khi thêm các file mới vào hàng đợi
  const handleAddFiles = (fileList) => {
    if (!fileList || fileList.length === 0) return

    const newItems = Array.from(fileList).map((file) => {
      const validation = validateUploadFile(file)
      return {
        id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        name: file.name,
        size: file.size,
        formattedSize: formatFileSize(file.size),
        rule: validation.rule,
        status: validation.valid ? 'ready' : 'error', // ready | uploading | success | error
        progress: 0,
        errorMessage: validation.error || null,
        resultUrl: null,
        uploadData: null,
      }
    })

    setSelectedFiles((prev) => [...prev, ...newItems])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Kéo thả vùng upload
  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files) {
      handleAddFiles(e.dataTransfer.files)
    }
  }

  // Xóa tệp khỏi danh sách
  const handleRemoveItem = (id) => {
    setSelectedFiles((prev) => prev.filter((item) => item.id !== id))
  }

  // Tải lên một tệp tin cụ thể
  const handleUploadSingleItem = async (item) => {
    if (item.status === 'uploading') return

    // Cập nhật trạng thái đang tải lên
    setSelectedFiles((prev) =>
      prev.map((f) =>
        f.id === item.id
          ? { ...f, status: 'uploading', progress: 0, errorMessage: null }
          : f
      )
    )

    try {
      const res = await lessonApi.uploadMedia(item.file, (percent) => {
        setSelectedFiles((prev) =>
          prev.map((f) =>
            f.id === item.id ? { ...f, progress: percent } : f
          )
        )
      })

      const data = res.data || res

      setSelectedFiles((prev) =>
        prev.map((f) =>
          f.id === item.id
            ? {
                ...f,
                status: 'success',
                progress: 100,
                resultUrl: data.url,
                uploadData: data,
              }
            : f
        )
      )

      // Kích hoạt callback thông báo ra component cha
      if (onUploadSuccess && data.url) {
        onUploadSuccess(data.url, data)
      }
    } catch (err) {
      console.error('Upload failed:', err)
      const errorMsg =
        err?.message ||
        (typeof err === 'string' ? err : 'Tải lên thất bại. Vui lòng thử lại!')

      setSelectedFiles((prev) =>
        prev.map((f) =>
          f.id === item.id
            ? {
                ...f,
                status: 'error',
                errorMessage: errorMsg,
                progress: 0,
              }
            : f
        )
      )
    }
  }

  // Tải lên tất cả các tệp ở trạng thái 'ready' hoặc 'error'
  const handleUploadAll = async () => {
    const pendingItems = selectedFiles.filter(
      (f) => f.status === 'ready' || f.status === 'error'
    )
    for (const item of pendingItems) {
      // Chỉ gửi các file không bị lỗi validate định dạng/dung lượng ban đầu
      const validation = validateUploadFile(item.file)
      if (validation.valid) {
        await handleUploadSingleItem(item)
      }
    }
  }

  return (
    <div className="space-y-4">
      {/* 1. Danh sách tệp bài giảng đã gắn vào bài học */}
      {attachedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Paperclip className="w-3.5 h-3.5 text-blue-600" />
              <span>Tệp bài giảng hiện có ({attachedFiles.length})</span>
            </span>
            <span className="text-[11px] text-slate-500">
              Xem, thay thế hoặc xóa từng tệp
            </span>
          </div>

          <div className="space-y-2">
            {attachedFiles.map((fileItem) => {
              const fileKey = fileItem._id || fileItem.id || fileItem.url
              const { icon: FileIconComponent, color } = getFileIcon(
                fileItem.name || fileItem.url
              )
              const isReplacing = replacingFileId === fileKey

              return (
                <div
                  key={fileKey}
                  className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`p-2 rounded-lg border shrink-0 ${color}`}>
                      <FileIconComponent className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p
                        className="text-xs font-semibold text-slate-800 truncate"
                        title={fileItem.name}
                      >
                        {fileItem.name}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        <span className="uppercase font-semibold text-slate-500">
                          {fileItem.format || 'Tài liệu'}
                        </span>
                        {fileItem.fileSize > 0 && (
                          <span>• {formatFileSize(fileItem.fileSize)}</span>
                        )}
                        <span className="text-emerald-600 font-medium flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3" /> Đã gắn
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 justify-end">
                    {/* Mở xem */}
                    <a
                      href={fileItem.url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 text-slate-700 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 rounded-lg text-xs font-medium transition-colors inline-flex items-center gap-1"
                      title="Mở xem tài liệu trong tab mới"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Mở xem</span>
                    </a>

                    {/* Thay thế */}
                    <label
                      className={`cursor-pointer px-2.5 py-1 text-slate-700 hover:text-amber-700 hover:bg-amber-50 border border-slate-200 rounded-lg text-xs font-medium transition-colors inline-flex items-center gap-1 ${
                        isReplacing ? 'opacity-50 pointer-events-none' : ''
                      }`}
                      title="Thay thế tệp này bằng một tệp mới"
                    >
                      {isReplacing ? (
                        <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
                      ) : (
                        <RotateCw className="w-3 h-3 text-amber-600" />
                      )}
                      <span>{isReplacing ? 'Đang đổi...' : 'Thay thế'}</span>
                      <input
                        type="file"
                        accept={accept}
                        className="hidden"
                        disabled={isReplacing}
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleTriggerReplace(fileItem, e.target.files[0])
                            e.target.value = ''
                          }
                        }}
                      />
                    </label>

                    {/* Xóa tệp */}
                    <button
                      type="button"
                      onClick={() => handleTriggerDelete(fileItem)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Xóa tệp khỏi bài giảng"
                      aria-label={`Xóa tệp ${fileItem.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Vùng Dropzone Upload */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all ${
          isDragging
            ? 'border-blue-500 bg-blue-50/60 scale-[1.01]'
            : 'border-slate-200 hover:border-blue-400 bg-slate-50/50 hover:bg-slate-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple
          onChange={(e) => handleAddFiles(e.target.files)}
          className="hidden"
          id="file-upload-input"
        />

        <div className="flex flex-col items-center justify-center gap-2">
          <div className="w-12 h-12 rounded-2xl bg-blue-100/70 text-blue-600 flex items-center justify-center shadow-xs">
            <Upload className="w-6 h-6" />
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-800">{title}</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {helperText ||
                'Hỗ trợ PDF, DOCX, XLSX, PPTX (≤10MB), ZIP, RAR (≤20MB), MP4, MOV (≤30MB), Ảnh (≤5MB)'}
            </p>
          </div>

          <label
            htmlFor="file-upload-input"
            className="mt-1 cursor-pointer inline-flex items-center gap-2 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Chọn tệp từ thiết bị</span>
          </label>
        </div>
      </div>

      {/* Danh sách tệp đã chọn và tiến trình tải lên */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">
              Danh sách tệp ({selectedFiles.length})
            </span>
            {selectedFiles.some(
              (f) => f.status === 'ready' || f.status === 'error'
            ) && (
              <button
                type="button"
                onClick={handleUploadAll}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1"
              >
                <Upload className="w-3 h-3" />
                <span>Tải lên tất cả</span>
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {selectedFiles.map((item) => {
              const { icon: FileIconComponent, color } = getFileIcon(item.name)

              return (
                <div
                  key={item.id}
                  className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`p-2 rounded-lg border shrink-0 ${color}`}>
                        <FileIconComponent className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate" title={item.name}>
                          {item.name}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {item.formattedSize}
                          {item.rule && ` • Tối đa: ${item.rule.maxSizeLabel}`}
                        </p>
                      </div>
                    </div>

                    {/* Trạng thái & Nút thao tác */}
                    <div className="flex items-center gap-2 shrink-0">
                      {item.status === 'ready' && (
                        <button
                          type="button"
                          onClick={() => handleUploadSingleItem(item)}
                          className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-medium transition-colors inline-flex items-center gap-1"
                        >
                          <Upload className="w-3 h-3" />
                          <span>Tải lên</span>
                        </button>
                      )}

                      {item.status === 'uploading' && (
                        <span className="text-xs font-semibold text-blue-600 inline-flex items-center gap-1.5">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>{item.progress}%</span>
                        </span>
                      )}

                      {item.status === 'success' && (
                        <span className="text-xs font-semibold text-emerald-600 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="hidden sm:inline">Thành công</span>
                        </span>
                      )}

                      {item.status === 'error' && (
                        <button
                          type="button"
                          onClick={() => handleUploadSingleItem(item)}
                          className="px-2.5 py-1 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-xs font-medium transition-colors inline-flex items-center gap-1"
                          title="Thử tải lại"
                        >
                          <RotateCw className="w-3 h-3" />
                          <span>Thử lại</span>
                        </button>
                      )}

                      {/* Nút xóa khỏi danh sách */}
                      {item.status !== 'uploading' && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                          title="Xóa tệp khỏi danh sách"
                          aria-label={`Xóa tệp ${item.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Thanh tiến trình upload */}
                  {item.status === 'uploading' && (
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  )}

                  {/* Thông báo lỗi */}
                  {item.status === 'error' && item.errorMessage && (
                    <div className="text-[11px] text-red-600 bg-red-50/70 p-2 rounded-lg flex items-start gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{item.errorMessage}</span>
                    </div>
                  )}

                  {/* Link kết quả sau khi upload thành công */}
                  {item.status === 'success' && item.resultUrl && (
                    <div className="text-[11px] text-emerald-700 bg-emerald-50/70 p-2 rounded-lg flex items-center justify-between gap-2">
                      <span className="truncate">Đã tải lên Cloudinary: {item.resultUrl}</span>
                      <a
                        href={item.resultUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline shrink-0 inline-flex items-center gap-0.5"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Xem
                      </a>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Hiển thị tài nguyên hiện tại nếu đã có */}
      {currentResourceUrl && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 min-w-0 text-slate-700">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="truncate">
              Tài nguyên bài giảng hiện tại: <strong className="text-slate-900">{currentResourceUrl}</strong>
            </span>
          </div>
          <a
            href={currentResourceUrl}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 hover:underline shrink-0 inline-flex items-center gap-1 font-semibold"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Mở xem</span>
          </a>
        </div>
      )}
    </div>
  )
}

export default FileUploadManager

