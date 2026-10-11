import React from 'react'
import { Link } from 'react-router-dom'
import { ShieldAlert, Home } from 'lucide-react'

export const UnauthorizedPage = () => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
      <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Truy cập bị từ chối</h1>
      <p className="text-xs text-slate-500 mt-2 max-w-md">
        Tài khoản của bạn không có quyền truy cập vào chức năng hoặc phân vùng quản trị này.
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

export default UnauthorizedPage
