import React from 'react'
import { ClipboardList, CheckSquare, BookOpen, Clock, AlertCircle } from 'lucide-react'

export const TeacherDashboard = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Cổng Giáo viên & Sổ điểm điện tử</h1>
        <p className="text-xs text-slate-500 mt-1">Quản lý lớp chủ nhiệm, nhập điểm thành phần, điểm danh và chấm bài tập</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-slate-800">Lớp GVCN</h4>
              <p className="text-xs text-slate-500">Lớp 12A1 (Sĩ số: 40)</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            Tỷ lệ chuyên cần tuần này: <span className="font-bold text-emerald-600">98.5%</span>
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-violet-100 text-violet-700 rounded-xl">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-slate-800">Sổ điểm điện tử</h4>
              <p className="text-xs text-slate-500">Môn Toán - Khối 12</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            Cần hoàn thành nhập điểm: <span className="font-bold text-amber-600">Điểm 15 phút lần 2</span>
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-slate-800">Điểm danh tiết học</h4>
              <p className="text-xs text-slate-500">Tiết 1-2 (Sáng nay)</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            Trạng thái: <span className="font-bold text-emerald-600">Đã hoàn thành điểm danh</span>
          </p>
        </div>
      </div>
    </div>
  )
}

export default TeacherDashboard
