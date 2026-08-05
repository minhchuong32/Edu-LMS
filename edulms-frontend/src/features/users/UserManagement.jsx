import React, { useState, useEffect } from "react";
import userService from "../../services/userService";
import academicService from "../../services/academicService";
import Card from "../../components/common/Card";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import UserImport from "./UserImport";

export default function UserManagement() {
  const [activeTab, setActiveTab] = useState("list"); // "list" | "import"
  const [users, setUsers] = useState([]);
  const [classList, setClassList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null); // { message, type: 'success' | 'error' }

  // Filters State
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");

  // Modal States
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [editingUser, setEditingUser] = useState(null); // null if creating, user object if editing
  const [targetUser, setTargetUser] = useState(null); // target user for delete / detail view

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "student",
    studentCode: "",
    teacherCode: "",
    classRef: "",
    isActivated: true,
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Toast notifier helper
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch users & classes from server
  const fetchUsers = async () => {
    setIsLoading(true);
    setError("");
    try {
      const queryParams = {};
      if (role) queryParams.role = role;
      if (search) queryParams.search = search;

      const response = await userService.getUsers(queryParams);
      const data = response.data || response;
      if (Array.isArray(data)) {
        setUsers(data);
      } else {
        setUsers([]);
      }
    } catch (err) {
      console.error("Lỗi tải danh sách người dùng:", err);
      setError(err?.message || "Không thể tải danh sách người dùng từ máy chủ.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await academicService.getClasses();
      const data = response.data || response;
      if (Array.isArray(data)) {
        setClassList(data);
      }
    } catch (err) {
      console.warn("Không thể tải danh sách lớp học:", err);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (activeTab === "list") {
      const delayDebounceFn = setTimeout(() => {
        fetchUsers();
      }, 300);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [activeTab, role, search]);

  // Open modal handlers
  const handleOpenAddModal = () => {
    setEditingUser(null);
    setFormData({
      name: "",
      email: "",
      password: "",
      role: "student",
      studentCode: "",
      teacherCode: "",
      classRef: "",
      isActivated: true,
    });
    setFormErrors({});
    setShowFormModal(true);
  };

  const handleOpenEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name || "",
      email: user.email || "",
      password: "", // empty means leave password unchanged
      role: user.role || "student",
      studentCode: user.studentCode || "",
      teacherCode: user.teacherCode || "",
      classRef: user.classRef?._id || user.classRef || "",
      isActivated: user.isActivated !== undefined ? user.isActivated : true,
    });
    setFormErrors({});
    setShowFormModal(true);
  };

  const handleOpenDeleteModal = (user) => {
    setTargetUser(user);
    setShowDeleteModal(true);
  };

  const handleOpenDetailModal = (user) => {
    setTargetUser(user);
    setShowDetailModal(true);
  };

  // Form Validation
  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = "Họ và tên là bắt buộc.";
    }
    if (!formData.email.trim()) {
      errors.email = "Email là bắt buộc.";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        errors.email = "Định dạng email không hợp lệ.";
      }
    }

    if (!editingUser && formData.password && formData.password.trim().length < 6) {
      errors.password = "Mật khẩu khởi tạo phải có ít nhất 6 ký tự.";
    }

    if (editingUser && formData.password && formData.password.trim().length < 6) {
      errors.password = "Mật khẩu đặt lại phải có ít nhất 6 ký tự.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Form Submit Handler (Create or Edit User)
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: formData.role,
        isActivated: formData.isActivated,
      };

      if (formData.password && formData.password.trim()) {
        payload.password = formData.password.trim();
      }

      if (formData.role === "student") {
        payload.studentCode = formData.studentCode.trim() || undefined;
        payload.classRef = formData.classRef || null;
      } else if (formData.role === "teacher") {
        payload.teacherCode = formData.teacherCode.trim() || undefined;
      }

      if (editingUser) {
        await userService.updateUser(editingUser._id, payload);
        showToast("Cập nhật thông tin người dùng thành công!", "success");
      } else {
        await userService.createUser(payload);
        showToast("Tạo tài khoản người dùng mới thành công!", "success");
      }

      setShowFormModal(false);
      fetchUsers();
    } catch (err) {
      console.error("Lỗi lưu người dùng:", err);
      showToast(err?.message || "Không thể lưu thông tin người dùng", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete User Handler
  const handleDeleteConfirm = async () => {
    if (!targetUser) return;
    try {
      await userService.deleteUser(targetUser._id);
      showToast("Đã xóa tài khoản người dùng thành công!", "success");
      setShowDeleteModal(false);
      setTargetUser(null);
      fetchUsers();
    } catch (err) {
      console.error("Lỗi xóa người dùng:", err);
      showToast(err?.message || "Không thể xóa tài khoản người dùng này", "error");
    }
  };

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Toast Notification Banner */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold border transition-all animate-bounce ${
            toast.type === "error"
              ? "bg-rose-50 border-rose-200 text-rose-700"
              : "bg-emerald-50 border-emerald-200 text-emerald-700"
          }`}
        >
          <span>{toast.type === "error" ? "⚠️" : "✨"}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Tab Switcher Navigation */}
      <div className="flex border-b border-neutral-200 gap-1 select-none">
        <button
          onClick={() => setActiveTab("list")}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-all duration-150 flex items-center gap-2 ${
            activeTab === "list"
              ? "border-primary text-primary"
              : "border-transparent text-neutral-600 hover:text-neutral-900 hover:border-neutral-200"
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Danh Sách Người Dùng
        </button>
        <button
          onClick={() => setActiveTab("import")}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-all duration-150 flex items-center gap-2 ${
            activeTab === "import"
              ? "border-primary text-primary"
              : "border-transparent text-neutral-600 hover:text-neutral-900 hover:border-neutral-200"
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Nhập Từ Excel
        </button>
      </div>

      {/* TAB 1: User Directory List */}
      {activeTab === "list" && (
        <div className="space-y-6 animate-fade-in">
          {/* Filters Dashboard Card */}
          <Card className="p-4 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:max-w-md">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-500">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm kiếm theo Tên, Email hoặc Mã định danh..."
                className="w-full pl-9 pr-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 bg-white border border-neutral-200 focus:ring-1 focus:ring-primary focus:border-primary rounded-lg outline-none transition"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="px-3 py-2 text-sm bg-white border border-neutral-200 focus:ring-1 focus:ring-primary focus:border-primary rounded-lg outline-none transition w-full sm:w-44 font-semibold text-neutral-700"
              >
                <option value="">Tất cả Vai trò</option>
                <option value="admin">Quản trị viên (Admin)</option>
                <option value="teacher">Giáo viên (Teacher)</option>
                <option value="student">Học sinh (Student)</option>
                <option value="parent">Phụ huynh (Parent)</option>
              </select>

              <Button
                variant="primary"
                className="py-2 px-4 whitespace-nowrap text-xs shadow-sm"
                onClick={handleOpenAddModal}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span>Thêm Người Dùng</span>
              </Button>
            </div>
          </Card>

          {/* Feedback error messages */}
          {error && (
            <div className="p-4 bg-rose-50 border border-danger/20 text-danger text-sm font-semibold rounded-xl flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Users Table */}
          <Card className="p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="font-bold text-neutral-900 text-base">Danh Sách Người Dùng Hệ Thống</h3>
              <Badge variant="neutral">Số lượng: {users.length}</Badge>
            </div>

            {isLoading && users.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <span className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></span>
                <p className="text-sm font-medium text-neutral-600">Đang tải danh sách người dùng...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-neutral-50 border border-neutral-100 text-neutral-400 rounded-full flex items-center justify-center mb-3">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="font-bold text-neutral-900 text-base">Không tìm thấy người dùng</h4>
                <p className="text-xs text-neutral-600 mt-1 max-w-sm">
                  Thử điều chỉnh từ khóa tìm kiếm hoặc vai trò lọc để tìm thấy dữ liệu mong muốn.
                </p>
                <Button variant="outline" className="mt-4 text-xs" onClick={handleOpenAddModal}>
                  + Tạo tài khoản đầu tiên
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto border border-neutral-200 rounded-lg">
                <table className="w-full text-sm text-left">
                  <thead className="bg-neutral-50 text-xs font-semibold text-neutral-600 uppercase border-b border-neutral-200">
                    <tr>
                      <th className="px-4 py-2.5">Họ và tên</th>
                      <th className="px-4 py-2.5">Email</th>
                      <th className="px-4 py-2.5">Vai trò</th>
                      <th className="px-4 py-2.5">Mã định danh</th>
                      <th className="px-4 py-2.5">Lớp</th>
                      <th className="px-4 py-2.5">Trạng thái</th>
                      <th className="px-4 py-2.5">Ngày tạo</th>
                      <th className="px-4 py-2.5 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {users.map((u) => (
                      <tr key={u._id} className="hover:bg-neutral-50/50 transition">
                        <td className="px-4 py-3 font-semibold text-neutral-900">{u.name}</td>
                        <td className="px-4 py-3 text-neutral-600 font-mono text-xs">{u.email}</td>
                        <td className="px-4 py-3">
                          <Badge role={u.role}>{u.role}</Badge>
                        </td>
                        <td className="px-4 py-3 text-neutral-600 font-mono text-xs">
                          {u.role === "student" ? u.studentCode : u.role === "teacher" ? u.teacherCode : "-"}
                        </td>
                        <td className="px-4 py-3 text-neutral-600">
                          {u.role === "student" && u.classRef ? (
                            <span className="font-medium text-neutral-800">{u.classRef.name}</span>
                          ) : (
                            <span className="text-neutral-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {u.isActivated ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <span>✓</span> Đã kích hoạt
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              <span>⏳</span> Chờ kích hoạt
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-neutral-600 text-xs">{formatDate(u.createdAt)}</td>
                        {/* ACTIONS COLUMN */}
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {/* VIEW DETAILS BUTTON */}
                            <button
                              type="button"
                              onClick={() => handleOpenDetailModal(u)}
                              className="p-1.5 text-neutral-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition"
                              title="Xem chi tiết"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>

                            {/* EDIT BUTTON */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(u)}
                              className="p-1.5 text-neutral-500 hover:text-primary hover:bg-primary/10 rounded-lg transition"
                              title="Chỉnh sửa thông tin"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>

                            {/* DELETE BUTTON */}
                            <button
                              type="button"
                              onClick={() => handleOpenDeleteModal(u)}
                              className="p-1.5 text-neutral-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Xóa người dùng"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 2: Excel Importer Component */}
      {activeTab === "import" && (
        <div className="animate-fade-in">
          <UserImport />
        </div>
      )}

      {/* --- CREATE / EDIT USER MODAL --- */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 bg-neutral-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xl max-w-lg w-full p-6 animate-fadeIn transition-all">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-200 mb-4">
              <h3 className="text-lg font-bold text-neutral-900">
                {editingUser ? "Chỉnh sửa tài khoản người dùng" : "Tạo tài khoản người dùng mới"}
              </h3>
              <button
                onClick={() => setShowFormModal(false)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4">
              {/* Name Input */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-neutral-800">
                  Họ và tên <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Nguyễn Văn A"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-neutral-200 rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                />
                {formErrors.name && <p className="text-xs text-rose-600 font-semibold">{formErrors.name}</p>}
              </div>

              {/* Email Input */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-neutral-800">
                  Email tài khoản <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="user@edulms.edu.vn"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-neutral-200 rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                />
                {formErrors.email && <p className="text-xs text-rose-600 font-semibold">{formErrors.email}</p>}
              </div>

              {/* Password Input */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-neutral-800">
                  {editingUser ? "Đặt lại Mật khẩu (để trống nếu không đổi)" : "Mật khẩu (để trống sẽ tự động tạo)"}
                </label>
                <input
                  type="password"
                  placeholder={editingUser ? "Nhập mật khẩu mới..." : "Nhập từ 6 ký tự trở lên..."}
                  value={formData.password}
                  onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-neutral-200 rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                />
                {formErrors.password && <p className="text-xs text-rose-600 font-semibold">{formErrors.password}</p>}
              </div>

              {/* Role Selector */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-neutral-800">
                  Vai trò hệ thống <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData((prev) => ({ ...prev, role: e.target.value }))}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-neutral-200 rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary transition font-semibold"
                >
                  <option value="student">Học sinh (Student)</option>
                  <option value="teacher">Giáo viên (Teacher)</option>
                  <option value="admin">Quản trị viên (Admin)</option>
                  <option value="parent">Phụ huynh (Parent)</option>
                </select>
              </div>

              {/* STUDENT SPECIFIC FIELDS */}
              {formData.role === "student" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-neutral-800">Mã Học sinh (MSSV)</label>
                    <input
                      type="text"
                      placeholder="HS12345"
                      value={formData.studentCode}
                      onChange={(e) => setFormData((prev) => ({ ...prev, studentCode: e.target.value }))}
                      className="w-full px-3 py-1.5 text-xs font-mono uppercase bg-white border border-neutral-200 rounded-lg outline-none focus:border-primary transition"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-neutral-800">Phân vào Lớp học</label>
                    <select
                      value={formData.classRef}
                      onChange={(e) => setFormData((prev) => ({ ...prev, classRef: e.target.value }))}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg outline-none focus:border-primary transition"
                    >
                      <option value="">-- Chưa xếp lớp --</option>
                      {classList.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name} ({c.schoolYear || "Năm học"})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* TEACHER SPECIFIC FIELDS */}
              {formData.role === "teacher" && (
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex flex-col gap-1">
                  <label className="text-xs font-bold text-neutral-800">Mã Giáo viên (MSGV)</label>
                  <input
                    type="text"
                    placeholder="GV98765"
                    value={formData.teacherCode}
                    onChange={(e) => setFormData((prev) => ({ ...prev, teacherCode: e.target.value }))}
                    className="w-full px-3 py-1.5 text-xs font-mono uppercase bg-white border border-neutral-200 rounded-lg outline-none focus:border-primary transition"
                  />
                </div>
              )}

              {/* Activation Status Checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isActivated"
                  checked={formData.isActivated}
                  onChange={(e) => setFormData((prev) => ({ ...prev, isActivated: e.target.checked }))}
                  className="w-4 h-4 accent-primary rounded cursor-pointer"
                />
                <label htmlFor="isActivated" className="text-xs font-bold text-neutral-800 cursor-pointer">
                  Kích hoạt tài khoản ngay lập tức (cho phép đăng nhập)
                </label>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
                <Button variant="outline" className="py-2 px-4 text-xs" onClick={() => setShowFormModal(false)}>
                  Hủy bỏ
                </Button>
                <Button variant="primary" type="submit" disabled={submitting} className="py-2 px-4 text-xs">
                  {submitting ? "Đang lưu..." : editingUser ? "Lưu thay đổi" : "Tạo người dùng"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DELETE USER CONFIRMATION MODAL --- */}
      {showDeleteModal && targetUser && (
        <div className="fixed inset-0 z-50 bg-neutral-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xl max-w-md w-full p-6 animate-fadeIn space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900">Xác nhận xóa tài khoản</h3>
                <p className="text-xs text-neutral-500">Hành động này không thể hoàn tác.</p>
              </div>
            </div>

            <p className="text-sm text-neutral-700">
              Bạn có chắc chắn muốn xóa tài khoản <strong className="text-neutral-900">{targetUser.name}</strong> ({targetUser.email}) khỏi hệ thống?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="outline" className="py-2 px-4 text-xs" onClick={() => setShowDeleteModal(false)}>
                Hủy bỏ
              </Button>
              <Button variant="danger" className="py-2 px-4 text-xs" onClick={handleDeleteConfirm}>
                Xóa vĩnh viễn
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* --- USER DETAILS VIEW MODAL --- */}
      {showDetailModal && targetUser && (
        <div className="fixed inset-0 z-50 bg-neutral-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xl max-w-md w-full p-6 animate-fadeIn space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <h3 className="text-base font-bold text-neutral-900">Thông tin chi tiết người dùng</h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between border-b pb-2">
                <span className="text-neutral-500 font-semibold">Họ và tên:</span>
                <span className="font-bold text-neutral-900">{targetUser.name}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-neutral-500 font-semibold">Email:</span>
                <span className="font-mono text-neutral-800">{targetUser.email}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-neutral-500 font-semibold">Vai trò:</span>
                <Badge role={targetUser.role}>{targetUser.role}</Badge>
              </div>
              {targetUser.role === "student" && (
                <>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-neutral-500 font-semibold">Mã Học sinh:</span>
                    <span className="font-mono font-bold text-neutral-800">{targetUser.studentCode || "Chưa cấp"}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-neutral-500 font-semibold">Lớp học:</span>
                    <span className="font-bold text-neutral-800">{targetUser.classRef?.name || "Chưa xếp lớp"}</span>
                  </div>
                </>
              )}
              {targetUser.role === "teacher" && (
                <div className="flex justify-between border-b pb-2">
                  <span className="text-neutral-500 font-semibold">Mã Giáo viên:</span>
                  <span className="font-mono font-bold text-neutral-800">{targetUser.teacherCode || "Chưa cấp"}</span>
                </div>
              )}
              <div className="flex justify-between border-b pb-2">
                <span className="text-neutral-500 font-semibold">Trạng thái tài khoản:</span>
                <span className={`font-bold ${targetUser.isActivated ? "text-emerald-600" : "text-amber-600"}`}>
                  {targetUser.isActivated ? "✓ Đã kích hoạt" : "⏳ Chưa kích hoạt"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 font-semibold">Ngày khởi tạo:</span>
                <span className="text-neutral-700">{formatDate(targetUser.createdAt)}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" className="py-1.5 px-4 text-xs" onClick={() => setShowDetailModal(false)}>
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
