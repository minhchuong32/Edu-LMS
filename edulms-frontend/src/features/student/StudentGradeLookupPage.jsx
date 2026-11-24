import { useState, useEffect, useMemo } from 'react'
import {
  Award,
  BookOpen,
  TrendingUp,
  Eye,
  Lock,
  Search,
  RefreshCw,
  AlertCircle,
  User,
  Sparkles,
  CheckCircle2,
  Filter,
} from 'lucide-react'
import { useAuth } from '@/context/useAuth'
import academicApi from '@/api/academicApi'
import gradebookApi from '@/api/gradebookApi'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import {
  DEFAULT_GRADE_WEIGHTS,
  GRADE_COLUMN_DEFINITIONS,
  calculateRowWeightedAverage,
  calculateOverallGPA,
  classifyAcademicPerformance,
} from '@/utils/gradeCalculator'

const SEMESTER_TABS = [
  { value: 'HK1', label: 'Học kỳ 1 (HK1)' },
  { value: 'HK2', label: 'Học kỳ 2 (HK2)' },
  { value: 'CaNam', label: 'Cả năm' },
]

const GRADE_TYPE_ORDER = {
  oral: 1,
  '15min': 2,
  regular: 3,
  '45min': 4,
  midterm: 5,
  final: 6,
}

const GRADE_TYPE_SHORT_LABELS = {
  oral: 'Miệng',
  '15min': '15 phút',
  regular: 'Thường xuyên',
  '45min': '1 tiết',
  midterm: 'Giữa kỳ',
  final: 'Cuối kỳ',
}

/**
 * Màu sắc badge xếp loại học lực
 */
const getPerformanceStyle = (performance) => {
  switch (performance) {
    case 'Xuất sắc':
      return 'bg-purple-100 text-purple-800 border-purple-200'
    case 'Giỏi':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200'
    case 'Khá':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'Trung bình':
      return 'bg-amber-100 text-amber-800 border-amber-200'
    case 'Yếu':
    case 'Kém':
      return 'bg-red-100 text-red-800 border-red-200'
    default:
      return 'bg-slate-100 text-slate-500 border-slate-200'
  }
}

/**
 * Màu sắc ô điểm thành phần theo mức điểm
 */
const getScoreChipClass = (score) => {
  const num = Number(score)
  if (Number.isNaN(num)) return 'bg-slate-100 text-slate-500 border-slate-200'
  if (num >= 8.0) return 'bg-emerald-50 text-emerald-800 border-emerald-200'
  if (num >= 6.5) return 'bg-blue-50 text-blue-800 border-blue-200'
  if (num >= 5.0) return 'bg-amber-50 text-amber-800 border-amber-200'
  return 'bg-red-50 text-red-800 border-red-200'
}

/**
 * Component Biểu đồ Xu hướng Điểm theo Thời gian (SVG Line & Area Chart)
 */
