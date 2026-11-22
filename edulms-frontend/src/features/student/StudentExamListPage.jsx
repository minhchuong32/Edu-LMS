import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText,
  Clock,
  Award,
  Layers,
  Eye,
  X,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Send,
  RotateCcw,
} from 'lucide-react'
import examApi from '@/api/examApi'
import LoadingSpinner from '@/components/common/LoadingSpinner'

// Helper lưu trữ và khôi phục bài thi từ localStorage (định nghĩa ngoài component để tuân thủ purity)
const getStoredAttempt = (examId, durationMinutes) => {
  const storageKey = `edu_exam_attempt_${examId}`
  const saved = localStorage.getItem(storageKey)
  const now = Date.now()
  let startTime = now
  let initialAnswers = {}
  let elapsedSeconds = 0

  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      if (parsed && parsed.startTime) {
        startTime = parsed.startTime
        elapsedSeconds = Math.floor((now - startTime) / 1000)
        initialAnswers = parsed.answers || {}
      }
    } catch {
      // ignore JSON parse error
    }
  } else {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ startTime, answers: {} })
      )
    } catch {
      // ignore storage error
    }
  }

  const totalDurationSeconds = (durationMinutes || 15) * 60
  const remainingSeconds = Math.max(0, totalDurationSeconds - elapsedSeconds)
  return { startTime, initialAnswers, remainingSeconds }
}

const saveStoredAttempt = (examId, startTime, answers) => {
  try {
    const storageKey = `edu_exam_attempt_${examId}`
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        startTime: startTime || Date.now(),
        answers,
      })
    )
  } catch {
    // ignore storage error
  }
}

const clearStoredAttempt = (examId) => {
  try {
    localStorage.removeItem(`edu_exam_attempt_${examId}`)
  } catch {
    // ignore storage error
  }
}

