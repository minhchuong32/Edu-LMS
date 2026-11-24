import { useState, useEffect, useMemo } from 'react'
import {
  ClipboardList,
  Users,
  Save,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
  RotateCcw,
  Award,
  BookOpen,
  Filter,
  Calculator,
} from 'lucide-react'
import { useAuth } from '@/context/useAuth'
import academicApi from '@/api/academicApi'
import gradebookApi from '@/api/gradebookApi'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import {
  DEFAULT_GRADE_WEIGHTS,
  GRADE_COLUMN_DEFINITIONS,
  validateGradeInput,
  calculateRowWeightedAverage,
  classifyAcademicPerformance,
} from '@/utils/gradeCalculator'

const SEMESTER_OPTIONS = [
  { value: 'HK1', label: 'Học kỳ 1 (HK1)' },
  { value: 'HK2', label: 'Học kỳ 2 (HK2)' },
  { value: 'CaNam', label: 'Cả năm' },
]

/**
 * Màu sắc badge xếp loại học lực
 */
const getPerformanceBadgeClass = (performance) => {
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
      return 'bg-slate-100 text-slate-600 border-slate-200'
  }
}

/**
 * Trang Sổ điểm dạng bảng (Spreadsheet Gradebook) dành cho Giáo viên
 * - Hiển thị danh sách học sinh theo lớp (Hàng: Học sinh, Cột: Các loại điểm)
 * - Cho phép nhập/sửa điểm trực tiếp bằng Inline Edit
 * - Validate điểm trong khoảng 0 - 10 tức thời
 * - Tự động tính và hiển thị Điểm trung bình môn (TBM) theo hệ số cấu hình
 * - Hỗ trợ lưu hàng loạt nhiều điểm trong một lần thao tác (Bulk Save)
 */
