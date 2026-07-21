import React, { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import Badge from "../components/common/Badge";
import Button from "../components/common/Button";
import { useAuth } from "../context/AuthContext";

export default function RoleSidebarLayout({ role, navItems = [], user: propUser }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user: authUser, logout } = useAuth();

  const currentUser = propUser || authUser || {
    name: "Người dùng",
    email: "user@edulms.edu",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
  };

  const activeRole = role || currentUser?.role || "User";

  return (
    <div className="min-h-screen bg-neutral-50 font-sans flex text-neutral-600 antialiased">
      {/* MOBILE DRAWER OVERLAY BACKDROP */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* MOBILE DRAWER SIDEBAR (Slides from left) */}
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
            className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation items for mobile */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-primary-light text-primary border-r-4 border-primary font-bold"
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
          <div className="flex items-center gap-3">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-9 h-9 rounded-full object-cover border border-neutral-200"
            />
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-neutral-900 truncate">{currentUser.name}</p>
              <Badge role={activeRole} className="mt-0.5 text-[10px] py-0.5 px-2">
                {activeRole}
              </Badge>
            </div>
          </div>
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
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block -mt-0.5">
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
                    ? "bg-primary-light text-primary border-r-4 border-primary font-bold"
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
          <div className="flex items-center gap-3">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-9 h-9 rounded-full object-cover border border-neutral-200"
            />
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-neutral-900 truncate">{currentUser.name}</p>
              <Badge role={activeRole} className="mt-0.5 text-[10px] py-0.5 px-2">
                {activeRole}
              </Badge>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN VIEW AREA OFFSET FOR DESKTOP SIDEBAR */}
      <div className="flex-1 flex flex-col lg:pl-[260px] min-h-screen overflow-x-hidden">
        {/* Header Navigation with Avatar and Logout */}
        <header className="sticky top-0 bg-white border-b border-neutral-200 z-20 flex items-center justify-between px-4 sm:px-6 py-3.5 shadow-sm">
          <div className="flex items-center gap-3">
            {/* Hamburger button on mobile */}
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
              <span className="text-xs font-semibold text-neutral-500">Hệ thống:</span>
              <span className="text-xs font-bold text-neutral-800 bg-neutral-100 px-2.5 py-1 rounded-md border border-neutral-200">
                EduLMS Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Notification bell */}
            <button
              aria-label="Thông báo"
              className="relative p-2 text-neutral-500 hover:text-neutral-800 rounded-lg hover:bg-neutral-100 transition"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full ring-2 ring-white"></span>
            </button>

            {/* User Profile Avatar in Header */}
            <div className="flex items-center gap-3 pl-3 border-l border-neutral-200">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-8 h-8 rounded-full object-cover border border-neutral-200 shadow-sm"
              />
              <div className="hidden md:block text-left leading-tight">
                <p className="text-xs font-bold text-neutral-900 truncate max-w-[120px]">{currentUser.name}</p>
                <span className="text-[10px] font-semibold text-neutral-500 capitalize">{activeRole}</span>
              </div>
            </div>

            {/* Logout button */}
            <Button
              variant="outline"
              className="px-3 py-1.5 text-xs font-semibold h-8 flex items-center gap-1.5 hover:border-danger hover:text-danger hover:bg-rose-50/50 transition"
              onClick={logout}
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

