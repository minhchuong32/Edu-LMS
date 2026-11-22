/**
 * ExamQuestion — Hiển thị một câu hỏi và các đáp án để học sinh chọn
 * Props:
 *   question       {Object}  Câu hỏi (content, options[])  — KHÔNG có correctIndex/explanation
 *   questionIndex  {number}  Vị trí trong đề (0-based)
 *   totalQuestions {number}
 *   selectedOption {number|null} Đáp án đã chọn (index)
 *   onSelect       {Function} (optionIndex) => void
 */
const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F']

export default function ExamQuestion({
  question,
  questionIndex,
  totalQuestions,
  selectedOption,
  onSelect,
}) {
  if (!question) return null

  return (
    <div className="flex flex-col gap-5">
      {/* Tiêu đề câu hỏi */}
      <div className="flex items-start gap-3">
        <span className="shrink-0 text-sm font-semibold text-gray-500 mt-0.5">
          Câu {questionIndex + 1}/{totalQuestions}
        </span>
        <p className="text-base font-medium text-gray-900 leading-relaxed whitespace-pre-wrap">
          {question.content}
        </p>
      </div>

      {/* Danh sách đáp án */}
      <div className="flex flex-col gap-3">
        {(question.options || []).map((opt, idx) => {
          const isSelected = selectedOption === idx
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelect(idx)}
              className={[
                'flex items-start gap-3 w-full text-left px-4 py-3 rounded-lg border-2 transition-all',
                isSelected
                  ? 'border-blue-500 bg-blue-50 text-blue-900'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50/40',
              ].join(' ')}
            >
              <span
                className={[
                  'shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold',
                  isSelected
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600',
                ].join(' ')}
              >
                {OPTION_LABELS[idx] ?? idx + 1}
              </span>
              <span className="pt-0.5 leading-relaxed">
                {typeof opt === 'string' ? opt : opt.text ?? opt.content ?? ''}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
