import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react'

import examApi from '../../../api/examApi'
import ExamCountdown from './ExamCountdown'
import ExamQuestion from './ExamQuestion'
import ExamNavPalette from './ExamNavPalette'
import ExamResultReview from './ExamResultReview'
import useExamSession from './useExamSession'

// ---------------------------------------------------------------------------
// ConfirmSubmitDialog — Xác nhận nộp bài
// ---------------------------------------------------------------------------
function ConfirmSubmitDialog({ unanswered, onConfirm, onCancel, isSubmitting }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
        <div className="flex items-center gap-3 mb-3">
          <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />
          <h3 className="text-lg font-bold text-gray-800">Xác nhận nộp bài</h3>
        </div>
        {unanswered > 0 && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
            Bạn còn <strong>{unanswered} câu chưa trả lời</strong>. Các câu này sẽ bị tính sai.
          </p>
        )}
        <p className="text-sm text-gray-600 mb-5">
          Sau khi nộp bài, bạn sẽ không thể thay đổi đáp án. Bạn có chắc chắn muốn nộp không?
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium transition-colors disabled:opacity-50"
          >
            Tiếp tục làm
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="flex-1 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium transition-colors disabled:opacity-60"
          >
            {isSubmitting ? 'Đang nộp…' : 'Xác nhận nộp'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ExamTakingPage — Trang chính
// ---------------------------------------------------------------------------
export default function ExamTakingPage() {
  const { examId } = useParams()
  const navigate = useNavigate()

  const [exam, setExam] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [showConfirm, setShowConfirm] = useState(false)
  const [result, setResult] = useState(null) // kết quả sau khi nộp

  // Callback khi nộp bài thành công
  const handleSubmitDone = useCallback((data) => {
    setResult(data)
    setShowConfirm(false)
  }, [])

  const { timeLeft, answers, selectAnswer, handleSubmit, isSubmitting, submitError } =
    useExamSession(examId, exam, handleSubmitDone)

  // Fetch đề kiểm tra
  useEffect(() => {
    if (!examId) return
    let isMounted = true

    examApi
      .getExamById(examId)
      .then((res) => {
        if (!isMounted) return
        const data = res?.data?.data
        // Nếu đã nộp trước đó, load kết quả luôn
        if (data?.hasSubmitted && data?.attempt) {
          setResult(data.attempt)
        }
        setExam(data)
      })
      .catch((err) => {
        if (!isMounted) return
        setFetchError(err?.response?.data?.message ?? 'Không thể tải đề kiểm tra.')
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [examId])

  const questions = exam?.questions ?? []
  const currentQuestion = questions[currentIndex] ?? null
  const durationSec = (exam?.duration ?? 60) * 60

  // Nộp bài — khi đã xác nhận
  const confirmAndSubmit = useCallback(async () => {
    await handleSubmit()
    setShowConfirm(false)
  }, [handleSubmit])

  // Loading
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-gray-500">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p>Đang tải đề kiểm tra…</p>
      </div>
    )
  }

  // Lỗi fetch
  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertTriangle className="w-10 h-10 text-red-400" />
        <p className="text-red-600 font-medium">{fetchError}</p>
        <button
          type="button"
          onClick={() => navigate('/student/exams')}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium"
        >
          Quay lại
        </button>
      </div>
    )
  }

  // Kết quả (đã nộp)
  if (result) {
    return (
      <ExamResultReview
        exam={exam}
        attempt={result}
        onBack={() => navigate('/student/exams')}
        backButtonLabel="Quay lại lớp học"
      />
    )
  }

  const unansweredCount = questions.filter(
    (q) => answers[q._id] === undefined || answers[q._id] === null
  ).length

  return (
    <>
      {/* Dialog xác nhận nộp */}
      {showConfirm && (
        <ConfirmSubmitDialog
          unanswered={unansweredCount}
          onConfirm={confirmAndSubmit}
          onCancel={() => setShowConfirm(false)}
          isSubmitting={isSubmitting}
        />
      )}

      <div className="flex flex-col h-full min-h-screen bg-gray-50">
        {/* Thanh top — tên đề + đồng hồ */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex flex-col min-w-0">
            <span className="text-xs text-gray-500 uppercase tracking-wide">Đề kiểm tra</span>
            <h1 className="text-base font-bold text-gray-800 truncate">{exam?.title}</h1>
          </div>
          <ExamCountdown timeLeft={timeLeft} duration={durationSec} />
        </header>

        {/* Nội dung */}
        <div className="flex flex-1 gap-0 md:gap-6 max-w-6xl mx-auto w-full px-4 py-5">
          {/* Vùng câu hỏi */}
          <main className="flex-1 flex flex-col gap-5">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex-1">
              <ExamQuestion
                question={currentQuestion}
                questionIndex={currentIndex}
                totalQuestions={questions.length}
                selectedOption={
                  currentQuestion ? (answers[currentQuestion._id] ?? null) : null
                }
                onSelect={(optIdx) => {
                  if (currentQuestion) selectAnswer(currentQuestion._id, optIdx)
                }}
              />
            </div>

            {/* Điều hướng Trước / Sau */}
            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                disabled={currentIndex === 0}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Câu trước
              </button>
              <button
                type="button"
                onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
                disabled={currentIndex === questions.length - 1}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Câu sau
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Lỗi nộp bài */}
            {submitError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2.5 text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {submitError}
              </div>
            )}
          </main>

          {/* Thanh bên — bảng điều hướng */}
          <aside className="hidden md:block w-64 shrink-0">
            <div className="sticky top-20 bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
              <ExamNavPalette
                questions={questions}
                answers={answers}
                currentIndex={currentIndex}
                onNavigate={setCurrentIndex}
                onSubmit={() => setShowConfirm(true)}
                isSubmitting={isSubmitting}
              />
            </div>
          </aside>
        </div>

        {/* Thanh bottom trên mobile — nút nộp bài */}
        <div className="md:hidden sticky bottom-0 bg-white border-t border-gray-200 px-4 py-3">
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Đang nộp bài…' : `Nộp bài (${questions.length - unansweredCount}/${questions.length} câu)`}
          </button>
        </div>
      </div>
    </>
  )
}
