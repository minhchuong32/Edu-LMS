import React, { useState, useEffect } from "react";
import axiosClient from "../../api/axiosClient";
import Card from "../../components/common/Card";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import UserImport from "./UserImport";

export default function UserManagement() {
  const [activeTab, setActiveTab] = useState("list"); // "list" | "import"
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Filters State
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");

  // Fetch users from server with query criteria
  const fetchUsers = async () => {
    setIsLoading(true);
    setError("");
    try {
      const queryParams = new URLSearchParams();
      if (role) queryParams.append("role", role);
      if (search) queryParams.append("search", search);

      const response = await axiosClient.get(`/users?${queryParams.toString()}`);
      if (response.success) {
        setUsers(response.data);
      } else {
        setError(response.message || "Không thể tải danh sách người dùng.");
      }
    } catch (err) {
      setError(err.message || "Lỗi kết nối với máy chủ.");
    } finally {
      setIsLoading(false);
    }
  };

  // Re-fetch users whenever list tab is active, or filters change
  useEffect(() => {
    if (activeTab === "list") {
      const delayDebounceFn = setTimeout(() => {
        fetchUsers();
      }, 300); // 300ms debounce for text search query

      return () => clearTimeout(delayDebounceFn);
    }
  }, [activeTab, role, search]);

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
    <div className="space-y-6">
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
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm kiếm theo Tên, Email hoặc Mã định danh..."
                className="w-full pl-9 pr-3 py-2 text-sm text-neutral-900 placeholder-neutral-600 bg-white border border-neutral-200 focus:ring-1 focus:ring-primary focus:border-primary rounded-lg outline-none transition"
              />
            </div>

            <div className="flex gap-3 w-full sm:w-auto">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="px-3 py-2 text-sm bg-white border border-neutral-200 focus:ring-1 focus:ring-primary focus:border-primary rounded-lg outline-none transition w-full sm:w-44 font-semibold text-neutral-600"
              >
                <option value="">Tất cả Vai trò</option>
                <option value="admin">Quản trị viên (Admin)</option>
                <option value="teacher">Giáo viên (Teacher)</option>
                <option value="student">Học sinh (Student)</option>
                <option value="parent">Phụ huynh (Parent)</option>
              </select>
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
                      <th className="px-4 py-2.5">Ngày tạo</th>
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
                            u.classRef.name
                          ) : (
                            <span className="text-neutral-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-neutral-600 text-xs">{formatDate(u.createdAt)}</td>
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
    </div>
  );
}
