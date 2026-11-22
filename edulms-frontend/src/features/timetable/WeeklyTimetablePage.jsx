import { useState, useEffect, useMemo } from 'react'
import {
  Calendar as CalendarIcon,
  GraduationCap,
  Users,
  Clock,
  BookOpen,
  Printer,
  RefreshCw,
  AlertCircle,
  Filter,
} from 'lucide-react'
import { useAuth } from '@/context/useAuth'
import timetableApi from '@/api/timetableApi'
import academicApi from '@/api/academicApi'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import WeekNavigator from './components/WeekNavigator'
import TimetableGrid from './components/TimetableGrid'
import { getWeekRange, groupSlotsToGrid } from './timetableUtils'

export const WeeklyTimetablePage = () => {
  const { user } = useAuth()
  const role = user?.role || 'student'
  const isTeacher = role === 'teacher'
  const isStudent = role === 'student'
  const isAdmin = role === 'admin'

  // State quản lý ngày mốc của tuần
  const [currentDate, setCurrentDate] = useState(() => new Date())

  // State bộ lọc năm học và học kỳ
  const [academicYear, setAcademicYear] = useState('2025-2026')
  const [semester, setSemester] = useState('CaNam')

  // State danh sách và dữ liệu thời khóa biểu
  const [slots, setSlots] = useState([])
  const [metadata, setMetadata] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  // State dành cho Admin: chọn xem theo Lớp hoặc Giáo viên
  const [adminViewMode, setAdminViewMode] = useState('class') // 'class' | 'teacher'
  const [classesList, setClassesList] = useState([])
  const [teachersList, setTeachersList] = useState([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [selectedTeacherId, setSelectedTeacherId] = useState('')

  // Tính toán khoảng ngày trong tuần
  const weekInfo = useMemo(() => {
    return getWeekRange(currentDate)
  }, [currentDate])

  const isCurrentWeek = useMemo(() => {
    const today = new Date()
    return (
      today >= weekInfo.monday && today <= weekInfo.sunday
    )
  }, [weekInfo])

  // Lấy danh sách lớp và giáo viên nếu là Admin
  useEffect(() => {
    if (!isAdmin) return
    let ignore = false

    const fetchAdminDropdowns = async () => {
      try {
        const [clsRes, tchRes] = await Promise.all([
          academicApi.getClasses({ academicYear }),
          academicApi.getTeachers({ academicYear }),
        ])
        const clsData = clsRes.data?.data || clsRes.data || []
        const tchData = tchRes.data?.data || tchRes.data || []

        if (!ignore) {
          setClassesList(clsData)
          setTeachersList(tchData)

          setSelectedClassId((prev) => prev || (clsData.length > 0 ? clsData[0]._id : ''))
          setSelectedTeacherId((prev) => prev || (tchData.length > 0 ? tchData[0]._id : ''))
        }
      } catch (err) {
        if (!ignore) {
          console.error('Lỗi lấy danh sách Lớp/Giáo viên cho Admin:', err)
        }
      }
    }

    fetchAdminDropdowns()

    return () => {
      ignore = true
    }
  }, [isAdmin, academicYear])

  // Hàm tải dữ liệu thời khóa biểu
  useEffect(() => {
    let ignore = false

    const loadData = async () => {
      setLoading(true)
      setError(null)

      try {
        let res

        if (isStudent || isTeacher) {
          // Học sinh và Giáo viên gọi API my-schedule tự động nhận diện
          res = await timetableApi.getMySchedule({ academicYear, semester })
        } else if (isAdmin) {
          if (adminViewMode === 'class' && selectedClassId) {
            res = await timetableApi.getClassTimetable(selectedClassId, { academicYear, semester })
          } else if (adminViewMode === 'teacher' && selectedTeacherId) {
            res = await timetableApi.getTeacherTimetable(selectedTeacherId, { academicYear, semester })
          } else {
            res = await timetableApi.getTimetables({ academicYear, semester })
          }
        }

        if (!ignore) {
          const resData = res?.data?.data || res?.data || {}
          const fetchedSlots = resData.slots || resData.list || (Array.isArray(resData) ? resData : [])

          setSlots(fetchedSlots)
          setMetadata({
            class: resData.class || null,
            teacher: resData.teacher || null,
            totalSlots: resData.totalSlots !== undefined ? resData.totalSlots : fetchedSlots.length,
            message: resData.message || null,
          })
        }
      } catch (err) {
        if (!ignore) {
          console.error('Lỗi khi tải thời khóa biểu:', err)
          const msg = err.response?.data?.message || err.message || 'Không thể tải thời khóa biểu tuần!'
          setError(msg)
          setSlots([])
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      ignore = true
    }
  }, [isStudent, isTeacher, isAdmin, adminViewMode, selectedClassId, selectedTeacherId, academicYear, semester, reloadKey])

  // Gom nhóm slots thành ma trận lưới 7x10
  const grid = useMemo(() => {
    return groupSlotsToGrid(slots)
  }, [slots])

  // Thống kê nhanh
  const stats = useMemo(() => {
    const uniqueSubjects = new Set()
    let morningCount = 0
    let afternoonCount = 0

    slots.forEach((s) => {
      if (s.subject?.name || s.subject) {
        uniqueSubjects.add(s.subject?.name || s.subject)
      }
      if (s.period <= 5) morningCount++
      else afternoonCount++
    })

    return {
      total: slots.length,
      subjectCount: uniqueSubjects.size,
      morningCount,
      afternoonCount,
    }
  }, [slots])

  // Điều hướng tuần
  const handlePrevWeek = () => {
    setCurrentDate((prev) => {
      const next = new Date(prev)
      next.setDate(next.getDate() - 7)
      return next
    })
  }

  const handleNextWeek = () => {
    setCurrentDate((prev) => {
      const next = new Date(prev)
      next.setDate(next.getDate() + 7)
      return next
    })
  }

  const handleCurrentWeek = () => {
    setCurrentDate(new Date())
  }

  const handlePrint = () => {
    window.print()
  }

  // Tiêu đề trang động theo vai trò
  const pageTitle = useMemo(() => {
    if (isStudent) {
      const className = metadata?.class?.name || user?.className || 'của lớp'
      return `Thời khóa biểu lớp ${className}`
    }
    if (isTeacher) {
      const teacherName = metadata?.teacher?.fullName || user?.fullName || ''
      return `Lịch giảng dạy ${teacherName ? `- ${teacherName}` : ''}`
    }
    if (isAdmin) {
      if (adminViewMode === 'class') {
        const cls = classesList.find((c) => c._id === selectedClassId)
        return `Thời khóa biểu lớp ${cls?.name || ''}`
      } else {
        const tch = teachersList.find((t) => t._id === selectedTeacherId)
        return `Lịch giảng dạy giáo viên ${tch?.fullName || ''}`
      }
    }
    return 'Thời khóa biểu tuần'
  }, [isStudent, isTeacher, isAdmin, adminViewMode, metadata, user, classesList, teachersList, selectedClassId, selectedTeacherId])

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100/80 text-blue-700 rounded-xl">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
                {pageTitle}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {isStudent && 'Xem lịch học các môn theo từng tiết và ngày trong tuần'}
                {isTeacher && 'Xem chi tiết các tiết phân công giảng dạy tại các lớp'}
                {isAdmin && 'Xem và quản lý thời khóa biểu theo từng lớp hoặc giáo viên'}
              </p>
            </div>
          </div>
        </div>

        {/* Actions Button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-xs transition-colors"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 shadow-xs transition-colors"
            title="In thời khóa biểu"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>In TKB</span>
          </button>
        </div>
      </div>

      {/* Admin Mode Switcher & Selectors */}
      {isAdmin && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Chế độ xem Admin:
              </span>
              <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setAdminViewMode('class')}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                    adminViewMode === 'class'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Theo Lớp học
                </button>
                <button
                  type="button"
                  onClick={() => setAdminViewMode('teacher')}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                    adminViewMode === 'teacher'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Theo Giáo viên
                </button>
              </div>
            </div>

            {/* Dropdown Lớp hoặc Giáo viên */}
            {adminViewMode === 'class' ? (
              <div className="flex items-center gap-2 text-xs">
                <label htmlFor="admin-class-select" className="font-medium text-slate-600">
                  Chọn Lớp:
                </label>
                <select
                  id="admin-class-select"
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-800 font-semibold rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-blue-500 text-xs min-w-36"
                >
                  {classesList.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} ({c.academicYear})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs">
                <label htmlFor="admin-teacher-select" className="font-medium text-slate-600">
                  Chọn Giáo viên:
                </label>
                <select
                  id="admin-teacher-select"
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-800 font-semibold rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-blue-500 text-xs min-w-44"
                >
                  {teachersList.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.fullName} ({t.userCode})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Week Navigator */}
      <WeekNavigator
        weekRangeText={weekInfo.weekRangeText}
        onPrevWeek={handlePrevWeek}
        onNextWeek={handleNextWeek}
        onCurrentWeek={handleCurrentWeek}
        isCurrentWeek={isCurrentWeek}
        academicYear={academicYear}
        onAcademicYearChange={setAcademicYear}
        semester={semester}
        onSemesterChange={setSemester}
      />

      {/* Quick Statistics Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-medium">Tổng số tiết/tuần</p>
            <p className="text-base font-extrabold text-slate-900">{stats.total} tiết</p>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-medium">Số môn học</p>
            <p className="text-base font-extrabold text-slate-900">{stats.subjectCount} môn</p>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-medium">Tiết Buổi sáng</p>
            <p className="text-base font-extrabold text-slate-900">{stats.morningCount} tiết</p>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-medium">Tiết Buổi chiều</p>
            <p className="text-base font-extrabold text-slate-900">{stats.afternoonCount} tiết</p>
          </div>
        </div>
      </div>

      {/* Main Content Area: Loading / Error / Empty / Grid */}
      {loading ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-xs flex flex-col items-center justify-center">
          <LoadingSpinner message="Đang tải thời khóa biểu tuần..." />
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-red-700 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm">Không thể tải thời khóa biểu</h4>
            <p className="text-xs mt-1 text-red-600">{error}</p>
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="mt-3 px-3 py-1.5 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 transition-colors"
            >
              Thử lại
            </button>
          </div>
        </div>
      ) : metadata?.message && slots.length === 0 ? (
        <div className="p-8 bg-amber-50 border border-amber-200 rounded-2xl text-center">
          <AlertCircle className="w-8 h-8 text-amber-600 mx-auto mb-2" />
          <h4 className="font-bold text-sm text-amber-900">Thông báo thời khóa biểu</h4>
          <p className="text-xs text-amber-700 mt-1">{metadata.message}</p>
        </div>
      ) : (
        <TimetableGrid
          days={weekInfo.days}
          grid={grid}
          isTeacherView={isTeacher}
          isStudentView={isStudent}
        />
      )}
    </div>
  )
}

export default WeeklyTimetablePage
