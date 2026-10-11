import React from 'react'
import { Outlet, Link } from 'react-router-dom'
import { GraduationCap } from 'lucide-react'

export const AuthLayout = () => {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Dynamic Background Gradients */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        <Link to="/" className="inline-flex items-center gap-2 text-white font-extrabold text-2xl tracking-tight mb-2">
          <div className="bg-blue-600 text-white p-2.5 rounded-2xl shadow-lg">
            <GraduationCap className="w-7 h-7" />
          </div>
          <span>Edu<span className="text-blue-400">LMS</span></span>
        </Link>
        <h2 className="text-sm text-slate-400 font-medium">Hệ thống Quản lý Học tập & Quản trị THPT</h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4">
        <div className="bg-white/95 backdrop-blur-md py-8 px-6 shadow-2xl rounded-2xl border border-white/20 sm:px-10">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export default AuthLayout
