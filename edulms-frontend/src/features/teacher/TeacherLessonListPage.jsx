import { useState, useEffect, useMemo, useId } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  BookOpen,
  Plus,
  Search,
  Edit2,
  Trash2,
  Calendar,
  AlertCircle,
  CheckCircle2,
  X,
  GripVertical,
  Video,
  FileText,
  Presentation,
  Link as LinkIcon,
  Layers,
  Sparkles,
  ExternalLink,
  Filter,
  RefreshCw,
} from 'lucide-react'
import { useAuth } from '@/context/useAuth'
import lessonApi from '@/api/lessonApi'
import academicApi from '@/api/academicApi'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import FileUploadManager from '@/components/teacher/FileUploadManager'

// Danh sách các loại nội dung hỗ trợ
const CONTENT_TYPE_CONFIG = {
  video: {
    label: 'Video bài giảng',
    icon: Video,
    color: 'bg-rose-50 text-rose-700 border-rose-200',
    accept: 'video/mp4,video/quicktime,video/webm',
  },
  pdf: {
    label: 'Tài liệu PDF',
    icon: FileText,
    color: 'bg-red-50 text-red-700 border-red-200',
    accept: '.pdf,application/pdf',
  },
  slide: {
    label: 'Bài trình chiếu (Slide)',
    icon: Presentation,
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    accept: '.ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation',
  },
  document: {
    label: 'Văn bản (Word, RTF, TXT)',
    icon: BookOpen,
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    accept: '.doc,.docx,.txt,.rtf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain',
  },
  link: {
    label: 'Liên kết ngoài',
    icon: LinkIcon,
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    accept: null,
  },
  text: {
    label: 'Nội dung chữ',
    icon: Layers,
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    accept: null,
  },
}

/**
 * Component hiển thị một hàng bài giảng có khả năng Sortable (Kéo - thả)
 */
