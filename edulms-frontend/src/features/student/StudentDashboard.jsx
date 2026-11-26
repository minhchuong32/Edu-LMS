import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Award,
  BookOpen,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ClipboardList,
  FileText,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  PlayCircle,
} from 'lucide-react'
import { useAuth } from '@/context/useAuth'
import academicApi from '@/api/academicApi'
import assignmentApi from '@/api/assignmentApi'
import examApi from '@/api/examApi'
import gradebookApi from '@/api/gradebookApi'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import {
  calculateRowWeightedAverage,
  calculateOverallGPA,
  classifyAcademicPerformance,
} from '@/utils/gradeCalculator'

/**
 * Định dạng ngày giờ sang chuẩn tiếng Việt
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
 * Kiểm tra một bản ghi dữ liệu có thuộc về học sinh đang đăng nhập hay không
 * - Nếu bản ghi có gắn studentId / student._id / student thì phải khớp với currentStudentId
 */
const isOwnedByCurrentStudent = (item, currentStudentId) => {
  if (!item) return false
  if (!currentStudentId || currentStudentId === 'me') return true

  const itemStudentId =
    item.studentId ||
    item.student?._id ||
    item.student?.id ||
    (typeof item.student === 'string' ? item.student : null) ||
    null

  if (!itemStudentId) return true
  return String(itemStudentId) === String(currentStudentId)
}

/**
 * Phân loại trạng thái bài tập của học sinh:
 * - 'submitted': Đã nộp
 * - 'pending_in_time': Chưa nộp & Còn hạn
 * - 'overdue': Chưa nộp & Quá hạn
 */
const resolveAssignmentCategory = (item) => {
  if (
    item.submissionCategory &&
    ['submitted', 'pending_in_time', 'overdue'].includes(
      item.submissionCategory
    )
  ) {
    return item.submissionCategory
  }

  const hasSubmitted = Boolean(
    item.hasSubmitted ||
      item.mySubmission?.fileUrl ||
      item.submission?.fileUrl ||
      item.status === 'submitted'
  )
  if (hasSubmitted) return 'submitted'

  const due = item.dueDate ? new Date(item.dueDate) : null
  const isOverdue =
    due && !Number.isNaN(due.getTime()) ? due < new Date() : false

  return isOverdue ? 'overdue' : 'pending_in_time'
}

/**
 * Trang Dashboard cá nhân dành cho Học sinh (StudentDashboard)
 * - Hiển thị Card điểm trung bình hiện tại (GPA, xếp loại học lực & ĐTB từng môn)
 * - Hiển thị Tiến độ bài tập & phân biệt rõ: Đã nộp, Chưa nộp & Còn hạn, Quá hạn
 * - Hiển thị Danh sách lịch kiểm tra sắp tới
 * - Kiểm soát chặt quyền truy cập dữ liệu cá nhân: chỉ hiển thị dữ liệu của học sinh đang đăng nhập
 */
