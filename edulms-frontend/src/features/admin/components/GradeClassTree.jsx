import React, { useState, useEffect } from "react";
import academicService from "../../../services/academicService";
import AssignHomeroomModal from "./AssignHomeroomModal";
import {
  FolderTree,
  Plus,
  Pencil,
  Trash2,
  UserCheck,
  Users,
  UserPlus,
  Mail,
  Check,
  X,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  Loader2
} from "lucide-react";

export default function GradeClassTree({ onRefreshData, onSelectClassForRoster }) {
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
  const [assignHomeroomClass, setAssignHomeroomClass] = useState(null);

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
        showNotification(editingGrade ? "Cập nhật khối học thành công!" : "Tạo khối học mới thành công!");
        setShowGradeModal(false);
        fetchData();
        if (onRefreshData) onRefreshData();
      } else {
        setError(res.message || "Thao tác không thành công.");
      }
    } catch (err) {
      setError(err.message || "Lỗi xử lý khối học.");
    }
  };

  const handleDeleteGrade = async (gradeId, e) => {
    e.stopPropagation();
    if (!window.confirm("Bạn có chắc chắn muốn xóa khối học này? Tất cả các lớp thuộc khối có thể bị ảnh hưởng.")) return;
    setError("");
    try {
      const res = await academicService.deleteGrade(gradeId);
      if (res.success) {
        showNotification("Xóa khối học thành công!");
        fetchData();
        if (onRefreshData) onRefreshData();
      } else {
        setError(res.message || "Không thể xóa khối học.");
      }
    } catch (err) {
      setError(err.message || "Lỗi khi xóa khối học.");
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
    setIsTeacherDropdownOpen(false);
    setShowClassModal(true);
  };

  const handleOpenEditClass = (cls) => {
    setEditingClass(cls);
    setClassForm({
      name: cls.name || "",
      gradeRef: cls.gradeRef?._id || cls.gradeRef || "",
      homeroomTeacherRef: cls.homeroomTeacherRef?._id || cls.homeroomTeacherRef || "",
      schoolYear: cls.schoolYear || "2025-2026"
    });
    setTeacherSearch("");
    setIsTeacherDropdownOpen(false);
    setShowClassModal(true);
  };

  const handleSaveClass = async (e) => {
    e.preventDefault();
    if (!classForm.name.trim() || !classForm.gradeRef) {
      setError("Vui lòng nhập tên lớp và chọn Khối học.");
      return;
    }
    setError("");
    try {
      let res;
      const payload = {
        name: classForm.name.trim(),
        gradeRef: classForm.gradeRef,
        homeroomTeacherRef: classForm.homeroomTeacherRef || null,
        schoolYear: classForm.schoolYear.trim()
      };

      if (editingClass) {
        res = await academicService.updateClass(editingClass._id, payload);
      } else {
        res = await academicService.createClass(payload);
      }

      if (res.success) {
        showNotification(editingClass ? "Cập nhật thông tin lớp thành công!" : "Tạo lớp học mới thành công!");
        setShowClassModal(false);
        fetchData();
        if (onRefreshData) onRefreshData();
      } else {
        setError(res.message || "Thao tác lớp học thất bại.");
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
      } else {
        setError(res.message || "Không thể xóa lớp học.");
      }
    } catch (err) {
      setError(err.message || "Lỗi xóa lớp học.");
    }
  };

  // Filter teachers by search input inside Modal
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
        <div className="bg-rose-50 border border-rose-200 text-danger p-4 rounded-xl flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-danger shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
          <button onClick={() => setError("")} className="text-danger hover:opacity-80 p-1 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-sm font-medium">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg("")} className="text-emerald-700 hover:opacity-80 p-1 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Action Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-xl border border-neutral-200 shadow-sm">
        <div>
          <h3 className="text-xl font-semibold text-neutral-900 flex items-center gap-2">
            <FolderTree className="w-6 h-6 text-primary shrink-0" />
            <span>Cây Cấu trúc Khối & Lớp học</span>
          </h3>
          <p className="text-xs text-neutral-600 mt-1">Quản lý phân cấp khối lớp, năm học và phân công giáo viên chủ nhiệm.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenCreateGrade}
            className="text-sm font-medium px-4 py-2 rounded-lg bg-primary-light text-primary hover:bg-indigo-100 transition-colors border border-primary-light inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Khối mới</span>
          </button>
          <button
            onClick={() => handleOpenCreateClass()}
            className="text-sm font-medium px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-hover transition-colors shadow-sm inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Lớp học mới</span>
          </button>
        </div>
      </div>

      {/* Tree Content */}
      {loading ? (
        <div className="flex justify-center items-center py-16 text-neutral-600">
          <Loader2 className="animate-spin h-7 w-7 text-primary mr-3" />
          <span className="text-sm font-medium">Đang tải cây cấu trúc học vụ...</span>
        </div>
      ) : grades.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-neutral-200">
          <p className="text-neutral-600 text-sm mb-3">Chưa có khối học nào được tạo.</p>
          <button
            onClick={handleOpenCreateGrade}
            className="text-sm font-medium px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-hover inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Khối đầu tiên</span>
          </button>
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
                className="bg-white rounded-xl border border-neutral-200 overflow-hidden transition-all shadow-sm"
              >
                {/* Grade Node Header */}
                <div
                  onClick={() => toggleGrade(grade._id)}
                  className="w-full px-5 py-4 flex items-center justify-between cursor-pointer bg-neutral-50 hover:bg-gray-100/70 transition-colors select-none"
                >
                  <div className="flex items-center gap-3">
                    <button className="text-neutral-600 hover:text-neutral-900 transition-transform duration-200">
                      <ChevronRight
                        className={`w-5 h-5 transform transition-transform ${isExpanded ? "rotate-90" : ""}`}
                      />
                    </button>
                    <div className="w-8 h-8 rounded-lg bg-primary-light text-primary border border-indigo-100 flex items-center justify-center font-semibold text-sm">
                      {grade.name}
                    </div>
                    <div>
                      <h4 className="text-base font-semibold text-neutral-900">Khối {grade.name}</h4>
                      <p className="text-xs text-neutral-600">{gradeClasses.length} lớp học trực thuộc</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleOpenCreateClass(grade._id)}
                      className="text-xs bg-primary-light text-primary hover:bg-indigo-100 border border-primary-light px-3 py-1.5 rounded-lg transition-colors font-medium inline-flex items-center gap-1"
                      title="Thêm lớp mới vào khối này"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm Lớp</span>
                    </button>
                    <button
                      onClick={(e) => handleOpenEditGrade(grade, e)}
                      className="p-1.5 text-neutral-600 hover:text-warning hover:bg-amber-50 rounded-lg transition-colors"
                      title="Chỉnh sửa Khối"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteGrade(grade._id, e)}
                      className="p-1.5 text-neutral-600 hover:text-danger hover:bg-rose-50 rounded-lg transition-colors"
                      title="Xóa Khối"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Class Nodes List */}
                {isExpanded && (
                  <div className="p-4 bg-white border-t border-neutral-200">
                    {gradeClasses.length === 0 ? (
                      <div className="text-center py-6 text-neutral-600 text-xs italic">
                        Khối {grade.name} chưa có lớp học nào. Nhấn "+ Thêm Lớp" để khởi tạo.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {gradeClasses.map((cls) => {
                          const teacher = cls.homeroomTeacherRef;
                          const teacherName = teacher?.name || "Chưa phân công";

                          return (
                            <div
                              key={cls._id}
                              className="group bg-neutral-50 border border-neutral-200 rounded-xl p-4 hover:border-primary transition-all flex flex-col justify-between"
                            >
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-base font-semibold text-neutral-900 group-hover:text-primary transition-colors">
                                    {cls.name}
                                  </span>
                                  <span className="bg-primary-light text-primary border border-indigo-100 text-xs font-medium rounded-lg px-2.5 py-0.5">
                                    NH: {cls.schoolYear}
                                  </span>
                                </div>

                                <div className="space-y-1.5 text-xs text-neutral-600 mt-3">
                                  <div className="flex items-center gap-2">
                                    {/* Role Badge Teacher */}
                                    <span className="bg-purple-50 text-purple-700 border border-purple-200 rounded-lg px-2.5 py-1 text-xs font-medium inline-flex items-center gap-1.5">
                                      <UserCheck className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                      <span>GVCN: <strong className="font-semibold">{teacherName}</strong></span>
                                    </span>
                                  </div>

                                  {teacher?.email && (
                                    <div className="text-xs text-neutral-600 pl-1 truncate flex items-center gap-1.5 mt-1">
                                      <Mail className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                                      <span className="truncate">{teacher.email}</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-neutral-200">
                                {onSelectClassForRoster && (
                                  <button
                                    onClick={() => onSelectClassForRoster(cls._id)}
                                    className="text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition-colors inline-flex items-center gap-1"
                                    title="Xem danh sách học sinh & Chuyển lớp"
                                  >
                                    <Users className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    <span>Xem HS</span>
                                  </button>
                                )}
                                <button
                                  onClick={() => setAssignHomeroomClass(cls)}
                                  className="text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2.5 py-1 rounded-lg transition-colors inline-flex items-center gap-1"
                                  title="Phân công / Đổi Giáo viên Chủ nhiệm"
                                >
                                  <UserCheck className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                  <span>GVCN</span>
                                </button>
                                <button
                                  onClick={() => handleOpenEditClass(cls)}
                                  className="text-xs font-medium text-primary hover:bg-primary-light px-2.5 py-1 rounded-lg transition-colors inline-flex items-center gap-1"
                                >
                                  <UserPlus className="w-3.5 h-3.5" />
                                  <span>Phân công / Sửa</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteClass(cls._id)}
                                  className="text-xs font-medium text-danger hover:bg-rose-50 px-2 py-1 rounded-lg transition-colors inline-flex items-center gap-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Xóa</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-neutral-200 w-full max-w-md rounded-xl shadow-xl p-6 relative">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-200">
              <h3 className="text-xl font-semibold text-neutral-900">
                {editingGrade ? `Chỉnh sửa Khối ${editingGrade.name}` : "Tạo Khối Học Mới"}
              </h3>
              <button onClick={() => setShowGradeModal(false)} className="text-neutral-400 hover:text-neutral-900 p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveGrade} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-900 mb-1">
                  Tên Khối học (Ví dụ: 10, 11, 12)<span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nhập tên khối (vd: 10)"
                  value={gradeNameInput}
                  onChange={(e) => setGradeNameInput(e.target.value)}
                  className="w-full bg-white border border-neutral-200 text-neutral-900 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowGradeModal(false)}
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

      {/* --- Modal: Class Create/Edit & Homeroom Teacher Assignment --- */}
      {showClassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-neutral-200 w-full max-w-lg rounded-xl shadow-xl p-6 relative">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-200">
              <h3 className="text-xl font-semibold text-neutral-900">
                {editingClass ? `Cấu hình & GVCN - Lớp ${editingClass.name}` : "Tạo Lớp Học Mới"}
              </h3>
              <button onClick={() => setShowClassModal(false)} className="text-neutral-400 hover:text-neutral-900 p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClass} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-900 mb-1">
                    Tên Lớp học<span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Vd: 10A1"
                    value={classForm.name}
                    onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                    className="w-full bg-white border border-neutral-200 text-neutral-900 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-900 mb-1">
                    Khối trực thuộc<span className="text-danger">*</span>
                  </label>
                  <select
                    required
                    value={classForm.gradeRef}
                    onChange={(e) => setClassForm({ ...classForm, gradeRef: e.target.value })}
                    className="w-full bg-white border border-neutral-200 text-neutral-900 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:border-primary"
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
                <label className="block text-xs font-semibold text-neutral-900 mb-1">
                  Năm học<span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="2025-2026"
                  value={classForm.schoolYear}
                  onChange={(e) => setClassForm({ ...classForm, schoolYear: e.target.value })}
                  className="w-full bg-white border border-neutral-200 text-neutral-900 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:border-primary"
                />
              </div>

              {/* --- Giao diện phân công Giáo viên Chủ nhiệm (Searchable Dropdown) --- */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-primary mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-primary shrink-0" />
                    <span>Phân công Giáo viên Chủ nhiệm (GVCN)</span>
                  </span>
                  {selectedTeacherObj && (
                    <span className="text-xs text-success font-medium flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 text-success shrink-0" />
                      <span>Đã chọn</span>
                    </span>
                  )}
                </label>

                <div className="relative">
                  <div
                    className="w-full bg-white border border-neutral-200 text-neutral-900 rounded-lg px-3.5 py-2 text-sm flex items-center justify-between cursor-pointer focus-within:border-primary"
                    onClick={() => setIsTeacherDropdownOpen(!isTeacherDropdownOpen)}
                  >
                    {selectedTeacherObj ? (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-purple-700">{selectedTeacherObj.name}</span>
                        <span className="text-xs text-neutral-600">({selectedTeacherObj.email})</span>
                      </div>
                    ) : (
                      <span className="text-neutral-600">Tìm & chọn Giáo viên Chủ nhiệm...</span>
                    )}
                    <ChevronDown className="w-4 h-4 text-neutral-500 ml-2 shrink-0" />
                  </div>

                  {/* Dropdown popup */}
                  {isTeacherDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-white border border-neutral-200 rounded-xl shadow-xl p-2 max-h-60 overflow-y-auto">
                      <input
                        type="text"
                        placeholder="Nhập tên, email hoặc mã giáo viên..."
                        value={teacherSearch}
                        onChange={(e) => setTeacherSearch(e.target.value)}
                        className="w-full bg-neutral-50 border border-neutral-200 text-neutral-900 rounded-lg px-3 py-1.5 text-xs mb-2 focus:outline-none focus:border-primary"
                        autoFocus
                      />

                      {filteredTeachers.length === 0 ? (
                        <div className="text-center py-4 text-xs text-neutral-600">
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
                              className={`p-2 rounded-lg text-xs cursor-pointer flex items-center justify-between transition-colors ${classForm.homeroomTeacherRef === t._id
                                  ? "bg-primary-light text-primary font-semibold"
                                  : "hover:bg-neutral-100 text-neutral-900"
                                }`}
                            >
                              <div>
                                <p className="font-medium text-neutral-900">{t.name}</p>
                                <p className="text-xs text-neutral-600">{t.email} {t.teacherCode ? `| MaGV: ${t.teacherCode}` : ""}</p>
                              </div>
                              {classForm.homeroomTeacherRef === t._id && (
                                <Check className="w-4 h-4 text-primary font-bold shrink-0" />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setShowClassModal(false)}
                  className="text-sm font-medium px-4 py-2 rounded-lg bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="text-sm font-medium px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-hover"
                >
                  {editingClass ? "Cập nhật Lớp" : "Tạo Lớp mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Standalone Assign Homeroom Modal */}
      <AssignHomeroomModal
        isOpen={Boolean(assignHomeroomClass)}
        classObj={assignHomeroomClass}
        onClose={() => setAssignHomeroomClass(null)}
        onSuccess={() => {
          fetchData();
          if (onRefreshData) onRefreshData();
        }}
      />
    </div>
  );
}
