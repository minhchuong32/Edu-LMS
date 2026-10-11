import React from 'react'
import { Award, BookOpen, Calendar, Clock, CheckCircle } from 'lucide-react'

export const StudentDashboard = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Góc Học Tập Học Sinh</h1>
        <p className="text-xs text-slate-500 mt-1">Theo dõi điểm số, thời khóa biểu, bài tập về nhà và thông báo từ nhà trường</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-6 rounded-2xl shadow-md">
          <p className="text-xs font-medium text-blue-100 uppercase tracking-wider">Điểm trung bình (GPA)</p>
          <p className="text-4xl font-extrabold mt-2">8.6</p>
          <div className="mt-4 pt-3 border-t border-white/20 text-xs text-blue-100 flex justify-between">
            <span>Học lực: Giỏi</span>
            <span>Hạnh kiểm: Tốt</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-sm text-slate-800">Bài tập sắp đến hạn</h4>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <ul className="space-y-2 text-xs">
            <li className="p-2 bg-amber-50 border border-amber-100 rounded-lg">
              <p className="font-semibold text-amber-900">Bài tập Hình học Học kỳ I</p>
              <p className="text-[11px] text-amber-700 mt-0.5">Hạn nộp: 23:59 Hôm nay</p>
            </li>
          </ul>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-sm text-slate-800">Thời khóa biểu hôm nay</h4>
            <Calendar className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-xs text-slate-600">Tiết 1-2: Toán | Tiết 3: Ngữ Văn | Tiết 4: Tiếng Anh</p>
        </div>
      </div>
    </div>
  )
}

export default StudentDashboard
