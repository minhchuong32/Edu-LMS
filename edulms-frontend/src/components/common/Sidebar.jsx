import { NavLink } from 'react-router-dom'
import { useAuth } from '@/context/useAuth'
import { getNavigationByRole } from '@/constants/navigation'
import { ROLE_LABELS, ROLE_BADGE_CLASSES } from '@/constants/roles'
import { Shield, Sparkles, LogOut } from 'lucide-react'

export const Sidebar = ({ onItemClick, isMobile = false }) => {
  const { user, logout } = useAuth()
  const role = user?.role || 'student'
  const items = getNavigationByRole(role)
  const roleLabel = ROLE_LABELS[role] || role
  const badgeClass =
    ROLE_BADGE_CLASSES[role] || 'bg-blue-100 text-blue-700 border-blue-200'

  const handleMobileLogout = async () => {
    if (onItemClick) onItemClick()
    await logout()
  }

  return (
    <aside
      className={`bg-white flex flex-col justify-between h-full ${
        isMobile ? 'w-full p-4' : 'w-64 border-r border-slate-200 p-4 min-h-[calc(100vh-4rem)]'
      }`}
      aria-label="Menu chức năng vai trò"
    >
      <div className="space-y-5">
        {/* Mobile User Profile Section inside Drawer */}
        {isMobile && user && (
          <div className="p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
              {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-800 truncate">
                {user.fullName || 'Người dùng'}
              </p>
              <span
                className={`inline-block text-[10px] font-semibold border px-2 py-0.2 rounded-full mt-0.5 ${badgeClass}`}
              >
                {roleLabel}
              </span>
            </div>
          </div>
        )}

        {/* Role Menu Header */}
        <div>
          <div className="flex items-center gap-2 px-3 mb-2.5">
            <Shield className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">
              Danh mục {roleLabel}
            </p>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5" aria-label={`Menu ${roleLabel}`}>
            {items.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => onItemClick && onItemClick()}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs border-l-4 border-blue-600'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-l-4 border-transparent'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Footer Info & Mobile Logout */}
      <div className="space-y-3 pt-4 border-t border-slate-100 mt-6">
        {isMobile && (
          <button
            type="button"
            onClick={handleMobileLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Đăng xuất tài khoản</span>
          </button>
        )}

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Hệ thống EduLMS</span>
          </div>
          <p className="text-slate-400 text-[11px] mt-0.5">
            Phiên bản v1.0.0 Stable
          </p>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
