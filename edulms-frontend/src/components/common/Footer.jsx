import React from "react";
import { Link } from "react-router-dom";

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant"
    });
  };

  return (
    <footer className="bg-neutral-950 text-neutral-400 py-12 px-6 border-t border-neutral-800 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-8 text-xs sm:text-sm">
        {/* Brand Column */}
        <div className="space-y-3 max-w-sm">
          <div className="flex items-center gap-3">
            <Link to="/" onClick={scrollToTop} className="inline-flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-primary text-white font-extrabold font-outfit flex items-center justify-center text-2xl shadow-md shadow-primary/25 group-hover:scale-105 transition-transform">
                E
              </div>
            </Link>
            <h2 className="text-white font-extrabold font-outfit text-lg">EduLMS</h2>
          </div>
          <p className="text-xs leading-relaxed text-neutral-500">
            Hệ thống quản lý học tập thông minh THPT. Tối ưu hóa quản lý rèn luyện, rèn luyện số và kết nối nhà trường - phụ huynh.
          </p>
        </div>

        {/* Contact Info Column */}
        <div className="space-y-2">
          <h4 className="text-white font-bold text-xs uppercase tracking-widest mb-2">Thông tin liên hệ</h4>
          <p> Địa chỉ: 01 Võ Văn Ngân, TP. Thủ Đức, TP. Hồ Chí Minh</p>
          <p> Điện thoại: 1900 12xx | Fax: (028) 3896-xxxx</p>
          <p> Email hỗ trợ: edulms@gmail.com</p>
        </div>

        {/* Quick Links Column */}
        <div className="space-y-2">
          <h4 className="text-white font-bold text-xs uppercase tracking-widest mb-2">Liên kết nhanh</h4>
          <Link
            to="/portal"
            onClick={scrollToTop}
            className="hover:text-white transition-colors cursor-pointer block"
          >
            Cổng thông tin Sở GD&ĐT
          </Link>
          <Link
            to="/guide"
            onClick={scrollToTop}
            className="hover:text-white transition-colors cursor-pointer block"
          >
            Hướng dẫn sử dụng hệ thống
          </Link>
          <Link
            to="/terms"
            onClick={scrollToTop}
            className="hover:text-white transition-colors cursor-pointer block"
          >
            Điều khoản dịch vụ & bảo mật
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-8 pt-8 border-t border-neutral-800 text-center text-xs text-neutral-500">
        <p>© {new Date().getFullYear()} EduLMS. Bảo lưu mọi quyền.</p>
      </div>
    </footer>
  );
}
