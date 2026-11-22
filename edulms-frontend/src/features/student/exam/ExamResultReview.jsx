import { useState, useMemo } from 'react'
import {
  Award,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Filter,
  Check,
  X,
  BookOpen,
} from 'lucide-react'

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F']

/**
 * Format số giây thành định dạng đọc được (ví dụ: "15 phút 30 giây")
 */
function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '0 giây'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s} giây`
  if (s === 0) return `${m} phút`
  return `${m} phút ${s} giây`
}

/**
 * Chuẩn hóa danh sách câu hỏi và kết quả bài làm
 */
function normalizeQuestions(attempt, exam) {
  if (!attempt) return []

  // Ưu tiên lấy từ attempt.answers (Backend trả về câu hỏi đã populate)
  if (Array.isArray(attempt.answers) && attempt.answers.length > 0) {
    return attempt.answers.map((ans, idx) => {
      const q = typeof ans.question === 'object' && ans.question !== null ? ans.question : null
      const examQ = exam?.questions?.find((eq) => String(eq._id) === String(ans.questionId || ans.question))

      const content = q?.content || examQ?.content || ans.content || `Câu hỏi ${idx + 1}`
      const options = q?.options || examQ?.options || ans.options || []
      const correctIndex = ans.correctIndex ?? q?.correctIndex ?? examQ?.correctIndex ?? null
      const selectedOption = ans.selectedOption ?? null
      const isCorrect = Boolean(ans.isCorrect)
      const isUnanswered = selectedOption === null || selectedOption === undefined
      const explanation = q?.explanation || examQ?.explanation || ans.explanation || ''
      const chapter = q?.chapter || examQ?.chapter || ''

      return {
        id: q?._id || ans._id || `q_${idx}`,
        idx,
        content,
        options,
        selectedOption,
        correctIndex,
        isCorrect,
        isUnanswered,
        explanation,
        chapter,
      }
    })
  }

  // Fallback nếu chỉ có exam.questions
  if (Array.isArray(exam?.questions)) {
    return exam.questions.map((q, idx) => ({
      id: q._id || `q_${idx}`,
      idx,
      content: q.content,
      options: q.options || [],
      selectedOption: null,
      correctIndex: q.correctIndex ?? null,
      isCorrect: false,
      isUnanswered: true,
      explanation: q.explanation || '',
      chapter: q.chapter || '',
    }))
  }

  return []
}

/**
 * ExamResultReview — Component hiển thị kết quả bài làm và xem lại từng câu hỏi với Accordion
 *
 * Props:
 *   attempt         {Object}    Kết quả bài làm từ Backend (ExamAttempt)
 *   exam            {Object}    Thông tin đề kiểm tra (tùy chọn)
 *   onBack          {Function}  Hàm xử lý khi bấm nút "Quay lại lớp học"
 *   backButtonLabel {string}    Nhãn nút quay lại (mặc định: "Quay lại lớp học")
 */
export default function ExamResultReview({
  attempt,
  exam,
  onBack,
  backButtonLabel = 'Quay lại lớp học',
}) {
  const items = useMemo(() => normalizeQuestions(attempt, exam), [attempt, exam])

  // Trạng thái mở/đóng accordion cho từng câu (mặc định mở câu đầu tiên)
  const [openItems, setOpenItems] = useState(() => {
    const initial = {}
    if (items.length > 0) {
      initial[0] = true // mở câu 1 mặc định
    }
    return initial
  })

  // Bộ lọc: 'all' | 'correct' | 'wrong' | 'unanswered'
  const [filter, setFilter] = useState('all')

  const toggleAccordion = (idx) => {
    setOpenItems((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }))
  }

  const expandAll = () => {
    const next = {}
    items.forEach((_, idx) => {
      next[idx] = true
    })
    setOpenItems(next)
  }

  const collapseAll = () => {
    setOpenItems({})
  }

  // Danh sách sau khi áp dụng bộ lọc
  const filteredItems = useMemo(() => {
    if (filter === 'correct') return items.filter((i) => i.isCorrect)
    if (filter === 'wrong') return items.filter((i) => !i.isCorrect && !i.isUnanswered)
    if (filter === 'unanswered') return items.filter((i) => i.isUnanswered)
    return items
  }, [items, filter])

  // Thông tin tổng quan
  const examTitle = exam?.title || attempt?.exam?.title || 'Bài kiểm tra trực tuyến'
  const className =
    exam?.teachingAssignment?.class?.name ||
    attempt?.exam?.teachingAssignment?.class?.name ||
    ''
  const subjectName =
    exam?.teachingAssignment?.subject?.name ||
    attempt?.exam?.teachingAssignment?.subject?.name ||
    ''

  const score = Number(attempt?.score ?? 0)
  const scoreWeight = Number(attempt?.scoreWeight ?? exam?.scoreWeight ?? 10)
  const totalQuestions = attempt?.totalQuestions ?? items.length
  const correctCount = attempt?.correctCount ?? items.filter((i) => i.isCorrect).length
  const wrongCount = attempt?.wrongCount ?? items.filter((i) => !i.isCorrect && !i.isUnanswered).length
  const unansweredCount = attempt?.unansweredCount ?? items.filter((i) => i.isUnanswered).length

  const scorePercent = scoreWeight > 0 ? Math.round((score / scoreWeight) * 100) : 0
  const durationSpent = attempt?.durationSpent ?? 0

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col gap-6">
      {/* Nút quay lại & Tiêu đề bài kiểm tra */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 active:bg-gray-100 font-semibold text-sm transition-all shadow-xs self-start"
          >
            <ArrowLeft className="w-4 h-4 text-gray-600" />
            <span>{backButtonLabel}</span>
          </button>
        )}

        {(className || subjectName) && (
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
            {subjectName && (
              <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                {subjectName}
              </span>
            )}
            {className && (
              <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                Lớp {className}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 1. MÀN HÌNH TỔNG QUAN KẾT QUẢ BÀI LÀM                                    */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
              Kết quả bài làm
            </span>
            <h1 className="text-2xl font-extrabold text-gray-900 mt-0.5">{examTitle}</h1>
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Thời gian làm bài: <strong>{formatDuration(durationSpent)}</strong>
            </p>
          </div>

          {/* Huy hiệu điểm số lớn */}
          <div className="flex items-center gap-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4 self-start md:self-auto">
            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase">Điểm số đạt được</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-blue-700">
                  {score.toFixed(2)}
                </span>
                <span className="text-sm font-semibold text-gray-500">
                  / {scoreWeight} điểm
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Thẻ thống kê chi tiết */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Tổng số câu */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-center">
            <div className="flex items-center justify-center gap-1 text-slate-500 text-xs font-semibold mb-1">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Tổng số câu</span>
            </div>
            <p className="text-2xl font-black text-slate-800">{totalQuestions}</p>
          </div>

          {/* Số câu đúng */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-center">
            <div className="flex items-center justify-center gap-1 text-emerald-600 text-xs font-semibold mb-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Số câu đúng</span>
            </div>
            <p className="text-2xl font-black text-emerald-700">{correctCount}</p>
          </div>

          {/* Số câu sai */}
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-center">
            <div className="flex items-center justify-center gap-1 text-rose-600 text-xs font-semibold mb-1">
              <XCircle className="w-3.5 h-3.5" />
              <span>Số câu sai</span>
            </div>
            <p className="text-2xl font-black text-rose-600">{wrongCount}</p>
          </div>

          {/* Chưa trả lời */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-center">
            <div className="flex items-center justify-center gap-1 text-amber-700 text-xs font-semibold mb-1">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Chưa làm</span>
            </div>
            <p className="text-2xl font-black text-amber-800">{unansweredCount}</p>
          </div>
        </div>

        {/* Thanh tiến trình tỷ lệ phần trăm */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs font-bold text-gray-600">
            <span>Tỷ lệ hoàn thành chính xác</span>
            <span>{scorePercent}%</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-gray-100 overflow-hidden flex">
            <div
              className="bg-emerald-500 h-full transition-all duration-500"
              style={{
                width: totalQuestions > 0 ? `${(correctCount / totalQuestions) * 100}%` : '0%',
              }}
              title={`Đúng: ${correctCount}`}
            />
            <div
              className="bg-rose-500 h-full transition-all duration-500"
              style={{
                width: totalQuestions > 0 ? `${(wrongCount / totalQuestions) * 100}%` : '0%',
              }}
              title={`Sai: ${wrongCount}`}
            />
            <div
              className="bg-amber-400 h-full transition-all duration-500"
              style={{
                width: totalQuestions > 0 ? `${(unansweredCount / totalQuestions) * 100}%` : '0%',
              }}
              title={`Chưa làm: ${unansweredCount}`}
            />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. THANH ĐIỀU KHIỂN & BỘ LỌC CÂU HỎI                                     */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Bộ lọc trạng thái câu */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium">
          <span className="text-gray-400 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            Lọc:
          </span>
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filter === 'all'
                ? 'bg-blue-600 text-white font-bold shadow-xs'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Tất cả ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('correct')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filter === 'correct'
                ? 'bg-emerald-600 text-white font-bold shadow-xs'
                : 'bg-white border border-gray-200 text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            Đúng ({correctCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('wrong')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filter === 'wrong'
                ? 'bg-rose-600 text-white font-bold shadow-xs'
                : 'bg-white border border-gray-200 text-rose-700 hover:bg-rose-50'
            }`}
          >
            Sai ({wrongCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('unanswered')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filter === 'unanswered'
                ? 'bg-amber-600 text-white font-bold shadow-xs'
                : 'bg-white border border-gray-200 text-amber-700 hover:bg-amber-50'
            }`}
          >
            Chưa làm ({unansweredCount})
          </button>
        </div>

        {/* Nút Mở rộng / Thu gọn tất cả Accordion */}
        <div className="flex items-center gap-2 text-xs font-medium">
          <button
            type="button"
            onClick={expandAll}
            className="text-blue-600 hover:text-blue-800 hover:underline"
          >
            Mở rộng tất cả
          </button>
          <span className="text-gray-300">|</span>
          <button
            type="button"
            onClick={collapseAll}
            className="text-gray-500 hover:text-gray-700 hover:underline"
          >
            Thu gọn tất cả
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. DANH SÁCH CÂU HỎI DẠNG ACCORDION XEM LẠI                               */}
      {/* ========================================================================= */}
      <div className="flex flex-col gap-3">
        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
            Không có câu hỏi nào phù hợp với bộ lọc hiện tại.
          </div>
        ) : (
          filteredItems.map((item) => {
            const isOpen = Boolean(openItems[item.idx])

            // Kiểu viền và huy hiệu theo kết quả câu hỏi
            let badgeColor = 'bg-gray-100 text-gray-700 border-gray-300'
            let borderColor = 'border-gray-200'
            let statusText = 'Chưa làm'
            let StatusIcon = HelpCircle

            if (item.isCorrect) {
              badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-300'
              borderColor = 'border-emerald-300'
              statusText = 'Đúng'
              StatusIcon = CheckCircle2
            } else if (!item.isUnanswered) {
              badgeColor = 'bg-rose-50 text-rose-700 border-rose-300'
              borderColor = 'border-rose-300'
              statusText = 'Sai'
              StatusIcon = XCircle
            }

            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl border-2 transition-all shadow-xs overflow-hidden ${borderColor}`}
              >
                {/* Header của Accordion (nhấn để mở/đóng) */}
                <button
                  type="button"
                  onClick={() => toggleAccordion(item.idx)}
                  className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left hover:bg-gray-50/70 transition-colors"
                  aria-expanded={isOpen}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Icon & Badge đúng/sai */}
                    <div
                      className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-bold ${badgeColor}`}
                    >
                      <StatusIcon className="w-3.5 h-3.5" />
                      <span>{statusText}</span>
                    </div>

                    {/* Tiêu đề tóm tắt */}
                    <div className="min-w-0 flex items-baseline gap-2">
                      <span className="font-extrabold text-gray-900 text-sm shrink-0">
                        Câu {item.idx + 1}:
                      </span>
                      <p className="text-sm font-medium text-gray-700 truncate">
                        {item.content}
                      </p>
                    </div>
                  </div>

                  {/* Nút mũi tên Accordion */}
                  <div className="shrink-0 text-gray-400">
                    {isOpen ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </div>
                </button>

                {/* Nội dung chi tiết câu hỏi (Accordion Body) */}
                {isOpen && (
                  <div className="px-5 pb-5 pt-2 border-t border-gray-100 flex flex-col gap-4">
                    {/* Nội dung câu hỏi đầy đủ */}
                    <div className="text-base font-semibold text-gray-900 leading-relaxed whitespace-pre-wrap">
                      {item.content}
                    </div>

                    {/* Danh sách các phương án lựa chọn */}
                    <div className="flex flex-col gap-2.5">
                      {item.options.map((opt, optIdx) => {
                        const optText =
                          typeof opt === 'string'
                            ? opt
                            : opt.text ?? opt.content ?? ''

                        const isStudentPick = optIdx === item.selectedOption
                        const isCorrectAnswer = optIdx === item.correctIndex

                        // Phân loại style cho từng phương án
                        let optStyle = 'border-gray-200 bg-white text-gray-700'
                        let badgeElement = null

                        if (isCorrectAnswer && isStudentPick) {
                          // Học sinh chọn đúng
                          optStyle =
                            'border-emerald-500 bg-emerald-50 text-emerald-950 font-medium'
                          badgeElement = (
                            <span className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-md">
                              <Check className="w-3.5 h-3.5" />
                              Đáp án đúng của bạn
                            </span>
                          )
                        } else if (isCorrectAnswer) {
                          // Đáp án đúng của đề (học sinh không chọn)
                          optStyle =
                            'border-emerald-500 bg-emerald-50/70 text-emerald-950 font-medium'
                          badgeElement = (
                            <span className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-md">
                              <Check className="w-3.5 h-3.5" />
                              Đáp án đúng
                            </span>
                          )
                        } else if (isStudentPick) {
                          // Học sinh chọn sai
                          optStyle =
                            'border-rose-400 bg-rose-50 text-rose-950 font-medium'
                          badgeElement = (
                            <span className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-100 px-2.5 py-1 rounded-md">
                              <X className="w-3.5 h-3.5" />
                              Bạn đã chọn
                            </span>
                          )
                        }

                        return (
                          <div
                            key={optIdx}
                            className={`flex items-start gap-3 px-4 py-3 rounded-xl border-2 transition-all ${optStyle}`}
                          >
                            <span
                              className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                isCorrectAnswer
                                  ? 'bg-emerald-600 text-white'
                                  : isStudentPick
                                  ? 'bg-rose-500 text-white'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {OPTION_LABELS[optIdx] ?? optIdx + 1}
                            </span>
                            <span className="pt-0.5 text-sm leading-relaxed">
                              {optText}
                            </span>
                            {badgeElement}
                          </div>
                        )
                      })}
                    </div>

                    {/* Lời giải chi tiết (chỉ hiển thị khi có dữ liệu) */}
                    {item.explanation && (
                      <div className="mt-1 bg-blue-50/60 border border-blue-200 rounded-xl p-4 text-sm text-blue-900 flex flex-col gap-1">
                        <span className="font-bold text-xs uppercase tracking-wide text-blue-700">
                          Lời giải chi tiết:
                        </span>
                        <p className="leading-relaxed whitespace-pre-wrap">
                          {item.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Nút quay lại cuối trang */}
      {onBack && (
        <div className="pt-2 flex justify-start">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-900 text-white font-semibold text-sm transition-all shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{backButtonLabel}</span>
          </button>
        </div>
      )}
    </div>
  )
}
