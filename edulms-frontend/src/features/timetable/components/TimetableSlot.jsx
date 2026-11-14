import { useMemo } from 'react'
import { User, Users, MapPin, Clock, BookOpen } from 'lucide-react'
import { getSubjectColor, PERIODS_CONFIG } from '../timetableUtils'

/**
 * Component hiển thị chi tiết một tiết học trong bảng thời khóa biểu
 * Đáp ứng yêu cầu: Tên môn học, Giáo viên, Lớp học, Tiết học
 */
export const TimetableSlot = ({
  slot,
  periodNumber,
  isTeacherView = false,
  isStudentView = false,
  onClick,
}) => {
  const periodInfo = useMemo(() => {
    return PERIODS_CONFIG.find((p) => p.period === periodNumber) || {
      name: `Tiết ${periodNumber}`,
      timeRange: '',
    }
  }, [periodNumber])

  if (!slot) {
    return (
      <div
        className="h-full min-h-[96px] w-full p-2.5 rounded-xl border border-dashed border-slate-200/90 bg-slate-50/40 hover:bg-slate-50 transition-colors flex flex-col items-center justify-center text-slate-300"
        title={`${periodInfo.name} trống`}
      >
        <span className="text-xs text-slate-400 font-medium tracking-wide">-</span>
        <span className="text-[10px] text-slate-400 mt-0.5">{periodInfo.timeRange}</span>
      </div>
    )
  }

  const subjectName = slot.subject?.name || 'Môn học'
  const subjectCode = slot.subject?.code || ''
  const teacherName = slot.teacher?.fullName || 'Chưa phân công'
  const className = slot.class?.name || ''
  const roomName = slot.room || slot.class?.room || ''
  const colors = getSubjectColor(subjectName, subjectCode)

  return (
    <div
      onClick={() => onClick && onClick(slot)}
      className={`h-full min-h-[96px] w-full p-2.5 rounded-xl border transition-all duration-150 flex flex-col justify-between shadow-xs hover:shadow-md cursor-pointer ${colors.bg} ${colors.border}`}
      title={`${subjectName} - ${periodInfo.name} (${periodInfo.timeRange})`}
    >
      {/* Top Header: Môn học & Tiết học */}
      <div>
        <div className="flex items-start justify-between gap-1 mb-1.5">
          <div className="flex items-center gap-1 min-w-0">
            <BookOpen className={`w-3.5 h-3.5 shrink-0 ${colors.accent}`} />
            <h5
              className={`text-xs font-bold truncate leading-tight ${colors.text}`}
              title={subjectName}
            >
              {subjectName}
            </h5>
          </div>
          <span
            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${colors.badge}`}
          >
            {periodInfo.name}
          </span>
        </div>

        {/* Thông tin Lớp học và Giáo viên */}
        <div className="space-y-1 text-[11px]">
          {/* Đối với Giáo viên: làm nổi bật Lớp dạy */}
          {/* Đối với Học sinh: làm nổi bật Giáo viên dạy */}
          <div
            className={`flex items-center gap-1.5 truncate ${
              isTeacherView ? 'font-bold text-blue-900' : 'text-slate-700'
            }`}
          >
            <Users className="w-3 h-3 shrink-0 text-slate-600" />
            <span className="truncate">
              Lớp: <strong className="font-semibold">{className || 'Toàn khối'}</strong>
            </span>
          </div>

          <div
            className={`flex items-center gap-1.5 truncate ${
              isStudentView ? 'font-bold text-indigo-900' : 'text-slate-600'
            }`}
          >
            <User className="w-3 h-3 shrink-0 text-slate-600" />
            <span className="truncate">
              GV: <span className="font-medium">{teacherName}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Footer: Phòng học & Thời gian */}
      <div className="mt-2 pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-600">
        <span className="flex items-center gap-1 truncate" title={`Phòng: ${roomName || 'Tiêu chuẩn'}`}>
          <MapPin className="w-2.5 h-2.5 shrink-0 text-slate-600" />
          <span className="truncate">{roomName ? `P.${roomName}` : 'Phòng học'}</span>
        </span>
        <span className="flex items-center gap-1 shrink-0 text-[9px] text-slate-600 font-medium">
          <Clock className="w-2.5 h-2.5 shrink-0" />
          <span>{periodInfo.timeRange}</span>
        </span>
      </div>
    </div>
  )
}

export default TimetableSlot
