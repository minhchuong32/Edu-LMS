import { useState, useEffect, useMemo, useId } from 'react'
import {
  ClipboardList,
  BookOpen,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Award,
  Send,
  Paperclip,
  ExternalLink,
  FileText,
  Lock,
  Unlock,
  Search,
  Filter,
  RefreshCw,
  MessageSquare,
  Upload,
  Download,
} from 'lucide-react'
import { useAuth } from '@/context/useAuth'
import academicApi from '@/api/academicApi'
import assignmentApi from '@/api/assignmentApi'
import lessonApi from '@/api/lessonApi'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import FileUploadManager from '@/components/teacher/FileUploadManager'

/**
 * Định dạng ngày giờ hiển thị tiếng Việt
 */
const formatDateTime = (dateInput) => {
  if (!dateInput) return 'Chưa thiết lập'
  const d = new Date(dateInput)
  if (Number.isNaN(d.getTime())) return 'Không hợp lệ'
  return d.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * Kiểm tra hạn nộp đã quá hạn hay chưa
 */
const checkIsOverdue = (dueDate) => {
  if (!dueDate) return false
  const d = new Date(dueDate)
  if (Number.isNaN(d.getTime())) return false
  return d < new Date()
}

/**
 * Xác định thông tin trạng thái bài tập của học sinh:
 * - Chưa nộp
 * - Đã nộp
 * - Trễ hạn
 * - Đã chấm
 */
const getStudentAssignmentStatuses = (assignment, submission) => {
  const isOverdue = checkIsOverdue(assignment?.dueDate)
  const hasSubmitted = Boolean(submission && submission.fileUrl)
  const isGraded =
    hasSubmitted &&
    submission.score !== null &&
    submission.score !== undefined &&
    submission.score !== ''
  const isLate = hasSubmitted
    ? Boolean(submission.isLate)
    : isOverdue

  // Trạng thái chính (Primary Status)
  let primaryKey
  if (isGraded) {
    primaryKey = 'graded'
  } else if (hasSubmitted && isLate) {
    primaryKey = 'late'
  } else if (hasSubmitted) {
    primaryKey = 'submitted'
  } else if (isOverdue) {
    primaryKey = 'late'
  } else {
    primaryKey = 'unsubmitted'
  }

  return {
    hasSubmitted,
    isGraded,
    isLate,
    isOverdue,
    primaryKey,
  }
}

/**
 * Trích xuất danh sách tất cả file đề bài mà giáo viên đã đính kèm vào bài tập
 */
const getTeacherAssignmentFiles = (assignment) => {
  if (!assignment) return []
  const files = []

  if (Array.isArray(assignment.attachments) && assignment.attachments.length > 0) {
    assignment.attachments.forEach((att, idx) => {
      if (att && att.url) {
        const fallbackName =
          decodeURIComponent(String(att.url).split('/').pop().split('?')[0]) ||
          `File đề bài ${idx + 1}`
        files.push({
          _id: att._id || att.id || `att-${idx}`,
          name: att.name || att.originalName || fallbackName,
          url: att.url,
          format: att.format || '',
          fileSize: Number(att.fileSize || att.size) || 0,
        })
      }
    })
  }

  if (
    assignment.attachmentUrl &&
    !files.some((f) => f.url === assignment.attachmentUrl)
  ) {
    const fallbackName =
      decodeURIComponent(
        String(assignment.attachmentUrl).split('/').pop().split('?')[0]
      ) || 'Tài liệu đề bài đính kèm'
    files.unshift({
      _id: 'primary-attachment',
      name: fallbackName,
      url: assignment.attachmentUrl,
      format: '',
      fileSize: 0,
    })
  }

  return files
}

export const StudentAssignmentPage = () => {
  const { user } = useAuth()
  const noteInputId = useId()

  // Danh sách môn học (TeachingAssignment) thuộc lớp của học sinh
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [studentClassInfo, setStudentClassInfo] = useState(null)
  const [teachingAssignments, setTeachingAssignments] = useState([])
  const [selectedTeachingAssignmentId, setSelectedTeachingAssignmentId] =
    useState('ALL')

  // Danh sách bài tập & Map bài nộp của học sinh theo assignmentId
  const [assignments, setAssignments] = useState([])
  const [submissionsByAssignment, setSubmissionsByAssignment] = useState({})
  const [loadingAssignments, setLoadingAssignments] = useState(false)
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(null)

  // Tìm kiếm & lọc theo trạng thái
  const [searchKeyword, setSearchKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL') // 'ALL' | 'unsubmitted' | 'submitted' | 'late' | 'graded'

  // Form nộp bài của học sinh
  const [submitFileUrl, setSubmitFileUrl] = useState('')
  const [submitAttachments, setSubmitAttachments] = useState([])
  const [submitNote, setSubmitNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)
  const [pageError, setPageError] = useState(null)

  // Reload key
  const [reloadKey, setReloadKey] = useState(0)

  const showToast = (msg) => {
    setSuccessMsg(msg)
    setTimeout(() => {
      setSuccessMsg((prev) => (prev === msg ? null : prev))
    }, 3500)
  }

  // 1. Tải thông tin Lớp học & Danh sách Môn học (TeachingAssignment) của học sinh
  useEffect(() => {
    let ignore = false

    const loadStudentSubjects = async () => {
      setLoadingInitial(true)
      try {
        let classId =
          user?.classRef ||
          (typeof user?.class === 'object' ? user?.class?._id : user?.class)
        const className = user?.className

        if (!classId && className) {
          try {
            const resClasses = await academicApi.getClasses({ name: className })
            const classList = resClasses?.data || resClasses || []
            const foundClass = Array.isArray(classList)
              ? classList.find(
                (c) => c.name?.toLowerCase() === className.toLowerCase()
              )
              : classList
            if (foundClass && !ignore) {
              classId = foundClass._id
              setStudentClassInfo(foundClass)
            }
          } catch (err) {
            console.warn('Không thể tải chi tiết lớp học theo tên:', err)
          }
        }

        const params = classId ? { class: classId } : {}
        const res = await academicApi.getAssignments(params)
        const rawList = res?.data || res || []
        const list = Array.isArray(rawList) ? rawList : []

        let filtered = list
        if (classId) {
          filtered = list.filter((item) => {
            const itemClassId = item.class?._id || item.class
            return itemClassId?.toString() === classId.toString()
          })
        } else if (className) {
          filtered = list.filter((item) => {
            const itemClassName = item.class?.name || item.className
            return itemClassName?.toLowerCase() === className.toLowerCase()
          })
        }

        if (!ignore) {
          setTeachingAssignments(filtered)
          if (filtered.length > 0 && filtered[0].class) {
            setStudentClassInfo(filtered[0].class)
          } else if (className) {
            setStudentClassInfo((prev) => prev || { name: className })
          }
        }
      } catch (err) {
        if (!ignore) {
          setPageError(
            err?.message || 'Không thể tải danh sách môn học của lớp.'
          )
        }
      } finally {
        if (!ignore) {
          setLoadingInitial(false)
        }
      }
    }

    loadStudentSubjects()
    return () => {
      ignore = true
    }
  }, [user?.classRef, user?.class, user?.className])

  // 2. Tải danh sách bài tập & bài nộp của học sinh
  useEffect(() => {
    let ignore = false

    const loadStudentAssignmentsAndSubmissions = async () => {
      setLoadingAssignments(true)
      setPageError(null)
      try {
        const params =
          selectedTeachingAssignmentId &&
            selectedTeachingAssignmentId !== 'ALL'
            ? { teachingAssignment: selectedTeachingAssignmentId }
            : {}

        const res = await assignmentApi.getAssignments(params)
        const resData = res?.data || res || []
        const assignmentList = Array.isArray(resData)
          ? resData
          : resData?.assignments || []

        if (ignore) return

        setAssignments(assignmentList)

        // Chọn bài tập đầu tiên nếu chưa chọn hoặc bài đang chọn không còn trong danh sách
        if (assignmentList.length > 0) {
          setSelectedAssignmentId((prev) => {
            const exists = assignmentList.some((a) => a._id === prev)
            return exists ? prev : assignmentList[0]._id
          })
        } else {
          setSelectedAssignmentId(null)
        }

        // Dừng loading danh sách bài tập ngay khi đã có dữ liệu bài tập
        setLoadingAssignments(false)

        // Tải thông tin bài nộp của học sinh cho từng bài tập
        const submissionEntries = await Promise.all(
          assignmentList.map(async (item) => {
            if (item.mySubmission !== undefined) {
              return [item._id, item.mySubmission]
            }
            try {
              const subRes = await assignmentApi.getMySubmission(item._id)
              const subData = subRes?.data !== undefined ? subRes.data : subRes
              return [item._id, subData || null]
            } catch {
              return [item._id, null]
            }
          })
        )

        if (!ignore) {
          setSubmissionsByAssignment(Object.fromEntries(submissionEntries))
        }
      } catch (err) {
        if (!ignore) {
          setAssignments([])
          setPageError(
            err?.message || 'Không thể tải danh sách bài tập của lớp.'
          )
        }
      } finally {
        if (!ignore) {
          setLoadingAssignments(false)
        }
      }
    }

    loadStudentAssignmentsAndSubmissions()
    return () => {
      ignore = true
    }
  }, [selectedTeachingAssignmentId, reloadKey])

  // Bài tập đang được chọn để xem chi tiết
  const selectedAssignment = useMemo(() => {
    return assignments.find((a) => a._id === selectedAssignmentId) || null
  }, [assignments, selectedAssignmentId])

  // Bài nộp hiện tại của học sinh ứng với bài tập đang chọn
  const currentSubmission = useMemo(() => {
    if (!selectedAssignment) return null
    return (
      submissionsByAssignment[selectedAssignment._id] ||
      selectedAssignment.mySubmission ||
      null
    )
  }, [selectedAssignment, submissionsByAssignment])

  // Đồng bộ dữ liệu bài nộp vào form khi đổi bài tập đang chọn
  const handleSelectAssignment = (assignmentItem) => {
    setSelectedAssignmentId(assignmentItem._id)
    setSubmitError(null)
    const existingSub =
      submissionsByAssignment[assignmentItem._id] ||
      assignmentItem.mySubmission ||
      null
    setSubmitFileUrl(existingSub?.fileUrl || '')
    setSubmitAttachments(
      Array.isArray(existingSub?.attachments) ? existingSub.attachments : []
    )
    setSubmitNote(existingSub?.note || '')
  }

  // Lọc danh sách bài tập theo từ khóa & trạng thái
  const filteredAssignments = useMemo(() => {
    return assignments.filter((item) => {
      const keyword = searchKeyword.trim().toLowerCase()
      const matchKeyword =
        !keyword ||
        item.title?.toLowerCase().includes(keyword) ||
        item.description?.toLowerCase().includes(keyword)

      if (!matchKeyword) return false
      if (statusFilter === 'ALL') return true

      const sub =
        submissionsByAssignment[item._id] || item.mySubmission || null
      const st = getStudentAssignmentStatuses(item, sub)

      if (statusFilter === 'unsubmitted') return !st.hasSubmitted
      if (statusFilter === 'submitted') return st.hasSubmitted
      if (statusFilter === 'late') return st.isLate
      if (statusFilter === 'graded') return st.isGraded
      return true
    })
  }, [assignments, submissionsByAssignment, searchKeyword, statusFilter])

  // Thống kê số lượng theo 4 trạng thái
  const stats = useMemo(() => {
    let unsubmitted = 0
    let submitted = 0
    let late = 0
    let graded = 0

    assignments.forEach((item) => {
      const sub =
        submissionsByAssignment[item._id] || item.mySubmission || null
      const st = getStudentAssignmentStatuses(item, sub)
      if (!st.hasSubmitted) unsubmitted += 1
      if (st.hasSubmitted) submitted += 1
      if (st.isLate) late += 1
      if (st.isGraded) graded += 1
    })

    return { unsubmitted, submitted, late, graded }
  }, [assignments, submissionsByAssignment])

  // Khi upload file bài làm lên Cloudinary thành công
  const handleUploadSuccess = (urlOrItems, uploadData) => {
    let rawList = []
    if (typeof urlOrItems === 'string' && urlOrItems.trim()) {
      rawList = [
        {
          ...(uploadData || {}),
          url: urlOrItems.trim(),
        },
      ]
    } else if (Array.isArray(urlOrItems)) {
      rawList = urlOrItems
    } else if (urlOrItems && typeof urlOrItems === 'object') {
      rawList = [urlOrItems]
    }

    const normalized = rawList
      .filter((item) => item && item.url)
      .map((item) => {
        const cleanUrlName =
          decodeURIComponent(
            String(item.url).split('/').pop().split('?')[0]
          ) || 'Bai-lam-hoc-sinh'
        return {
          name:
            item.originalName ||
            item.fileName ||
            item.name ||
            cleanUrlName,
          url: item.url,
          publicId: item.publicId || '',
          resourceType: item.resourceType || 'raw',
          fileType: item.category || item.fileType || 'document',
          fileSize: Number(item.size || item.fileSize) || 0,
          format: item.format || '',
        }
      })

    if (normalized.length === 0) return

    setSubmitAttachments((prev) => [...prev, ...normalized])
    setSubmitFileUrl((prev) => prev || normalized[0].url)
    setSubmitError(null)
    showToast('Đã tải lên file bài làm! Bấm "Nộp bài tập" để hoàn tất.')
  }

  // Xóa file đính kèm trong khu vực chuẩn bị nộp
  const handleDeleteAttachment = async (fileItem) => {
    if (!fileItem) return
    if (fileItem.publicId || fileItem.url?.includes('res.cloudinary.com')) {
      try {
        await lessonApi.deleteUploadedMedia({
          publicId: fileItem.publicId,
          url: fileItem.url,
          resourceType: fileItem.resourceType,
        })
      } catch (err) {
        console.warn('Lỗi xóa tệp trên Cloudinary:', err)
      }
    }

    setSubmitAttachments((prev) => {
      const remaining = prev.filter(
        (att) =>
          (att._id || att.id || att.url) !==
          (fileItem._id || fileItem.id || fileItem.url)
      )
      setSubmitFileUrl((currUrl) =>
        currUrl === fileItem.url ? remaining[0]?.url || '' : currUrl
      )
      return remaining
    })
  }

  // Xử lý Nộp bài tập
  const handleSubmitHomework = async (e) => {
    e.preventDefault()
    if (!selectedAssignment) return

    if (selectedAssignment.status === 'locked') {
      setSubmitError('Bài tập này đã bị khóa nhận bài, bạn không thể nộp bài.')
      return
    }

    const finalFileUrl =
      submitFileUrl.trim() || submitAttachments[0]?.url || ''
    if (!finalFileUrl) {
      setSubmitError('Vui lòng tải lên file bài làm hoặc nhập đường dẫn file bài nộp.')
      return
    }

    setSubmitting(true)
    setSubmitError(null)

    try {
      const res = await assignmentApi.submitAssignment({
        assignment: selectedAssignment._id,
        fileUrl: finalFileUrl,
        attachments: submitAttachments,
        note: submitNote.trim(),
      })

      const savedSub = res?.data || res
      setSubmissionsByAssignment((prev) => ({
        ...prev,
        [selectedAssignment._id]: savedSub,
      }))
      setSubmitFileUrl(savedSub?.fileUrl || finalFileUrl)
      showToast(
        savedSub?.isLate
          ? 'Đã nộp bài tập thành công (Ghi nhận nộp trễ hạn)!'
          : 'Đã nộp bài tập thành công (Đúng hạn)!'
      )
    } catch (err) {
      setSubmitError(
        err?.message || 'Không thể nộp bài tập. Vui lòng kiểm tra lại.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  /**
   * Render các Badge trạng thái cho 1 bài tập:
   * - Chưa nộp
   * - Đã nộp
   * - Trễ hạn
   * - Đã chấm
   */
  const renderStatusBadges = (assignment, submission, testIdPrefix = 'badge') => {
    const { hasSubmitted, isGraded, isLate } = getStudentAssignmentStatuses(
      assignment,
      submission
    )

    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {!hasSubmitted ? (
          <span
            data-testid={`${testIdPrefix}-unsubmitted-${assignment._id}`}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200"
          >
            <Clock className="w-3 h-3" />
            <span>Chưa nộp</span>
          </span>
        ) : (
          <span
            data-testid={`${testIdPrefix}-submitted-${assignment._id}`}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>Đã nộp</span>
          </span>
        )}

        {isLate && (
          <span
            data-testid={`${testIdPrefix}-late-${assignment._id}`}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200"
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Trễ hạn</span>
          </span>
        )}

        {isGraded && (
          <span
            data-testid={`${testIdPrefix}-graded-${assignment._id}`}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-violet-50 text-violet-700 border border-violet-200"
          >
            <Award className="w-3 h-3" />
            <span>Đã chấm ({submission.score}/10)</span>
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                Bài tập & Nộp bài của Học sinh
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {studentClassInfo?.name
                  ? `Lớp ${studentClassInfo.name} • `
                  : ''}
                Xem đề bài, tải lên bài làm và theo dõi kết quả chấm điểm từ giáo viên
              </p>
            </div>
          </div>
        </div>

        {/* Thống kê 4 trạng thái */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl">
            <p className="text-sm font-bold text-slate-700">
              {stats.unsubmitted}
            </p>
            <p className="text-[10px] font-medium text-slate-500">Chưa nộp</p>
          </div>
          <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl">
            <p className="text-sm font-bold text-emerald-700">
              {stats.submitted}
            </p>
            <p className="text-[10px] font-medium text-emerald-600">Đã nộp</p>
          </div>
          <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-sm font-bold text-amber-700">{stats.late}</p>
            <p className="text-[10px] font-medium text-amber-600">Trễ hạn</p>
          </div>
          <div className="px-3 py-1.5 bg-violet-50 border border-violet-200 rounded-xl">
            <p className="text-sm font-bold text-violet-700">{stats.graded}</p>
            <p className="text-[10px] font-medium text-violet-600">Đã chấm</p>
          </div>
        </div>
      </div>

      {/* Thông báo */}
      {successMsg && (
        <div
          role="status"
          className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-medium text-emerald-800 flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        </div>
      )}

      {pageError && (
        <div
          role="alert"
          className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs font-medium text-red-700 flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{pageError}</span>
        </div>
      )}

      {/* Thanh chọn Môn học (TeachingAssignment) & Bộ lọc */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSelectedTeachingAssignmentId('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${selectedTeachingAssignmentId === 'ALL'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
          >
            Tất cả môn học
          </button>

          {!loadingInitial &&
            teachingAssignments.map((ta) => {
              const isSelected = ta._id === selectedTeachingAssignmentId
              const subjectName =
                ta.subject?.name || ta.subjectName || 'Môn học'
              return (
                <button
                  key={ta._id}
                  type="button"
                  onClick={() => setSelectedTeachingAssignmentId(ta._id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{subjectName}</span>
                </button>
              )
            })}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Tìm kiếm bài tập theo tiêu đề hoặc yêu cầu..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              aria-label="Lọc theo trạng thái nộp bài"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="unsubmitted">Chưa nộp</option>
              <option value="submitted">Đã nộp</option>
              <option value="late">Trễ hạn</option>
              <option value="graded">Đã chấm</option>
            </select>

            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              disabled={loadingAssignments}
              title="Làm mới danh sách bài tập"
              className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
            >
              <RefreshCw
                className={`w-4 h-4 ${loadingAssignments ? 'animate-spin' : ''
                  }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Bố cục chính: Cột trái Danh sách bài tập, Cột phải Chi tiết & Nộp bài / Xem điểm */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cột trái: Danh sách bài tập */}
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800">
                Danh sách bài tập ({filteredAssignments.length})
              </h2>
            </div>

            {loadingAssignments ? (
              <div className="py-10 flex justify-center">
                <LoadingSpinner />
              </div>
            ) : filteredAssignments.length === 0 ? (
              <div className="py-10 px-4 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p className="text-xs font-medium text-slate-600">
                  Không có bài tập nào trong mục này.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredAssignments.map((item) => {
                  const isSelected = item._id === selectedAssignment?._id
                  const sub =
                    submissionsByAssignment[item._id] ||
                    item.mySubmission ||
                    null
                  const subjectName =
                    item.teachingAssignment?.subject?.name || 'Môn học'
                  const isLocked = item.status === 'locked'
                  const teacherFiles = getTeacherAssignmentFiles(item)

                  return (
                    <div
                      key={item._id}
                      data-testid={`student-assignment-item-${item._id}`}
                      onClick={() => handleSelectAssignment(item)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2 ${isSelected
                          ? 'bg-blue-50/70 border-blue-500 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                        }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md">
                            {subjectName}
                          </span>
                          {teacherFiles.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                              <Paperclip className="w-3 h-3" />
                              <span>Có file đề bài ({teacherFiles.length})</span>
                            </span>
                          )}
                        </div>
                        {renderStatusBadges(item, sub, 'list-badge')}
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 line-clamp-2">
                        {item.title}
                      </h3>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-blue-600" />
                          <span>Hạn nộp: {formatDateTime(item.dueDate)}</span>
                        </span>

                        {isLocked && (
                          <span className="inline-flex items-center gap-1 text-rose-600 font-semibold">
                            <Lock className="w-3 h-3" />
                            <span>Đã khóa</span>
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Cột phải: Chi tiết bài tập, Khu vực Nộp bài & Kết quả chấm điểm */}
        <div className="lg:col-span-7">
          {!selectedAssignment ? (
            <div className="bg-white p-10 rounded-2xl border border-slate-200 shadow-xs text-center space-y-2">
              <ClipboardList className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-600">
                Chọn một bài tập ở danh sách bên trái để xem chi tiết và nộp bài
              </p>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
              {/* 1. Thông tin chi tiết bài tập */}
              <div className="space-y-3 pb-4 border-b border-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-blue-600 text-white">
                      {selectedAssignment.teachingAssignment?.subject?.name ||
                        'Môn học'}
                    </span>
                    {selectedAssignment.status === 'locked' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Đã khóa nhận bài</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Đang mở nhận bài</span>
                      </span>
                    )}
                  </div>

                  {/* Badge trạng thái nộp bài của học sinh */}
                  {renderStatusBadges(
                    selectedAssignment,
                    currentSubmission,
                    'detail-badge'
                  )}
                </div>

                <h2 className="text-lg font-bold text-slate-900">
                  {selectedAssignment.title}
                </h2>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span>
                      Hạn nộp:{' '}
                      <strong className="text-slate-900">
                        {formatDateTime(selectedAssignment.dueDate)}
                      </strong>
                    </span>
                  </div>

                  {selectedAssignment.teachingAssignment?.teacher?.fullName && (
                    <div>
                      Giáo viên:{' '}
                      <strong className="text-slate-800">
                        {selectedAssignment.teachingAssignment.teacher.fullName}
                      </strong>
                    </div>
                  )}
                </div>

                {selectedAssignment.description && (
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Nội dung / Yêu cầu bài tập
                    </h4>
                    <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed bg-slate-50/60 p-3.5 rounded-xl border border-slate-100">
                      {selectedAssignment.description}
                    </p>
                  </div>
                )}

                {/* File đề bài đính kèm của giáo viên để học sinh tải về làm */}
                {getTeacherAssignmentFiles(selectedAssignment).length > 0 && (
                  <div
                    data-testid="teacher-assignment-files-section"
                    className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-2.5"
                  >
                    <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                      <Paperclip className="w-4 h-4 text-blue-600" />
                      <span>
                        Tài liệu / File đề bài từ Giáo viên (
                        {getTeacherAssignmentFiles(selectedAssignment).length}{' '}
                        tệp)
                      </span>
                    </div>

                    <div className="space-y-2">
                      {getTeacherAssignmentFiles(selectedAssignment).map(
                        (fileItem) => (
                          <div
                            key={fileItem._id || fileItem.url}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white p-3 rounded-xl border border-blue-100 shadow-2xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="p-2 rounded-lg bg-blue-100 text-blue-700 shrink-0">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <p
                                  className="text-xs font-bold text-slate-800 truncate"
                                  title={fileItem.name}
                                >
                                  {fileItem.name}
                                </p>
                                <p className="text-[11px] text-slate-500">
                                  Đề bài đính kèm • Bấm để xem hoặc tải về máy làm bài
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <a
                                href={fileItem.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Xem đề bài</span>
                              </a>

                              <a
                                href={fileItem.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={fileItem.name || true}
                                data-testid="download-teacher-assignment-file"
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition-colors"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Tải đề bài về làm</span>
                              </a>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Kết quả chấm điểm & Nhận xét của giáo viên (Hiển thị sau khi được chấm) */}
              {currentSubmission &&
                currentSubmission.score !== null &&
                currentSubmission.score !== undefined && (
                  <div
                    data-testid="graded-result-panel"
                    className="p-4 rounded-2xl bg-gradient-to-r from-violet-50 via-indigo-50 to-blue-50 border border-violet-200 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-violet-800 font-bold text-sm">
                        <Award className="w-5 h-5 text-violet-600" />
                        <span>Kết quả chấm bài của Giáo viên</span>
                      </div>
                      <div
                        data-testid="submission-score"
                        className="px-3.5 py-1 rounded-xl bg-violet-600 text-white font-extrabold text-sm shadow-xs"
                      >
                        Điểm: {currentSubmission.score} / 10
                      </div>
                    </div>

                    <div className="bg-white/90 p-3.5 rounded-xl border border-violet-100 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                        <MessageSquare className="w-3.5 h-3.5 text-violet-600" />
                        <span>Nhận xét của giáo viên:</span>
                      </div>
                      <p
                        data-testid="submission-feedback"
                        className="text-xs text-slate-700 whitespace-pre-line leading-relaxed"
                      >
                        {currentSubmission.feedback ||
                          'Giáo viên đã chấm điểm (không có nhận xét thêm).'}
                      </p>
                    </div>
                  </div>
                )}

              {/* 3. Thông tin bài đã nộp của học sinh (nếu có) */}
              {currentSubmission && (
                <div
                  data-testid="submitted-info-panel"
                  className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Bài nộp của bạn</span>
                    </div>
                    <span className="text-[11px] font-medium text-slate-600">
                      Nộp lúc: {formatDateTime(currentSubmission.submittedAt)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <a
                      href={currentSubmission.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Xem tệp bài làm đã nộp</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>

                    {currentSubmission.isLate ? (
                      <span className="text-[11px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                        Nộp trễ hạn
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                        Nộp đúng hạn
                      </span>
                    )}
                  </div>

                  {currentSubmission.note && (
                    <p className="text-xs text-slate-600 italic pt-1">
                      Ghi chú: &ldquo;{currentSubmission.note}&rdquo;
                    </p>
                  )}
                </div>
              )}

              {/* 4. Khu vực Upload & Nộp bài tập (Ẩn hoàn toàn khi bài tập đã bị khóa status === 'locked') */}
              {selectedAssignment.status === 'locked' ? (
                <div
                  data-testid="locked-assignment-notice"
                  className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-3 text-rose-800"
                >
                  <Lock className="w-5 h-5 text-rose-600 shrink-0" />
                  <div className="text-xs">
                    <p className="font-bold">Bài tập đã bị khóa nhận bài</p>
                    <p className="text-rose-600 mt-0.5">
                      Giáo viên đã khóa chức năng nhận bài cho bài tập này. Bạn không thể tải lên hoặc nộp bài làm.
                    </p>
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmitHomework}
                  data-testid="student-submit-form"
                  className="space-y-4 pt-2 border-t border-slate-100"
                >
                  <div className="flex items-center gap-2">
                    <Upload className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-800">
                      {currentSubmission
                        ? 'Cập nhật / Nộp lại bài làm'
                        : 'Khu vực tải lên & Nộp bài làm'}
                    </h3>
                  </div>

                  {submitError && (
                    <div
                      role="alert"
                      className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-medium text-red-700 flex items-center gap-2"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  <FileUploadManager
                    title="Tải lên file bài làm của bạn"
                    helperText="Hỗ trợ PDF, Word, Excel, PowerPoint, ZIP, Hình ảnh"
                    currentResourceUrl={submitFileUrl}
                    attachments={submitAttachments}
                    onUploadSuccess={handleUploadSuccess}
                    onDeleteAttachment={handleDeleteAttachment}
                    autoUpload={true}
                  />


                  <div>
                    <label
                      htmlFor={noteInputId}
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Ghi chú gửi giáo viên (tùy chọn)
                    </label>
                    <textarea
                      id={noteInputId}
                      rows={2}
                      value={submitNote}
                      onChange={(e) => setSubmitNote(e.target.value)}
                      placeholder="Nhập lời nhắn hoặc ghi chú về bài nộp của bạn..."
                      disabled={submitting}
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-blue-600"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>
                        {submitting
                          ? 'Đang nộp bài...'
                          : currentSubmission
                            ? 'Cập nhật bài nộp'
                            : 'Nộp bài tập'}
                      </span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default StudentAssignmentPage
