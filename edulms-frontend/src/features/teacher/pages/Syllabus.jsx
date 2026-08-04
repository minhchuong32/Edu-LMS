import React, { useState, useEffect } from "react";
import lessonContentService from "../../../services/lessonContentService";
import academicService from "../../../services/academicService";
import Button from "../../../components/common/Button";
import Input from "../../../components/common/Input";

const CONTENT_TYPES = [
  { value: "document", label: "Tài liệu (PDF/Doc)", icon: "📄", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "video", label: "Video bài giảng", icon: "🎥", color: "bg-purple-50 text-purple-700 border-purple-200" },
  { value: "link", label: "Đường dẫn (Link)", icon: "🔗", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "exercise", label: "Bài tập / Câu hỏi", icon: "📝", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "other", label: "Khác", icon: "📎", color: "bg-neutral-100 text-neutral-700 border-neutral-200" },
];

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";

const getFileViewUrl = (url) => {
  if (!url) return "#";
  if (url.startsWith("http")) {
    return `${API_BASE_URL}/upload/file?url=${encodeURIComponent(url)}&mode=view`;
  }
  return url;
};

const getFileDownloadUrl = (url) => {
  if (!url) return "#";
  if (url.startsWith("http")) {
    return `${API_BASE_URL}/upload/file?url=${encodeURIComponent(url)}&mode=download`;
  }
  return url;
};

