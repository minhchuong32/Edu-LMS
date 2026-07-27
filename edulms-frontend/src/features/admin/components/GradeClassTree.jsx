import React, { useState, useEffect } from "react";
import academicService from "../../../services/academicService";
import Button from "../../../components/common/Button";
import Badge from "../../../components/common/Badge";
import Card from "../../../components/common/Card";

export default function GradeClassTree({ onRefreshData }) {
  const [grades, setGrades] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Tree expansion state (gradeId -> boolean)
  const [expandedGrades, setExpandedGrades] = useState({});

  // Modals state
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [editingGrade, setEditingGrade] = useState(null); // null for create
  const [gradeNameInput, setGradeNameInput] = useState("");

  const [showClassModal, setShowClassModal] = useState(false);
  const [editingClass, setEditingClass] = useState(null); // null for create
  const [classForm, setClassForm] = useState({
    name: "",
    gradeRef: "",
    homeroomTeacherRef: "",
    schoolYear: "2025-2026"
  });

  // Homeroom Teacher search state inside modal
  const [teacherSearch, setTeacherSearch] = useState("");
  const [isTeacherDropdownOpen, setIsTeacherDropdownOpen] = useState(false);

  // Load data
  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [gradeRes, classRes, teacherRes] = await Promise.all([
        academicService.getGrades(),
        academicService.getClasses(),
        academicService.getTeachers()
      ]);

      if (gradeRes.success) {
        setGrades(gradeRes.data || []);
        // Automatically expand all grades by default
        const initExpanded = {};
        (gradeRes.data || []).forEach((g) => {
          initExpanded[g._id] = true;
        });
        setExpandedGrades(initExpanded);
      }
      if (classRes.success) setClasses(classRes.data || []);
      if (teacherRes.success) setTeachers(teacherRes.data || []);
    } catch (err) {
      setError(err.message || "Không thể tải cấu trúc Khối - Lớp học.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleGrade = (gradeId) => {
    setExpandedGrades((prev) => ({
      ...prev,
      [gradeId]: !prev[gradeId]
    }));
  };

  const showNotification = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  // --- Grade Actions ---
  const handleOpenCreateGrade = () => {
    setEditingGrade(null);
    setGradeNameInput("");
    setShowGradeModal(true);
  };

  const handleOpenEditGrade = (grade, e) => {
    e.stopPropagation();
    setEditingGrade(grade);
    setGradeNameInput(grade.name || "");
    setShowGradeModal(true);
  };

  const handleSaveGrade = async (e) => {
    e.preventDefault();
    if (!gradeNameInput.trim()) return;
    setError("");
    try {
      let res;
      if (editingGrade) {
        res = await academicService.updateGrade(editingGrade._id, { name: gradeNameInput.trim() });
      } else {
        res = await academicService.createGrade({ name: gradeNameInput.trim() });
      }

      if (res.success) {
        showNotification(editingGrade ? "Cập nhật khối thành công!" : "Tạo khối mới thành công!");
        setShowGradeModal(false);
        fetchData();
        if (onRefreshData) onRefreshData();
      }
    } catch (err) {
      setError(err.message || "Lỗi lưu thông tin khối học.");
    }
  };

  const handleDeleteGrade = async (gradeId, e) => {
    e.stopPropagation();
    if (!window.confirm("Bạn có chắc chắn muốn xóa khối này?")) return;
    setError("");
    try {
      const res = await academicService.deleteGrade(gradeId);
      if (res.success) {
        showNotification("Xóa khối học thành công!");
        fetchData();
        if (onRefreshData) onRefreshData();
      }
    } catch (err) {
      setError(err.message || "Không thể xóa khối học này.");
    }
  };

  // --- Class Actions ---
  const handleOpenCreateClass = (defaultGradeId = "") => {
    setEditingClass(null);
    setClassForm({
      name: "",
      gradeRef: defaultGradeId || (grades[0]?._id || ""),
      homeroomTeacherRef: "",
      schoolYear: "2025-2026"
    });
    setTeacherSearch("");
    setShowClassModal(true);
  };

  const handleOpenEditClass = (cls) => {
    setEditingClass(cls);
    const teacherId = cls.homeroomTeacherRef?._id || cls.homeroomTeacherRef || "";
    const teacherObj = teachers.find((t) => t._id === teacherId);

    setClassForm({
      name: cls.name || "",
      gradeRef: cls.gradeRef?._id || cls.gradeRef || "",
      homeroomTeacherRef: teacherId,
      schoolYear: cls.schoolYear || "2025-2026"
    });
    setTeacherSearch(teacherObj ? teacherObj.name : "");
    setShowClassModal(true);
  };

  const handleSaveClass = async (e) => {
    e.preventDefault();
    if (!classForm.name || !classForm.gradeRef || !classForm.homeroomTeacherRef || !classForm.schoolYear) {
      setError("Vui lòng nhập đầy đủ thông tin lớp học, khối, năm học và GVCN.");
      return;
    }
    setError("");
    try {
      let res;
      if (editingClass) {
        res = await academicService.updateClass(editingClass._id, classForm);
      } else {
        res = await academicService.createClass(classForm);
      }

      if (res.success) {
        showNotification(editingClass ? "Cập nhật lớp học thành công!" : "Tạo lớp học mới thành công!");
        setShowClassModal(false);
        fetchData();
        if (onRefreshData) onRefreshData();
      }
    } catch (err) {
      setError(err.message || "Lỗi lưu thông tin lớp học.");
    }
  };

  const handleDeleteClass = async (classId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa lớp học này?")) return;
    setError("");
    try {
      const res = await academicService.deleteClass(classId);
      if (res.success) {
        showNotification("Xóa lớp học thành công!");
        fetchData();
        if (onRefreshData) onRefreshData();
      }
    } catch (err) {
      setError(err.message || "Không thể xóa lớp học.");
    }
  };

  // Filter teachers for Homeroom teacher autocomplete search
  const filteredTeachers = teachers.filter((t) => {
    const term = teacherSearch.toLowerCase();
    return (
      t.name?.toLowerCase().includes(term) ||
      t.email?.toLowerCase().includes(term) ||
      t.teacherCode?.toLowerCase().includes(term)
    );
  });

  const selectedTeacherObj = teachers.find((t) => t._id === classForm.homeroomTeacherRef);

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

      {/* Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800/80 backdrop-blur-md">
        <div>
          <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <span>🌳 Cây Cấu trúc Khối & Lớp học</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">Quản lý phân cấp khối lớp, thông tin năm học và phân công giáo viên chủ nhiệm.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleOpenCreateGrade} variant="secondary" className="text-xs px-3.5 py-2">
            + Thêm Khối mới
          </Button>
          <Button onClick={() => handleOpenCreateClass()} variant="primary" className="text-xs px-3.5 py-2">
            + Thêm Lớp học mới
          </Button>
        </div>
      </div>

      {/* Tree Content */}
      {loading ? (
        <div className="flex justify-center items-center py-16 text-slate-400">
          <svg className="animate-spin h-7 w-7 text-indigo-500 mr-3" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm font-medium">Đang tải cây cấu trúc học vụ...</span>
        </div>
      ) : grades.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/30 rounded-2xl border border-dashed border-slate-800">
          <p className="text-slate-400 text-sm mb-3">Chưa có khối học nào được tạo.</p>
          <Button onClick={handleOpenCreateGrade} variant="primary" className="text-xs">
            Tạo Khối đầu tiên
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {grades.map((grade) => {
            const isExpanded = expandedGrades[grade._id];
            const gradeClasses = classes.filter((c) => {
              const gId = c.gradeRef?._id || c.gradeRef;
              return gId === grade._id;
            });

            return (
              <div
                key={grade._id}
                className="bg-slate-900/50 rounded-2xl border border-slate-800/80 overflow-hidden transition-all duration-200 hover:border-slate-700/80 shadow-lg"
              >
                {/* Grade Node Header */}
                <div
                  onClick={() => toggleGrade(grade._id)}
                  className="w-full px-5 py-4 flex items-center justify-between cursor-pointer bg-slate-800/40 hover:bg-slate-800/70 transition-colors select-none"
                >
                  <div className="flex items-center gap-3">
                    <button className="text-slate-400 hover:text-white transition-transform duration-200">
                      <svg
                        className={`w-5 h-5 transform transition-transform ${isExpanded ? "rotate-90" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-sm">
                      {grade.name}
                    </div>
                    <div>
                      <h4 className="text-base font-semibold text-slate-100">Khối {grade.name}</h4>
                      <p className="text-xs text-slate-400">{gradeClasses.length} lớp học trực thuộc</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleOpenCreateClass(grade._id)}
                      className="text-xs bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/30 px-3 py-1.5 rounded-lg transition-colors font-medium flex items-center gap-1"
                      title="Thêm lớp mới vào khối này"
                    >
                      <span>+ Thêm Lớp</span>
                    </button>
                    <button
                      onClick={(e) => handleOpenEditGrade(grade, e)}
                      className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Chỉnh sửa Khối"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => handleDeleteGrade(grade._id, e)}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Xóa Khối"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Class Nodes List */}
                {isExpanded && (
                  <div className="p-4 bg-slate-950/40 border-t border-slate-800/60 divide-y divide-slate-800/40">
                    {gradeClasses.length === 0 ? (
                      <div className="text-center py-6 text-slate-500 text-xs italic">
                        Khối {grade.name} chưa có lớp học nào. Nhấn "+ Thêm Lớp" để khởi tạo.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
                        {gradeClasses.map((cls) => {
                          const teacher = cls.homeroomTeacherRef;
                          const teacherName = teacher?.name || "Chưa phân công";

                          return (
                            <div
                              key={cls._id}
                              className="group bg-slate-900/90 border border-slate-800 rounded-xl p-4 hover:border-indigo-500/50 hover:shadow-indigo-500/5 transition-all duration-200 flex flex-col justify-between"
                            >
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-base font-bold text-slate-100 group-hover:text-indigo-400 transition-colors">
                                    {cls.name}
                                  </span>
                                  <Badge variant="info" className="text-[11px]">
                                    NH: {cls.schoolYear}
                                  </Badge>
                                </div>

                                <div className="space-y-1.5 text-xs text-slate-400 mt-3">
                                  <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    <span className="text-slate-300">
                                      GVCN: <strong className="text-slate-200 font-medium">{teacherName}</strong>
                                    </span>
                                  </div>

                                  {teacher?.email && (
                                    <div className="text-[11px] text-slate-400 pl-6 truncate">
                                      ✉ {teacher.email}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-800/80">
                                <button
                                  onClick={() => handleOpenEditClass(cls)}
                                  className="text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 px-2.5 py-1 rounded-md transition-colors"
                                >
                                  Phân công / Sửa
                                </button>
                                <button
                                  onClick={() => handleDeleteClass(cls._id)}
                                  className="text-xs text-red-400 hover:text-red-300 bg-red-500/10 px-2 py-1 rounded-md transition-colors"
                                >
                                  Xóa
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* --- Modal: Grade Create/Edit --- */}
      {showGradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 relative">
            <h3 className="text-lg font-bold text-slate-100 mb-4">
              {editingGrade ? `Chỉnh sửa Khối ${editingGrade.name}` : "Tạo Khối Học Mới"}
            </h3>
            <form onSubmit={handleSaveGrade} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tên Khối học (Ví dụ: 10, 11, 12)<span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nhập tên khối (vd: 10)"
                  value={gradeNameInput}
                  onChange={(e) => setGradeNameInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <Button type="button" variant="secondary" onClick={() => setShowGradeModal(false)} className="text-xs">
                  Hủy bỏ
                </Button>
                <Button type="submit" variant="primary" className="text-xs">
                  Lưu thông tin
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Modal: Class Create/Edit & Homeroom Teacher Assignment --- */}
      {showClassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 relative">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-slate-100">
                {editingClass ? `Cấu hình & GVCN - Lớp ${editingClass.name}` : "Tạo Lớp Học Mới"}
              </h3>
              <button onClick={() => setShowClassModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveClass} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Tên Lớp học<span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Vd: 10A1"
                    value={classForm.name}
                    onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Khối trực thuộc<span className="text-red-400">*</span>
                  </label>
                  <select
                    required
                    value={classForm.gradeRef}
                    onChange={(e) => setClassForm({ ...classForm, gradeRef: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- Chọn Khối --</option>
                    {grades.map((g) => (
                      <option key={g._id} value={g._id}>
                        Khối {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Năm học<span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="2025-2026"
                  value={classForm.schoolYear}
                  onChange={(e) => setClassForm({ ...classForm, schoolYear: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* --- Giao diện phân công Giáo viên Chủ nhiệm (Searchable Dropdown) --- */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-indigo-400 mb-1.5 flex items-center justify-between">
                  <span>👨‍🏫 Phân công Giáo viên Chủ nhiệm (GVCN)</span>
                  {selectedTeacherObj && (
                    <span className="text-[11px] text-emerald-400 font-normal">✓ Đã chọn</span>
                  )}
                </label>

                <div className="relative">
                  <div
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-3.5 py-2.5 text-sm flex items-center justify-between cursor-pointer focus-within:border-indigo-500"
                    onClick={() => setIsTeacherDropdownOpen(!isTeacherDropdownOpen)}
                  >
                    {selectedTeacherObj ? (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-indigo-300">{selectedTeacherObj.name}</span>
                        <span className="text-xs text-slate-400">({selectedTeacherObj.email})</span>
                      </div>
                    ) : (
                      <span className="text-slate-500">Tìm & chọn Giáo viên Chủ nhiệm...</span>
                    )}
                    <svg className="w-4 h-4 text-slate-400 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  {/* Dropdown popup */}
                  {isTeacherDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 max-h-60 overflow-y-auto">
                      <input
                        type="text"
                        placeholder="Nhập tên, email hoặc mã giáo viên..."
                        value={teacherSearch}
                        onChange={(e) => setTeacherSearch(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-3 py-1.5 text-xs mb-2 focus:outline-none focus:border-indigo-500"
                        autoFocus
                      />

                      {filteredTeachers.length === 0 ? (
                        <div className="text-center py-4 text-xs text-slate-500">
                          Không tìm thấy giáo viên phù hợp.
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {filteredTeachers.map((t) => (
                            <div
                              key={t._id}
                              onClick={() => {
                                setClassForm({ ...classForm, homeroomTeacherRef: t._id });
                                setIsTeacherDropdownOpen(false);
                              }}
                              className={`p-2 rounded-lg text-xs cursor-pointer flex items-center justify-between transition-colors ${
                                classForm.homeroomTeacherRef === t._id
                                  ? "bg-indigo-600/30 text-indigo-300 font-semibold"
                                  : "hover:bg-slate-800 text-slate-200"
                              }`}
                            >
                              <div>
                                <p className="font-medium text-slate-100">{t.name}</p>
                                <p className="text-[11px] text-slate-400">{t.email} {t.teacherCode ? `| MaGV: ${t.teacherCode}` : ""}</p>
                              </div>
                              {classForm.homeroomTeacherRef === t._id && (
                                <span className="text-indigo-400 font-bold">✓</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <Button type="button" variant="secondary" onClick={() => setShowClassModal(false)} className="text-xs">
                  Hủy bỏ
                </Button>
                <Button type="submit" variant="primary" className="text-xs">
                  {editingClass ? "Cập nhật Lớp" : "Tạo Lớp mới"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
