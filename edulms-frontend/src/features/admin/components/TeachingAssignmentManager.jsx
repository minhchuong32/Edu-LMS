import React, { useState, useEffect } from "react";
import academicService from "../../../services/academicService";
import Button from "../../../components/common/Button";
import Badge from "../../../components/common/Badge";

export default function TeachingAssignmentManager({ onRefreshData }) {
  const [assignments, setAssignments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Filters State
  const [filterTeacher, setFilterTeacher] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterSubject, setFilterSubject] = useState("");

  // Modal & Form State
  const [showModal, setShowModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [form, setForm] = useState({
    teacher: "",
    class: "",
    subject: ""
  });

  // Autocomplete Dropdown Search States inside modal
  const [teacherSearch, setTeacherSearch] = useState("");
  const [isTeacherDropdownOpen, setIsTeacherDropdownOpen] = useState(false);

  const [classSearch, setClassSearch] = useState("");
  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false);

  const [subjectSearch, setSubjectSearch] = useState("");
  const [isSubjectDropdownOpen, setIsSubjectDropdownOpen] = useState(false);

  // Load all initial data
  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [assignRes, teacherRes, classRes, subjectRes] = await Promise.all([
        academicService.getTeachingAssignments({
          teacher: filterTeacher,
          class: filterClass,
          subject: filterSubject
        }),
        academicService.getTeachers(),
        academicService.getClasses(),
        academicService.getSubjects()
      ]);

      if (assignRes.success) setAssignments(assignRes.data || []);
      if (teacherRes.success) setTeachers(teacherRes.data || []);
      if (classRes.success) setClasses(classRes.data || []);
      if (subjectRes.success) setSubjects(subjectRes.data || []);
    } catch (err) {
      setError(err.message || "Không thể tải danh sách phân công giảng dạy.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterTeacher, filterClass, filterSubject]);

  const showNotification = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  const handleOpenCreate = () => {
    setEditingAssignment(null);
    setForm({ teacher: "", class: "", subject: "" });
    setTeacherSearch("");
    setClassSearch("");
    setSubjectSearch("");
    setShowModal(true);
  };

  const handleOpenEdit = (assign) => {
    setEditingAssignment(assign);

    const teacherId = assign.teacherRef?._id || assign.teacherRef || "";
    const classId = assign.classRef?._id || assign.classRef || "";
    const subjectId = assign.subjectRef?._id || assign.subjectRef || "";

    const teacherObj = teachers.find((t) => t._id === teacherId);
    const classObj = classes.find((c) => c._id === classId);
    const subjectObj = subjects.find((s) => s._id === subjectId);

    setForm({
      teacher: teacherId,
      class: classId,
      subject: subjectId
    });

    setTeacherSearch(teacherObj ? teacherObj.name : "");
    setClassSearch(classObj ? classObj.name : "");
    setSubjectSearch(subjectObj ? subjectObj.name : "");

    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.teacher || !form.class || !form.subject) {
      setError("Vui lòng chọn đầy đủ Giáo viên, Lớp học và Môn học.");
      return;
    }
    setError("");
    try {
      let res;
      if (editingAssignment) {
        res = await academicService.updateTeachingAssignment(editingAssignment._id, form);
      } else {
        res = await academicService.createTeachingAssignment(form);
      }

      if (res.success) {
        showNotification(
          editingAssignment ? "Cập nhật phân công giảng dạy thành công!" : "Tạo phân công giảng dạy thành công!"
        );
        setShowModal(false);
        loadData();
        if (onRefreshData) onRefreshData();
      }
    } catch (err) {
      setError(err.message || "Lỗi khi lưu phân công giảng dạy.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa phân công giảng dạy này?")) return;
    setError("");
    try {
      const res = await academicService.deleteTeachingAssignment(id);
      if (res.success) {
        showNotification("Xóa phân công giảng dạy thành công!");
        loadData();
        if (onRefreshData) onRefreshData();
      }
    } catch (err) {
      setError(err.message || "Không thể xóa phân công giảng dạy này.");
    }
  };

  // --- Filtering lists for Autocomplete Dropdowns ---
  const filteredTeachers = teachers.filter((t) => {
    const term = teacherSearch.toLowerCase();
    return (
      t.name?.toLowerCase().includes(term) ||
      t.email?.toLowerCase().includes(term) ||
      t.teacherCode?.toLowerCase().includes(term)
    );
  });

  const filteredClasses = classes.filter((c) => {
    const term = classSearch.toLowerCase();
    return (
      c.name?.toLowerCase().includes(term) ||
      c.schoolYear?.toLowerCase().includes(term) ||
      c.gradeRef?.name?.toLowerCase().includes(term)
    );
  });

  const filteredSubjects = subjects.filter((s) => {
    const term = subjectSearch.toLowerCase();
    return (
      s.name?.toLowerCase().includes(term) ||
      s.code?.toLowerCase().includes(term)
    );
  });

  const selectedTeacherObj = teachers.find((t) => t._id === form.teacher);
  const selectedClassObj = classes.find((c) => c._id === form.class);
  const selectedSubjectObj = subjects.find((s) => s._id === form.subject);

  return (
    <div className="space-y-6">
      {/* Alert Notifications */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 p-4 rounded-xl flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium">{error}</span>
          </div>
          <button onClick={() => setError("")} className="text-red-500 hover:text-red-700 text-sm">✕</button>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 p-4 rounded-xl flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm font-medium">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg("")} className="text-emerald-500 hover:text-emerald-700 text-sm">✕</button>
        </div>
      )}

      {/* Header and Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800/80 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Filter by Teacher */}
          <select
            value={filterTeacher}
            onChange={(e) => setFilterTeacher(e.target.value)}
            className="bg-slate-950/80 border border-slate-800 text-slate-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
          >
            <option value="">Tất cả Giáo viên</option>
            {teachers.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name}
              </option>
            ))}
          </select>

          {/* Filter by Class */}
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="bg-slate-950/80 border border-slate-800 text-slate-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
          >
            <option value="">Tất cả Lớp học</option>
            {classes.map((c) => (
              <option key={c._id} value={c._id}>
                Lớp {c.name} ({c.schoolYear})
              </option>
            ))}
          </select>

          {/* Filter by Subject */}
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="bg-slate-950/80 border border-slate-800 text-slate-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
          >
            <option value="">Tất cả Môn học</option>
            {subjects.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name} ({s.code || "N/A"})
              </option>
            ))}
          </select>

          {(filterTeacher || filterClass || filterSubject) && (
            <button
              onClick={() => {
                setFilterTeacher("");
                setFilterClass("");
                setFilterSubject("");
              }}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>

        <Button onClick={handleOpenCreate} variant="primary" className="text-xs px-4 py-2">
          + Phân công Giảng dạy mới
        </Button>
      </div>

      {/* Table Content */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="flex justify-center items-center py-16 text-slate-400">
            <svg className="animate-spin h-7 w-7 text-indigo-500 mr-3" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-sm font-medium">Đang tải phân công giảng dạy...</span>
          </div>
        ) : assignments.length === 0 ? (
          <div className="text-center py-16 text-slate-500 text-sm">
            Chưa có dữ liệu phân công giảng dạy nào. Nhấn "+ Phân công Giảng dạy mới" để thêm.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800/60 text-xs uppercase text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-5">Giáo Viên Phụ Trách</th>
                  <th className="py-3.5 px-5">Lớp Học</th>
                  <th className="py-3.5 px-5">Khối</th>
                  <th className="py-3.5 px-5">Môn Học</th>
                  <th className="py-3.5 px-5 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {assignments.map((assign) => {
                  const teacher = assign.teacherRef;
                  const cls = assign.classRef;
                  const subject = assign.subjectRef;
                  const gradeName = cls?.gradeRef?.name || "N/A";

                  return (
                    <tr key={assign._id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-xs">
                            {teacher?.name ? teacher.name.charAt(0).toUpperCase() : "G"}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-100">{teacher?.name || "N/A"}</p>
                            <p className="text-[11px] text-slate-400">{teacher?.email || ""}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-5">
                        <span className="font-bold text-slate-200">{cls?.name || "N/A"}</span>
                        <span className="text-xs text-slate-400 ml-2">({cls?.schoolYear || ""})</span>
                      </td>
                      <td className="py-3.5 px-5">
                        <Badge variant="info" className="text-xs">Khối {gradeName}</Badge>
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-indigo-300">{subject?.name || "N/A"}</span>
                          {subject?.code && (
                            <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                              {subject.code}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(assign)}
                            className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors"
                            title="Thay đổi phân công"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(assign._id)}
                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                            title="Xóa phân công"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- Biểu mẫu phân công giảng dạy (Teaching Assignment Modal Form with Autocomplete Dropdowns) --- */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 relative">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-slate-100">
                {editingAssignment ? "Chỉnh Sửa Phân Công Giảng Dạy" : "Biểu Mẫu Phân Công Giảng Dạy Mới"}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* 1. Chọn Giáo Viên (Autocomplete Dropdown) */}
              <div className="relative">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  1. Chọn Giáo Viên Phụ Trách<span className="text-red-400">*</span>
                </label>

                <div
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-3.5 py-2.5 text-sm flex items-center justify-between cursor-pointer focus-within:border-indigo-500"
                  onClick={() => {
                    setIsTeacherDropdownOpen(!isTeacherDropdownOpen);
                    setIsClassDropdownOpen(false);
                    setIsSubjectDropdownOpen(false);
                  }}
                >
                  {selectedTeacherObj ? (
                    <span className="font-semibold text-indigo-300">{selectedTeacherObj.name} ({selectedTeacherObj.email})</span>
                  ) : (
                    <span className="text-slate-500">Tìm & chọn Giáo viên...</span>
                  )}
                  <svg className="w-4 h-4 text-slate-400 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {isTeacherDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 max-h-52 overflow-y-auto">
                    <input
                      type="text"
                      placeholder="Tìm theo tên, email giáo viên..."
                      value={teacherSearch}
                      onChange={(e) => setTeacherSearch(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-3 py-1.5 text-xs mb-2 focus:outline-none focus:border-indigo-500"
                      autoFocus
                    />
                    {filteredTeachers.length === 0 ? (
                      <div className="text-center py-3 text-xs text-slate-500">Không tìm thấy giáo viên.</div>
                    ) : (
                      filteredTeachers.map((t) => (
                        <div
                          key={t._id}
                          onClick={() => {
                            setForm({ ...form, teacher: t._id });
                            setIsTeacherDropdownOpen(false);
                          }}
                          className={`p-2 rounded-lg text-xs cursor-pointer flex items-center justify-between ${
                            form.teacher === t._id ? "bg-indigo-600/30 text-indigo-300 font-semibold" : "hover:bg-slate-800 text-slate-200"
                          }`}
                        >
                          <div>
                            <p className="font-medium">{t.name}</p>
                            <p className="text-[11px] text-slate-400">{t.email}</p>
                          </div>
                          {form.teacher === t._id && <span className="text-indigo-400 font-bold">✓</span>}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* 2. Chọn Lớp Học (Autocomplete Dropdown) */}
              <div className="relative">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  2. Chọn Lớp Học<span className="text-red-400">*</span>
                </label>

                <div
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-3.5 py-2.5 text-sm flex items-center justify-between cursor-pointer focus-within:border-indigo-500"
                  onClick={() => {
                    setIsClassDropdownOpen(!isClassDropdownOpen);
                    setIsTeacherDropdownOpen(false);
                    setIsSubjectDropdownOpen(false);
                  }}
                >
                  {selectedClassObj ? (
                    <span className="font-semibold text-indigo-300">Lớp {selectedClassObj.name} - NH: {selectedClassObj.schoolYear}</span>
                  ) : (
                    <span className="text-slate-500">Tìm & chọn Lớp học...</span>
                  )}
                  <svg className="w-4 h-4 text-slate-400 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {isClassDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 max-h-52 overflow-y-auto">
                    <input
                      type="text"
                      placeholder="Tìm tên lớp, khối..."
                      value={classSearch}
                      onChange={(e) => setClassSearch(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-3 py-1.5 text-xs mb-2 focus:outline-none focus:border-indigo-500"
                      autoFocus
                    />
                    {filteredClasses.length === 0 ? (
                      <div className="text-center py-3 text-xs text-slate-500">Không tìm thấy lớp học.</div>
                    ) : (
                      filteredClasses.map((c) => (
                        <div
                          key={c._id}
                          onClick={() => {
                            setForm({ ...form, class: c._id });
                            setIsClassDropdownOpen(false);
                          }}
                          className={`p-2 rounded-lg text-xs cursor-pointer flex items-center justify-between ${
                            form.class === c._id ? "bg-indigo-600/30 text-indigo-300 font-semibold" : "hover:bg-slate-800 text-slate-200"
                          }`}
                        >
                          <div>
                            <p className="font-medium">Lớp {c.name}</p>
                            <p className="text-[11px] text-slate-400">Năm học: {c.schoolYear}</p>
                          </div>
                          {form.class === c._id && <span className="text-indigo-400 font-bold">✓</span>}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* 3. Chọn Môn Học (Autocomplete Dropdown) */}
              <div className="relative">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  3. Chọn Môn Học<span className="text-red-400">*</span>
                </label>

                <div
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-3.5 py-2.5 text-sm flex items-center justify-between cursor-pointer focus-within:border-indigo-500"
                  onClick={() => {
                    setIsSubjectDropdownOpen(!isSubjectDropdownOpen);
                    setIsTeacherDropdownOpen(false);
                    setIsClassDropdownOpen(false);
                  }}
                >
                  {selectedSubjectObj ? (
                    <span className="font-semibold text-indigo-300">{selectedSubjectObj.name} ({selectedSubjectObj.code || "N/A"})</span>
                  ) : (
                    <span className="text-slate-500">Tìm & chọn Môn học...</span>
                  )}
                  <svg className="w-4 h-4 text-slate-400 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {isSubjectDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 max-h-52 overflow-y-auto">
                    <input
                      type="text"
                      placeholder="Tìm tên hoặc mã môn học..."
                      value={subjectSearch}
                      onChange={(e) => setSubjectSearch(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-3 py-1.5 text-xs mb-2 focus:outline-none focus:border-indigo-500"
                      autoFocus
                    />
                    {filteredSubjects.length === 0 ? (
                      <div className="text-center py-3 text-xs text-slate-500">Không tìm thấy môn học.</div>
                    ) : (
                      filteredSubjects.map((s) => (
                        <div
                          key={s._id}
                          onClick={() => {
                            setForm({ ...form, subject: s._id });
                            setIsSubjectDropdownOpen(false);
                          }}
                          className={`p-2 rounded-lg text-xs cursor-pointer flex items-center justify-between ${
                            form.subject === s._id ? "bg-indigo-600/30 text-indigo-300 font-semibold" : "hover:bg-slate-800 text-slate-200"
                          }`}
                        >
                          <div>
                            <p className="font-medium">{s.name}</p>
                            <p className="text-[11px] font-mono text-slate-400">{s.code || "Mã môn N/A"}</p>
                          </div>
                          {form.subject === s._id && <span className="text-indigo-400 font-bold">✓</span>}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <Button type="button" variant="secondary" onClick={() => setShowModal(false)} className="text-xs">
                  Hủy bỏ
                </Button>
                <Button type="submit" variant="primary" className="text-xs">
                  {editingAssignment ? "Cập nhật Phân công" : "Xác nhận Phân công"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
