import React, { useState, useEffect } from "react";
import academicService from "../../../services/academicService";

export default function SubjectTable({ onRefreshData }) {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [form, setForm] = useState({
    code: "",
    name: "",
    description: ""
  });

  const fetchSubjects = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await academicService.getSubjects({ search });
      if (res.success) {
        setSubjects(res.data || []);
      }
    } catch (err) {
      setError(err.message || "Không thể tải danh sách môn học.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSubjects();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const showNotification = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  const handleOpenCreate = () => {
    setEditingSubject(null);
    setForm({ code: "", name: "", description: "" });
    setShowModal(true);
  };

  const handleOpenEdit = (subject) => {
    setEditingSubject(subject);
    setForm({
      code: subject.code || "",
      name: subject.name || "",
      description: subject.description || ""
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Vui lòng nhập tên môn học.");
      return;
    }
    setError("");
    try {
      let res;
      if (editingSubject) {
        res = await academicService.updateSubject(editingSubject._id, form);
      } else {
        res = await academicService.createSubject(form);
      }

      if (res.success) {
        showNotification(editingSubject ? "Cập nhật môn học thành công!" : "Tạo môn học mới thành công!");
        setShowModal(false);
        fetchSubjects();
        if (onRefreshData) onRefreshData();
      }
    } catch (err) {
      setError(err.message || "Lỗi khi lưu môn học.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa môn học này?")) return;
    setError("");
    try {
      const res = await academicService.deleteSubject(id);
      if (res.success) {
        showNotification("Xóa môn học thành công!");
        fetchSubjects();
        if (onRefreshData) onRefreshData();
      }
    } catch (err) {
      setError(err.message || "Không thể xóa môn học này.");
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Alert Notifications */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-danger p-4 rounded-xl flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-danger flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium">{error}</span>
          </div>
          <button onClick={() => setError("")} className="text-danger hover:opacity-80 text-sm font-bold">✕</button>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-success flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm font-medium">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg("")} className="text-emerald-700 hover:opacity-80 text-sm font-bold">✕</button>
        </div>
      )}

      {/* Table Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Tìm kiếm môn học theo tên hoặc mã môn..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 text-neutral-900 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
            />
            <svg className="w-4 h-4 text-neutral-600 absolute left-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="text-sm font-medium px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-hover transition-colors shadow-sm"
        >
          + Thêm Môn học mới
        </button>
      </div>

      {/* Table Content */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex justify-center items-center py-16 text-neutral-600">
            <svg className="animate-spin h-7 w-7 text-primary mr-3" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-sm font-medium">Đang tải danh mục môn học...</span>
          </div>
        ) : subjects.length === 0 ? (
          <div className="text-center py-16 text-neutral-600 text-sm">
            {search ? "Không tìm thấy môn học phù hợp với từ khóa." : "Chưa có môn học nào trong danh mục."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-neutral-900">
              <thead className="bg-neutral-50 text-xs uppercase text-neutral-600 border-b border-neutral-200 font-semibold tracking-wider">
                <tr>
                  <th className="py-3.5 px-5">Mã Môn</th>
                  <th className="py-3.5 px-5">Tên Môn Học</th>
                  <th className="py-3.5 px-5">Mô Tả</th>
                  <th className="py-3.5 px-5 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {subjects.map((sub) => (
                  <tr key={sub._id} className="hover:bg-neutral-50 transition-colors">
                    <td className="py-3.5 px-5 font-mono text-xs text-primary font-semibold">
                      {sub.code || "N/A"}
                    </td>
                    <td className="py-3.5 px-5 font-semibold text-neutral-900">
                      {sub.name}
                    </td>
                    <td className="py-3.5 px-5 text-xs text-neutral-600 max-w-xs truncate">
                      {sub.description || "Chưa có mô tả"}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(sub)}
                          className="p-1.5 text-neutral-600 hover:text-warning hover:bg-amber-50 rounded-lg transition-colors"
                          title="Chỉnh sửa Môn học"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(sub._id)}
                          className="p-1.5 text-neutral-600 hover:text-danger hover:bg-rose-50 rounded-lg transition-colors"
                          title="Xóa Môn học"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
      </div>

      {/* --- Modal Create / Edit Subject --- */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-neutral-200 w-full max-w-md rounded-xl shadow-xl p-6 relative">
            <h3 className="text-xl font-semibold text-neutral-900 mb-4">
              {editingSubject ? `Chỉnh sửa Môn ${editingSubject.name}` : "Thêm Môn Học Mới"}
            </h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-900 mb-1">
                  Mã Môn Học (Ví dụ: MATH10, PHYS11)
                </label>
                <input
                  type="text"
                  placeholder="Nhập mã môn học"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  className="w-full bg-white border border-neutral-200 text-neutral-900 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:border-primary font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-900 mb-1">
                  Tên Môn Học<span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Toán Học, Vật Lý, Hóa Học"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-white border border-neutral-200 text-neutral-900 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-900 mb-1">
                  Mô Tả
                </label>
                <textarea
                  rows={3}
                  placeholder="Nhập mô tả tóm tắt nội dung môn học..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-white border border-neutral-200 text-neutral-900 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="text-sm font-medium px-4 py-2 rounded-lg bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="text-sm font-medium px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-hover"
                >
                  Lưu thông tin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
