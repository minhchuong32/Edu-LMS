import { useState } from 'react'
import { Sun, Moon, ArrowRightLeft, Info, X } from 'lucide-react'
import TimetableSlot from './TimetableSlot'
import { PERIODS_CONFIG } from '../timetableUtils'

/**
 * Component Bảng lưới Thời khóa biểu 7 ngày x 10 tiết học
 * - Hỗ trợ Cuộn ngang trên thiết bị di động (Mobile Horizontal Scroll)
 * - Hiển thị 2 buổi: Buổi sáng (Tiết 1-5), Buổi chiều (Tiết 6-10)
 * - Tự động đánh dấu (Highlight) ngày hôm nay
 */
export const TimetableGrid = ({
  days = [],
  grid = {},
  isTeacherView = false,
  isStudentView = false,
}) => {
  const [selectedSlot, setSelectedSlot] = useState(null)

  const morningPeriods = PERIODS_CONFIG.filter((p) => p.session === 'morning')
  const afternoonPeriods = PERIODS_CONFIG.filter((p) => p.session === 'afternoon')

  return (
    <div className="space-y-4">
      {/* Mobile Scroll Hint Banner */}
      <div className="md:hidden flex items-center justify-between px-3.5 py-2 bg-blue-50 border border-blue-100 rounded-xl text-blue-800 text-xs">
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600 animate-pulse shrink-0" />
          <span>Vuốt ngang bảng để xem tất cả các ngày</span>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
          7 Ngày
        </span>
      </div>

      {/* Main Table Container với Horizontal Scroll trên Mobile */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200">
          <table className="w-full min-w-[850px] border-collapse text-left">
            {/* Header: Cột Tiết & 7 Cột Ngày */}
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-700">
                <th className="p-3.5 text-xs font-bold text-center w-28 shrink-0 border-r border-slate-200/80">
                  <div className="text-slate-800">Tiết / Giờ</div>
                  <div className="text-[10px] text-slate-600 font-normal mt-0.5">Thời lượng</div>
                </th>

                {days.map((day) => (
                  <th
                    key={day.dayOfWeek}
                    className={`p-3 text-center border-r border-slate-200/80 last:border-r-0 transition-colors ${
                      day.isToday
                        ? 'bg-blue-600 text-white font-bold'
                        : 'text-slate-800 font-bold'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="text-xs uppercase tracking-wide">{day.name}</span>
                      {day.isToday && (
                        <span className="text-[9px] bg-white text-blue-700 px-1.5 py-0.2 rounded-full font-extrabold uppercase">
                          Hôm nay
                        </span>
                      )}
                    </div>
                    <div
                      className={`text-[11px] font-medium mt-0.5 ${
                        day.isToday ? 'text-blue-100' : 'text-slate-600'
                      }`}
                    >
                      {day.formattedDate}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {/* PHẦN 1: BUỔI SÁNG (TIẾT 1 - 5) */}
              <tr className="bg-amber-50/60 border-y border-amber-200/70">
                <td
                  colSpan={8}
                  className="px-4 py-2 text-xs font-bold text-amber-900 tracking-wide"
                >
                  <div className="flex items-center gap-2">
                    <Sun className="w-4 h-4 text-amber-600" />
                    <span>BUỔI SÁNG (Tiết 1 đến Tiết 5)</span>
                  </div>
                </td>
              </tr>

              {morningPeriods.map((periodItem) => (
                <tr
                  key={periodItem.period}
                  className="border-b border-slate-100 hover:bg-slate-50/40 transition-colors"
                >
                  {/* Cột Tiết học & Thời gian */}
                  <td className="p-2.5 text-center bg-slate-50/50 border-r border-slate-200/80 align-middle">
                    <div className="text-xs font-bold text-slate-800">{periodItem.name}</div>
                    <div className="text-[10px] text-slate-600 mt-0.5 font-medium">
                      {periodItem.timeRange}
                    </div>
                  </td>

                  {/* 7 Cột cho 7 ngày trong tuần */}
                  {days.map((day) => {
                    const slot = grid[day.dayOfWeek]?.[periodItem.period]
                    return (
                      <td
                        key={day.dayOfWeek}
                        className={`p-1.5 border-r border-slate-100 last:border-r-0 align-top ${
                          day.isToday ? 'bg-blue-50/20' : ''
                        }`}
                      >
                        <TimetableSlot
                          slot={slot}
                          periodNumber={periodItem.period}
                          isTeacherView={isTeacherView}
                          isStudentView={isStudentView}
                          onClick={(item) => setSelectedSlot(item)}
                        />
                      </td>
                    )
                  })}
                </tr>
              ))}

              {/* PHẦN 2: BUỔI CHIỀU (TIẾT 6 - 10) */}
              <tr className="bg-indigo-50/60 border-y border-indigo-200/70">
                <td
                  colSpan={8}
                  className="px-4 py-2 text-xs font-bold text-indigo-900 tracking-wide"
                >
                  <div className="flex items-center gap-2">
                    <Moon className="w-4 h-4 text-indigo-600" />
                    <span>BUỔI CHIỀU (Tiết 6 đến Tiết 10)</span>
                  </div>
                </td>
              </tr>

              {afternoonPeriods.map((periodItem) => (
                <tr
                  key={periodItem.period}
                  className="border-b border-slate-100 hover:bg-slate-50/40 transition-colors"
                >
                  {/* Cột Tiết học & Thời gian */}
                  <td className="p-2.5 text-center bg-slate-50/50 border-r border-slate-200/80 align-middle">
                    <div className="text-xs font-bold text-slate-800">{periodItem.name}</div>
                    <div className="text-[10px] text-slate-600 mt-0.5 font-medium">
                      {periodItem.timeRange}
                    </div>
                  </td>

                  {/* 7 Cột cho 7 ngày trong tuần */}
                  {days.map((day) => {
                    const slot = grid[day.dayOfWeek]?.[periodItem.period]
                    return (
                      <td
                        key={day.dayOfWeek}
                        className={`p-1.5 border-r border-slate-100 last:border-r-0 align-top ${
                          day.isToday ? 'bg-blue-50/20' : ''
                        }`}
                      >
                        <TimetableSlot
                          slot={slot}
                          periodNumber={periodItem.period}
                          isTeacherView={isTeacherView}
                          isStudentView={isStudentView}
                          onClick={(item) => setSelectedSlot(item)}
                        />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Chi tiết Tiết học khi click */}
      {selectedSlot && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs"
          onClick={() => setSelectedSlot(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Chi tiết tiết học</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSlot(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                aria-label="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Môn học:</span>
                <span className="font-bold text-slate-800">
                  {selectedSlot.subject?.name} ({selectedSlot.subject?.code})
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Lớp học:</span>
                <span className="font-bold text-slate-800">{selectedSlot.class?.name}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Giáo viên:</span>
                <span className="font-bold text-slate-800">
                  {selectedSlot.teacher?.fullName} ({selectedSlot.teacher?.userCode})
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Thời gian:</span>
                <span className="font-bold text-slate-800">
                  {selectedSlot.dayOfWeek === 8 ? 'Chủ Nhật' : `Thứ ${selectedSlot.dayOfWeek}`} - Tiết {selectedSlot.period}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Phòng học:</span>
                <span className="font-bold text-slate-800">
                  {selectedSlot.room || selectedSlot.class?.room || 'Phòng học của lớp'}
                </span>
              </div>

              {selectedSlot.note && (
                <div className="pt-2">
                  <span className="text-slate-500 block mb-1">Ghi chú:</span>
                  <p className="p-2.5 bg-slate-50 rounded-xl text-slate-700 font-medium">
                    {selectedSlot.note}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedSlot(null)}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors"
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

export default TimetableGrid
