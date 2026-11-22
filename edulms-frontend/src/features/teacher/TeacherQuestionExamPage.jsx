import { useState, useEffect, useMemo } from 'react'
import {
  BookOpen,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Shuffle,
  FileText,
  Award,
  Layers,
  Send,
  Eye,
  X,
  Filter,
  Check,
  Sparkles,
  Info,
} from 'lucide-react'
import { useAuth } from '@/context/useAuth'
import questionApi from '@/api/questionApi'
import examApi from '@/api/examApi'
import academicApi from '@/api/academicApi'
import LoadingSpinner from '@/components/common/LoadingSpinner'

// Danh sách cấp độ độ khó chuẩn hóa
const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Dễ (Nhận biết)', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'medium', label: 'Trung bình (Thông hiểu)', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'hard', label: 'Khó (Vận dụng)', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200' },
  { value: 'nhan_biet', label: 'Nhận biết', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'thong_hieu', label: 'Thông hiểu', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'van_dung', label: 'Vận dụng', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'van_dung_cao', label: 'Vận dụng cao', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200' },
]

const getDifficultyBadge = (diff) => {
  const found = DIFFICULTY_OPTIONS.find((d) => d.value === String(diff).toLowerCase())
  if (found) return found
  return {
    value: diff,
    label: diff || 'Trung bình',
    badgeClass: 'bg-slate-50 text-slate-700 border-slate-200',
  }
}

