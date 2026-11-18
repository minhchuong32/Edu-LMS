import { useState, useEffect, useMemo, useId } from 'react'
import {
  ClipboardList,
  Plus,
  Search,
  Edit2,
  Trash2,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  X,
  ExternalLink,
  RefreshCw,
  Paperclip,
  Lock,
  Unlock,
  BookOpen,
  Filter,
  Users,
} from 'lucide-react'
import { useAuth } from '@/context/useAuth'
import assignmentApi from '@/api/assignmentApi'
import academicApi from '@/api/academicApi'
import lessonApi from '@/api/lessonApi'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import FileUploadManager from '@/components/teacher/FileUploadManager'
import TeacherSubmissionGradingPanel from '@/components/teacher/TeacherSubmissionGradingPanel'

/**
 * Chuyển đổi đối tượng Date hoặc chuỗi ISO sang định dạng YYYY-MM-DDTHH:mm cho input datetime-local
 */
const toDateTimeLocalValue = (dateInput) => {
  if (!dateInput) return ''
  const d = new Date(dateInput)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  const year = d.getFullYear()
  const month = pad(d.getMonth() + 1)
  const day = pad(d.getDate())
  const hours = pad(d.getHours())
  const minutes = pad(d.getMinutes())
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

/**
 * Tạo hạn nộp mặc định (+3 ngày lúc 23:59) cho form tạo bài tập mới
 */
const getDefaultDueDateValue = (daysToAdd = 3) => {
  const d = new Date()
  d.setDate(d.getDate() + daysToAdd)
  d.setHours(23, 59, 0, 0)
  return toDateTimeLocalValue(d)
}

/**
 * Định dạng ngày giờ hiển thị tiếng Việt rõ ràng
 */
const formatDueDate = (dateInput) => {
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

export const TeacherAssignmentPage = () => {
  const { user } = useAuth()

  const titleInputId = useId()
  const assignmentSelectId = useId()
  const descriptionInputId = useId()
  const dueDateInputId = useId()

  // Danh sách phân công giảng dạy (Lớp - Môn) của giáo viên
  const [teachingAssignments, setTeachingAssignments] = useState([])
  const [selectedTeachingAssignmentId, setSelectedTeachingAssignmentId] =
    useState('')
  const [loadingTeachingAssignments, setLoadingTeachingAssignments] =
    useState(true)

  // Danh sách bài tập đã giao
  const [assignments, setAssignments] = useState([])
  const [loadingAssignments, setLoadingAssignments] = useState(false)
  const [togglingStatusId, setTogglingStatusId] = useState(null)
  const [gradingAssignmentId, setGradingAssignmentId] = useState(null)

  // Tìm kiếm & Bộ lọc
  const [searchKeyword, setSearchKeyword] = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL') // 'ALL' | 'open' | 'locked'

  // Thông báo chung
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  // Modal Tạo / Chỉnh sửa / Xóa bài tập
  const [modalType, setModalType] = useState(null) // 'create' | 'edit' | 'delete'
  const [activeAssignment, setActiveAssignment] = useState(null)
  const [formData, setFormData] = useState({
    teachingAssignment: '',
    title: '',
    description: '',
    dueDate: getDefaultDueDateValue(3),
    attachmentUrl: '',
    attachments: [],
    status: 'open',
  })
  const [formError, setFormError] = useState(null)
  const [formSubmitting, setFormSubmitting] = useState(false)

  // Reload triggers
  const [taReloadKey, setTaReloadKey] = useState(0)
  const [assignmentsReloadKey, setAssignmentsReloadKey] = useState(0)

  const showToast = (msg) => {
    setSuccessMsg(msg)
    setTimeout(() => {
      setSuccessMsg((prev) => (prev === msg ? null : prev))
    }, 3500)
  }

  // 1. Tải danh sách Lớp - Môn (TeachingAssignment) được phân công cho giáo viên
  useEffect(() => {
    let ignore = false
    const teacherId =
      user?._id || user?.id || user?.userId || user?.userCode || 'me'

    const loadTeachingAssignments = async () => {
      setLoadingTeachingAssignments(true)
      setError(null)
      try {
        let scheduleData = []
        let loadErr = null
        try {
          const res = await academicApi.getTeacherSchedule(teacherId)
          const data = res?.data || res || []
          scheduleData = Array.isArray(data) ? data : data?.assignments || []
        } catch (scheduleErr) {
          loadErr = scheduleErr
          console.warn(
            'Lỗi getTeacherSchedule, thử gọi getAssignments fallback:',
            scheduleErr
          )
          if (teacherId && teacherId !== 'me') {
            try {
              const fallbackRes = await academicApi.getAssignments({
                teacher: teacherId,
              })
              const fbData = fallbackRes?.data || fallbackRes || []
              scheduleData = Array.isArray(fbData)
                ? fbData
                : fbData?.assignments || []
              loadErr = null
            } catch (fbErr) {
              loadErr = fbErr
              console.warn('Fallback getAssignments thất bại:', fbErr)
            }
          }
        }

        if (!ignore) {
          setTeachingAssignments(scheduleData)
          if (loadErr && scheduleData.length === 0) {
            setError(
              loadErr?.message ||
                'Không thể tải danh sách lớp và môn học được phân công.'
            )
          }
          if (scheduleData.length > 0) {
            setSelectedTeachingAssignmentId((prev) => {
              const stillExists = scheduleData.some((a) => a._id === prev)
              return stillExists ? prev : scheduleData[0]._id
            })
          } else {
            setSelectedTeachingAssignmentId('')
            setAssignments([])
            setLoadingAssignments(false)
          }
        }
      } catch (err) {
        if (!ignore) {
          setError(
            err?.message || 'Không thể tải danh sách lớp và môn học được phân công.'
          )
        }
      } finally {
        if (!ignore) {
          setLoadingTeachingAssignments(false)
        }
      }
    }

    loadTeachingAssignments()
    return () => {
      ignore = true
    }
  }, [user?._id, user?.id, user?.userId, user?.userCode, taReloadKey])

  // 2. Tải danh sách bài tập đã giao theo TeachingAssignment đang chọn
  useEffect(() => {
    let ignore = false

    const loadAssignments = async () => {
      if (!selectedTeachingAssignmentId) {
        await Promise.resolve()
        if (!ignore) {
          setAssignments([])
          setLoadingAssignments(false)
        }
        return
      }

      setLoadingAssignments(true)
      setError(null)
      try {
        const res = await assignmentApi.getAssignments({
          teachingAssignment: selectedTeachingAssignmentId,
        })
        if (!ignore) {
          const resData = res?.data || res || []
          const list = Array.isArray(resData)
            ? resData
            : resData?.assignments || []
          setAssignments(list)
        }
      } catch (err) {
        if (!ignore) {
          setAssignments([])
          setError(err?.message || 'Không thể tải danh sách bài tập.')
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
  }, [selectedTeachingAssignmentId, assignmentsReloadKey])

  const reloadAssignments = () => {
    setAssignmentsReloadKey((k) => k + 1)
  }

  // Phân công đang chọn hiện tại
  const currentTeachingAssignment = useMemo(() => {
    return (
      teachingAssignments.find((a) => a._id === selectedTeachingAssignmentId) ||
      null
    )
  }, [teachingAssignments, selectedTeachingAssignmentId])

  // Lọc danh sách bài tập theo từ khóa & trạng thái (Đang mở / Đã khóa)
  const filteredAssignments = useMemo(() => {
    return assignments.filter((item) => {
      const keyword = searchKeyword.trim().toLowerCase()
      const matchKeyword =
        !keyword ||
        item.title?.toLowerCase().includes(keyword) ||
        item.description?.toLowerCase().includes(keyword)

      const matchStatus =
        filterStatus === 'ALL' || item.status === filterStatus

      return matchKeyword && matchStatus
    })
  }, [assignments, searchKeyword, filterStatus])

  // Thống kê nhanh
  const stats = useMemo(() => {
    const total = assignments.length
    const openCount = assignments.filter((a) => a.status === 'open').length
    const lockedCount = assignments.filter((a) => a.status === 'locked').length
    return { total, openCount, lockedCount }
  }, [assignments])

  // Mở modal Tạo bài tập mới
  const handleOpenCreateModal = () => {
    setActiveAssignment(null)
    setFormError(null)
    setFormData({
      teachingAssignment:
        selectedTeachingAssignmentId || teachingAssignments[0]?._id || '',
      title: '',
      description: '',
      dueDate: getDefaultDueDateValue(3),
      attachmentUrl: '',
      attachments: [],
      status: 'open',
    })
    setModalType('create')
  }

  // Mở modal Chỉnh sửa bài tập
  const handleOpenEditModal = (assignmentItem) => {
    setActiveAssignment(assignmentItem)
    setFormError(null)
    const taId =
      assignmentItem.teachingAssignment?._id ||
      assignmentItem.teachingAssignment ||
      selectedTeachingAssignmentId
    setFormData({
      teachingAssignment: taId,
      title: assignmentItem.title || '',
      description: assignmentItem.description || '',
      dueDate: toDateTimeLocalValue(assignmentItem.dueDate),
      attachmentUrl: assignmentItem.attachmentUrl || '',
      attachments: Array.isArray(assignmentItem.attachments)
        ? assignmentItem.attachments
        : [],
      status: assignmentItem.status || 'open',
    })
    setModalType('edit')
  }

  // Mở modal Xác nhận xóa
  const handleOpenDeleteModal = (assignmentItem) => {
    setActiveAssignment(assignmentItem)
    setFormError(null)
    setModalType('delete')
  }

  const handleCloseModal = () => {
    if (formSubmitting) return
    setModalType(null)
    setActiveAssignment(null)
    setFormError(null)
  }

  // Chọn nhanh hạn nộp trên Date Picker (+1 ngày, +3 ngày, +7 ngày)
  const handleQuickDueDate = (days) => {
    setFormData((prev) => ({
      ...prev,
      dueDate: getDefaultDueDateValue(days),
    }))
  }

  // Callback khi upload file đề bài lên Cloudinary thành công qua FileUploadManager
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
          ) || 'De-bai-tap'
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

    setFormData((prev) => {
      const nextAttachments = [...(prev.attachments || []), ...normalized]
      return {
        ...prev,
        attachments: nextAttachments,
        attachmentUrl: prev.attachmentUrl || normalized[0].url,
      }
    })
    showToast('Đã tải lên file đề bài và đính kèm vào bài tập!')
  }

  // Xóa một file đính kèm trong form
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
        console.warn('Không thể xóa tệp trên Cloudinary:', err)
      }
    }

    setFormData((prev) => {
      const remaining = (prev.attachments || []).filter(
        (att) =>
          (att._id || att.id || att.url) !==
          (fileItem._id || fileItem.id || fileItem.url)
      )
      const nextUrl =
        prev.attachmentUrl === fileItem.url
          ? remaining[0]?.url || ''
          : prev.attachmentUrl
      return {
        ...prev,
        attachments: remaining,
        attachmentUrl: nextUrl,
      }
    })
  }

  // Submit Tạo mới hoặc Cập nhật bài tập
  const handleSubmitForm = async (e) => {
    e.preventDefault()
    setFormError(null)

    const trimmedTitle = formData.title.trim()
    if (!trimmedTitle) {
      setFormError('Vui lòng nhập tiêu đề bài tập.')
      return
    }
    if (trimmedTitle.length < 2) {
      setFormError('Tiêu đề bài tập phải có ít nhất 2 ký tự.')
      return
    }
    if (!formData.teachingAssignment) {
      setFormError('Vui lòng chọn Lớp – Môn học được phân công.')
      return
    }
    if (!formData.dueDate) {
      setFormError('Vui lòng chọn hạn nộp bài tập.')
      return
    }

    const parsedDueDate = new Date(formData.dueDate)
    if (Number.isNaN(parsedDueDate.getTime())) {
      setFormError('Hạn nộp bài tập không hợp lệ.')
      return
    }

    setFormSubmitting(true)
    try {
      const payload = {
        teachingAssignment: formData.teachingAssignment,
        title: trimmedTitle,
        description: formData.description.trim(),
        dueDate: parsedDueDate.toISOString(),
        attachmentUrl:
          formData.attachmentUrl.trim() ||
          formData.attachments?.[0]?.url ||
          '',
        attachments: formData.attachments || [],
        status: formData.status || 'open',
      }

      if (modalType === 'create') {
        await assignmentApi.createAssignment(payload)
        showToast('Tạo bài tập mới thành công!')
        if (formData.teachingAssignment !== selectedTeachingAssignmentId) {
          setSelectedTeachingAssignmentId(formData.teachingAssignment)
        } else {
          reloadAssignments()
        }
      } else if (modalType === 'edit' && activeAssignment) {
        await assignmentApi.updateAssignment(activeAssignment._id, payload)
        showToast('Cập nhật bài tập thành công!')
        reloadAssignments()
      }

      setModalType(null)
      setActiveAssignment(null)
    } catch (err) {
      setFormError(
        err?.message || 'Có lỗi xảy ra khi lưu bài tập. Vui lòng thử lại.'
      )
    } finally {
      setFormSubmitting(false)
    }
  }

  // Xác nhận xóa bài tập
  const handleConfirmDelete = async () => {
    if (!activeAssignment) return
    setFormSubmitting(true)
    setFormError(null)
    try {
      await assignmentApi.deleteAssignment(activeAssignment._id)
      showToast('Đã xóa bài tập thành công!')
      setModalType(null)
      setActiveAssignment(null)
      reloadAssignments()
    } catch (err) {
      setFormError(err?.message || 'Không thể xóa bài tập này.')
    } finally {
      setFormSubmitting(false)
    }
  }

  // Mở / Khóa nhận bài tập trực tiếp trên danh sách
  const handleToggleStatus = async (assignmentItem) => {
    if (!assignmentItem || togglingStatusId === assignmentItem._id) return
    const nextStatus = assignmentItem.status === 'open' ? 'locked' : 'open'
    setTogglingStatusId(assignmentItem._id)
    setError(null)

    try {
      const res = await assignmentApi.updateAssignmentStatus(
        assignmentItem._id,
        nextStatus
      )
      const updated = res?.data || res
      setAssignments((prev) =>
        prev.map((item) =>
          item._id === assignmentItem._id
            ? { ...item, status: updated?.status || nextStatus }
            : item
        )
      )
      showToast(
        nextStatus === 'locked'
          ? `Đã khóa nhận bài cho "${assignmentItem.title}"`
          : `Đã mở nhận bài cho "${assignmentItem.title}"`
      )
    } catch (err) {
      setError(
        err?.message || 'Không thể thay đổi trạng thái đóng/mở nhận bài.'
      )
    } finally {
      setTogglingStatusId(null)
    }
  }

  // Nhãn hiển thị Lớp - Môn của một TeachingAssignment
  const getTeachingAssignmentLabel = (ta) => {
    if (!ta) return 'Chưa rõ Lớp - Môn'
    const className = ta.class?.name || ta.className || 'Lớp'
    const subjectName = ta.subject?.name || ta.subjectName || 'Môn học'
    const semesterLabel = ta.semester ? ` (${ta.semester})` : ''
    return `${className} — ${subjectName}${semesterLabel}`
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
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              Quản lý Bài tập theo Lớp – Môn
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Giao bài tập, đính kèm đề bài, thiết lập hạn nộp và đóng/mở nhận bài cho các lớp phụ trách
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          disabled={teachingAssignments.length === 0}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-sm font-semibold rounded-xl shadow-xs transition-all cursor-pointer disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo bài tập mới</span>
        </button>
      </div>

      {/* Thông báo Thành công / Lỗi */}
      {successMsg && (
        <div
          role="status"
          className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-medium text-emerald-800 flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-600 hover:text-emerald-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs font-medium text-red-700 flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Bố cục chính: Cột trái chọn Lớp - Môn, Cột phải hiển thị danh sách bài tập */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cột trái: Danh sách Lớp - Môn được phân công */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-800">
                  Lớp – Môn được phân công
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setTaReloadKey((k) => k + 1)}
                disabled={loadingTeachingAssignments}
                title="Làm mới danh sách lớp phân công"
                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${loadingTeachingAssignments ? 'animate-spin' : ''
                    }`}
                />
              </button>
            </div>

            {loadingTeachingAssignments ? (
              <div className="py-8 flex justify-center">
                <LoadingSpinner />
              </div>
            ) : teachingAssignments.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p className="text-xs font-medium text-slate-600">
                  Bạn chưa được phân công giảng dạy lớp học nào.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {teachingAssignments.map((ta) => {
                  const isSelected = ta._id === selectedTeachingAssignmentId
                  const className = ta.class?.name || ta.className || 'Lớp'
                  const subjectName =
                    ta.subject?.name || ta.subjectName || 'Môn học'
                  const subjectCode = ta.subject?.code || ''

                  return (
                    <button
                      key={ta._id}
                      type="button"
                      onClick={() => setSelectedTeachingAssignmentId(ta._id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${isSelected
                          ? 'bg-blue-50/90 border-blue-500 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                        }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-600 text-white">
                          Lớp {className}
                        </span>
                        <span className="text-[11px] font-medium text-slate-500">
                          {ta.academicYear || ''} • {ta.semester || 'Cả năm'}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-800 mt-1.5 truncate">
                        {subjectName}{' '}
                        {subjectCode ? (
                          <span className="text-xs font-normal text-slate-400">
                            ({subjectCode})
                          </span>
                        ) : null}
                      </p>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Thống kê trạng thái bài tập của Lớp - Môn đang chọn */}
          {currentTeachingAssignment && (
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 bg-slate-50 rounded-xl">
                <p className="text-lg font-bold text-slate-800">{stats.total}</p>
                <p className="text-[11px] text-slate-500 font-medium">
                  Tổng bài tập
                </p>
              </div>
              <div className="p-2.5 bg-emerald-50 rounded-xl">
                <p className="text-lg font-bold text-emerald-700">
                  {stats.openCount}
                </p>
                <p className="text-[11px] text-emerald-600 font-medium">
                  Đang mở
                </p>
              </div>
              <div className="p-2.5 bg-rose-50 rounded-xl">
                <p className="text-lg font-bold text-rose-700">
                  {stats.lockedCount}
                </p>
                <p className="text-[11px] text-rose-600 font-medium">Đã khóa</p>
              </div>
            </div>
          )}
        </div>

        {/* Cột phải: Bộ lọc & Danh sách bài tập đã giao */}
        <div className="lg:col-span-8 space-y-4">
          {/* Thanh tìm kiếm & lọc trạng thái */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Tìm kiếm bài tập theo tiêu đề hoặc nội dung..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                aria-label="Lọc theo trạng thái bài tập"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="open">Đang mở nhận bài</option>
                <option value="locked">Đã khóa nhận bài</option>
              </select>

              <button
                type="button"
                onClick={reloadAssignments}
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

          {/* Danh sách bài tập đã giao */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Danh sách bài tập đã giao
                </h3>
                {currentTeachingAssignment && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    {getTeachingAssignmentLabel(currentTeachingAssignment)}
                  </p>
                )}
              </div>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                {filteredAssignments.length} bài tập
              </span>
            </div>

            {loadingAssignments ? (
              <div className="py-12 flex justify-center">
                <LoadingSpinner />
              </div>
            ) : filteredAssignments.length === 0 ? (
              <div className="py-12 px-4 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                  <ClipboardList className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    Chưa có bài tập nào được giao
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Bấm nút &ldquo;Tạo bài tập mới&rdquo; để giao bài tập kèm đề bài và hạn nộp cho lớp học này.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5">
                {filteredAssignments.map((item) => {
                  const isOpen = item.status === 'open'
                  const isOverdue = checkIsOverdue(item.dueDate)
                  const primaryAttachmentUrl =
                    item.attachmentUrl || item.attachments?.[0]?.url || ''
                  const attachmentName =
                    item.attachments?.[0]?.name || 'Tài liệu đề bài đính kèm'

                  return (
                    <div
                      key={item._id}
                      data-testid={`assignment-card-${item._id}`}
                      className="p-4 rounded-2xl border border-slate-200 hover:border-blue-300 bg-white transition-all shadow-2xs space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900">
                              {item.title}
                            </h4>

                            {/* Badge Trạng thái Đang mở / Đã khóa */}
                            {isOpen ? (
                              <span
                                data-testid={`status-badge-${item._id}`}
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                              >
                                <Unlock className="w-3 h-3" />
                                <span>Đang mở</span>
                              </span>
                            ) : (
                              <span
                                data-testid={`status-badge-${item._id}`}
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200"
                              >
                                <Lock className="w-3 h-3" />
                                <span>Đã khóa</span>
                              </span>
                            )}

                            {isOverdue && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                <Clock className="w-3 h-3" />
                                <span>Đã qua hạn nộp</span>
                              </span>
                            )}
                          </div>

                          {item.description && (
                            <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">
                              {item.description}
                            </p>
                          )}
                        </div>

                        {/* Cụm nút hành động: Xem bài nộp & Chấm điểm, Mở/Khóa nhận bài, Chỉnh sửa, Xóa */}
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <button
                            type="button"
                            data-testid={`toggle-submissions-btn-${item._id}`}
                            onClick={() =>
                              setGradingAssignmentId((prev) =>
                                prev === item._id ? null : item._id
                              )
                            }
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${gradingAssignmentId === item._id
                                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
                              }`}
                          >
                            <Users className="w-3.5 h-3.5" />
                            <span>
                              {gradingAssignmentId === item._id
                                ? 'Ẩn danh sách bài nộp'
                                : 'Xem bài nộp & Chấm điểm'}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleStatus(item)}
                            disabled={togglingStatusId === item._id}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${isOpen
                                ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                              }`}
                            title={
                              isOpen
                                ? 'Khóa không cho học sinh nộp bài'
                                : 'Mở lại cho phép học sinh nộp bài'
                            }
                          >
                            {isOpen ? (
                              <>
                                <Lock className="w-3.5 h-3.5" />
                                <span>Khóa nhận bài</span>
                              </>
                            ) : (
                              <>
                                <Unlock className="w-3.5 h-3.5" />
                                <span>Mở nhận bài</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            aria-label={`Chỉnh sửa ${item.title}`}
                            title="Chỉnh sửa bài tập"
                            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenDeleteModal(item)}
                            aria-label={`Xóa ${item.title}`}
                            title="Xóa bài tập"
                            className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Footer thông tin hạn nộp & file đề bài */}
                      <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-blue-600" />
                          <span>
                            Hạn nộp:{' '}
                            <strong className="text-slate-700">
                              {formatDueDate(item.dueDate)}
                            </strong>
                          </span>
                        </div>

                        {primaryAttachmentUrl && (
                          <a
                            href={primaryAttachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-semibold hover:underline"
                          >
                            <Paperclip className="w-3.5 h-3.5" />
                            <span className="truncate max-w-[220px]">
                              {attachmentName}
                            </span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>

                      {/* Bảng danh sách bài nộp & Chấm điểm inline */}
                      {gradingAssignmentId === item._id && (
                        <TeacherSubmissionGradingPanel
                          assignment={item}
                          onClose={() => setGradingAssignmentId(null)}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL TẠO MỚI / CHỈNH SỬA BÀI TẬP */}
      {(modalType === 'create' || modalType === 'edit') && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="assignment-modal-title"
        >
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-600 text-white rounded-xl">
                  <ClipboardList className="w-4 h-4" />
                </div>
                <h3
                  id="assignment-modal-title"
                  className="text-base font-bold text-slate-900"
                >
                  {modalType === 'create'
                    ? 'Tạo bài tập mới'
                    : 'Chỉnh sửa bài tập'}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                aria-label="Đóng hộp thoại"
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form
              onSubmit={handleSubmitForm}
              className="p-6 space-y-4 max-h-[80vh] overflow-y-auto"
            >
              {formError && (
                <div
                  role="alert"
                  className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-medium text-red-700 flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{formError}</span>
                </div>
              )}

              {/* 1. Chọn Lớp - Môn học */}
              <div>
                <label
                  htmlFor={assignmentSelectId}
                  className="block text-xs font-bold text-slate-700 mb-1.5"
                >
                  Lớp – Môn học <span className="text-red-500">*</span>
                </label>
                <select
                  id={assignmentSelectId}
                  value={formData.teachingAssignment}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      teachingAssignment: e.target.value,
                    }))
                  }
                  disabled={formSubmitting}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-blue-600"
                >
                  <option value="">-- Chọn Lớp – Môn học --</option>
                  {teachingAssignments.map((ta) => (
                    <option key={ta._id} value={ta._id}>
                      {getTeachingAssignmentLabel(ta)}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Tiêu đề bài tập */}
              <div>
                <label
                  htmlFor={titleInputId}
                  className="block text-xs font-bold text-slate-700 mb-1.5"
                >
                  Tiêu đề bài tập <span className="text-red-500">*</span>
                </label>
                <input
                  id={titleInputId}
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Ví dụ: Bài tập về nhà Chương 1 - Hàm số bậc hai"
                  disabled={formSubmitting}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-blue-600"
                />
              </div>

              {/* 3. Nội dung / Yêu cầu */}
              <div>
                <label
                  htmlFor={descriptionInputId}
                  className="block text-xs font-bold text-slate-700 mb-1.5"
                >
                  Nội dung / Yêu cầu bài tập
                </label>
                <textarea
                  id={descriptionInputId}
                  rows={3}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Nhập hướng dẫn làm bài, yêu cầu định dạng nộp bài và thang điểm..."
                  disabled={formSubmitting}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-blue-600"
                />
              </div>

              {/* 4. Hạn nộp (Date Picker) & Trạng thái nhận bài */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor={dueDateInputId}
                    className="block text-xs font-bold text-slate-700 mb-1.5"
                  >
                    Hạn nộp <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id={dueDateInputId}
                      data-testid="due-date-picker"
                      type="datetime-local"
                      value={formData.dueDate}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          dueDate: e.target.value,
                        }))
                      }
                      disabled={formSubmitting}
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-blue-600"
                    />
                  </div>
                  {/* Nút chọn nhanh hạn nộp */}
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="text-[11px] text-slate-400">
                      Chọn nhanh:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleQuickDueDate(1)}
                      className="px-2 py-0.5 text-[11px] font-medium bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 rounded-md transition-colors"
                    >
                      +1 ngày
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickDueDate(3)}
                      className="px-2 py-0.5 text-[11px] font-medium bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 rounded-md transition-colors"
                    >
                      +3 ngày
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickDueDate(7)}
                      className="px-2 py-0.5 text-[11px] font-medium bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 rounded-md transition-colors"
                    >
                      +7 ngày
                    </button>
                  </div>
                </div>

                <div>
                  <span className="block text-xs font-bold text-slate-700 mb-1.5">
                    Trạng thái nhận bài
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, status: 'open' }))
                      }
                      className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${formData.status === 'open'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-2xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Đang mở</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, status: 'locked' }))
                      }
                      className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${formData.status === 'locked'
                          ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-2xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Đã khóa</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 5. Upload File Đề bài & Link đính kèm */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <FileUploadManager
                  title="Tải lên file đề bài đính kèm"
                  helperText="Hỗ trợ PDF, Word, Excel, PowerPoint, ZIP, Hình ảnh (tải lên Cloudinary)"
                  currentResourceUrl={formData.attachmentUrl}
                  attachments={formData.attachments}
                  onUploadSuccess={handleUploadSuccess}
                  onDeleteAttachment={handleDeleteAttachment}
                  autoUpload={true}
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={formSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  {formSubmitting
                    ? 'Đang lưu...'
                    : modalType === 'create'
                      ? 'Giao bài tập'
                      : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN XÓA BÀI TẬP */}
      {modalType === 'delete' && activeAssignment && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-red-100 text-red-600 rounded-xl">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Xác nhận xóa bài tập
                </h3>
                <p className="text-xs text-slate-500">
                  Thao tác này sẽ xóa bài tập và tệp đính kèm liên quan.
                </p>
              </div>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                {formError}
              </div>
            )}

            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
              Bạn có chắc chắn muốn xóa bài tập{' '}
              <strong className="text-slate-900">
                &ldquo;{activeAssignment.title}&rdquo;
              </strong>{' '}
              không?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={formSubmitting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={formSubmitting}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs cursor-pointer"
              >
                {formSubmitting ? 'Đang xóa...' : 'Xóa bài tập'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TeacherAssignmentPage
