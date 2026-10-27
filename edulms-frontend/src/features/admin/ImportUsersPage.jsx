import { useState, useRef, useCallback } from 'react'
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle, Download, Users, GraduationCap, Loader2, X, ChevronDown, Eye, EyeOff } from 'lucide-react'
import importApi from '@/api/importApi'

const ROLE_CONFIG = {
  student: {
    label: 'Học sinh',
    icon: Users,
    color: 'blue',
    headers: ['Họ và Tên', 'Mã Học Sinh', 'Email', 'Lớp'],
    sampleData: [
      ['Nguyễn Văn A', 'HS001', 'nguyenvana@edu.vn', '10A1'],
      ['Trần Thị B', 'HS002', 'tranthib@edu.vn', '10A2'],
    ],
  },
  teacher: {
    label: 'Giáo viên',
    icon: GraduationCap,
    color: 'emerald',
    headers: ['Họ và Tên', 'Mã Giáo Viên', 'Email'],
    sampleData: [
      ['Lê Văn C', 'GV001', 'levanc@edu.vn'],
      ['Phạm Thị D', 'GV002', 'phamthid@edu.vn'],
    ],
  },
}

export const ImportUsersPage = () => {
  const [selectedRole, setSelectedRole] = useState('student')
  const [file, setFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [showPasswords, setShowPasswords] = useState(false)
  const [showFailDetails, setShowFailDetails] = useState(true)
  const fileInputRef = useRef(null)

  const config = ROLE_CONFIG[selectedRole]

  const handleFileSelect = useCallback((selectedFile) => {
    setError(null)
    setResult(null)
    if (selectedFile) {
      const ext = selectedFile.name.split('.').pop().toLowerCase()
      if (ext !== 'xlsx') {
        setError('Chỉ hỗ trợ file Excel (.xlsx)')
        return
      }
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError('File không được vượt quá 5MB')
        return
      }
      setFile(selectedFile)
    }
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile) handleFileSelect(droppedFile)
  }, [handleFileSelect])

  const handleImport = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await importApi.importUsers(selectedRole, file)
      setResult(res.data || res)
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      setError(err?.message || err?.toString() || 'Đã xảy ra lỗi khi import')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      const response = await importApi.downloadTemplate(selectedRole)
      const blob = new Blob([response], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mau_import_${selectedRole}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('Không thể tải file mẫu. Vui lòng thử lại!')
    }
  }

  const handleReset = () => {
    setFile(null)
    setResult(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Import tài khoản từ Excel
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Tải lên file Excel để tạo hàng loạt tài khoản Học sinh hoặc Giáo viên
        </p>
      </div>

      {/* Role Selector */}
      <div className="flex gap-3">
        {Object.entries(ROLE_CONFIG).map(([role, cfg]) => {
          const Icon = cfg.icon
          const isActive = selectedRole === role
          return (
            <button
              key={role}
              id={`role-btn-${role}`}
              onClick={() => {
                setSelectedRole(role)
                handleReset()
              }}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 border-2 cursor-pointer ${
                isActive
                  ? role === 'student'
                    ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-sm shadow-blue-100'
                    : 'bg-emerald-50 border-emerald-400 text-emerald-700 shadow-sm shadow-emerald-100'
                  : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4.5 h-4.5" />
              {cfg.label}
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Upload Area */}
        <div className="lg:col-span-2 space-y-4">
          {/* Drop Zone */}
          <div
            id="drop-zone"
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 ${
              dragOver
                ? 'border-blue-400 bg-blue-50/60 scale-[1.01]'
                : file
                  ? 'border-emerald-300 bg-emerald-50/40'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files?.[0])}
            />

            {file ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center">
                  <FileSpreadsheet className="w-7 h-7 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{file.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleReset() }}
                  className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 mt-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" /> Xóa file
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                  <Upload className="w-7 h-7 text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">
                    Kéo thả file Excel vào đây hoặc <span className="text-blue-600 font-semibold">nhấn để chọn</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Hỗ trợ định dạng .xlsx • Tối đa 5MB
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <XCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              id="btn-import"
              onClick={handleImport}
              disabled={!file || loading}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                !file || loading
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-200 active:scale-[0.98]'
              }`}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {loading ? 'Đang xử lý...' : 'Bắt đầu Import'}
            </button>
          </div>
        </div>

        {/* Right: Template Info */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-slate-500" />
              Cấu trúc file mẫu
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100">
                    {config.headers.map((h) => (
                      <th key={h} className="text-left py-2 px-2 font-semibold text-slate-600 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {config.sampleData.map((row, i) => (
                    <tr key={i} className="border-b border-slate-50">
                      {row.map((cell, j) => (
                        <td key={j} className="py-1.5 px-2 text-slate-500 whitespace-nowrap">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              id="btn-download-template"
              onClick={handleDownloadTemplate}
              className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-slate-200 text-xs font-semibold text-slate-600 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/40 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Tải file mẫu Excel
            </button>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="text-xs text-amber-800 space-y-1">
                <p className="font-semibold">Lưu ý quan trọng</p>
                <ul className="list-disc pl-4 space-y-0.5 text-amber-700">
                  <li>Dòng đầu tiên phải là tiêu đề cột</li>
                  <li>Mã định danh và Email không được trùng</li>
                  <li>Tài khoản mới có mật khẩu tạm thời</li>
                  <li>Dòng lỗi không ảnh hưởng dòng khác</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Import Result */}
      {result && (
        <div className="space-y-4 animate-in">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <p className="text-xs text-slate-500 font-medium">Tổng số dòng</p>
              <p className="text-3xl font-extrabold text-slate-800 mt-1">{result.totalRows}</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
              <p className="text-xs text-emerald-600 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Thành công
              </p>
              <p className="text-3xl font-extrabold text-emerald-700 mt-1">{result.successCount}</p>
            </div>
            <div className={`rounded-2xl p-5 border ${result.failCount > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
              <p className={`text-xs font-medium flex items-center gap-1.5 ${result.failCount > 0 ? 'text-red-600' : 'text-slate-500'}`}>
                <XCircle className="w-3.5 h-3.5" /> Thất bại
              </p>
              <p className={`text-3xl font-extrabold mt-1 ${result.failCount > 0 ? 'text-red-700' : 'text-slate-400'}`}>
                {result.failCount}
              </p>
            </div>
          </div>

          {/* Created Accounts Table */}
          {result.createdAccounts && result.createdAccounts.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Tài khoản đã tạo thành công ({result.createdAccounts.length})
                </h3>
                <button
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition cursor-pointer"
                >
                  {showPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {showPasswords ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600">
                      <th className="text-left py-2.5 px-4 font-semibold">Dòng</th>
                      <th className="text-left py-2.5 px-4 font-semibold">Họ và Tên</th>
                      <th className="text-left py-2.5 px-4 font-semibold">Mã định danh</th>
                      <th className="text-left py-2.5 px-4 font-semibold">Email</th>
                      <th className="text-left py-2.5 px-4 font-semibold">Mật khẩu tạm</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.createdAccounts.map((acc, i) => (
                      <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition">
                        <td className="py-2 px-4 text-slate-400 font-mono">{acc.rowIndex}</td>
                        <td className="py-2 px-4 text-slate-700 font-medium">{acc.fullName}</td>
                        <td className="py-2 px-4 text-slate-600 font-mono">{acc.userCode}</td>
                        <td className="py-2 px-4 text-slate-600">{acc.email}</td>
                        <td className="py-2 px-4">
                          <code className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md text-[11px] font-mono">
                            {showPasswords ? acc.tempPassword : '••••••••'}
                          </code>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Failures Table */}
          {result.failures && result.failures.length > 0 && (
            <div className="bg-white border border-red-200 rounded-2xl shadow-xs overflow-hidden">
              <button
                onClick={() => setShowFailDetails(!showFailDetails)}
                className="w-full px-5 py-4 border-b border-red-100 flex items-center justify-between hover:bg-red-50/30 transition cursor-pointer"
              >
                <h3 className="text-sm font-semibold text-red-800 flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-500" />
                  Chi tiết lỗi ({result.failures.length} dòng)
                </h3>
                <ChevronDown className={`w-4 h-4 text-red-400 transition-transform duration-200 ${showFailDetails ? 'rotate-180' : ''}`} />
              </button>
              {/* Export failures CSV button */}
              {result.failures && result.failures.length > 0 && (
                <button
                  onClick={() => {
                    const headers = ['Dòng', 'Lỗi'];
                    const rows = result.failures
                      .map((f) => `${f.row},"${f.errors.join(' | ')}"`)
                      .join('\n');
                    const csv = '\uFEFF' + headers.join(',') + '\n' + rows;
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `import_failures_${selectedRole}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-red-200 text-xs font-semibold text-red-600 hover:border-red-300 hover:bg-red-50/40 transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Xuất CSV lỗi
                </button>
              )}
              {showFailDetails && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-red-50/50 text-red-700">
                        <th className="text-left py-2.5 px-4 font-semibold w-20">Dòng</th>
                        <th className="text-left py-2.5 px-4 font-semibold">Lỗi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.failures.map((fail, i) => (
                        <tr key={i} className="border-b border-red-50 hover:bg-red-50/30 transition">
                          <td className="py-2.5 px-4 text-red-600 font-mono font-semibold">{fail.row}</td>
                          <td className="py-2.5 px-4">
                            <ul className="space-y-0.5">
                              {fail.errors.map((err, j) => (
                                <li key={j} className="text-red-700 flex items-start gap-1.5">
                                  <AlertTriangle className="w-3 h-3 text-red-400 mt-0.5 shrink-0" />
                                  {err}
                                </li>
                              ))}
                            </ul>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ImportUsersPage