export const TeacherQuestionExamPage = () => {
  const { user } = useAuth()

  // Tab điều hướng: 'questions' (Ngân hàng câu hỏi), 'create-exam' (Tạo đề), 'exams' (Danh sách đề)
  const [activeTab, setActiveTab] = useState('questions')

  // Dữ liệu học vụ
  const [teachingAssignments, setTeachingAssignments] = useState([])
  const [subjects, setSubjects] = useState([])
  const [loadingInitial, setLoadingInitial] = useState(true)

  // Thông báo phản hồi người dùng
  const [alert, setAlert] = useState(null)

  const showAlert = (message, type = 'success') => {
    setAlert({ message, type })
    setTimeout(() => {
      setAlert((curr) => (curr?.message === message ? null : curr))
    }, 4500)
  }

  // ==========================================
  // TAB 1: STATE NGÂN HÀNG CÂU HỎI
  // ==========================================
  const [questions, setQuestions] = useState([])
  const [questionsPagination, setQuestionsPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 })
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [refreshQuestionsKey, setRefreshQuestionsKey] = useState(0)

  // Bộ lọc câu hỏi
  const [filterSubject, setFilterSubject] = useState('')
  const [filterChapter, setFilterChapter] = useState('')
  const [filterDifficulty, setFilterDifficulty] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [availableChapters, setAvailableChapters] = useState([])

  // Modal tạo / chỉnh sửa câu hỏi
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState(null)
  const [questionFormData, setQuestionFormData] = useState({
    subject: '',
    chapter: '',
    difficulty: 'medium',
    content: '',
    options: ['', '', '', ''],
    correctIndex: 0,
    explanation: '',
  })
  const [questionFormError, setQuestionFormError] = useState('')
  const [submittingQuestion, setSubmittingQuestion] = useState(false)

  // ==========================================
  // TAB 2: STATE TẠO ĐỀ KIỂM TRA
  // ==========================================
  const [examMethod, setExamMethod] = useState('manual') // 'manual' | 'random'
  const [examFormData, setExamFormData] = useState({
    teachingAssignment: '',
    title: '',
    description: '',
    duration: 45,
    scoreWeight: 10,
  })

  // Chọn thủ công
  const [manualSubjectQuestions, setManualSubjectQuestions] = useState([])
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([])
  const [manualFilterChapter, setManualFilterChapter] = useState('')
  const [manualFilterDifficulty, setManualFilterDifficulty] = useState('')
  const [loadingManualQuestions, setLoadingManualQuestions] = useState(false)

  // Tạo ngẫu nhiên
  const [randomMode, setRandomMode] = useState('simple') // 'simple' | 'matrix'
  const [simpleRandomConfig, setSimpleRandomConfig] = useState({
    totalQuestions: 10,
    chapter: '',
    difficulty: '',
  })
  const [matrixCriteria, setMatrixCriteria] = useState([
    { count: 5, difficulty: 'easy', chapter: '' },
    { count: 10, difficulty: 'medium', chapter: '' },
    { count: 5, difficulty: 'hard', chapter: '' },
  ])

  // Xem trước đề (Preview)
  const [previewExamData, setPreviewExamData] = useState(null)
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false)
  const [generatingPreview, setGeneratingPreview] = useState(false)
  const [savingExam, setSavingExam] = useState(false)

  // ==========================================
  // TAB 3: STATE DANH SÁCH ĐỀ KIỂM TRA
  // ==========================================
  const [exams, setExams] = useState([])
  const [loadingExams, setLoadingExams] = useState(false)
  const [refreshExamsKey, setRefreshExamsKey] = useState(0)
  const [examDetailModal, setExamDetailModal] = useState(null)

  // Tải dữ liệu ban đầu: Môn học và Phân công giảng dạy
  useEffect(() => {
    let ignore = false

    const fetchAcademicData = async () => {
      try {
        setLoadingInitial(true)
        const [taRes, subRes] = await Promise.allSettled([
          academicApi.getTeachingAssignments({ teacher: user?.userId }),
          academicApi.getSubjects({ isActive: true }),
        ])

        if (!ignore) {
          if (taRes.status === 'fulfilled' && taRes.value?.data) {
            const list = Array.isArray(taRes.value.data)
              ? taRes.value.data
              : taRes.value.data?.data || []
            setTeachingAssignments(list)
            if (list.length > 0) {
              setExamFormData((prev) => ({
                ...prev,
                teachingAssignment: list[0]._id,
              }))
            }
          }

          if (subRes.status === 'fulfilled' && subRes.value?.data) {
            const subList = Array.isArray(subRes.value.data)
              ? subRes.value.data
              : subRes.value.data?.data || []
            setSubjects(subList)
            if (subList.length > 0) {
              setFilterSubject(subList[0]._id)
              setQuestionFormData((prev) => ({ ...prev, subject: subList[0]._id }))
            }
          }
        }
      } catch (err) {
        console.error('Lỗi khi tải dữ liệu khởi tạo:', err)
      } finally {
        if (!ignore) {
          setLoadingInitial(false)
        }
      }
    }

    fetchAcademicData()

    return () => {
      ignore = true
    }
  }, [user?.userId])

  // Tải danh sách chương khi chọn môn học trong bộ lọc câu hỏi
  useEffect(() => {
    if (!filterSubject) return
    let ignore = false

    const fetchChapters = async () => {
      try {
        const res = await questionApi.getChapters(filterSubject)
        if (!ignore && res?.data) {
          setAvailableChapters(res.data || [])
        }
      } catch {
        if (!ignore) {
          setAvailableChapters([])
        }
      }
    }
    fetchChapters()

    return () => {
      ignore = true
    }
  }, [filterSubject])

  // Tải danh sách câu hỏi theo bộ lọc
  useEffect(() => {
    if (activeTab !== 'questions') return
    let ignore = false

    const fetchQuestionsList = async () => {
      try {
        setLoadingQuestions(true)
        const params = {
          page: questionsPagination.page,
          limit: 10,
          subject: filterSubject || undefined,
          chapter: filterChapter || undefined,
          difficulty: filterDifficulty || undefined,
          search: searchKeyword || undefined,
        }
        const res = await questionApi.getQuestions(params)
        if (!ignore && res?.data) {
          setQuestions(res.data.questions || [])
          setQuestionsPagination(
            res.data.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 }
          )
        }
      } catch (err) {
        if (!ignore) {
          console.error('Lỗi tải danh sách câu hỏi:', err)
          showAlert(err.response?.data?.message || 'Không thể tải danh sách câu hỏi', 'error')
        }
      } finally {
        if (!ignore) {
          setLoadingQuestions(false)
        }
      }
    }

    fetchQuestionsList()

    return () => {
      ignore = true
    }
  }, [activeTab, filterSubject, filterChapter, filterDifficulty, searchKeyword, questionsPagination.page, refreshQuestionsKey])

  // Tải danh sách đề kiểm tra
  useEffect(() => {
    if (activeTab !== 'exams') return
    let ignore = false

    const fetchExamsList = async () => {
      try {
        setLoadingExams(true)
        const res = await examApi.getExams({ scope: 'mine' })
        if (!ignore && res?.data) {
          setExams(res.data.exams || [])
        }
      } catch (err) {
        if (!ignore) {
          console.error('Lỗi tải danh sách đề kiểm tra:', err)
          showAlert(err.response?.data?.message || 'Không thể tải danh sách đề kiểm tra', 'error')
        }
      } finally {
        if (!ignore) {
          setLoadingExams(false)
        }
      }
    }

    fetchExamsList()

    return () => {
      ignore = true
    }
  }, [activeTab, refreshExamsKey])

  // Lấy SubjectId tương ứng từ TeachingAssignment đang được chọn trong Form tạo đề
  const currentExamSubjectId = useMemo(() => {
    if (!examFormData.teachingAssignment) return null
    const found = teachingAssignments.find(
      (ta) => ta._id === examFormData.teachingAssignment
    )
    return found?.subject?._id || found?.subject || null
  }, [examFormData.teachingAssignment, teachingAssignments])

  // Tải danh sách câu hỏi cho việc chọn thủ công khi tạo đề
  useEffect(() => {
    if (activeTab !== 'create-exam' || examMethod !== 'manual' || !currentExamSubjectId) {
      return
    }
    let ignore = false

    const fetchManualQuestions = async () => {
      try {
        setLoadingManualQuestions(true)
        const params = {
          subject: currentExamSubjectId,
          chapter: manualFilterChapter || undefined,
          difficulty: manualFilterDifficulty || undefined,
          limit: 100,
        }
        const res = await questionApi.getQuestions(params)
        if (!ignore && res?.data) {
          setManualSubjectQuestions(res.data.questions || [])
        }
      } catch (err) {
        if (!ignore) {
          console.error('Lỗi tải câu hỏi tạo đề thủ công:', err)
        }
      } finally {
        if (!ignore) {
          setLoadingManualQuestions(false)
        }
      }
    }

    fetchManualQuestions()

    return () => {
      ignore = true
    }
  }, [activeTab, examMethod, currentExamSubjectId, manualFilterChapter, manualFilterDifficulty])

  // ==========================================
  // XỬ LÝ FORM CÂU HỎI (THÊM / SỬA)
  // ==========================================
  const handleOpenCreateQuestionModal = () => {
    setEditingQuestion(null)
    setQuestionFormData({
      subject: filterSubject || (subjects[0]?._id || ''),
      chapter: filterChapter || 'Chương 1',
      difficulty: 'medium',
      content: '',
      options: ['', '', '', ''],
      correctIndex: 0,
      explanation: '',
    })
    setQuestionFormError('')
    setIsQuestionModalOpen(true)
  }

  const handleOpenEditQuestionModal = (q) => {
    setEditingQuestion(q)
    setQuestionFormData({
      subject: q.subject?._id || q.subject,
      chapter: q.chapter || '',
      difficulty: q.difficulty || 'medium',
      content: q.content || '',
      options: q.options ? [...q.options] : ['', '', '', ''],
      correctIndex: Number.isInteger(q.correctIndex) ? q.correctIndex : 0,
      explanation: q.explanation || '',
    })
    setQuestionFormError('')
    setIsQuestionModalOpen(true)
  }

  const handleOptionChange = (idx, value) => {
    setQuestionFormData((prev) => {
      const nextOptions = [...prev.options]
      nextOptions[idx] = value
      return { ...prev, options: nextOptions }
    })
  }

  const handleAddOption = () => {
    if (questionFormData.options.length >= 6) {
      showAlert('Tối đa 6 phương án trả lời', 'error')
      return
    }
    setQuestionFormData((prev) => ({
      ...prev,
      options: [...prev.options, ''],
    }))
  }

  const handleRemoveOption = (indexToRemove) => {
    if (questionFormData.options.length <= 2) {
      showAlert('Câu hỏi phải có ít nhất 2 phương án trả lời', 'error')
      return
    }
    setQuestionFormData((prev) => {
      const nextOptions = prev.options.filter((_, idx) => idx !== indexToRemove)
      let nextCorrect = prev.correctIndex
      if (nextCorrect === indexToRemove) nextCorrect = 0
      else if (nextCorrect > indexToRemove) nextCorrect -= 1
      return {
        ...prev,
        options: nextOptions,
        correctIndex: nextCorrect,
      }
    })
  }

  const handleSubmitQuestion = async (e) => {
    e.preventDefault()
    setQuestionFormError('')

    // Validation
    if (!questionFormData.subject) {
      setQuestionFormError('Vui lòng chọn môn học')
      return
    }
    if (!questionFormData.chapter.trim()) {
      setQuestionFormError('Vui lòng nhập tên chương')
      return
    }
    if (!questionFormData.content.trim() || questionFormData.content.trim().length < 3) {
      setQuestionFormError('Nội dung câu hỏi phải có ít nhất 3 ký tự')
      return
    }
    const emptyOptionIndex = questionFormData.options.findIndex((opt) => !opt.trim())
    if (emptyOptionIndex !== -1) {
      setQuestionFormError(`Phương án ${String.fromCharCode(65 + emptyOptionIndex)} không được để trống`)
      return
    }

    try {
      setSubmittingQuestion(true)
      const payload = {
        ...questionFormData,
        options: questionFormData.options.map((opt) => opt.trim()),
        content: questionFormData.content.trim(),
        chapter: questionFormData.chapter.trim(),
        explanation: questionFormData.explanation?.trim() || '',
      }

      if (editingQuestion) {
        await questionApi.updateQuestion(editingQuestion._id, payload)
        showAlert('Cập nhật câu hỏi thành công!')
      } else {
        await questionApi.createQuestion(payload)
        showAlert('Tạo câu hỏi mới thành công!')
      }

      setIsQuestionModalOpen(false)
      setRefreshQuestionsKey((k) => k + 1)
    } catch (err) {
      setQuestionFormError(err.response?.data?.message || 'Có lỗi xảy ra khi lưu câu hỏi')
    } finally {
      setSubmittingQuestion(false)
    }
  }

  const handleDeleteQuestion = async (q) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa câu hỏi "${q.content.slice(0, 50)}..." không?`)) {
      return
    }
    try {
      await questionApi.deleteQuestion(q._id)
      showAlert('Xóa câu hỏi thành công!')
      setRefreshQuestionsKey((k) => k + 1)
    } catch (err) {
      showAlert(err.response?.data?.message || 'Không thể xóa câu hỏi', 'error')
    }
  }

  // ==========================================
  // XỬ LÝ TẠO ĐỀ & XEM TRƯỚC (PREVIEW)
  // ==========================================
  const handleToggleSelectQuestion = (qId) => {
    setSelectedQuestionIds((prev) =>
      prev.includes(qId) ? prev.filter((id) => id !== qId) : [...prev, qId]
    )
  }

  const handleSelectAllManualQuestions = () => {
    if (selectedQuestionIds.length === manualSubjectQuestions.length) {
      setSelectedQuestionIds([])
    } else {
      setSelectedQuestionIds(manualSubjectQuestions.map((q) => q._id))
    }
  }

  const handleAddMatrixCriteria = () => {
    setMatrixCriteria((prev) => [
      ...prev,
      { count: 5, difficulty: 'medium', chapter: '' },
    ])
  }

  const handleRemoveMatrixCriteria = (idx) => {
    setMatrixCriteria((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleMatrixChange = (idx, field, value) => {
    setMatrixCriteria((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: value }
      return next
    })
  }

  // Tạo xem trước (Preview) đề thi
  const handleGeneratePreview = async () => {
    if (!examFormData.teachingAssignment) {
      showAlert('Vui lòng chọn lớp học và phân công giảng dạy', 'error')
      return
    }
    if (!examFormData.title.trim()) {
      showAlert('Vui lòng nhập tiêu đề đề kiểm tra', 'error')
      return
    }

    try {
      setGeneratingPreview(true)

      let previewQuestions = []

      if (examMethod === 'manual') {
        if (selectedQuestionIds.length === 0) {
          showAlert('Vui lòng chọn ít nhất 1 câu hỏi để tạo đề', 'error')
          return
        }
        previewQuestions = manualSubjectQuestions.filter((q) =>
          selectedQuestionIds.includes(q._id)
        )
      } else {
        // Sinh ngẫu nhiên từ server
        const randomPayload = {
          teachingAssignment: examFormData.teachingAssignment,
          ...(randomMode === 'simple'
            ? {
                totalQuestions: simpleRandomConfig.totalQuestions,
                chapter: simpleRandomConfig.chapter || undefined,
                difficulty: simpleRandomConfig.difficulty || undefined,
              }
            : {
                criteria: matrixCriteria.filter((c) => parseInt(c.count, 10) > 0),
              }),
        }

        const res = await examApi.previewRandom(randomPayload)
        previewQuestions = res?.data?.questions || []
      }

      const totalQuestions = previewQuestions.length
      const scoreWeight = Number(examFormData.scoreWeight) || 10
      const scorePerQuestion =
        totalQuestions > 0 ? (scoreWeight / totalQuestions).toFixed(2) : 0

      // Thống kê phân bố độ khó
      const difficultyCounts = previewQuestions.reduce((acc, q) => {
        const d = q.difficulty || 'medium'
        acc[d] = (acc[d] || 0) + 1
        return acc
      }, {})

      setPreviewExamData({
        ...examFormData,
        questions: previewQuestions,
        questionIds: previewQuestions.map((q) => q._id),
        totalQuestions,
        scoreWeight,
        scorePerQuestion,
        difficultyCounts,
      })

      setIsPreviewModalOpen(true)
    } catch (err) {
      console.error('Lỗi khi sinh đề:', err)
      showAlert(err.response?.data?.message || 'Lỗi khi tạo đề ngẫu nhiên', 'error')
    } finally {
      setGeneratingPreview(false)
    }
  }

  // Lưu đề thi vào Database (Draft hoặc Publish)
  const handleSaveExam = async (shouldPublish = false) => {
    if (!previewExamData || !previewExamData.questionIds?.length) return

    try {
      setSavingExam(true)
      const payload = {
        teachingAssignment: previewExamData.teachingAssignment,
        title: previewExamData.title.trim(),
        description: previewExamData.description.trim(),
        duration: Number(previewExamData.duration),
        scoreWeight: Number(previewExamData.scoreWeight),
        questionIds: previewExamData.questionIds,
      }

      // Tạo đề trước (status = draft)
      const createRes = await examApi.createManualExam(payload)
      const newExam = createRes?.data

      if (shouldPublish && newExam?._id) {
        await examApi.publishExam(newExam._id)
        showAlert('Đã tạo và phát hành đề kiểm tra thành công cho lớp học!')
      } else {
        showAlert('Đã lưu đề kiểm tra dưới dạng bản nháp!')
      }

      setIsPreviewModalOpen(false)
      setActiveTab('exams')
      setRefreshExamsKey((k) => k + 1)
    } catch (err) {
      showAlert(err.response?.data?.message || 'Không thể lưu đề kiểm tra', 'error')
    } finally {
      setSavingExam(false)
    }
  }

  // Phát hành đề thi từ danh sách
  const handlePublishExamFromList = async (examId) => {
    if (!window.confirm('Bạn có chắc chắn muốn phát hành đề kiểm tra này cho học sinh không?')) {
      return
    }
    try {
      await examApi.publishExam(examId)
      showAlert('Phát hành đề kiểm tra thành công!')
      setRefreshExamsKey((k) => k + 1)
    } catch (err) {
      showAlert(err.response?.data?.message || 'Không thể phát hành đề', 'error')
    }
  }

  const handleDeleteExam = async (examId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa đề kiểm tra này không?')) {
      return
    }
    try {
      await examApi.deleteExam(examId)
      showAlert('Xóa đề kiểm tra thành công!')
      setRefreshExamsKey((k) => k + 1)
    } catch (err) {
      showAlert(err.response?.data?.message || 'Không thể xóa đề', 'error')
    }
  }

  if (loadingInitial) {
    return (
      <div className="flex justify-center items-center py-24">
        <LoadingSpinner text="Đang tải dữ liệu ngân hàng câu hỏi & đề thi..." />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Thông báo Alert */}
      {alert && (
        <div
          role="alert"
          className={`flex items-center gap-3 p-4 rounded-xl border text-sm font-medium transition-all ${
            alert.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          {alert.type === 'error' ? (
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          ) : (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          )}
          <span className="flex-1">{alert.message}</span>
          <button
            type="button"
            onClick={() => setAlert(null)}
            className="p-1 hover:bg-black/5 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header & Tabs */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-2.5">
              <BookOpen className="w-6 h-6 text-blue-600" />
              Ngân hàng câu hỏi & Tạo đề kiểm tra
            </h1>
            <p className="text-xs md:text-sm text-slate-500 mt-1">
              Quản lý danh sách câu hỏi trắc nghiệm, tạo đề thi thủ công hoặc tự động sinh ngẫu nhiên theo ma trận tiêu chí.
            </p>
          </div>

          {activeTab === 'questions' && (
            <button
              type="button"
              onClick={handleOpenCreateQuestionModal}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm shadow-xs transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm câu hỏi mới</span>
            </button>
          )}
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 pt-4 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('questions')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shrink-0 ${
              activeTab === 'questions'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Ngân hàng câu hỏi</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('create-exam')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shrink-0 ${
              activeTab === 'create-exam'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Shuffle className="w-4 h-4" />
            <span>Tạo đề kiểm tra</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('exams')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shrink-0 ${
              activeTab === 'exams'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Đề kiểm tra đã tạo</span>
            {exams.length > 0 && (
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'exams' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {exams.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================
          TAB 1: QUẢN LÝ NGÂN HÀNG CÂU HỎI
         ======================================================== */}
      {activeTab === 'questions' && (
        <div className="space-y-4">
          {/* Bộ lọc câu hỏi */}
          <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200 space-y-3">
            <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
              <Filter className="w-4 h-4 text-blue-600" />
              <span>Bộ lọc tìm kiếm câu hỏi</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Chọn Môn học */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Môn học
                </label>
                <select
                  value={filterSubject}
                  onChange={(e) => setFilterSubject(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                >
                  <option value="">Tất cả môn học</option>
                  {subjects.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Lọc theo Chương */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Chương học
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Chương 1..."
                  value={filterChapter}
                  onChange={(e) => setFilterChapter(e.target.value)}
                  list="chapters-list"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
                <datalist id="chapters-list">
                  {availableChapters.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              {/* Lọc theo Độ khó */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Độ khó
                </label>
                <select
                  value={filterDifficulty}
                  onChange={(e) => setFilterDifficulty(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                >
                  <option value="">Tất cả độ khó</option>
                  {DIFFICULTY_OPTIONS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tìm kiếm từ khóa */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Từ khóa nội dung
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Tìm câu hỏi..."
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>
            </div>
          </div>

          {/* Danh sách câu hỏi */}
          {loadingQuestions ? (
            <div className="py-16 flex justify-center">
              <LoadingSpinner text="Đang tải danh sách câu hỏi..." />
            </div>
          ) : questions.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
              <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-700">
                Chưa có câu hỏi nào phù hợp với bộ lọc
              </h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Hãy thêm câu hỏi mới vào ngân hàng để bắt đầu tạo đề kiểm tra
              </p>
              <button
                type="button"
                onClick={handleOpenCreateQuestionModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Thêm câu hỏi ngay
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span>
                  Tìm thấy <strong>{questionsPagination.total}</strong> câu hỏi trong ngân hàng
                </span>
                <span>
                  Trang {questionsPagination.page} / {questionsPagination.totalPages}
                </span>
              </div>

              {questions.map((q, idx) => {
                const badge = getDifficultyBadge(q.difficulty)
                return (
                  <div
                    key={q._id}
                    className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200 hover:border-slate-300 transition-all space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-slate-400">
                          #{(questionsPagination.page - 1) * questionsPagination.limit + idx + 1}
                        </span>
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          {q.subject?.name || 'Môn học'}
                        </span>
                        <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          {q.chapter}
                        </span>
                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${badge.badgeClass}`}>
                          {badge.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEditQuestionModal(q)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Chỉnh sửa câu hỏi"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(q)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Xóa câu hỏi"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Nội dung câu hỏi */}
                    <p className="text-sm font-semibold text-slate-900 whitespace-pre-line leading-relaxed">
                      {q.content}
                    </p>

                    {/* Danh sách phương án A, B, C, D */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {q.options?.map((opt, oIdx) => {
                        const isCorrect = oIdx === q.correctIndex
                        return (
                          <div
                            key={oIdx}
                            className={`p-2.5 rounded-xl text-xs md:text-sm font-medium flex items-start gap-2.5 transition-all ${
                              isCorrect
                                ? 'bg-emerald-50/80 border border-emerald-300 text-emerald-950 shadow-xs'
                                : 'bg-slate-50 border border-slate-200 text-slate-700'
                            }`}
                          >
                            <span
                              className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${
                                isCorrect
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {String.fromCharCode(65 + oIdx)}
                            </span>
                            <span className="flex-1 break-words">{opt}</span>
                            {isCorrect && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Lời giải thích nếu có */}
                    {q.explanation && (
                      <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <strong>Lời giải:</strong> {q.explanation}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Phân trang */}
              {questionsPagination.totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 pt-2">
                  <button
                    type="button"
                    disabled={questionsPagination.page <= 1}
                    onClick={() =>
                      setQuestionsPagination((prev) => ({
                        ...prev,
                        page: prev.page - 1,
                      }))
                    }
                    className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-xl disabled:opacity-40 hover:bg-slate-50"
                  >
                    Trang trước
                  </button>
                  <span className="text-xs text-slate-600 font-medium">
                    {questionsPagination.page} / {questionsPagination.totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={questionsPagination.page >= questionsPagination.totalPages}
                    onClick={() =>
                      setQuestionsPagination((prev) => ({
                        ...prev,
                        page: prev.page + 1,
                      }))
                    }
                    className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-xl disabled:opacity-40 hover:bg-slate-50"
                  >
                    Trang sau
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          TAB 2: GIAO DIỆN TẠO ĐỀ KIỂM TRA
         ======================================================== */}
      {activeTab === 'create-exam' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cột trái: Cấu hình thông tin đề thi & Lựa chọn phương thức */}
          <div className="lg:col-span-1 space-y-5">
            <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 space-y-4">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Thông tin đề kiểm tra
              </h2>

              {/* Chọn phân công giảng dạy */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lớp & Môn học phân công <span className="text-rose-500">*</span>
                </label>
                <select
                  value={examFormData.teachingAssignment}
                  onChange={(e) =>
                    setExamFormData((prev) => ({
                      ...prev,
                      teachingAssignment: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                >
                  {teachingAssignments.map((ta) => (
                    <option key={ta._id} value={ta._id}>
                      {ta.class?.name || 'Lớp'} - {ta.subject?.name || 'Môn'} ({ta.academicYear})
                    </option>
                  ))}
                </select>
              </div>

              {/* Tiêu đề đề kiểm tra */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tiêu đề đề kiểm tra <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Kiểm tra 15 phút Số học..."
                  value={examFormData.title}
                  onChange={(e) =>
                    setExamFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Thời gian làm bài & Thang điểm */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Thời gian (phút) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="300"
                    value={examFormData.duration}
                    onChange={(e) =>
                      setExamFormData((prev) => ({
                        ...prev,
                        duration: Math.max(1, parseInt(e.target.value, 10) || 1),
                      }))
                    }
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Thang điểm
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={examFormData.scoreWeight}
                    onChange={(e) =>
                      setExamFormData((prev) => ({
                        ...prev,
                        scoreWeight: Number(e.target.value) || 10,
                      }))
                    }
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Mô tả / Ghi chú */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mô tả / Hướng dẫn học sinh
                </label>
                <textarea
                  rows="2"
                  placeholder="Ghi chú thời gian bắt đầu hoặc lưu ý làm bài..."
                  value={examFormData.description}
                  onChange={(e) =>
                    setExamFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Nút bấm Tạo & Xem trước */}
              <div className="pt-2">
                <button
                  type="button"
                  disabled={generatingPreview}
                  onClick={handleGeneratePreview}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm rounded-xl shadow-md transition-all active:scale-98 flex items-center justify-center gap-2"
                >
                  {generatingPreview ? (
                    <LoadingSpinner text="" size="sm" />
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Xem trước đề kiểm tra</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Cột phải: Phương thức tạo đề (Thủ công vs Ngẫu nhiên) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Switcher 2 Phương thức */}
            <div className="bg-white p-2 rounded-2xl border border-slate-200 flex gap-2">
              <button
                type="button"
                onClick={() => setExamMethod('manual')}
                className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                  examMethod === 'manual'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>1. Chọn câu hỏi thủ công</span>
              </button>

              <button
                type="button"
                onClick={() => setExamMethod('random')}
                className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                  examMethod === 'random'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Shuffle className="w-4 h-4" />
                <span>2. Tạo đề ngẫu nhiên (Random)</span>
              </button>
            </div>

            {/* Phương thức 1: Chọn câu hỏi thủ công */}
            {examMethod === 'manual' && (
              <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">
                      Chọn câu hỏi từ ngân hàng
                    </h3>
                    <p className="text-xs text-slate-500">
                      Tích chọn từng câu hỏi phù hợp để đưa vào đề thi
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      Đã chọn: {selectedQuestionIds.length} câu
                    </span>
                    <button
                      type="button"
                      onClick={handleSelectAllManualQuestions}
                      className="text-xs font-semibold px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                    >
                      {selectedQuestionIds.length === manualSubjectQuestions.length
                        ? 'Bỏ chọn tất cả'
                        : 'Chọn tất cả'}
                    </button>
                  </div>
                </div>

                {/* Bộ lọc nhanh trong danh sách thủ công */}
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Lọc theo chương..."
                    value={manualFilterChapter}
                    onChange={(e) => setManualFilterChapter(e.target.value)}
                    className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                  />
                  <select
                    value={manualFilterDifficulty}
                    onChange={(e) => setManualFilterDifficulty(e.target.value)}
                    className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                  >
                    <option value="">Tất cả độ khó</option>
                    {DIFFICULTY_OPTIONS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Danh sách câu hỏi có checkbox */}
                {loadingManualQuestions ? (
                  <div className="py-12 flex justify-center">
                    <LoadingSpinner text="Đang tải câu hỏi..." />
                  </div>
                ) : manualSubjectQuestions.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    Không có câu hỏi nào thuộc môn học này trong ngân hàng.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                    {manualSubjectQuestions.map((q) => {
                      const isSelected = selectedQuestionIds.includes(q._id)
                      const badge = getDifficultyBadge(q.difficulty)
                      return (
                        <div
                          key={q._id}
                          onClick={() => handleToggleSelectQuestion(q._id)}
                          className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-3 ${
                            isSelected
                              ? 'bg-blue-50/70 border-blue-400 shadow-xs'
                              : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="w-4 h-4 mt-0.5 text-blue-600 rounded-md focus:ring-0 shrink-0 cursor-pointer"
                          />
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-600">
                                {q.chapter}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${badge.badgeClass}`}
                              >
                                {badge.label}
                              </span>
                            </div>
                            <p className="font-medium text-slate-800 line-clamp-2">
                              {q.content}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Phương thức 2: Tạo đề ngẫu nhiên (Random) */}
            {examMethod === 'random' && (
              <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      Thiết lập tiêu chí sinh đề ngẫu nhiên
                    </h3>
                    <p className="text-xs text-slate-500">
                      Hệ thống sẽ tự động bốc ngẫu nhiên câu hỏi theo yêu cầu và kiểm tra số lượng đủ điều kiện
                    </p>
                  </div>

                  {/* Mode switcher: Simple vs Matrix */}
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setRandomMode('simple')}
                      className={`px-3 py-1 rounded-lg transition-all ${
                        randomMode === 'simple'
                          ? 'bg-white text-blue-600 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Cơ bản
                    </button>
                    <button
                      type="button"
                      onClick={() => setRandomMode('matrix')}
                      className={`px-3 py-1 rounded-lg transition-all ${
                        randomMode === 'matrix'
                          ? 'bg-white text-blue-600 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Ma trận tiêu chí
                    </button>
                  </div>
                </div>

                {/* Chế độ ngẫu nhiên cơ bản */}
                {randomMode === 'simple' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Số lượng câu hỏi <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={simpleRandomConfig.totalQuestions}
                        onChange={(e) =>
                          setSimpleRandomConfig((prev) => ({
                            ...prev,
                            totalQuestions: Math.max(1, parseInt(e.target.value, 10) || 1),
                          }))
                        }
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Lọc theo Chương (tùy chọn)
                      </label>
                      <input
                        type="text"
                        placeholder="Để trống nếu lấy toàn bộ"
                        value={simpleRandomConfig.chapter}
                        onChange={(e) =>
                          setSimpleRandomConfig((prev) => ({
                            ...prev,
                            chapter: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Lọc theo Độ khó (tùy chọn)
                      </label>
                      <select
                        value={simpleRandomConfig.difficulty}
                        onChange={(e) =>
                          setSimpleRandomConfig((prev) => ({
                            ...prev,
                            difficulty: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      >
                        <option value="">Tất cả độ khó</option>
                        {DIFFICULTY_OPTIONS.map((d) => (
                          <option key={d.value} value={d.value}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Chế độ Ma trận tiêu chí (Matrix) */}
                {randomMode === 'matrix' && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      {matrixCriteria.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex flex-col sm:flex-row items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                        >
                          <div className="w-full sm:w-28">
                            <label className="text-[11px] font-medium text-slate-500 block mb-0.5">
                              Số lượng câu
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={item.count}
                              onChange={(e) =>
                                handleMatrixChange(idx, 'count', e.target.value)
                              }
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                            />
                          </div>

                          <div className="w-full sm:w-44">
                            <label className="text-[11px] font-medium text-slate-500 block mb-0.5">
                              Độ khó
                            </label>
                            <select
                              value={item.difficulty}
                              onChange={(e) =>
                                handleMatrixChange(idx, 'difficulty', e.target.value)
                              }
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                            >
                              <option value="">Tất cả</option>
                              {DIFFICULTY_OPTIONS.map((d) => (
                                <option key={d.value} value={d.value}>
                                  {d.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="w-full sm:flex-1">
                            <label className="text-[11px] font-medium text-slate-500 block mb-0.5">
                              Chương (tùy chọn)
                            </label>
                            <input
                              type="text"
                              placeholder="Tất cả chương..."
                              value={item.chapter}
                              onChange={(e) =>
                                handleMatrixChange(idx, 'chapter', e.target.value)
                              }
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                            />
                          </div>

                          <div className="sm:self-end pt-1">
                            <button
                              type="button"
                              onClick={() => handleRemoveMatrixCriteria(idx)}
                              disabled={matrixCriteria.length <= 1}
                              className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-20 rounded-lg"
                              title="Xóa tiêu chí"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={handleAddMatrixCriteria}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm dòng tiêu chí</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 3: DANH SÁCH ĐỀ KIỂM TRA ĐÃ TẠO
         ======================================================== */}
      {activeTab === 'exams' && (
        <div className="space-y-4">
          {loadingExams ? (
            <div className="py-16 flex justify-center">
              <LoadingSpinner text="Đang tải danh sách đề thi..." />
            </div>
          ) : exams.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-700">
                Chưa có đề kiểm tra nào
              </h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Bạn có thể tạo đề mới bằng cách chọn câu hỏi thủ công hoặc sinh ngẫu nhiên
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('create-exam')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Tạo đề kiểm tra ngay
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {exams.map((exam) => {
                const isPublished = exam.status === 'published' || exam.isPublished
                return (
                  <div
                    key={exam._id}
                    className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                            isPublished
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {isPublished ? 'Đã phát hành' : 'Bản nháp (Draft)'}
                        </span>

                        <span className="text-xs text-slate-400 font-medium">
                          {exam.duration} phút
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-800 line-clamp-2">
                        {exam.title}
                      </h3>

                      <div className="space-y-1 text-xs text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>
                            Lớp: <strong>{exam.teachingAssignment?.class?.name || 'Lớp học'}</strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>
                            Môn: <strong>{exam.teachingAssignment?.subject?.name || 'Môn học'}</strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>
                            Số lượng: <strong>{exam.questionIds?.length || 0} câu</strong> ({exam.scoreWeight || 10} điểm)
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setExamDetailModal(exam)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Xem đề</span>
                      </button>

                      <div className="flex items-center gap-2">
                        {!isPublished && (
                          <button
                            type="button"
                            onClick={() => handlePublishExamFromList(exam._id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-all shadow-xs"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Phát hành</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeleteExam(exam._id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Xóa đề"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          MODAL 1: FORM TẠO / SỬA CÂU HỎI TRẮC NGHIỆM
         ======================================================== */}
      {isQuestionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-600" />
                {editingQuestion ? 'Chỉnh sửa câu hỏi' : 'Tạo mới câu hỏi trắc nghiệm'}
              </h3>
              <button
                type="button"
                onClick={() => setIsQuestionModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitQuestion} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {questionFormError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{questionFormError}</span>
                </div>
              )}

              {/* Môn học, Chương, Độ khó */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Môn học <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={questionFormData.subject}
                    onChange={(e) =>
                      setQuestionFormData((prev) => ({
                        ...prev,
                        subject: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    {subjects.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Chương <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Chương 1..."
                    value={questionFormData.chapter}
                    onChange={(e) =>
                      setQuestionFormData((prev) => ({
                        ...prev,
                        chapter: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Độ khó
                  </label>
                  <select
                    value={questionFormData.difficulty}
                    onChange={(e) =>
                      setQuestionFormData((prev) => ({
                        ...prev,
                        difficulty: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    {DIFFICULTY_OPTIONS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Nội dung câu hỏi */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nội dung câu hỏi <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows="3"
                  required
                  placeholder="Nhập nội dung câu hỏi trắc nghiệm..."
                  value={questionFormData.content}
                  onChange={(e) =>
                    setQuestionFormData((prev) => ({
                      ...prev,
                      content: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Các phương án trả lời */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700">
                    Các phương án trả lời & Chọn đáp án đúng (A, B, C, D){' '}
                    <span className="text-rose-500">*</span>
                  </label>
                  {questionFormData.options.length < 6 && (
                    <button
                      type="button"
                      onClick={handleAddOption}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Thêm phương án
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {questionFormData.options.map((opt, oIdx) => {
                    const isCorrect = questionFormData.correctIndex === oIdx
                    return (
                      <div
                        key={oIdx}
                        className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                          isCorrect
                            ? 'bg-emerald-50/80 border-emerald-300'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <label
                          className="flex items-center gap-1.5 cursor-pointer shrink-0"
                          title="Chọn làm đáp án đúng"
                        >
                          <input
                            type="radio"
                            name="correctIndex"
                            checked={isCorrect}
                            onChange={() =>
                              setQuestionFormData((prev) => ({
                                ...prev,
                                correctIndex: oIdx,
                              }))
                            }
                            className="w-4 h-4 text-emerald-600 focus:ring-0 cursor-pointer"
                          />
                          <span
                            className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
                              isCorrect
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {String.fromCharCode(65 + oIdx)}
                          </span>
                        </label>

                        <input
                          type="text"
                          required
                          placeholder={`Nội dung phương án ${String.fromCharCode(65 + oIdx)}...`}
                          value={opt}
                          onChange={(e) => handleOptionChange(oIdx, e.target.value)}
                          className="flex-1 px-3 py-1.5 text-xs md:text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden"
                        />

                        {questionFormData.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(oIdx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                            title="Xóa phương án này"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Lời giải thích */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lời giải thích chi tiết (tùy chọn)
                </label>
                <textarea
                  rows="2"
                  placeholder="Giải thích vì sao đáp án đúng..."
                  value={questionFormData.explanation}
                  onChange={(e) =>
                    setQuestionFormData((prev) => ({
                      ...prev,
                      explanation: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsQuestionModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submittingQuestion}
                  className="px-5 py-2 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs disabled:opacity-50"
                >
                  {submittingQuestion ? 'Đang lưu...' : editingQuestion ? 'Cập nhật' : 'Tạo câu hỏi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 2: MÀN HÌNH XEM TRƯỚC ĐỀ THI TRƯỚC KHI PUBLISH
         ======================================================== */}
      {isPreviewModalOpen && previewExamData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-slate-200 overflow-hidden my-8 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-blue-600" />
                  Xem trước đề kiểm tra
                </h3>
                <p className="text-xs text-slate-500">
                  Kiểm tra nội dung câu hỏi và phân bố điểm trước khi phát hành cho học sinh
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5 overflow-y-auto flex-1">
              {/* Thẻ tóm tắt thông số đề */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block">Thời gian:</span>
                  <strong className="text-sm text-slate-800">
                    {previewExamData.duration} phút
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Tổng số câu hỏi:</span>
                  <strong className="text-sm text-blue-600">
                    {previewExamData.totalQuestions} câu
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Thang điểm tổng:</span>
                  <strong className="text-sm text-amber-600">
                    {previewExamData.scoreWeight} điểm
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Điểm mỗi câu:</span>
                  <strong className="text-sm text-emerald-600">
                    ~{previewExamData.scorePerQuestion} đ/câu
                  </strong>
                </div>
              </div>

              {/* Danh sách các câu hỏi trong đề */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-800 border-b pb-2">
                  Nội dung chi tiết các câu hỏi ({previewExamData.questions?.length} câu)
                </h4>

                {previewExamData.questions?.map((q, idx) => {
                  const badge = getDifficultyBadge(q.difficulty)
                  return (
                    <div
                      key={q._id || idx}
                      className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-blue-700">Câu {idx + 1}:</span>
                          <span className="text-slate-500 font-medium">({q.chapter})</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${badge.badgeClass}`}
                          >
                            {badge.label}
                          </span>
                        </div>
                        <span className="text-slate-500 font-semibold">
                          {previewExamData.scorePerQuestion} điểm
                        </span>
                      </div>

                      <p className="text-sm font-semibold text-slate-900 whitespace-pre-line">
                        {q.content}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {q.options?.map((opt, oIdx) => {
                          const isCorrect = oIdx === q.correctIndex
                          return (
                            <div
                              key={oIdx}
                              className={`p-2 rounded-lg text-xs font-medium flex items-center gap-2 ${
                                isCorrect
                                  ? 'bg-emerald-50 border border-emerald-300 text-emerald-900 font-semibold'
                                  : 'bg-slate-50 border border-slate-200 text-slate-700'
                              }`}
                            >
                              <span
                                className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${
                                  isCorrect
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-200 text-slate-600'
                                }`}
                              >
                                {String.fromCharCode(65 + oIdx)}
                              </span>
                              <span className="flex-1">{opt}</span>
                              {isCorrect && (
                                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              )}
                            </div>
                          )
                        })}
                      </div>

                      {q.explanation && (
                        <div className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200 mt-1">
                          <strong>Giải thích:</strong> {q.explanation}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Footer hành động: Lưu bản nháp hoặc Phát hành */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-xl"
              >
                Đóng / Chỉnh sửa lại
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={savingExam}
                  onClick={() => handleSaveExam(false)}
                  className="px-4 py-2 text-sm font-bold bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 rounded-xl shadow-xs disabled:opacity-50"
                >
                  Lưu bản nháp (Draft)
                </button>

                <button
                  type="button"
                  disabled={savingExam}
                  onClick={() => handleSaveExam(true)}
                  className="px-5 py-2 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Phát hành ngay cho lớp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 3: XEM CHI TIẾT ĐỀ KIỂM TRA ĐÃ TẠO
         ======================================================== */}
      {examDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border border-slate-200 overflow-hidden my-8 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  {examDetailModal.title}
                </h3>
                <span className="text-xs text-slate-500">
                  {examDetailModal.teachingAssignment?.class?.name} - {examDetailModal.teachingAssignment?.subject?.name} ({examDetailModal.duration} phút)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setExamDetailModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {examDetailModal.questionIds?.map((q, idx) => (
                <div key={idx} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div className="font-bold text-blue-700">Câu {idx + 1}: {q.chapter}</div>
                  <p className="font-semibold text-slate-900 text-sm">{q.content}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                    {q.options?.map((opt, oIdx) => {
                      const isCorrect = oIdx === q.correctIndex
                      return (
                        <div
                          key={oIdx}
                          className={`p-2 rounded-lg flex items-center gap-2 ${
                            isCorrect
                              ? 'bg-emerald-100/70 border border-emerald-300 text-emerald-950 font-bold'
                              : 'bg-white border border-slate-200 text-slate-700'
                          }`}
                        >
                          <span className="font-bold">{String.fromCharCode(65 + oIdx)}.</span>
                          <span>{opt}</span>
                          {isCorrect && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 ml-auto" />}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setExamDetailModal(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-sm font-semibold rounded-xl"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TeacherQuestionExamPage
