import { useState, useEffect } from 'react'
import {
  FileText,
  Clock,
  Award,
  Layers,
  Eye,
  X,
  AlertCircle,
  HelpCircle,
} from 'lucide-react'
import examApi from '@/api/examApi'
import LoadingSpinner from '@/components/common/LoadingSpinner'

export const StudentExamListPage = () => {
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedExam, setSelectedExam] = useState(null)

  // Lưu câu trả lời thử của học sinh trên giao diện (chỉ client-side)
  const [studentAnswers, setStudentAnswers] = useState({})

  useEffect(() => {
    let ignore = false

    const fetchExams = async () => {
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

    fetchExams()

    return () => {
      ignore = true
    }
  }, [])

  const handleOpenExam = async (examId) => {
    try {
      const res = await examApi.getExamById(examId)
      if (res?.data) {
        setSelectedExam(res.data)
        setStudentAnswers({})
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể xem chi tiết đề kiểm tra')
    }
  }

  const handleSelectAnswer = (qIndex, oIndex) => {
    setStudentAnswers((prev) => ({
      ...prev,
      [qIndex]: oIndex,
    }))
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200">
        <h1 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-2.5">
          <FileText className="w-6 h-6 text-blue-600" />
          Đề kiểm tra & Bài thi
        </h1>
        <p className="text-xs md:text-sm text-slate-500 mt-1">
          Danh sách các bài kiểm tra trắc nghiệm được giáo viên phát hành cho lớp học của bạn.
        </p>
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
          {exams.map((exam) => (
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

                <div className="space-y-1 text-xs text-slate-600">
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
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => handleOpenExam(exam._id)}
                  className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Eye className="w-4 h-4" />
                  <span>Xem đề & Làm bài</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL XEM ĐỀ DÀNH CHO HỌC SINH (HOÀN TOÀN KHÔNG CÓ ĐÁP ÁN ĐÚNG) */}
      {selectedExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border border-slate-200 overflow-hidden my-8 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base md:text-lg font-bold text-slate-800">
                  {selectedExam.title}
                </h3>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                  <span>Môn: <strong>{selectedExam.teachingAssignment?.subject?.name}</strong></span>
                  <span>Thời gian: <strong>{selectedExam.duration} phút</strong></span>
                  <span>Tổng số: <strong>{selectedExam.questionIds?.length || 0} câu</strong></span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedExam(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-5 overflow-y-auto flex-1">
              {selectedExam.description && (
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900">
                  <strong>Hướng dẫn:</strong> {selectedExam.description}
                </div>
              )}

              <div className="space-y-4">
                {selectedExam.questionIds?.map((q, qIdx) => {
                  const selectedOption = studentAnswers[qIdx]
                  return (
                    <div
                      key={q._id || qIdx}
                      className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3"
                    >
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                        <span className="text-blue-700 font-bold">
                          Câu {qIdx + 1}: {q.chapter}
                        </span>
                      </div>

                      <p className="text-sm font-semibold text-slate-900 whitespace-pre-line leading-relaxed">
                        {q.content}
                      </p>

                      {/* Các phương án A, B, C, D để học sinh chọn làm bài (KHÔNG HIỂN THỊ ĐÁP ÁN ĐÚNG) */}
                      <div className="space-y-2 pt-1">
                        {q.options?.map((opt, oIdx) => {
                          const isSelected = selectedOption === oIdx
                          return (
                            <label
                              key={oIdx}
                              onClick={() => handleSelectAnswer(qIdx, oIdx)}
                              className={`p-2.5 rounded-xl border text-xs md:text-sm font-medium flex items-center gap-2.5 cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-blue-50 border-blue-400 text-blue-900 shadow-xs'
                                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`question_${qIdx}`}
                                checked={isSelected}
                                onChange={() => handleSelectAnswer(qIdx, oIdx)}
                                className="w-4 h-4 text-blue-600 focus:ring-0 cursor-pointer"
                              />
                              <span
                                className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${
                                  isSelected
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-200 text-slate-700'
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
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500">
                Đã chọn: <strong>{Object.keys(studentAnswers).length}</strong> / {selectedExam.questionIds?.length || 0} câu
              </span>
              <button
                type="button"
                onClick={() => setSelectedExam(null)}
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

export default StudentExamListPage
