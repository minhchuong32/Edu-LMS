import React, { useState, useEffect } from "react";
import { UserCheck, Search, X, Check, AlertCircle, ShieldCheck, UserX } from "lucide-react";
import academicService from "../../../services/academicService";
import Button from "../../../components/common/Button";

export default function AssignHomeroomModal({ isOpen, classObj, onClose, onSuccess }) {
  const [teachers, setTeachers] = useState([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [teacherSearch, setTeacherSearch] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (isOpen && classObj) {
      setErrorMsg("");
      setSuccessMsg("");
      setTeacherSearch("");
      const currentTeacherId = classObj.homeroomTeacherRef?._id || classObj.homeroomTeacherRef || "";
      setSelectedTeacherId(currentTeacherId);
      loadTeachers();
    }
  }, [isOpen, classObj]);

  const loadTeachers = async () => {
    setLoadingTeachers(true);
    try {
      const res = await academicService.getTeachers();
      const list = res?.data || res || [];
      setTeachers(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Lỗi lấy danh sách giáo viên:", err);
      setTeachers([]);
    } finally {
      setLoadingTeachers(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!classObj?._id) return;
    setErrorMsg("");
    setSuccessMsg("");
    setSubmitting(true);

    try {
      const payload = {
        homeroomTeacherRef: selectedTeacherId || null,
      };

      const res = await academicService.updateClass(classObj._id, payload);
      if (res.success || res.data) {
        setSuccessMsg(
          selectedTeacherId
            ? "Phân công Giáo viên Chủ nhiệm thành công!"
            : "Đã gỡ Giáo viên Chủ nhiệm khỏi lớp học thành công!"
        );
        if (onSuccess) onSuccess();
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setErrorMsg(res.message || "Không thể phân công giáo viên chủ nhiệm.");
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Lỗi khi cập nhật giáo viên chủ nhiệm.";
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !classObj) return null;

  const currentTeacherObj = teachers.find(
    (t) => t._id === (classObj.homeroomTeacherRef?._id || classObj.homeroomTeacherRef)
  );

  const filteredTeachers = teachers.filter((t) => {
    const query = teacherSearch.toLowerCase().trim();
    if (!query) return true;
    return (
      t.name?.toLowerCase().includes(query) ||
      t.email?.toLowerCase().includes(query) ||
      t.teacherCode?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-neutral-200 animate-fadeIn max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-neutral-900 text-base">Phân Công Giáo Viên Chủ Nhiệm</h3>
              <p className="text-xs text-neutral-500">
                Lớp: <strong className="text-neutral-900">Lớp {classObj.name}</strong>
                {classObj.schoolYear && <span className="ml-1 font-semibold text-primary">(Năm học {classObj.schoolYear})</span>}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-xl flex items-center gap-2">
            <Check className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Current Homeroom Info Banner */}
        <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase tracking-wider font-bold text-neutral-500 block">
              GVCN Hiện tại
            </span>
            {currentTeacherObj ? (
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-bold text-purple-800 text-sm">{currentTeacherObj.name}</span>
                {currentTeacherObj.teacherCode && (
                  <span className="text-xs font-mono bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                    {currentTeacherObj.teacherCode}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-xs text-amber-700 font-semibold italic mt-0.5 block">
                Chưa phân công giáo viên chủ nhiệm
              </span>
            )}
          </div>

          {selectedTeacherId && (
            <button
              type="button"
              onClick={() => setSelectedTeacherId("")}
              className="text-xs text-rose-600 font-semibold hover:underline bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 flex items-center gap-1"
              title="Hủy gán GVCN hiện tại"
            >
              <UserX className="w-3.5 h-3.5" />
              <span>Gỡ GVCN</span>
            </button>
          )}
        </div>

        {/* Form Search & Select Teacher */}
        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          <label className="block text-xs font-bold text-neutral-700">
            Tìm & chọn Giáo viên làm Chủ nhiệm (GVCN)
          </label>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
            <input
              type="text"
              placeholder="Nhập tên giáo viên, email hoặc MSGV..."
              value={teacherSearch}
              onChange={(e) => setTeacherSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:ring-1 focus:ring-primary focus:border-primary transition"
            />
          </div>

          {/* Teacher Radio List */}
          <div className="max-h-56 overflow-y-auto border border-neutral-200 rounded-xl p-2 bg-white space-y-1">
            {loadingTeachers ? (
              <div className="text-center text-neutral-400 py-4 text-xs italic">Đang tải danh sách giáo viên...</div>
            ) : filteredTeachers.length === 0 ? (
              <div className="text-center text-neutral-400 py-4 text-xs italic">
                {teacherSearch.trim() ? "Không tìm thấy giáo viên phù hợp" : "Không có giáo viên nào trong hệ thống"}
              </div>
            ) : (
              filteredTeachers.map((t) => {
                const isSelected = selectedTeacherId === t._id;
                return (
                  <label
                    key={t._id}
                    className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer border transition ${
                      isSelected
                        ? "bg-purple-50 border-purple-400 font-bold"
                        : "bg-white border-neutral-200 hover:bg-neutral-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="homeroomTeacherSelect"
                        value={t._id}
                        checked={isSelected}
                        onChange={() => setSelectedTeacherId(t._id)}
                        className="accent-purple-600"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-neutral-900">{t.name}</span>
                          {t.teacherCode && (
                            <span className="text-[10px] bg-neutral-100 text-neutral-600 font-mono px-1.5 py-0.5 rounded border border-neutral-200">
                              {t.teacherCode}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-neutral-500 font-mono block">{t.email}</span>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="text-xs text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>Đã chọn</span>
                      </span>
                    )}
                  </label>
                );
              })
            )}
          </div>

          {/* Form Action Footer */}
          <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200">
            <Button type="button" variant="outline" className="py-1.5 px-4 text-xs" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" variant="primary" className="py-1.5 px-4 text-xs" disabled={submitting}>
              {submitting ? "Đang cập nhật..." : "Lưu Phân Công GVCN"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
