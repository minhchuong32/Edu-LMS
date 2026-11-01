import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Header from '@/components/common/Header'
import Sidebar from '@/components/common/Sidebar'
import { GraduationCap, X } from 'lucide-react'

/**
 * ShellLayout / DashboardLayout: Bố cục giao diện chính cho các trang quản trị và vai trò.
 * - Hỗ trợ Responsive đa nền tảng (Desktop, Tablet, Mobile).
 * - Cố định Sidebar bên trái trên màn hình Desktop/Tablet (md: trở lên).
 * - Hỗ trợ Hamburger và Drawer trượt ra trên thiết bị di động.
 * - Tự động đóng Drawer khi click chọn menu, click backdrop, hoặc nhấn phím Escape.
 */
export const DashboardLayout = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  // Lắng nghe phím Escape để đóng Drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsMobileSidebarOpen(false)
      }
    }

    if (isMobileSidebarOpen) {
      window.addEventListener('keydown', handleKeyDown)
      // Khóa scroll body khi Drawer đang mở
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isMobileSidebarOpen])

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      {/* Top Header kèm nút Hamburger cho thiết bị di động */}
      <Header
        onToggleSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
        isSidebarOpen={isMobileSidebarOpen}
      />

      <div className="flex flex-1 relative">
        {/* Sidebar cố định trên Desktop (md: trở lên) */}
        <div className="hidden md:block shrink-0">
          <Sidebar />
        </div>

        {/* Mobile Sidebar Drawer Overlay & Panel */}
        {isMobileSidebarOpen && (
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 md:hidden transition-opacity"
            onClick={() => setIsMobileSidebarOpen(false)}
            aria-hidden="true"
            data-testid="sidebar-backdrop"
          />
        )}

        {/* Mobile Drawer */}
        <div
          className={`fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white z-50 shadow-2xl flex flex-col md:hidden transform transition-transform duration-300 ease-in-out ${
            isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          role="dialog"
          aria-modal="true"
          aria-label="Menu điều hướng di động"
        >
          {/* Drawer Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <div className="flex items-center gap-2 text-blue-600 font-bold text-lg">
              <div className="bg-blue-600 text-white p-1.5 rounded-xl shadow-md">
                <GraduationCap className="w-5 h-5" />
              </div>
              <span>
                Edu<span className="text-slate-800">LMS</span>
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(false)}
              data-testid="close-drawer-button"
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors focus:outline-hidden"
              aria-label="Đóng menu"
              title="Đóng menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto">
            <Sidebar
              isMobile={true}
              onItemClick={() => setIsMobileSidebarOpen(false)}
            />
          </div>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export const ShellLayout = DashboardLayout
export default DashboardLayout
