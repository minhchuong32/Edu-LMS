import React from 'react'
import { Users, GraduationCap, BookOpen, ShieldAlert, CheckCircle2, FileSpreadsheet } from 'lucide-react'

export const AdminDashboard = () => {
  const stats = [
    { title: 'Tổng số người dùng', count: '1,248', icon: Users, color: 'bg-blue-500' },
    { title: 'Số lượng giáo viên', count: '86', icon: GraduationCap, color: 'bg-emerald-500' },
    { title: 'Số lượng học sinh', count: '1,050', icon: BookOpen, color: 'bg-violet-500' },
    { title: 'Lớp học hoạt động', count: '32', icon: FileSpreadsheet, color: 'bg-amber-500' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Cổng Quản trị hệ thống (Admin)</h1>
        <p className="text-xs text-slate-500 mt-1">Quản lý cấu trúc năm học, người dùng, phân công giảng dạy và hệ thống EduLMS</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon
          return (
            <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">{stat.title}</p>
                <p className="text-2xl font-extrabold text-slate-800 mt-1">{stat.count}</p>
              </div>
              <div className={`${stat.color} text-white p-3 rounded-xl shadow-sm`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          )
        })}
      </div>

      {/* Admin Action Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <h3 className="font-semibold text-slate-800 text-sm mb-4">Hoạt động quản trị gần đây</h3>
          <ul className="space-y-3 text-xs">
            <li className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-slate-600">Khởi tạo danh sách lớp khối 10 (Năm học 2026-2027)</span>
              <span className="text-slate-400">10 phút trước</span>
            </li>
            <li className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-slate-600">Phân công GVCN cho Lớp 12A1</span>
              <span className="text-slate-400">1 giờ trước</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-slate-600">Cập nhật hệ số tính GPA theo Thông tư mới</span>
              <span className="text-slate-400">3 giờ trước</span>
            </li>
          </ul>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <h3 className="font-semibold text-slate-800 text-sm mb-4">Trạng thái hệ thống</h3>
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl text-emerald-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="font-medium">Kết nối MongoDB Database</span>
              </div>
              <span className="font-bold text-emerald-600">Hoạt động tốt</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl text-blue-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span className="font-medium">Dịch vụ lưu trữ Cloudinary API</span>
              </div>
              <span className="font-bold text-blue-600">Sẵn sàng</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