export const TeacherGradebookPage = () => {
  const { user } = useAuth()

  // 1. Danh sách Lớp - Môn học (TeachingAssignment) được phân công cho giáo viên
  const [teachingAssignments, setTeachingAssignments] = useState([])
  const [selectedTeachingAssignmentId, setSelectedTeachingAssignmentId] =
    useState('')
  const [selectedSemester, setSelectedSemester] = useState('HK1')
  const [loadingAssignments, setLoadingAssignments] = useState(true)

  // 2. Danh sách học sinh của lớp & Dữ liệu sổ điểm
  const [students, setStudents] = useState([])
  const [weightConfig, setWeightConfig] = useState(DEFAULT_GRADE_WEIGHTS)
  const [loadingGradebook, setLoadingGradebook] = useState(false)

  // Map điểm gốc đã lưu từ Server: { [studentId]: { [gradeType]: { _id, value: string } } }
  const [savedGrid, setSavedGrid] = useState({})
  // Map điểm đang chỉnh sửa inline trên bảng: { [studentId]: { [gradeType]: string } }
  const [draftGrid, setDraftGrid] = useState({})

  // Trạng thái lưu hàng loạt / lưu từng dòng
  const [savingBulk, setSavingBulk] = useState(false)
  const [savingRowId, setSavingRowId] = useState(null)

  // Thông báo trạng thái (Thành công / Lỗi)
  const [statusBanner, setStatusBanner] = useState(null) // { type: 'success' | 'error', text: string }

  // Tìm kiếm & Bộ lọc xếp loại
  const [searchStudent, setSearchStudent] = useState('')
  const [performanceFilter, setPerformanceFilter] = useState('ALL')

  // Trigger tải lại
  const [reloadKey, setReloadKey] = useState(0)

  // Phân công đang chọn hiện tại
  const currentTeachingAssignment = useMemo(() => {
    return (
      teachingAssignments.find((a) => a._id === selectedTeachingAssignmentId) ||
      null
    )
  }, [teachingAssignments, selectedTeachingAssignmentId])

  // Bước 1: Tải danh sách phân công giảng dạy của giáo viên
  useEffect(() => {
    let ignore = false
    const teacherId =
      user?._id || user?.id || user?.userId || user?.userCode || 'me'

    const loadTeachingAssignments = async () => {
      setLoadingAssignments(true)
      try {
        let scheduleData = []
        let loadErr = null

        try {
          const res = await academicApi.getTeacherSchedule(teacherId)
          const data = res?.data || res || []
          scheduleData = Array.isArray(data) ? data : data?.assignments || []
        } catch (scheduleErr) {
          loadErr = scheduleErr
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
            }
          }
        }

        if (!ignore) {
          setTeachingAssignments(scheduleData)
          if (loadErr && scheduleData.length === 0) {
            setStatusBanner({
              type: 'error',
              text:
                loadErr?.message ||
                'Không thể tải danh sách lớp và môn học được phân công.',
            })
          }

          if (scheduleData.length > 0) {
            setSelectedTeachingAssignmentId((prev) => {
              const exists = scheduleData.some((a) => a._id === prev)
              return exists ? prev : scheduleData[0]._id
            })
          } else {
            setSelectedTeachingAssignmentId('')
            setStudents([])
            setLoadingGradebook(false)
          }
        }
      } catch (err) {
        if (!ignore) {
          setStatusBanner({
            type: 'error',
            text:
              err?.message ||
              'Không thể tải danh sách lớp và môn học được phân công.',
          })
        }
      } finally {
        if (!ignore) {
          setLoadingAssignments(false)
        }
      }
    }

    loadTeachingAssignments()
    return () => {
      ignore = true
    }
  }, [user?._id, user?.id, user?.userId, user?.userCode])

  // Bước 2: Tải danh sách học sinh của lớp và bảng điểm theo Phân công + Học kỳ
  useEffect(() => {
    let ignore = false

    const loadClassStudentsAndGrades = async () => {
      if (!selectedTeachingAssignmentId) {
        await Promise.resolve()
        if (!ignore) {
          setStudents([])
          setSavedGrid({})
          setDraftGrid({})
          setLoadingGradebook(false)
        }
        return
      }

      setLoadingGradebook(true)
      try {
        const currentTa = teachingAssignments.find(
          (a) => a._id === selectedTeachingAssignmentId
        )
        const classId = currentTa?.class?._id || currentTa?.class

        const [studentsRes, gradesRes] = await Promise.all([
          classId
            ? academicApi.getStudentsByClass(classId).catch(() => ({ data: [] }))
            : Promise.resolve({ data: [] }),
          gradebookApi.getGradeRecords({
            teachingAssignment: selectedTeachingAssignmentId,
            semester: selectedSemester,
          }),
        ])

        if (ignore) return

        // 1. Trích xuất danh sách học sinh từ lớp học
        const rawStudentsData = studentsRes?.data || studentsRes || []
        const classStudentList = Array.isArray(rawStudentsData)
          ? rawStudentsData
          : rawStudentsData?.students || []

        // 2. Trích xuất danh sách bản ghi điểm từ API sổ điểm
        const gradeData = gradesRes?.data || gradesRes || {}
        const recordList = Array.isArray(gradeData)
          ? gradeData
          : gradeData?.records || []

        if (gradeData?.weightConfig && typeof gradeData.weightConfig === 'object') {
          setWeightConfig({
            ...DEFAULT_GRADE_WEIGHTS,
            ...gradeData.weightConfig,
          })
        }

        // 3. Hợp nhất danh sách học sinh từ lớp học và từ các bản ghi điểm
        const studentMap = new Map()
        classStudentList.forEach((st) => {
          const stObj = st?.student || st
          const stId = stObj?._id || stObj?.id
          if (stId) {
            studentMap.set(String(stId), {
              _id: String(stId),
              userCode: stObj.userCode || '---',
              fullName: stObj.fullName || 'Học sinh',
              email: stObj.email || '',
              className:
                stObj.className || currentTa?.class?.name || '',
            })
          }
        })

        recordList.forEach((rec) => {
          const stObj = rec?.student
          const stId = stObj?._id || stObj?.id || rec?.student
          if (stId && !studentMap.has(String(stId))) {
            studentMap.set(String(stId), {
              _id: String(stId),
              userCode: stObj?.userCode || '---',
              fullName: stObj?.fullName || 'Học sinh',
              email: stObj?.email || '',
              className:
                stObj?.className || currentTa?.class?.name || '',
            })
          }
        })

        const mergedStudents = Array.from(studentMap.values()).sort((a, b) =>
          (a.userCode || '').localeCompare(b.userCode || '')
        )

        // 4. Xây dựng lưới điểm gốc (savedGrid) và lưới nháp inline (draftGrid)
        const nextSavedGrid = {}
        const nextDraftGrid = {}

        mergedStudents.forEach((st) => {
          nextSavedGrid[st._id] = {}
          nextDraftGrid[st._id] = {}
          GRADE_COLUMN_DEFINITIONS.forEach((col) => {
            nextSavedGrid[st._id][col.key] = { _id: null, value: '' }
            nextDraftGrid[st._id][col.key] = ''
          })
        })

        recordList.forEach((rec) => {
          const stId = String(rec.student?._id || rec.student || '')
          const gType = String(rec.gradeType || '').toLowerCase().trim()
          if (!stId || !gType) return

          if (!nextSavedGrid[stId]) {
            nextSavedGrid[stId] = {}
            nextDraftGrid[stId] = {}
          }

          const valStr =
            rec.value !== null && rec.value !== undefined
              ? String(rec.value)
              : ''

          nextSavedGrid[stId][gType] = {
            _id: rec._id || null,
            value: valStr,
          }
          nextDraftGrid[stId][gType] = valStr
        })

        setStudents(mergedStudents)
        setSavedGrid(nextSavedGrid)
        setDraftGrid(nextDraftGrid)
      } catch (err) {
        if (!ignore) {
          setStatusBanner({
            type: 'error',
            text:
              err?.message ||
              'Không thể tải dữ liệu sổ điểm của lớp. Vui lòng thử lại.',
          })
        }
      } finally {
        if (!ignore) {
          setLoadingGradebook(false)
        }
      }
    }

    loadClassStudentsAndGrades()
    return () => {
      ignore = true
    }
  }, [
    selectedTeachingAssignmentId,
    selectedSemester,
    teachingAssignments,
    reloadKey,
  ])

  // Xử lý thay đổi giá trị ô điểm Inline Edit
  const handleCellChange = (studentId, gradeType, rawValue) => {
    setDraftGrid((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [gradeType]: rawValue,
      },
    }))
  }

  // Đặt lại toàn bộ thay đổi chưa lưu về trạng thái gốc đã lưu
  const handleResetChanges = () => {
    const restoredDraft = {}
    Object.entries(savedGrid).forEach(([stId, cols]) => {
      restoredDraft[stId] = {}
      Object.entries(cols).forEach(([gType, cellObj]) => {
        restoredDraft[stId][gType] = cellObj?.value ?? ''
      })
    })
    setDraftGrid(restoredDraft)
    setStatusBanner(null)
  }

  // Tính toán danh sách các ô đã thay đổi (dirty cells) và các ô bị lỗi validate (invalid cells)
  const { dirtyCells, invalidCells } = useMemo(() => {
    const dirty = []
    const invalid = []

    students.forEach((student) => {
      const stId = student._id
      const studentDraft = draftGrid[stId] || {}
      const studentSaved = savedGrid[stId] || {}

      GRADE_COLUMN_DEFINITIONS.forEach((col) => {
        const draftVal = String(studentDraft[col.key] ?? '').trim()
        const savedVal = String(studentSaved[col.key]?.value ?? '').trim()
        const recordId = studentSaved[col.key]?._id || null

        const check = validateGradeInput(draftVal)
        if (!check.isValid) {
          invalid.push({
            studentId: stId,
            studentName: student.fullName,
            userCode: student.userCode,
            gradeType: col.key,
            columnLabel: col.label,
            rawValue: draftVal,
            error: check.error,
          })
        }

        if (draftVal !== savedVal) {
          // Chỉ đẩy vào danh sách lưu nếu người dùng nhập một giá trị mới không rỗng
          if (!check.isEmpty) {
            dirty.push({
              _id: recordId,
              studentId: stId,
              studentName: student.fullName,
              gradeType: col.key,
              columnLabel: col.label,
              rawValue: draftVal,
              numericValue: check.numericValue,
              isValid: check.isValid,
              weight: weightConfig[col.key] || col.defaultWeight,
            })
          }
        }
      })
    })

    return { dirtyCells: dirty, invalidCells: invalid }
  }, [students, draftGrid, savedGrid, weightConfig])

  // Lưu hàng loạt toàn bộ các ô điểm đã nhập / chỉnh sửa (Bulk Save)
  const handleBulkSave = async () => {
    if (invalidCells.length > 0) {
      const firstErr = invalidCells[0]
      setStatusBanner({
        type: 'error',
        text: `Không thể lưu! Điểm "${firstErr.columnLabel}" của học sinh ${firstErr.studentName} (${firstErr.rawValue}) không hợp lệ. Điểm phải nằm trong khoảng từ 0 đến 10.`,
      })
      return
    }

    if (dirtyCells.length === 0) {
      setStatusBanner({
        type: 'error',
        text: 'Chưa có thay đổi điểm số nào mới để lưu.',
      })
      return
    }

    setSavingBulk(true)
    setStatusBanner(null)

    try {
      const recordsPayload = dirtyCells.map((cell) => ({
        ...(cell._id ? { _id: cell._id } : {}),
        student: cell.studentId,
        teachingAssignment: selectedTeachingAssignmentId,
        semester: selectedSemester,
        gradeType: cell.gradeType,
        value: cell.numericValue,
        weight: cell.weight,
      }))

      const res = await gradebookApi.bulkSaveGradeRecords({
        teachingAssignment: selectedTeachingAssignmentId,
        semester: selectedSemester,
        records: recordsPayload,
      })

      const resData = res?.data || res || {}
      const savedRecords = Array.isArray(resData?.records)
        ? resData.records
        : []

      // Đồng bộ lại savedGrid và draftGrid sau khi lưu thành công
      setSavedGrid((prev) => {
        const next = { ...prev }
        dirtyCells.forEach((cell) => {
          const matchedServerRec = savedRecords.find(
            (r) =>
              String(r.student?._id || r.student) === cell.studentId &&
              String(r.gradeType) === cell.gradeType
          )
          if (!next[cell.studentId]) next[cell.studentId] = {}
          next[cell.studentId] = {
            ...next[cell.studentId],
            [cell.gradeType]: {
              _id: matchedServerRec?._id || cell._id || 'saved',
              value: String(cell.numericValue),
            },
          }
        })
        return next
      })

      setDraftGrid((prev) => {
        const next = { ...prev }
        dirtyCells.forEach((cell) => {
          if (!next[cell.studentId]) next[cell.studentId] = {}
          next[cell.studentId] = {
            ...next[cell.studentId],
            [cell.gradeType]: String(cell.numericValue),
          }
        })
        return next
      })

      setStatusBanner({
        type: 'success',
        text: `Đã lưu hàng loạt thành công ${dirtyCells.length} đầu điểm vào sổ điểm!`,
      })
    } catch (err) {
      setStatusBanner({
        type: 'error',
        text:
          err?.message ||
          'Lưu bảng điểm hàng loạt thất bại. Vui lòng kiểm tra lại kết nối.',
      })
    } finally {
      setSavingBulk(false)
    }
  }

  // Lưu điểm trực tiếp cho từng dòng học sinh
  const handleSaveStudentRow = async (student) => {
    const stId = student._id
    const rowInvalid = invalidCells.filter((c) => c.studentId === stId)
    if (rowInvalid.length > 0) {
      setStatusBanner({
        type: 'error',
        text: `Điểm "${rowInvalid[0].columnLabel}" của học sinh ${student.fullName} không hợp lệ! Điểm phải nằm trong khoảng từ 0 đến 10.`,
      })
      return
    }

    const rowDirty = dirtyCells.filter((c) => c.studentId === stId)
    if (rowDirty.length === 0) {
      return
    }

    setSavingRowId(stId)
    setStatusBanner(null)

    try {
      const recordsPayload = rowDirty.map((cell) => ({
        ...(cell._id ? { _id: cell._id } : {}),
        student: cell.studentId,
        teachingAssignment: selectedTeachingAssignmentId,
        semester: selectedSemester,
        gradeType: cell.gradeType,
        value: cell.numericValue,
        weight: cell.weight,
      }))

      const res = await gradebookApi.bulkSaveGradeRecords({
        teachingAssignment: selectedTeachingAssignmentId,
        semester: selectedSemester,
        records: recordsPayload,
      })

      const resData = res?.data || res || {}
      const savedRecords = Array.isArray(resData?.records)
        ? resData.records
        : []

      setSavedGrid((prev) => {
        const next = { ...prev }
        rowDirty.forEach((cell) => {
          const matchedServerRec = savedRecords.find(
            (r) =>
              String(r.student?._id || r.student) === cell.studentId &&
              String(r.gradeType) === cell.gradeType
          )
          if (!next[stId]) next[stId] = {}
          next[stId] = {
            ...next[stId],
            [cell.gradeType]: {
              _id: matchedServerRec?._id || cell._id || 'saved',
              value: String(cell.numericValue),
            },
          }
        })
        return next
      })

      setDraftGrid((prev) => {
        const next = { ...prev }
        rowDirty.forEach((cell) => {
          if (!next[stId]) next[stId] = {}
          next[stId] = {
            ...next[stId],
            [cell.gradeType]: String(cell.numericValue),
          }
        })
        return next
      })

      setStatusBanner({
        type: 'success',
        text: `Đã lưu thành công ${rowDirty.length} đầu điểm của học sinh ${student.fullName}!`,
      })
    } catch (err) {
      setStatusBanner({
        type: 'error',
        text:
          err?.message ||
          `Không thể lưu điểm cho học sinh ${student.fullName}.`,
      })
    } finally {
      setSavingRowId(null)
    }
  }

  // Tính điểm trung bình môn (TBM) tự động cho từng học sinh và lọc danh sách hiển thị
  const rowsWithAverages = useMemo(() => {
    return students.map((student) => {
      const studentDraft = draftGrid[student._id] || {}
      const average = calculateRowWeightedAverage(studentDraft, weightConfig)
      const performance = classifyAcademicPerformance(average)
      const rowDirtyCount = dirtyCells.filter(
        (c) => c.studentId === student._id
      ).length
      const rowHasInvalid = invalidCells.some(
        (c) => c.studentId === student._id
      )

      return {
        student,
        cells: studentDraft,
        average,
        performance,
        rowDirtyCount,
        rowHasInvalid,
      }
    })
  }, [students, draftGrid, weightConfig, dirtyCells, invalidCells])

  const filteredRows = useMemo(() => {
    return rowsWithAverages.filter(({ student, performance }) => {
      const kw = searchStudent.trim().toLowerCase()
      const matchKw =
        !kw ||
        student.fullName?.toLowerCase().includes(kw) ||
        student.userCode?.toLowerCase().includes(kw) ||
        student.email?.toLowerCase().includes(kw)

      if (!matchKw) return false
      if (performanceFilter !== 'ALL' && performance !== performanceFilter) {
        return false
      }
      return true
    })
  }, [rowsWithAverages, searchStudent, performanceFilter])

  // Thống kê tổng quan cả lớp
  const classStats = useMemo(() => {
    const totalStudents = rowsWithAverages.length
    const gradedRows = rowsWithAverages.filter(
      (r) => typeof r.average === 'number'
    )
    const classAverage =
      gradedRows.length > 0
        ? Math.round(
            (gradedRows.reduce((sum, r) => sum + r.average, 0) /
              gradedRows.length) *
              10
          ) / 10
        : null
    const goodOrAboveCount = gradedRows.filter((r) => r.average >= 6.5).length

    return {
      totalStudents,
      gradedCount: gradedRows.length,
      classAverage,
      goodOrAboveCount,
    }
  }, [rowsWithAverages])

  return (
    <div className="space-y-6">
      {/* 1. Header Trang & Nút Lưu Hàng Loạt */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <ClipboardList className="w-6 h-6 text-blue-600" />
            <span>Sổ điểm điện tử & Quản lý điểm theo hệ số</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Nhập và chỉnh sửa điểm trực tiếp trên bảng (Inline Edit), tự động
            tính điểm trung bình môn theo hệ số và lưu hàng loạt.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {dirtyCells.length > 0 && (
            <button
              type="button"
              onClick={handleResetChanges}
              disabled={savingBulk}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Hoàn tác ({dirtyCells.length})</span>
            </button>
          )}

          <button
            type="button"
            data-testid="bulk-save-grades-btn"
            onClick={handleBulkSave}
            disabled={savingBulk}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors"
          >
            {savingBulk ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>
              {savingBulk
                ? 'Đang lưu sổ điểm...'
                : dirtyCells.length > 0
                  ? `Lưu bảng điểm (${dirtyCells.length} thay đổi)`
                  : 'Lưu bảng điểm'}
            </span>
          </button>
        </div>
      </div>

      {/* 2. Banner Thông báo Kết quả Lưu / Lỗi Validate */}
      {statusBanner && (
        <div
          data-testid="gradebook-status-banner"
          className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs font-medium ${
            statusBanner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {statusBanner.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <span>{statusBanner.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="p-1 opacity-70 hover:opacity-100"
            aria-label="Đóng thông báo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. Bộ chọn Lớp - Môn học (TeachingAssignment) & Học kỳ */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-600" />
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Chọn Lớp – Môn học phụ trách & Học kỳ
            </h2>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Bộ chọn Học kỳ */}
            <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl">
              {SEMESTER_OPTIONS.map((sem) => (
                <button
                  key={sem.value}
                  type="button"
                  data-testid={`semester-tab-${sem.value}`}
                  onClick={() => setSelectedSemester(sem.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    selectedSemester === sem.value
                      ? 'bg-white text-blue-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {sem.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${loadingGradebook ? 'animate-spin' : ''}`}
              />
              <span>Tải lại</span>
            </button>
          </div>
        </div>

        {loadingAssignments ? (
          <div className="py-6 flex justify-center">
            <LoadingSpinner
              size="md"
              message="Đang tải danh sách lớp và môn học được phân công..."
            />
          </div>
        ) : teachingAssignments.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-800">
              Chưa có lớp học nào được phân công
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Bạn cần được phân công giảng dạy lớp và môn học để nhập sổ điểm.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {teachingAssignments.map((ta) => {
              const isSelected = ta._id === selectedTeachingAssignmentId
              return (
                <button
                  key={ta._id}
                  type="button"
                  data-testid={`ta-card-${ta._id}`}
                  onClick={() => setSelectedTeachingAssignmentId(ta._id)}
                  className={`text-left p-3.5 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-blue-50/70 border-blue-500 shadow-xs ring-1 ring-blue-500'
                      : 'bg-slate-50/70 border-slate-200 hover:border-slate-300 hover:bg-slate-100/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-800 truncate">
                      {ta.subject?.name || 'Môn học'}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700">
                      Lớp {ta.class?.name || '---'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-2">
                    <span>Năm học: {ta.academicYear || '2025-2026'}</span>
                    <span>•</span>
                    <span>Mã môn: {ta.subject?.code || '---'}</span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* 4. Thẻ Thống kê nhanh của Lớp đang chọn */}
      {selectedTeachingAssignmentId && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-medium">
                Sĩ số lớp {currentTeachingAssignment?.class?.name || ''}
              </p>
              <p className="text-lg font-bold text-slate-900">
                {classStats.totalStudents} học sinh
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-medium">
                Điểm TB chung cả lớp
              </p>
              <p
                data-testid="class-average-stat"
                className="text-lg font-bold text-slate-900"
              >
                {classStats.classAverage !== null
                  ? `${classStats.classAverage.toFixed(1)} / 10`
                  : 'Chưa có'}
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-medium">
                Học lực Khá / Giỏi trở lên
              </p>
              <p className="text-lg font-bold text-slate-900">
                {classStats.goodOrAboveCount} / {classStats.gradedCount} HS
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl ${
                invalidCells.length > 0
                  ? 'bg-red-50 text-red-600'
                  : dirtyCells.length > 0
                    ? 'bg-amber-50 text-amber-600'
                    : 'bg-slate-100 text-slate-500'
              }`}
            >
              <Save className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-medium">
                Trạng thái chỉnh sửa
              </p>
              <p
                data-testid="dirty-count-stat"
                className="text-sm font-bold text-slate-900"
              >
                {invalidCells.length > 0
                  ? `${invalidCells.length} ô lỗi (0-10)`
                  : dirtyCells.length > 0
                    ? `${dirtyCells.length} đầu điểm chờ lưu`
                    : 'Đã đồng bộ'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 5. Bảng Điểm Dạng Spreadsheet (Hàng = Học sinh, Cột = Các loại điểm + ĐTB môn) */}
      {selectedTeachingAssignmentId && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Thanh công cụ tìm kiếm & chỉ dẫn hệ số */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-wrap flex-1">
              <div className="relative min-w-[220px] max-w-sm flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchStudent}
                  onChange={(e) => setSearchStudent(e.target.value)}
                  placeholder="Tìm học sinh theo tên, mã HS..."
                  className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
                {searchStudent && (
                  <button
                    type="button"
                    onClick={() => setSearchStudent('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  aria-label="Lọc theo xếp loại học lực"
                  value={performanceFilter}
                  onChange={(e) => setPerformanceFilter(e.target.value)}
                  className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">Tất cả học lực</option>
                  <option value="Xuất sắc">Xuất sắc (≥ 9.0)</option>
                  <option value="Giỏi">Giỏi (≥ 8.0)</option>
                  <option value="Khá">Khá (≥ 6.5)</option>
                  <option value="Trung bình">Trung bình (≥ 5.0)</option>
                  <option value="Yếu">Yếu (≥ 3.5)</option>
                  <option value="Kém">Kém (&lt; 3.5)</option>
                  <option value="Chưa xếp loại">Chưa có điểm</option>
                </select>
              </div>
            </div>

            {/* Chú thích hệ số điểm đang áp dụng */}
            <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-600">
              <span className="font-semibold text-slate-700">
                Hệ số cấu hình:
              </span>
              {GRADE_COLUMN_DEFINITIONS.map((col) => (
                <span
                  key={col.key}
                  className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-medium"
                >
                  {col.shortLabel}:{' '}
                  <strong className="text-blue-700">
                    x{weightConfig[col.key] || col.defaultWeight}
                  </strong>
                </span>
              ))}
            </div>
          </div>

          {/* Nội dung bảng điểm */}
          {loadingGradebook ? (
            <div className="py-16 flex justify-center">
              <LoadingSpinner
                size="lg"
                message="Đang tải danh sách học sinh và sổ điểm..."
              />
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="py-14 px-4 text-center">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800">
                Không có học sinh nào trong danh sách hiển thị
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {searchStudent || performanceFilter !== 'ALL'
                  ? 'Thử xóa bộ lọc tìm kiếm hoặc chọn mức học lực khác.'
                  : 'Lớp học hiện chưa có học sinh được xếp lớp.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table
                data-testid="gradebook-spreadsheet-table"
                className="w-full text-left border-collapse"
              >
                <thead>
                  <tr className="bg-slate-100/80 border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    <th className="py-3 px-3 text-center w-12">STT</th>
                    <th className="py-3 px-3 w-24">Mã HS</th>
                    <th className="py-3 px-4 min-w-[180px]">Họ và tên học sinh</th>
                    {GRADE_COLUMN_DEFINITIONS.map((col) => (
                      <th
                        key={col.key}
                        className="py-3 px-2.5 text-center min-w-[105px]"
                      >
                        <div>{col.shortLabel}</div>
                        <div className="text-[10px] font-semibold text-blue-600 normal-case">
                          Hệ số x{weightConfig[col.key] || col.defaultWeight}
                        </div>
                      </th>
                    ))}
                    <th className="py-3 px-3 text-center w-28 bg-blue-50/60 text-blue-900">
                      <div>ĐTB Môn</div>
                      <div className="text-[10px] font-normal text-blue-600 normal-case">
                        Tự động
                      </div>
                    </th>
                    <th className="py-3 px-3 text-center w-28">Học lực</th>
                    <th className="py-3 px-3 text-center w-24">Thao tác</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 text-xs">
                  {filteredRows.map(
                    (
                      {
                        student,
                        cells,
                        average,
                        performance,
                        rowDirtyCount,
                        rowHasInvalid,
                      },
                      idx
                    ) => {
                      const stId = student._id
                      const studentSaved = savedGrid[stId] || {}

                      return (
                        <tr
                          key={stId}
                          data-testid={`gradebook-row-${stId}`}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          {/* STT */}
                          <td className="py-2.5 px-3 text-center font-medium text-slate-500">
                            {idx + 1}
                          </td>

                          {/* Mã HS */}
                          <td className="py-2.5 px-3 font-semibold text-slate-700">
                            {student.userCode}
                          </td>

                          {/* Họ và tên học sinh */}
                          <td className="py-2.5 px-4">
                            <div className="font-bold text-slate-900">
                              {student.fullName}
                            </div>
                            {student.email && (
                              <div className="text-[11px] text-slate-400 truncate max-w-[200px]">
                                {student.email}
                              </div>
                            )}
                          </td>

                          {/* Các cột nhập điểm Inline Edit */}
                          {GRADE_COLUMN_DEFINITIONS.map((col) => {
                            const rawVal = cells[col.key] ?? ''
                            const savedVal =
                              studentSaved[col.key]?.value ?? ''
                            const isDirty =
                              String(rawVal).trim() !== String(savedVal).trim()
                            const check = validateGradeInput(rawVal)

                            return (
                              <td
                                key={col.key}
                                className="py-2 px-2 text-center align-top"
                              >
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  data-testid={`grade-input-${stId}-${col.key}`}
                                  aria-label={`${col.label} của ${student.fullName}`}
                                  placeholder="0 - 10"
                                  value={rawVal}
                                  onChange={(e) =>
                                    handleCellChange(
                                      stId,
                                      col.key,
                                      e.target.value
                                    )
                                  }
                                  className={`w-20 text-center px-2 py-1.5 rounded-lg border text-xs font-semibold transition-all focus:outline-hidden focus:ring-2 ${
                                    !check.isValid
                                      ? 'border-red-500 bg-red-50 text-red-800 focus:ring-red-400'
                                      : isDirty
                                        ? 'border-amber-400 bg-amber-50/70 text-amber-900 focus:ring-amber-400'
                                        : 'border-slate-200 bg-white text-slate-800 focus:border-blue-500 focus:ring-blue-500'
                                  }`}
                                />
                                {!check.isValid && (
                                  <p
                                    data-testid={`grade-error-${stId}-${col.key}`}
                                    className="text-[10px] text-red-600 font-medium mt-1 leading-tight"
                                  >
                                    0 – 10
                                  </p>
                                )}
                              </td>
                            )
                          })}

                          {/* Điểm trung bình môn (TBM) tự động */}
                          <td className="py-2.5 px-3 text-center bg-blue-50/30">
                            <span
                              data-testid={`student-average-${stId}`}
                              className={`inline-flex items-center justify-center min-w-[48px] px-2.5 py-1 rounded-lg font-bold text-xs ${
                                average === null
                                  ? 'text-slate-400 bg-slate-100'
                                  : average >= 8.0
                                    ? 'text-emerald-800 bg-emerald-100'
                                    : average >= 5.0
                                      ? 'text-blue-800 bg-blue-100'
                                      : 'text-red-800 bg-red-100'
                              }`}
                            >
                              {average !== null ? average.toFixed(1) : '---'}
                            </span>
                          </td>

                          {/* Xếp loại học lực */}
                          <td className="py-2.5 px-3 text-center">
                            <span
                              data-testid={`student-performance-${stId}`}
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getPerformanceBadgeClass(
                                performance
                              )}`}
                            >
                              {performance}
                            </span>
                          </td>

                          {/* Nút Lưu dòng */}
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              data-testid={`save-row-btn-${stId}`}
                              onClick={() => handleSaveStudentRow(student)}
                              disabled={
                                savingRowId === stId ||
                                savingBulk ||
                                (rowDirtyCount === 0 && !rowHasInvalid)
                              }
                              className={`inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                                rowDirtyCount > 0 || rowHasInvalid
                                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-2xs'
                                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              }`}
                              title="Lưu điểm của học sinh này"
                            >
                              {savingRowId === stId ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <Save className="w-3 h-3" />
                              )}
                              <span>Lưu</span>
                            </button>
                          </td>
                        </tr>
                      )
                    }
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer bảng điểm */}
          <div className="p-4 border-t border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
            <div>
              Hiển thị <strong>{filteredRows.length}</strong> /{' '}
              <strong>{students.length}</strong> học sinh • Công thức ĐTB môn:{' '}
              <span className="font-medium text-slate-800">
                Tổng(Điểm × Hệ số) / Tổng hệ số các cột đã nhập
              </span>
            </div>

            <button
              type="button"
              onClick={handleBulkSave}
              disabled={savingBulk}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>
                {dirtyCells.length > 0
                  ? `Lưu tất cả thay đổi (${dirtyCells.length})`
                  : 'Lưu bảng điểm'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default TeacherGradebookPage

