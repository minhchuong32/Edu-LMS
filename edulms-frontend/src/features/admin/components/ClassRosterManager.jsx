import React, { useState, useEffect } from "react";
import academicService from "../../../services/academicService";

export default function ClassRosterManager({ selectedClassId, onRefreshData }) {
  // Master data
  const [classes, setClasses] = useState([]);
  const [currentClassId, setCurrentClassId] = useState(selectedClassId || "all");
  const [students, setStudents] = useState([]);
  const [unassignedStudents, setUnassignedStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Filters
  const [search, setSearch] = useState("");

  // Selection for batch actions
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  // Modals state
  // 1. Single & Batch Transfer Modal
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferTargetStudents, setTransferTargetStudents] = useState([]); // array of student objects
  const [targetClassId, setTargetClassId] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [submittingTransfer, setSubmittingTransfer] = useState(false);

  // 2. Add Student to Class Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addSearch, setAddSearch] = useState("");
  const [selectedUnassignedIds, setSelectedUnassignedIds] = useState([]);
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // 3. Remove Student Confirmation Modal
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [studentToRemove, setStudentToRemove] = useState(null);
  const [submittingRemove, setSubmittingRemove] = useState(false);

  // 4. Transfer History Modal/Drawer
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Load Classes list
  const loadClasses = async () => {
    try {
      const res = await academicService.getClasses();
      if (res.success) {
        setClasses(res.data || []);
      }
    } catch (err) {
      console.error("Lỗi tải danh sách lớp:", err);
    }
  };

  // Load Students according to current class filter & search
  const loadStudents = async () => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (currentClassId && currentClassId !== "all") {
        params.classRef = currentClassId;
      }

      const res = await academicService.getStudents(params);
      if (res.success) {
        setStudents(res.data || []);
      } else {
        setError(res.message || "Không thể tải danh sách học sinh.");
      }
    } catch (err) {
      setError(err.message || "Lỗi khi kết nối đến máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  // Load unassigned students for Add Modal
  const loadUnassignedStudents = async (queryStr = "") => {
    try {
      const params = { classRef: "unassigned" };
      if (queryStr) params.search = queryStr;
      const res = await academicService.getStudents(params);
      if (res.success) {
        setUnassignedStudents(res.data || []);
      }
    } catch (err) {
      console.error("Lỗi tải danh sách học sinh chưa xếp lớp:", err);
    }
  };

  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      setCurrentClassId(selectedClassId);
    }
  }, [selectedClassId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadStudents();
    }, 300);
    return () => clearTimeout(timer);
  }, [currentClassId, search]);

  const showNotification = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  // Checkbox helpers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedStudentIds(students.map((s) => s._id));
    } else {
      setSelectedStudentIds([]);
    }
  };

  const handleToggleSelectStudent = (id) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // --- Single Transfer Handler ---
  const handleOpenSingleTransfer = (student) => {
    setTransferTargetStudents([student]);
    setTargetClassId("");
    setTransferReason("");
    setShowTransferModal(true);
  };

  // --- Batch Transfer Handler ---
  const handleOpenBatchTransfer = () => {
    if (selectedStudentIds.length === 0) return;
    const targetStudents = students.filter((s) => selectedStudentIds.includes(s._id));
    setTransferTargetStudents(targetStudents);
    setTargetClassId("");
    setTransferReason("");
    setShowTransferModal(true);
  };

  // --- Submit Transfer ---
  const handleSubmitTransfer = async (e) => {
    e.preventDefault();
    if (!targetClassId) {
      setError("Vui lòng chọn lớp học mới cần chuyển tới.");
      return;
    }
    setSubmittingTransfer(true);
    setError("");

    try {
      if (transferTargetStudents.length === 1) {
        // Single transfer
        const student = transferTargetStudents[0];
        const res = await academicService.transferStudentClass({
          studentRef: student._id,
          toClassRef: targetClassId,
          reason: transferReason.trim(),
        });

        if (res.success) {
          showNotification(
            `Đã chuyển học sinh "${student.name}" sang lớp mới thành công.`
          );
          setShowTransferModal(false);
          setSelectedStudentIds([]);
          loadStudents();
          if (onRefreshData) onRefreshData();
        }
      } else {
        // Batch transfer
        const res = await academicService.batchTransferClass({
          studentRefs: transferTargetStudents.map((s) => s._id),
          toClassRef: targetClassId,
          reason: transferReason.trim(),
        });

        if (res.success) {
          showNotification(
            `Đã thực hiện chuyển ${res.data.successCount}/${res.data.total} học sinh thành công.`
          );
          setShowTransferModal(false);
          setSelectedStudentIds([]);
          loadStudents();
          if (onRefreshData) onRefreshData();
        }
      }
    } catch (err) {
      setError(err.message || "Không thể thực hiện chuyển lớp học sinh.");
    } finally {
      setSubmittingTransfer(false);
    }
  };

  // --- Add Student to Class Handler ---
  const handleOpenAddModal = () => {
    if (!currentClassId || currentClassId === "all" || currentClassId === "unassigned") {
      alert("Vui lòng chọn một lớp học cụ thể trước khi thêm học sinh!");
      return;
    }
    setSelectedUnassignedIds([]);
    setAddSearch("");
    loadUnassignedStudents("");
    setShowAddModal(true);
  };

  const handleSubmitAddStudents = async () => {
    if (selectedUnassignedIds.length === 0) return;
    setSubmittingAdd(true);
    setError("");

    try {
      let count = 0;
      for (const studentId of selectedUnassignedIds) {
        await academicService.updateUserClass(studentId, currentClassId);
        count++;
      }
      showNotification(`Đã thêm thành công ${count} học sinh vào lớp học.`);
      setShowAddModal(false);
      loadStudents();
      if (onRefreshData) onRefreshData();
    } catch (err) {
      setError(err.message || "Xảy ra lỗi khi xếp lớp học sinh.");
    } finally {
      setSubmittingAdd(false);
    }
  };

  // --- Remove Student from Class Handler ---
  const handleOpenRemoveModal = (student) => {
    setStudentToRemove(student);
    setShowRemoveModal(true);
  };

  const handleSubmitRemoveStudent = async () => {
    if (!studentToRemove) return;
    setSubmittingRemove(true);
    setError("");

    try {
      const res = await academicService.updateUserClass(studentToRemove._id, null);
      if (res.success) {
        showNotification(`Đã xóa học sinh "${studentToRemove.name}" khỏi lớp học.`);
        setShowRemoveModal(false);
        setStudentToRemove(null);
        loadStudents();
        if (onRefreshData) onRefreshData();
      }
    } catch (err) {
      setError(err.message || "Xảy ra lỗi khi xóa học sinh khỏi lớp.");
    } finally {
      setSubmittingRemove(false);
    }
  };

  // --- Open Transfer History Modal ---
  const handleOpenHistory = async () => {
    setShowHistoryModal(true);
    setLoadingHistory(true);
    try {
      const params = {};
      if (currentClassId && currentClassId !== "all" && currentClassId !== "unassigned") {
        params.toClassRef = currentClassId;
      }
      const res = await academicService.getTransferHistory(params);
      if (res.success) {
        setHistoryList(res.data || []);
      }
    } catch (err) {
      console.error("Lỗi lấy lịch sử chuyển lớp:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const currentClassObj = classes.find((c) => c._id === currentClassId);

  return (
    <div className="space-y-6">
      {/* Toast Notification Alert */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl shadow-sm flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm font-medium">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg("")} className="text-emerald-500 hover:text-emerald-700">
            &times;
          </button>
        </div>
      )}

      {/* Global Error Banner */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl shadow-sm flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium">{error}</span>
          </div>
          <button onClick={() => setError("")} className="text-rose-500 hover:text-rose-700">
            &times;
          </button>
        </div>
      )}

      {/* Roster Controls Header Card */}
      <div className="bg-white border border-neutral-200 p-5 md:p-6 rounded-xl shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Class Filter Dropdown */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-full sm:w-auto min-w-[240px]">
              <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-1.5">
                Chọn Lớp học:
              </label>
              <select
                value={currentClassId}
                onChange={(e) => {
                  setCurrentClassId(e.target.value);
                  setSelectedStudentIds([]);
                }}
                className="w-full bg-neutral-50 border border-neutral-300 text-neutral-900 text-sm rounded-xl focus:ring-2 focus:ring-primary focus:border-primary p-2.5 font-medium transition-all"
              >
                <option value="all">-- Tất cả học sinh toàn trường --</option>
                <option value="unassigned">⚠️ Học sinh chưa phân lớp (Chưa xếp lớp)</option>
                {classes.map((cls) => (
                  <option key={cls._id} value={cls._id}>
                    Lớp {cls.name} ({cls.gradeRef?.name ? `Khối ${cls.gradeRef.name}` : "Chưa có khối"} - {cls.schoolYear})
                  </option>
                ))}
              </select>
            </div>

            {/* Sĩ số Badge */}
            <div className="self-end pb-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-light text-primary font-bold text-sm border border-primary/20">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Sĩ số: {students.length} học sinh
              </span>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {currentClassId !== "all" && currentClassId !== "unassigned" && (
              <button
                onClick={handleOpenAddModal}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary-dark shadow-sm transition-all active:scale-[0.98]"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Thêm học sinh vào lớp
              </button>
            )}

            {selectedStudentIds.length > 0 && (
              <button
                onClick={handleOpenBatchTransfer}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-600 text-white font-semibold text-sm hover:bg-amber-700 shadow-sm transition-all active:scale-[0.98]"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                Chuyển lớp đã chọn ({selectedStudentIds.length})
              </button>
            )}

            <button
              onClick={handleOpenHistory}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-neutral-100 border border-neutral-300 text-neutral-700 font-semibold text-sm hover:bg-neutral-200 transition-all"
            >
              <svg className="w-4 h-4 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Lịch sử chuyển lớp
            </button>
          </div>
        </div>

        {/* Live Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm theo Tên học sinh, MSHS, Email..."
            className="w-full pl-10 pr-10 py-2.5 bg-neutral-50 border border-neutral-300 text-neutral-900 text-sm rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600"
            >
              &times;
            </button>
          )}
        </div>
      </div>

      {/* Roster Table Card */}
      <div className="bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-neutral-500">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent mb-3"></div>
            <p className="font-medium text-sm">Đang tải danh sách học sinh...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center text-neutral-500 space-y-3">
            <svg className="w-12 h-12 text-neutral-300 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="font-semibold text-neutral-700">Chưa có học sinh nào phù hợp</p>
            <p className="text-xs text-neutral-500 max-w-md mx-auto">
              Không tìm thấy học sinh trong danh sách hiện tại. Bạn có thể sử dụng chức năng "Thêm học sinh vào lớp" hoặc nhập danh sách học sinh từ file Excel.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold text-xs uppercase tracking-wider">
                  <th className="p-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedStudentIds.length === students.length && students.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-neutral-300 text-primary focus:ring-primary h-4 w-4"
                    />
                  </th>
                  <th className="p-3.5 w-12 text-center">STT</th>
                  <th className="p-3.5">Mã học sinh</th>
                  <th className="p-3.5">Họ và tên</th>
                  <th className="p-3.5">Email</th>
                  <th className="p-3.5">Lớp hiện tại</th>
                  <th className="p-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {students.map((student, idx) => {
                  const isSelected = selectedStudentIds.includes(student._id);
                  return (
                    <tr
                      key={student._id}
                      className={`hover:bg-neutral-50/80 transition-all ${
                        isSelected ? "bg-primary-light/30" : ""
                      }`}
                    >
                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectStudent(student._id)}
                          className="rounded border-neutral-300 text-primary focus:ring-primary h-4 w-4"
                        />
                      </td>
                      <td className="p-3.5 text-center font-medium text-neutral-500">{idx + 1}</td>
                      <td className="p-3.5 font-mono font-bold text-neutral-800">
                        {student.studentCode || <span className="text-neutral-400 italic">Chưa có mã</span>}
                      </td>
                      <td className="p-3.5 font-semibold text-neutral-900">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary-light text-primary flex items-center justify-center font-bold text-xs">
                            {student.name ? student.name.charAt(0).toUpperCase() : "U"}
                          </div>
                          <span>{student.name}</span>
                        </div>
                      </td>
                      <td className="p-3.5 text-neutral-600">{student.email}</td>
                      <td className="p-3.5">
                        {student.classRef ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {student.classRef.name || "Đã phân lớp"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            Chưa xếp lớp
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-right space-x-2">
                        <button
                          onClick={() => handleOpenSingleTransfer(student)}
                          title="Chuyển sang lớp học khác"
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-all inline-flex items-center gap-1"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                          Chuyển lớp
                        </button>

                        {student.classRef && (
                          <button
                            onClick={() => handleOpenRemoveModal(student)}
                            title="Xóa học sinh khỏi lớp này"
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-all inline-flex items-center gap-1"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Xóa khỏi lớp
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ------------------- MODAL 1: MODAL XÁC NHẬN CHUYỂN LỚP ------------------- */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 space-y-5 transform transition-all">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-neutral-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-neutral-900">Xác Nhận Chuyển Lớp Học Sinh</h3>
                  <p className="text-xs text-neutral-500">
                    {transferTargetStudents.length === 1
                      ? "Chuyển 1 học sinh sang lớp mới"
                      : `Chuyển ${transferTargetStudents.length} học sinh đã chọn sang lớp mới`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTransferModal(false)}
                className="text-neutral-400 hover:text-neutral-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            {/* Target Students Summary Card */}
            <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3.5 space-y-2 max-h-40 overflow-y-auto">
              <span className="text-xs font-semibold text-neutral-600 uppercase tracking-wider block">
                Danh sách học sinh chuyển lớp:
              </span>
              {transferTargetStudents.map((s) => (
                <div key={s._id} className="flex items-center justify-between text-xs py-1 border-b border-neutral-200 last:border-0">
                  <span className="font-semibold text-neutral-800">{s.name} ({s.studentCode || s.email})</span>
                  <span className="text-neutral-500">Lớp cũ: {s.classRef?.name || "Chưa xếp lớp"}</span>
                </div>
              ))}
            </div>

            {/* Form Fields */}
            <form onSubmit={handleSubmitTransfer} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Chọn Lớp học mới chuyển tới (*):
                </label>
                <select
                  required
                  value={targetClassId}
                  onChange={(e) => setTargetClassId(e.target.value)}
                  className="w-full bg-white border border-neutral-300 text-neutral-900 text-sm rounded-xl focus:ring-2 focus:ring-primary focus:border-primary p-2.5 font-medium"
                >
                  <option value="">-- Chọn lớp học đích --</option>
                  {classes.map((c) => (
                    <option key={c._id} value={c._id}>
                      Lớp {c.name} ({c.gradeRef?.name ? `Khối ${c.gradeRef.name}` : ""} - {c.schoolYear})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Lý do chuyển lớp (Không bắt buộc):
                </label>
                <textarea
                  rows={3}
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  placeholder="Ví dụ: Chuyển lớp theo nguyện vọng của gia đình, Phân bổ lại sĩ số..."
                  className="w-full bg-white border border-neutral-300 text-neutral-900 text-sm rounded-xl focus:ring-2 focus:ring-primary focus:border-primary p-2.5"
                ></textarea>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2.5 text-sm font-semibold rounded-xl bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-all"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submittingTransfer}
                  className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-amber-600 text-white hover:bg-amber-700 shadow-sm transition-all inline-flex items-center gap-2 disabled:opacity-50"
                >
                  {submittingTransfer && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  )}
                  Xác nhận chuyển lớp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------- MODAL 2: MODAL THÊM HỌC SINH VÀO LỚP ------------------- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-neutral-200 space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
              <div>
                <h3 className="text-lg font-bold text-neutral-900">
                  Thêm Học Sinh Vào Lớp: {currentClassObj?.name || ""}
                </h3>
                <p className="text-xs text-neutral-500">
                  Chọn các học sinh chưa có lớp để xếp vào lớp hiện tại.
                </p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-neutral-400 hover:text-neutral-600 text-xl font-bold">
                &times;
              </button>
            </div>

            {/* Quick Search */}
            <input
              type="text"
              value={addSearch}
              onChange={(e) => {
                setAddSearch(e.target.value);
                loadUnassignedStudents(e.target.value);
              }}
              placeholder="Tìm kiếm học sinh chưa xếp lớp..."
              className="w-full px-3.5 py-2 bg-neutral-50 border border-neutral-300 text-sm rounded-xl"
            />

            {/* Unassigned Students List */}
            <div className="max-h-60 overflow-y-auto border border-neutral-200 rounded-xl divide-y divide-neutral-200">
              {unassignedStudents.length === 0 ? (
                <div className="p-6 text-center text-xs text-neutral-500">
                  Không tìm thấy học sinh chưa có lớp nào.
                </div>
              ) : (
                unassignedStudents.map((s) => {
                  const checked = selectedUnassignedIds.includes(s._id);
                  return (
                    <label
                      key={s._id}
                      className={`flex items-center justify-between p-3 cursor-pointer hover:bg-neutral-50 ${
                        checked ? "bg-primary-light/40" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setSelectedUnassignedIds((prev) =>
                              prev.includes(s._id) ? prev.filter((i) => i !== s._id) : [...prev, s._id]
                            );
                          }}
                          className="rounded border-neutral-300 text-primary focus:ring-primary h-4 w-4"
                        />
                        <div>
                          <p className="text-sm font-semibold text-neutral-800">{s.name}</p>
                          <p className="text-xs text-neutral-500">{s.studentCode || s.email}</p>
                        </div>
                      </div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700">
                        Chưa xếp lớp
                      </span>
                    </label>
                  );
                })
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-200">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2.5 text-sm font-semibold rounded-xl bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={selectedUnassignedIds.length === 0 || submittingAdd}
                onClick={handleSubmitAddStudents}
                className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-primary-dark shadow-sm disabled:opacity-50 inline-flex items-center gap-2"
              >
                {submittingAdd && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                Thêm vào lớp ({selectedUnassignedIds.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------- MODAL 3: MODAL XÓA HỌC SINH KHỎI LỚP ------------------- */}
      {showRemoveModal && studentToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-neutral-900">Xác Nhận Xóa Khỏi Lớp</h3>
                <p className="text-xs text-neutral-500">Học sinh sẽ chuyển về trạng thái Chưa xếp lớp.</p>
              </div>
            </div>

            <p className="text-sm text-neutral-700">
              Bạn có chắc chắn muốn xóa học sinh <strong className="text-neutral-900">{studentToRemove.name}</strong> ({studentToRemove.studentCode || studentToRemove.email}) khỏi lớp học hiện tại?
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-200">
              <button
                type="button"
                onClick={() => setShowRemoveModal(false)}
                className="px-4 py-2.5 text-sm font-semibold rounded-xl bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={submittingRemove}
                onClick={handleSubmitRemoveStudent}
                className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-rose-600 text-white hover:bg-rose-700 shadow-sm disabled:opacity-50 inline-flex items-center gap-2"
              >
                {submittingRemove && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------- MODAL 4: DRAWER LỊCH SỬ CHUYỂN LỚP ------------------- */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-neutral-200 space-y-5 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-neutral-900">Lịch Sử Chuyển Lớp Học Sinh</h3>
                  <p className="text-xs text-neutral-500">Nhật ký chi tiết các giao dịch chuyển lớp đã thực hiện</p>
                </div>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="text-neutral-400 hover:text-neutral-600 text-xl font-bold">
                &times;
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingHistory ? (
                <div className="p-8 text-center text-neutral-500 text-sm">Đang tải lịch sử...</div>
              ) : historyList.length === 0 ? (
                <div className="p-8 text-center text-neutral-500 text-sm">Chưa có nhật ký chuyển lớp nào.</div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-200 font-bold uppercase text-neutral-600">
                      <th className="p-3">Thời gian</th>
                      <th className="p-3">Học sinh</th>
                      <th className="p-3">Lớp cũ</th>
                      <th className="p-3">Lớp mới</th>
                      <th className="p-3">Người thực hiện</th>
                      <th className="p-3">Lý do</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {historyList.map((item) => (
                      <tr key={item._id} className="hover:bg-neutral-50">
                        <td className="p-3 font-mono text-neutral-500">
                          {new Date(item.transferredAt || item.createdAt).toLocaleString("vi-VN")}
                        </td>
                        <td className="p-3 font-semibold text-neutral-900">
                          {item.studentRef?.name} ({item.studentRef?.studentCode || item.studentRef?.email})
                        </td>
                        <td className="p-3 text-neutral-600">
                          {item.fromClassRef?.name ? `Lớp ${item.fromClassRef.name}` : "Chưa có lớp"}
                        </td>
                        <td className="p-3 font-bold text-emerald-700">
                          {item.toClassRef?.name ? `Lớp ${item.toClassRef.name}` : "-"}
                        </td>
                        <td className="p-3 text-neutral-600">{item.transferredBy?.name || "Admin"}</td>
                        <td className="p-3 italic text-neutral-500">{item.reason || "Không có"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-neutral-200">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 text-sm font-semibold rounded-xl bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
