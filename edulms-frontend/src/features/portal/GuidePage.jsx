import React from 'react'
import { FileText, Download, CheckCircle2 } from 'lucide-react'

export const GuidePage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Hướng Dẫn Sử Dụng Hệ Thống</h1>
        <p className="text-xs text-slate-500 mt-1">Tài liệu hướng dẫn thao tác dành cho Giáo viên, Học sinh và Phụ huynh</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl w-fit">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-base">Dành cho Giáo viên</h3>
          <ul className="text-xs text-slate-600 space-y-2">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
              <span>Hướng dẫn nhập sổ điểm điện tử</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
              <span>Hướng dẫn điểm danh theo tiết</span>
            </li>
          </ul>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl w-fit">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-base">Dành cho Học sinh</h3>
          <ul className="text-xs text-slate-600 space-y-2">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Cách tra cứu bảng điểm GPA</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Nộp bài tập trực tuyến PDF</span>
            </li>
          </ul>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="p-3 bg-violet-50 text-violet-600 rounded-xl w-fit">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-base">Dành cho Phụ huynh</h3>
          <ul className="text-xs text-slate-600 space-y-2">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-violet-500" />
              <span>Liên kết tài khoản theo Mã Học Sinh</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-violet-500" />
              <span>Nhận thông báo điểm danh từ GVCN</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default GuidePage
