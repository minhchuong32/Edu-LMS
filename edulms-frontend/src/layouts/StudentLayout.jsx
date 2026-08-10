import React, { useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import Badge from "../components/common/Badge";
import Button from "../components/common/Button";
import Avatar from "../components/common/Avatar";
import { useAuth } from "../context/AuthContext";
import authService from "../services/authService";
import {
  User,
  ShieldCheck,
  X,
  LogOut,
  Menu,
  Bell,
  AlertCircle,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  BookOpen,
  Calendar,
  ClipboardList,
  Award,
  Home,
} from "lucide-react";

export default function StudentLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileTab, setProfileTab] = useState("info"); // "info" | "security"

  // Change password form state
  const [pwdForm, setPwdForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [showPwdMap, setShowPwdMap] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [pwdError, setPwdError] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);

  const { user: authUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const currentUser = authUser || {
    name: "Học sinh",
    email: "student@edulms.edu",
    role: "Student",
  };

  const activeRole = currentUser?.role || "Student";
  const studentCode = currentUser?.studentCode || currentUser?.userCode || null;

  // Header Nav Items
  const studentNavItems = [
    {
      name: "Trang chủ",
      path: "/student",
      exact: true,
      icon: <Home className="w-4 h-4" />,
    },
    {
      name: "Khóa học của tôi",
      path: "/student/courses",
      icon: <BookOpen className="w-4 h-4" />,
    },
    {
      name: "Thời khóa biểu",
      path: "/student/schedule",
      icon: <Calendar className="w-4 h-4" />,
    },
    {
      name: "Điểm số",
      path: "/student/grades",
      icon: <Award className="w-4 h-4" />,
    },
    {
      name: "Bài tập",
      path: "/student/quizzes",
      icon: <ClipboardList className="w-4 h-4" />,
    },
    {
      name: "Bảo mật",
      path: "/student/security",
      icon: <ShieldCheck className="w-4 h-4" />,
    },
  ];

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    setPwdError("");
    setPwdSuccess("");

    if (!pwdForm.currentPassword) {
      setPwdError("Vui lòng nhập mật khẩu hiện tại.");
      return;
    }
    if (!pwdForm.newPassword) {
      setPwdError("Vui lòng nhập mật khẩu mới.");
      return;
    }
    if (pwdForm.newPassword.length < 6) {
      setPwdError("Mật khẩu mới phải chứa ít nhất 6 ký tự.");
      return;
    }
    if (pwdForm.newPassword !== pwdForm.confirmNewPassword) {
      setPwdError("Xác nhận mật khẩu mới không trùng khớp.");
      return;
    }
    if (pwdForm.currentPassword === pwdForm.newPassword) {
      setPwdError("Mật khẩu mới không được trùng với mật khẩu hiện tại.");
      return;
    }

    setPwdLoading(true);
    try {
      await authService.changePassword(
        pwdForm.currentPassword,
        pwdForm.newPassword,
        pwdForm.confirmNewPassword
      );
      setPwdSuccess(
        "Đổi mật khẩu thành công! Tất cả phiên cũ đã hủy. Đang chuyển hướng..."
      );
      setTimeout(async () => {
        await logout();
        window.location.href = "/login";
      }, 1800);
    } catch (err) {
      const errMsg =
        err?.response?.data?.message ||
        err?.message ||
        "Đổi mật khẩu thất bại. Vui lòng kiểm tra lại mật khẩu hiện tại.";
      setPwdError(errMsg);
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 font-sans flex flex-col text-neutral-600 antialiased selection:bg-primary selection:text-white">
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
                <X className="w-5 h-5" />
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
                <Badge role="Student" className="text-xs py-1 px-3">
                  Học Sinh
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

              {/* Profile Tabs */}
              <div className="flex border-b border-neutral-200 mt-4">
                <button
                  type="button"
                  onClick={() => setProfileTab("info")}
                  className={`pb-2 px-3 text-xs font-bold transition border-b-2 flex items-center gap-1.5 ${
                    profileTab === "info"
                      ? "border-primary text-primary"
                      : "border-transparent text-neutral-500 hover:text-neutral-900"
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>Thông tin cá nhân</span>
                </button>
                <button
                  type="button"
                  onClick={() => setProfileTab("security")}
                  className={`pb-2 px-3 text-xs font-bold transition border-b-2 flex items-center gap-1.5 ${
                    profileTab === "security"
                      ? "border-primary text-primary"
                      : "border-transparent text-neutral-500 hover:text-neutral-900"
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Đổi mật khẩu</span>
                </button>
              </div>

              {profileTab === "info" ? (
                <>
                  <div className="mt-4 space-y-3 bg-neutral-50 p-4 rounded-xl border border-neutral-200/80 text-left">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-600 font-medium">
                        Vai trò hệ thống
                      </span>
                      <span className="font-bold text-neutral-900 capitalize">
                        Học Sinh (Student)
                      </span>
                    </div>

                    {studentCode && (
                      <div className="flex items-center justify-between text-xs pt-2 border-t border-neutral-200/60">
                        <span className="text-neutral-600 font-medium">
                          Mã số học sinh
                        </span>
                        <span className="font-mono font-bold text-primary bg-primary-light px-2 py-0.5 rounded">
                          {studentCode}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-neutral-200/60">
                      <span className="text-neutral-600 font-medium">
                        Trạng thái tài khoản
                      </span>
                      <span className="inline-flex items-center gap-1.5 font-bold text-emerald-600">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Đang học
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center gap-3">
                    <Button
                      variant="outline"
                      className="flex-1 text-xs font-semibold py-2.5 rounded-xl"
                      onClick={() => setShowProfileModal(false)}
                    >
                      Đóng
                    </Button>
                    <Button
                      variant="danger"
                      className="flex-1 text-xs font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1.5"
                      onClick={() => {
                        setShowProfileModal(false);
                        setShowLogoutConfirm(true);
                      }}
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Đăng xuất</span>
                    </Button>
                  </div>
                </>
              ) : (
                /* SECURITY / CHANGE PASSWORD TAB */
                <form
                  onSubmit={handleChangePasswordSubmit}
                  className="mt-4 space-y-3 text-left"
                >
                  {pwdError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>{pwdError}</span>
                    </div>
                  )}

                  {pwdSuccess && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                      <span>{pwdSuccess}</span>
                    </div>
                  )}

                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                        Mật khẩu hiện tại
                      </label>
                      <div className="relative">
                        <input
                          type={showPwdMap.current ? "text" : "password"}
                          placeholder="••••••••"
                          value={pwdForm.currentPassword}
                          onChange={(e) =>
                            setPwdForm({
                              ...pwdForm,
                              currentPassword: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 pr-9 bg-neutral-50 border border-neutral-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                          required
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowPwdMap((prev) => ({
                              ...prev,
                              current: !prev.current,
                            }))
                          }
                          tabIndex={-1}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition p-0.5"
                        >
                          {showPwdMap.current ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                        Mật khẩu mới
                      </label>
                      <div className="relative">
                        <input
                          type={showPwdMap.new ? "text" : "password"}
                          placeholder="••••••••"
                          value={pwdForm.newPassword}
                          onChange={(e) =>
                            setPwdForm({
                              ...pwdForm,
                              newPassword: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 pr-9 bg-neutral-50 border border-neutral-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                          required
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowPwdMap((prev) => ({
                              ...prev,
                              new: !prev.new,
                            }))
                          }
                          tabIndex={-1}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition p-0.5"
                        >
                          {showPwdMap.new ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                        Xác nhận mật khẩu mới
                      </label>
                      <div className="relative">
                        <input
                          type={showPwdMap.confirm ? "text" : "password"}
                          placeholder="••••••••"
                          value={pwdForm.confirmNewPassword}
                          onChange={(e) =>
                            setPwdForm({
                              ...pwdForm,
                              confirmNewPassword: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 pr-9 bg-neutral-50 border border-neutral-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                          required
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowPwdMap((prev) => ({
                              ...prev,
                              confirm: !prev.confirm,
                            }))
                          }
                          tabIndex={-1}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition p-0.5"
                        >
                          {showPwdMap.confirm ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 text-xs font-semibold py-2 rounded-xl"
                      onClick={() => setShowProfileModal(false)}
                    >
                      Hủy
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      className="flex-1 text-xs font-bold py-2 rounded-xl shadow-md flex items-center justify-center gap-1.5"
                      disabled={pwdLoading}
                    >
                      {pwdLoading ? (
                        "Đang xử lý..."
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>Đổi mật khẩu</span>
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}
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
            className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl border border-neutral-200 transform transition-all text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-rose-50 text-danger flex items-center justify-center mx-auto mb-4 ring-8 ring-rose-50/50">
              <LogOut className="w-6 h-6 text-rose-600" />
            </div>

            <h3 className="text-base font-bold text-neutral-900 mb-1.5">
              Xác nhận đăng xuất
            </h3>
            <p className="text-xs text-neutral-600 mb-6 leading-relaxed">
              Bạn có chắc chắn muốn đăng xuất khỏi cổng học sinh EduLMS không?
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
                className="flex-1 text-xs font-semibold py-2 rounded-lg flex items-center justify-center gap-1.5"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  logout();
                }}
              >
                <LogOut className="w-4 h-4" />
                <span>Đăng xuất</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* STICKY HEADER NAVIGATION (GUEST LANDING STYLE) */}
      <header className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-neutral-200/80 z-40 px-6 py-3.5 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Brand Logo & Title */}
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => navigate("/student")}
          >
            <div className="w-10 h-10 rounded-xl bg-primary text-white font-extrabold font-outfit flex items-center justify-center text-2xl shadow-md shadow-primary/25 group-hover:scale-105 transition-transform">
              E
            </div>
            <div>
              <h1 className="font-outfit font-extrabold text-lg tracking-wide text-neutral-900 leading-none group-hover:text-primary transition-colors">
                EduLMS
              </h1>
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block mt-0.5">
                Cổng Học Sinh THPT
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold">
            {studentNavItems.map((item) => {
              const isExactHome = item.exact && location.pathname === "/student";
              const isSubActive =
                !item.exact && location.pathname.startsWith(item.path);
              const isActive = isExactHome || isSubActive;

              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  end={item.exact}
                  className={`flex items-center gap-1.5 transition-colors py-1 ${
                    isActive
                      ? "text-primary font-bold border-b-2 border-primary"
                      : "text-neutral-600 hover:text-primary"
                  }`}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Desktop Right User Actions */}
          <div className="hidden lg:flex items-center gap-4">
            <button
              aria-label="Thông báo"
              className="relative p-2 text-neutral-600 hover:text-primary rounded-xl hover:bg-neutral-100 transition"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full ring-2 ring-white"></span>
            </button>

            <button
              onClick={() => setShowProfileModal(true)}
              className="flex items-center gap-2.5 pl-3 border-l border-neutral-200 hover:opacity-80 transition text-left group"
            >
              <Avatar
                src={currentUser.avatar}
                name={currentUser.name}
                email={currentUser.email}
                size="sm"
              />
              <div className="leading-tight">
                <p className="text-xs font-bold text-neutral-900 max-w-[130px] truncate group-hover:text-primary transition">
                  {currentUser.name}
                </p>
                <span className="text-[10px] font-semibold text-neutral-500 uppercase">
                  Học sinh
                </span>
              </div>
            </button>

            <Button
              variant="outline"
              className="px-3 py-1.5 text-xs font-semibold h-8 flex items-center gap-1.5 hover:border-danger hover:text-danger hover:bg-rose-50 transition rounded-xl"
              onClick={() => setShowLogoutConfirm(true)}
            >
              <LogOut className="w-4 h-4" />
              <span>Đăng xuất</span>
            </Button>
          </div>

          {/* Mobile Hamburger Toggle */}
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-xl text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition lg:hidden"
            aria-label="Mở menu di động"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* MOBILE DRAWER OVERLAY BACKDROP */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm z-50 lg:hidden transition-opacity duration-300"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* MOBILE DRAWER SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 w-[270px] bg-white border-r border-neutral-200 z-50 transform transition-transform duration-300 ease-in-out lg:hidden flex flex-col ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary text-white font-bold font-outfit flex items-center justify-center text-lg shadow-sm">
              E
            </div>
            <h1 className="font-outfit font-extrabold text-base tracking-wider text-neutral-900">
              EduLMS
            </h1>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Đóng menu"
            className="p-1.5 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Mobile Nav Links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto text-left">
          {studentNavItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.exact}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
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

        {/* Mobile Footer User Profile */}
        <div className="p-4 border-t border-neutral-200 bg-neutral-50/50">
          <button
            onClick={() => {
              setMobileOpen(false);
              setShowProfileModal(true);
            }}
            className="flex items-center gap-3 w-full text-left p-2 rounded-xl hover:bg-neutral-100/80 transition"
          >
            <Avatar
              src={currentUser.avatar}
              name={currentUser.name}
              email={currentUser.email}
              size="md"
            />
            <div className="overflow-hidden flex-1">
              <p className="text-xs font-bold text-neutral-900 truncate">
                {currentUser.name}
              </p>
              <Badge role="Student" className="mt-0.5 text-[10px] py-0.5 px-2">
                Học sinh
              </Badge>
            </div>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
        <Outlet />
      </main>
    </div>
  );
}
