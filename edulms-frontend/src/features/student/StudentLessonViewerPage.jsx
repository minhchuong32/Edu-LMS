import { useState, useEffect, useMemo } from 'react'
import {
  BookOpen,
  Video,
  FileText,
  Presentation,
  FileSpreadsheet,
  Archive,
  Link as LinkIcon,
  Download,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Search,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  User,
  Calendar,
  Layers,
  GraduationCap,
  File,
} from 'lucide-react'
import { useAuth } from '@/context/useAuth'
import lessonApi from '@/api/lessonApi'
import academicApi from '@/api/academicApi'
import LoadingSpinner from '@/components/common/LoadingSpinner'

// Cấu hình hiển thị theo từng loại nội dung học tập
const STUDENT_CONTENT_TYPES = {
  video: {
    label: 'Video bài giảng',
    icon: Video,
    color: 'bg-rose-50 text-rose-700 border-rose-200',
    badgeBg: 'bg-rose-100 text-rose-800',
  },
  pdf: {
    label: 'Tài liệu PDF',
    icon: FileText,
    color: 'bg-red-50 text-red-700 border-red-200',
    badgeBg: 'bg-red-100 text-red-800',
  },
  slide: {
    label: 'Bài trình chiếu',
    icon: Presentation,
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    badgeBg: 'bg-amber-100 text-amber-800',
  },
  document: {
    label: 'Văn bản tài liệu',
    icon: BookOpen,
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    badgeBg: 'bg-blue-100 text-blue-800',
  },
  spreadsheet: {
    label: 'Bảng tính',
    icon: FileSpreadsheet,
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    badgeBg: 'bg-emerald-100 text-emerald-800',
  },
  archive: {
    label: 'Tập tin nén',
    icon: Archive,
    color: 'bg-purple-50 text-purple-700 border-purple-200',
    badgeBg: 'bg-purple-100 text-purple-800',
  },
  link: {
    label: 'Liên kết ngoài',
    icon: LinkIcon,
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    badgeBg: 'bg-indigo-100 text-indigo-800',
  },
  text: {
    label: 'Nội dung chữ',
    icon: Layers,
    color: 'bg-slate-50 text-slate-700 border-slate-200',
    badgeBg: 'bg-slate-100 text-slate-800',
  },
}

/**
 * Trợ giúp trích xuất đuôi mở rộng và tên file từ URL
 */