const SortableLessonItem = ({ lesson, onEdit, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lesson._id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const typeConfig = CONTENT_TYPE_CONFIG[lesson.contentType] || CONTENT_TYPE_CONFIG.document
  const IconComponent = typeConfig.icon

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group bg-white border rounded-2xl p-4 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
        isDragging
          ? 'shadow-xl border-blue-500 bg-blue-50/40 z-20 opacity-90 scale-[1.01]'
          : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
      }`}
    >
      <div className="flex items-start md:items-center gap-3.5 min-w-0">
        {/* Nút nắm kéo thả */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Kéo thả để sắp xếp bài giảng: ${lesson.title}`}
          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-grab active:cursor-grabbing transition-colors shrink-0"
        >
          <GripVertical className="w-5 h-5" />
        </button>

        {/* Badge số thứ tự */}
        <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0 border border-slate-200">
          #{lesson.order}
        </div>

        {/* Icon loại nội dung */}
        <div className={`p-2.5 rounded-xl border shrink-0 ${typeConfig.color}`}>
          <IconComponent className="w-5 h-5" />
        </div>

        {/* Thông tin bài giảng */}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-slate-800 truncate" title={lesson.title}>
              {lesson.title}
            </h3>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${typeConfig.color}`}
            >
              {typeConfig.label}
            </span>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                lesson.isActive
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}
            >
              {lesson.isActive ? 'Đang kích hoạt' : 'Tạm ẩn'}
            </span>
          </div>

          {lesson.description && (
            <p className="text-xs text-slate-500 line-clamp-1 mt-1">
              {lesson.description}
            </p>
          )}

          <div className="flex items-center gap-4 text-[11px] text-slate-400 mt-1.5">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {lesson.createdAt
                ? new Date(lesson.createdAt).toLocaleDateString('vi-VN')
                : 'Mới tạo'}
            </span>
            {lesson.resourceUrl && (
              <a
                href={lesson.resourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline flex items-center gap-1 truncate max-w-xs"
              >
                <ExternalLink className="w-3 h-3" />
                Xem tài nguyên
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Hành động sửa / xóa */}
      <div className="flex items-center justify-end gap-1.5 shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-slate-100">
        <button
          type="button"
          onClick={() => onEdit(lesson)}
          className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
          title="Chỉnh sửa bài giảng"
          aria-label="Chỉnh sửa"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(lesson)}
          className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
          title="Xóa bài giảng"
          aria-label="Xóa"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

/**
 * Trang Quản lý danh sách bài giảng dành cho Giáo viên
 */
export const TeacherLessonListPage = () => {
  const { user } = useAuth()
  const titleId = useId()
  const descId = useId()
  const typeId = useId()
  const orderId = useId()
  const resourceId = useId()

  // Phân công giảng dạy của giáo viên hiện tại
  const [assignments, setAssignments] = useState([])
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('')
  const [loadingAssignments, setLoadingAssignments] = useState(true)

  // Danh sách bài giảng thuộc phân công đang chọn
  const [lessons, setLessons] = useState([])
  const [loadingLessons, setLoadingLessons] = useState(false)
  const [isReordering, setIsReordering] = useState(false)

  // Bộ lọc
  const [searchKeyword, setSearchKeyword] = useState('')
  const [filterType, setFilterType] = useState('ALL')
  const [filterActive, setFilterActive] = useState('ALL')

  // Trạng thái chung
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  // Modal quản lý Thêm/Sửa/Xóa
  const [modalType, setModalType] = useState(null) // 'create' | 'edit' | 'delete'
  const [activeLesson, setActiveLesson] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    contentType: 'video',
    resourceUrl: '',
    order: 1,
    isActive: true,
  })
  const [formError, setFormError] = useState(null)
  const [formSubmitting, setFormSubmitting] = useState(false)

  // Upload file state
  const [uploadingFile, setUploadingFile] = useState(false)

  // Cảm biến kéo thả dnd-kit
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // State kích hoạt tải lại
  const [assignmentsReloadKey, setAssignmentsReloadKey] = useState(0)
  const [lessonsReloadKey, setLessonsReloadKey] = useState(0)

  // Tải danh sách phân công giảng dạy của giáo viên
  useEffect(() => {
    let ignore = false
    const teacherId = user?.userId || user?._id

    if (!teacherId) {
      return
    }

    const loadAssignments = async () => {
      try {
        const res = await academicApi.getTeacherSchedule(teacherId)
        if (!ignore) {
          const data = res.data || res || []
          setAssignments(data)

          // Mặc định chọn phân công đầu tiên nếu có
          if (data.length > 0 && !selectedAssignmentId) {
            setSelectedAssignmentId(data[0]._id)
          }
        }
      } catch (err) {
        if (!ignore) {
          console.error('Lỗi tải phân công giảng dạy:', err)
          setError(err?.message || 'Không thể tải danh sách phân công giảng dạy.')
        }
      } finally {
        if (!ignore) {
          setLoadingAssignments(false)
        }
      }
    }

    loadAssignments()

    return () => {
      ignore = true
    }
  }, [user, selectedAssignmentId, assignmentsReloadKey])

  // Tải danh sách bài giảng theo phân công được chọn
  useEffect(() => {
    let ignore = false

    if (!selectedAssignmentId) {
      return
    }

    const loadLessons = async () => {
      try {
        const res = await lessonApi.getLessons({ teachingAssignment: selectedAssignmentId })
        if (!ignore) {
          const data = res.data || res || []
          // Sắp xếp tăng dần theo order
          const sorted = [...data].sort((a, b) => (a.order || 0) - (b.order || 0))
          setLessons(sorted)
        }
      } catch (err) {
        if (!ignore) {
          console.error('Lỗi tải bài giảng:', err)
          setError(err?.message || 'Không thể tải danh sách bài giảng.')
        }
      } finally {
        if (!ignore) {
          setLoadingLessons(false)
        }
      }
    }

    loadLessons()

    return () => {
      ignore = true
    }
  }, [selectedAssignmentId, lessonsReloadKey])

  // Hàm kích hoạt tải lại danh sách bài giảng sau khi tạo, sửa, xóa, kéo thả
  const reloadLessons = () => {
    setLoadingLessons(true)
    setLessonsReloadKey((k) => k + 1)
  }

  // Phân công đang chọn hiện tại
  const currentAssignment = useMemo(() => {
    return assignments.find((a) => a._id === selectedAssignmentId) || null
  }, [assignments, selectedAssignmentId])

  // Lọc bài giảng theo từ khóa và bộ lọc
  const filteredLessons = useMemo(() => {
    return lessons.filter((lesson) => {
      const matchKeyword =
        !searchKeyword.trim() ||
        lesson.title?.toLowerCase().includes(searchKeyword.trim().toLowerCase()) ||
        lesson.description?.toLowerCase().includes(searchKeyword.trim().toLowerCase())

      const matchType = filterType === 'ALL' || lesson.contentType === filterType
      const matchActive =
        filterActive === 'ALL' ||
        (filterActive === 'ACTIVE' && lesson.isActive) ||
        (filterActive === 'INACTIVE' && !lesson.isActive)

      return matchKeyword && matchType && matchActive
    })
  }, [lessons, searchKeyword, filterType, filterActive])

  // Xử lý sự kiện kết thúc kéo thả
  const handleDragEnd = async (event) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const oldIndex = lessons.findIndex((item) => item._id === active.id)
    const newIndex = lessons.findIndex((item) => item._id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    // Cập nhật mảng trên UI ngay lập tức
    const reordered = arrayMove(lessons, oldIndex, newIndex).map((item, index) => ({
      ...item,
      order: index + 1,
    }))

    setLessons(reordered)

    // Đồng bộ thứ tự mới về backend
    try {
      setIsReordering(true)
      const orderPayload = reordered.map((item) => ({
        _id: item._id,
        order: item.order,
      }))
      await lessonApi.reorderLessons(orderPayload)
      setSuccessMsg('Đã cập nhật thứ tự bài giảng thành công!')
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err) {
      console.error('Lỗi đồng bộ thứ tự bài giảng:', err)
      setError('Không thể lưu thứ tự bài giảng mới, vui lòng thử lại!')
      // Rollback lại danh sách cũ nếu lỗi
      reloadLessons()
    } finally {
      setIsReordering(false)
    }
  }

  // Mở modal thêm mới
  const handleOpenCreateModal = () => {
    setFormError(null)
    setFormData({
      title: '',
      description: '',
      contentType: 'video',
      resourceUrl: '',
      order: lessons.length + 1,
      isActive: true,
    })
    setModalType('create')
  }

  // Mở modal chỉnh sửa
  const handleOpenEditModal = (lesson) => {
    setActiveLesson(lesson)
    setFormError(null)
    setFormData({
      title: lesson.title || '',
      description: lesson.description || '',
      contentType: lesson.contentType || 'document',
      resourceUrl: lesson.resourceUrl || '',
      order: lesson.order || 1,
      isActive: lesson.isActive !== undefined ? lesson.isActive : true,
    })
    setModalType('edit')
  }

  // Mở modal xóa
  const handleOpenDeleteModal = (lesson) => {
    setActiveLesson(lesson)
    setFormError(null)
    setModalType('delete')
  }

  // Đóng modal
  const handleCloseModal = () => {
    setModalType(null)
    setActiveLesson(null)
    setFormError(null)
    setFormSubmitting(false)
    setUploadingFile(false)
  }

  // Submit form thêm hoặc sửa bài giảng
  const handleFormSubmit = async (e) => {
    e.preventDefault()

    if (!formData.title?.trim()) {
      setFormError('Vui lòng nhập tiêu đề bài giảng!')
      return
    }

    if (formData.contentType !== 'text' && !formData.resourceUrl?.trim()) {
      setFormError(`Loại nội dung '${CONTENT_TYPE_CONFIG[formData.contentType]?.label}' bắt buộc phải có đường dẫn tài nguyên (resourceUrl)!`)
      return
    }

    try {
      setFormSubmitting(true)
      setFormError(null)

      if (modalType === 'create') {
        const payload = {
          ...formData,
          title: formData.title.trim(),
          description: formData.description?.trim() || '',
          resourceUrl: formData.resourceUrl?.trim() || '',
          order: Number(formData.order) || 1,
          teachingAssignment: selectedAssignmentId,
        }
        await lessonApi.createLesson(payload)
        setSuccessMsg('Tạo mới nội dung bài giảng thành công!')
      } else if (modalType === 'edit') {
        const payload = {
          title: formData.title.trim(),
          description: formData.description?.trim() || '',
          contentType: formData.contentType,
          resourceUrl: formData.resourceUrl?.trim() || '',
          order: Number(formData.order) || 1,
          isActive: formData.isActive,
        }
        await lessonApi.updateLesson(activeLesson._id, payload)
        setSuccessMsg('Cập nhật nội dung bài giảng thành công!')
      }

      handleCloseModal()
      reloadLessons()
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err) {
      console.error('Lỗi lưu bài giảng:', err)
      setFormError(err?.message || 'Có lỗi xảy ra trong quá trình lưu bài giảng!')
    } finally {
      setFormSubmitting(false)
    }
  }

  // Xác nhận xóa bài giảng
  const handleDeleteConfirm = async () => {
    if (!activeLesson) return

    try {
      setFormSubmitting(true)
      setFormError(null)

      await lessonApi.deleteLesson(activeLesson._id)
      setSuccessMsg(`Đã xóa bài giảng '${activeLesson.title}' thành công!`)
      handleCloseModal()
      reloadLessons()
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err) {
      console.error('Lỗi xóa bài giảng:', err)
      setFormError(err?.message || 'Không thể xóa bài giảng, vui lòng thử lại!')
    } finally {
      setFormSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header trang */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-blue-600" />
            Quản lý bài giảng & Nội dung học tập
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý, tạo mới và kéo thả sắp xếp các bài giảng thuộc các lớp và môn học được phân công.
          </p>
        </div>

        {selectedAssignmentId && (
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm bài giảng mới</span>
          </button>
        )}
      </div>

      {/* Thông báo Thành công & Lỗi */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-3 animate-fadeIn text-xs font-medium">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="flex-1">{successMsg}</span>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-600 hover:text-emerald-800 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl flex items-center gap-3 animate-fadeIn text-xs font-medium">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-800 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Card chọn Phân công giảng dạy (Lớp & Môn học) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-600" />
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Chọn Lớp và Môn học được phân công
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              setLoadingAssignments(true)
              setAssignmentsReloadKey((k) => k + 1)
            }}
            disabled={loadingAssignments}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingAssignments ? 'animate-spin' : ''}`} />
            <span>Làm mới phân công</span>
          </button>
        </div>

        {loadingAssignments ? (
          <div className="py-6 flex justify-center">
            <LoadingSpinner size="md" message="Đang tải danh sách phân công giảng dạy..." />
          </div>
        ) : assignments.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-800">Chưa có phân công giảng dạy</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Hiện bạn chưa được phân công lớp hoặc môn học nào trong hệ thống. Vui lòng liên hệ quản trị viên để được phân công.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {assignments.map((assignment) => {
              const isSelected = assignment._id === selectedAssignmentId
              return (
                <button
                  type="button"
                  key={assignment._id}
                  onClick={() => setSelectedAssignmentId(assignment._id)}
                  className={`text-left p-3.5 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-blue-50/70 border-blue-500 shadow-xs ring-1 ring-blue-500'
                      : 'bg-slate-50/70 border-slate-200 hover:border-slate-300 hover:bg-slate-100/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-800 truncate">
                      {assignment.subject?.name || 'Môn học'}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">
                      Lớp {assignment.class?.name || '---'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span>Phòng: {assignment.class?.room || 'Chưa xếp'}</span>
                    <span>•</span>
                    <span>Mã môn: {assignment.subject?.code || '---'}</span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Danh sách bài giảng & Thao tác kéo thả */}
      {selectedAssignmentId && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Thanh công cụ tìm kiếm và lọc */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 flex-wrap">
              {/* Ô tìm kiếm */}
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm kiếm bài giảng theo tên, mô tả..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                {searchKeyword && (
                  <button
                    type="button"
                    onClick={() => setSearchKeyword('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Lọc loại nội dung */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                aria-label="Lọc theo loại nội dung"
                className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">Tất cả định dạng</option>
                {Object.entries(CONTENT_TYPE_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label}
                  </option>
                ))}
              </select>

              {/* Lọc trạng thái kích hoạt */}
              <select
                value={filterActive}
                onChange={(e) => setFilterActive(e.target.value)}
                aria-label="Lọc theo trạng thái"
                className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="ACTIVE">Đang kích hoạt</option>
                <option value="INACTIVE">Tạm ẩn</option>
              </select>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>
                Tổng số: <strong className="text-slate-800">{filteredLessons.length}</strong> bài giảng
              </span>
              {isReordering && (
                <span className="text-blue-600 font-semibold animate-pulse ml-2 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Đang lưu thứ tự...
                </span>
              )}
            </div>
          </div>

          {/* Vùng hiển thị danh sách bài giảng */}
          <div className="p-4">
            {loadingLessons ? (
              <div className="py-12 flex justify-center">
                <LoadingSpinner size="lg" message="Đang tải danh sách bài giảng..." />
              </div>
            ) : filteredLessons.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mx-auto mb-3">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">
                  {searchKeyword || filterType !== 'ALL' || filterActive !== 'ALL'
                    ? 'Không tìm thấy bài giảng phù hợp bộ lọc'
                    : 'Chưa có bài giảng nào trong lớp này'}
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {searchKeyword || filterType !== 'ALL' || filterActive !== 'ALL'
                    ? 'Thử thay đổi từ khóa hoặc đặt lại bộ lọc để tìm kiếm'
                    : 'Hãy bấm nút "Thêm bài giảng mới" để đăng tài liệu và video cho học sinh.'}
                </p>
                {(!searchKeyword && filterType === 'ALL' && filterActive === 'ALL') && (
                  <button
                    type="button"
                    onClick={handleOpenCreateModal}
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tạo bài giảng đầu tiên</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3.5 py-2 rounded-xl flex items-center gap-2">
                  <GripVertical className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Mẹo:</strong> Kéo và thả biểu tượng 6 chấm ở mỗi bài giảng để thay đổi thứ tự hiển thị cho học sinh.
                  </span>
                </div>

                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={filteredLessons.map((l) => l._id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2.5">
                      {filteredLessons.map((lesson) => (
                        <SortableLessonItem
                          key={lesson._id}
                          lesson={lesson}
                          onEdit={handleOpenEditModal}
                          onDelete={handleOpenDeleteModal}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Thêm mới hoặc Chỉnh sửa bài giảng */}
      {(modalType === 'create' || modalType === 'edit') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    {modalType === 'create' ? 'Thêm bài giảng mới' : 'Chỉnh sửa bài giảng'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Lớp: {currentAssignment?.class?.name} • Môn: {currentAssignment?.subject?.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Tiêu đề */}
              <div className="space-y-1">
                <label htmlFor={titleId} className="text-xs font-semibold text-slate-700">
                  Tiêu đề bài giảng <span className="text-red-500">*</span>
                </label>
                <input
                  id={titleId}
                  type="text"
                  required
                  placeholder="Ví dụ: Chương 1 - Mệnh đề và tập hợp"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Loại nội dung */}
              <div className="space-y-1">
                <label htmlFor={typeId} className="text-xs font-semibold text-slate-700">
                  Loại nội dung <span className="text-red-500">*</span>
                </label>
                <select
                  id={typeId}
                  value={formData.contentType}
                  onChange={(e) => setFormData({ ...formData, contentType: e.target.value })}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(CONTENT_TYPE_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tải tệp lên Cloudinary (nếu là video, pdf, slide, document) */}
              {CONTENT_TYPE_CONFIG[formData.contentType]?.accept && (
                <div className="space-y-1.5 p-3.5 bg-blue-50/40 border border-blue-100 rounded-2xl">
                  <FileUploadManager
                    title="Tải lên tệp tài nguyên cho bài giảng"
                    accept={CONTENT_TYPE_CONFIG[formData.contentType]?.accept}
                    currentResourceUrl={formData.resourceUrl}
                    onUploadSuccess={(url) => {
                      setFormData((prev) => ({ ...prev, resourceUrl: url }))
                      setSuccessMsg('Đã tải tệp lên Cloudinary và liên kết thành công!')
                    }}
                  />
                </div>
              )}

              {/* Đường dẫn tài nguyên (resourceUrl) */}
              {formData.contentType !== 'text' && (
                <div className="space-y-1">
                  <label htmlFor={resourceId} className="text-xs font-semibold text-slate-700">
                    Đường dẫn tài nguyên (URL) <span className="text-red-500">*</span>
                  </label>
                  <input
                    id={resourceId}
                    type="text"
                    required
                    placeholder="https://... hoặc tải lên từ nút bên trên"
                    value={formData.resourceUrl}
                    onChange={(e) => setFormData({ ...formData, resourceUrl: e.target.value })}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Mô tả */}
              <div className="space-y-1">
                <label htmlFor={descId} className="text-xs font-semibold text-slate-700">
                  Mô tả bài học
                </label>
                <textarea
                  id={descId}
                  rows={3}
                  placeholder="Ghi chú hướng dẫn cho học sinh..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Thứ tự & Trạng thái kích hoạt */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor={orderId} className="text-xs font-semibold text-slate-700">
                    Số thứ tự hiển thị
                  </label>
                  <input
                    id={orderId}
                    type="number"
                    min="1"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: e.target.value })}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-semibold text-slate-700">Trạng thái</span>
                  <div className="pt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Kích hoạt hiển thị cho học sinh</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Nút hành động */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting || uploadingFile}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {formSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{modalType === 'create' ? 'Tạo bài giảng' : 'Lưu thay đổi'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal xác nhận xóa bài giảng */}
      {modalType === 'delete' && activeLesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-100 text-red-600 rounded-2xl shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Xóa bài giảng?</h3>
                <p className="text-xs text-slate-500 mt-0.5">Hành động này không thể hoàn tác.</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 space-y-1">
              <p>
                <strong>Tiêu đề:</strong> {activeLesson.title}
              </p>
              <p>
                <strong>Loại:</strong> {CONTENT_TYPE_CONFIG[activeLesson.contentType]?.label}
              </p>
              <p>
                <strong>Thứ tự:</strong> #{activeLesson.order}
              </p>
            </div>

            {formError && (
              <p className="text-xs text-red-600 font-medium">{formError}</p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={formSubmitting}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {formSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Xác nhận xóa</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TeacherLessonListPage

