import { Send } from 'lucide-react'

/**
 * ExamNavPalette — Bảng điều hướng câu hỏi & nút nộp bài
 * Props:
 *   questions     {Array}    Danh sách câu hỏi
 *   answers       {Object}   { [questionId]: optionIndex }
 *   currentIndex  {number}   Câu đang hiển thị (0-based)
 *   onNavigate    {Function} (index) => void
 *   onSubmit      {Function} () => void
 *   isSubmitting  {boolean}
 */
export default function ExamNavPalette({
  questions,
  answers,
  currentIndex,
  onNavigate,
  onSubmit,
  isSubmitting,
}) {
  const totalAnswered = questions.filter(
    (q) => answers[q._id] !== undefined && answers[q._id] !== null
  ).length

  return (
    <div className="flex flex-col gap-4">
      {/* Tiến độ */}
      <div className="text-sm text-gray-600 font-medium">
        Đã làm:{' '}
        <span className="font-bold text-blue-600">{totalAnswered}</span>
        /{questions.length} câu
      </div>

      {/* Lưới điều hướng */}
      <div className="grid grid-cols-5 gap-2">
        {questions.map((q, idx) => {
          const answered =
            answers[q._id] !== undefined && answers[q._id] !== null
          const isCurrent = idx === currentIndex
          return (
            <button
              key={q._id ?? idx}
              type="button"
              onClick={() => onNavigate(idx)}
              title={`Câu ${idx + 1}`}
              className={[
                'w-9 h-9 rounded-lg text-sm font-semibold transition-all',
                isCurrent
                  ? 'ring-2 ring-blue-500 ring-offset-1 bg-blue-500 text-white'
                  : answered
                  ? 'bg-green-100 text-green-800 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              ].join(' ')}
            >
              {idx + 1}
            </button>
          )
        })}
      </div>

      {/* Chú thích */}
      <div className="flex gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-green-200 border border-green-400" />
          Đã làm
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-gray-200 border border-gray-300" />
          Chưa làm
        </span>
      </div>

      {/* Nút nộp bài */}
      <button
        type="button"
        onClick={onSubmit}
        disabled={isSubmitting}
        className="mt-2 flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        <Send className="w-4 h-4" />
        {isSubmitting ? 'Đang nộp bài…' : 'Nộp bài'}
      </button>
    </div>
  )
}
