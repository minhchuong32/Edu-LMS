import { useState, useEffect, useMemo } from 'react'
import {
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Award,
  Eye,
  Download,
  Save,
  Search,
  RefreshCw,
  X,
  FileText,
  ExternalLink,
} from 'lucide-react'
import assignmentApi from '@/api/assignmentApi'
import LoadingSpinner from '@/components/common/LoadingSpinner'

/**
 * Định dạng thời gian nộp bài sang tiếng Việt
 */
const formatSubmittedTime = (dateInput) => {
  if (!dateInput) return 'Chưa rõ'
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
 * Kiểm tra bài nộp đã được chấm điểm hay chưa
 */
const checkIsGraded = (submission) => {
  return (
    submission &&
    submission.score !== null &&
    submission.score !== undefined &&
    submission.score !== ''
  )
}

/**
 * Kiểm tra loại file từ URL để hỗ trợ Xem trước (Preview)
 */
const getPreviewType = (fileUrl = '') => {
  const cleanUrl = fileUrl.split('?')[0].toLowerCase()
  if (/\.(jpg|jpeg|png|webp|gif|svg)$/.test(cleanUrl)) return 'image'
  if (/\.pdf$/.test(cleanUrl)) return 'pdf'
  return 'document'
}

/**
 * Bảng danh sách bài nộp & Chấm điểm trực tiếp (Inline Grading) dành cho Giáo viên
 */
export const TeacherSubmissionGradingPanel = ({ assignment, onClose }) => {
  const assignmentId = assignment?._id

  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)

  // State lưu nháp Điểm (score) và Nhận xét (feedback) trực tiếp trên từng dòng bài nộp
  const [draftGrades, setDraftGrades] = useState({})
  const [savingId, setSavingId] = useState(null)

  // Thông báo khi cập nhật điểm thành công / thất bại
  const [gradeStatusMsg, setGradeStatusMsg] = useState(null) // { type: 'success' | 'error', text: string }

  // Tìm kiếm & Bộ lọc
  const [searchStudent, setSearchStudent] = useState('')
  const [timelinessFilter, setTimelinessFilter] = useState('ALL') // 'ALL' | 'on_time' | 'late'
  const [gradedFilter, setGradedFilter] = useState('ALL') // 'ALL' | 'graded' | 'ungraded'

  // Modal / Khung xem trước file bài làm (Preview)
  const [previewSubmission, setPreviewSubmission] = useState(null)

  // Trigger tải lại
  const [reloadKey, setReloadKey] = useState(0)

  // Tải danh sách bài nộp của bài tập
  useEffect(() => {
    let ignore = false

    const fetchSubmissions = async () => {
      if (!assignmentId) {
        await Promise.resolve()
        if (!ignore) {
          setSubmissions([])
          setLoading(false)
        }
        return
      }

      setLoading(true)
      try {
        const res = await assignmentApi.getSubmissionsByAssignment(assignmentId)
        const list = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
            ? res
            : res?.data?.submissions || []

        if (!ignore) {
          setSubmissions(list)
          const initialDrafts = {}
          list.forEach((sub) => {
            initialDrafts[sub._id] = {
              score:
                sub.score !== null && sub.score !== undefined
                  ? String(sub.score)
                  : '',
              feedback: sub.feedback || '',
            }
          })
          setDraftGrades(initialDrafts)
        }
      } catch (err) {
        if (!ignore) {
          setSubmissions([])
          setGradeStatusMsg({
            type: 'error',
            text:
              err?.message ||
              'Không thể tải danh sách bài nộp của học sinh cho bài tập này.',
          })
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    fetchSubmissions()
    return () => {
      ignore = true
    }
  }, [assignmentId, reloadKey])

  // Cập nhật giá trị ô nhập điểm hoặc nhận xét của một học sinh
  const handleDraftChange = (submissionId, field, value) => {
    setDraftGrades((prev) => ({
      ...prev,
      [submissionId]: {
        ...(prev[submissionId] || { score: '', feedback: '' }),
        [field]: value,
      },
    }))
  }

  // Lưu kết quả chấm điểm & nhận xét cho từng học sinh
  const handleSaveGrade = async (submission) => {
    const subId = submission._id
    const draft = draftGrades[subId] || {
      score:
        submission.score !== null && submission.score !== undefined
          ? String(submission.score)
          : '',
      feedback: submission.feedback || '',
    }

    const rawScore = String(draft.score ?? '').trim()
    const rawFeedback = String(draft.feedback ?? '').trim()
    const studentName = submission.student?.fullName || 'Học sinh'

    if (rawScore === '') {
      setGradeStatusMsg({
        type: 'error',
        text: `Vui lòng nhập điểm số cho học sinh ${studentName}.`,
      })
      return
    }

    const numericScore = Number(rawScore)
    if (
      Number.isNaN(numericScore) ||
      !Number.isFinite(numericScore) ||
      numericScore < 0 ||
      numericScore > 10
    ) {
      setGradeStatusMsg({
        type: 'error',
        text: `Điểm số của ${studentName} không hợp lệ! Điểm phải nằm trong khoảng từ 0 đến 10.`,
      })
      return
    }

    setSavingId(subId)
    setGradeStatusMsg(null)

    try {
      const res = await assignmentApi.gradeSubmission(subId, {
        score: numericScore,
        feedback: rawFeedback,
      })

      const updatedSub = res?.data || res || {}

      setSubmissions((prev) =>
        prev.map((item) =>
          item._id === subId
            ? {
              ...item,
              score:
                updatedSub.score !== undefined
                  ? updatedSub.score
                  : numericScore,
              feedback:
                updatedSub.feedback !== undefined
                  ? updatedSub.feedback
                  : rawFeedback,
              gradedAt: updatedSub.gradedAt || new Date().toISOString(),
            }
            : item
        )
      )

      setGradeStatusMsg({
        type: 'success',
        text: `Đã lưu kết quả chấm (${numericScore}/10) và gửi thông báo cho học sinh ${studentName} thành công!`,
      })
    } catch (err) {
      setGradeStatusMsg({
        type: 'error',
        text:
          err?.message ||
          `Cập nhật điểm cho học sinh ${studentName} thất bại. Vui lòng thử lại!`,
      })
    } finally {
      setSavingId(null)
    }
  }

  // Lọc danh sách bài nộp
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      const keyword = searchStudent.trim().toLowerCase()
      const studentName = sub.student?.fullName?.toLowerCase() || ''
      const studentCode = sub.student?.userCode?.toLowerCase() || ''
      const studentEmail = sub.student?.email?.toLowerCase() || ''

      const matchKeyword =
        !keyword ||
        studentName.includes(keyword) ||
        studentCode.includes(keyword) ||
        studentEmail.includes(keyword)

      if (!matchKeyword) return false

      if (timelinessFilter === 'on_time' && sub.isLate) return false
      if (timelinessFilter === 'late' && !sub.isLate) return false

      const isGraded = checkIsGraded(sub)
      if (gradedFilter === 'graded' && !isGraded) return false
      if (gradedFilter === 'ungraded' && isGraded) return false

      return true
    })
  }, [submissions, searchStudent, timelinessFilter, gradedFilter])

  // Thống kê nhanh bài nộp
  const stats = useMemo(() => {
    const total = submissions.length
    const onTimeCount = submissions.filter((s) => !s.isLate).length
    const lateCount = submissions.filter((s) => s.isLate).length
    const gradedCount = submissions.filter((s) => checkIsGraded(s)).length
    const ungradedCount = total - gradedCount
    return { total, onTimeCount, lateCount, gradedCount, ungradedCount }
  }, [submissions])

  return (
    <div
      data-testid={`grading-panel-${assignmentId}`}
      className="mt-4 pt-4 border-t-2 border-blue-100 bg-slate-50/70 rounded-2xl p-4 space-y-4"
    >
      {/* Header khu vực chấm bài */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-600 text-white rounded-xl">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              Danh sách bài nộp & Chấm điểm: {assignment?.title}
            </h4>
            <p className="text-xs text-slate-500">
              Kiểm tra file bài làm, nhập điểm (0 - 10) và nhận xét trực tiếp cho từng học sinh
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            disabled={loading}
            title="Làm mới danh sách bài nộp"
            className="p-2 text-slate-500 hover:text-blue-600 bg-white border border-slate-200 rounded-xl transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng danh sách bài nộp"
              className="p-2 text-slate-400 hover:text-slate-700 bg-white border border-slate-200 rounded-xl transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Thống kê bài nộp */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
        <div className="p-2.5 bg-white rounded-xl border border-slate-200">
          <p className="text-sm font-bold text-slate-800">{stats.total}</p>
          <p className="text-[11px] text-slate-500">Tổng bài nộp</p>
        </div>
        <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
          <p className="text-sm font-bold text-emerald-700">
            {stats.onTimeCount}
          </p>
          <p className="text-[11px] text-emerald-600">Đúng hạn</p>
        </div>
        <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200">
          <p className="text-sm font-bold text-amber-700">{stats.lateCount}</p>
          <p className="text-[11px] text-amber-600">Trễ hạn</p>
        </div>
        <div className="p-2.5 bg-violet-50 rounded-xl border border-violet-200">
          <p className="text-sm font-bold text-violet-700">
            {stats.gradedCount}
          </p>
          <p className="text-[11px] text-violet-600">Đã chấm</p>
        </div>
        <div className="p-2.5 bg-slate-100 rounded-xl border border-slate-200">
          <p className="text-sm font-bold text-slate-700">
            {stats.ungradedCount}
          </p>
          <p className="text-[11px] text-slate-500">Chưa chấm</p>
        </div>
      </div>

      {/* Thông báo khi cập nhật điểm thành công / thất bại */}
      {gradeStatusMsg && (
        <div
          role={gradeStatusMsg.type === 'error' ? 'alert' : 'status'}
          data-testid={
            gradeStatusMsg.type === 'error'
              ? 'grading-alert-error'
              : 'grading-alert-success'
          }
          className={`p-3 rounded-xl text-xs font-medium flex items-center justify-between gap-2 border ${gradeStatusMsg.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
        >
          <div className="flex items-center gap-2">
            {gradeStatusMsg.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <span>{gradeStatusMsg.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setGradeStatusMsg(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Thanh tìm kiếm học sinh & Lọc trạng thái */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchStudent}
            onChange={(e) => setSearchStudent(e.target.value)}
            placeholder="Tìm học sinh theo tên, mã định danh hoặc email..."
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Lọc trạng thái hạn nộp"
            value={timelinessFilter}
            onChange={(e) => setTimelinessFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500"
          >
            <option value="ALL">Tất cả hạn nộp</option>
            <option value="on_time">Đúng hạn</option>
            <option value="late">Trễ hạn</option>
          </select>

          <select
            aria-label="Lọc trạng thái chấm điểm"
            value={gradedFilter}
            onChange={(e) => setGradedFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500"
          >
            <option value="ALL">Tất cả trạng thái chấm</option>
            <option value="graded">Đã chấm</option>
            <option value="ungraded">Chưa chấm</option>
          </select>
        </div>
      </div>

      {/* Bảng danh sách bài nộp của học sinh */}
      {loading ? (
        <div className="py-10 flex justify-center bg-white rounded-2xl border border-slate-200">
          <LoadingSpinner />
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div className="py-10 px-4 text-center bg-white rounded-2xl border border-dashed border-slate-200">
          <p className="text-xs font-medium text-slate-600">
            Chưa có bài nộp nào của học sinh phù hợp với bộ lọc.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-2xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Học sinh</th>
                <th className="py-3 px-3">Thời gian nộp & Hạn</th>
                <th className="py-3 px-3">Bài làm</th>
                <th className="py-3 px-3">Trạng thái chấm</th>
                <th className="py-3 px-3">Điểm (0 - 10)</th>
                <th className="py-3 px-3">Nhận xét của Giáo viên</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredSubmissions.map((sub) => {
                const isGraded = checkIsGraded(sub)
                const draft = draftGrades[sub._id] || {
                  score:
                    sub.score !== null && sub.score !== undefined
                      ? String(sub.score)
                      : '',
                  feedback: sub.feedback || '',
                }
                const isSaving = savingId === sub._id
                const studentName = sub.student?.fullName || 'Học sinh'
                const studentCode = sub.student?.userCode || ''

                return (
                  <tr
                    key={sub._id}
                    data-testid={`submission-row-${sub._id}`}
                    className="hover:bg-blue-50/30 transition-colors align-top"
                  >
                    {/* 1. Thông tin học sinh */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">
                        {studentName}
                      </div>
                      {studentCode && (
                        <div className="text-[11px] text-slate-500">
                          Mã HS: {studentCode}
                        </div>
                      )}
                      {sub.note && (
                        <div className="mt-1 text-[11px] text-slate-600 italic bg-slate-100 px-2 py-1 rounded-md">
                          Ghi chú: &ldquo;{sub.note}&rdquo;
                        </div>
                      )}
                    </td>

                    {/* 2. Thời gian nộp & Trạng thái Đúng hạn / Trễ hạn */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <div className="text-slate-700 font-medium">
                        {formatSubmittedTime(sub.submittedAt)}
                      </div>
                      <div className="mt-1">
                        {sub.isLate ? (
                          <span
                            data-testid={`timeliness-badge-${sub._id}`}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200"
                          >
                            <AlertTriangle className="w-3 h-3" />
                            <span>Trễ hạn</span>
                          </span>
                        ) : (
                          <span
                            data-testid={`timeliness-badge-${sub._id}`}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Đúng hạn</span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 3. Xem trước hoặc Tải file bài làm */}
                    <td className="py-3.5 px-3">
                      <div className="flex flex-col gap-1.5">
                        <button
                          type="button"
                          data-testid={`preview-file-btn-${sub._id}`}
                          onClick={() => setPreviewSubmission(sub)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold border border-blue-200 transition-colors cursor-pointer w-fit"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Xem trước</span>
                        </button>

                        <a
                          href={sub.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          data-testid={`download-file-link-${sub._id}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors w-fit"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Tải file</span>
                        </a>
                      </div>
                    </td>

                    {/* 4. Trạng thái Đã chấm / Chưa chấm */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      {isGraded ? (
                        <span
                          data-testid={`graded-badge-${sub._id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-violet-50 text-violet-700 border border-violet-200"
                        >
                          <Award className="w-3 h-3" />
                          <span>Đã chấm ({sub.score}/10)</span>
                        </span>
                      ) : (
                        <span
                          data-testid={`graded-badge-${sub._id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200"
                        >
                          <Clock className="w-3 h-3" />
                          <span>Chưa chấm</span>
                        </span>
                      )}
                    </td>

                    {/* 5. Ô nhập Điểm inline */}
                    <td className="py-3.5 px-3">
                      <input
                        type="number"
                        min="0"
                        max="10"
                        step="0.25"
                        aria-label={`Điểm của ${studentName}`}
                        data-testid={`score-input-${sub._id}`}
                        value={draft.score}
                        onChange={(e) =>
                          handleDraftChange(sub._id, 'score', e.target.value)
                        }
                        placeholder="0 - 10"
                        disabled={isSaving}
                        className="w-20 px-2.5 py-1.5 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-blue-600"
                      />
                    </td>

                    {/* 6. Ô nhập Nhận xét inline */}
                    <td className="py-3.5 px-3 min-w-[200px]">
                      <input
                        type="text"
                        aria-label={`Nhận xét cho ${studentName}`}
                        data-testid={`feedback-input-${sub._id}`}
                        value={draft.feedback}
                        onChange={(e) =>
                          handleDraftChange(sub._id, 'feedback', e.target.value)
                        }
                        placeholder="Nhập nhận xét cho học sinh..."
                        disabled={isSaving}
                        className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-blue-600"
                      />
                    </td>

                    {/* 7. Nút Lưu kết quả chấm */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        data-testid={`save-grade-btn-${sub._id}`}
                        onClick={() => handleSaveGrade(sub)}
                        disabled={isSaving}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-semibold rounded-xl shadow-2xs transition-all cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{isSaving ? 'Đang lưu...' : 'Lưu kết quả'}</span>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL XEM TRƯỚC (PREVIEW) FILE BÀI LÀM CỦA HỌC SINH */}
      {previewSubmission && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          data-testid="file-preview-modal"
        >
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Xem trước bài làm:{' '}
                    {previewSubmission.student?.fullName || 'Học sinh'}
                  </h4>
                  <p className="text-[11px] text-slate-500 truncate max-w-md">
                    {previewSubmission.fileUrl}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={previewSubmission.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải xuống / Mở tab mới</span>
                  <ExternalLink className="w-3 h-3" />
                </a>

                <button
                  type="button"
                  onClick={() => setPreviewSubmission(null)}
                  aria-label="Đóng xem trước"
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-100 p-4 overflow-auto min-h-[420px] flex items-center justify-center">
              {getPreviewType(previewSubmission.fileUrl) === 'image' ? (
                <img
                  src={previewSubmission.fileUrl}
                  alt="Xem trước bài làm"
                  className="max-h-[65vh] max-w-full rounded-xl shadow-sm object-contain"
                />
              ) : (
                <iframe
                  src={previewSubmission.fileUrl}
                  title="Trình xem trước file bài nộp"
                  className="w-full h-[65vh] bg-white rounded-xl border border-slate-200"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TeacherSubmissionGradingPanel

