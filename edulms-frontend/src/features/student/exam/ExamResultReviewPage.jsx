import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import examApi from '../../../api/examApi'
import ExamResultReview from './ExamResultReview'

export default function ExamResultReviewPage() {
  const { examId } = useParams()
  const navigate = useNavigate()

  const [attempt, setAttempt] = useState(null)
  const [exam, setExam] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!examId) return
    let isMounted = true

    const fetchResult = async () => {
      try {
        // Gọi song song hoặc lấy kết quả bài làm chi tiết
        const res = await examApi.getExamResult(examId)
        if (!isMounted) return

        const attemptData = res?.data?.data || res?.data
        setAttempt(attemptData)

        // Nếu attempt có chứa thông tin exam populate sẵn
        if (attemptData?.exam) {
          setExam(attemptData.exam)
        }
      } catch (err) {
        if (!isMounted) return
        const msg =
          err?.response?.data?.message ||
          'Không thể tải kết quả bài làm. Có thể bạn chưa nộp bài hoặc đề thi chưa kết thúc.'
        setError(msg)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchResult()

    return () => {
      isMounted = false
    }
  }, [examId])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-gray-500">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium">Đang tải kết quả bài làm…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 bg-white rounded-2xl border border-red-200 shadow-sm flex flex-col items-center text-center gap-4">
        <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Không thể xem kết quả</h2>
          <p className="text-sm text-gray-600 mt-1">{error}</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/student/exams')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold text-sm rounded-xl transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại danh sách bài kiểm tra
        </button>
      </div>
    )
  }

  return (
    <ExamResultReview
      attempt={attempt}
      exam={exam}
      onBack={() => navigate('/student/exams')}
      backButtonLabel="Quay lại lớp học"
    />
  )
}
