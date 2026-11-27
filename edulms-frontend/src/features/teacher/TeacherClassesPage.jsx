import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  GraduationCap,
  BookOpen,
  Search,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  Mail,
  Building2,
  ArrowRight,
  Award,
} from 'lucide-react'
import { useAuth } from '@/context/useAuth'
import academicApi from '@/api/academicApi'
import LoadingSpinner from '@/components/common/LoadingSpinner'

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
 * Trang "Lớp của tôi" dành cho Giáo viên (/teacher/classes)
 * - Hiển thị danh sách Lớp chủ nhiệm (GVCN) và Lớp giảng dạy bộ môn của Giáo viên
 * - Xem danh sách học sinh chi tiết theo từng lớp được phân công (Mã HS, Họ tên, Email, Trạng thái)
 * - Bộ lọc theo vai trò lớp (Tất cả / Lớp chủ nhiệm / Lớp bộ môn) và tìm kiếm học sinh
 * - Lối tắt đi tới Sổ điểm, Bài tập và Bài giảng của lớp
 */
export const TeacherClassesPage = () => {
  const { user } = useAuth()
  const currentTeacherId =
    user?._id || user?.userId || user?.id || user?.userCode || 'me'

  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState(null)
  const [classesOverview, setClassesOverview] = useState([])
  const [roleFilter, setRoleFilter] = useState('ALL') // 'ALL' | 'homeroom' | 'subject_teacher'
  const [selectedCardId, setSelectedCardId] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  // Danh sách học sinh của lớp đang chọn
  const [students, setStudents] = useState([])
  const [classDetail, setClassDetail] = useState(null)
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [studentSearch, setStudentSearch] = useState('')

  useEffect(() => {
    let ignore = false

    const loadMyClasses = async () => {
      setLoading(true)
      setErrorMsg(null)

      try {
        let fetchedCards = []

        // 1. Ưu tiên lấy từ API thống kê teacher-dashboard (bao gồm cả lớp chủ nhiệm & lớp giảng dạy bộ môn)
        if (typeof academicApi.getTeacherDashboardStats === 'function') {
          try {
            const statsRes = await academicApi.getTeacherDashboardStats()
            const payload = statsRes?.data || statsRes || null
            if (payload && Array.isArray(payload.classesOverview)) {
              fetchedCards = payload.classesOverview.filter((c) =>
                isOwnedByTeacher(c, currentTeacherId)
              )
            }
          } catch {
            // Fallback sang getTeacherSchedule / getClasses bên dưới
          }
        }

        // 2. Fallback: Kết hợp lịch phân công giảng dạy và danh sách lớp chủ nhiệm
        if (fetchedCards.length === 0) {
          const [schedRes, classesRes] = await Promise.all([
            typeof academicApi.getTeacherSchedule === 'function'
              ? academicApi
                  .getTeacherSchedule(currentTeacherId)
                  .catch(() => ({ data: [] }))
              : Promise.resolve({ data: [] }),
            typeof academicApi.getClasses === 'function'
              ? academicApi.getClasses().catch(() => ({ data: [] }))
              : Promise.resolve({ data: [] }),
          ])

          const rawSched = schedRes?.data || schedRes || []
          const scheduleList = Array.isArray(rawSched)
            ? rawSched
            : rawSched?.assignments || []

          const rawClasses = classesRes?.data || classesRes || []
          const classList = Array.isArray(rawClasses) ? rawClasses : []

          // Lớp chủ nhiệm
          const homeroomClasses = classList.filter((cls) => {
            const hrId = cls.homeroomTeacher?._id || cls.homeroomTeacher || null
            return hrId && String(hrId) === String(currentTeacherId)
          })

          homeroomClasses.forEach((cls) => {
            fetchedCards.push({
              _id: `homeroom_${cls._id}`,
              classId: String(cls._id),
              className: cls.name || 'Lớp học',
              room: cls.room || 'P.101',
              capacity: cls.capacity || 45,
              studentCount: cls.currentStudents ?? cls.studentCount ?? 0,
              roleType: 'homeroom',
              roleLabel: 'Lớp Chủ nhiệm (GVCN)',
              subjectName: 'Chủ nhiệm lớp',
              subjectCode: 'GVCN',
              academicYear: cls.academicYear || '2025-2026',
            })
          })

          // Lớp giảng dạy bộ môn
          scheduleList
            .filter((ta) => isOwnedByTeacher(ta, currentTeacherId))
            .forEach((ta) => {
              const cls = ta.class || {}
              const cId = String(cls._id || ta.class || '')
              const isAlsoHomeroom = homeroomClasses.some(
                (h) => String(h._id) === cId
              )

              fetchedCards.push({
                _id: String(ta._id),
                teachingAssignmentId: String(ta._id),
                classId: cId,
                className: cls.name || 'Lớp học',
                room: cls.room || 'P.101',
                capacity: cls.capacity || 45,
                studentCount: cls.currentStudents ?? cls.studentCount ?? 0,
                roleType: isAlsoHomeroom ? 'both' : 'subject_teacher',
                roleLabel: isAlsoHomeroom
                  ? 'GVCN & Giảng dạy'
                  : 'Lớp Giảng dạy Bộ môn',
                subjectName: ta.subject?.name || 'Môn học',
                subjectCode: ta.subject?.code || '---',
                academicYear: ta.academicYear || '2025-2026',
                semester: ta.semester || 'HK1',
              })
            })
        }

        if (!ignore) {
          setClassesOverview(fetchedCards)
          if (fetchedCards.length > 0) {
            setSelectedCardId((prev) => {
              const exists = fetchedCards.some((c) => c._id === prev)
              return exists ? prev : fetchedCards[0]._id
            })
          } else {
            setSelectedCardId('')
          }
        }
      } catch (err) {
        if (!ignore) {
          setErrorMsg(
            err?.message ||
              'Không thể tải danh sách lớp phụ trách của giáo viên.'
          )
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    loadMyClasses()
    return () => {
      ignore = true
    }
  }, [currentTeacherId, reloadKey])

  // Lọc danh sách lớp theo vai trò
  const filteredClasses = useMemo(() => {
    if (roleFilter === 'ALL') return classesOverview
    if (roleFilter === 'homeroom') {
      return classesOverview.filter(
        (c) => c.roleType === 'homeroom' || c.roleType === 'both'
      )
    }
    return classesOverview.filter(
      (c) => c.roleType === 'subject_teacher' || c.roleType === 'both'
    )
  }, [classesOverview, roleFilter])

  // Card lớp đang được chọn
  const selectedClassCard = useMemo(() => {
    return (
      filteredClasses.find((c) => c._id === selectedCardId) ||
      classesOverview.find((c) => c._id === selectedCardId) ||
      filteredClasses[0] ||
      null
    )
  }, [filteredClasses, classesOverview, selectedCardId])

  const activeClassId = selectedClassCard?.classId || ''

  // Tải danh sách học sinh khi chọn lớp
  useEffect(() => {
    if (!activeClassId) {
      return
    }
    let ignore = false

    const loadClassStudents = async () => {
      setLoadingStudents(true)
      try {
        if (typeof academicApi.getStudentsByClass === 'function') {
          const res = await academicApi.getStudentsByClass(activeClassId)
          const payload = res?.data || res || {}
          if (!ignore) {
            const studentList = Array.isArray(payload.students)
              ? payload.students
              : Array.isArray(payload)
              ? payload
              : []
            setStudents(studentList)
            setClassDetail(payload.class || null)
          }
        }
      } catch {
        if (!ignore) {
          setStudents([])
          setClassDetail(null)
        }
      } finally {
        if (!ignore) {
          setLoadingStudents(false)
        }
      }
    }

    loadClassStudents()
    return () => {
      ignore = true
    }
  }, [activeClassId, reloadKey])

  // Lọc học sinh theo từ khóa tìm kiếm
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return students
    const kw = studentSearch.toLowerCase().trim()
    return students.filter(
      (st) =>
        (st.fullName && st.fullName.toLowerCase().includes(kw)) ||
        (st.userCode && st.userCode.toLowerCase().includes(kw)) ||
        (st.email && st.email.toLowerCase().includes(kw))
    )
  }, [students, studentSearch])

  const summaryStats = useMemo(() => {
    const totalClasses = classesOverview.length
    const homeroomCount = classesOverview.filter(
      (c) => c.roleType === 'homeroom' || c.roleType === 'both'
    ).length
    const subjectCount = classesOverview.filter(
      (c) => c.roleType === 'subject_teacher' || c.roleType === 'both'
    ).length
    return {
      totalClasses,
      homeroomCount,
      subjectCount,
    }
  }, [classesOverview])

  return (
    <div className="space-y-6">
      {/* Header Trang */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Users className="w-7 h-7 text-blue-600" />
              <span>Lớp của tôi</span>
            </h1>
            <span
              data-testid="teacher-classes-scope-badge"
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Lớp chủ nhiệm & Lớp giảng dạy</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý thông tin các lớp được phân công, tra cứu danh sách học sinh
            trong lớp và truy cập nhanh sổ điểm, bài tập, bài giảng.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="refresh-teacher-classes-btn"
            onClick={() => setReloadKey((k) => k + 1)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl shadow-2xs transition-colors"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
            />
            <span>Làm mới danh sách</span>
          </button>
        </div>
      </div>

      {/* Thông báo lỗi nếu có */}
      {errorMsg && (
        <div
          data-testid="teacher-classes-error"
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

      {/* Bộ lọc Vai trò Lớp & Danh sách Lớp phụ trách */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Danh sách lớp học được phân công ({filteredClasses.length})
              </h2>
              <p className="text-[11px] text-slate-500">
                Chọn một lớp học bên dưới để xem danh sách học sinh chi tiết
              </p>
            </div>
          </div>

          <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              data-testid="my-classes-filter-all"
              onClick={() => setRoleFilter('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                roleFilter === 'ALL'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả ({summaryStats.totalClasses})
            </button>
            <button
              type="button"
              data-testid="my-classes-filter-homeroom"
              onClick={() => setRoleFilter('homeroom')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                roleFilter === 'homeroom'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Lớp Chủ nhiệm ({summaryStats.homeroomCount})
            </button>
            <button
              type="button"
              data-testid="my-classes-filter-subject"
              onClick={() => setRoleFilter('subject_teacher')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                roleFilter === 'subject_teacher'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Lớp Bộ môn ({summaryStats.subjectCount})
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-10 flex justify-center">
            <LoadingSpinner
              size="md"
              message="Đang tải danh sách lớp của giáo viên..."
            />
          </div>
        ) : filteredClasses.length === 0 ? (
          <div
            data-testid="teacher-classes-empty"
            className="py-10 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200"
          >
            <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">
              Chưa có lớp học nào được phân công trong danh mục này
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Vui lòng liên hệ Quản trị viên để được phân công chủ nhiệm hoặc
              giảng dạy bộ môn.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClasses.map((cls) => {
              const isSelected = selectedClassCard?._id === cls._id
              const isHomeroom =
                cls.roleType === 'homeroom' || cls.roleType === 'both'
              const cap = Number(cls.capacity) || 45
              const count = Number(cls.studentCount) || 0

              return (
                <div
                  key={cls._id}
                  data-testid={`my-class-card-${cls._id}`}
                  onClick={() => {
                    setSelectedCardId(cls._id)
                    setStudentSearch('')
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setSelectedCardId(cls._id)
                      setStudentSearch('')
                    }
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                    isSelected
                      ? 'bg-blue-50/60 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                      : isHomeroom
                      ? 'bg-gradient-to-br from-indigo-50/50 to-white border-indigo-200 hover:border-indigo-300'
                      : 'bg-white border-slate-200 hover:border-blue-300'
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

                  <div className="bg-white/90 p-3 rounded-xl border border-slate-100 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 flex items-center gap-1.5 font-medium">
                        <Users className="w-3.5 h-3.5 text-blue-600" />
                        <span>Sĩ số:</span>
                      </span>
                      <strong className="text-slate-900 font-bold">
                        {count} / {cap} học sinh
                      </strong>
                    </div>

                    {typeof (cls.classAverage ?? cls.averageScore) ===
                      'number' && (
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                        <span className="text-slate-600 flex items-center gap-1.5 font-medium">
                          <Award className="w-3.5 h-3.5 text-amber-500" />
                          <span>ĐTB lớp:</span>
                        </span>
                        <strong className="text-blue-700 font-extrabold">
                          {Number(cls.classAverage ?? cls.averageScore).toFixed(
                            1
                          )}{' '}
                          / 10
                        </strong>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                    <Link
                      to="/teacher/gradebook"
                      onClick={(e) => e.stopPropagation()}
                      className="text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1"
                    >
                      <span>Sổ điểm</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                    <Link
                      to="/teacher/assignments"
                      onClick={(e) => e.stopPropagation()}
                      className="text-violet-600 hover:text-violet-800 font-semibold inline-flex items-center gap-1"
                    >
                      <span>Bài tập</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                    <Link
                      to="/teacher/lessons"
                      onClick={(e) => e.stopPropagation()}
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

      {/* Bảng Danh sách Học sinh của Lớp đang chọn */}
      {selectedClassCard && (
        <div
          data-testid="selected-class-students-section"
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                {selectedClassCard.className}
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Danh sách học sinh Lớp {selectedClassCard.className}
                </h2>
                <p className="text-xs text-slate-500">
                  {selectedClassCard.roleLabel} • Phòng{' '}
                  {classDetail?.room || selectedClassCard.room || 'P.101'} •
                  Tổng số:{' '}
                  <strong className="text-slate-800">
                    {students.length || selectedClassCard.studentCount || 0} học
                    sinh
                  </strong>
                </p>
              </div>
            </div>

            {/* Ô tìm kiếm học sinh */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                data-testid="teacher-class-student-search"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Tìm theo mã HS, họ tên, email..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>
          </div>

          {loadingStudents ? (
            <div className="py-10 flex justify-center">
              <LoadingSpinner
                size="sm"
                message={`Đang tải danh sách học sinh lớp ${selectedClassCard.className}...`}
              />
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="py-10 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">
                {studentSearch.trim()
                  ? 'Không tìm thấy học sinh nào khớp với từ khóa tìm kiếm'
                  : 'Chưa có danh sách học sinh chi tiết cho lớp học này'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/70">
                    <th className="py-3 px-4 rounded-tl-xl">STT</th>
                    <th className="py-3 px-4">Mã học sinh</th>
                    <th className="py-3 px-4">Họ và tên</th>
                    <th className="py-3 px-4">Email liên hệ</th>
                    <th className="py-3 px-4 rounded-tr-xl text-right">
                      Trạng thái
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredStudents.map((st, idx) => (
                    <tr
                      key={st._id || st.userCode || idx}
                      data-testid={`class-student-row-${st.userCode || idx}`}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3 px-4 font-semibold text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-blue-700">
                        {st.userCode || '---'}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {st.fullName || 'Học sinh'}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <span className="inline-flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{st.email || '---'}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Đang theo học
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default TeacherClassesPage

