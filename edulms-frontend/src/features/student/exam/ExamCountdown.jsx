import { Clock } from 'lucide-react'

/**
 * ExamCountdown — Hiển thị đồng hồ đếm ngược
 * Props:
 *   timeLeft  {number}   Số giây còn lại
 *   duration  {number}   Tổng thời gian làm bài (giây) — để tính % thanh tiến trình
 */
export default function ExamCountdown({ timeLeft, duration }) {
  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  const pct = duration > 0 ? Math.min(100, (timeLeft / duration) * 100) : 0

  let colorClass = 'text-green-600'
  let barClass = 'bg-green-500'
  let pulseClass = ''

  if (timeLeft <= 60) {
    colorClass = 'text-red-600 font-extrabold'
    barClass = 'bg-red-500'
    pulseClass = 'animate-pulse'
  } else if (timeLeft <= 300) {
    colorClass = 'text-amber-600 font-bold'
    barClass = 'bg-amber-500'
  }

  return (
    <div className="flex flex-col items-center gap-1 min-w-[120px]">
      <div className={`flex items-center gap-1.5 text-2xl tabular-nums ${colorClass} ${pulseClass}`}>
        <Clock className="w-5 h-5" />
        <span>{formatted}</span>
      </div>
      {/* Thanh tiến trình */}
      <div className="w-full h-1.5 rounded-full bg-gray-200 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${barClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-gray-500">còn lại</p>
    </div>
  )
}