const GradeTrendChart = ({
  trendPoints = [],
  subjectOptions = [],
  selectedTrendSubject,
  onSelectTrendSubject,
}) => {
  const chartWidth = 720
  const chartHeight = 230
  const padLeft = 42
  const padRight = 28
  const padTop = 24
  const padBottom = 42
  const innerWidth = chartWidth - padLeft - padRight
  const innerHeight = chartHeight - padTop - padBottom

  const coordinates = useMemo(() => {
    if (!Array.isArray(trendPoints) || trendPoints.length === 0) return []
    const count = trendPoints.length
    return trendPoints.map((pt, index) => {
      const x =
        count === 1
          ? padLeft + innerWidth / 2
          : padLeft + (index / (count - 1)) * innerWidth
      const clampedVal = Math.max(0, Math.min(10, Number(pt.value) || 0))
      const y = padTop + innerHeight - (clampedVal / 10) * innerHeight
      return {
        ...pt,
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
      }
    })
  }, [trendPoints, innerWidth, innerHeight])

  const polylinePoints = useMemo(() => {
    return coordinates.map((c) => `${c.x},${c.y}`).join(' ')
  }, [coordinates])

  const areaPoints = useMemo(() => {
    if (coordinates.length === 0) return ''
    const first = coordinates[0]
    const last = coordinates[coordinates.length - 1]
    const baselineY = padTop + innerHeight
    return `${first.x},${baselineY} ${polylinePoints} ${last.x},${baselineY}`
  }, [coordinates, polylinePoints, innerHeight])

  return (
    <div
      data-testid="grade-trend-chart"
      className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Biểu đồ xu hướng điểm theo thời gian
            </h2>
            <p className="text-[11px] text-slate-500">
              Theo dõi sự tiến bộ qua từng cột điểm kiểm tra trong học kỳ
            </p>
          </div>
        </div>

        {/* Bộ lọc môn học trên biểu đồ xu hướng */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            data-testid="trend-subject-filter"
            aria-label="Chọn môn học xem biểu đồ xu hướng"
            value={selectedTrendSubject}
            onChange={(e) => onSelectTrendSubject(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Tất cả môn học ({trendPoints.length} điểm)</option>
            {subjectOptions.map((sub) => (
              <option key={sub.key} value={sub.key}>
                {sub.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {coordinates.length === 0 ? (
        <div className="py-10 text-center bg-slate-50/70 rounded-xl border border-dashed border-slate-200">
          <TrendingUp className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-700">
            Chưa có dữ liệu điểm để vẽ biểu đồ xu hướng
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Biểu đồ sẽ tự động hiển thị ngay khi giáo viên nhập các cột điểm vào sổ điểm.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="w-full overflow-x-auto">
            <svg
              data-testid="grade-trend-svg"
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full min-w-[520px] h-56 select-none"
              role="img"
              aria-label="Biểu đồ đường xu hướng điểm số theo thời gian"
            >
              <defs>
                <linearGradient id="gradeTrendAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {/* Các đường lưới ngang mốc điểm 0, 2.5, 5.0, 6.5, 8.0, 10 */}
              {[0, 5, 6.5, 8, 10].map((mark) => {
                const y =
                  padTop + innerHeight - (mark / 10) * innerHeight
                const isThreshold = mark === 5 || mark === 8
                return (
                  <g key={mark}>
                    <line
                      x1={padLeft}
                      y1={y}
                      x2={chartWidth - padRight}
                      y2={y}
                      stroke={
                        mark === 8
                          ? '#10b981'
                          : mark === 5
                            ? '#f59e0b'
                            : '#e2e8f0'
                      }
                      strokeDasharray={isThreshold ? '4 4' : undefined}
                      strokeWidth={isThreshold ? '1.2' : '1'}
                    />
                    <text
                      x={padLeft - 8}
                      y={y + 3}
                      textAnchor="end"
                      className="fill-slate-400 text-[10px] font-semibold"
                    >
                      {mark}
                    </text>
                  </g>
                )
              })}

              {/* Vùng diện tích dưới đường xu hướng */}
              {coordinates.length > 1 && (
                <polygon
                  points={areaPoints}
                  fill="url(#gradeTrendAreaGrad)"
                />
              )}

              {/* Đường nối xu hướng điểm */}
              {coordinates.length > 1 && (
                <polyline
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={polylinePoints}
                />
              )}

              {/* Các điểm mốc dữ liệu (Data Points) */}
              {coordinates.map((pt, idx) => (
                <g
                  key={pt.id || idx}
                  data-testid={`trend-point-${idx}`}
                >
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="5"
                    className="fill-white stroke-blue-600"
                    strokeWidth="2.5"
                  />
                  {/* Nhãn điểm số trên đỉnh mỗi mốc */}
                  <text
                    x={pt.x}
                    y={pt.y - 10}
                    textAnchor="middle"
                    className="fill-slate-800 text-[10px] font-bold"
                  >
                    {pt.value}
                  </text>
                  {/* Nhãn trục hoành (Loại điểm / Ngày) */}
                  <text
                    x={pt.x}
                    y={chartHeight - 16}
                    textAnchor="middle"
                    className="fill-slate-500 text-[9px] font-medium"
                  >
                    {pt.shortLabel}
                  </text>
                  <text
                    x={pt.x}
                    y={chartHeight - 5}
                    textAnchor="middle"
                    className="fill-slate-400 text-[8px]"
                  >
                    {pt.dateLabel}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          {/* Danh sách chú thích các mốc điểm theo trình tự thời gian */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {coordinates.map((pt, idx) => (
              <div
                key={pt.id || idx}
                data-testid={`trend-timeline-item-${idx}`}
                className="shrink-0 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[11px] flex items-center gap-2"
              >
                <span
                  className={`px-2 py-0.5 rounded-md font-bold border ${getScoreChipClass(
                    pt.value
                  )}`}
                >
                  {pt.value}đ
                </span>
                <div>
                  <p className="font-semibold text-slate-800 leading-tight">
                    {pt.subjectName} • {pt.typeLabel}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Hệ số x{pt.weight} • {pt.dateLabel}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Trang Tra cứu Điểm dành cho Học sinh và Phụ huynh (Chỉ cho phép xem dữ liệu - Read-Only)
 * - Hiển thị bảng điểm theo môn học và học kỳ
 * - Hiển thị các loại điểm thành phần và điểm trung bình môn
 * - Làm nổi bật điểm trung bình môn (ĐTB Môn) và điểm trung bình học kỳ (GPA Học kỳ)
 * - Hiển thị biểu đồ xu hướng điểm theo thời gian
 * - Kiểm soát chặt chẽ chế độ chỉ đọc (không có quyền thêm, sửa hoặc xóa điểm)
 */
export const StudentGradeLookupPage = () => {
  const { user } = useAuth()
  const isParent = user?.role === 'parent'

  const [selectedSemester, setSelectedSemester] = useState('HK1')
  const [searchSubject, setSearchSubject] = useState('')
  const [selectedTrendSubject, setSelectedTrendSubject] = useState('ALL')

  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState(null)
  const [teachingAssignments, setTeachingAssignments] = useState([])
  const [gradeRecords, setGradeRecords] = useState([])
  const [weightConfig, setWeightConfig] = useState(DEFAULT_GRADE_WEIGHTS)
  const [studentClassInfo, setStudentClassInfo] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  // Tải danh sách môn học của lớp & bản ghi điểm theo học kỳ
  useEffect(() => {
    let ignore = false

    const loadStudentGrades = async () => {
      setLoading(true)
      setErrorMsg(null)

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
          } catch {
            // Bỏ qua nếu không tra cứu được lớp theo tên
          }
        }

        const [taRes, gradesRes] = await Promise.all([
          classId
            ? academicApi.getAssignments({ class: classId }).catch(() => ({
                data: [],
              }))
            : Promise.resolve({ data: [] }),
          gradebookApi.getGradeRecords({
            semester: selectedSemester,
          }),
        ])

        if (ignore) return

        const rawTaList = taRes?.data || taRes || []
        const taList = Array.isArray(rawTaList)
          ? rawTaList
          : rawTaList?.assignments || []

        const gradePayload = gradesRes?.data || gradesRes || {}
        const records = Array.isArray(gradePayload)
          ? gradePayload
          : gradePayload?.records || []

        if (
          gradePayload?.weightConfig &&
          typeof gradePayload.weightConfig === 'object'
        ) {
          setWeightConfig({
            ...DEFAULT_GRADE_WEIGHTS,
            ...gradePayload.weightConfig,
          })
        }

        if (taList.length > 0 && taList[0]?.class) {
          setStudentClassInfo(taList[0].class)
        } else if (
          records.length > 0 &&
          records[0]?.teachingAssignment?.class
        ) {
          setStudentClassInfo(records[0].teachingAssignment.class)
        }

        setTeachingAssignments(taList)
        setGradeRecords(records)
      } catch (err) {
        if (!ignore) {
          setErrorMsg(
            err?.message ||
              'Không thể tải dữ liệu bảng điểm. Vui lòng thử lại sau.'
          )
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    loadStudentGrades()
    return () => {
      ignore = true
    }
  }, [user?.classRef, user?.class, user?.className, selectedSemester, reloadKey])

  // Gom nhóm dữ liệu bảng điểm theo từng Môn học (Subject Row)
  const subjectRows = useMemo(() => {
    const subjectMap = new Map()

    // 1. Khởi tạo các môn học từ danh sách phân công của lớp
    teachingAssignments.forEach((ta) => {
      const subObj = ta?.subject
      const subKey = String(
        subObj?._id || subObj?.code || ta?._id || ''
      )
      if (!subKey) return

      subjectMap.set(subKey, {
        key: subKey,
        teachingAssignmentId: String(ta._id || ''),
        subjectName: subObj?.name || 'Môn học',
        subjectCode: subObj?.code || '---',
        teacherName: ta?.teacher?.fullName || 'Giáo viên bộ môn',
        gradesByType: {
          oral: [],
          '15min': [],
          regular: [],
          '45min': [],
          midterm: [],
          final: [],
        },
        allRecords: [],
      })
    })

    // 2. Đổ các bản ghi điểm vào đúng môn học
    gradeRecords.forEach((rec) => {
      const taObj = rec?.teachingAssignment
      const subObj = taObj?.subject
      const subKey = String(
        subObj?._id || subObj?.code || taObj?._id || rec?.teachingAssignment || 'unknown'
      )

      if (!subjectMap.has(subKey)) {
        subjectMap.set(subKey, {
          key: subKey,
          teachingAssignmentId: String(taObj?._id || rec?.teachingAssignment || ''),
          subjectName: subObj?.name || 'Môn học',
          subjectCode: subObj?.code || '---',
          teacherName: taObj?.teacher?.fullName || 'Giáo viên bộ môn',
          gradesByType: {
            oral: [],
            '15min': [],
            regular: [],
            '45min': [],
            midterm: [],
            final: [],
          },
          allRecords: [],
        })
      }

      const entry = subjectMap.get(subKey)
      const gType = String(rec.gradeType || '').toLowerCase().trim()
      if (entry.gradesByType[gType]) {
        entry.gradesByType[gType].push(rec)
      }
      entry.allRecords.push(rec)
    })

    // 3. Tính Điểm trung bình môn (ĐTB Môn) cho từng môn theo hệ số cấu hình
    return Array.from(subjectMap.values()).map((subEntry) => {
      // Tính ĐTB môn dựa trên toàn bộ các đầu điểm của môn học đó
      let totalWeighted = 0
      let totalWeight = 0

      subEntry.allRecords.forEach((rec) => {
        const val = Number(rec.value)
        if (Number.isNaN(val) || val < 0 || val > 10) return
        const gType = String(rec.gradeType || '').toLowerCase().trim()
        const w =
          Number(rec.weight) ||
          Number(weightConfig[gType]) ||
          DEFAULT_GRADE_WEIGHTS[gType] ||
          1
        totalWeighted += val * w
        totalWeight += w
      })

      // Dự phòng qua calculateRowWeightedAverage nếu cần
      const subjectAverage =
        totalWeight > 0
          ? Math.round((totalWeighted / totalWeight) * 10) / 10
          : calculateRowWeightedAverage({}, weightConfig)

      return {
        ...subEntry,
        average: subjectAverage,
        performance: classifyAcademicPerformance(subjectAverage),
      }
    })
  }, [teachingAssignments, gradeRecords, weightConfig])

  // Lọc bảng điểm theo từ khóa tìm kiếm môn học
  const filteredSubjectRows = useMemo(() => {
    const kw = searchSubject.trim().toLowerCase()
    if (!kw) return subjectRows
    return subjectRows.filter(
      (row) =>
        row.subjectName.toLowerCase().includes(kw) ||
        row.subjectCode.toLowerCase().includes(kw) ||
        row.teacherName.toLowerCase().includes(kw)
    )
  }, [subjectRows, searchSubject])

  // Tính toán các chỉ số Tổng kết Học kỳ (GPA Học kỳ, Học lực Học kỳ, Môn cao nhất)
  const semesterSummary = useMemo(() => {
    const gradedSubjects = subjectRows.filter(
      (s) => typeof s.average === 'number' && !Number.isNaN(s.average)
    )
    const semesterGpa = calculateOverallGPA(
      gradedSubjects.map((s) => ({
        subjectName: s.subjectName,
        gpa: s.average,
        weight: 1,
      }))
    )
    const semesterPerformance = classifyAcademicPerformance(semesterGpa)

    let bestSubject = null
    gradedSubjects.forEach((s) => {
      if (!bestSubject || s.average > bestSubject.average) {
        bestSubject = s
      }
    })

    return {
      semesterGpa,
      semesterPerformance,
      gradedSubjectCount: gradedSubjects.length,
      totalSubjectCount: subjectRows.length,
      totalRecordCount: gradeRecords.length,
      bestSubject,
    }
  }, [subjectRows, gradeRecords.length])

  // Chuẩn bị dữ liệu cho Biểu đồ Xu hướng Điểm theo thời gian
  const trendPoints = useMemo(() => {
    const filteredRecs =
      selectedTrendSubject === 'ALL'
        ? gradeRecords
        : gradeRecords.filter((rec) => {
            const taObj = rec?.teachingAssignment
            const subObj = taObj?.subject
            const subKey = String(
              subObj?._id ||
                subObj?.code ||
                taObj?._id ||
                rec?.teachingAssignment ||
                ''
            )
            return subKey === selectedTrendSubject
          })

    const sorted = [...filteredRecs].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
      if (timeA && timeB && timeA !== timeB) return timeA - timeB
      const orderA = GRADE_TYPE_ORDER[a.gradeType] || 99
      const orderB = GRADE_TYPE_ORDER[b.gradeType] || 99
      return orderA - orderB
    })

    return sorted.map((rec, idx) => {
      const gType = String(rec.gradeType || '').toLowerCase().trim()
      const subName =
        rec?.teachingAssignment?.subject?.name ||
        rec?.teachingAssignment?.subject?.code ||
        'Môn học'
      const dateStr = rec.createdAt
        ? new Date(rec.createdAt).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
          })
        : `Lần ${idx + 1}`

      return {
        id: rec._id || `pt-${idx}`,
        value: Number(rec.value),
        weight:
          Number(rec.weight) ||
          Number(weightConfig[gType]) ||
          DEFAULT_GRADE_WEIGHTS[gType] ||
          1,
        gradeType: gType,
        typeLabel: GRADE_TYPE_SHORT_LABELS[gType] || gType,
        shortLabel: `${subName.slice(0, 6)} (${GRADE_TYPE_SHORT_LABELS[gType] || gType})`,
        subjectName: subName,
        dateLabel: dateStr,
      }
    })
  }, [gradeRecords, selectedTrendSubject, weightConfig])

  // Thông tin học sinh hiển thị ở Header
  const displayStudentInfo = useMemo(() => {
    const firstRecStudent = gradeRecords[0]?.student
    return {
      fullName:
        firstRecStudent?.fullName ||
        user?.studentName ||
        user?.fullName ||
        'Học sinh',
      userCode:
        firstRecStudent?.userCode ||
        user?.studentCode ||
        user?.userCode ||
        '---',
      className:
        studentClassInfo?.name ||
        firstRecStudent?.className ||
        user?.className ||
        '10A1',
    }
  }, [gradeRecords, studentClassInfo, user])

  return (
    <div className="space-y-6">
      {/* 1. Header Trang & Chỉ báo Chế độ Chỉ xem (Read-Only) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Award className="w-6 h-6 text-blue-600" />
              <span>
                {isParent
                  ? 'Tra cứu Kết quả Học tập của Con'
                  : 'Bảng điểm Cá nhân & Kết quả Học tập'}
              </span>
            </h1>

            <span
              data-testid="readonly-mode-badge"
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200"
            >
              <Lock className="w-3 h-3 text-slate-500" />
              <span>Chỉ xem (Read-Only)</span>
            </span>
          </div>

          <p className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 font-medium text-slate-700">
              <User className="w-3.5 h-3.5 text-blue-600" />
              Học sinh: <strong>{displayStudentInfo.fullName}</strong> (
              {displayStudentInfo.userCode})
            </span>
            <span>•</span>
            <span>
              Lớp: <strong>{displayStudentInfo.className}</strong>
            </span>
          </p>
        </div>

        {/* Bộ chọn Học kỳ & Nút làm mới */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl">
            {SEMESTER_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                data-testid={`lookup-semester-tab-${tab.value}`}
                onClick={() => setSelectedSemester(tab.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedSemester === tab.value
                    ? 'bg-white text-blue-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
            />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Thông báo lỗi nếu có */}
      {errorMsg && (
        <div
          data-testid="student-grade-error-banner"
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

      {/* 2. Các Card Điểm Trung Bình (Làm nổi bật ĐTB Học kỳ & ĐTB Môn cao nhất) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Điểm Trung Bình Học Kỳ (Nổi bật nhất) */}
        <div
          data-testid="semester-gpa-card"
          className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-5 rounded-2xl shadow-md flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-100">
              Điểm TB Học kỳ ({selectedSemester})
            </span>
            <Sparkles className="w-4 h-4 text-amber-300" />
          </div>

          <div className="my-2 flex items-baseline gap-2">
            <span
              data-testid="semester-gpa-value"
              className="text-3xl font-extrabold tracking-tight"
            >
              {semesterSummary.semesterGpa !== null
                ? semesterSummary.semesterGpa.toFixed(1)
                : '---'}
            </span>
            <span className="text-xs text-blue-200 font-medium">/ 10</span>
          </div>

          <div className="pt-2.5 border-t border-white/20 flex items-center justify-between text-xs">
            <span className="text-blue-100">Xếp loại học kỳ:</span>
            <span
              data-testid="semester-performance-badge"
              className="px-2.5 py-0.5 rounded-full font-bold bg-white/20 text-white"
            >
              {semesterSummary.semesterPerformance}
            </span>
          </div>
        </div>

        {/* Card 2: Môn học có Điểm Trung Bình Môn cao nhất */}
        <div
          data-testid="best-subject-card"
          className="bg-white p-5 rounded-2xl border-2 border-emerald-200 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              ĐTB Môn Cao Nhất
            </span>
            <Award className="w-4 h-4 text-emerald-600" />
          </div>

          <div className="my-2">
            <p className="text-base font-extrabold text-slate-900 truncate">
              {semesterSummary.bestSubject
                ? semesterSummary.bestSubject.subjectName
                : 'Chưa có dữ liệu'}
            </p>
            <p
              data-testid="best-subject-average"
              className="text-2xl font-extrabold text-emerald-600 mt-0.5"
            >
              {semesterSummary.bestSubject
                ? `${semesterSummary.bestSubject.average.toFixed(1)} / 10`
                : '---'}
            </p>
          </div>

          <div className="text-[11px] text-slate-500">
            {semesterSummary.bestSubject
              ? `Học lực môn: ${semesterSummary.bestSubject.performance}`
              : 'Đang chờ giáo viên nhập điểm'}
          </div>
        </div>

        {/* Card 3: Tổng số môn & đầu điểm */}
        <div
          data-testid="graded-subjects-card"
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Tiến độ Tổng kết Môn
            </span>
            <BookOpen className="w-4 h-4 text-blue-600" />
          </div>

          <div className="my-2">
            <p className="text-2xl font-extrabold text-slate-900">
              {semesterSummary.gradedSubjectCount} /{' '}
              {semesterSummary.totalSubjectCount} môn
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Tổng cộng <strong>{semesterSummary.totalRecordCount}</strong> đầu
              điểm đã công bố
            </p>
          </div>

          <div className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Tự động cập nhật theo hệ số</span>
          </div>
        </div>

        {/* Card 4: Quyền hạn truy cập Chỉ đọc */}
        <div
          data-testid="readonly-access-card"
          className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Quyền truy cập sổ điểm
            </span>
            <Eye className="w-4 h-4 text-slate-600" />
          </div>

          <div className="my-2">
            <p className="text-sm font-bold text-slate-800">
              {isParent ? 'Tài khoản Phụ huynh' : 'Tài khoản Học sinh'}
            </p>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Chế độ <strong>Chỉ xem dữ liệu</strong>. Điểm số do Giáo viên bộ
              môn trực tiếp quản lý và công bố.
            </p>
          </div>

          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <Lock className="w-3 h-3" />
            <span>Không cho phép thêm / sửa / xóa</span>
          </div>
        </div>
      </div>

      {/* 3. Biểu đồ Xu hướng Điểm theo Thời gian */}
      <GradeTrendChart
        trendPoints={trendPoints}
        subjectOptions={subjectRows.map((s) => ({
          key: s.key,
          name: s.subjectName,
        }))}
        selectedTrendSubject={selectedTrendSubject}
        onSelectTrendSubject={setSelectedTrendSubject}
      />

      {/* 4. Bảng Điểm Chi Tiết Theo Môn Học & Học Kỳ (Chế độ Chỉ Đọc) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Bảng điểm chi tiết theo môn học ({selectedSemester})
            </h2>
            <p className="text-[11px] text-slate-500">
              Hiển thị đầy đủ các cột điểm thành phần và làm nổi bật Điểm trung
              bình từng môn
            </p>
          </div>

          <div className="relative min-w-[220px] max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchSubject}
              onChange={(e) => setSearchSubject(e.target.value)}
              placeholder="Tìm tên môn học, giáo viên..."
              aria-label="Tìm kiếm môn học"
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-16 flex justify-center">
            <LoadingSpinner
              size="lg"
              message="Đang tải bảng điểm các môn học..."
            />
          </div>
        ) : filteredSubjectRows.length === 0 ? (
          <div className="py-14 px-4 text-center">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-800">
              Chưa có dữ liệu điểm môn học trong học kỳ này
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Điểm các môn học sẽ xuất hiện tại đây sau khi giáo viên bộ môn cập
              nhật sổ điểm.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table
              data-testid="student-gradebook-table"
              className="w-full text-left border-collapse"
            >
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  <th className="py-3 px-3 text-center w-12">STT</th>
                  <th className="py-3 px-4 min-w-[190px]">Môn học & Giáo viên</th>
                  {GRADE_COLUMN_DEFINITIONS.map((col) => (
                    <th
                      key={col.key}
                      className="py-3 px-2.5 text-center min-w-[95px]"
                    >
                      <div>{col.shortLabel}</div>
                      <div className="text-[10px] font-semibold text-blue-600 normal-case">
                        Hệ số x{weightConfig[col.key] || col.defaultWeight}
                      </div>
                    </th>
                  ))}
                  <th className="py-3 px-3 text-center w-32 bg-blue-600 text-white">
                    <div>ĐTB Môn</div>
                    <div className="text-[10px] font-normal text-blue-100 normal-case">
                      Tổng kết môn
                    </div>
                  </th>
                  <th className="py-3 px-3 text-center w-28">Xếp loại</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 text-xs">
                {filteredSubjectRows.map((row, idx) => (
                  <tr
                    key={row.key}
                    data-testid={`subject-grade-row-${row.key}`}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-3 px-3 text-center font-medium text-slate-500">
                      {idx + 1}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">
                        {row.subjectName}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <span className="font-semibold text-slate-600">
                          {row.subjectCode}
                        </span>
                        <span>•</span>
                        <span className="truncate max-w-[160px]">
                          GV: {row.teacherName}
                        </span>
                      </div>
                    </td>

                    {/* Các cột điểm thành phần (Chỉ hiển thị Read-Only, không có input sửa/xóa) */}
                    {GRADE_COLUMN_DEFINITIONS.map((col) => {
                      const items = row.gradesByType[col.key] || []
                      return (
                        <td
                          key={col.key}
                          data-testid={`subject-cell-${row.key}-${col.key}`}
                          className="py-3 px-2.5 text-center"
                        >
                          {items.length === 0 ? (
                            <span className="text-slate-300 font-medium">
                              —
                            </span>
                          ) : (
                            <div className="flex flex-wrap items-center justify-center gap-1">
                              {items.map((item, i) => (
                                <span
                                  key={item._id || i}
                                  title={
                                    item.note
                                      ? `Ghi chú: ${item.note}`
                                      : `${col.label}: ${item.value} điểm`
                                  }
                                  className={`inline-flex items-center justify-center min-w-[36px] px-2 py-0.5 rounded-lg text-xs font-bold border ${getScoreChipClass(
                                    item.value
                                  )}`}
                                >
                                  {item.value}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                      )
                    })}

                    {/* Điểm Trung Bình Môn (ĐTB Môn) - Được làm nổi bật */}
                    <td className="py-3 px-3 text-center bg-blue-50/70 border-x border-blue-100">
                      <span
                        data-testid={`subject-average-badge-${row.key}`}
                        className={`inline-flex items-center justify-center min-w-[54px] px-3 py-1 rounded-xl text-sm font-extrabold shadow-2xs border-2 ${
                          row.average === null
                            ? 'bg-slate-100 text-slate-400 border-slate-200'
                            : row.average >= 8.0
                              ? 'bg-emerald-600 text-white border-emerald-700'
                              : row.average >= 6.5
                                ? 'bg-blue-600 text-white border-blue-700'
                                : row.average >= 5.0
                                  ? 'bg-amber-500 text-white border-amber-600'
                                  : 'bg-red-600 text-white border-red-700'
                        }`}
                      >
                        {row.average !== null ? row.average.toFixed(1) : '---'}
                      </span>
                    </td>

                    {/* Xếp loại học lực môn */}
                    <td className="py-3 px-3 text-center">
                      <span
                        data-testid={`subject-performance-badge-${row.key}`}
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getPerformanceStyle(
                          row.performance
                        )}`}
                      >
                        {row.performance}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>

              {/* Hàng Tổng kết Điểm Trung Bình Học Kỳ ở chân bảng */}
              <tfoot>
                <tr className="bg-gradient-to-r from-slate-900 to-blue-950 text-white text-xs font-bold">
                  <td colSpan={2 + GRADE_COLUMN_DEFINITIONS.length} className="py-3.5 px-4 text-right uppercase tracking-wider">
                    Điểm trung bình học kỳ ({selectedSemester}) • Tổng hợp{' '}
                    {semesterSummary.gradedSubjectCount} môn:
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <span
                      data-testid="table-footer-semester-gpa"
                      className="inline-flex items-center justify-center px-3 py-1 rounded-xl bg-amber-400 text-slate-950 text-sm font-extrabold shadow-xs"
                    >
                      {semesterSummary.semesterGpa !== null
                        ? semesterSummary.semesterGpa.toFixed(1)
                        : '---'}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <span className="px-2.5 py-0.5 rounded-full bg-white/15 text-white text-[11px] font-bold">
                      {semesterSummary.semesterPerformance}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default StudentGradeLookupPage
