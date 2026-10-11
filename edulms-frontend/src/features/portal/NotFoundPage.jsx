import React from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, Home } from 'lucide-react'

export const NotFoundPage = () => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
      <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8" />
      </div>
      <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">404</h1>
      <p className="text-lg font-semibold text-slate-700 mt-2">Trang bạn tìm kiếm không tồn tại</p>
      <p className="text-xs text-slate-500 mt-1 max-w-md">
        Đường dẫn bạn truy cập có thể đã bị đổi hoặc không còn hoạt động trên hệ thống EduLMS.
      </p>
      <Link
        to="/"
        className="mt-6 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-md transition-all flex items-center gap-2"
      >
        <Home className="w-4 h-4" />
        <span>Về trang chủ</span>
      </Link>
    </div>
  )
}

export default NotFoundPage
