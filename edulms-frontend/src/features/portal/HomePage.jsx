import React from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, ShieldCheck, Users, Award, ChevronRight, GraduationCap, ArrowRight } from 'lucide-react'

export const HomePage = () => {
  return (
    <div className="space-y-16 py-4">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-8 md:p-14 shadow-2xl">
        <div className="relative z-10 max-w-2xl space-y-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold">
            🎓 EduLMS - Nền tảng Giáo dục Số THPT
          </span>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight">
            Số hóa Quản trị & Nâng tầm Trải nghiệm Học tập
          </h1>
          <p className="text-sm md:text-base text-slate-300 leading-relaxed">
            Hệ thống quản lý học tập số hóa hiện đại cho nhà trường, kết nối Giáo viên, Học sinh và Phụ huynh trên cùng một nền tảng thống nhất.
          </p>
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              to="/login"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl shadow-lg transition-all flex items-center gap-2"
            >
              <span>Vào hệ thống</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/portal/guides"
              className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium text-sm rounded-xl transition-all"
            >
              Xem hướng dẫn sử dụng
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h2 className="text-2xl font-bold text-slate-900">Tính năng nổi bật</h2>
          <p className="text-xs text-slate-500">Được tối ưu hóa theo quy chuẩn quản lý học tập THPT</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-800 text-base">Sổ điểm điện tử chuẩn hóa</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Tự động tính điểm trung bình GPA chính xác theo hệ số 1 (Miệng/15p), hệ số 2 (1 tiết) và hệ số 3 (Cuối kỳ).
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-800 text-base">Điểm danh & Chuyên cần</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Điểm danh chi tiết theo từng tiết học (Tiết 1 - 10), ghi nhận vi phạm kỷ luật và cập nhật trực tiếp cho phụ huynh.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="w-10 h-10 bg-violet-100 text-violet-600 rounded-xl flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-800 text-base">Phân quyền RBAC bảo mật</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Tách biệt không gian làm việc giữa Admin, Giáo viên bộ môn / GVCN, Học sinh và Phụ huynh theo chuẩn bảo mật JWT.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

export default HomePage
