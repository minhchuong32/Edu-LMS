import { useState, useEffect, useMemo, useId } from 'react'
import academicApi from '@/api/academicApi'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import {
  Building2,
  BookOpen,
  GraduationCap,
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  UserCheck,
  Calendar,
  AlertCircle,
  CheckCircle2,
  X,
  Layers,
  Sparkles,
  BookMarked,
  Info,
  ChevronRight,
  FolderOpen,
  Folder,
  Clock,
  LayoutGrid,
  List,
  Check,
} from 'lucide-react'

export const AcademicStructurePage = () => {
  const [activeTab, setActiveTab] = useState('classes') // 'classes' | 'assignments' | 'subjects' | 'grades'
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  // Data states
  const [grades, setGrades] = useState([])
  const [subjects, setSubjects] = useState([])
  const [classes, setClasses] = useState([])
  const [assignments, setAssignments] = useState([])
  const [teachers, setTeachers] = useState([])

  // Filters & Views
  const [selectedYear, setSelectedYear] = useState('2025-2026')
  const [selectedGradeFilter, setSelectedGradeFilter] = useState('ALL')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'table'

  // Modal states
  const [modalType, setModalType] = useState(null) // 'createClass' | 'editClass' | 'assignHomeroom' | 'createSubject' | 'editSubject' | 'createAssignment' | 'createGrade' | 'delete'
  const [selectedItem, setSelectedItem] = useState(null)
  const [formData, setFormData] = useState({})
  const [formError, setFormError] = useState(null)
  const [formSubmitting, setFormSubmitting] = useState(false)

  // Autocomplete / Searchable dropdown state for Teacher selection
  const [teacherSearchQuery, setTeacherSearchQuery] = useState('')
  const [isTeacherDropdownOpen, setIsTeacherDropdownOpen] = useState(false)

  // Real-time conflict preview state
  const [conflictChecking, setConflictChecking] = useState(false)
  const [conflictWarning, setConflictWarning] = useState(null)

  // Temporary slot input in Assignment modal
  const [tempSlot, setTempSlot] = useState({
    dayOfWeek: 2,
    startPeriod: 1,
    endPeriod: 2,
    room: '',
  })

  // Form input unique IDs
  const gradeNameId = useId()
  const gradeDescId = useId()
  const classGradeId = useId()
  const classNameId = useId()
  const classAcademicYearId = useId()
  const classHomeroomTeacherId = useId()
  const classRoomId = useId()
  const classCapacityId = useId()
  const classDescriptionId = useId()
  const subjectNameId = useId()
  const subjectCodeId = useId()
  const subjectGradeLevelId = useId()
  const subjectPeriodsId = useId()
  const subjectDescriptionId = useId()
  const assignmentClassId = useId()
  const assignmentSubjectId = useId()
  const assignmentSemesterId = useId()
  const assignmentPeriodsId = useId()
  const assignmentNoteId = useId()

  const academicYears = ['2025-2026', '2026-2027', '2024-2025']

  // Helper: extract error message from axiosClient rejection (object or Error)
  const extractErrMsg = (err) =>
    err?.message || err?.data?.message || 'Không thể tải dữ liệu cơ cấu học vụ!'

  // Re-fetch data on user actions
  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [gradesRes, subjectsRes, classesRes, assignmentsRes, teachersRes] =
        await Promise.allSettled([
          academicApi.getGrades(),
          academicApi.getSubjects(),
          academicApi.getClasses(),
          academicApi.getAssignments(),
          academicApi.getTeachers({ academicYear: selectedYear }),
        ])

      // Kiểm tra xem có request cốt lõi nào thất bại không
      const coreFailure = [gradesRes, subjectsRes, classesRes].find(
        (r) => r.status === 'rejected'
      )
      if (coreFailure) {
        setError(extractErrMsg(coreFailure.reason))
        return
      }

      setGrades(gradesRes.value?.data || [])
      setSubjects(subjectsRes.value?.data || [])
      setClasses(classesRes.value?.data || [])
      setAssignments(assignmentsRes.status === 'fulfilled' ? (assignmentsRes.value?.data || []) : [])
      setTeachers(teachersRes.status === 'fulfilled' ? (teachersRes.value?.data || []) : [])
    } catch (err) {
      setError(extractErrMsg(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let ignore = false
    const loadInitialData = async () => {
      try {
        const [gradesRes, subjectsRes, classesRes, assignmentsRes, teachersRes] =
          await Promise.allSettled([
            academicApi.getGrades(),
            academicApi.getSubjects(),
            academicApi.getClasses(),
            academicApi.getAssignments(),
            academicApi.getTeachers({ academicYear: selectedYear }),
          ])

        if (!ignore) {
          const coreFailure = [gradesRes, subjectsRes, classesRes].find(
            (r) => r.status === 'rejected'
          )
          if (coreFailure) {
            setError(extractErrMsg(coreFailure.reason))
            setLoading(false)
            return
          }

          setGrades(gradesRes.value?.data || [])
          setSubjects(subjectsRes.value?.data || [])
          setClasses(classesRes.value?.data || [])
          setAssignments(assignmentsRes.status === 'fulfilled' ? (assignmentsRes.value?.data || []) : [])
          setTeachers(teachersRes.status === 'fulfilled' ? (teachersRes.value?.data || []) : [])
          setLoading(false)
        }
      } catch (err) {
        if (!ignore) {
          setError(extractErrMsg(err))
          setLoading(false)
        }
      }
    }

    loadInitialData()
    return () => {
      ignore = true
    }
  }, [selectedYear])

  // Auto clear notification banner after 4s
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [successMsg])

  // Filtered classes
  const filteredClasses = useMemo(() => {
    return classes.filter((cls) => {
      const matchYear = !selectedYear || cls.academicYear === selectedYear
      const matchGrade =
        selectedGradeFilter === 'ALL' ||
        cls.grade?._id === selectedGradeFilter ||
        cls.grade?.level?.toString() === selectedGradeFilter
      const matchSearch =
        !searchKeyword ||
        cls.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        cls.room?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        cls.homeroomTeacher?.fullName?.toLowerCase().includes(searchKeyword.toLowerCase())
      return matchYear && matchGrade && matchSearch
    })
  }, [classes, selectedYear, selectedGradeFilter, searchKeyword])

  // Filtered assignments
  const filteredAssignments = useMemo(() => {
    return assignments.filter((assign) => {
      const matchYear = !selectedYear || assign.academicYear === selectedYear
      const matchSearch =
        !searchKeyword ||
        assign.class?.name?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        assign.subject?.name?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        assign.teacher?.fullName?.toLowerCase().includes(searchKeyword.toLowerCase())
      return matchYear && matchSearch
    })
  }, [assignments, selectedYear, searchKeyword])

  // Filtered subjects
  const filteredSubjects = useMemo(() => {
    return subjects.filter((subj) => {
      return (
        !searchKeyword ||
        subj.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        subj.code.toLowerCase().includes(searchKeyword.toLowerCase())
      )
    })
  }, [subjects, searchKeyword])

  // Filtered teachers for autocomplete
  const filteredTeachersForSearch = useMemo(() => {
    if (!teacherSearchQuery.trim()) return teachers
    const q = teacherSearchQuery.toLowerCase()
    return teachers.filter(
      (t) =>
        t.fullName?.toLowerCase().includes(q) ||
        t.userCode?.toLowerCase().includes(q) ||
        t.email?.toLowerCase().includes(q)
    )
  }, [teachers, teacherSearchQuery])

  // Tree statistics by grade
  const gradeTreeStats = useMemo(() => {
    return grades.map((g) => {
      const gradeClasses = classes.filter(
        (cls) =>
          cls.academicYear === selectedYear &&
          (cls.grade?._id === g._id || cls.grade?.level === g.level)
      )
      const studentTotal = gradeClasses.reduce((acc, c) => acc + (c.studentCount || 0), 0)
      const homeroomCount = gradeClasses.filter((c) => c.homeroomTeacher).length
      return {
        ...g,
        classCount: gradeClasses.length,
        studentTotal,
        homeroomCount,
      }
    })
  }, [grades, classes, selectedYear])

  // Modal Handlers
  const openCreateClassModal = (defaultGradeId = null) => {
    setFormData({
      name: '',
      grade: defaultGradeId || grades[0]?._id || '',
      academicYear: selectedYear,
      homeroomTeacher: '',
      room: '',
      capacity: 45,
      description: '',
    })
    setFormError(null)
    setSelectedItem(null)
    setModalType('createClass')
  }

  const openEditClassModal = (cls) => {
    setFormData({
      name: cls.name,
      grade: cls.grade?._id || cls.grade,
      academicYear: cls.academicYear,
      homeroomTeacher: cls.homeroomTeacher?._id || '',
      room: cls.room || '',
      capacity: cls.capacity || 45,
      description: cls.description || '',
    })
    setFormError(null)
    setSelectedItem(cls)
    setModalType('editClass')
  }

  const openAssignHomeroomModal = (cls) => {
    setFormData({
      teacherId: cls.homeroomTeacher?._id || '',
    })
    setTeacherSearchQuery(cls.homeroomTeacher?.fullName || '')
    setIsTeacherDropdownOpen(false)
    setFormError(null)
    setSelectedItem(cls)
    setModalType('assignHomeroom')
  }

  const openCreateSubjectModal = () => {
    setFormData({
      name: '',
      code: '',
      gradeLevel: '',
      periodsPerWeek: 2,
      description: '',
    })
    setFormError(null)
    setSelectedItem(null)
    setModalType('createSubject')
  }

  const openEditSubjectModal = (subj) => {
    setFormData({
      name: subj.name,
      code: subj.code,
      gradeLevel: subj.gradeLevel || '',
      periodsPerWeek: subj.periodsPerWeek || 2,
      description: subj.description || '',
    })
    setFormError(null)
    setSelectedItem(subj)
    setModalType('editSubject')
  }

  const openCreateAssignmentModal = (defaultClassId = '') => {
    const initialTeacher = teachers[0]
    setFormData({
      class: defaultClassId || classes[0]?._id || '',
      subject: subjects[0]?._id || '',
      teacher: initialTeacher?._id || '',
      academicYear: selectedYear,
      semester: 'CaNam',
      periodsPerWeek: 2,
      schedules: [],
      note: '',
    })
    setTeacherSearchQuery(initialTeacher?.fullName || '')
    setIsTeacherDropdownOpen(false)
    setConflictWarning(null)
    setTempSlot({ dayOfWeek: 2, startPeriod: 1, endPeriod: 2, room: '' })
    setFormError(null)
    setSelectedItem(null)
    setModalType('createAssignment')
  }

  const openDeleteModal = (item, type) => {
    setSelectedItem({ ...item, itemType: type })
    setModalType('delete')
  }

  const closeModal = () => {
    setModalType(null)
    setSelectedItem(null)
    setFormData({})
    setFormError(null)
    setConflictWarning(null)
    setTeacherSearchQuery('')
    setIsTeacherDropdownOpen(false)
  }

  // Live Conflict Checking helper
  const handleCheckConflictNow = async () => {
    if (!formData.class || !formData.subject || !formData.teacher) return
    setConflictChecking(true)
    setConflictWarning(null)
    try {
      const res = await academicApi.checkConflict({
        class: formData.class,
        subject: formData.subject,
        teacher: formData.teacher,
        academicYear: formData.academicYear || selectedYear,
        semester: formData.semester || 'CaNam',
        schedules: formData.schedules || [],
      })
      if (res.data?.hasConflict) {
        setConflictWarning(res.data.message)
      } else {
        setConflictWarning('Lịch giảng dạy hoàn toàn hợp lệ, không có trùng lặp.')
      }
    } catch {
      // Ignored for live check
    } finally {
      setConflictChecking(false)
    }
  }

  // Schedule Slots in Assignment Modal
  const handleAddSlot = () => {
    if (tempSlot.startPeriod > tempSlot.endPeriod) {
      setFormError('Tiết bắt đầu không thể lớn hơn tiết kết thúc!')
      return
    }
    const newSchedules = [...(formData.schedules || []), { ...tempSlot }]
    setFormData({ ...formData, schedules: newSchedules })
    setFormError(null)
  }

  const handleRemoveSlot = (index) => {
    const newSchedules = (formData.schedules || []).filter((_, i) => i !== index)
    setFormData({ ...formData, schedules: newSchedules })
  }

  // Submit Handlers
  const handleSaveClass = async (e) => {
    e.preventDefault()
    setFormError(null)
    setFormSubmitting(true)
    try {
      if (modalType === 'createClass') {
        const res = await academicApi.createClass(formData)
        setSuccessMsg(`Tạo lớp ${res.data?.name} thành công!`)
      } else {
        const res = await academicApi.updateClass(selectedItem._id, formData)
        setSuccessMsg(`Cập nhật lớp ${res.data?.name} thành công!`)
      }
      closeModal()
      fetchData()
    } catch (err) {
      setFormError(extractErrMsg(err) || 'Có lỗi xảy ra khi lưu thông tin lớp học!')
    } finally {
      setFormSubmitting(false)
    }
  }

  const handleSaveHomeroom = async (e) => {
    e.preventDefault()
    setFormError(null)
    setFormSubmitting(true)
    try {
      await academicApi.assignHomeroom(selectedItem._id, formData.teacherId || null)
      setSuccessMsg(
        formData.teacherId
          ? `Phân công GVCN cho lớp ${selectedItem.name} thành công!`
          : `Đã hủy phân công GVCN lớp ${selectedItem.name}!`
      )
      closeModal()
      fetchData()
    } catch (err) {
      setFormError(extractErrMsg(err) || 'Có lỗi xảy ra khi phân công giáo viên chủ nhiệm!')
    } finally {
      setFormSubmitting(false)
    }
  }

  const handleSaveSubject = async (e) => {
    e.preventDefault()
    setFormError(null)
    setFormSubmitting(true)
    try {
      if (modalType === 'createSubject') {
        const res = await academicApi.createSubject(formData)
        setSuccessMsg(`Tạo môn học ${res.data?.name} thành công!`)
      } else {
        const res = await academicApi.updateSubject(selectedItem._id, formData)
        setSuccessMsg(`Cập nhật môn học ${res.data?.name} thành công!`)
      }
      closeModal()
      fetchData()
    } catch (err) {
      setFormError(extractErrMsg(err) || 'Có lỗi xảy ra khi lưu môn học!')
    } finally {
      setFormSubmitting(false)
    }
  }

  const handleSaveAssignment = async (e) => {
    e.preventDefault()
    setFormError(null)
    setFormSubmitting(true)
    try {
      await academicApi.createAssignment(formData)
      setSuccessMsg('Phân công giáo viên bộ môn thành công!')
      closeModal()
      fetchData()
    } catch (err) {
      setFormError(extractErrMsg(err) || 'Có lỗi xảy ra khi phân công giảng dạy!')
    } finally {
      setFormSubmitting(false)
    }
  }

  const handleConfirmDelete = async () => {
    setFormSubmitting(true)
    try {
      if (selectedItem.itemType === 'class') {
        const res = await academicApi.deleteClass(selectedItem._id)
        setSuccessMsg(res.message || 'Xóa lớp học thành công!')
      } else if (selectedItem.itemType === 'subject') {
        const res = await academicApi.deleteSubject(selectedItem._id)
        setSuccessMsg(res.message || 'Xóa môn học thành công!')
      } else if (selectedItem.itemType === 'assignment') {
        const res = await academicApi.deleteAssignment(selectedItem._id)
        setSuccessMsg(res.message || 'Hủy phân công giảng dạy thành công!')
      } else if (selectedItem.itemType === 'grade') {
        const res = await academicApi.deleteGrade(selectedItem._id)
        setSuccessMsg(res.message || 'Xóa khối học thành công!')
      }
      closeModal()
      fetchData()
    } catch (err) {
      setFormError(extractErrMsg(err) || 'Có lỗi xảy ra khi xóa dữ liệu!')
    } finally {
      setFormSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800">
                Cơ cấu học vụ & Phân công giảng dạy
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Quản lý Khối, Lớp, Môn học, Giáo viên giảng dạy và Giáo viên chủ nhiệm
              </p>
            </div>
          </div>
        </div>

        {/* Action Button based on Active Tab */}
        <div className="flex items-center gap-3">
          {activeTab === 'classes' && (
            <button
              type="button"
              onClick={() => openCreateClassModal()}
              data-testid="add-class-btn"
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm lớp mới</span>
            </button>
          )}

          {activeTab === 'assignments' && (
            <button
              type="button"
              onClick={() => openCreateAssignmentModal()}
              data-testid="add-assignment-btn"
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Phân công bộ môn</span>
            </button>
          )}

          {activeTab === 'subjects' && (
            <button
              type="button"
              onClick={openCreateSubjectModal}
              data-testid="add-subject-btn"
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm môn học</span>
            </button>
          )}
        </div>
      </div>

      {/* Alert Notifications */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between gap-3 text-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-500 hover:text-emerald-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
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

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200 flex flex-wrap gap-2 sm:gap-6">
        <button
          type="button"
          onClick={() => setActiveTab('classes')}
          className={`flex items-center gap-2 pb-3 px-1 border-b-2 text-sm font-semibold transition-colors ${
            activeTab === 'classes'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Danh sách Lớp học</span>
          <span className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded-full font-medium">
            {classes.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('assignments')}
          className={`flex items-center gap-2 pb-3 px-1 border-b-2 text-sm font-semibold transition-colors ${
            activeTab === 'assignments'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookMarked className="w-4 h-4" />
          <span>Phân công giảng dạy</span>
          <span className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded-full font-medium">
            {assignments.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('subjects')}
          className={`flex items-center gap-2 pb-3 px-1 border-b-2 text-sm font-semibold transition-colors ${
            activeTab === 'subjects'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Danh mục Môn học</span>
          <span className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded-full font-medium">
            {subjects.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('grades')}
          className={`flex items-center gap-2 pb-3 px-1 border-b-2 text-sm font-semibold transition-colors ${
            activeTab === 'grades'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Khối học (10, 11, 12)</span>
          <span className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded-full font-medium">
            {grades.length}
          </span>
        </button>
      </div>

      {/* Filter Bar (Common for Classes, Assignments, Subjects) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Year selector */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="font-semibold text-slate-600">Năm học:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-hidden cursor-pointer"
            >
              {academicYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Search Bar */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={
                activeTab === 'classes'
                  ? 'Tìm kiếm theo tên lớp, phòng học, GVCN...'
                  : activeTab === 'assignments'
                  ? 'Tìm kiếm theo lớp, môn học, giáo viên...'
                  : 'Tìm kiếm theo tên hoặc mã môn học...'
              }
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 focus:bg-white"
            />
          </div>
        </div>

        {/* View Switcher for Classes tab */}
        {activeTab === 'classes' && (
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-blue-600 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Chế độ xem Thẻ"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'table'
                  ? 'bg-white text-blue-600 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Chế độ xem Bảng"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {loading && <LoadingSpinner text="Đang đồng bộ cơ cấu học vụ..." />}

      {/* ========================================================
          TAB 1: QUẢN LÝ THEO CẤU TRÚC KHỐI → LỚP (GRADE → CLASS TREE)
      ======================================================== */}
      {!loading && activeTab === 'classes' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* CỘT TRÁI: CÂY KHỐI HỌC (GRADE HIERARCHY TREE) */}
          <div className="lg:col-span-1 space-y-3">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100 text-xs font-bold text-slate-700 uppercase tracking-wider">
                <FolderOpen className="w-4 h-4 text-blue-600" />
                <span>Cây Khối → Lớp</span>
              </div>

              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedGradeFilter('ALL')}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition-all ${
                    selectedGradeFilter === 'ALL'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 shrink-0" />
                    <span>Tất cả các khối</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      selectedGradeFilter === 'ALL'
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {classes.filter((c) => c.academicYear === selectedYear).length} lớp
                  </span>
                </button>

                {gradeTreeStats.map((grade) => {
                  const isSelected =
                    selectedGradeFilter === grade._id ||
                    selectedGradeFilter === grade.level?.toString()

                  return (
                    <button
                      key={grade._id}
                      type="button"
                      onClick={() => setSelectedGradeFilter(grade._id)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition-all ${
                        isSelected
                          ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
                          : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isSelected ? (
                          <FolderOpen className="w-4 h-4 text-blue-600 shrink-0" />
                        ) : (
                          <Folder className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        <span>{grade.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isSelected
                              ? 'bg-blue-200 text-blue-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {grade.classCount} lớp
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Quick Summary in Sidebar */}
              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 space-y-1.5">
                <div className="flex justify-between">
                  <span>Năm học:</span>
                  <strong className="text-slate-700">{selectedYear}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Tổng lớp học:</span>
                  <strong className="text-slate-700">
                    {classes.filter((c) => c.academicYear === selectedYear).length} lớp
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: DANH SÁCH LỚP HỌC THUỘC KHỐI ĐÃ CHỌN */}
          <div className="lg:col-span-3 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-800">
                  {selectedGradeFilter === 'ALL'
                    ? `Danh sách Lớp học toàn trường (${filteredClasses.length} lớp)`
                    : `Lớp học thuộc ${
                        grades.find((g) => g._id === selectedGradeFilter)?.name || 'Khối'
                      } (${filteredClasses.length} lớp)`}
                </h2>
                <p className="text-xs text-slate-500">
                  Năm học áp dụng: {selectedYear}
                </p>
              </div>

              {selectedGradeFilter !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => openCreateClassModal(selectedGradeFilter)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-semibold transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm lớp vào khối này</span>
                </button>
              )}
            </div>

            {/* CHẾ ĐỘ XEM THẺ (GRID CARDS) */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredClasses.length === 0 ? (
                  <div className="col-span-full bg-white p-12 text-center rounded-2xl border border-slate-200">
                    <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-base font-semibold text-slate-700">
                      Chưa có lớp học nào trong khối này
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Nhấn nút &quot;Thêm lớp mới&quot; để thiết lập cơ cấu học vụ
                    </p>
                  </div>
                ) : (
                  filteredClasses.map((cls) => (
                    <div
                      key={cls._id}
                      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xl font-bold text-slate-800">
                                {cls.name}
                              </span>
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-md">
                                {cls.grade?.name || 'Khối'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Năm học: <span className="font-medium text-slate-700">{cls.academicYear}</span>
                              {cls.room && ` • Phòng: ${cls.room}`}
                            </p>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditClassModal(cls)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Chỉnh sửa thông tin lớp"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openDeleteModal(cls, 'class')}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Xóa lớp học"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* GVCN Section */}
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mb-4">
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="font-semibold text-slate-600 flex items-center gap-1.5">
                              <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                              Giáo viên chủ nhiệm:
                            </span>
                            <button
                              type="button"
                              onClick={() => openAssignHomeroomModal(cls)}
                              className="text-[11px] font-semibold text-blue-600 hover:underline"
                            >
                              {cls.homeroomTeacher ? 'Thay đổi' : 'Phân công'}
                            </button>
                          </div>

                          {cls.homeroomTeacher ? (
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                                {cls.homeroomTeacher.fullName.charAt(0)}
                              </div>
                              <div className="overflow-hidden">
                                <p className="text-xs font-bold text-slate-800 truncate">
                                  {cls.homeroomTeacher.fullName}
                                </p>
                                <p className="text-[10px] text-slate-400 truncate">
                                  {cls.homeroomTeacher.email || cls.homeroomTeacher.userCode}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-amber-600 italic flex items-center gap-1">
                              <Info className="w-3 h-3" />
                              Chưa phân công giáo viên chủ nhiệm
                            </p>
                          )}
                        </div>

                        {/* Stats Badges */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-blue-50/60 p-2.5 rounded-xl border border-blue-100/50">
                            <span className="text-[11px] text-slate-500">Sĩ số học sinh</span>
                            <p className="text-sm font-bold text-blue-700 mt-0.5">
                              {cls.studentCount || 0}{' '}
                              <span className="text-xs text-slate-400 font-normal">
                                / {cls.capacity || 45}
                              </span>
                            </p>
                          </div>
                          <div className="bg-indigo-50/60 p-2.5 rounded-xl border border-indigo-100/50">
                            <span className="text-[11px] text-slate-500">Môn đã phân công</span>
                            <p className="text-sm font-bold text-indigo-700 mt-0.5">
                              {cls.assignmentCount || 0} môn
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('assignments')
                            setSearchKeyword(cls.name)
                          }}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <span>Xem phân công môn học</span>
                          <span>→</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openCreateAssignmentModal(cls._id)}
                          className="text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          + Gán môn
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* CHẾ ĐỘ XEM BẢNG (TABLE VIEW) */}
            {viewMode === 'table' && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Tên lớp</th>
                        <th className="py-3 px-4">Khối</th>
                        <th className="py-3 px-4">Phòng học</th>
                        <th className="py-3 px-4">Giáo viên chủ nhiệm</th>
                        <th className="py-3 px-4">Sĩ số</th>
                        <th className="py-3 px-4">Môn đã phân công</th>
                        <th className="py-3 px-4 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {filteredClasses.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="py-12 text-center text-slate-400">
                            Chưa có lớp học nào phù hợp với bộ lọc hiện tại.
                          </td>
                        </tr>
                      ) : (
                        filteredClasses.map((cls) => (
                          <tr key={cls._id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3.5 px-4 font-bold text-slate-800 text-sm">
                              {cls.name}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md font-semibold text-[11px]">
                                {cls.grade?.name}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-slate-600">
                              {cls.room || '-'}
                            </td>
                            <td className="py-3.5 px-4">
                              {cls.homeroomTeacher ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                                    {cls.homeroomTeacher.fullName.charAt(0)}
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-800 truncate">
                                      {cls.homeroomTeacher.fullName}
                                    </p>
                                    <p className="text-[10px] text-slate-400">
                                      {cls.homeroomTeacher.userCode}
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => openAssignHomeroomModal(cls)}
                                  className="text-[11px] font-semibold text-blue-600 hover:underline flex items-center gap-1"
                                >
                                  + Phân công GVCN
                                </button>
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-blue-700">
                              {cls.studentCount || 0} / {cls.capacity || 45}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-indigo-700">
                              {cls.assignmentCount || 0} môn
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => openAssignHomeroomModal(cls)}
                                  className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                  title="Phân công GVCN"
                                >
                                  <UserCheck className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openEditClassModal(cls)}
                                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Chỉnh sửa thông tin lớp"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openDeleteModal(cls, 'class')}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Xóa lớp học"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 2: PHÂN CÔNG GIẢNG DẠY (TEACHING ASSIGNMENTS)
      ======================================================== */}
      {!loading && activeTab === 'assignments' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Lớp học</th>
                  <th className="py-3 px-4">Khối</th>
                  <th className="py-3 px-4">Môn học</th>
                  <th className="py-3 px-4">Giáo viên bộ môn</th>
                  <th className="py-3 px-4">Lịch giảng dạy</th>
                  <th className="py-3 px-4">Học kỳ</th>
                  <th className="py-3 px-4">Số tiết/tuần</th>
                  <th className="py-3 px-4">Năm học</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredAssignments.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="py-12 text-center text-slate-400">
                      Chưa có phân công giảng dạy nào được ghi nhận cho bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  filteredAssignments.map((assign) => (
                    <tr key={assign._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-800 text-sm">
                        {assign.class?.name}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-semibold text-[11px]">
                          Khối {assign.class?.grade?.level || '-'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        <div className="flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                          <span>{assign.subject?.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ({assign.subject?.code})
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                            {assign.teacher?.fullName?.charAt(0) || 'G'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{assign.teacher?.fullName}</p>
                            <p className="text-[10px] text-slate-400">
                              {assign.teacher?.userCode}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {assign.schedules && assign.schedules.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {assign.schedules.map((s, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-md text-[10px] font-medium"
                              >
                                {s.dayOfWeek === 8 ? 'CN' : `T${s.dayOfWeek}`}: Tiết {s.startPeriod}-{s.endPeriod}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Chưa xếp lịch</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {assign.semester === 'CaNam'
                            ? 'Cả năm'
                            : assign.semester === 'HK1'
                            ? 'Học kỳ I'
                            : 'Học kỳ II'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">
                        {assign.periodsPerWeek} tiết
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono">
                        {assign.academicYear}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => openDeleteModal(assign, 'assignment')}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Hủy phân công"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 3: DANH MỤC MÔN HỌC (SUBJECTS)
      ======================================================== */}
      {!loading && activeTab === 'subjects' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Tên môn học</th>
                  <th className="py-3 px-4">Mã môn</th>
                  <th className="py-3 px-4">Khối áp dụng</th>
                  <th className="py-3 px-4">Số tiết chuẩn / tuần</th>
                  <th className="py-3 px-4">Số phân công</th>
                  <th className="py-3 px-4">Mô tả</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredSubjects.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-400">
                      Không tìm thấy môn học nào.
                    </td>
                  </tr>
                ) : (
                  filteredSubjects.map((subj) => (
                    <tr key={subj._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-800 text-sm">
                        {subj.name}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono bg-slate-100 px-2 py-0.5 rounded-md text-slate-700 font-bold text-xs">
                          {subj.code}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {subj.gradeLevel ? (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md font-semibold text-[11px]">
                            Khối {subj.gradeLevel}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-medium text-[11px]">
                            Toàn khối (10, 11, 12)
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {subj.periodsPerWeek} tiết
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-blue-600">
                          {subj.assignmentCount || 0} lớp
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                        {subj.description || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEditSubjectModal(subj)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Sửa môn học"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openDeleteModal(subj, 'subject')}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Xóa môn học"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 4: QUẢN LÝ KHỐI HỌC (GRADES 10, 11, 12)
      ======================================================== */}
      {!loading && activeTab === 'grades' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {grades.map((grade) => (
            <div
              key={grade._id}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-md">
                    {grade.level}
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-200">
                    Đang hoạt động
                  </span>
                </div>

                <h2 className="text-lg font-bold text-slate-800">{grade.name}</h2>
                <p className="text-xs text-slate-500 mt-1">
                  {grade.description || `Chương trình giáo dục THPT Khối ${grade.level}`}
                </p>

                <div className="mt-5 p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500">
                      Số lớp trực thuộc
                    </span>
                    <p className="text-2xl font-bold text-slate-800 mt-0.5">
                      {grade.classCount || 0}
                    </p>
                  </div>
                  <Users className="w-8 h-8 text-blue-500/30" />
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('classes')
                    setSelectedGradeFilter(grade._id)
                  }}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                >
                  Xem các lớp thuộc Khối {grade.level} →
                </button>
                <button
                  type="button"
                  onClick={() => openDeleteModal(grade, 'grade')}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Xóa khối học"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================
          MODAL: THÊM / SỬA LỚP HỌC
      ======================================================== */}
      {(modalType === 'createClass' || modalType === 'editClass') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">
                {modalType === 'createClass' ? 'Thêm Lớp học mới' : 'Chỉnh sửa Lớp học'}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveClass} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor={classNameId} className="block text-xs font-semibold text-slate-700 mb-1">
                    Tên lớp <span className="text-red-500">*</span>
                  </label>
                  <input
                    id={classNameId}
                    type="text"
                    required
                    placeholder="Ví dụ: 10A1, 11B2"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value.toUpperCase() })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-bold uppercase"
                  />
                </div>

                <div>
                  <label htmlFor={classGradeId} className="block text-xs font-semibold text-slate-700 mb-1">
                    Khối học <span className="text-red-500">*</span>
                  </label>
                  <select
                    id={classGradeId}
                    required
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden cursor-pointer"
                  >
                    {grades.map((g) => (
                      <option key={g._id} value={g._id}>
                        {g.name} (Khối {g.level})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor={classAcademicYearId} className="block text-xs font-semibold text-slate-700 mb-1">
                    Năm học <span className="text-red-500">*</span>
                  </label>
                  <input
                    id={classAcademicYearId}
                    type="text"
                    required
                    placeholder="2025-2026"
                    value={formData.academicYear}
                    onChange={(e) =>
                      setFormData({ ...formData, academicYear: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label htmlFor={classRoomId} className="block text-xs font-semibold text-slate-700 mb-1">
                    Phòng học
                  </label>
                  <input
                    id={classRoomId}
                    type="text"
                    placeholder="Ví dụ: P102, A201"
                    value={formData.room}
                    onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label htmlFor={classHomeroomTeacherId} className="block text-xs font-semibold text-slate-700 mb-1">
                  Giáo viên chủ nhiệm
                </label>
                <select
                  id={classHomeroomTeacherId}
                  value={formData.homeroomTeacher}
                  onChange={(e) =>
                    setFormData({ ...formData, homeroomTeacher: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden cursor-pointer"
                >
                  <option value="">-- Chưa chỉ định GVCN --</option>
                  {teachers.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.fullName} ({t.userCode} - {t.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor={classCapacityId} className="block text-xs font-semibold text-slate-700 mb-1">
                    Sĩ số tối đa
                  </label>
                  <input
                    id={classCapacityId}
                    type="number"
                    min="1"
                    max="60"
                    value={formData.capacity}
                    onChange={(e) =>
                      setFormData({ ...formData, capacity: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label htmlFor={classDescriptionId} className="block text-xs font-semibold text-slate-700 mb-1">
                    Ghi chú
                  </label>
                  <input
                    id={classDescriptionId}
                    type="text"
                    placeholder="Lớp chọn chuyên Toán..."
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs"
                >
                  {formSubmitting ? 'Đang lưu...' : 'Lưu lớp học'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: PHÂN CÔNG GIÁO VIÊN CHỦ NHIỆM (SEARCHABLE SELECTION)
      ======================================================== */}
      {modalType === 'assignHomeroom' && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-800">
                  Phân công GVCN cho Lớp {selectedItem.name}
                </h2>
                <p className="text-xs text-slate-500">Năm học: {selectedItem.academicYear}</p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveHomeroom} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chọn giáo viên chủ nhiệm
                </label>
                <select
                  value={formData.teacherId || ''}
                  onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden cursor-pointer"
                >
                  <option value="">-- Hủy phân công (Không chỉ định GVCN) --</option>
                  {teachers.map((t) => {
                    const isAlreadyHomeroomOtherClass =
                      t.homeroomClass && t.homeroomClass !== selectedItem.name
                    return (
                      <option
                        key={t._id}
                        value={t._id}
                        disabled={isAlreadyHomeroomOtherClass}
                      >
                        {t.fullName} ({t.userCode})
                        {isAlreadyHomeroomOtherClass ? ` [Đang CN lớp ${t.homeroomClass}]` : ''}
                      </option>
                    )
                  })}
                </select>
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-800 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  Hệ thống bảo đảm nguyên tắc mỗi giáo viên chỉ đảm nhiệm làm chủ nhiệm tối đa 1 lớp học trong một năm học.
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs"
                >
                  {formSubmitting ? 'Đang cập nhật...' : 'Xác nhận phân công'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: THÊM / SỬA MÔN HỌC
      ======================================================== */}
      {(modalType === 'createSubject' || modalType === 'editSubject') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">
                {modalType === 'createSubject' ? 'Thêm Môn học mới' : 'Chỉnh sửa Môn học'}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveSubject} className="mt-4 space-y-4">
              <div>
                <label htmlFor={subjectNameId} className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên môn học <span className="text-red-500">*</span>
                </label>
                <input
                  id={subjectNameId}
                  type="text"
                  required
                  placeholder="Ví dụ: Toán học, Vật lí"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor={subjectCodeId} className="block text-xs font-semibold text-slate-700 mb-1">
                    Mã môn <span className="text-red-500">*</span>
                  </label>
                  <input
                    id={subjectCodeId}
                    type="text"
                    required
                    placeholder="TOAN, LY, HOA"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value.toUpperCase() })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono uppercase"
                  />
                </div>

                <div>
                  <label htmlFor={subjectGradeLevelId} className="block text-xs font-semibold text-slate-700 mb-1">
                    Khối áp dụng
                  </label>
                  <select
                    id={subjectGradeLevelId}
                    value={formData.gradeLevel}
                    onChange={(e) =>
                      setFormData({ ...formData, gradeLevel: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden cursor-pointer"
                  >
                    <option value="">Toàn khối (10, 11, 12)</option>
                    <option value="10">Khối 10</option>
                    <option value="11">Khối 11</option>
                    <option value="12">Khối 12</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor={subjectPeriodsId} className="block text-xs font-semibold text-slate-700 mb-1">
                  Số tiết chuẩn / tuần
                </label>
                <input
                  id={subjectPeriodsId}
                  type="number"
                  min="1"
                  max="10"
                  value={formData.periodsPerWeek}
                  onChange={(e) =>
                    setFormData({ ...formData, periodsPerWeek: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label htmlFor={subjectDescriptionId} className="block text-xs font-semibold text-slate-700 mb-1">
                  Mô tả
                </label>
                <textarea
                  id={subjectDescriptionId}
                  rows="2"
                  placeholder="Mô tả chương trình môn học..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs"
                >
                  {formSubmitting ? 'Đang lưu...' : 'Lưu môn học'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: PHÂN CÔNG GIẢNG DẠY (AUTOCOMPLETE & LIVE CONFLICT CHECK)
      ======================================================== */}
      {modalType === 'createAssignment' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-scale-in my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">
                Phân công Giáo viên Bộ môn
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {conflictWarning && (
              <div
                className={`mt-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
                  conflictWarning.includes('hoàn toàn hợp lệ')
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-amber-50 border border-amber-200 text-amber-800'
                }`}
              >
                {conflictWarning.includes('hoàn toàn hợp lệ') ? (
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                )}
                <span>{conflictWarning}</span>
              </div>
            )}

            <form onSubmit={handleSaveAssignment} className="mt-4 space-y-4">
              {/* Lớp & Môn học */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor={assignmentClassId} className="block text-xs font-semibold text-slate-700 mb-1">
                    Lớp học <span className="text-red-500">*</span>
                  </label>
                  <select
                    id={assignmentClassId}
                    required
                    value={formData.class}
                    onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden cursor-pointer font-bold"
                  >
                    {classes.map((cls) => (
                      <option key={cls._id} value={cls._id}>
                        Lớp {cls.name} ({cls.academicYear})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor={assignmentSubjectId} className="block text-xs font-semibold text-slate-700 mb-1">
                    Môn học <span className="text-red-500">*</span>
                  </label>
                  <select
                    id={assignmentSubjectId}
                    required
                    value={formData.subject}
                    onChange={(e) =>
                      setFormData({ ...formData, subject: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden cursor-pointer"
                  >
                    {subjects.map((sub) => (
                      <option key={sub._id} value={sub._id}>
                        {sub.name} ({sub.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Giáo viên bộ môn (Searchable / Autocomplete Dropdown) */}
              <div className="relative">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Giáo viên bộ môn <span className="text-red-500">*</span>
                </label>

                <div className="relative">
                  <input
                    type="text"
                    placeholder="Tìm kiếm theo tên hoặc mã giáo viên..."
                    value={teacherSearchQuery}
                    onFocus={() => setIsTeacherDropdownOpen(true)}
                    onChange={(e) => {
                      setTeacherSearchQuery(e.target.value)
                      setIsTeacherDropdownOpen(true)
                    }}
                    className="w-full pl-3 pr-8 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-medium"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                </div>

                {isTeacherDropdownOpen && (
                  <div className="absolute z-20 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg divide-y divide-slate-100">
                    {filteredTeachersForSearch.length === 0 ? (
                      <div className="p-3 text-xs text-slate-400 text-center">
                        Không tìm thấy giáo viên phù hợp
                      </div>
                    ) : (
                      filteredTeachersForSearch.map((t) => (
                        <button
                          key={t._id}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, teacher: t._id })
                            setTeacherSearchQuery(t.fullName)
                            setIsTeacherDropdownOpen(false)
                          }}
                          className={`w-full text-left p-2.5 hover:bg-blue-50 flex items-center justify-between text-xs transition-colors ${
                            formData.teacher === t._id ? 'bg-blue-50/80 font-bold' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px]">
                              {t.fullName.charAt(0)}
                            </div>
                            <div>
                              <p className="text-slate-800">{t.fullName}</p>
                              <p className="text-[10px] text-slate-400">{t.userCode} • {t.email}</p>
                            </div>
                          </div>
                          {formData.teacher === t._id && (
                            <Check className="w-4 h-4 text-blue-600 shrink-0" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Học kỳ & Số tiết */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor={assignmentSemesterId} className="block text-xs font-semibold text-slate-700 mb-1">
                    Học kỳ áp dụng
                  </label>
                  <select
                    id={assignmentSemesterId}
                    value={formData.semester}
                    onChange={(e) =>
                      setFormData({ ...formData, semester: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden cursor-pointer"
                  >
                    <option value="CaNam">Cả năm học</option>
                    <option value="HK1">Học kỳ I</option>
                    <option value="HK2">Học kỳ II</option>
                  </select>
                </div>

                <div>
                  <label htmlFor={assignmentPeriodsId} className="block text-xs font-semibold text-slate-700 mb-1">
                    Số tiết / tuần
                  </label>
                  <input
                    id={assignmentPeriodsId}
                    type="number"
                    min="1"
                    max="15"
                    value={formData.periodsPerWeek}
                    onChange={(e) =>
                      setFormData({ ...formData, periodsPerWeek: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Lịch giảng dạy chi tiết (Schedules) */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    Lịch học cụ thể (Thứ & Tiết)
                  </span>
                  <button
                    type="button"
                    onClick={handleAddSlot}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold rounded-lg transition-colors"
                  >
                    + Thêm tiết học
                  </button>
                </div>

                {/* Slot inputs */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Thứ</label>
                    <select
                      value={tempSlot.dayOfWeek}
                      onChange={(e) =>
                        setTempSlot({ ...tempSlot, dayOfWeek: Number(e.target.value) })
                      }
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    >
                      <option value={2}>Thứ Hai</option>
                      <option value={3}>Thứ Ba</option>
                      <option value={4}>Thứ Tư</option>
                      <option value={5}>Thứ Năm</option>
                      <option value={6}>Thứ Sáu</option>
                      <option value={7}>Thứ Bảy</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Tiết bắt đầu</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={tempSlot.startPeriod}
                      onChange={(e) =>
                        setTempSlot({ ...tempSlot, startPeriod: Number(e.target.value) })
                      }
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Tiết kết thúc</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={tempSlot.endPeriod}
                      onChange={(e) =>
                        setTempSlot({ ...tempSlot, endPeriod: Number(e.target.value) })
                      }
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>

                {/* List of added slots */}
                {formData.schedules && formData.schedules.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {formData.schedules.map((slot, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-blue-200 text-blue-700 rounded-lg text-xs font-medium shadow-2xs"
                      >
                        <span>
                          {slot.dayOfWeek === 8 ? 'Chủ Nhật' : `Thứ ${slot.dayOfWeek}`}: Tiết {slot.startPeriod}-{slot.endPeriod}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSlot(i)}
                          className="text-slate-400 hover:text-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label htmlFor={assignmentNoteId} className="block text-xs font-semibold text-slate-700 mb-1">
                  Ghi chú phân công
                </label>
                <input
                  id={assignmentNoteId}
                  type="text"
                  placeholder="Ví dụ: Phụ trách chuyên đề, bồi dưỡng..."
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Real-time conflict checking button */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleCheckConflictNow}
                  disabled={conflictChecking}
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{conflictChecking ? 'Đang kiểm tra...' : 'Kiểm tra xung đột lịch'}</span>
                </button>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs"
                >
                  {formSubmitting ? 'Đang phân công...' : 'Xác nhận phân công'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: THÊM KHỐI HỌC
      ======================================================== */}
      {modalType === 'createGrade' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">Thêm Khối học</h2>
              <button
                type="button"
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault()
                setFormError(null)
                setFormSubmitting(true)
                try {
                  await academicApi.createGrade(formData)
                  setSuccessMsg('Tạo khối học mới thành công!')
                  closeModal()
                  fetchData()
                } catch (err) {
                  setFormError(err?.message || 'Có lỗi xảy ra khi tạo khối học!')
                } finally {
                  setFormSubmitting(false)
                }
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chọn Khối học (10, 11, 12)
                </label>
                <select
                  value={formData.level}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      level: Number(e.target.value),
                      name: `Khối ${e.target.value}`,
                    })
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                >
                  <option value={10}>Khối 10</option>
                  <option value={11}>Khối 11</option>
                  <option value={12}>Khối 12</option>
                </select>
              </div>

              <div>
                <label htmlFor={gradeNameId} className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên khối
                </label>
                <input
                  id={gradeNameId}
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label htmlFor={gradeDescId} className="block text-xs font-semibold text-slate-700 mb-1">
                  Mô tả
                </label>
                <input
                  id={gradeDescId}
                  type="text"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs"
                >
                  {formSubmitting ? 'Đang lưu...' : 'Lưu khối'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: XÁC NHẬN XÓA / SOFT DELETE
      ======================================================== */}
      {modalType === 'delete' && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-scale-in">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="p-3 bg-red-50 rounded-xl">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">
                  Xác nhận xóa dữ liệu
                </h2>
                <p className="text-xs text-slate-500">
                  {selectedItem.itemType === 'class' && `Lớp học: ${selectedItem.name}`}
                  {selectedItem.itemType === 'subject' && `Môn học: ${selectedItem.name}`}
                  {selectedItem.itemType === 'assignment' &&
                    `Phân công: ${selectedItem.class?.name} - ${selectedItem.subject?.name}`}
                  {selectedItem.itemType === 'grade' && `Khối: ${selectedItem.name}`}
                </p>
              </div>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                {formError}
              </div>
            )}

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1.5">
              <p>
                • Hệ thống áp dụng <strong>Soft-delete</strong> đối với dữ liệu đang có ràng buộc học sinh hoặc phân công giảng dạy.
              </p>
              <p>
                • Bạn có chắc chắn muốn tiếp tục thực hiện thao tác này?
              </p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={formSubmitting}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-xs"
              >
                {formSubmitting ? 'Đang xử lý...' : 'Xác nhận xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AcademicStructurePage
