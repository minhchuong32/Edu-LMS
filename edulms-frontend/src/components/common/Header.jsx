import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { GraduationCap, LogOut, User, BookOpen, ShieldCheck, Bell } from 'lucide-react'

export const Header = () => {
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const getDashboardPath = () => {
    if (!user) return '/'
    switch (user.role) {
      case 'admin':
        return '/admin/dashboard'
      case 'teacher':
        return '/teacher/dashboard'
      case 'student':
        return '/student/dashboard'
      case 'parent':
        return '/parent/dashboard'
      default:
        return '/'
    }
  }

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 text-blue-600 font-bold text-xl tracking-tight">
            <div className="bg-blue-600 text-white p-2 rounded-xl shadow-md">
              <GraduationCap className="w-6 h-6" />
            </div>
            <span>Edu<span className="text-slate-800">LMS</span></span>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-6 font-medium text-sm text-slate-600">
            <Link to="/" className="hover:text-blue-600 transition-colors">Trang chủ</Link>
            <Link to="/portal/news" className="hover:text-blue-600 transition-colors">Tin giáo dục</Link>
            <Link to="/portal/guides" className="hover:text-blue-600 transition-colors">Hướng dẫn</Link>
            {isAuthenticated && (
              <Link to={getDashboardPath()} className="hover:text-blue-600 transition-colors flex items-center gap-1 font-semibold text-blue-600">
                <BookOpen className="w-4 h-4" /> Bảng điều khiển
              </Link>
            )}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <button title="Thông báo" className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-full transition-all relative">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>

                <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
                  <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                    {user?.fullName?.charAt(0) || 'U'}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-xs font-semibold text-slate-800 leading-tight">{user?.fullName || 'Người dùng'}</p>
                    <span className="text-[10px] capitalize font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                      {user?.role || 'Guest'}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    title="Đăng xuất"
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-1"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all"
                >
                  Đăng ký
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
