import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import axiosClient from "../../api/axiosClient";
import Card from "../../components/common/Card";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";

export default function UserImport() {
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [defaultRole, setDefaultRole] = useState("student");
  const [dragActive, setDragActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);

  const fileInputRef = useRef(null);

  // Handle drag events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Parse Excel locally for frontend preview
  const parseExcelFile = (uploadedFile) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          setError("Tệp Excel trống và không chứa trang tính nào.");
          return;
        }
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false });

        if (jsonData.length === 0) {
          setError("Tệp Excel không chứa bất kỳ dòng dữ liệu nào.");
          setPreviewData([]);
          return;
        }

        // Map column headers dynamically to display standard preview fields
        const mappedData = jsonData.map((row) => {
          const mapped = {};
          // Standard mapping logic in sync with backend
          for (const key of Object.keys(row)) {
            const cleanKey = key.trim().toLowerCase();
            const cleanVal = String(row[key] || "").trim();

            if (["họ và tên", "họ tên", "tên học sinh", "tên giáo viên", "fullname", "name", "tên"].includes(cleanKey)) {
              mapped.name = cleanVal;
            } else if (["email", "địa chỉ email", "mail"].includes(cleanKey)) {
              mapped.email = cleanVal;
            } else if (["role", "vai trò", "chức vụ", "loại"].includes(cleanKey)) {
              mapped.role = cleanVal;
            } else if (["mssv", "msgv", "mã học sinh", "mã giáo viên", "mã", "code", "mã số"].includes(cleanKey)) {
              mapped.code = cleanVal;
            } else if (["lớp", "lớp học", "class"].includes(cleanKey)) {
              mapped.class = cleanVal;
            }
          }
          // Fallback properties
          if (!mapped.name && row.name) mapped.name = String(row.name).trim();
          if (!mapped.email && row.email) mapped.email = String(row.email).trim();
          if (!mapped.role && row.role) mapped.role = String(row.role).trim();
          if (!mapped.code && row.code) mapped.code = String(row.code).trim();
          if (!mapped.class && row.class) mapped.class = String(row.class).trim();

          return mapped;
        });

        setPreviewData(mappedData);
        setError("");
      } catch (err) {
        setError("Không thể đọc tệp Excel. Định dạng bị lỗi hoặc không được hỗ trợ.");
        setPreviewData([]);
      }
    };
    reader.readAsArrayBuffer(uploadedFile);
  };

  // Handle drop event
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      const nameLower = droppedFile.name.toLowerCase();
      if (nameLower.endsWith(".xlsx") || nameLower.endsWith(".xls")) {
        setFile(droppedFile);
        parseExcelFile(droppedFile);
      } else {
        setError("Chỉ chấp nhận các tệp tin Excel có đuôi mở rộng .xls hoặc .xlsx");
      }
    }
  };

  // Handle manual file selection
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      parseExcelFile(selectedFile);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  // Clear loaded file states
  const handleCancel = () => {
    setFile(null);
    setPreviewData([]);
    setError("");
    setResult(null);
  };

  // Call import API to perform backend checks & DB insert
  const handleConfirmImport = async () => {
    if (!file) return;

    setIsLoading(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("role", defaultRole);

    try {
      const response = await axiosClient.post("/users/import", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.success) {
        setResult(response.data);
      } else {
        setError(response.message || "Đã xảy ra lỗi trong quá trình nhập dữ liệu.");
      }
    } catch (err) {
      setError(err.message || "Đã xảy ra lỗi kết nối với máy chủ.");
    } finally {
      setIsLoading(false);
    }
  };

  // Copy temporary password utility
  const handleCopyPassword = (password, index) => {
    navigator.clipboard.writeText(password);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Download error report as UTF-8 BOM CSV
  const handleExportErrors = () => {
    if (!result || !result.errors || result.errors.length === 0) return;

    const headers = ["Dòng", "Họ và tên", "Email", "Mã định danh", "Lý do lỗi"];
    const rows = result.errors.map((err) => [
      err.row,
      err.name || "",
      err.email || "",
      err.code || "",
      err.errors.join("; "),
    ]);

    const csvContent = [headers, ...rows]
      .map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    // UTF-8 BOM to ensure Excel opens Vietnamese characters correctly
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `baocao_loi_import_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-5 border-b border-neutral-200">
        <div>
          <h1 className="text-3xl font-extrabold text-neutral-900 tracking-tight">Nhập Dữ Liệu Học Sinh/Giáo Viên</h1>
          <p className="text-sm text-neutral-600 mt-1">
            Quản trị viên có thể nhập hàng loạt người dùng mới bằng cách tải lên file Excel biểu mẫu.
          </p>
        </div>
        {result && (
          <Button variant="outline" className="mt-4 md:mt-0 font-bold" onClick={handleCancel}>
            Nhập Tệp Tin Khác
          </Button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-danger/20 text-danger text-sm font-semibold rounded-xl flex items-center gap-3 animate-fade-in">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: Upload Dropzone & Configuration */}
      {!file && !result && (
        <Card className="p-8 shadow-sm">
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-6 items-center">
              <div className="w-full md:w-1/3 space-y-2">
                <label className="text-sm font-bold text-neutral-900">Vai Trò Mặc Định</label>
                <p className="text-xs text-neutral-600 leading-normal">
                  Sử dụng khi cột "Vai trò" trong tệp Excel trống. Người dùng sẽ được tự động xếp vào vai trò này.
                </p>
                <select
                  value={defaultRole}
                  onChange={(e) => setDefaultRole(e.target.value)}
                  className="w-full mt-2 px-3 py-2 text-sm bg-white border border-neutral-200 focus:ring-1 focus:ring-primary focus:border-primary rounded-lg outline-none transition"
                >
                  <option value="student">Học sinh (Student)</option>
                  <option value="teacher">Giáo viên (Teacher)</option>
                </select>
              </div>

              {/* Drag and Drop Area */}
              <div className="w-full md:w-2/3">
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={triggerFileInput}
                  className={`w-full min-h-[220px] flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 ${
                    dragActive
                      ? "border-primary bg-primary-light scale-[1.01]"
                      : "border-neutral-200 bg-neutral-50 hover:bg-neutral-100 hover:border-neutral-300"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".xlsx, .xls"
                    onChange={handleFileChange}
                  />
                  <div className="w-14 h-14 bg-white shadow-sm text-neutral-600 rounded-full flex items-center justify-center mb-4 transition border border-neutral-100">
                    <svg className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-sm text-neutral-900 text-center">
                    Kéo thả tệp tin Excel vào đây hoặc <span className="text-primary hover:underline">Nhấp để duyệt</span>
                  </h3>
                  <p className="text-xs text-neutral-600 mt-1.5 text-center">
                    Chỉ hỗ trợ định dạng .xlsx, .xls (Tối đa 5MB)
                  </p>
                </div>
              </div>
            </div>

            {/* Instruction Card */}
            <div className="p-4 bg-primary-light border border-indigo-100/50 rounded-xl space-y-2 text-neutral-600 text-xs leading-normal">
              <p className="font-bold text-primary uppercase tracking-wider text-[10px]">Hướng dẫn cấu trúc file Excel:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Các tiêu đề cột được hỗ trợ (không phân biệt chữ hoa/thường):</li>
                <li><strong>Họ và tên</strong>: Tên người dùng.</li>
                <li><strong>Email</strong>: Địa chỉ thư điện tử (Ví dụ: <code>hocsinh@edulms.edu</code>).</li>
                <li><strong>Mã số</strong>: Mã học sinh (MSSV) hoặc Mã giáo viên (MSGV).</li>
                <li><strong>Lớp</strong>: Tên lớp học, ví dụ <code>10A1</code> (chỉ bắt buộc đối với Học sinh).</li>
                <li><strong>Vai trò</strong>: Có thể điền <code>Học sinh</code>, <code>Giáo viên</code>, <code>HS</code>, <code>GV</code> hoặc để trống để nhận vai trò mặc định.</li>
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* STEP 2: File Preview (Local spreadsheet records) */}
      {file && !result && (
        <Card className="p-6 shadow-sm space-y-5 animate-fade-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center border border-emerald-100">
                <svg className="w-6 h-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-neutral-900 text-base">{file.name}</h3>
                <p className="text-xs text-neutral-600">
                  Dung lượng: {(file.size / 1024).toFixed(1)} KB | Tìm thấy {previewData.length} dòng
                </p>
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" className="flex-1 sm:flex-initial" onClick={handleCancel} disabled={isLoading}>
                Hủy bỏ
              </Button>
              <Button variant="primary" className="flex-1 sm:flex-initial" onClick={handleConfirmImport} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Đang Nhập...
                  </>
                ) : (
                  "Xác Nhận Nhập"
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold text-neutral-600 uppercase tracking-wider">Xem trước dữ liệu dòng:</h4>
              <Badge variant="neutral">Hiển thị tối đa 10 dòng đầu tiên</Badge>
            </div>
            <div className="overflow-x-auto border border-neutral-200 rounded-lg">
              <table className="w-full text-sm text-left">
                <thead className="bg-neutral-50 text-xs font-semibold text-neutral-600 uppercase border-b border-neutral-200">
                  <tr>
                    <th className="px-4 py-2.5">Họ và tên</th>
                    <th className="px-4 py-2.5">Email</th>
                    <th className="px-4 py-2.5">Vai trò</th>
                    <th className="px-4 py-2.5">Mã định danh</th>
                    <th className="px-4 py-2.5">Lớp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {previewData.slice(0, 10).map((row, idx) => (
                    <tr key={idx} className="hover:bg-neutral-50/50">
                      <td className="px-4 py-2.5 font-medium text-neutral-900">{row.name || <span className="text-neutral-400 italic">Trống</span>}</td>
                      <td className="px-4 py-2.5 text-neutral-600">{row.email || <span className="text-neutral-400 italic">Trống</span>}</td>
                      <td className="px-4 py-2.5">
                        <Badge role={row.role || defaultRole}>{row.role || `${defaultRole} (mặc định)`}</Badge>
                      </td>
                      <td className="px-4 py-2.5 text-neutral-600">{row.code || <span className="text-neutral-400 italic">Trống</span>}</td>
                      <td className="px-4 py-2.5 text-neutral-600">{row.class || <span className="text-neutral-400 italic">Trống</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

      {/* STEP 3: API Result Dashboard */}
      {result && (
        <div className="space-y-6 animate-fade-in">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Card className="bg-gradient-to-br from-indigo-50 to-white border-indigo-100 p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest">Tổng số dòng xử lý</p>
                <h2 className="text-3xl font-extrabold text-neutral-900 mt-1">{result.summary.totalRows}</h2>
              </div>
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-100 p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-success uppercase tracking-widest">Nhập thành công</p>
                <h2 className="text-3xl font-extrabold text-neutral-900 mt-1">{result.summary.successCount}</h2>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-rose-50 to-white border-rose-100 p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-danger uppercase tracking-widest">Nhập thất bại (Lỗi)</p>
                <h2 className="text-3xl font-extrabold text-neutral-900 mt-1">{result.summary.failCount}</h2>
              </div>
              <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </Card>
          </div>

          {/* Success Accounts Table */}
          {result.importedUsers.length > 0 && (
            <Card className="p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <h3 className="font-bold text-neutral-900 text-base flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-success rounded-full"></span>
                  Tài Khoản Đã Nhập Thành Công
                </h3>
                <Badge variant="success">Tổng: {result.importedUsers.length}</Badge>
              </div>

              <div className="overflow-x-auto border border-neutral-200 rounded-lg">
                <table className="w-full text-sm text-left">
                  <thead className="bg-neutral-50 text-xs font-semibold text-neutral-600 uppercase border-b border-neutral-200">
                    <tr>
                      <th className="px-4 py-2.5 w-16">Dòng</th>
                      <th className="px-4 py-2.5">Họ và tên</th>
                      <th className="px-4 py-2.5">Email</th>
                      <th className="px-4 py-2.5">Vai trò</th>
                      <th className="px-4 py-2.5">Mã số</th>
                      <th className="px-4 py-2.5">Lớp</th>
                      <th className="px-4 py-2.5 w-44">Mật khẩu tạm thời</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {result.importedUsers.map((user, index) => (
                      <tr key={index} className="hover:bg-neutral-50/50">
                        <td className="px-4 py-2.5 font-semibold text-neutral-600">{user.row}</td>
                        <td className="px-4 py-2.5 font-medium text-neutral-900">{user.name}</td>
                        <td className="px-4 py-2.5 text-neutral-600 font-mono text-xs">{user.email}</td>
                        <td className="px-4 py-2.5">
                          <Badge role={user.role}>{user.role}</Badge>
                        </td>
                        <td className="px-4 py-2.5 text-neutral-600 font-mono text-xs">{user.code}</td>
                        <td className="px-4 py-2.5 text-neutral-600">{user.class || "-"}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1.5 bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1 justify-between select-none">
                            <span className="font-mono text-xs font-bold text-neutral-700">{user.temporaryPassword}</span>
                            <button
                              type="button"
                              onClick={() => handleCopyPassword(user.temporaryPassword, index)}
                              className="text-neutral-500 hover:text-primary transition"
                              title="Sao chép mật khẩu"
                            >
                              {copiedIndex === index ? (
                                <svg className="w-3.5 h-3.5 text-success animate-scale-in" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Failure Records Table with error highlight */}
          {result.errors.length > 0 && (
            <Card className="p-6 border-rose-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-rose-100">
                <h3 className="font-bold text-rose-950 text-base flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-danger rounded-full"></span>
                  Danh Sách Dòng Bị Lỗi
                </h3>
                <div className="flex gap-2">
                  <Button variant="outline" className="text-xs px-3 py-1 font-semibold flex items-center gap-1.5 text-rose-700 border-rose-200 bg-rose-50 hover:bg-rose-100 hover:text-rose-900" onClick={handleExportErrors}>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Xuất File Lỗi (CSV)
                  </Button>
                  <Badge variant="danger">Tổng: {result.errors.length}</Badge>
                </div>
              </div>

              <div className="overflow-x-auto border border-rose-200 rounded-lg">
                <table className="w-full text-sm text-left">
                  <thead className="bg-rose-50/50 text-xs font-semibold text-rose-900 uppercase border-b border-rose-200">
                    <tr>
                      <th className="px-4 py-2.5 w-16 text-rose-950">Dòng</th>
                      <th className="px-4 py-2.5 text-rose-950">Họ và tên</th>
                      <th className="px-4 py-2.5 text-rose-950">Email</th>
                      <th className="px-4 py-2.5 text-rose-950">Mã định danh</th>
                      <th className="px-4 py-2.5 text-rose-950">Chi tiết lý do lỗi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-200">
                    {result.errors.map((err, index) => (
                      <tr key={index} className="bg-rose-50/30 hover:bg-rose-50/50 transition">
                        <td className="px-4 py-3.5 font-bold text-rose-900">{err.row}</td>
                        <td className="px-4 py-3.5 font-medium text-neutral-800">{err.name || <span className="text-neutral-400 italic">Trống</span>}</td>
                        <td className="px-4 py-3.5 text-neutral-700 font-mono text-xs">{err.email || <span className="text-neutral-400 italic">Trống</span>}</td>
                        <td className="px-4 py-3.5 text-neutral-700 font-mono text-xs">{err.code || <span className="text-neutral-400 italic">Trống</span>}</td>
                        <td className="px-4 py-3.5">
                          <ul className="list-disc pl-4 text-xs font-semibold text-danger space-y-0.5">
                            {err.errors.map((msg, mIdx) => (
                              <li key={mIdx}>{msg}</li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
