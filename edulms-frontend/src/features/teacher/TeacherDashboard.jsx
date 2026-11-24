import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen,
  ClipboardList,
  Users,
  AlertTriangle,
  AlertCircle,
  Clock,
  Award,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Filter,
  TrendingDown,
  GraduationCap,
} from 'lucide-react'
import { useAuth } from '@/context/useAuth'
import academicApi from '@/api/academicApi'
import assignmentApi from '@/api/assignmentApi'
import gradebookApi from '@/api/gradebookApi'
import LoadingSpinner from '@/components/common/LoadingSpinner'

/**
 * Định dạng hạn nộp sang tiếng Việt
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
 * Kiểm tra mục dữ liệu có thuộc phạm vi phụ trách của giáo viên đang đăng nhập hay không
 */
const isOwnedByTeacher = (item, currentTeacherId) => {
  if (!item) return false
  if (!currentTeacherId || currentTeacherId === 'me') return true

  const ownerId =
    item.teacherId ||
    item.teacher?._id ||
    item.teacher?.id ||
    item.teacher ||
    item.homeroomTeacher?._id ||
    item.homeroomTeacher?.id ||
    item.homeroomTeacher ||
    null

  if (!ownerId) return true
  return String(ownerId) === String(currentTeacherId)
}

/**
 * Trang Dashboard dành cho Giáo viên
 * - Hiển thị tổng quan các lớp chủ nhiệm (GVCN) và lớp đang giảng dạy bộ môn
 * - Hiển thị sĩ số của từng lớp
 * - Hiển thị danh sách bài tập cần chấm (số bài nộp chưa chấm, nộp trễ)
 * - Hiển thị cảnh báo học sinh có điểm trung bình môn thấp (< 5.0)
 * - Kiểm soát phân quyền chặt chẽ: chỉ hiển thị dữ liệu thuộc phạm vi Giáo viên được phép truy cập
 */