export default function Syllabus() {
  // State for teaching assignments & filter
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  
  // State for lesson contents list
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  
  // Drag & drop state
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [isReordering, setIsReordering] = useState(false);

  // Form modal state
  const [showModal, setShowModal] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [formData, setFormData] = useState({
    teachingAssignmentRef: "",
    title: "",
    description: "",
    contentType: "document",
    attachmentUrl: "",
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Upload progress bar state
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [isDragOverDropzone, setIsDragOverDropzone] = useState(false);

  // Toast / notification state
  const [toast, setToast] = useState(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState(null);

  // File preview modal state
  const [previewTarget, setPreviewTarget] = useState(null);

  useEffect(() => {
    fetchAssignments();
  }, []);

  useEffect(() => {
    if (selectedAssignmentId) {
      fetchLessons(selectedAssignmentId);
    } else if (assignments.length > 0) {
      setSelectedAssignmentId(assignments[0]._id);
    }
  }, [selectedAssignmentId, assignments]);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchAssignments = async () => {
    try {
      const res = await academicService.getTeachingAssignments();
      const list = res?.data || res || [];
      setAssignments(list);
      if (list.length > 0) {
        setSelectedAssignmentId(list[0]._id);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error("Lỗi tải danh sách phân công:", err);
      setLoading(false);
    }
  };

  const fetchLessons = async (assignmentId) => {
    setLoading(true);
    try {
      const res = await lessonContentService.getLessonContents({ teachingAssignmentRef: assignmentId });
      const data = res?.data || res || [];
      // Sort by order ascending
      const sorted = [...data].sort((a, b) => (a.order || 0) - (b.order || 0));
      setLessons(sorted);
    } catch (err) {
      console.error("Lỗi tải nội dung bài học:", err);
      showToast("Không thể tải danh sách bài giảng", "error");
    } finally {
      setLoading(false);
    }
  };

  // --- SUBTASK 1: DRAG & DROP REORDERING ---
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    // standard transparent drag image
    e.dataTransfer.setData("text/plain", index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = async (e, dropIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const updated = [...lessons];
    const [draggedItem] = updated.splice(draggedIndex, 1);
    updated.splice(dropIndex, 0, draggedItem);

    // Re-assign order indices sequentially
    const reordered = updated.map((item, idx) => ({
      ...item,
      order: idx + 1,
    }));

    setLessons(reordered);
    setDraggedIndex(null);
    setDragOverIndex(null);

    // Save persistent order to backend
    await saveReorderedItems(reordered);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Fallback Move Up/Down accessibility functions
  const handleMoveItem = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= lessons.length) return;

    const updated = [...lessons];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    const reordered = updated.map((item, idx) => ({
      ...item,
      order: idx + 1,
    }));

    setLessons(reordered);
    await saveReorderedItems(reordered);
  };

  const saveReorderedItems = async (reorderedList) => {
    setIsReordering(true);
    try {
      const payload = reorderedList.map((item, idx) => ({
        id: item._id,
        order: idx + 1,
      }));
      await lessonContentService.reorderLessonContents(payload);
      showToast("Đã cập nhật thứ tự bài giảng thành công!", "success");
    } catch (err) {
      console.error("Lỗi cập nhật thứ tự:", err);
      showToast("Lỗi khi lưu thứ tự bài giảng", "error");
      fetchLessons(selectedAssignmentId); // rollback
    } finally {
      setIsReordering(false);
    }
  };

  // --- SUBTASK 2: FORM THÊM / SỬA BÀI GIẢNG ---
  const handleOpenAddModal = () => {
    setEditingLesson(null);
    setFormData({
      teachingAssignmentRef: selectedAssignmentId || (assignments[0]?._id || ""),
      title: "",
      description: "",
      contentType: "document",
      attachmentUrl: "",
    });
    setFormErrors({});
    setUploadFile(null);
    setUploadProgress(0);
    setUploadStatus("");
    setShowModal(true);
  };

  const handleOpenEditModal = (lesson) => {
    setEditingLesson(lesson);
    setFormData({
      teachingAssignmentRef: lesson.teachingAssignmentRef?._id || lesson.teachingAssignmentRef || selectedAssignmentId,
      title: lesson.title || "",
      description: lesson.description || "",
      contentType: lesson.contentType || "document",
      attachmentUrl: lesson.attachmentUrl || "",
    });
    setFormErrors({});
    setUploadFile(null);
    setUploadProgress(0);
    setUploadStatus("");
    setShowModal(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.title.trim()) {
      errors.title = "Tiêu đề bài giảng là bắt buộc.";
    }
    if (!formData.teachingAssignmentRef) {
      errors.teachingAssignmentRef = "Vui lòng chọn lớp học và môn giảng dạy.";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      if (editingLesson) {
        await lessonContentService.updateLessonContent(editingLesson._id, {
          title: formData.title,
          description: formData.description,
          contentType: formData.contentType,
          attachmentUrl: formData.attachmentUrl,
        });
        showToast("Cập nhật bài giảng thành công!", "success");
      } else {
        await lessonContentService.createLessonContent({
          teachingAssignmentRef: formData.teachingAssignmentRef,
          title: formData.title,
          description: formData.description,
          contentType: formData.contentType,
          attachmentUrl: formData.attachmentUrl,
          order: lessons.length + 1,
        });
        showToast("Tạo bài giảng mới thành công!", "success");
      }
      setShowModal(false);
      fetchLessons(selectedAssignmentId);
    } catch (err) {
      console.error("Lỗi lưu bài giảng:", err);
      showToast(err?.message || "Không thể lưu thông tin bài giảng", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // --- SUBTASK 3: UPLOAD PROGRESS BAR ---
  const handleSelectFile = (file) => {
    if (!file) return;
    setUploadFile(file);
    setUploadProgress(0);
    setUploadStatus("Sẵn sàng tải lên");
  };

  const handleStartUpload = async () => {
    if (!uploadFile) return;

    setUploading(true);
    setUploadProgress(0);
    setUploadStatus("Đang khởi tạo kết nối...");

    try {
      const res = await lessonContentService.uploadMedia(uploadFile, (percent, loaded, total) => {
        setUploadProgress(percent);
        const loadedMB = (loaded / (1024 * 1024)).toFixed(1);
        const totalMB = (total / (1024 * 1024)).toFixed(1);
        if (percent < 100) {
          setUploadStatus(`Đang tải lên: ${percent}% (${loadedMB} MB / ${totalMB} MB)`);
        } else {
          setUploadStatus("Đang xử lý tập tin trên máy chủ Cloudinary...");
        }
      });

      const fileUrl = res?.data?.url || res?.url || "";
      if (fileUrl) {
        setFormData((prev) => ({ ...prev, attachmentUrl: fileUrl }));
        setUploadStatus("✓ Tải lên hoàn tất thành công!");
        showToast("Tải tệp thành công! Đã tự động điền URL.", "success");
      }
    } catch (err) {
      console.error("Lỗi tải tệp:", err);
      setUploadStatus("❌ Tải tệp thất bại. Vui lòng thử lại.");
      showToast(err?.message || "Tải tệp thất bại", "error");
    } finally {
      setUploading(false);
    }
  };

  // --- DELETE LESSON ---
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await lessonContentService.deleteLessonContent(deleteTarget._id);
      showToast("Đã xóa bài giảng thành công!", "success");
      setDeleteTarget(null);
      fetchLessons(selectedAssignmentId);
    } catch (err) {
      console.error("Lỗi xóa bài giảng:", err);
      showToast("Không thể xóa bài giảng này", "error");
    }
  };

  const handleDownloadFile = (e, url, title) => {
    e.preventDefault();
    e.stopPropagation();
    if (!url) return;

    showToast("Đang mở tải tệp...", "success");

    const cleanUrl = url.split("?")[0];
    const parts = cleanUrl.split("/");
    const filename = parts[parts.length - 1] || `${title || "tai_lieu"}`;

    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Filtered lessons search/type
  const filteredLessons = lessons.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = filterType === "all" || item.contentType === filterType;
    return matchesSearch && matchesType;
  });

  const activeAssignment = assignments.find((a) => a._id === selectedAssignmentId);

  return (
    <div className="space-y-6 pb-12">
      {/* TOAST NOTIFICATION BANNER */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold border transition-all animate-bounce ${
          toast.type === "error" ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"
        }`}>
          <span>{toast.type === "error" ? "⚠️" : "✨"}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-primary/10 text-primary font-bold text-xs px-2.5 py-0.5 rounded-full">
              Quản lý Giáo trình & Bài giảng
            </span>
            {isReordering && (
              <span className="bg-amber-100 text-amber-700 font-medium text-xs px-2.5 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                <span>🔄</span> Đang đồng bộ vị trí...
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold font-outfit text-neutral-900">
            Danh sách bài giảng
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Tạo bài học, tải lên tài liệu/video bài giảng kèm progress bar và kéo-thả để sắp xếp thứ tự hiển thị.
          </p>
        </div>

        <Button variant="primary" className="py-2.5 px-5" onClick={handleOpenAddModal}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Thêm bài giảng mới
        </Button>
      </div>

      {/* FILTER & ASSIGNMENT SELECTOR BAR */}
      <div className="bg-white rounded-xl p-4 border border-neutral-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Assignment selector dropdown */}
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <span className="text-xs font-bold text-neutral-700 whitespace-nowrap">
            Lớp & Môn học:
          </span>
          <select
            value={selectedAssignmentId}
            onChange={(e) => setSelectedAssignmentId(e.target.value)}
            className="w-full bg-neutral-50 border border-neutral-200 text-neutral-900 text-sm font-semibold rounded-lg px-3.5 py-2 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
          >
            {assignments.length === 0 ? (
              <option value="">Không có phân công giảng dạy</option>
            ) : (
              assignments.map((asg) => (
                <option key={asg._id} value={asg._id}>
                  {asg.classRef?.name || "Lớp?"} — {asg.subjectRef?.name || "Môn?"} ({asg.classRef?.schoolYear || "Năm học"})
                </option>
              ))
            )}
          </select>
        </div>

        {/* Search input and type filter */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px]">
            <input
              type="text"
              placeholder="Tìm kiếm bài giảng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-lg outline-none focus:border-primary transition"
            />
            <svg className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-neutral-50 border border-neutral-200 text-neutral-700 text-xs font-semibold rounded-lg px-3 py-2 outline-none focus:border-primary transition"
          >
            <option value="all">Tất cả loại bài</option>
            {CONTENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.icon} {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* LESSONS SORTABLE LIST CONTAINER */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-neutral-900">
              Nội dung bài học
            </span>
            <span className="text-xs bg-neutral-100 font-bold text-neutral-600 px-2.5 py-0.5 rounded-full">
              {filteredLessons.length} bài
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-neutral-500 font-medium hidden sm:flex">
            <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
            </svg>
            Kéo biểu tượng <span className="font-bold text-neutral-700">::</span> để thay đổi thứ tự hiển thị
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs font-semibold text-neutral-500">Đang tải danh sách bài giảng...</p>
          </div>
        ) : filteredLessons.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-neutral-200 rounded-xl bg-neutral-50/50">
            <div className="w-14 h-14 rounded-2xl bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-neutral-800">Chưa có bài giảng nào</h3>
            <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
              Chưa có nội dung bài học trong phân công này. Nhấn nút "Thêm bài giảng mới" để bắt đầu soạn giáo trình.
            </p>
            <Button variant="outline" className="mt-4 text-xs mx-auto" onClick={handleOpenAddModal}>
              + Tạo bài giảng đầu tiên
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLessons.map((item, index) => {
              const typeInfo = CONTENT_TYPES.find((t) => t.value === item.contentType) || CONTENT_TYPES[0];
              const isDragging = draggedIndex === index;
              const isOver = dragOverIndex === index;

              return (
                <div
                  key={item._id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`group relative bg-white rounded-xl border p-4 transition-all duration-200 flex items-start sm:items-center justify-between gap-4 ${
                    isDragging ? "opacity-40 scale-[0.99] border-dashed border-primary bg-primary/5 shadow-inner" : ""
                  } ${
                    isOver ? "border-2 border-primary bg-primary/5 ring-4 ring-primary/10 shadow-lg" : "border-neutral-200 hover:border-neutral-300 hover:shadow-md"
                  }`}
                >
                  {/* LEFT: DRAG GRIP + ITEM ORDER + CONTENT */}
                  <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                    {/* DRAG HANDLE GRIP ICON */}
                    <div
                      className="cursor-grab active:cursor-grabbing p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition flex-shrink-0"
                      title="Kéo thả để đổi thứ tự"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M7 4a1 1 0 100-2 1 1 0 000 2zm6 0a1 1 0 100-2 1 1 0 000 2zm-6 6a1 1 0 100-2 1 1 0 000 2zm6 0a1 1 0 100-2 1 1 0 000 2zm-6 6a1 1 0 100-2 1 1 0 000 2zm6 0a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                      </svg>
                    </div>

                    {/* ORDER NUMBER BADGE */}
                    <span className="w-7 h-7 rounded-lg bg-neutral-100 font-outfit font-extrabold text-neutral-700 text-xs flex items-center justify-center flex-shrink-0 shadow-inner">
                      #{index + 1}
                    </span>

                    {/* CONTENT DETAILS */}
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${typeInfo.color}`}>
                          <span>{typeInfo.icon}</span>
                          <span>{typeInfo.label}</span>
                        </span>

                        <h4 className="text-sm font-bold text-neutral-900 group-hover:text-primary transition truncate">
                          {item.title}
                        </h4>
                      </div>

                      {item.description && (
                        <p className="text-xs text-neutral-500 line-clamp-1">
                          {item.description}
                        </p>
                      )}

                      {item.attachmentUrl && (
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewTarget(item);
                            }}
                            className="inline-flex items-center gap-1.5 text-xs text-purple-700 font-bold bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-lg border border-purple-200 transition"
                            title="Xem trước tệp trong trang"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <span>Xem trước tệp</span>
                          </button>

                          <a
                            href={getFileDownloadUrl(item.attachmentUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-primary font-bold hover:underline bg-primary/5 hover:bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20 transition"
                            onClick={(e) => e.stopPropagation()}
                            title="Tự động tải tệp về máy"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            <span>Tải về máy</span>
                          </a>

                          <a
                            href={getFileViewUrl(item.attachmentUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-neutral-500 hover:text-neutral-900 hover:underline font-semibold ml-1"
                            onClick={(e) => e.stopPropagation()}
                            title="Mở trên tab mới"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            <span>Mở tab mới</span>
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* RIGHT: ACCESSIBILITY ORDER MOVE & ACTION BUTTONS */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* MOVE UP / DOWN BUTTONS */}
                    <div className="flex flex-col sm:flex-row gap-0.5 mr-2 bg-neutral-50 p-1 rounded-lg border border-neutral-200">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => handleMoveItem(index, -1)}
                        className="p-1 rounded text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed transition"
                        title="Di chuyển lên"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        disabled={index === filteredLessons.length - 1}
                        onClick={() => handleMoveItem(index, 1)}
                        className="p-1 rounded text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed transition"
                        title="Di chuyển xuống"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>

                    {/* EDIT BUTTON */}
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(item)}
                      className="p-2 text-neutral-600 hover:text-primary hover:bg-primary/10 rounded-lg transition"
                      title="Chỉnh sửa"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>

                    {/* DELETE BUTTON */}
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(item)}
                      className="p-2 text-neutral-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Xóa bài"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* --- CREATE / EDIT LESSON FORM MODAL --- */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-neutral-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xl max-w-xl w-full p-6 animate-fadeIn transition-all">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-200 mb-5">
              <div>
                <h3 className="text-lg font-bold font-outfit text-neutral-900">
                  {editingLesson ? "Chỉnh sửa bài giảng" : "Thêm bài giảng mới"}
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {activeAssignment ? `Dành cho: ${activeAssignment.classRef?.name} - ${activeAssignment.subjectRef?.name}` : "Điền thông tin nội dung bài học"}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4">
              {/* Teaching assignment selector (if creating and assignment wasn't locked) */}
              {!editingLesson && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-neutral-900">
                    Phân công giảng dạy <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="teachingAssignmentRef"
                    value={formData.teachingAssignmentRef}
                    onChange={handleFormChange}
                    className="w-full bg-white border border-neutral-200 text-neutral-900 text-sm rounded-lg px-3.5 py-2 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                  >
                    {assignments.map((asg) => (
                      <option key={asg._id} value={asg._id}>
                        {asg.classRef?.name} — {asg.subjectRef?.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Title Input */}
              <Input
                label="Tiêu đề bài giảng *"
                id="title"
                name="title"
                placeholder="Ví dụ: Bài 1: Mệnh đề và tập hợp"
                value={formData.title}
                onChange={handleFormChange}
                error={formErrors.title}
              />

              {/* Content Type Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-neutral-900">
                  Loại nội dung
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CONTENT_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, contentType: type.value }))}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition ${
                        formData.contentType === type.value
                          ? "border-primary bg-primary/5 text-primary ring-2 ring-primary/20"
                          : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                      }`}
                    >
                      <span className="text-base">{type.icon}</span>
                      <span className="truncate">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description textarea */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="description" className="text-xs font-semibold text-neutral-900">
                  Mô tả / Ghi chú nội dung
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  placeholder="Mô tả tóm tắt nội dung bài học, yêu cầu học sinh chuẩn bị..."
                  value={formData.description}
                  onChange={handleFormChange}
                  className="w-full px-3.5 py-2 text-sm text-neutral-900 placeholder-neutral-400 bg-white border border-neutral-200 rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                />
              </div>

              {/* Attachment URL Input */}
              <Input
                label="Đường dẫn tệp / Liên kết đính kèm (URL)"
                id="attachmentUrl"
                name="attachmentUrl"
                placeholder="https://..."
                value={formData.attachmentUrl}
                onChange={handleFormChange}
              />

              {/* --- SUBTASK 3: UPLOAD FILE WITH PROGRESS BAR --- */}
              <div className="border border-neutral-200 rounded-xl p-4 bg-neutral-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Tải tệp trực tiếp từ máy tính (Tùy chọn)
                  </span>
                  <span className="text-[11px] text-neutral-500">PDF, Doc, MP4 &le; 30MB</span>
                </div>

                {/* Dropzone File Selection */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragOverDropzone(true); }}
                  onDragLeave={() => setIsDragOverDropzone(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOverDropzone(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleSelectFile(e.dataTransfer.files[0]);
                    }
                  }}
                  className={`border-2 border-dashed rounded-xl p-4 text-center transition ${
                    isDragOverDropzone ? "border-primary bg-primary/10" : "border-neutral-300 bg-white hover:border-neutral-400"
                  }`}
                >
                  {!uploadFile ? (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-neutral-600">
                        Kéo thả tệp vào đây hoặc{" "}
                        <label className="text-primary font-bold cursor-pointer hover:underline">
                          chọn tệp từ máy
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleSelectFile(e.target.files[0]);
                              }
                            }}
                          />
                        </label>
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-neutral-100 p-2.5 rounded-lg">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="text-lg">📁</span>
                        <div className="text-left overflow-hidden">
                          <p className="text-xs font-bold text-neutral-900 truncate max-w-[240px]">
                            {uploadFile.name}
                          </p>
                          <span className="text-[10px] text-neutral-500">
                            {(uploadFile.size / (1024 * 1024)).toFixed(2)} MB
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!uploading && uploadProgress !== 100 && (
                          <Button variant="primary" className="py-1 px-3 text-xs" onClick={handleStartUpload}>
                            Tải lên
                          </Button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setUploadFile(null);
                            setUploadProgress(0);
                            setUploadStatus("");
                          }}
                          className="text-neutral-400 hover:text-rose-600 p-1"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* PROGRESS BAR DISPLAY */}
                {(uploading || uploadProgress > 0) && (
                  <div className="space-y-1.5 animate-fadeIn">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className={uploadProgress === 100 ? "text-emerald-600" : "text-primary"}>
                        {uploadStatus}
                      </span>
                      <span className="text-neutral-700">{uploadProgress}%</span>
                    </div>

                    {/* Progress Track */}
                    <div className="w-full bg-neutral-200 h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          uploadProgress === 100
                            ? "bg-emerald-500"
                            : "bg-gradient-to-r from-primary to-purple-600"
                        }`}
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* MODAL ACTION BUTTONS */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
                <Button
                  variant="outline"
                  className="px-4 py-2 text-xs"
                  onClick={() => setShowModal(false)}
                >
                  Hủy bỏ
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="px-5 py-2 text-xs"
                  disabled={submitting}
                >
                  {submitting ? "Đang lưu..." : editingLesson ? "Cập nhật" : "Tạo bài giảng"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DELETE CONFIRMATION MODAL --- */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-neutral-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xl max-w-sm w-full p-6 text-center animate-fadeIn">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3 ring-8 ring-rose-50/50">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-neutral-900 mb-1">
              Xác nhận xóa bài giảng?
            </h3>
            <p className="text-xs text-neutral-500 mb-5">
              Bạn có chắc chắn muốn xóa bài <strong className="text-neutral-800">"{deleteTarget.title}"</strong>? Thao tác này không thể hoàn tác.
            </p>
            <div className="flex items-center gap-3">
              <Button variant="outline" className="flex-1 text-xs py-2" onClick={() => setDeleteTarget(null)}>
                Hủy
              </Button>
              <Button variant="danger" className="flex-1 text-xs py-2" onClick={handleDeleteConfirm}>
                Xóa ngay
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* --- FILE PREVIEW MODAL --- */}
      {previewTarget && (
        <div className="fixed inset-0 z-50 bg-neutral-900/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xl w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-3.5 border-b border-neutral-200 bg-neutral-50/90">
              <div className="flex items-center gap-3 overflow-hidden">
                <span className="text-2xl flex-shrink-0">
                  {previewTarget.contentType === "video" ? "🎥" : previewTarget.contentType === "exercise" ? "📝" : "📄"}
                </span>
                <div className="overflow-hidden">
                  <h3 className="text-sm font-bold font-outfit text-neutral-900 truncate">
                    {previewTarget.title}
                  </h3>
                  <p className="text-xs text-neutral-500 truncate">
                    Cửa sổ xem trước tệp bài giảng trong hệ thống EduLMS
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href={getFileDownloadUrl(previewTarget.attachmentUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-primary text-white hover:bg-primary-hover rounded-lg shadow-sm transition"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>Tải về máy</span>
                </a>

                <button
                  type="button"
                  onClick={() => setPreviewTarget(null)}
                  className="p-1.5 text-neutral-400 hover:text-neutral-800 hover:bg-neutral-200 rounded-lg transition"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content Viewer */}
            <div className="flex-1 bg-neutral-900 relative flex items-center justify-center overflow-hidden">
              {(() => {
                const url = previewTarget.attachmentUrl;
                if (!url) return <div className="text-white text-xs">Không có tệp đính kèm</div>;
                const cleanUrl = url.split("?")[0];
                const ext = (cleanUrl.split(".").pop() || "").toLowerCase();
                const isImage = ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext);
                const isVideo = ["mp4", "mov", "avi", "webm", "mkv"].includes(ext) || previewTarget.contentType === "video";
                const isPdf = ext === "pdf";

                if (isImage) {
                  return (
                    <div className="w-full h-full flex items-center justify-center p-4">
                      <img src={getFileViewUrl(url)} alt={previewTarget.title} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
                    </div>
                  );
                }

                if (isVideo) {
                  return (
                    <div className="w-full h-full flex items-center justify-center p-4">
                      <video controls autoPlay className="max-w-full max-h-full rounded-lg shadow-2xl">
                        <source src={getFileViewUrl(url)} />
                        Trình duyệt không hỗ trợ phát video này.
                      </video>
                    </div>
                  );
                }

                if (isPdf) {
                  return (
                    <iframe
                      src={getFileViewUrl(url)}
                      title={previewTarget.title}
                      className="w-full h-full border-0 bg-white"
                    />
                  );
                }

                // Office docs embedding
                if (["doc", "docx", "ppt", "pptx", "xls", "xlsx"].includes(ext)) {
                  const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
                  return (
                    <iframe
                      src={officeViewerUrl}
                      title={previewTarget.title}
                      className="w-full h-full border-0 bg-white"
                    />
                  );
                }

                return (
                  <iframe
                    src={getFileViewUrl(url)}
                    title={previewTarget.title}
                    className="w-full h-full border-0 bg-white"
                  />
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
