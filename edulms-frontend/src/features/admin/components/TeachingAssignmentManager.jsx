import React, { useState, useEffect } from "react";
import academicService from "../../../services/academicService";

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

  // Filtering lists for Autocomplete Dropdowns
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

      {/* Header and Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Filter by Teacher */}
          <select
            value={filterTeacher}
            onChange={(e) => setFilterTeacher(e.target.value)}
            className="bg-neutral-50 border border-neutral-200 text-neutral-900 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary"
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
            className="bg-neutral-50 border border-neutral-200 text-neutral-900 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary"
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
            className="bg-neutral-50 border border-neutral-200 text-neutral-900 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary"
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
              className="text-xs text-primary hover:underline font-medium"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>

        <button
          onClick={handleOpenCreate}
          className="text-sm font-medium px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-hover transition-colors shadow-sm"
        >
          + Phân công Giảng dạy mới
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
            <span className="text-sm font-medium">Đang tải phân công giảng dạy...</span>
          </div>
        ) : assignments.length === 0 ? (
          <div className="text-center py-16 text-neutral-600 text-sm">
            Chưa có dữ liệu phân công giảng dạy nào. Nhấn "+ Phân công Giảng dạy mới" để thêm.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-neutral-900">
              <thead className="bg-neutral-50 text-xs uppercase text-neutral-600 border-b border-neutral-200 font-semibold tracking-wider">
                <tr>
                  <th className="py-3.5 px-5">Giáo Viên Phụ Trách</th>
                  <th className="py-3.5 px-5">Lớp Học</th>
                  <th className="py-3.5 px-5">Khối</th>
                  <th className="py-3.5 px-5">Môn Học</th>
                  <th className="py-3.5 px-5 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {assignments.map((assign) => {
                  const teacher = assign.teacherRef;
                  const cls = assign.classRef;
                  const subject = assign.subjectRef;
                  const gradeName = cls?.gradeRef?.name || "N/A";

                  return (
                    <tr key={assign._id} className="hover:bg-neutral-50 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2.5">
                          {/* Role Badge Teacher: Light Purple */}
                          <span className="bg-purple-50 text-purple-700 border border-purple-200 rounded-lg px-2.5 py-1 text-xs font-medium inline-flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                            {teacher?.name || "N/A"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-5">
                        <span className="font-semibold text-neutral-900">{cls?.name || "N/A"}</span>
                        <span className="text-xs text-neutral-600 ml-2">({cls?.schoolYear || ""})</span>
                      </td>
                      <td className="py-3.5 px-5">
                        <span className="bg-primary-light text-primary border border-primary-light rounded-lg px-2.5 py-0.5 text-xs font-medium">
                          Khối {gradeName}
                        </span>
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-primary">{subject?.name || "N/A"}</span>
                          {subject?.code && (
                            <span className="text-[11px] font-mono text-neutral-600 bg-neutral-100 px-1.5 py-0.5 rounded-md">
                              {subject.code}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(assign)}
                            className="p-1.5 text-neutral-600 hover:text-warning hover:bg-amber-50 rounded-lg transition-colors"
                            title="Thay đổi phân công"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(assign._id)}
                            className="p-1.5 text-neutral-600 hover:text-danger hover:bg-rose-50 rounded-lg transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-neutral-200 w-full max-w-lg rounded-xl shadow-xl p-6 relative">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-200">
              <h3 className="text-xl font-semibold text-neutral-900">
                {editingAssignment ? "Chỉnh Sửa Phân Công Giảng Dạy" : "Biểu Mẫu Phân Công Giảng Dạy Mới"}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-neutral-600 hover:text-neutral-900 text-lg font-bold">✕</button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* 1. Chọn Giáo Viên (Autocomplete Dropdown) */}
              <div className="relative">
                <label className="block text-xs font-semibold text-neutral-900 mb-1">
                  1. Chọn Giáo Viên Phụ Trách<span className="text-danger">*</span>
                </label>

                <div
                  className="w-full bg-white border border-neutral-200 text-neutral-900 rounded-lg px-3.5 py-2 text-sm flex items-center justify-between cursor-pointer focus-within:border-primary"
                  onClick={() => {
                    setIsTeacherDropdownOpen(!isTeacherDropdownOpen);
                    setIsClassDropdownOpen(false);
                    setIsSubjectDropdownOpen(false);
                  }}
                >
                  {selectedTeacherObj ? (
                    <span className="font-semibold text-purple-700">{selectedTeacherObj.name} ({selectedTeacherObj.email})</span>
                  ) : (
                    <span className="text-neutral-600">Tìm & chọn Giáo viên...</span>
                  )}
                  <svg className="w-4 h-4 text-neutral-600 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {isTeacherDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-white border border-neutral-200 rounded-xl shadow-xl p-2 max-h-52 overflow-y-auto">
                    <input
                      type="text"
                      placeholder="Tìm theo tên, email giáo viên..."
                      value={teacherSearch}
                      onChange={(e) => setTeacherSearch(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 text-neutral-900 rounded-lg px-3 py-1.5 text-xs mb-2 focus:outline-none focus:border-primary"
                      autoFocus
                    />
                    {filteredTeachers.length === 0 ? (
                      <div className="text-center py-3 text-xs text-neutral-600">Không tìm thấy giáo viên.</div>
                    ) : (
                      filteredTeachers.map((t) => (
                        <div
                          key={t._id}
                          onClick={() => {
                            setForm({ ...form, teacher: t._id });
                            setIsTeacherDropdownOpen(false);
                          }}
                          className={`p-2 rounded-lg text-xs cursor-pointer flex items-center justify-between transition-colors ${
                            form.teacher === t._id ? "bg-primary-light text-primary font-semibold" : "hover:bg-neutral-100 text-neutral-900"
                          }`}
                        >
                          <div>
                            <p className="font-medium">{t.name}</p>
                            <p className="text-xs text-neutral-600">{t.email}</p>
                          </div>
                          {form.teacher === t._id && <span className="text-primary font-bold">✓</span>}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* 2. Chọn Lớp Học (Autocomplete Dropdown) */}
              <div className="relative">
                <label className="block text-xs font-semibold text-neutral-900 mb-1">
                  2. Chọn Lớp Học<span className="text-danger">*</span>
                </label>

                <div
                  className="w-full bg-white border border-neutral-200 text-neutral-900 rounded-lg px-3.5 py-2 text-sm flex items-center justify-between cursor-pointer focus-within:border-primary"
                  onClick={() => {
                    setIsClassDropdownOpen(!isClassDropdownOpen);
                    setIsTeacherDropdownOpen(false);
                    setIsSubjectDropdownOpen(false);
                  }}
                >
                  {selectedClassObj ? (
                    <span className="font-semibold text-primary">Lớp {selectedClassObj.name} - NH: {selectedClassObj.schoolYear}</span>
                  ) : (
                    <span className="text-neutral-600">Tìm & chọn Lớp học...</span>
                  )}
                  <svg className="w-4 h-4 text-neutral-600 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {isClassDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-white border border-neutral-200 rounded-xl shadow-xl p-2 max-h-52 overflow-y-auto">
                    <input
                      type="text"
                      placeholder="Tìm tên lớp, khối..."
                      value={classSearch}
                      onChange={(e) => setClassSearch(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 text-neutral-900 rounded-lg px-3 py-1.5 text-xs mb-2 focus:outline-none focus:border-primary"
                      autoFocus
                    />
                    {filteredClasses.length === 0 ? (
                      <div className="text-center py-3 text-xs text-neutral-600">Không tìm thấy lớp học.</div>
                    ) : (
                      filteredClasses.map((c) => (
                        <div
                          key={c._id}
                          onClick={() => {
                            setForm({ ...form, class: c._id });
                            setIsClassDropdownOpen(false);
                          }}
                          className={`p-2 rounded-lg text-xs cursor-pointer flex items-center justify-between transition-colors ${
                            form.class === c._id ? "bg-primary-light text-primary font-semibold" : "hover:bg-neutral-100 text-neutral-900"
                          }`}
                        >
                          <div>
                            <p className="font-medium">Lớp {c.name}</p>
                            <p className="text-xs text-neutral-600">Năm học: {c.schoolYear}</p>
                          </div>
                          {form.class === c._id && <span className="text-primary font-bold">✓</span>}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* 3. Chọn Môn Học (Autocomplete Dropdown) */}
              <div className="relative">
                <label className="block text-xs font-semibold text-neutral-900 mb-1">
                  3. Chọn Môn Học<span className="text-danger">*</span>
                </label>

                <div
                  className="w-full bg-white border border-neutral-200 text-neutral-900 rounded-lg px-3.5 py-2 text-sm flex items-center justify-between cursor-pointer focus-within:border-primary"
                  onClick={() => {
                    setIsSubjectDropdownOpen(!isSubjectDropdownOpen);
                    setIsTeacherDropdownOpen(false);
                    setIsClassDropdownOpen(false);
                  }}
                >
                  {selectedSubjectObj ? (
                    <span className="font-semibold text-primary">{selectedSubjectObj.name} ({selectedSubjectObj.code || "N/A"})</span>
                  ) : (
                    <span className="text-neutral-600">Tìm & chọn Môn học...</span>
                  )}
                  <svg className="w-4 h-4 text-neutral-600 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {isSubjectDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-white border border-neutral-200 rounded-xl shadow-xl p-2 max-h-52 overflow-y-auto">
                    <input
                      type="text"
                      placeholder="Tìm tên hoặc mã môn học..."
                      value={subjectSearch}
                      onChange={(e) => setSubjectSearch(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 text-neutral-900 rounded-lg px-3 py-1.5 text-xs mb-2 focus:outline-none focus:border-primary"
                      autoFocus
                    />
                    {filteredSubjects.length === 0 ? (
                      <div className="text-center py-3 text-xs text-neutral-600">Không tìm thấy môn học.</div>
                    ) : (
                      filteredSubjects.map((s) => (
                        <div
                          key={s._id}
                          onClick={() => {
                            setForm({ ...form, subject: s._id });
                            setIsSubjectDropdownOpen(false);
                          }}
                          className={`p-2 rounded-lg text-xs cursor-pointer flex items-center justify-between transition-colors ${
                            form.subject === s._id ? "bg-primary-light text-primary font-semibold" : "hover:bg-neutral-100 text-neutral-900"
                          }`}
                        >
                          <div>
                            <p className="font-medium">{s.name}</p>
                            <p className="text-xs font-mono text-neutral-600">{s.code || "Mã môn N/A"}</p>
                          </div>
                          {form.subject === s._id && <span className="text-primary font-bold">✓</span>}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
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
                  {editingAssignment ? "Cập nhật Phân công" : "Xác nhận Phân công"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