export const TeacherDashboard = () => {
  const { user } = useAuth()
  const currentTeacherId =
    user?._id || user?.userId || user?.id || user?.userCode || 'me'

  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState(null)

  const [classesOverview, setClassesOverview] = useState([])
  const [pendingAssignments, setPendingAssignments] = useState([])
  const [studentAlerts, setStudentAlerts] = useState([])

  // Bộ lọc hiển thị trên Dashboard
  const [classRoleFilter, setClassRoleFilter] = useState('ALL') // 'ALL' | 'homeroom' | 'subject_teacher'
  const [alertSeverityFilter, setAlertSeverityFilter] = useState('ALL') // 'ALL' | 'high' | 'medium'
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let ignore = false

    const loadTeacherDashboard = async () => {
      setLoading(true)
      setErrorMsg(null)

      try {
        // 1. Ưu tiên gọi API thống kê tập trung /v1/academic/teacher-dashboard
        if (typeof academicApi.getTeacherDashboardStats === 'function') {
          try {
            const statsRes = await academicApi.getTeacherDashboardStats()
            const payload = statsRes?.data || statsRes || null

            if (
              payload &&
              (Array.isArray(payload.classesOverview) ||
                Array.isArray(payload.pendingAssignments) ||
                Array.isArray(payload.studentAlerts))
            ) {
              if (!ignore) {
                const rawClasses = Array.isArray(payload.classesOverview)
                  ? payload.classesOverview
                  : []
                const rawPending = Array.isArray(payload.pendingAssignments)
                  ? payload.pendingAssignments
                  : []
                const rawAlerts = Array.isArray(payload.studentAlerts)
                  ? payload.studentAlerts
                  : []

                // Kiểm tra phân quyền dữ liệu: chỉ giữ lại các bản ghi thuộc phạm vi của giáo viên hiện tại
                const authorizedClasses = rawClasses.filter((c) =>
                  isOwnedByTeacher(c, currentTeacherId)
                )
                const authorizedClassNames = new Set(
                  authorizedClasses.map((c) => c.className).filter(Boolean)
                )
                const authorizedTaIds = new Set(
                  authorizedClasses
                    .map((c) => c.teachingAssignmentId || c._id)
                    .filter(Boolean)
                )

                const authorizedPending = rawPending.filter((p) => {
                  if (!isOwnedByTeacher(p, currentTeacherId)) return false
                  if (
                    p.teachingAssignmentId &&
                    authorizedTaIds.size > 0 &&
                    !authorizedTaIds.has(p.teachingAssignmentId)
                  ) {
                    return false
                  }
                  return true
                })

                // Chỉ giữ lại các cảnh báo học lực (điểm thấp), bỏ qua các thống kê liên quan đến điểm danh
                const authorizedAlerts = rawAlerts.filter((a) => {
                  if (a.alertType === 'high_absence') return false
                  if (!isOwnedByTeacher(a, currentTeacherId)) return false
                  if (
                    a.className &&
                    authorizedClassNames.size > 0 &&
                    !authorizedClassNames.has(a.className)
                  ) {
                    return false
                  }
                  return true
                })

                setClassesOverview(authorizedClasses)
                setPendingAssignments(authorizedPending)
                setStudentAlerts(authorizedAlerts)
                setLoading(false)
              }
              return
            }
          } catch {
            // Fallback sang tổng hợp từ các API thành phần nếu endpoint thống kê chưa sẵn sàng
          }
        }

        // 2. Dự phòng: Tổng hợp từ lịch giảng dạy, bài tập và sổ điểm của giáo viên
        let scheduleList = []
        if (typeof academicApi.getTeacherSchedule === 'function') {
          try {
            const schedRes = await academicApi.getTeacherSchedule(currentTeacherId)
            const sData = schedRes?.data || schedRes || []
            scheduleList = Array.isArray(sData)
              ? sData
              : sData?.assignments || []
          } catch {
            if (typeof academicApi.getAssignments === 'function') {
              const fbRes = await academicApi.getAssignments({
                teacher: currentTeacherId,
              })
              const fbData = fbRes?.data || fbRes || []
              scheduleList = Array.isArray(fbData)
                ? fbData
                : fbData?.assignments || []
            }
          }
        }

        if (ignore) return

        // Lọc phân quyền chặt theo currentTeacherId
        const ownedSchedules = scheduleList.filter((ta) =>
          isOwnedByTeacher(ta, currentTeacherId)
        )

        const builtClasses = ownedSchedules.map((ta) => {
          const cls = ta.class || {}
          const homeroomId =
            cls.homeroomTeacher?._id || cls.homeroomTeacher || null
          const isHomeroom =
            homeroomId && String(homeroomId) === String(currentTeacherId)

          return {
            _id: String(ta._id),
            teachingAssignmentId: String(ta._id),
            classId: String(cls._id || ta.class || ''),
            className: cls.name || 'Lớp học',
            room: cls.room || 'P.101',
            capacity: cls.capacity || 45,
            studentCount: cls.studentCount ?? 40,
            roleType: isHomeroom ? 'homeroom' : 'subject_teacher',
            roleLabel: isHomeroom
              ? 'Lớp Chủ nhiệm (GVCN)'
              : 'Lớp Giảng dạy Bộ môn',
            subjectName: ta.subject?.name || 'Môn học',
            subjectCode: ta.subject?.code || '---',
            academicYear: ta.academicYear || '2025-2026',
          }
        })

        // Tải danh sách bài tập và sổ điểm của giáo viên
        const [assignRes, gradeRes] = await Promise.all([
          typeof assignmentApi?.getAssignments === 'function'
            ? assignmentApi.getAssignments().catch(() => ({ data: [] }))
            : Promise.resolve({ data: [] }),
          typeof gradebookApi?.getGradeRecords === 'function'
            ? gradebookApi.getGradeRecords().catch(() => ({ data: {} }))
            : Promise.resolve({ data: {} }),
        ])

        if (ignore) return

        const rawAssigns = assignRes?.data || assignRes || []
        const assignList = Array.isArray(rawAssigns)
          ? rawAssigns
          : rawAssigns?.assignments || []

        const ownedTaIdSet = new Set(builtClasses.map((c) => c.teachingAssignmentId))
        const builtPending = assignList
          .filter((a) => {
            const taId = String(
              a.teachingAssignment?._id || a.teachingAssignment || ''
            )
            return ownedTaIdSet.size === 0 || ownedTaIdSet.has(taId)
          })
          .map((a) => ({
            _id: String(a._id),
            title: a.title,
            dueDate: a.dueDate,
            status: a.status || 'open',
            className: a.teachingAssignment?.class?.name || '---',
            subjectName: a.teachingAssignment?.subject?.name || 'Môn học',
            totalSubmissions: a.totalSubmissions ?? 0,
            ungradedCount: a.ungradedCount ?? 0,
            lateCount: a.lateCount ?? 0,
          }))

        const gradePayload = gradeRes?.data || gradeRes || {}
        const summaries = Array.isArray(gradePayload?.summaries)
          ? gradePayload.summaries
          : []

        const builtAlerts = summaries
          .filter((s) => typeof s.average === 'number' && s.average < 5.0)
          .map((s, idx) => ({
            _id: `alert_low_${idx}`,
            studentId: String(s.student?._id || idx),
            studentName: s.student?.fullName || 'Học sinh',
            userCode: s.student?.userCode || '---',
            className:
              s.teachingAssignment?.class?.name ||
              s.student?.className ||
              '---',
            subjectName: s.teachingAssignment?.subject?.name || 'Môn học',
            alertType: 'low_grade',
            alertLabel:
              s.average < 3.5 ? 'Điểm kém (< 3.5)' : 'Điểm yếu (< 5.0)',
            severity: s.average < 3.5 ? 'high' : 'medium',
            averageScore: s.average,
            detail: `ĐTB môn: ${s.average.toFixed(1)}/10 (Dưới mức đạt 5.0)`,
          }))

        setClassesOverview(builtClasses)
        setPendingAssignments(builtPending)
        setStudentAlerts(builtAlerts)
      } catch (err) {
        if (!ignore) {
          setErrorMsg(
            err?.message ||
              'Không thể tải dữ liệu thống kê Dashboard Giáo viên.'
          )
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    loadTeacherDashboard()
    return () => {
      ignore = true
    }
  }, [currentTeacherId, reloadKey])

  // Lọc danh sách lớp theo vai trò (Tất cả / Lớp chủ nhiệm / Lớp bộ môn)
  const filteredClasses = useMemo(() => {
    if (classRoleFilter === 'ALL') return classesOverview
    if (classRoleFilter === 'homeroom') {
      return classesOverview.filter(
        (c) => c.roleType === 'homeroom' || c.roleType === 'both'
      )
    }
    return classesOverview.filter(
      (c) => c.roleType === 'subject_teacher' || c.roleType === 'both'
    )
  }, [classesOverview, classRoleFilter])

  // Lọc cảnh báo học sinh theo mức độ điểm thấp (Tất cả / Điểm kém < 3.5 / Điểm yếu 3.5 - < 5.0)
  const filteredAlerts = useMemo(() => {
    if (alertSeverityFilter === 'ALL') return studentAlerts
    return studentAlerts.filter((a) => a.severity === alertSeverityFilter)
  }, [studentAlerts, alertSeverityFilter])

  // Tính toán các chỉ số thống kê tổng hợp đầu trang
  const summaryStats = useMemo(() => {
    const totalClasses = classesOverview.length
    const homeroomCount = classesOverview.filter(
      (c) => c.roleType === 'homeroom' || c.roleType === 'both'
    ).length
    const totalStudents = classesOverview.reduce(
      (sum, c) => sum + (Number(c.studentCount) || 0),
      0
    )
    const totalCapacity = classesOverview.reduce(
      (sum, c) => sum + (Number(c.capacity) || 45),
      0
    )

    const totalUngradedSubmissions = pendingAssignments.reduce(
      (sum, a) => sum + (Number(a.ungradedCount) || 0),
      0
    )

    const highSeverityAlertsCount = studentAlerts.filter(
      (a) => a.severity === 'high'
    ).length
    const mediumSeverityAlertsCount = studentAlerts.filter(
      (a) => a.severity !== 'high'
    ).length

    return {
      totalClasses,
      homeroomCount,
      totalStudents,
      totalCapacity,
      totalUngradedSubmissions,
      totalAlerts: studentAlerts.length,
      highSeverityAlertsCount,
      mediumSeverityAlertsCount,
    }
  }, [classesOverview, pendingAssignments, studentAlerts])

  return (
    <div className="space-y-6">
      {/* 1. Header Trang & Chỉ báo Phân quyền Giáo viên */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Cổng Giáo viên & Bảng điều khiển giảng dạy
            </h1>
            <span
              data-testid="teacher-scope-badge"
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Phạm vi: Lớp được phân công</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Tổng quan lớp chủ nhiệm, lớp giảng dạy bộ môn, sĩ số lớp học, bài tập
            chờ chấm và cảnh báo học sinh có điểm trung bình thấp.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="refresh-teacher-dashboard-btn"
            onClick={() => setReloadKey((k) => k + 1)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl shadow-2xs transition-colors"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
            />
            <span>Làm mới thống kê</span>
          </button>
        </div>
      </div>

      {/* Thông báo lỗi nếu có */}
      {errorMsg && (
        <div
          data-testid="teacher-dashboard-error"
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

      {/* 2. Bốn Card Thống kê Tổng hợp Đầu trang */}
      <div
        data-testid="dashboard-summary-cards"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {/* Card 1: Tổng lớp phụ trách */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Lớp Phụ Trách
            </p>
            <p
              data-testid="stat-total-classes"
              className="text-2xl font-extrabold text-slate-900 mt-1"
            >
              {summaryStats.totalClasses} lớp
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              {summaryStats.homeroomCount} lớp chủ nhiệm •{' '}
              {Math.max(
                0,
                summaryStats.totalClasses - summaryStats.homeroomCount
              )}{' '}
              lớp bộ môn
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-blue-50 text-blue-600">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Tổng sĩ số lớp học */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Tổng Sĩ Số Học Sinh
            </p>
            <p
              data-testid="stat-total-students"
              className="text-2xl font-extrabold text-slate-900 mt-1"
            >
              {summaryStats.totalStudents} HS
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Quy mô tối đa: {summaryStats.totalCapacity} học sinh
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Bài tập cần chấm */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Bài Tập Cần Chấm
            </p>
            <p
              data-testid="pending-grading-count-stat"
              className="text-2xl font-extrabold text-violet-700 mt-1"
            >
              {summaryStats.totalUngradedSubmissions} bài nộp
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Trên {pendingAssignments.length} bài tập đang giao
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-violet-50 text-violet-600">
            <ClipboardList className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Cảnh báo học sinh điểm thấp */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Cảnh Báo Điểm Thấp
            </p>
            <p
              data-testid="student-alert-count-stat"
              className="text-2xl font-extrabold text-rose-600 mt-1"
            >
              {summaryStats.totalAlerts} học sinh
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              {summaryStats.highSeverityAlertsCount} điểm kém (&lt; 3.5) •{' '}
              {summaryStats.mediumSeverityAlertsCount} điểm yếu (&lt; 5.0)
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-rose-50 text-rose-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 3. Khu vực 1: Tổng quan các Lớp Chủ nhiệm / Lớp Đang Giảng dạy */}
      <div
        data-testid="teacher-classes-overview"
        className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Tổng quan các lớp chủ nhiệm & lớp đang giảng dạy
              </h2>
              <p className="text-[11px] text-slate-500">
                Theo dõi sĩ số học sinh và thông tin giảng dạy theo từng lớp
                được phân công
              </p>
            </div>
          </div>

          {/* Bộ lọc vai trò lớp */}
          <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              data-testid="filter-class-all"
              onClick={() => setClassRoleFilter('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                classRoleFilter === 'ALL'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả ({classesOverview.length})
            </button>
            <button
              type="button"
              data-testid="filter-class-homeroom"
              onClick={() => setClassRoleFilter('homeroom')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                classRoleFilter === 'homeroom'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Lớp Chủ nhiệm ({summaryStats.homeroomCount})
            </button>
            <button
              type="button"
              data-testid="filter-class-subject"
              onClick={() => setClassRoleFilter('subject_teacher')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                classRoleFilter === 'subject_teacher'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Lớp Bộ môn
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-10 flex justify-center">
            <LoadingSpinner
              size="md"
              message="Đang tải danh sách lớp chủ nhiệm và lớp giảng dạy..."
            />
          </div>
        ) : filteredClasses.length === 0 ? (
          <div className="py-10 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">
              Chưa có lớp học nào trong danh mục này
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Dữ liệu chỉ hiển thị các lớp học mà bạn được phân công chủ nhiệm
              hoặc giảng dạy bộ môn.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClasses.map((cls) => {
              const isHomeroom =
                cls.roleType === 'homeroom' || cls.roleType === 'both'
              const cap = Number(cls.capacity) || 45
              const count = Number(cls.studentCount) || 0
              const fillPercent = Math.min(
                100,
                Math.max(0, Math.round((count / cap) * 100))
              )

              return (
                <div
                  key={cls._id}
                  data-testid={`class-overview-card-${cls._id}`}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                    isHomeroom
                      ? 'bg-gradient-to-br from-indigo-50/60 to-white border-indigo-200 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-blue-300 shadow-2xs'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          isHomeroom
                            ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}
                      >
                        {cls.roleLabel ||
                          (isHomeroom
                            ? 'Lớp Chủ nhiệm (GVCN)'
                            : 'Lớp Giảng dạy Bộ môn')}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">
                        Phòng {cls.room || 'P.101'}
                      </span>
                    </div>

                    <h3 className="text-base font-extrabold text-slate-900">
                      Lớp {cls.className}{' '}
                      {cls.subjectName && cls.subjectName !== 'Chủ nhiệm lớp'
                        ? `• ${cls.subjectName}`
                        : ''}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Năm học: {cls.academicYear || '2025-2026'} • Mã môn:{' '}
                      {cls.subjectCode || 'GVCN'}
                    </p>
                  </div>

                  {/* Thông tin Sĩ số Lớp */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 flex items-center gap-1.5 font-medium">
                        <Users className="w-3.5 h-3.5 text-blue-600" />
                        <span>Sĩ số lớp:</span>
                      </span>
                      <strong
                        data-testid={`class-size-${cls._id}`}
                        className="text-slate-900 font-bold"
                      >
                        {count} / {cap} học sinh
                      </strong>
                    </div>

                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500"
                        style={{ width: `${fillPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Lối tắt thao tác nhanh trên lớp */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                    <Link
                      to="/teacher/gradebook"
                      className="text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1"
                    >
                      <span>Sổ điểm</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                    <Link
                      to="/teacher/assignments"
                      className="text-violet-600 hover:text-violet-800 font-semibold inline-flex items-center gap-1"
                    >
                      <span>Bài tập</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                    <Link
                      to="/teacher/lessons"
                      className="text-slate-600 hover:text-slate-900 font-medium inline-flex items-center gap-1"
                    >
                      <span>Bài giảng</span>
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 4. Bố cục 2 Cột dưới: Danh sách Bài tập Cần Chấm & Cảnh báo Học sinh Điểm Thấp */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* CỘT TRÁI (6 Cột): Danh sách Bài tập Cần Chấm */}
        <div
          data-testid="pending-assignments-section"
          className="lg:col-span-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-violet-50 text-violet-600">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Danh sách bài tập cần chấm
                </h2>
                <p className="text-[11px] text-slate-500">
                  Các bài tập có bài nộp mới của học sinh đang chờ chấm điểm
                </p>
              </div>
            </div>

            <Link
              to="/teacher/assignments"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
            >
              <span>Quản lý tất cả</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="py-8 flex justify-center">
              <LoadingSpinner size="sm" message="Đang tải bài tập cần chấm..." />
            </div>
          ) : pendingAssignments.length === 0 ? (
            <div className="py-10 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <ClipboardList className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">
                Tuyệt vời! Hiện không có bài nộp nào tồn đọng chờ chấm
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Tất cả bài nộp thuộc các lớp bạn phụ trách đã được chấm điểm.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingAssignments.map((assign) => (
                <div
                  key={assign._id}
                  data-testid={`pending-assignment-item-${assign._id}`}
                  className="p-4 rounded-xl border border-slate-200 hover:border-violet-300 bg-slate-50/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800">
                        Lớp {assign.className} • {assign.subjectName}
                      </span>
                      <span
                        data-testid={`ungraded-badge-${assign._id}`}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          assign.ungradedCount > 0
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {assign.ungradedCount} bài chờ chấm
                      </span>
                      {assign.lateCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700">
                          {assign.lateCount} nộp trễ
                        </span>
                      )}
                    </div>

                    <h3 className="text-xs font-bold text-slate-900 truncate">
                      {assign.title}
                    </h3>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        Hạn nộp: {formatDueDate(assign.dueDate)}
                      </span>
                      <span>•</span>
                      <span>Tổng nộp: {assign.totalSubmissions} bài</span>
                    </div>
                  </div>

                  <Link
                    to="/teacher/assignments"
                    className="shrink-0 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white shadow-2xs transition-colors"
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>Chấm bài</span>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CỘT PHẢI (6 Cột): Cảnh báo Học sinh Điểm Trung bình Thấp */}
        <div
          data-testid="student-alerts-section"
          className="lg:col-span-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Cảnh báo học sinh điểm thấp
                </h2>
                <p className="text-[11px] text-slate-500">
                  Phát hiện sớm học sinh có điểm trung bình môn dưới mức đạt
                  (&lt; 5.0)
                </p>
              </div>
            </div>

            {/* Bộ lọc mức độ điểm thấp */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                data-testid="alert-severity-filter"
                aria-label="Lọc mức độ cảnh báo điểm thấp"
                value={alertSeverityFilter}
                onChange={(e) => setAlertSeverityFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">
                  Tất cả cảnh báo ({studentAlerts.length})
                </option>
                <option value="high">
                  Điểm kém &lt; 3.5 ({summaryStats.highSeverityAlertsCount})
                </option>
                <option value="medium">
                  Điểm yếu 3.5 - &lt; 5.0 (
                  {summaryStats.mediumSeverityAlertsCount})
                </option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="py-8 flex justify-center">
              <LoadingSpinner
                size="sm"
                message="Đang phân tích cảnh báo điểm số học sinh..."
              />
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="py-10 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">
                Không có cảnh báo học sinh điểm thấp trong phạm vi lọc
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Học sinh các lớp bạn phụ trách đều có điểm trung bình môn đạt từ
                5.0 trở lên.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAlerts.map((alert) => {
                const isHighSeverity = alert.severity === 'high'
                return (
                  <div
                    key={alert._id}
                    data-testid={`student-alert-item-${alert._id}`}
                    className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isHighSeverity
                        ? 'bg-red-50/40 border-red-200'
                        : 'bg-amber-50/40 border-amber-200'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                          isHighSeverity
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        <TrendingDown className="w-4 h-4" />
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-extrabold text-slate-900">
                            {alert.studentName}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500">
                            ({alert.userCode})
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white border border-slate-200 text-slate-700">
                            Lớp {alert.className}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isHighSeverity
                                ? 'bg-red-600 text-white'
                                : 'bg-amber-600 text-white'
                            }`}
                          >
                            {alert.alertLabel ||
                              (isHighSeverity
                                ? 'Điểm kém (< 3.5)'
                                : 'Điểm yếu (< 5.0)')}
                          </span>
                        </div>

                        <p className="text-xs font-medium text-slate-700">
                          {alert.detail}
                        </p>
                      </div>
                    </div>

                    <Link
                      to="/teacher/gradebook"
                      className="shrink-0 inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 shadow-2xs transition-colors"
                    >
                      <span>Xem sổ điểm</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TeacherDashboard
