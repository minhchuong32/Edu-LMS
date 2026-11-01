import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/useAuth'
import {
  GraduationCap,
  LogOut,
  BookOpen,
  Bell,
  Sparkles,
  Menu,
} from 'lucide-react'
import { ROLE_LABELS, ROLE_BADGE_CLASSES } from '@/constants/roles'

export const Header = ({ onToggleSidebar, isSidebarOpen = false }) => {
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
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

  const userInitial = user?.fullName
    ? user.fullName.trim().charAt(0).toUpperCase()
    : 'U'
  const userRole = user?.role || 'student'
  const roleLabel = ROLE_LABELS[userRole] || 'Người dùng'
  const badgeClass =
    ROLE_BADGE_CLASSES[userRole] || 'bg-slate-100 text-slate-700 border-slate-200'

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Left section: Hamburger (Mobile) + Logo */}
          <div className="flex items-center gap-2 sm:gap-3">
            {onToggleSidebar && (
              <button
                type="button"
                onClick={onToggleSidebar}
                data-testid="hamburger-button"
                className="p-2 -ml-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors md:hidden focus:outline-hidden"
                aria-label="Mở menu điều hướng"
                aria-expanded={isSidebarOpen}
                title="Menu điều hướng"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            <Link
              to="/"
              className="flex items-center gap-2 text-blue-600 font-bold text-lg sm:text-xl tracking-tight"
            >
              <div className="bg-blue-600 text-white p-1.5 sm:p-2 rounded-xl shadow-md">
                <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <span>
                Edu<span className="text-slate-800">LMS</span>
              </span>
            </Link>
          </div>

          {/* Middle Nav Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-6 font-medium text-sm text-slate-600">
            <Link to="/" className="hover:text-blue-600 transition-colors">
              Trang chủ
            </Link>
            <Link
              to="/portal/news"
              className="hover:text-blue-600 transition-colors"
            >
              Tin giáo dục
            </Link>
            <Link
              to="/portal/guides"
              className="hover:text-blue-600 transition-colors"
            >
              Hướng dẫn
            </Link>
            {isAuthenticated && (
              <Link
                to={getDashboardPath()}
                className="hover:text-blue-600 transition-colors flex items-center gap-1 font-semibold text-blue-600"
              >
                <BookOpen className="w-4 h-4" /> Bảng điều khiển
              </Link>
            )}
          </nav>

          {/* Right Actions: Notifications, Avatar, User Info & Logout */}
          <div className="flex items-center gap-2 sm:gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  title="Thông báo"
                  className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-full transition-all relative"
                >
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>

                {/* User Info & Avatar */}
                <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-slate-200">
                  <div
                    className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0"
                    title={user?.fullName || 'Người dùng'}
                  >
                    {userInitial}
                  </div>

                  <div className="hidden sm:block text-left">
                    <p className="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[130px]">
                      {user?.fullName || 'Người dùng'}
                    </p>
                    <span
                      className={`inline-block text-[10px] font-medium border px-1.5 py-0.2 rounded mt-0.5 ${badgeClass}`}
                    >
                      {roleLabel}
                    </span>
                  </div>

                  {/* Logout Button */}
                  <button
                    type="button"
                    onClick={handleLogout}
                    title="Đăng xuất"
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-1 focus:outline-hidden"
                    aria-label="Đăng xuất"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3.5 py-1.5 sm:px-4 sm:py-2 text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/activate"
                  className="px-3.5 py-1.5 sm:px-4 sm:py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all inline-flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">Kích hoạt tài khoản</span>
                  <span className="xs:hidden">Kích hoạt</span>
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
