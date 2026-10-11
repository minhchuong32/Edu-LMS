import React from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Calendar,
  ClipboardList,
  GraduationCap,
  Settings,
  Bell,
  CheckSquare,
  Award,
} from 'lucide-react'

export const Sidebar = () => {
  const { user } = useAuth()
  const role = user?.role || 'student'

  const navItemsByRole = {
    admin: [
      { label: 'Tổng quan hệ thống', path: '/admin/dashboard', icon: LayoutDashboard },
      { label: 'Quản lý người dùng', path: '/admin/users', icon: Users },
      { label: 'Cấu trúc khối & lớp', path: '/admin/classes', icon: BookOpen },
      { label: 'Phân công giảng dạy', path: '/admin/assignments', icon: Calendar },
      { label: 'Cấu hình hệ thống', path: '/admin/settings', icon: Settings },
    ],
    teacher: [
      { label: 'Trang tổng quan', path: '/teacher/dashboard', icon: LayoutDashboard },
      { label: 'Lớp được phân công', path: '/teacher/classes', icon: BookOpen },
      { label: 'Sổ điểm điện tử', path: '/teacher/gradebook', icon: ClipboardList },
      { label: 'Điểm danh & Chuyên cần', path: '/teacher/attendance', icon: CheckSquare },
      { label: 'Quản lý bài tập', path: '/teacher/assignments', icon: GraduationCap },
    ],
    student: [
      { label: 'Góc học tập', path: '/student/dashboard', icon: LayoutDashboard },
      { label: 'Thời khóa biểu', path: '/student/timetable', icon: Calendar },
      { label: 'Bảng điểm cá nhân', path: '/student/grades', icon: Award },
      { label: 'Bài tập về nhà', path: '/student/homework', icon: ClipboardList },
      { label: 'Điểm danh & Vi phạm', path: '/student/attendance', icon: CheckSquare },
    ],
    parent: [
      { label: 'Tổng quan con em', path: '/parent/dashboard', icon: LayoutDashboard },
      { label: 'Theo dõi điểm số', path: '/parent/grades', icon: Award },
      { label: 'Lịch sử điểm danh', path: '/parent/attendance', icon: CheckSquare },
      { label: 'Thông báo nhà trường', path: '/parent/notifications', icon: Bell },
    ],
  }

  const items = navItemsByRole[role] || navItemsByRole.student

  return (
    <aside className="w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between">
      <div className="space-y-6">
        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
            Danh mục {role.toUpperCase()}
          </p>
          <nav className="space-y-1">
            {items.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-blue-50 text-blue-600 font-semibold shadow-xs'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              )
            })}
          </nav>
        </div>
      </div>

      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
        <p className="font-semibold text-slate-700">Hệ thống EduLMS</p>
        <p className="text-slate-500 text-[11px] mt-0.5">Phiên bản v1.0.0 Stable</p>
      </div>
    </aside>
  )
}

export default Sidebar
