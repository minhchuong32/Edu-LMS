import React from 'react'
import { GraduationCap, Heart } from 'lucide-react'

export const Footer = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 text-sm mt-auto border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-white font-bold text-lg">
              <div className="bg-blue-600 text-white p-1.5 rounded-lg">
                <GraduationCap className="w-5 h-5" />
              </div>
              <span>EduLMS</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Hệ thống Quản lý Học tập & Số hóa Quản trị Nhà trường dành cho các trường THPT. Đồng hành cùng giáo dục số toàn diện.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-3">Tính năng chính</h4>
            <ul className="space-y-2 text-xs">
              <li><a href="#" className="hover:text-white transition-colors">Sổ điểm điện tử</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Điểm danh & Chuyên cần</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Quản lý lớp học & GVCN</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Nộp bài tập & Bài giảng</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-3">Vai trò người dùng</h4>
            <ul className="space-y-2 text-xs">
              <li><a href="#" className="hover:text-white transition-colors">Cổng Quản trị viên (Admin)</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Cổng Giáo viên (Teacher)</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Cổng Học sinh (Student)</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Cổng Phụ huynh (Parent)</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-3">Liên hệ & Hỗ trợ</h4>
            <p className="text-xs leading-relaxed mb-2">
              Bộ phận kỹ thuật & Đổi mới sáng tạo Trường THPT.
            </p>
            <p className="text-xs text-blue-400">hotro@edulms.edu.vn</p>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <p>© {new Date().getFullYear()} EduLMS Platform. Tất cả các quyền được bảo lưu.</p>
          <div className="flex items-center gap-1">
            <span>Phát triển với</span>
            <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
            <span>phục vụ ngành giáo dục</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
