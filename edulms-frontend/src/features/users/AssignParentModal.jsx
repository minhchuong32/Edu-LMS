import React, { useState, useEffect } from "react";
import { Users, UserPlus, Search, X, Check, Trash2, AlertCircle } from "lucide-react";
import studentService from "../../services/studentService";
import userService from "../../services/userService";
import Button from "../../components/common/Button";

export default function AssignParentModal({ isOpen, student, onClose, onSuccess }) {
  const [parents, setParents] = useState([]);
  const [loadingParents, setLoadingParents] = useState(false);

  // Search & Link parent state
  const [parentSearch, setParentSearch] = useState("");
  const [parentSearchResults, setParentSearchResults] = useState([]);
  const [searchingParents, setSearchingParents] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState("");
  const [selectedRelationship, setSelectedRelationship] = useState("father");
  const [linkingParent, setLinkingParent] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Unlink parent confirmation state
  const [parentToUnlink, setParentToUnlink] = useState(null);
  const [unlinkingParent, setUnlinkingParent] = useState(false);

  useEffect(() => {
    if (isOpen && student?._id) {
      fetchParents();
      handleSearchParents("");
      setErrorMsg("");
      setSuccessMsg("");
      setSelectedParentId("");
    }
  }, [isOpen, student?._id]);

  const fetchParents = async () => {
    if (!student?._id) return;
    setLoadingParents(true);
    try {
      const res = await studentService.getStudentParents(student._id);
      const list = res?.data || res || [];
      setParents(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Lỗi lấy danh sách phụ huynh:", err);
      setParents([]);
    } finally {
      setLoadingParents(false);
    }
  };

  const handleSearchParents = async (query) => {
    setParentSearch(query);
    setSearchingParents(true);
    try {
      const res = await userService.getUsers({ role: "parent", search: query.trim() });
      const list = res?.data || res || [];
      setParentSearchResults(Array.isArray(list) ? list : []);
    } catch {
      setParentSearchResults([]);
    } finally {
      setSearchingParents(false);
    }
  };

  const handleLinkParentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedParentId) {
      setErrorMsg("Vui lòng chọn một phụ huynh từ danh sách tìm kiếm.");
      return;
    }
    setErrorMsg("");
    setSuccessMsg("");
    setLinkingParent(true);

    try {
      await studentService.addParent(student._id, {
        parentId: selectedParentId,
        relationship: selectedRelationship,
      });
      setSuccessMsg("Đã gán phụ huynh thành công!");
      setSelectedParentId("");
      setParentSearch("");
      await fetchParents();
      if (onSuccess) onSuccess();
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Không thể gán phụ huynh.";
      setErrorMsg(msg);
    } finally {
      setLinkingParent(false);
    }
  };

  const handleUnlinkParent = async () => {
    if (!parentToUnlink || !student?._id) return;
    setUnlinkingParent(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      await studentService.removeParent(student._id, parentToUnlink._id);
      setSuccessMsg(`Đã gỡ liên kết phụ huynh "${parentToUnlink.name}" thành công!`);
      setParentToUnlink(null);
      await fetchParents();
      if (onSuccess) onSuccess();
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Không thể gỡ liên kết phụ huynh.";
      setErrorMsg(msg);
    } finally {
      setUnlinkingParent(false);
    }
  };

  if (!isOpen || !student) return null;

  const relationshipLabels = {
    father: "Cha (Father)",
    mother: "Mẹ (Mother)",
    guardian: "Người giám hộ (Guardian)",
    other: "Khác (Other)",
  };

  return (
    <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 border border-neutral-200 animate-fadeIn max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-neutral-900 text-base">Gán & Quản Lý Phụ Huynh</h3>
              <p className="text-xs text-neutral-500">
                Học sinh: <strong className="text-neutral-800">{student.name}</strong>
                {student.studentCode && <span className="font-mono ml-1">({student.studentCode})</span>}
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

        {/* Section 1: Phụ Huynh Đã Liên Kết */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
            Danh sách phụ huynh đã gán ({parents.length})
          </h4>

          {loadingParents ? (
            <div className="p-4 text-center text-xs text-neutral-400 italic">Đang tải thông tin phụ huynh...</div>
          ) : parents.length === 0 ? (
            <div className="p-4 border border-dashed border-neutral-200 rounded-xl text-center text-xs text-neutral-400">
              Chưa có phụ huynh nào được gán cho học sinh này.
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {parents.map((p) => (
                <div
                  key={p._id}
                  className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl flex items-center justify-between shadow-sm"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-neutral-900 text-xs">{p.name}</span>
                      {p.relationship && (
                        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-md font-semibold">
                          {relationshipLabels[p.relationship] || p.relationship}
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-neutral-500 text-[11px] block">{p.email}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setParentToUnlink(p)}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-3 py-1 rounded-lg transition flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Gỡ</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Gán Phụ Huynh Mới */}
        <form onSubmit={handleLinkParentSubmit} className="space-y-3 border-t border-neutral-200 pt-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
            <UserPlus className="w-4 h-4 text-primary" />
            <span>Gán phụ huynh mới</span>
          </h4>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
            <input
              type="text"
              placeholder="Tìm phụ huynh theo Họ tên hoặc Email..."
              value={parentSearch}
              onChange={(e) => handleSearchParents(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:ring-1 focus:ring-primary focus:border-primary transition"
            />
          </div>

          {/* Search Results */}
          <div className="max-h-40 overflow-y-auto border border-neutral-200 rounded-xl p-2 bg-neutral-50/50 space-y-1">
            {searchingParents ? (
              <div className="text-center text-neutral-400 py-3 text-xs italic">Đang tìm kiếm...</div>
            ) : parentSearchResults.length === 0 ? (
              <div className="text-center text-neutral-400 py-3 text-xs italic">
                {parentSearch.trim() ? "Không tìm thấy tài khoản phụ huynh phù hợp" : "Nhập tên hoặc email để tìm phụ huynh"}
              </div>
            ) : (
              parentSearchResults.map((p) => {
                const isAlreadyLinked = parents.some((lp) => lp._id === p._id);
                return (
                  <label
                    key={p._id}
                    className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer border transition ${
                      selectedParentId === p._id
                        ? "bg-primary/10 border-primary font-bold"
                        : isAlreadyLinked
                        ? "bg-neutral-100 border-neutral-200 opacity-50 cursor-not-allowed"
                        : "bg-white border-neutral-200 hover:bg-neutral-100"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="selectedParentOption"
                        value={p._id}
                        disabled={isAlreadyLinked}
                        checked={selectedParentId === p._id}
                        onChange={() => setSelectedParentId(p._id)}
                        className="accent-primary"
                      />
                      <div>
                        <span className="block text-neutral-900 text-xs font-semibold">{p.name}</span>
                        <span className="text-[11px] text-neutral-500 font-mono">{p.email}</span>
                      </div>
                    </div>
                    {isAlreadyLinked && (
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold">
                        Đã gán
                      </span>
                    )}
                  </label>
                );
              })
            )}
          </div>

          {/* Relationship Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                Mối quan hệ với học sinh
              </label>
              <select
                value={selectedRelationship}
                onChange={(e) => setSelectedRelationship(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-neutral-200 rounded-xl outline-none focus:border-primary transition font-semibold text-neutral-800"
              >
                <option value="father">Cha (Father)</option>
                <option value="mother">Mẹ (Mother)</option>
                <option value="guardian">Người giám hộ (Guardian)</option>
                <option value="other">Khác (Other)</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button
                type="submit"
                variant="primary"
                disabled={linkingParent || !selectedParentId}
                className="w-full py-2 text-xs shadow-sm flex items-center justify-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                <span>{linkingParent ? "Đang liên kết..." : "Xác Nhận Gán"}</span>
              </Button>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-neutral-200">
          <Button variant="outline" className="py-1.5 px-4 text-xs" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>

      {/* Unlink Parent Confirmation Sub-Modal */}
      {parentToUnlink && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 border border-neutral-200 text-center animate-fadeIn">
            <h3 className="font-bold text-neutral-900 text-base">Xác Nhận Gỡ Phụ Huynh</h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Bạn có chắc chắn muốn gỡ liên kết giữa phụ huynh <strong className="text-neutral-900">{parentToUnlink.name}</strong> và học sinh <strong className="text-neutral-900">{student.name}</strong>?
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="py-1.5 px-4 text-xs"
                onClick={() => setParentToUnlink(null)}
              >
                Hủy
              </Button>
              <Button
                type="button"
                variant="danger"
                className="py-1.5 px-4 text-xs"
                onClick={handleUnlinkParent}
                disabled={unlinkingParent}
              >
                {unlinkingParent ? "Đang gỡ..." : "Xác Nhận Gỡ"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