export const StudentExamListPage = () => {
  const navigate = useNavigate()
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // State quản lý phòng thi trực tuyến
  const [activeExam, setActiveExam] = useState(null)
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0)
  const [studentAnswers, setStudentAnswers] = useState({}) // { [qIndex]: optionIndex }
  const [timeLeft, setTimeLeft] = useState(0) // seconds
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false)
  const [examStartTime, setExamStartTime] = useState(null)

  // State hiển thị kết quả sau khi nộp bài
  const [examResult, setExamResult] = useState(null)
  const [loadingResult, setLoadingResult] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const timerRef = useRef(null)

  // Tải danh sách đề thi của lớp
  useEffect(() => {
    let ignore = false

    const loadExams = async () => {
      try {
        setLoading(true)
        setError('')
        const res = await examApi.getExams()
        if (!ignore && res?.data) {
          setExams(res.data.exams || [])
        }
      } catch (err) {
        if (!ignore) {
          console.error('Lỗi khi tải đề kiểm tra:', err)
          setError(
            err.response?.data?.message ||
              'Không thể tải danh sách đề kiểm tra của lớp bạn'
          )
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    loadExams()

    return () => {
      ignore = true
    }
  }, [refreshTrigger])

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1)
  }

  // Xem lại kết quả bài đã nộp (kèm đáp án đúng từ Backend)
  const handleViewResult = async (examId) => {
    try {
      setLoadingResult(true)
      const res = await examApi.getExamResult(examId)
      if (res?.data) {
        setExamResult(res.data)
      }
    } catch (err) {
      alert(
        err.response?.data?.message ||
          'Chưa có bài làm hoặc không thể tải kết quả bài kiểm tra'
      )
    } finally {
      setLoadingResult(false)
    }
  }

  // Khởi động hoặc khôi phục phiên làm bài (hỗ trợ lưu local storage khi reload trang)
  const handleStartExam = async (examId) => {
    try {
      setLoadingResult(true)
      const res = await examApi.getExamById(examId)
      const examData = res?.data
      if (!examData) return

      // Nếu học sinh đã nộp đề này trước đó, mở ngay màn hình xem lại kết quả
      if (examData.hasSubmitted) {
        await handleViewResult(examId)
        return
      }

      const { startTime, initialAnswers, remainingSeconds } = getStoredAttempt(
        examId,
        examData.duration
      )

      setExamStartTime(startTime)
      setActiveExam(examData)
      setActiveQuestionIndex(0)
      setStudentAnswers(initialAnswers)
      setTimeLeft(remainingSeconds)
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể bắt đầu làm bài kiểm tra')
    } finally {
      setLoadingResult(false)
    }
  }

  // Xử lý nộp bài thi lên Backend để chấm điểm tự động
  const handleSubmitExam = useCallback(
    async (isAutoSubmit = false) => {
      if (!activeExam || isSubmitting) return

      try {
        setIsSubmitting(true)
        setShowConfirmSubmit(false)

        const questionsList = activeExam.questionIds || []
        const formattedAnswers = questionsList.map((q, idx) => ({
          questionId: q._id || q.id,
          selectedOption:
            studentAnswers[idx] !== undefined && studentAnswers[idx] !== null
              ? studentAnswers[idx]
              : null,
        }))

        const totalDurationSeconds = (activeExam.duration || 15) * 60
        const durationSpent = Math.max(
          0,
          totalDurationSeconds - (timeLeft || 0)
        )

        const payload = {
          answers: formattedAnswers,
          durationSpent,
          startedAt: examStartTime
            ? new Date(examStartTime).toISOString()
            : new Date().toISOString(),
        }

        const res = await examApi.submitExam(activeExam._id, payload)

        // Xóa bộ nhớ tạm của bài thi
        clearStoredAttempt(activeExam._id)
        if (timerRef.current) clearInterval(timerRef.current)

        setActiveExam(null)
        setStudentAnswers({})

        if (res?.data) {
          setExamResult(res.data)
        }

        // Cập nhật lại danh sách đề thi
        setRefreshTrigger((prev) => prev + 1)

        if (isAutoSubmit) {
          alert('Hết thời gian làm bài! Hệ thống đã tự động nộp bài của bạn.')
        }
      } catch (err) {
        console.error('Lỗi khi nộp bài:', err)
        alert(
          err.response?.data?.message ||
            'Có lỗi xảy ra khi nộp bài. Vui lòng thử lại!'
        )
      } finally {
        setIsSubmitting(false)
      }
    },
    [activeExam, isSubmitting, studentAnswers, timeLeft, examStartTime]
  )

  // Đồng hồ đếm ngược
  useEffect(() => {
    if (!activeExam) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          handleSubmitExam(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [activeExam, handleSubmitExam])

  // Chọn phương án trả lời & lưu vào localStorage
  const handleSelectOption = (qIndex, oIndex) => {
    const updated = {
      ...studentAnswers,
      [qIndex]: oIndex,
    }
    setStudentAnswers(updated)

    if (activeExam) {
      saveStoredAttempt(activeExam._id, examStartTime, updated)
    }
  }

  // Định dạng thời gian đếm ngược MM:SS
  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const answeredCount = Object.keys(studentAnswers).filter(
    (k) => studentAnswers[k] !== null && studentAnswers[k] !== undefined
  ).length
  const totalQuestions = activeExam?.questionIds?.length || 0

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-blue-600" />
            Đề kiểm tra & Bài thi
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Danh sách các bài kiểm tra trắc nghiệm được giáo viên phát hành cho lớp học của bạn.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          className="self-start sm:self-auto px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Làm mới</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-semibold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Danh sách đề thi */}
      {loading ? (
        <div className="py-20 flex justify-center">
          <LoadingSpinner text="Đang tải danh sách đề kiểm tra..." />
        </div>
      ) : exams.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
          <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700">
            Hiện chưa có đề kiểm tra nào được phát hành
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Vui lòng quay lại sau khi giáo viên công bố đề thi mới.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {exams.map((exam) => {
            const hasSubmitted = exam.hasSubmitted
            return (
              <div
                key={exam._id}
                className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      {exam.teachingAssignment?.subject?.name || 'Môn học'}
                    </span>
                    <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {exam.duration} phút
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-800 line-clamp-2">
                    {exam.title}
                  </h3>

                  <div className="space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>
                        Lớp: <strong>{exam.teachingAssignment?.class?.name || 'Lớp học'}</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>
                        Số lượng: <strong>{exam.questionIds?.length || 0} câu hỏi</strong> ({exam.scoreWeight || 10} điểm)
                      </span>
                    </div>
                  </div>

                  {hasSubmitted && (
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs font-semibold text-emerald-800">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Đã nộp bài
                      </span>
                      {exam.attempt?.score !== undefined && (
                        <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-md font-bold">
                          {exam.attempt.score} / {exam.scoreWeight || 10} điểm
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                  {hasSubmitted ? (
                    <div className="flex gap-2 w-full">
                      <button
                        type="button"
                        onClick={() => navigate(`/student/exams/${exam._id}/result`)}
                        className="flex-1 py-2.5 px-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1"
                      >
                        <Award className="w-3.5 h-3.5" />
                        <span>Xem chi tiết</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleViewResult(exam._id)}
                        className="flex-1 py-2.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Xem kết quả & Đáp án</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2 w-full">
                      <button
                        type="button"
                        onClick={() => navigate(`/student/exams/${exam._id}/take`)}
                        className="flex-1 py-2.5 px-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Phòng thi</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStartExam(exam._id)}
                        className="flex-1 py-2.5 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Xem đề & Làm bài</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL PHÒNG THI TRỰC TUYẾN (CÓ TIMER ĐẾM NGƯỢC & ĐIỀU HƯỚNG CÂU HỎI)      */}
      {/* ========================================================================= */}
      {activeExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header bài thi */}
            <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="space-y-0.5">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
                  {activeExam.teachingAssignment?.subject?.name || 'Môn học'} - Kiểm tra trực tuyến
                </span>
                <h2 className="text-base md:text-lg font-bold text-slate-900">
                  {activeExam.title}
                </h2>
              </div>

              {/* Đồng hồ đếm ngược */}
              <div
                className={`px-4 py-2 rounded-xl border flex items-center gap-2 font-mono font-bold text-sm md:text-base transition-all ${
                  timeLeft <= 60
                    ? 'bg-rose-100 border-rose-300 text-rose-700 animate-pulse'
                    : timeLeft <= 300
                    ? 'bg-amber-100 border-amber-300 text-amber-800'
                    : 'bg-white border-blue-200 text-blue-800 shadow-xs'
                }`}
              >
                <Clock className="w-4 h-4 md:w-5 md:h-5 shrink-0" />
                <span>{formatTimer(timeLeft)}</span>
              </div>
            </div>

            {/* Thân bài thi */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Cột chính: Nội dung câu hỏi và các phương án */}
              <div className="lg:col-span-3 space-y-5">
                {activeExam.questionIds && activeExam.questionIds[activeQuestionIndex] ? (
                  (() => {
                    const currentQ = activeExam.questionIds[activeQuestionIndex]
                    const selectedChoice = studentAnswers[activeQuestionIndex]

                    return (
                      <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200 space-y-4">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                          <span className="text-blue-700 bg-blue-100/70 px-2.5 py-1 rounded-lg">
                            Câu {activeQuestionIndex + 1} / {totalQuestions}
                          </span>
                          {currentQ.chapter && (
                            <span className="text-slate-500 font-medium">
                              Chương: {currentQ.chapter}
                            </span>
                          )}
                        </div>

                        <p className="text-sm md:text-base font-semibold text-slate-900 whitespace-pre-line leading-relaxed">
                          {currentQ.content}
                        </p>

                        {/* Danh sách các lựa chọn trắc nghiệm */}
                        <div className="space-y-2.5 pt-2">
                          {currentQ.options?.map((opt, oIdx) => {
                            const isSelected = selectedChoice === oIdx
                            return (
                              <label
                                key={oIdx}
                                onClick={() => handleSelectOption(activeQuestionIndex, oIdx)}
                                className={`p-3.5 rounded-xl border text-xs md:text-sm font-medium flex items-center gap-3 cursor-pointer transition-all ${
                                  isSelected
                                    ? 'bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-200 shadow-xs'
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/80 hover:border-slate-300'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`question_${activeQuestionIndex}`}
                                  checked={isSelected}
                                  onChange={() => handleSelectOption(activeQuestionIndex, oIdx)}
                                  className="w-4 h-4 text-blue-600 focus:ring-0 cursor-pointer"
                                />
                                <span
                                  className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                                    isSelected
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  {String.fromCharCode(65 + oIdx)}
                                </span>
                                <span className="flex-1">{opt}</span>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })()
                ) : (
                  <div className="p-8 text-center text-slate-500">
                    Không có câu hỏi trong đề kiểm tra
                  </div>
                )}

                {/* Nút chuyển qua lại giữa các câu */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    disabled={activeQuestionIndex === 0}
                    onClick={() => setActiveQuestionIndex((prev) => Math.max(0, prev - 1))}
                    className="px-4 py-2 border border-slate-300 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent text-slate-700 text-xs md:text-sm font-bold rounded-xl flex items-center gap-1.5 transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Câu trước</span>
                  </button>

                  <button
                    type="button"
                    disabled={activeQuestionIndex >= totalQuestions - 1}
                    onClick={() =>
                      setActiveQuestionIndex((prev) => Math.min(totalQuestions - 1, prev + 1))
                    }
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 text-white text-xs md:text-sm font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
                  >
                    <span>Câu tiếp theo</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Cột phụ: Bảng điều hướng câu hỏi (Palette) */}
              <div className="lg:col-span-1 bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>Mục lục câu hỏi</span>
                    <span className="text-blue-700">
                      {answeredCount} / {totalQuestions} đã làm
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-2 max-h-56 overflow-y-auto p-1">
                    {activeExam.questionIds?.map((_, qIdx) => {
                      const isAnswered =
                        studentAnswers[qIdx] !== undefined && studentAnswers[qIdx] !== null
                      const isCurrent = qIdx === activeQuestionIndex

                      return (
                        <button
                          key={qIdx}
                          type="button"
                          onClick={() => setActiveQuestionIndex(qIdx)}
                          className={`h-9 rounded-xl text-xs font-bold transition-all flex items-center justify-center ${
                            isCurrent
                              ? 'ring-2 ring-blue-600 ring-offset-1 bg-blue-600 text-white shadow-xs'
                              : isAnswered
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {qIdx + 1}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Nút chủ động nộp bài */}
                <div className="pt-3 border-t border-slate-200 space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowConfirmSubmit(true)}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs md:text-sm font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all"
                  >
                    <Send className="w-4 h-4" />
                    <span>Nộp bài kiểm tra</span>
                  </button>

                  <p className="text-[11px] text-slate-500 text-center">
                    Bạn có thể nộp bài bất kỳ lúc nào trước khi đồng hồ đếm ngược kết thúc.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN NỘP BÀI THI */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Send className="w-5 h-5 text-emerald-600" />
              Xác nhận nộp bài kiểm tra
            </h3>

            <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
              Bạn đã hoàn thành <strong>{answeredCount}</strong> / <strong>{totalQuestions}</strong> câu hỏi.
              {answeredCount < totalQuestions && (
                <span className="block mt-1.5 text-amber-700 font-semibold">
                  ⚠️ Vẫn còn {totalQuestions - answeredCount} câu chưa chọn đáp án. Bạn có chắc chắn muốn nộp bài ngay bây giờ?
                </span>
              )}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setShowConfirmSubmit(false)}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl"
              >
                Tiếp tục làm bài
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSubmitExam(false)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs"
              >
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Đang chấm điểm...</span>
                  </>
                ) : (
                  <span>Đồng ý nộp bài</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL KẾT QUẢ BÀI LÀM VÀ XEM LẠI ĐÁP ÁN ĐÚNG/SAI SAU KHI NỘP BÀI          */}
      {/* ========================================================================= */}
      {examResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header kết quả */}
            <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 flex items-center justify-between shrink-0">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                  Kết quả bài kiểm tra
                </span>
                <h2 className="text-base md:text-lg font-bold text-slate-900">
                  {examResult.exam?.title || 'Bài kiểm tra'}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setExamResult(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Thống kê điểm số & số câu đúng/sai */}
            <div className="p-4 md:p-6 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center space-y-1 shadow-2xs">
                <span className="text-xs text-slate-500 font-medium">Điểm số</span>
                <p className="text-xl md:text-2xl font-black text-blue-600">
                  {examResult.score}
                  <span className="text-xs text-slate-400 font-normal"> / {examResult.scoreWeight || 10}</span>
                </p>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-emerald-200 text-center space-y-1 shadow-2xs">
                <span className="text-xs text-emerald-600 font-medium">Số câu đúng</span>
                <p className="text-xl md:text-2xl font-black text-emerald-600">
                  {examResult.correctCount}
                </p>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-rose-200 text-center space-y-1 shadow-2xs">
                <span className="text-xs text-rose-600 font-medium">Số câu sai</span>
                <p className="text-xl md:text-2xl font-black text-rose-600">
                  {examResult.wrongCount}
                </p>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-amber-200 text-center space-y-1 shadow-2xs">
                <span className="text-xs text-amber-600 font-medium">Bỏ trống</span>
                <p className="text-xl md:text-2xl font-black text-amber-600">
                  {examResult.unansweredCount}
                </p>
              </div>
            </div>

            {/* Chi tiết từng câu hỏi: Đáp án đã chọn vs Đáp án đúng & Lời giải */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Award className="w-4 h-4 text-blue-600" />
                Chi tiết đáp án & Lời giải thích từ giáo viên
              </h3>

              {examResult.answers?.map((ansItem, aIdx) => {
                const q = ansItem.question
                if (!q) return null

                const isCorrect = ansItem.isCorrect
                const selected = ansItem.selectedOption
                const correct = q.correctIndex

                return (
                  <div
                    key={q._id || aIdx}
                    className={`p-4 rounded-xl border space-y-3 transition-all ${
                      isCorrect
                        ? 'bg-emerald-50/40 border-emerald-200'
                        : selected === null || selected === undefined
                        ? 'bg-amber-50/30 border-amber-200'
                        : 'bg-rose-50/40 border-rose-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-800">
                        Câu {aIdx + 1}: {q.chapter || 'Tổng quan'}
                      </span>
                      {isCorrect ? (
                        <span className="flex items-center gap-1 text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Đúng
                        </span>
                      ) : selected === null || selected === undefined ? (
                        <span className="flex items-center gap-1 text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
                          <HelpCircle className="w-3.5 h-3.5" />
                          Chưa trả lời
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full">
                          <XCircle className="w-3.5 h-3.5" />
                          Sai
                        </span>
                      )}
                    </div>

                    <p className="text-xs md:text-sm font-semibold text-slate-900 whitespace-pre-line leading-relaxed">
                      {q.content}
                    </p>

                    {/* Danh sách các đáp án có highlight đáp án đúng */}
                    <div className="space-y-2 pt-1">
                      {q.options?.map((opt, oIdx) => {
                        const isStudentChoice = selected === oIdx
                        const isTheCorrectChoice = correct === oIdx

                        let itemStyle = 'bg-white border-slate-200 text-slate-700'
                        if (isTheCorrectChoice) {
                          itemStyle =
                            'bg-emerald-100/90 border-emerald-400 text-emerald-950 font-bold ring-1 ring-emerald-300'
                        } else if (isStudentChoice && !isCorrect) {
                          itemStyle =
                            'bg-rose-100/90 border-rose-400 text-rose-950 font-medium'
                        }

                        return (
                          <div
                            key={oIdx}
                            className={`p-2.5 rounded-xl border text-xs md:text-sm flex items-center justify-between gap-3 ${itemStyle}`}
                          >
                            <div className="flex items-center gap-2.5 flex-1">
                              <span
                                className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${
                                  isTheCorrectChoice
                                    ? 'bg-emerald-600 text-white'
                                    : isStudentChoice
                                    ? 'bg-rose-600 text-white'
                                    : 'bg-slate-200 text-slate-700'
                                }`}
                              >
                                {String.fromCharCode(65 + oIdx)}
                              </span>
                              <span>{opt}</span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 text-xs font-bold">
                              {isStudentChoice && (
                                <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white text-[10px]">
                                  Bạn đã chọn
                                </span>
                              )}
                              {isTheCorrectChoice && (
                                <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px]">
                                  Đáp án đúng
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Lời giải thích */}
                    {q.explanation && (
                      <div className="mt-3 p-3 bg-white/80 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
                        <strong className="text-blue-700 block">Lời giải chi tiết:</strong>
                        <p className="whitespace-pre-line leading-relaxed">{q.explanation}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Footer kết quả */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => setExamResult(null)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs md:text-sm font-semibold rounded-xl"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {loadingResult && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-slate-900/30 backdrop-blur-2xs">
          <LoadingSpinner text="Đang xử lý dữ liệu..." />
        </div>
      )}
    </div>
  )
}

export default StudentExamListPage