const getFileInfoFromUrl = (url, defaultName = 'Tài liệu') => {
  if (!url) return { filename: defaultName, extension: '', isVideo: false, isPdf: false }
  try {
    const cleanUrl = url.split('?')[0].split('#')[0]
    const parts = cleanUrl.split('/')
    const filename = decodeURIComponent(parts[parts.length - 1] || defaultName)
    const extIndex = filename.lastIndexOf('.')
    const extension = extIndex !== -1 ? filename.substring(extIndex + 1).toLowerCase() : ''
    const isVideo = ['mp4', 'mov', 'webm', 'mkv', 'avi'].includes(extension)
    const isPdf = extension === 'pdf'
    const isSpreadsheet = ['xls', 'xlsx', 'csv'].includes(extension)
    const isPresentation = ['ppt', 'pptx'].includes(extension)
    const isArchive = ['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)
    const isDocument = ['doc', 'docx', 'txt', 'rtf'].includes(extension)
    return {
      filename,
      extension: extension.toUpperCase(),
      isVideo,
      isPdf,
      isSpreadsheet,
      isPresentation,
      isArchive,
      isDocument,
    }
  } catch {
    return { filename: defaultName, extension: '', isVideo: false, isPdf: false }
  }
}

export const StudentLessonViewerPage = () => {
  const { user } = useAuth()

  // State quản lý danh sách môn học và phân công của lớp học sinh
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [studentClassInfo, setStudentClassInfo] = useState(null)
  const [assignments, setAssignments] = useState([])
  const [selectedAssignment, setSelectedAssignment] = useState(null)

  // State quản lý danh sách bài giảng theo môn học
  const [lessons, setLessons] = useState([])
  const [loadingLessons, setLoadingLessons] = useState(false)
  const [selectedLesson, setSelectedLesson] = useState(null)
  const [lessonError, setLessonError] = useState(null)

  // State tìm kiếm và lọc nội dung
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedContentTypeFilter, setSelectedContentTypeFilter] = useState('all')

  // State giao diện responsive (Sidebar mobile)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  // State phát video lỗi
  const [videoError, setVideoError] = useState(false)

  // State tải lại dữ liệu khi nhấn nút thử lại
  const [reloadKey, setReloadKey] = useState(0)

  /**
   * 1. Khởi tạo: Lấy thông tin lớp học của học sinh và danh sách phân công môn học
   */
  useEffect(() => {
    let ignore = false

    const loadCurriculum = async () => {
      try {
        // 1. Xác định lớp học của học sinh
        let classId = user?.classRef || (typeof user?.class === 'object' ? user?.class?._id : user?.class)
        let className = user?.className

        // Nếu chỉ có className mà chưa có classId, tìm qua academicApi.getClasses()
        if (!classId && className) {
          try {
            const resClasses = await academicApi.getClasses({ name: className })
            const classList = resClasses.data || resClasses || []
            const foundClass = Array.isArray(classList)
              ? classList.find((c) => c.name?.toLowerCase() === className.toLowerCase())
              : classList
            if (foundClass && !ignore) {
              classId = foundClass._id
              setStudentClassInfo(foundClass)
            }
          } catch (err) {
            console.warn('Không thể tải chi tiết lớp học theo tên:', err)
          }
        }

        // 2. Tải danh sách phân công giảng dạy thuộc lớp học của học sinh
        const params = classId ? { class: classId } : {}
        const res = await academicApi.getAssignments(params)
        const rawAssignments = res.data || res || []
        const classAssignments = Array.isArray(rawAssignments) ? rawAssignments : []

        // Lọc danh sách phân công nếu có classId hoặc className
        let filteredAssignments = classAssignments
        if (classId) {
          filteredAssignments = classAssignments.filter((item) => {
            const itemClassId = item.class?._id || item.class
            return itemClassId?.toString() === classId.toString()
          })
        } else if (className) {
          filteredAssignments = classAssignments.filter((item) => {
            const itemClassName = item.class?.name || item.className
            return itemClassName?.toLowerCase() === className.toLowerCase()
          })
        }

        if (!ignore) {
          setAssignments(filteredAssignments)

          // Cập nhật thông tin lớp hiển thị
          if (filteredAssignments.length > 0 && filteredAssignments[0].class) {
            setStudentClassInfo(filteredAssignments[0].class)
          } else if (className) {
            setStudentClassInfo((prev) => prev || { name: className })
          }

          // Tự động chọn môn học đầu tiên
          if (filteredAssignments.length > 0) {
            setSelectedAssignment((prev) => prev || filteredAssignments[0])
          }
        }
      } catch (err) {
        if (!ignore) {
          console.error('Lỗi khi tải thông tin môn học:', err)
          setLessonError(
            err.response?.data?.message ||
              'Không thể tải thông tin môn học của lớp. Vui lòng kiểm tra lại kết nối mạng!'
          )
        }
      } finally {
        if (!ignore) {
          setLoadingInitial(false)
        }
      }
    }

    loadCurriculum()

    return () => {
      ignore = true
    }
  }, [user?.classRef, user?.class, user?.className, reloadKey])

  /**
   * 2. Tải danh sách bài giảng khi học sinh chọn môn học khác
   */
  useEffect(() => {
    let isMounted = true

    if (!selectedAssignment) {
      return
    }

    const fetchLessonsBySubject = async () => {
      try {
        const classId =
          selectedAssignment.class?._id ||
          selectedAssignment.class ||
          user?.classRef
        const subjectId =
          selectedAssignment.subject?._id || selectedAssignment.subject

        let lessonList = []

        // Gọi API lấy bài giảng theo Lớp và Môn học (hỗ trợ canStudentAccessClassLessons)
        if (classId && subjectId) {
          const res = await lessonApi.getLessonsByClassAndSubject({
            classId,
            subjectId,
            academicYear: selectedAssignment.academicYear,
            semester: selectedAssignment.semester,
          })
          const resData = res.data || res
          lessonList = resData?.lessons || resData || []
        } else {
          // Dự phòng qua teachingAssignment ID
          const res = await lessonApi.getLessons({
            teachingAssignment: selectedAssignment._id,
            isActive: true,
          })
          const resData = res.data || res
          lessonList = Array.isArray(resData) ? resData : resData?.lessons || []
        }

        if (isMounted) {
          // Sắp xếp bài giảng theo thứ tự order tăng dần
          const sorted = [...lessonList].sort((a, b) => (a.order || 0) - (b.order || 0))
          setLessons(sorted)

          // Tự động chọn bài giảng đầu tiên khi vào môn học
          if (sorted.length > 0) {
            setSelectedLesson(sorted[0])
          } else {
            setSelectedLesson(null)
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error('Lỗi khi tải danh sách bài giảng:', err)
          setLessonError(
            err.response?.data?.message ||
              'Không thể tải nội dung bài giảng của môn học này.'
          )
          setLessons([])
          setSelectedLesson(null)
        }
      } finally {
        if (isMounted) {
          setLoadingLessons(false)
        }
      }
    }

    fetchLessonsBySubject()

    return () => {
      isMounted = false
    }
  }, [selectedAssignment, user?.classRef])

  /**
   * Danh sách bài giảng được lọc theo từ khóa và loại nội dung
   */
  const filteredLessons = useMemo(() => {
    return lessons.filter((lesson) => {
      const matchSearch = searchTerm.trim()
        ? lesson.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          lesson.description?.toLowerCase().includes(searchTerm.toLowerCase())
        : true

      const matchType =
        selectedContentTypeFilter === 'all'
          ? true
          : lesson.contentType === selectedContentTypeFilter

      return matchSearch && matchType
    })
  }, [lessons, searchTerm, selectedContentTypeFilter])

  /**
   * Xử lý điều hướng bài trước / bài tiếp theo
   */
  const currentLessonIndex = useMemo(() => {
    if (!selectedLesson) return -1
    return filteredLessons.findIndex((l) => l._id === selectedLesson._id)
  }, [filteredLessons, selectedLesson])

  const handlePrevLesson = () => {
    if (currentLessonIndex > 0) {
      setSelectedLesson(filteredLessons[currentLessonIndex - 1])
      setVideoError(false)
    }
  }

  const handleNextLesson = () => {
    if (currentLessonIndex >= 0 && currentLessonIndex < filteredLessons.length - 1) {
      setSelectedLesson(filteredLessons[currentLessonIndex + 1])
      setVideoError(false)
    }
  }

  // Thông tin tệp hiện tại (nếu có tài nguyên đính kèm)
  const currentFileInfo = useMemo(() => {
    if (!selectedLesson?.resourceUrl) return null
    return getFileInfoFromUrl(selectedLesson.resourceUrl, selectedLesson.title)
  }, [selectedLesson])

  // Trạng thái cấu hình icon và màu loại nội dung bài học
  const activeTypeConfig = useMemo(() => {
    if (!selectedLesson) return STUDENT_CONTENT_TYPES.document
    return STUDENT_CONTENT_TYPES[selectedLesson.contentType] || STUDENT_CONTENT_TYPES.document
  }, [selectedLesson])

  /**
   * Render Sidebar Danh sách bài giảng (Dùng chung cho Desktop và Mobile Drawer)
   */
  const renderSidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* 1. Header Lớp học & Môn học */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/70">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 leading-tight">
                {studentClassInfo?.name ? `Lớp ${studentClassInfo.name}` : user?.className ? `Lớp ${user.className}` : 'Lớp của bạn'}
              </h2>
              <p className="text-[11px] text-slate-500">
                {assignments.length} môn học được phân công
              </p>
            </div>
          </div>
          {/* Nút đóng drawer trên mobile */}
          <button
            onClick={() => setIsMobileSidebarOpen(false)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50"
            aria-label="Đóng danh sách"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Danh sách chọn môn học (Subject Pills) */}
        <div className="mt-3">
          <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
            Chọn môn học:
          </label>
          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
            {assignments.map((assignment) => {
              const isSelected = selectedAssignment?._id === assignment._id
              const subjectName = assignment.subject?.name || 'Môn học'
              const teacherName = assignment.teacher?.fullName || ''

              return (
                <button
                  key={assignment._id}
                  onClick={() => {
                    setSelectedAssignment(assignment)
                    setSearchTerm('')
                    setSelectedContentTypeFilter('all')
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center space-x-1.5 ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs font-semibold'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                  title={teacherName ? `Giáo viên: ${teacherName}` : ''}
                >
                  <BookOpen className="w-3.5 h-3.5 opacity-80" />
                  <span>{subjectName}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* 2. Thanh tìm kiếm bài giảng */}
      <div className="p-3 border-b border-slate-100 bg-white">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm tên bài học..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
              aria-label="Xóa tìm kiếm"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Lọc nhanh theo loại nội dung */}
        <div className="flex items-center gap-1 mt-2 overflow-x-auto pb-1 text-[11px] scrollbar-none">
          <button
            onClick={() => setSelectedContentTypeFilter('all')}
            className={`px-2 py-0.5 rounded-lg whitespace-nowrap transition-colors ${
              selectedContentTypeFilter === 'all'
                ? 'bg-slate-800 text-white font-medium'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Tất cả ({lessons.length})
          </button>
          <button
            onClick={() => setSelectedContentTypeFilter('video')}
            className={`px-2 py-0.5 rounded-lg whitespace-nowrap transition-colors flex items-center space-x-1 ${
              selectedContentTypeFilter === 'video'
                ? 'bg-rose-600 text-white font-medium'
                : 'text-rose-700 hover:bg-rose-50'
            }`}
          >
            <Video className="w-3 h-3" />
            <span>Video</span>
          </button>
          <button
            onClick={() => setSelectedContentTypeFilter('pdf')}
            className={`px-2 py-0.5 rounded-lg whitespace-nowrap transition-colors flex items-center space-x-1 ${
              selectedContentTypeFilter === 'pdf'
                ? 'bg-red-600 text-white font-medium'
                : 'text-red-700 hover:bg-red-50'
            }`}
          >
            <FileText className="w-3 h-3" />
            <span>PDF</span>
          </button>
        </div>
      </div>

      {/* 3. Danh sách bài giảng theo thứ tự sắp xếp */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loadingLessons ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400">
            <LoadingSpinner size="md" />
            <p className="text-xs mt-2 text-slate-500">Đang tải danh sách bài học...</p>
          </div>
        ) : filteredLessons.length === 0 ? (
          <div className="py-10 px-4 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
              <BookOpen className="w-6 h-6" />
            </div>
            <p className="text-xs font-medium text-slate-700">
              {searchTerm || selectedContentTypeFilter !== 'all'
                ? 'Không tìm thấy bài học phù hợp'
                : 'Chưa có bài học nào'}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {searchTerm || selectedContentTypeFilter !== 'all'
                ? 'Thử thay đổi từ khóa hoặc bộ lọc'
                : 'Giáo viên chưa đăng tải nội dung bài giảng'}
            </p>
          </div>
        ) : (
          filteredLessons.map((lesson, index) => {
            const isSelected = selectedLesson?._id === lesson._id
            const typeConfig = STUDENT_CONTENT_TYPES[lesson.contentType] || STUDENT_CONTENT_TYPES.document
            const IconComponent = typeConfig.icon

            return (
              <button
                key={lesson._id}
                onClick={() => {
                  setSelectedLesson(lesson)
                  setVideoError(false)
                  setIsMobileSidebarOpen(false)
                }}
                className={`w-full text-left p-3 rounded-xl transition-all border flex items-start space-x-3 group ${
                  isSelected
                    ? 'bg-blue-50/80 border-blue-500 shadow-xs ring-1 ring-blue-500/30'
                    : 'bg-white border-slate-200/80 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                {/* Số thứ tự bài giảng */}
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 transition-colors ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                  }`}
                >
                  #{lesson.order || index + 1}
                </div>

                {/* Tiêu đề & Loại nội dung */}
                <div className="flex-1 min-w-0">
                  <h4
                    className={`text-xs font-semibold leading-snug line-clamp-2 ${
                      isSelected ? 'text-blue-900 font-bold' : 'text-slate-800'
                    }`}
                  >
                    {lesson.title}
                  </h4>

                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span
                      className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${typeConfig.color}`}
                    >
                      <IconComponent className="w-2.5 h-2.5" />
                      <span>{typeConfig.label}</span>
                    </span>

                    <span className="inline-flex items-center text-[10px] text-emerald-600 font-medium">
                      <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
                      Đang mở
                    </span>
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>

      {/* 4. Footer Sidebar */}
      <div className="p-3 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-500 flex items-center justify-between">
        <span>Tổng số: {filteredLessons.length} bài học</span>
        {selectedAssignment?.teacher?.fullName && (
          <span className="truncate max-w-[150px] font-medium text-slate-700">
            GV: {selectedAssignment.teacher.fullName}
          </span>
        )}
      </div>
    </div>
  )

  /**
   * Render Trình phát đa phương tiện và xem tài liệu (Media Viewer)
   */
  const renderMediaViewer = () => {
    if (!selectedLesson) return null

    const { contentType, resourceUrl } = selectedLesson
    const isVideo = contentType === 'video' || currentFileInfo?.isVideo
    const isPdf = contentType === 'pdf' || currentFileInfo?.isPdf

    // 1. Trường hợp không có tài nguyên đính kèm (hoặc chỉ có nội dung chữ)
    if (!resourceUrl) {
      return (
        <div className="p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-center">
          <Layers className="w-10 h-10 mx-auto text-slate-400 mb-2" />
          <p className="text-sm font-semibold text-slate-700">
            Nội dung bài đọc lý thuyết
          </p>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Bài giảng này không đính kèm tệp đa phương tiện bên ngoài. Hãy đọc kỹ phần mô tả và nội dung bài học bên dưới.
          </p>
        </div>
      )
    }

    // 2. Video Player trực tiếp (HTML5 Video)
    if (isVideo) {
      return (
        <div className="space-y-3">
          <div className="relative rounded-2xl overflow-hidden bg-black shadow-md">
            {videoError ? (
              <div className="py-16 px-6 text-center text-white bg-slate-900">
                <AlertTriangle className="w-12 h-12 mx-auto text-amber-400 mb-3" />
                <h4 className="text-base font-semibold">
                  Không thể phát video trực tiếp trên trình duyệt
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Tệp video có thể có định dạng không được trình duyệt hỗ trợ trực tiếp, hoặc kết nối mạng bị gián đoạn.
                </p>
                <div className="mt-4 flex items-center justify-center space-x-3">
                  <button
                    onClick={() => setVideoError(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-medium inline-flex items-center space-x-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Thử tải lại</span>
                  </button>
                  <a
                    href={resourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-medium inline-flex items-center space-x-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Mở video tab mới</span>
                  </a>
                </div>
              </div>
            ) : (
              <video
                key={resourceUrl}
                controls
                controlsList="nodownload"
                preload="metadata"
                className="w-full max-h-[520px] aspect-video object-contain bg-black"
                onError={() => setVideoError(true)}
              >
                <source src={resourceUrl} type="video/mp4" />
                <source src={resourceUrl} type="video/webm" />
                <source src={resourceUrl} type="video/quicktime" />
                Trình duyệt của bạn không hỗ trợ thẻ phát video HTML5.
              </video>
            )}
          </div>

          {/* Thanh công cụ phụ cho Video */}
          <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="flex items-center space-x-1.5 font-medium">
              <Video className="w-4 h-4 text-rose-600" />
              <span>Đang phát video bài giảng</span>
            </span>
            <div className="flex items-center space-x-2">
              <a
                href={resourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium inline-flex items-center space-x-1"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Mở trong tab mới</span>
              </a>
              <a
                href={resourceUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium inline-flex items-center space-x-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải về</span>
              </a>
            </div>
          </div>
        </div>
      )
    }

    // 3. Trình xem tài liệu PDF (iframe / embed viewer)
    if (isPdf) {
      return (
        <div className="space-y-3">
          {/* Thanh tác vụ PDF */}
          <div className="flex items-center justify-between text-xs text-slate-700 bg-red-50/70 p-3 rounded-xl border border-red-200">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-red-600" />
              <span className="font-semibold text-red-900">
                Tài liệu PDF trực tuyến
              </span>
              <span className="text-red-700 truncate max-w-xs hidden sm:inline">
                ({currentFileInfo?.filename})
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <a
                href={resourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg border border-red-200 bg-white hover:bg-red-50 text-red-700 font-medium inline-flex items-center space-x-1 text-xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Toàn màn hình</span>
              </a>
              <a
                href={resourceUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium inline-flex items-center space-x-1 text-xs shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải về PDF</span>
              </a>
            </div>
          </div>

          {/* Khung nhúng PDF */}
          <div className="w-full rounded-2xl overflow-hidden border border-slate-200 shadow-inner bg-slate-100">
            <iframe
              src={`${resourceUrl}#toolbar=1`}
              title={selectedLesson.title}
              className="w-full h-[650px] border-0"
            />
          </div>
        </div>
      )
    }

    // 4. Slide thuyết trình, Bảng tính, Văn bản Word, File nén hoặc liên kết ngoài
    return (
      <div className="p-6 bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-blue-600 shadow-xs shrink-0">
              {currentFileInfo?.isPresentation ? (
                <Presentation className="w-6 h-6 text-amber-600" />
              ) : currentFileInfo?.isSpreadsheet ? (
                <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
              ) : currentFileInfo?.isArchive ? (
                <Archive className="w-6 h-6 text-purple-600" />
              ) : contentType === 'link' ? (
                <LinkIcon className="w-6 h-6 text-indigo-600" />
              ) : (
                <File className="w-6 h-6 text-blue-600" />
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-700">
                  {currentFileInfo?.extension || 'TÀI LIỆU'}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  Tài nguyên học tập đính kèm
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 mt-1 break-all">
                {currentFileInfo?.filename || selectedLesson.title}
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Nhấp vào nút bên cạnh để tải xuống máy tính hoặc mở xem tài liệu.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <a
              href={resourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs inline-flex items-center space-x-1.5 shadow-xs transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Mở tệp</span>
            </a>
            <a
              href={resourceUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs inline-flex items-center space-x-1.5 shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải xuống</span>
            </a>
          </div>
        </div>
      </div>
    )
  }

  // Nếu đang tải dữ liệu ban đầu
  if (loadingInitial) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-3">
        <LoadingSpinner size="lg" />
        <p className="text-sm font-medium text-slate-600">
          Đang chuẩn bị góc học tập của bạn...
        </p>
      </div>
    )
  }

  // Trường hợp học sinh chưa có phân công môn học nào
  if (assignments.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Nội dung bài học
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Xem bài giảng và tài liệu học tập theo từng môn học của lớp
          </p>
        </div>

        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center max-w-xl mx-auto shadow-xs">
          <div className="w-16 h-16 mx-auto rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
            <BookOpen className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            Chưa có môn học nào được phân công
          </h3>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            Lớp học của bạn ({studentClassInfo?.name || user?.className || 'Chưa xếp lớp'}) hiện chưa có môn học hoặc bài giảng nào được giáo viên kích hoạt. Vui lòng liên hệ ban cán sự lớp hoặc giáo viên phụ trách để biết thêm chi tiết.
          </p>
          <button
            onClick={() => {
              setLoadingInitial(true)
              setReloadKey((k) => k + 1)
            }}
            className="mt-6 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold inline-flex items-center space-x-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Tải lại dữ liệu</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 1. Header Trang & Nút toggle Sidebar trên Mobile */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Bài Học Trực Tuyến
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
              {studentClassInfo?.name ? `Lớp ${studentClassInfo.name}` : user?.className || ''}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Xem nội dung bài giảng, video hướng dẫn và tài liệu học tập chính khóa
          </p>
        </div>

        {/* Nút mở danh sách bài giảng trên thiết bị di động */}
        <div className="flex items-center space-x-2 lg:hidden">
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center justify-between shadow-xs"
          >
            <span className="flex items-center space-x-2">
              <Menu className="w-4 h-4 text-blue-600" />
              <span>
                {selectedAssignment?.subject?.name || 'Chọn môn học'}: #{selectedLesson?.order || '1'}
              </span>
            </span>
            <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-md">
              Đổi bài học
            </span>
          </button>
        </div>
      </div>

      {/* Thông báo lỗi (nếu có) */}
      {lessonError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-xs text-red-700">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{lessonError}</span>
          </div>
          <button
            onClick={() => {
              setLoadingInitial(true)
              setReloadKey((k) => k + 1)
            }}
            className="underline font-semibold hover:text-red-900 ml-3 shrink-0"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* 2. Bố cục 2 cột chính: Sidebar bài giảng (trái) & Nội dung bài học (phải) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ================= CỘT TRÁI: SIDEBAR BÀI GIẢNG (DESKTOP) ================= */}
        <div className="hidden lg:block lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden h-[calc(100vh-170px)] sticky top-20">
          {renderSidebarContent()}
        </div>

        {/* ================= DRAWER SIDEBAR (MOBILE & TABLET) ================= */}
        {isMobileSidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            {/* Lớp nền mờ */}
            <div
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
            {/* Khung nội dung drawer */}
            <div className="relative w-full max-w-xs bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
              {renderSidebarContent()}
            </div>
          </div>
        )}

        {/* ================= CỘT PHẢI: KHU VỰC NỘI DUNG BÀI GIẢNG ================= */}
        <div className="lg:col-span-8 space-y-4">
          {!selectedLesson ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
              <div className="w-14 h-14 mx-auto rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                <BookOpen className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">
                Chưa chọn bài giảng
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Vui lòng chọn một bài học từ danh sách bên trái để bắt đầu theo dõi nội dung.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              {/* Header Bài giảng: Tiêu đề, Breadcrumbs, Nút Bài trước / Bài sau */}
              <div className="p-5 border-b border-slate-200 bg-white">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    {/* Tags / Breadcrumb */}
                    <div className="flex items-center gap-2 flex-wrap text-[11px] mb-1.5">
                      <span className="px-2 py-0.5 rounded-md font-semibold bg-blue-50 text-blue-700">
                        {selectedAssignment?.subject?.name || 'Môn học'}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-500 font-medium">
                        Bài #{selectedLesson.order || currentLessonIndex + 1}
                      </span>
                      {selectedAssignment?.teacher?.fullName && (
                        <>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-600 flex items-center space-x-1">
                            <User className="w-3 h-3 text-slate-400" />
                            <span>GV: {selectedAssignment.teacher.fullName}</span>
                          </span>
                        </>
                      )}
                    </div>

                    {/* Tên bài giảng */}
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                      {selectedLesson.title}
                    </h2>
                  </div>

                  {/* Nút Previous / Next bài giảng */}
                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={handlePrevLesson}
                      disabled={currentLessonIndex <= 0}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center space-x-1 shadow-2xs"
                      title="Bài trước"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span className="hidden sm:inline">Bài trước</span>
                    </button>
                    <button
                      onClick={handleNextLesson}
                      disabled={
                        currentLessonIndex < 0 ||
                        currentLessonIndex >= filteredLessons.length - 1
                      }
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center space-x-1 shadow-2xs"
                      title="Bài tiếp theo"
                    >
                      <span className="hidden sm:inline">Bài sau</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Badge thông tin loại nội dung & Ngày đăng */}
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                  <span
                    className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-md font-medium border ${activeTypeConfig.color}`}
                  >
                    <activeTypeConfig.icon className="w-3 h-3" />
                    <span>{activeTypeConfig.label}</span>
                  </span>

                  {selectedLesson.createdAt && (
                    <span className="flex items-center space-x-1 text-[11px] text-slate-400">
                      <Calendar className="w-3 h-3" />
                      <span>
                        Ngày đăng:{' '}
                        {new Date(selectedLesson.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                    </span>
                  )}
                </div>
              </div>

              {/* Phần thân: Trình phát đa phương tiện và tài liệu */}
              <div className="p-5 space-y-6">
                {renderMediaViewer()}

                {/* Mô tả & Hướng dẫn học tập */}
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center space-x-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                    <span>Nội dung & Hướng dẫn học tập</span>
                  </h3>
                  {selectedLesson.description ? (
                    <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                      {selectedLesson.description}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      Giáo viên chưa để lại hướng dẫn bổ sung cho bài học này.
                    </p>
                  )}
                </div>

                {/* Chi tiết thông tin tệp & Tải về (Metadata Box) */}
                {selectedLesson.resourceUrl && currentFileInfo && (
                  <div className="border border-slate-200 rounded-2xl p-4 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <p className="font-semibold text-slate-800 flex items-center space-x-1.5">
                        <FileText className="w-4 h-4 text-slate-500" />
                        <span>Tệp đính kèm: {currentFileInfo.filename}</span>
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Định dạng: {currentFileInfo.extension || 'Định dạng chung'} • Quyền truy cập: Toàn bộ học sinh lớp
                      </p>
                    </div>

                    <a
                      href={selectedLesson.resourceUrl}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-medium inline-flex items-center justify-center space-x-1.5 shrink-0 transition-colors shadow-2xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Tải về máy tính</span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default StudentLessonViewerPage