export const StudentDashboard = () => {
  const { user } = useAuth()
  const currentStudentId =
    user?._id || user?.userId || user?.id || user?.userCode || 'me'

  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState(null)

  const [gpaOverview, setGpaOverview] = useState({
    currentGPA: null,
    academicPerformance: 'Chưa xếp loại',
    subjectAverages: [],
  })
  const [assignmentItems, setAssignmentItems] = useState([])
  const [upcomingExams, setUpcomingExams] = useState([])

  // Bộ lọc tab bài tập: 'ALL' | 'pending_in_time' | 'submitted' | 'overdue'
  const [assignmentFilter, setAssignmentFilter] = useState('ALL')
  // Bộ lọc lịch kiểm tra: 'ALL' | 'upcoming' | 'completed'
  const [examFilter, setExamFilter] = useState('ALL')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let ignore = false

    const loadStudentDashboard = async () => {
      setLoading(true)
      setErrorMsg(null)

      try {
        // 1. Ưu tiên gọi API thống kê tập trung /v1/academic/student-dashboard
        if (typeof academicApi.getStudentDashboardStats === 'function') {
          try {
            const res = await academicApi.getStudentDashboardStats()
            const payload = res?.data || res || null

            if (
              payload &&
              (payload.gpaOverview ||
                payload.assignmentProgress ||
                Array.isArray(payload.upcomingExams))
            ) {
              // Kiểm tra quyền truy cập dữ liệu cá nhân: nếu payload trả về thuộc studentId khác thì từ chối hiển thị
              if (
                payload.studentId &&
                currentStudentId !== 'me' &&
                String(payload.studentId) !== String(currentStudentId)
              ) {
                if (!ignore) {
                  setErrorMsg(
                    'Phát hiện dữ liệu không thuộc tài khoản học sinh đang đăng nhập!'
                  )
                  setGpaOverview({
                    currentGPA: null,
                    academicPerformance: 'Chưa xếp loại',
                    subjectAverages: [],
                  })
                  setAssignmentItems([])
                  setUpcomingExams([])
                  setLoading(false)
                }
                return
              }

              if (!ignore) {
                const rawSubjectAvgs = Array.isArray(
                  payload.gpaOverview?.subjectAverages
                )
                  ? payload.gpaOverview.subjectAverages
                  : []
                const ownSubjects = rawSubjectAvgs.filter((s) =>
                  isOwnedByCurrentStudent(s, currentStudentId)
                )

                const rawAssignments = Array.isArray(
                  payload.assignmentProgress?.items
                )
                  ? payload.assignmentProgress.items
                  : []
                const ownAssignments = rawAssignments
                  .filter((a) => isOwnedByCurrentStudent(a, currentStudentId))
                  .map((a) => ({
                    ...a,
                    submissionCategory: resolveAssignmentCategory(a),
                  }))

                const rawExams = Array.isArray(payload.upcomingExams)
                  ? payload.upcomingExams
                  : []
                const ownExams = rawExams.filter((e) =>
                  isOwnedByCurrentStudent(e, currentStudentId)
                )

                setGpaOverview({
                  currentGPA:
                    payload.gpaOverview?.currentGPA ??
                    calculateOverallGPA(
                      ownSubjects.map((s) => ({
                        subjectName: s.subjectName,
                        average: s.average,
                      }))
                    ),
                  academicPerformance:
                    payload.gpaOverview?.academicPerformance ||
                    classifyAcademicPerformance(
                      payload.gpaOverview?.currentGPA
                    ),
                  subjectAverages: ownSubjects,
                })
                setAssignmentItems(ownAssignments)
                setUpcomingExams(ownExams)
                setLoading(false)
              }
              return
            }
          } catch {
            // Fallback sang tổng hợp từ các API thành phần nếu endpoint thống kê chưa sẵn sàng
          }
        }

        // 2. Dự phòng: Tổng hợp từ API điểm số, bài tập và đề kiểm tra của học sinh hiện tại
        const [gradeRes, assignRes, examRes] = await Promise.all([
          typeof gradebookApi?.getGradeRecords === 'function'
            ? gradebookApi
                .getGradeRecords({ student: currentStudentId })
                .catch(() => ({ data: {} }))
            : Promise.resolve({ data: {} }),
          typeof assignmentApi?.getAssignments === 'function'
            ? assignmentApi.getAssignments().catch(() => ({ data: [] }))
            : Promise.resolve({ data: [] }),
          typeof examApi?.getExams === 'function'
            ? examApi.getExams().catch(() => ({ data: { exams: [] } }))
            : Promise.resolve({ data: { exams: [] } }),
        ])

        if (ignore) return

        // Xử lý Điểm trung bình hiện tại (chỉ giữ bản ghi của currentStudentId)
        const gradeData = gradeRes?.data || gradeRes || {}
        const rawRecords = Array.isArray(gradeData?.records)
          ? gradeData.records
          : Array.isArray(gradeData)
            ? gradeData
            : []

        const ownRecords = rawRecords.filter((r) =>
          isOwnedByCurrentStudent(r, currentStudentId)
        )

        const groupedBySub = new Map()
        ownRecords.forEach((rec) => {
          const subName =
            rec.teachingAssignment?.subject?.name ||
            rec.subjectName ||
            'Môn học'
          const subCode =
            rec.teachingAssignment?.subject?.code || rec.subjectCode || '---'
          if (!groupedBySub.has(subName)) {
            groupedBySub.set(subName, {
              subjectName: subName,
              subjectCode: subCode,
              records: [],
            })
          }
          groupedBySub.get(subName).records.push(rec)
        })

        const builtSubjects = []
        groupedBySub.forEach((group, subName) => {
          const avg = calculateRowWeightedAverage(group.records)
          if (typeof avg === 'number') {
            builtSubjects.push({
              subjectId: subName,
              subjectName: subName,
              subjectCode: group.subjectCode,
              average: avg,
              recordCount: group.records.length,
              performance: classifyAcademicPerformance(avg),
            })
          }
        })

        const computedGPA = calculateOverallGPA(builtSubjects)

        // Xử lý danh sách bài tập của học sinh
        const rawAssignData = assignRes?.data || assignRes || []
        const assignList = Array.isArray(rawAssignData)
          ? rawAssignData
          : rawAssignData?.assignments || []

        const builtAssignments = assignList
          .filter((a) => isOwnedByCurrentStudent(a, currentStudentId))
          .map((a) => {
            const category = resolveAssignmentCategory(a)
            return {
              _id: String(a._id),
              title: a.title,
              dueDate: a.dueDate,
              subjectName:
                a.teachingAssignment?.subject?.name ||
                a.subjectName ||
                'Môn học',
              className:
                a.teachingAssignment?.class?.name ||
                user?.className ||
                '---',
              submissionCategory: category,
              hasSubmitted: category === 'submitted',
              isOverdue: category === 'overdue',
              score: a.mySubmission?.score ?? a.score ?? null,
            }
          })

        // Xử lý danh sách lịch kiểm tra sắp tới
        const rawExamData = examRes?.data || examRes || {}
        const examList = Array.isArray(rawExamData)
          ? rawExamData
          : rawExamData?.exams || []

        const builtExams = examList
          .filter((e) => isOwnedByCurrentStudent(e, currentStudentId))
          .map((e) => ({
            _id: String(e._id),
            title: e.title,
            duration: e.duration || 15,
            totalQuestions:
              e.totalQuestions ||
              (Array.isArray(e.questions) ? e.questions.length : 0),
            subjectName:
              e.teachingAssignment?.subject?.name ||
              e.subjectName ||
              'Môn học',
            className:
              e.teachingAssignment?.class?.name || user?.className || '---',
            scheduledAt: e.scheduledAt || e.publishedAt || e.createdAt,
            isCompleted: Boolean(e.isCompleted || e.hasSubmitted || e.attempt),
            attemptScore: e.attempt?.score ?? e.attemptScore ?? null,
          }))

        setGpaOverview({
          currentGPA: computedGPA,
          academicPerformance: classifyAcademicPerformance(computedGPA),
          subjectAverages: builtSubjects,
        })
        setAssignmentItems(builtAssignments)
        setUpcomingExams(builtExams)
      } catch (err) {
        if (!ignore) {
          setErrorMsg(
            err?.message || 'Không thể tải dữ liệu Dashboard học sinh.'
          )
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    loadStudentDashboard()
    return () => {
      ignore = true
    }
  }, [currentStudentId, user?.className, reloadKey])

  // Thống kê tiến độ bài tập: Đã nộp, Chưa nộp & Còn hạn, Quá hạn
  const assignmentStats = useMemo(() => {
    const total = assignmentItems.length
    const submittedCount = assignmentItems.filter(
      (a) => a.submissionCategory === 'submitted'
    ).length
    const pendingInTimeCount = assignmentItems.filter(
      (a) => a.submissionCategory === 'pending_in_time'
    ).length
    const overdueCount = assignmentItems.filter(
      (a) => a.submissionCategory === 'overdue'
    ).length
    const completionRate =
      total > 0 ? Math.round((submittedCount / total) * 100) : 0

    return {
      total,
      submittedCount,
      pendingInTimeCount,
      overdueCount,
      completionRate,
    }
  }, [assignmentItems])

  // Lọc danh sách bài tập theo tab đã chọn
  const filteredAssignments = useMemo(() => {
    if (assignmentFilter === 'ALL') return assignmentItems
    return assignmentItems.filter(
      (a) => a.submissionCategory === assignmentFilter
    )
  }, [assignmentItems, assignmentFilter])

  // Lọc danh sách lịch kiểm tra sắp tới
  const filteredExams = useMemo(() => {
    if (examFilter === 'ALL') return upcomingExams
    if (examFilter === 'upcoming') {
      return upcomingExams.filter((e) => !e.isCompleted)
    }
    return upcomingExams.filter((e) => Boolean(e.isCompleted))
  }, [upcomingExams, examFilter])

  const upcomingUnfinishedExamCount = useMemo(
    () => upcomingExams.filter((e) => !e.isCompleted).length,
    [upcomingExams]
  )

  return (
    <div className="space-y-6">
      {/* 1. Header Trang & Chỉ báo Bảo mật Dữ liệu Cá nhân */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Góc Học Tập Học Sinh
            </h1>
            <span
              data-testid="student-personal-scope-badge"
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                Dữ liệu cá nhân: {user?.fullName || user?.name || 'Học sinh'}
              </span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Theo dõi nhanh điểm trung bình hiện tại, tiến độ nộp bài tập và lịch
            kiểm tra sắp tới của riêng bạn
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="refresh-student-dashboard-btn"
            onClick={() => setReloadKey((k) => k + 1)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl shadow-2xs transition-colors"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
            />
            <span>Làm mới dữ liệu</span>
          </button>
        </div>
      </div>

      {/* Thông báo lỗi nếu có */}
      {errorMsg && (
        <div
          data-testid="student-dashboard-error"
          className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="underline font-bold hover:text-red-900"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* 2. Hàng Top: Card Điểm Trung Bình Hiện Tại & Card Tóm tắt Tiến độ Bài tập */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Card Điểm Trung Bình Hiện Tại (5 cột) */}
        <div
          data-testid="student-gpa-card"
          className="lg:col-span-5 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white p-6 rounded-2xl shadow-md flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-blue-100 uppercase tracking-wider">
                Điểm trung bình hiện tại (GPA)
              </span>
              <div className="p-2 rounded-xl bg-white/15 text-white">
                <Award className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-3 flex items-baseline gap-3">
              <p
                data-testid="student-current-gpa-value"
                className="text-4xl font-extrabold tracking-tight"
              >
                {typeof gpaOverview.currentGPA === 'number'
                  ? gpaOverview.currentGPA.toFixed(1)
                  : '--'}
              </p>
              <span className="text-xs text-blue-200 font-medium">/ 10.0</span>
              <span
                data-testid="student-gpa-performance-badge"
                className="ml-auto px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white border border-white/30"
              >
                Học lực: {gpaOverview.academicPerformance || 'Chưa xếp loại'}
              </span>
            </div>

            {/* Danh sách rút gọn ĐTB các môn học */}
            {gpaOverview.subjectAverages.length > 0 ? (
              <div
                data-testid="student-subject-averages-list"
                className="mt-4 pt-3 border-t border-white/15 space-y-2"
              >
                <p className="text-[11px] font-semibold text-blue-100">
                  Điểm trung bình theo môn học ({gpaOverview.subjectAverages.length}{' '}
                  môn):
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {gpaOverview.subjectAverages.slice(0, 4).map((sub) => (
                    <div
                      key={sub.subjectId || sub.subjectName}
                      className="px-2.5 py-1.5 rounded-xl bg-white/10 border border-white/15 flex items-center justify-between text-xs"
                    >
                      <span className="truncate font-medium text-blue-50">
                        {sub.subjectName}
                      </span>
                      <strong className="font-extrabold text-white ml-2">
                        {Number(sub.average).toFixed(1)}
                      </strong>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-4 pt-3 border-t border-white/15 text-xs text-blue-100">
                Chưa có bản ghi điểm môn học nào trong học kỳ hiện tại.
              </p>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-xs">
            <span className="text-blue-100 inline-flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Tự động tính theo hệ số môn học</span>
            </span>
            <Link
              to="/student/grades"
              className="font-bold text-white hover:underline inline-flex items-center gap-1"
            >
              <span>Xem bảng điểm chi tiết</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Card Tổng quan Tiến độ Bài tập (7 cột) */}
        <div
          data-testid="student-assignment-progress-card"
          className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Tiến độ hoàn thành bài tập cá nhân
                </h2>
                <p className="text-[11px] text-slate-500">
                  Phân loại bài tập đã nộp, chưa nộp còn hạn và quá hạn
                </p>
              </div>
            </div>

            <div className="text-right">
              <span
                data-testid="assignment-completion-rate"
                className="text-xl font-extrabold text-blue-700"
              >
                {assignmentStats.completionRate}%
              </span>
              <p className="text-[11px] text-slate-500">
                Hoàn thành ({assignmentStats.submittedCount}/
                {assignmentStats.total} bài)
              </p>
            </div>
          </div>

          {/* Thanh tiến độ bài tập */}
          <div className="space-y-1.5">
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                data-testid="assignment-progress-bar"
                className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full transition-all"
                style={{ width: `${assignmentStats.completionRate}%` }}
              />
            </div>
          </div>

          {/* 3 Ô thống kê phân biệt rõ: Đã nộp | Chưa nộp & Còn hạn | Quá hạn */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Ô 1: Đã nộp */}
            <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-emerald-800 uppercase">
                  Đã nộp
                </p>
                <p
                  data-testid="stat-assignments-submitted"
                  className="text-xl font-extrabold text-emerald-700 mt-0.5"
                >
                  {assignmentStats.submittedCount} bài
                </p>
              </div>
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>

            {/* Ô 2: Chưa nộp & Còn hạn */}
            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-amber-900 uppercase">
                  Chưa nộp • Còn hạn
                </p>
                <p
                  data-testid="stat-assignments-pending-in-time"
                  className="text-xl font-extrabold text-amber-700 mt-0.5"
                >
                  {assignmentStats.pendingInTimeCount} bài
                </p>
              </div>
              <Clock className="w-5 h-5 text-amber-600" />
            </div>

            {/* Ô 3: Chưa nộp & Quá hạn */}
            <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-rose-800 uppercase">
                  Chưa nộp • Quá hạn
                </p>
                <p
                  data-testid="stat-assignments-overdue"
                  className="text-xl font-extrabold text-rose-700 mt-0.5"
                >
                  {assignmentStats.overdueCount} bài
                </p>
              </div>
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bố cục 2 Cột dưới: Danh sách Chi tiết Bài tập & Lịch Kiểm tra Sắp tới */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* CỘT TRÁI (7 Cột): Danh sách Bài tập Phân loại Đã nộp / Chưa nộp & Còn hạn / Quá hạn */}
        <div
          data-testid="student-assignments-section"
          className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Danh sách & tiến độ bài tập
                </h2>
                <p className="text-[11px] text-slate-500">
                  Theo dõi trạng thái nộp bài và thời hạn của từng bài tập
                </p>
              </div>
            </div>

            <Link
              to="/student/assignments"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
            >
              <span>Trang nộp bài tập</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Bộ lọc trạng thái bài tập */}
          <div className="flex items-center gap-1.5 flex-wrap bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              data-testid="filter-assignments-all"
              onClick={() => setAssignmentFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                assignmentFilter === 'ALL'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả ({assignmentStats.total})
            </button>
            <button
              type="button"
              data-testid="filter-assignments-pending-in-time"
              onClick={() => setAssignmentFilter('pending_in_time')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                assignmentFilter === 'pending_in_time'
                  ? 'bg-white text-amber-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Chưa nộp • Còn hạn ({assignmentStats.pendingInTimeCount})
            </button>
            <button
              type="button"
              data-testid="filter-assignments-submitted"
              onClick={() => setAssignmentFilter('submitted')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                assignmentFilter === 'submitted'
                  ? 'bg-white text-emerald-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Đã nộp ({assignmentStats.submittedCount})
            </button>
            <button
              type="button"
              data-testid="filter-assignments-overdue"
              onClick={() => setAssignmentFilter('overdue')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                assignmentFilter === 'overdue'
                  ? 'bg-white text-rose-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Quá hạn ({assignmentStats.overdueCount})
            </button>
          </div>

          {loading ? (
            <div className="py-10 flex justify-center">
              <LoadingSpinner
                size="sm"
                message="Đang tải tiến độ bài tập của bạn..."
              />
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="py-10 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <ClipboardList className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">
                Không có bài tập nào trong mục này
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Bạn có thể chuyển bộ lọc để xem các bài tập khác của lớp mình.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAssignments.map((item) => {
                const category = item.submissionCategory
                const isSubmitted = category === 'submitted'
                const isPendingInTime = category === 'pending_in_time'

                return (
                  <div
                    key={item._id}
                    data-testid={`student-assignment-item-${item._id}`}
                    className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isSubmitted
                        ? 'bg-emerald-50/30 border-emerald-200'
                        : isPendingInTime
                          ? 'bg-amber-50/40 border-amber-200'
                          : 'bg-rose-50/40 border-rose-200'
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800">
                          {item.subjectName}
                        </span>
                        <span
                          data-testid={`assignment-status-badge-${item._id}`}
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            isSubmitted
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : isPendingInTime
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : 'bg-rose-100 text-rose-800 border-rose-200'
                          }`}
                        >
                          {isSubmitted
                            ? item.score !== null && item.score !== undefined
                              ? `Đã nộp • ${item.score}/10 điểm`
                              : 'Đã nộp'
                            : isPendingInTime
                              ? 'Chưa nộp • Còn hạn'
                              : 'Chưa nộp • Quá hạn'}
                        </span>
                      </div>

                      <h3 className="text-xs font-bold text-slate-900 truncate">
                        {item.title}
                      </h3>

                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Hạn nộp: {formatDateTime(item.dueDate)}</span>
                      </div>
                    </div>

                    <Link
                      to="/student/assignments"
                      className={`shrink-0 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-2xs transition-colors ${
                        isSubmitted
                          ? 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      <span>{isSubmitted ? 'Xem bài nộp' : 'Nộp bài ngay'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* CỘT PHẢI (5 Cột): Danh sách Lịch Kiểm tra Sắp tới */}
        <div
          data-testid="upcoming-exams-section"
          className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-violet-50 text-violet-600">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Lịch kiểm tra sắp tới
                </h2>
                <p className="text-[11px] text-slate-500">
                  {upcomingUnfinishedExamCount} bài kiểm tra đang mở chờ bạn thực
                  hiện
                </p>
              </div>
            </div>

            <Link
              to="/student/exams"
              className="text-xs font-semibold text-violet-600 hover:text-violet-800 inline-flex items-center gap-1"
            >
              <span>Phòng kiểm tra</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Bộ lọc Lịch kiểm tra */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              data-testid="filter-exams-all"
              onClick={() => setExamFilter('ALL')}
              className={`flex-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                examFilter === 'ALL'
                  ? 'bg-white text-violet-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả ({upcomingExams.length})
            </button>
            <button
              type="button"
              data-testid="filter-exams-upcoming"
              onClick={() => setExamFilter('upcoming')}
              className={`flex-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                examFilter === 'upcoming'
                  ? 'bg-white text-violet-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sắp thi / Chưa làm ({upcomingUnfinishedExamCount})
            </button>
            <button
              type="button"
              data-testid="filter-exams-completed"
              onClick={() => setExamFilter('completed')}
              className={`flex-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                examFilter === 'completed'
                  ? 'bg-white text-emerald-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Đã hoàn thành ({upcomingExams.length - upcomingUnfinishedExamCount})
            </button>
          </div>

          {loading ? (
            <div className="py-10 flex justify-center">
              <LoadingSpinner
                size="sm"
                message="Đang tải lịch kiểm tra sắp tới..."
              />
            </div>
          ) : filteredExams.length === 0 ? (
            <div className="py-10 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">
                Hiện chưa có lịch kiểm tra nào trong mục này
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Khi giáo viên phát hành đề kiểm tra mới cho lớp bạn, lịch thi sẽ
                hiển thị tại đây.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredExams.map((exam) => (
                <div
                  key={exam._id}
                  data-testid={`upcoming-exam-item-${exam._id}`}
                  className="p-4 rounded-xl border border-slate-200 hover:border-violet-300 bg-slate-50/50 transition-all space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-violet-100 text-violet-800">
                      {exam.subjectName}
                    </span>
                    <span
                      data-testid={`exam-status-badge-${exam._id}`}
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        exam.isCompleted
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}
                    >
                      {exam.isCompleted
                        ? exam.attemptScore !== null &&
                          exam.attemptScore !== undefined
                          ? `Đã hoàn thành • ${exam.attemptScore}/10`
                          : 'Đã hoàn thành'
                        : 'Sắp tới • Chưa làm bài'}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-slate-900">
                    {exam.title}
                  </h3>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/70">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-violet-500" />
                        <strong>{exam.duration} phút</strong>
                      </span>
                      <span>•</span>
                      <span>{exam.totalQuestions} câu hỏi</span>
                    </div>

                    <Link
                      to={
                        exam.isCompleted
                          ? `/student/exams/${exam._id}/result`
                          : `/student/exams/${exam._id}/take`
                      }
                      className={`inline-flex items-center gap-1 font-bold ${
                        exam.isCompleted
                          ? 'text-emerald-700 hover:text-emerald-800'
                          : 'text-violet-700 hover:text-violet-900'
                      }`}
                    >
                      <PlayCircle className="w-3.5 h-3.5" />
                      <span>{exam.isCompleted ? 'Xem kết quả' : 'Vào thi'}</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default StudentDashboard
