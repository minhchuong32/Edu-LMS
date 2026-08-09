import React, { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import Badge from "../components/common/Badge";
import Button from "../components/common/Button";
import Avatar from "../components/common/Avatar";
import { useAuth } from "../context/AuthContext";

export default function RoleSidebarLayout({ role, navItems = [], user: propUser }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const { user: authUser, logout } = useAuth();

  const currentUser = propUser || authUser || {
    name: "Người dùng",
    email: "user@edulms.edu",
    role: role || "User"
  };

  const activeRole = role || currentUser?.role || "User";
  const userCode = currentUser?.studentCode || currentUser?.teacherCode || null;

  return (
    <div className="min-h-screen bg-neutral-50 font-sans flex text-neutral-600 antialiased">
      {/* USER PROFILE MODAL */}
      {showProfileModal && (
        <div
          className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity"
          onClick={() => setShowProfileModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-neutral-200 transform transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Profile Header Banner */}
            <div className="relative bg-gradient-to-r from-primary to-indigo-700 h-28 p-6 flex items-end justify-between">
              <button
                onClick={() => setShowProfileModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 text-white hover:bg-white/30 transition"
                aria-label="Đóng modal"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Avatar & Core Profile Info */}
            <div className="px-6 pb-6 pt-0 relative">
              <div className="-mt-12 mb-3 flex items-end justify-between">
                <Avatar
                  src={currentUser.avatar}
                  name={currentUser.name}
                  email={currentUser.email}
                  size="2xl"
                  className="ring-4 ring-white shadow-lg"
                />
                <Badge role={activeRole} className="text-xs py-1 px-3">
                  {activeRole}
                </Badge>
              </div>

              <div>
                <h3 className="text-xl font-bold font-outfit text-neutral-900 leading-tight">
                  {currentUser.name}
                </h3>
                <p className="text-xs font-medium text-neutral-600 mt-0.5">
                  {currentUser.email}
                </p>
              </div>

              {/* Detail fields */}
              <div className="mt-5 space-y-3 bg-neutral-50 p-4 rounded-xl border border-neutral-200/80">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-600 font-medium">Vai trò hệ thống</span>
                  <span className="font-bold text-neutral-900 capitalize">{activeRole}</span>
                </div>

                {userCode && (
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-neutral-200/60">
                    <span className="text-neutral-600 font-medium">
                      {activeRole.toLowerCase() === "teacher" ? "Mã giảng viên" : "Mã sinh viên"}
                    </span>
                    <span className="font-mono font-bold text-primary bg-primary-light px-2 py-0.5 rounded">
                      {userCode}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs pt-2 border-t border-neutral-200/60">
                  <span className="text-neutral-600 font-medium">Trạng thái tài khoản</span>
                  <span className="inline-flex items-center gap-1.5 font-bold text-emerald-600">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Đang hoạt động
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex items-center gap-3">
                <Button
                  variant="outline"
                  className="flex-1 text-xs font-semibold py-2.5 rounded-xl"
                  onClick={() => setShowProfileModal(false)}
                >
                  Đóng
                </Button>
                <Button
                  variant="danger"
                  className="flex-1 text-xs font-semibold py-2.5 rounded-xl"
                  onClick={() => {
                    setShowProfileModal(false);
                    setShowLogoutConfirm(true);
                  }}
                >
                  Đăng xuất
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LOGOUT CONFIRMATION MODAL */}
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity"
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div
            className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl border border-neutral-200 transform transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-rose-50 text-danger flex items-center justify-center mx-auto mb-4 ring-8 ring-rose-50/50">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>

            <h3 className="text-base font-bold text-center text-neutral-900 mb-1.5">
              Xác nhận đăng xuất
            </h3>
            <p className="text-xs text-center text-neutral-600 mb-6 leading-relaxed">
              Bạn có chắc chắn muốn đăng xuất khỏi hệ thống EduLMS không?
            </p>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="flex-1 text-xs font-semibold py-2 rounded-lg"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Hủy
              </Button>
              <Button
                variant="danger"
                className="flex-1 text-xs font-semibold py-2 rounded-lg"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  logout();
                }}
              >
                Đăng xuất
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE DRAWER OVERLAY BACKDROP */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* MOBILE DRAWER SIDEBAR (260px fixed width, slides from left) */}
      <aside
        className={`fixed inset-y-0 left-0 w-[260px] bg-white border-r border-neutral-200 z-50 transform transition-transform duration-300 ease-in-out lg:hidden flex flex-col ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary text-white font-bold font-outfit flex items-center justify-center text-lg shadow-sm">
              E
            </div>
            <h1 className="font-outfit font-extrabold text-base tracking-wider text-neutral-900">EduLMS</h1>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Đóng menu"
            className="p-1.5 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation items mobile */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-primary-light text-primary font-bold"
                    : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                }`
              }
            >
              {item.icon}
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>

        {/* Sidebar Footer mobile */}
        <div className="p-4 border-t border-neutral-200 bg-neutral-50/50">
          <button
            onClick={() => setShowProfileModal(true)}
            className="flex items-center gap-3 w-full text-left p-1.5 rounded-xl hover:bg-neutral-100/80 transition"
          >
            <Avatar
              src={currentUser.avatar}
              name={currentUser.name}
              email={currentUser.email}
              size="md"
            />
            <div className="overflow-hidden flex-1">
              <p className="text-xs font-bold text-neutral-900 truncate">{currentUser.name}</p>
              <Badge role={activeRole} className="mt-0.5 text-[10px] py-0.5 px-2">
                {activeRole}
              </Badge>
            </div>
          </button>
        </div>
      </aside>

      {/* DESKTOP FIXED SIDEBAR (260px) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-[260px] lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:bg-white lg:border-r lg:border-neutral-200">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-neutral-200">
          <div className="w-9 h-9 rounded-lg bg-primary text-white font-extrabold font-outfit flex items-center justify-center text-xl shadow-sm shadow-primary/20">
            E
          </div>
          <div>
            <h1 className="font-outfit font-extrabold text-base tracking-wide text-neutral-900">EduLMS</h1>
            <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest block -mt-0.5">
              Hệ thống LMS
            </span>
          </div>
        </div>

        {/* Navigation menu desktop */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-primary-light text-primary font-bold"
                    : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                }`
              }
            >
              {item.icon}
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>

        {/* Sidebar Footer desktop */}
        <div className="p-4 border-t border-neutral-200 bg-neutral-50/50">
          <button
            onClick={() => setShowProfileModal(true)}
            className="flex items-center gap-3 w-full text-left p-1.5 rounded-xl hover:bg-neutral-100/80 transition group"
          >
            <Avatar
              src={currentUser.avatar}
              name={currentUser.name}
              email={currentUser.email}
              size="md"
            />
            <div className="overflow-hidden flex-1">
              <p className="text-xs font-bold text-neutral-900 truncate group-hover:text-primary transition">
                {currentUser.name}
              </p>
              <Badge role={activeRole} className="mt-0.5 text-[10px] py-0.5 px-2">
                {activeRole}
              </Badge>
            </div>
          </button>
        </div>
      </aside>

      {/* MAIN VIEW AREA OFFSET FOR DESKTOP SIDEBAR (260px) */}
      <div className="flex-1 flex flex-col lg:pl-[260px] min-h-screen overflow-x-hidden">
        {/* Header Navigation */}
        <header className="sticky top-0 bg-white border-b border-neutral-200 z-20 flex items-center justify-between px-4 sm:px-6 py-3.5 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Mở menu"
              className="p-2 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition lg:hidden"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs font-semibold text-neutral-600">Hệ thống:</span>
              <span className="text-xs font-bold text-neutral-900 bg-neutral-50 px-2.5 py-1 rounded-lg border border-neutral-200">
                EduLMS Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              aria-label="Thông báo"
              className="relative p-2 text-neutral-600 hover:text-neutral-900 rounded-lg hover:bg-neutral-100 transition"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full ring-2 ring-white"></span>
            </button>

            <button
              onClick={() => setShowProfileModal(true)}
              className="flex items-center gap-3 pl-3 border-l border-neutral-200 hover:opacity-80 transition group text-left"
            >
              <Avatar
                src={currentUser.avatar}
                name={currentUser.name}
                email={currentUser.email}
                size="sm"
              />
              <div className="hidden md:block leading-tight">
                <p className="text-xs font-bold text-neutral-900 truncate max-w-[120px] group-hover:text-primary transition">
                  {currentUser.name}
                </p>
                <span className="text-[10px] font-semibold text-neutral-600 capitalize">{activeRole}</span>
              </div>
            </button>

            <Button
              variant="outline"
              className="px-3 py-1.5 text-xs font-semibold h-8 flex items-center gap-1.5 hover:border-danger hover:text-danger hover:bg-rose-50 transition rounded-lg"
              onClick={() => setShowLogoutConfirm(true)}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Đăng xuất</span>
            </Button>
          </div>
        </header>

        {/* Dynamic Inner Outlet content */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
