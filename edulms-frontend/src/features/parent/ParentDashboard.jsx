import React from 'react'
import { UserCheck, Award, Bell, ShieldCheck } from 'lucide-react'

export const ParentDashboard = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Cổng Phụ Huynh Học Sinh</h1>
        <p className="text-xs text-slate-500 mt-1">Đồng hành và theo dõi tình hình học tập, chuyên cần của con em</p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-4 border-b border-slate-100 pb-4 mb-4">
          <div className="w-12 h-12 bg-blue-100 text-blue-700 font-bold rounded-full flex items-center justify-center text-lg">
            A
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-base">Học sinh: Nguyễn Văn A</h3>
            <p className="text-xs text-slate-500">Lớp: 12A1 | Mã học sinh: HS100123 | GVCN: Thầy Nguyễn Văn B</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            <span className="text-slate-500">Điểm trung bình (GPA):</span>
            <p className="text-xl font-extrabold text-blue-600 mt-1">8.6 / 10</p>
          </div>
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            <span className="text-slate-500">Tỷ lệ chuyên cần:</span>
            <p className="text-xl font-extrabold text-emerald-600 mt-1">100%</p>
          </div>
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            <span className="text-slate-500">Hạnh kiểm:</span>
            <p className="text-xl font-extrabold text-indigo-600 mt-1">Tốt</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ParentDashboard
