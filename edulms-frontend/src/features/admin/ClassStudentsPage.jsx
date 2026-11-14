import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams, useParams, Link } from 'react-router-dom'
import academicApi from '@/api/academicApi'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import {
  Users,
  UserX,
  UserPlus,
  ArrowRightLeft,
  Search,
  Trash2,
  Calendar,
  GraduationCap,
  Building2,
  AlertCircle,
  CheckCircle2,
  X,
  RefreshCw,
  History,
  Clock,
  ArrowRight,
  ShieldCheck,
  Check,
  Mail,
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
} from 'lucide-react'

export const ClassStudentsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const { classId: routeClassId } = useParams()

  // Base data
  const [classes, setClasses] = useState([])
  const [grades, setGrades] = useState([])
  const [loadingClasses, setLoadingClasses] = useState(true)

  // Filters
  const [selectedYear, setSelectedYear] = useState('2025-2026')
  const [selectedGradeId, setSelectedGradeId] = useState('ALL')
  const [selectedClassId, setSelectedClassId] = useState(
    routeClassId || searchParams.get('classId') || ''
  )
  const [searchKeyword, setSearchKeyword] = useState('')
  const [activeTab, setActiveTab] = useState('students') // 'students' | 'history'

  // Current class data
  const [classData, setClassData] = useState(null)
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [classHistory, setClassHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Notification banners
  const [successMsg, setSuccessMsg] = useState(null)
  const [errorMsg, setErrorMsg] = useState(null)

  // Modal 1: Add Students to Class
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [unassignedStudents, setUnassignedStudents] = useState([])
  const [loadingUnassigned, setLoadingUnassigned] = useState(false)
  const [unassignedSearch, setUnassignedSearch] = useState('')
  const [selectedStudentIds, setSelectedStudentIds] = useState([])
  const [addNote, setAddNote] = useState('')
  const [submittingAdd, setSubmittingAdd] = useState(false)
  const [addModalError, setAddModalError] = useState(null)

  // Modal 2: Transfer Student
  const [transferModal, setTransferModal] = useState({
    isOpen: false,
    student: null,
    targetClassId: '',
    note: '',
    isConfirming: false,
  })
  const [submittingTransfer, setSubmittingTransfer] = useState(false)
  const [transferError, setTransferError] = useState(null)

  // Modal 3: Remove Student from Class
  const [removeModal, setRemoveModal] = useState({
    isOpen: false,
    student: null,
    note: '',
  })
  const [submittingRemove, setSubmittingRemove] = useState(false)
  const [removeError, setRemoveError] = useState(null)

  const academicYears = ['2025-2026', '2026-2027', '2024-2025']

  const extractErrMsg = useCallback((err) => {
    if (typeof err === 'string') return err
    return (
      err?.message ||
      err?.data?.message ||
      err?.response?.data?.message ||
      'Đã xảy ra lỗi khi thực hiện thao tác!'
    )
  }, [])

  // Refetch helper for manual user actions & submissions
  const fetchClassesAndGrades = useCallback(async () => {
    try {
      const [gradesRes, classesRes] = await Promise.all([
        academicApi.getGrades(),
        academicApi.getClasses({ academicYear: selectedYear }),
      ])
      const fetchedGrades = gradesRes?.data || []
      const fetchedClasses = classesRes?.data || []
      setGrades(fetchedGrades)
      setClasses(fetchedClasses)

      if (fetchedClasses.length > 0) {
        const found = fetchedClasses.some((c) => c._id === selectedClassId)
        if (!selectedClassId || !found) {
          const firstId = fetchedClasses[0]._id
          setSelectedClassId(firstId)
          setSearchParams({ classId: firstId })
        }
      }
    } catch (err) {
      setErrorMsg(extractErrMsg(err))
    } finally {
      setLoadingClasses(false)
    }
  }, [selectedYear, selectedClassId, setSearchParams, extractErrMsg])

  // Fetch Class Students for manual refresh
  const fetchStudentsOfClass = useCallback(async (classId) => {
    if (!classId) return
    try {
      const res = await academicApi.getStudentsByClass(classId)
      setClassData(res?.data || null)
    } catch (err) {
      setErrorMsg(extractErrMsg(err))
      setClassData(null)
    } finally {
      setLoadingStudents(false)
    }
  }, [extractErrMsg])

  // Fetch Class History for manual refresh
  const fetchClassHistoryData = useCallback(async (classId) => {
    if (!classId) return
    try {
      const res = await academicApi.getClassHistoryByClassId(classId)
      setClassHistory(res?.data || [])
    } catch (err) {
      console.error('Không thể tải lịch sử lớp:', err)
    } finally {
      setLoadingHistory(false)
    }
  }, [])

  // Load classes & grades on selectedYear change
  useEffect(() => {
    let ignore = false
    const loadData = async () => {
      try {
        const [gradesRes, classesRes] = await Promise.all([
          academicApi.getGrades(),
          academicApi.getClasses({ academicYear: selectedYear }),
        ])
        if (!ignore) {
          const fetchedGrades = gradesRes?.data || []
          const fetchedClasses = classesRes?.data || []
          setGrades(fetchedGrades)
          setClasses(fetchedClasses)

          if (fetchedClasses.length > 0) {
            const found = fetchedClasses.some((c) => c._id === selectedClassId)
            if (!selectedClassId || !found) {
              const firstId = fetchedClasses[0]._id
              setSelectedClassId(firstId)
              setSearchParams({ classId: firstId })
            }
          }
          setLoadingClasses(false)
        }
      } catch (err) {
        if (!ignore) {
          setErrorMsg(extractErrMsg(err))
          setLoadingClasses(false)
        }
      }
    }

    loadData()
    return () => {
      ignore = true
    }
  }, [selectedYear, selectedClassId, setSearchParams, extractErrMsg])

  // Load students of selected class
  useEffect(() => {
    if (!selectedClassId) return
    let ignore = false

    const loadStudents = async () => {
      try {
        const res = await academicApi.getStudentsByClass(selectedClassId)
        if (!ignore) {
          setClassData(res?.data || null)
          setLoadingStudents(false)
        }
      } catch (err) {
        if (!ignore) {
          setErrorMsg(extractErrMsg(err))
          setClassData(null)
          setLoadingStudents(false)
        }
      }
    }

    loadStudents()
    return () => {
      ignore = true
    }
  }, [selectedClassId, extractErrMsg])

  // Load class history when activeTab is history
  useEffect(() => {
    if (!selectedClassId || activeTab !== 'history') return
    let ignore = false

    const loadHistory = async () => {
      try {
        const res = await academicApi.getClassHistoryByClassId(selectedClassId)
        if (!ignore) {
          setClassHistory(res?.data || [])
          setLoadingHistory(false)
        }
      } catch (err) {
        if (!ignore) {
          console.error('Không thể tải lịch sử lớp:', err)
          setLoadingHistory(false)
        }
      }
    }

    loadHistory()
    return () => {
      ignore = true
    }
  }, [selectedClassId, activeTab])

  // Filtered classes by selected Grade
  const filteredClasses = useMemo(() => {
    if (selectedGradeId === 'ALL') return classes
    return classes.filter(
      (c) => c.grade?._id === selectedGradeId || c.grade === selectedGradeId
    )
  }, [classes, selectedGradeId])

  // Current active class object
  const currentClass = useMemo(() => {
    return (
      classData?.class ||
      classes.find((c) => c._id === selectedClassId) ||
      null
    )
  }, [classData, classes, selectedClassId])

  // Handle changing class
  const handleSelectClass = (newClassId) => {
    setSelectedClassId(newClassId)
    setSearchParams({ classId: newClassId })
    setSearchKeyword('')
    setLoadingStudents(true)
    if (activeTab === 'history') {
      setLoadingHistory(true)
    }
  }

  const handleYearChange = (newYear) => {
    setSelectedYear(newYear)
    setLoadingClasses(true)
  }

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    if (tab === 'history' && selectedClassId) {
      setLoadingHistory(true)
    }
  }

  // Filtered students in current class based on searchKeyword
  const filteredStudents = useMemo(() => {
    const list = classData?.students || []
    if (!searchKeyword.trim()) return list
    const kw = searchKeyword.toLowerCase().trim()
    return list.filter(
      (st) =>
        (st.fullName && st.fullName.toLowerCase().includes(kw)) ||
        (st.userCode && st.userCode.toLowerCase().includes(kw)) ||
        (st.email && st.email.toLowerCase().includes(kw))
    )
  }, [classData, searchKeyword])

  // ----------------------------------------------------
  // ACTION: ADD STUDENTS
  // ----------------------------------------------------
  const openAddModal = async () => {
    setIsAddModalOpen(true)
    setSelectedStudentIds([])
    setAddNote('')
    setAddModalError(null)
    setUnassignedSearch('')
    setLoadingUnassigned(true)
    try {
      const res = await academicApi.getUnassignedStudents()
      setUnassignedStudents(res?.data || [])
    } catch (err) {
      setAddModalError(extractErrMsg(err))
    } finally {
      setLoadingUnassigned(false)
    }
  }

  const filteredUnassignedStudents = useMemo(() => {
    if (!unassignedSearch.trim()) return unassignedStudents
    const kw = unassignedSearch.toLowerCase().trim()
    return unassignedStudents.filter(
      (st) =>
        (st.fullName && st.fullName.toLowerCase().includes(kw)) ||
        (st.userCode && st.userCode.toLowerCase().includes(kw)) ||
        (st.email && st.email.toLowerCase().includes(kw))
    )
  }, [unassignedStudents, unassignedSearch])

  const toggleSelectStudent = (id) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const handleSelectAllUnassigned = () => {
    if (selectedStudentIds.length === filteredUnassignedStudents.length) {
      setSelectedStudentIds([])
    } else {
      setSelectedStudentIds(filteredUnassignedStudents.map((st) => st._id))
    }
  }

  const handleConfirmAddStudents = async (e) => {
    e.preventDefault()
    if (selectedStudentIds.length === 0) {
      setAddModalError('Vui lòng chọn ít nhất một học sinh để thêm vào lớp!')
      return
    }

    const currentCount = classData?.totalStudents || 0
    const capacity = currentClass?.capacity || 45
    if (currentCount + selectedStudentIds.length > capacity) {
      setAddModalError(
        `Không thể thêm: Tổng sĩ số (${currentCount + selectedStudentIds.length}) sẽ vượt quá sức chứa tối đa của lớp (${capacity})!`
      )
      return
    }

    setSubmittingAdd(true)
    setAddModalError(null)
    try {
      const res = await academicApi.addStudentsToClass(selectedClassId, {
        studentIds: selectedStudentIds,
        note: addNote.trim(),
      })
      setSuccessMsg(
        res?.message ||
          `Đã xếp thành công ${selectedStudentIds.length} học sinh vào lớp ${currentClass?.name}!`
      )
      setIsAddModalOpen(false)
      // Refresh current class students & update list
      fetchStudentsOfClass(selectedClassId)
      fetchClassesAndGrades()
      if (activeTab === 'history') fetchClassHistoryData(selectedClassId)
    } catch (err) {
      setAddModalError(extractErrMsg(err))
    } finally {
      setSubmittingAdd(false)
    }
  }

  // ----------------------------------------------------
  // ACTION: TRANSFER STUDENT
  // ----------------------------------------------------
  const openTransferModal = (student) => {
    const availableTargets = classes.filter((c) => c._id !== selectedClassId)
    const defaultTarget = availableTargets.length > 0 ? availableTargets[0]._id : ''

    setTransferModal({
      isOpen: true,
      student,
      targetClassId: defaultTarget,
      note: '',
      isConfirming: false,
    })
    setTransferError(null)
  }

  const destinationClass = useMemo(() => {
    return classes.find((c) => c._id === transferModal.targetClassId) || null
  }, [classes, transferModal.targetClassId])

  const isDestinationFull = useMemo(() => {
    if (!destinationClass) return false
    return (
      (destinationClass.currentStudents || destinationClass.studentCount || 0) >=
      (destinationClass.capacity || 45)
    )
  }, [destinationClass])

  const handleProceedToConfirmTransfer = (e) => {
    e.preventDefault()
    if (!transferModal.targetClassId) {
      setTransferError('Vui lòng chọn lớp chuyển đến!')
      return
    }
    if (transferModal.targetClassId === selectedClassId) {
      setTransferError('Lớp chuyển đến phải khác lớp hiện tại!')
      return
    }
    if (isDestinationFull) {
      setTransferError(
        `Lớp đích ${destinationClass?.name} đã đủ sĩ số tối đa (${destinationClass?.capacity} học sinh)!`
      )
      return
    }
    setTransferError(null)
    setTransferModal((prev) => ({ ...prev, isConfirming: true }))
  }

  const handleExecuteTransfer = async () => {
    setSubmittingTransfer(true)
    setTransferError(null)
    try {
      const res = await academicApi.transferStudent({
        studentId: transferModal.student._id,
        fromClassId: selectedClassId,
        toClassId: transferModal.targetClassId,
        note: transferModal.note.trim(),
      })
      setSuccessMsg(
        res?.message ||
          `Đã chuyển học sinh '${transferModal.student.fullName}' sang lớp '${destinationClass?.name}' thành công!`
      )
      setTransferModal({
        isOpen: false,
        student: null,
        targetClassId: '',
        note: '',
        isConfirming: false,
      })
      // Refresh
      fetchStudentsOfClass(selectedClassId)
      fetchClassesAndGrades()
      if (activeTab === 'history') fetchClassHistoryData(selectedClassId)
    } catch (err) {
      setTransferError(extractErrMsg(err))
      setTransferModal((prev) => ({ ...prev, isConfirming: false }))
    } finally {
      setSubmittingTransfer(false)
    }
  }

  // ----------------------------------------------------
  // ACTION: REMOVE STUDENT FROM CLASS
  // ----------------------------------------------------
  const openRemoveModal = (student) => {
    setRemoveModal({
      isOpen: true,
      student,
      note: '',
    })
    setRemoveError(null)
  }

  const handleConfirmRemove = async (e) => {
    e.preventDefault()
    setSubmittingRemove(true)
    setRemoveError(null)
    try {
      const res = await academicApi.removeStudentFromClass(
        selectedClassId,
        removeModal.student._id,
        { note: removeModal.note.trim() }
      )
      setSuccessMsg(
        res?.message ||
          `Đã xóa học sinh '${removeModal.student.fullName}' khỏi lớp '${currentClass?.name}' thành công!`
      )
      setRemoveModal({
        isOpen: false,
        student: null,
        note: '',
      })
      // Refresh
      fetchStudentsOfClass(selectedClassId)
      fetchClassesAndGrades()
      if (activeTab === 'history') fetchClassHistoryData(selectedClassId)
    } catch (err) {
      setRemoveError(extractErrMsg(err))
    } finally {
      setSubmittingRemove(false)
    }
  }

  // Capacity calculations for current class
  const currentCount = classData?.totalStudents ?? (currentClass?.currentStudents || currentClass?.studentCount || 0)
  const capacity = currentClass?.capacity || 45
  const remainingSlots = Math.max(0, capacity - currentCount)
  const capacityPercentage = Math.min(100, Math.round((currentCount / capacity) * 100))
  const isClassFull = currentCount >= capacity

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
            <Link
              to="/admin/academic-structure"
              className="hover:text-blue-600 transition-colors flex items-center gap-1"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Cơ cấu học vụ</span>
            </Link>
            <ChevronDown className="w-3 h-3 -rotate-90 text-slate-400" />
            <span className="text-slate-800 font-semibold">Quản lý học sinh theo lớp</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-7 h-7 text-blue-600" />
            <span>Quản lý Danh sách Học sinh theo Lớp</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Tra cứu học sinh, xếp học sinh vào lớp, điều chuyển lớp và theo dõi biến động sĩ số học vụ.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setLoadingClasses(true)
              setLoadingStudents(true)
              fetchClassesAndGrades()
              if (selectedClassId) fetchStudentsOfClass(selectedClassId)
            }}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            title="Tải lại dữ liệu"
          >
            <RefreshCw className="w-4 h-4 text-slate-500" />
            <span>Làm mới</span>
          </button>
          <Link
            to="/admin/academic-structure"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors border border-blue-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Về Cơ cấu học vụ</span>
          </Link>
        </div>
      </div>

      {/* Global Alerts */}
      {successMsg && (
        <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm animate-fadeIn">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-medium">{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="p-1 hover:bg-emerald-100 rounded-lg text-emerald-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center justify-between p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm animate-fadeIn">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="font-medium">{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="p-1 hover:bg-rose-100 rounded-lg text-rose-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Class Selection & Filter Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Năm học */}
          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Năm học
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <select
                value={selectedYear}
                onChange={(e) => handleYearChange(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white cursor-pointer"
              >
                {academicYears.map((yr) => (
                  <option key={yr} value={yr}>
                    Năm học {yr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Khối học */}
          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Lọc theo Khối
            </label>
            <div className="relative">
              <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <select
                value={selectedGradeId}
                onChange={(e) => setSelectedGradeId(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white cursor-pointer"
              >
                <option value="ALL">Tất cả các khối (10, 11, 12)</option>
                {grades.map((g) => (
                  <option key={g._id} value={g._id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Chọn Lớp học */}
          <div className="md:col-span-6">
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Chọn Lớp học đang quản lý
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <select
                value={selectedClassId}
                onChange={(e) => handleSelectClass(e.target.value)}
                disabled={loadingClasses || filteredClasses.length === 0}
                className="w-full pl-9 pr-8 py-2 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white cursor-pointer disabled:bg-slate-100 disabled:cursor-not-allowed"
              >
                {filteredClasses.length === 0 ? (
                  <option value="">Không có lớp học nào trong bộ lọc này</option>
                ) : (
                  filteredClasses.map((c) => (
                    <option key={c._id} value={c._id}>
                      Lớp {c.name} ({c.grade?.name || 'Khối'}) • Sĩ số:{' '}
                      {c.currentStudents || c.studentCount || 0}/{c.capacity || 45} học sinh
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
        </div>
      </div>

      {loadingClasses ? (
        <LoadingSpinner text="Đang tải danh mục lớp học..." />
      ) : !currentClass ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">Chưa có lớp học nào</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Vui lòng tạo lớp học trong mục Cơ cấu học vụ trước khi thực hiện xếp lớp học sinh.
          </p>
          <Link
            to="/admin/academic-structure"
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs"
          >
            <span>Tạo lớp học mới</span>
          </Link>
        </div>
      ) : (
        <>
          {/* Class Overview Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-50/80 to-transparent rounded-bl-full pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Left Column: Basic Class Info */}
              <div className="lg:col-span-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-blue-500/20">
                    {currentClass.name?.slice(0, 3)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                        Lớp {currentClass.name}
                      </h2>
                      <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-md border border-blue-200">
                        {currentClass.grade?.name || 'Khối'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Năm học {currentClass.academicYear || selectedYear} • Phòng học:{' '}
                      <span className="font-semibold text-slate-700">
                        {currentClass.room || 'Chưa xếp phòng'}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 text-xs">
                  <span className="text-slate-400 font-medium">Giáo viên chủ nhiệm:</span>
                  {currentClass.homeroomTeacher ? (
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px]">
                        {currentClass.homeroomTeacher.fullName?.charAt(0)}
                      </div>
                      <span className="font-bold text-slate-800">
                        {currentClass.homeroomTeacher.fullName}
                      </span>
                      <span className="text-slate-400 font-mono text-[11px]">
                        ({currentClass.homeroomTeacher.userCode})
                      </span>
                    </div>
                  ) : (
                    <p className="text-amber-600 font-medium italic mt-1">
                      Chưa phân công giáo viên chủ nhiệm
                    </p>
                  )}
                </div>
              </div>

              {/* Middle Column: Capacity and Progress Bar */}
              <div className="lg:col-span-5 bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600">Sĩ số lớp học:</span>
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className="text-base text-slate-900">{currentCount}</span>
                    <span className="text-slate-400">/</span>
                    <span className="text-slate-600">{capacity} học sinh</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-500 ${
                      isClassFull
                        ? 'bg-rose-500'
                        : capacityPercentage >= 85
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${capacityPercentage}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-medium">
                    Tỷ lệ lấp đầy: <strong className="text-slate-800">{capacityPercentage}%</strong>
                  </span>
                  {isClassFull ? (
                    <span className="text-rose-600 font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Lớp đã đủ sĩ số
                    </span>
                  ) : (
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      Còn trống {remainingSlots} chỗ
                    </span>
                  )}
                </div>
              </div>

              {/* Right Column: Add Student Action Button */}
              <div className="lg:col-span-3 flex flex-col justify-center items-end gap-2">
                <button
                  type="button"
                  onClick={openAddModal}
                  disabled={isClassFull}
                  className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-xs ${
                    isClassFull
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                      : 'bg-blue-600 hover:bg-blue-700 active:scale-98 text-white shadow-blue-500/20'
                  }`}
                  title={isClassFull ? 'Lớp đã đủ sĩ số tối đa' : 'Thêm học sinh mới vào lớp'}
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Xếp học sinh vào lớp</span>
                </button>
                {isClassFull && (
                  <p className="text-[11px] text-rose-500 text-right">
                    * Đã đạt giới hạn tối đa {capacity} học sinh
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Navigation Tabs (Danh sách học sinh / Lịch sử chuyển lớp) */}
          <div className="border-b border-slate-200 flex items-center justify-between gap-4">
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => handleTabChange('students')}
                className={`flex items-center gap-2 pb-3 px-1 border-b-2 text-sm font-bold transition-colors ${
                  activeTab === 'students'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Danh sách học sinh ({currentCount})</span>
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('history')}
                className={`flex items-center gap-2 pb-3 px-1 border-b-2 text-sm font-bold transition-colors ${
                  activeTab === 'history'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <History className="w-4 h-4" />
                <span>Lịch sử xếp lớp & chuyển lớp</span>
              </button>
            </div>
          </div>

          {/* ========================================================
              TAB 1: DANH SÁCH HỌC SINH THEO LỚP
          ======================================================== */}
          {activeTab === 'students' && (
            <div className="space-y-4">
              {/* Search & Action Bar */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm theo họ tên, mã học sinh, email..."
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    className="w-full pl-9 pr-9 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                  {searchKeyword && (
                    <button
                      type="button"
                      onClick={() => setSearchKeyword('')}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>Hiển thị:</span>
                  <span className="font-bold text-slate-800">
                    {filteredStudents.length} / {currentCount} học sinh
                  </span>
                </div>
              </div>

              {/* Table of Students */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                {loadingStudents ? (
                  <div className="py-12">
                    <LoadingSpinner text="Đang tải danh sách học sinh..." />
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="p-12 text-center">
                    <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-slate-800">
                      {searchKeyword ? 'Không tìm thấy học sinh phù hợp' : 'Lớp chưa có học sinh nào'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                      {searchKeyword
                        ? `Không có kết quả nào khớp với từ khóa "${searchKeyword}". Hãy thử tìm kiếm bằng từ khóa khác.`
                        : `Lớp ${currentClass.name} hiện tại chưa có học sinh được phân công. Hãy bấm nút xếp học sinh để bắt đầu.`}
                    </p>
                    {searchKeyword ? (
                      <button
                        type="button"
                        onClick={() => setSearchKeyword('')}
                        className="mt-4 px-3.5 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
                      >
                        Xóa từ khóa tìm kiếm
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={openAddModal}
                        className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>Xếp học sinh vào lớp ngay</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4 w-12 text-center">STT</th>
                          <th className="py-3 px-4">Mã học sinh</th>
                          <th className="py-3 px-4">Họ và tên</th>
                          <th className="py-3 px-4">Email</th>
                          <th className="py-3 px-4">Trạng thái</th>
                          <th className="py-3 px-4">Ngày tham gia</th>
                          <th className="py-3 px-4 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {filteredStudents.map((st, index) => (
                          <tr
                            key={st._id}
                            className="hover:bg-slate-50/80 transition-colors group"
                          >
                            <td className="py-3.5 px-4 text-center font-medium text-slate-400">
                              {index + 1}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                                {st.userCode}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                                  {st.fullName?.charAt(0) || 'H'}
                                </div>
                                <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                                  {st.fullName}
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-slate-600">
                              <div className="flex items-center gap-1.5">
                                <Mail className="w-3.5 h-3.5 text-slate-400" />
                                <span>{st.email}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              {st.isActivated ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <ShieldCheck className="w-3 h-3" />
                                  Đã kích hoạt
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                  <Clock className="w-3 h-3" />
                                  Chưa kích hoạt
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-slate-500 font-medium">
                              {st.createdAt
                                ? new Date(st.createdAt).toLocaleDateString('vi-VN')
                                : '-'}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => openTransferModal(st)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                                  title="Chuyển học sinh sang lớp khác"
                                >
                                  <ArrowRightLeft className="w-3.5 h-3.5" />
                                  <span>Chuyển lớp</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openRemoveModal(st)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200"
                                  title="Xóa học sinh khỏi lớp này"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Xóa</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 2: LỊCH SỬ XẾP LỚP & CHUYỂN LỚP
          ======================================================== */}
          {activeTab === 'history' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-blue-600" />
                  <h3 className="font-bold text-sm text-slate-800">
                    Lịch sử biến động sĩ số của Lớp {currentClass.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setLoadingHistory(true)
                    fetchClassHistoryData(selectedClassId)
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Tải lại lịch sử</span>
                </button>
              </div>

              {loadingHistory ? (
                <div className="py-12">
                  <LoadingSpinner text="Đang tải lịch sử lớp học..." />
                </div>
              ) : classHistory.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Chưa có dữ liệu lịch sử nào được ghi nhận cho lớp học này.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Thời gian</th>
                        <th className="py-3 px-4">Học sinh</th>
                        <th className="py-3 px-4">Hành động</th>
                        <th className="py-3 px-4">Biến động</th>
                        <th className="py-3 px-4">Người thực hiện</th>
                        <th className="py-3 px-4">Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {classHistory.map((item) => (
                        <tr key={item._id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                            {item.changedAt
                              ? new Date(item.changedAt).toLocaleString('vi-VN')
                              : '-'}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-800">
                            {item.student ? (
                              <div>
                                <p>{item.student.fullName}</p>
                                <span className="font-mono text-[10px] text-slate-400">
                                  {item.student.userCode}
                                </span>
                              </div>
                            ) : (
                              'Học sinh'
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {item.action === 'ASSIGN' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                XẾP VÀO LỚP
                              </span>
                            )}
                            {item.action === 'REMOVE' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                XÓA KHỎI LỚP
                              </span>
                            )}
                            {item.action === 'TRANSFER' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                CHUYỂN LỚP
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5 text-xs">
                              <span className="font-semibold text-slate-600">
                                {item.fromClass?.name || 'Chưa phân lớp'}
                              </span>
                              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                              <span className="font-semibold text-blue-700">
                                {item.toClass?.name || 'Rời lớp'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-600 font-medium">
                            {item.changedBy?.fullName || 'Quản trị viên'}
                          </td>
                          <td className="py-3 px-4 text-slate-500 italic">
                            {item.note || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ========================================================
          MODAL 1: THÊM HỌC SINH VÀO LỚP
      ======================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Xếp học sinh vào lớp {currentClass?.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Sĩ số hiện tại: {currentCount}/{capacity} • Còn trống {remainingSlots} chỗ
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {addModalError && (
                <div className="flex items-center gap-2.5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{addModalError}</span>
                </div>
              )}

              {/* Search in unassigned students */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Tìm học sinh chưa phân lớp theo họ tên, mã số, email..."
                  value={unassignedSearch}
                  onChange={(e) => setUnassignedSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              {/* Selection Bar */}
              <div className="flex items-center justify-between text-xs py-1 px-1">
                <div className="flex items-center gap-2">
                  <span className="text-slate-600 font-medium">
                    Danh sách học sinh chưa phân lớp ({filteredUnassignedStudents.length}):
                  </span>
                  {selectedStudentIds.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700">
                      Đã chọn: {selectedStudentIds.length}
                    </span>
                  )}
                </div>
                {filteredUnassignedStudents.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSelectAllUnassigned}
                    className="text-blue-600 hover:text-blue-800 font-semibold text-xs"
                  >
                    {selectedStudentIds.length === filteredUnassignedStudents.length
                      ? 'Bỏ chọn tất cả'
                      : 'Chọn tất cả'}
                  </button>
                )}
              </div>

              {/* Students list */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto divide-y divide-slate-100">
                {loadingUnassigned ? (
                  <div className="py-8">
                    <LoadingSpinner text="Đang tải học sinh chưa phân lớp..." />
                  </div>
                ) : filteredUnassignedStudents.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    {unassignedSearch
                      ? 'Không tìm thấy học sinh nào phù hợp.'
                      : 'Không có học sinh nào chưa phân lớp trong hệ thống.'}
                  </div>
                ) : (
                  filteredUnassignedStudents.map((st) => {
                    const isChecked = selectedStudentIds.includes(st._id)
                    return (
                      <div
                        key={st._id}
                        onClick={() => toggleSelectStudent(st._id)}
                        className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
                          isChecked ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}} // Controlled by container onClick
                            className="w-4 h-4 text-blue-600 rounded-sm border-slate-300 focus:ring-blue-500 cursor-pointer"
                          />
                          <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
                            {st.fullName?.charAt(0) || 'H'}
                          </div>
                          <div>
                            <p className="font-bold text-xs text-slate-900">{st.fullName}</p>
                            <p className="text-[11px] text-slate-500 font-mono">
                              {st.userCode} • {st.email}
                            </p>
                          </div>
                        </div>
                        {isChecked && (
                          <span className="text-blue-600 font-bold text-xs flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    )
                  })
                )}
              </div>

              {/* Capacity Warning */}
              {selectedStudentIds.length + currentCount > capacity && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>
                    Cảnh báo: Sĩ số sau khi thêm ({currentCount + selectedStudentIds.length}) sẽ vượt quá giới hạn tối đa của lớp ({capacity})!
                  </span>
                </div>
              )}

              {/* Note field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ghi chú xếp lớp (không bắt buộc)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Xếp lớp đầu năm học, chuyển tuyến..."
                  value={addNote}
                  onChange={(e) => setAddNote(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmAddStudents}
                disabled={
                  submittingAdd ||
                  selectedStudentIds.length === 0 ||
                  selectedStudentIds.length + currentCount > capacity
                }
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-xl transition-all shadow-xs flex items-center gap-2"
              >
                {submittingAdd ? (
                  <>
                    <LoadingSpinner text="" />
                    <span>Đang thêm...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Thêm {selectedStudentIds.length} học sinh vào lớp</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 2: CHUYỂN HỌC SINH SANG LỚP KHÁC
      ======================================================== */}
      {transferModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    {transferModal.isConfirming
                      ? 'Xác nhận chuyển lớp học sinh'
                      : 'Chuyển học sinh sang lớp khác'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Học sinh: {transferModal.student?.fullName} ({transferModal.student?.userCode})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setTransferModal({
                    isOpen: false,
                    student: null,
                    targetClassId: '',
                    note: '',
                    isConfirming: false,
                  })
                }
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {transferError && (
                <div className="flex items-center gap-2.5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{transferError}</span>
                </div>
              )}

              {/* Visual Transition Route */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs">
                <div className="flex-1 text-center">
                  <span className="text-[11px] text-slate-500 block">Lớp hiện tại (Nguồn)</span>
                  <strong className="text-sm font-bold text-slate-800 block mt-0.5">
                    Lớp {currentClass?.name}
                  </strong>
                  <span className="text-[11px] text-slate-500">
                    Sĩ số: {currentCount}/{capacity}
                  </span>
                </div>
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <ArrowRight className="w-4 h-4" />
                </div>
                <div className="flex-1 text-center">
                  <span className="text-[11px] text-slate-500 block">Lớp chuyển đến (Đích)</span>
                  <strong className="text-sm font-bold text-blue-700 block mt-0.5">
                    {destinationClass ? `Lớp ${destinationClass.name}` : 'Chưa chọn lớp'}
                  </strong>
                  <span className="text-[11px] text-slate-500">
                    {destinationClass
                      ? `Sĩ số: ${destinationClass.currentStudents || destinationClass.studentCount || 0}/${destinationClass.capacity || 45}`
                      : '-'}
                  </span>
                </div>
              </div>

              {!transferModal.isConfirming ? (
                <>
                  {/* Select Destination Class */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                      Chọn lớp học đích (chuyển đến)
                    </label>
                    <select
                      value={transferModal.targetClassId}
                      onChange={(e) =>
                        setTransferModal((prev) => ({
                          ...prev,
                          targetClassId: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white cursor-pointer"
                    >
                      <option value="">-- Chọn lớp học đích --</option>
                      {classes
                        .filter((c) => c._id !== selectedClassId)
                        .map((c) => {
                          const cCount = c.currentStudents || c.studentCount || 0
                          const cCap = c.capacity || 45
                          const full = cCount >= cCap
                          return (
                            <option key={c._id} value={c._id} disabled={full}>
                              Lớp {c.name} ({c.grade?.name || 'Khối'}) — Sĩ số: {cCount}/{cCap}{' '}
                              {full ? '[ĐÃ ĐỦ SĨ SỐ]' : `[Còn ${cCap - cCount} chỗ]`}
                            </option>
                          )
                        })}
                    </select>
                  </div>

                  {/* Warning if destination class is full */}
                  {isDestinationFull && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>
                        Lớp đích '{destinationClass?.name}' đã đủ sĩ số tối đa. Vui lòng chọn lớp khác!
                      </span>
                    </div>
                  )}

                  {/* Transfer Note */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Lý do / Ghi chú chuyển lớp (không bắt buộc)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Ví dụ: Theo nguyện vọng phụ huynh, điều chỉnh tổ hợp chuyên môn..."
                      value={transferModal.note}
                      onChange={(e) =>
                        setTransferModal((prev) => ({
                          ...prev,
                          note: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    />
                  </div>
                </>
              ) : (
                /* Confirmation Screen (Step 2) */
                <div className="space-y-3 py-2">
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs space-y-2">
                    <p className="font-bold flex items-center gap-1.5 text-amber-900">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      Xác nhận hành động chuyển lớp học sinh:
                    </p>
                    <p>
                      Bạn sắp chuyển học sinh{' '}
                      <strong>{transferModal.student?.fullName}</strong> (Mã:{' '}
                      <span className="font-mono">{transferModal.student?.userCode}</span>) từ{' '}
                      <strong>Lớp {currentClass?.name}</strong> sang{' '}
                      <strong>Lớp {destinationClass?.name}</strong>.
                    </p>
                    <p className="text-[11px] text-amber-700">
                      • Sĩ số lớp {currentClass?.name} sẽ giảm 1.<br />
                      • Sĩ số lớp {destinationClass?.name} sẽ tăng 1.<br />
                      • Hệ thống sẽ tự động cập nhật phân lớp và lưu vào lịch sử học vụ.
                    </p>
                  </div>

                  {transferModal.note && (
                    <div className="text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="font-semibold text-slate-500">Lý do ghi nhận:</span>{' '}
                      <span className="text-slate-800 italic">{transferModal.note}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              {!transferModal.isConfirming ? (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setTransferModal({
                        isOpen: false,
                        student: null,
                        targetClassId: '',
                        note: '',
                        isConfirming: false,
                      })
                    }
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    onClick={handleProceedToConfirmTransfer}
                    disabled={!transferModal.targetClassId || isDestinationFull}
                    className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-xl transition-all shadow-xs flex items-center gap-2"
                  >
                    <span>Tiếp tục xác nhận</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setTransferModal((prev) => ({ ...prev, isConfirming: false }))
                    }
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
                  >
                    Quay lại
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteTransfer}
                    disabled={submittingTransfer}
                    className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 rounded-xl transition-all shadow-xs flex items-center gap-2"
                  >
                    {submittingTransfer ? (
                      <>
                        <LoadingSpinner text="" />
                        <span>Đang chuyển lớp...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Xác nhận chuyển ngay</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 3: XÓA HỌC SINH KHỎI LỚP
      ======================================================== */}
      {removeModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-rose-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold">
                  <UserX className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Xóa học sinh khỏi lớp
                  </h3>
                  <p className="text-xs text-slate-500">
                    Lớp: {currentClass?.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setRemoveModal({
                    isOpen: false,
                    student: null,
                    note: '',
                  })
                }
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {removeError && (
                <div className="flex items-center gap-2.5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{removeError}</span>
                </div>
              )}

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                <p className="text-slate-500">Học sinh được chọn:</p>
                <p className="text-sm font-bold text-slate-900">
                  {removeModal.student?.fullName}
                </p>
                <p className="text-slate-500 font-mono">
                  Mã: {removeModal.student?.userCode} • Email: {removeModal.student?.email}
                </p>
              </div>

              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  Lưu ý khi xóa học sinh:
                </p>
                <p className="text-[11px] text-rose-700 leading-relaxed">
                  Học sinh sẽ được đưa về trạng thái <strong>Chưa phân lớp</strong> để Admin có thể xếp vào lớp khác sau. Dữ liệu tài khoản của học sinh không bị xóa khỏi hệ thống.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Lý do xóa / Ghi chú (không bắt buộc)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Rút hồ sơ, chuyển trường, bảo lưu..."
                  value={removeModal.note}
                  onChange={(e) =>
                    setRemoveModal((prev) => ({
                      ...prev,
                      note: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-rose-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() =>
                  setRemoveModal({
                    isOpen: false,
                    student: null,
                    note: '',
                  })
                }
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmRemove}
                disabled={submittingRemove}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 rounded-xl transition-all shadow-xs flex items-center gap-2"
              >
                {submittingRemove ? (
                  <>
                    <LoadingSpinner text="" />
                    <span>Đang xóa...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Xác nhận xóa khỏi lớp</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ClassStudentsPage
