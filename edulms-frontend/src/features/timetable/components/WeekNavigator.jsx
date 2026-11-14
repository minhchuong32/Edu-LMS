import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, RotateCcw } from 'lucide-react'

/**
 * Component điều hướng và chuyển đổi tuần học, năm học và học kỳ
 */
export const WeekNavigator = ({
  weekRangeText,
  onPrevWeek,
  onNextWeek,
  onCurrentWeek,
  isCurrentWeek = false,
  academicYear,
  onAcademicYearChange,
  semester,
  onSemesterChange,
}) => {
  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
      {/* Bộ điều khiển Tuần: Tuần trước, Tuần này, Tuần sau */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={onPrevWeek}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition-all shadow-none hover:shadow-xs"
            title="Tuần trước"
            aria-label="Tuần trước"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onCurrentWeek}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              isCurrentWeek
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-white hover:shadow-xs'
            }`}
            title="Quay lại tuần hiện tại"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Hôm nay</span>
          </button>

          <button
            type="button"
            onClick={onNextWeek}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition-all shadow-none hover:shadow-xs"
            title="Tuần sau"
            aria-label="Tuần sau"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Hiển thị khoảng ngày của tuần */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50/80 border border-blue-200/80 rounded-xl text-blue-900 text-xs font-semibold">
          <CalendarIcon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>{weekRangeText}</span>
        </div>
      </div>

      {/* Bộ lọc Năm học & Học kỳ */}
      <div className="flex items-center gap-3">
        {onAcademicYearChange && (
          <div className="flex items-center gap-1.5 text-xs">
            <label htmlFor="academic-year-select" className="text-slate-500 font-medium whitespace-nowrap">
              Năm học:
            </label>
            <select
              id="academic-year-select"
              value={academicYear || '2025-2026'}
              onChange={(e) => onAcademicYearChange(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl px-2.5 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="2025-2026">2025-2026</option>
              <option value="2024-2025">2024-2025</option>
              <option value="2026-2027">2026-2027</option>
            </select>
          </div>
        )}

        {onSemesterChange && (
          <div className="flex items-center gap-1.5 text-xs">
            <label htmlFor="semester-select" className="text-slate-500 font-medium whitespace-nowrap">
              Học kỳ:
            </label>
            <select
              id="semester-select"
              value={semester || 'CaNam'}
              onChange={(e) => onSemesterChange(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl px-2.5 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="CaNam">Cả năm</option>
              <option value="HK1">Học kỳ 1</option>
              <option value="HK2">Học kỳ 2</option>
            </select>
          </div>
        )}
      </div>
    </div>
  )
}

export default WeekNavigator
