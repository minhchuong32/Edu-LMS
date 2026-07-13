import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Card from "../../components/common/Card";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";

export default function GuestLanding() {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect authenticated users to their correct workspace dashboard
  useEffect(() => {
    if (isAuthenticated && user) {
      const role = user.role.toLowerCase();
      if (role === "admin") {
        navigate("/admin");
      } else if (role === "teacher") {
        navigate("/teacher");
      } else if (role === "parent") {
        navigate("/parent");
      } else {
        navigate("/student");
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Vui lòng điền đầy đủ thông tin đăng nhập.");
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err?.message || "Sai email hoặc mật khẩu. Vui lòng kiểm tra lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const lmsFeatures = [
    {
      title: "Sổ điểm điện tử & Hệ số",
      desc: "Hệ thống quản lý điểm số thông minh theo hệ số 1 (miệng, 15 phút), hệ số 2 (1 tiết) và hệ số 3 (học kỳ) chuẩn Bộ GD&ĐT.",
      icon: (
        <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      title: "Điểm danh & Thời khóa biểu",
      desc: "Quản lý điểm danh chi tiết theo từng tiết học (tiết 1-10) và cập nhật thời khóa biểu giảng dạy trực quan hàng tuần.",
      icon: (
        <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      title: "Ngân hàng đề thi trực tuyến",
      desc: "Thiết lập đề thi trắc nghiệm giới hạn thời gian tự động chấm điểm và hỗ trợ học sinh làm bài thi tự luận đính kèm tệp tin.",
      icon: (
        <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      title: "Cổng giao tiếp Phụ huynh",
      desc: "Cung cấp kết quả học tập thời gian thực và kênh liên lạc trực tiếp giúp phụ huynh nắm bắt sát sao tình hình con em.",
      icon: (
        <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col font-sans">
      {/* GUEST HEADER */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-neutral-200 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary text-white font-extrabold font-outfit flex items-center justify-center text-xl shadow-sm shadow-primary/20">
              E
            </div>
            <div>
              <h1 className="font-outfit font-extrabold text-base tracking-wide text-neutral-900 leading-none">EduLMS</h1>
              <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest block mt-0.5">
                Hệ thống Quản lý Học tập
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm font-semibold text-neutral-600">
            <a href="#about" className="hover:text-primary transition-colors">Giới thiệu</a>
            <a href="#features" className="hover:text-primary transition-colors">Tính năng</a>
            <div className="h-4 w-px bg-neutral-200"></div>
            <span className="text-xs font-bold bg-neutral-100 text-neutral-600 px-3 py-1 rounded-full border border-neutral-200">
              Hotline: 1900 12xx
            </span>
          </div>
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-12 flex flex-col lg:flex-row items-center gap-12">
        {/* LEFT COLUMN: INTRODUCTIONS */}
        <div className="flex-1 space-y-8" id="about">
          <div className="space-y-4">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-primary-light text-primary border border-primary/10">
              EduLMS v1.0 • Cổng thông tin THPT
            </span>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-neutral-900 leading-tight tracking-tight">
              Kết nối giáo dục toàn diện, <br />
              nâng bước tương lai học sinh.
            </h2>
            <p className="text-sm text-neutral-600 leading-relaxed max-w-xl">
              EduLMS là nền tảng quản lý học tập tích hợp chuyên biệt cho mô hình giáo dục THPT. 
              Giúp tối ưu giảng dạy cho giáo viên, đơn giản hóa học tập cho học sinh và kết nối liên lạc chặt chẽ với phụ huynh.
            </p>
          </div>

          {/* Feature List */}
          <div className="grid sm:grid-cols-2 gap-6" id="features">
            {lmsFeatures.map((feat) => (
              <div key={feat.title} className="flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary-light flex items-center justify-center flex-shrink-0">
                  {feat.icon}
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-neutral-900">{feat.title}</h4>
                  <p className="text-xs text-neutral-600 leading-relaxed">{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: LOGIN FORM */}
        <div className="w-full lg:w-[420px] flex-shrink-0">
          <Card className="p-8 shadow-xl border-neutral-200/50 space-y-6">
            <div className="text-center space-y-1">
              <h3 className="text-xl font-extrabold text-neutral-900">Đăng nhập hệ thống</h3>
              <p className="text-xs text-neutral-600">
                Nhập tài khoản được cấp bởi Quản trị viên nhà trường
              </p>
            </div>

            {error && (
              <div className="p-3.5 bg-rose-50 border border-danger/20 text-danger text-xs font-semibold rounded-lg flex items-center gap-2">
                <svg className="w-4.5 h-4.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Địa chỉ Email"
                id="email-input"
                type="email"
                placeholder="e.g. admin@edulms.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <Input
                label="Mật khẩu"
                id="password-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-neutral-600">
                  <input
                    type="checkbox"
                    className="rounded border-neutral-200 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                  />
                  Ghi nhớ đăng nhập
                </label>
                <span
                  onClick={() => navigate("/activate")}
                  className="font-bold text-primary hover:text-primary-hover hover:underline cursor-pointer"
                >
                  Kích hoạt tài khoản mới
                </span>
              </div>

              <Button type="submit" variant="primary" className="w-full font-bold py-2.5 mt-2" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Đang đăng nhập...
                  </>
                ) : (
                  "Đăng Nhập"
                )}
              </Button>
            </form>

            {/* Quick Login reference list */}
            <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg space-y-1.5">
              <p className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">Tài khoản thử nghiệm:</p>
              <div className="text-[11px] text-neutral-600 font-medium space-y-1 leading-normal">
                <p>🔑 <span className="font-semibold">admin@edulms.edu</span> (Mật khẩu bất kỳ)</p>
                <p>🔑 <span className="font-semibold">teacher@edulms.edu</span> (Mật khẩu bất kỳ)</p>
                <p>🔑 <span className="font-semibold">student@edulms.edu</span> (Mật khẩu bất kỳ)</p>
                <p>🔑 <span className="font-semibold">parent@edulms.edu</span> (Mật khẩu bất kỳ)</p>
              </div>
            </div>
          </Card>
        </div>
      </main>

      {/* GUEST FOOTER */}
      <footer className="bg-neutral-900 text-neutral-400 py-12 px-6 border-t border-neutral-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-8 text-sm">
          <div className="space-y-3 max-w-sm">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary text-white font-extrabold flex items-center justify-center text-lg">
                E
              </div>
              <h2 className="text-white font-bold text-lg">EduLMS</h2>
            </div>
            <p className="text-xs leading-relaxed text-neutral-500">
              Hệ thống quản lý học tập thông minh trực thuộc Sở Giáo dục và Đào tạo. 
              Áp dụng công nghệ tiên tiến nâng cao tương tác giảng dạy trong nhà trường THPT.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="text-white font-bold text-xs uppercase tracking-widest mb-1.5">Thông tin liên hệ</h4>
            <p>📍 Địa chỉ: 123 Võ Văn Ngân, TP. Thủ Đức, TP. Hồ Chí Minh</p>
            <p>📞 Điện thoại: 1900 12xx | Fax: (028) 3896-xxxx</p>
            <p>✉️ Email hỗ trợ kỹ thuật: hotro@edulms.edu</p>
          </div>

          <div className="space-y-2">
            <h4 className="text-white font-bold text-xs uppercase tracking-widest mb-1.5">Liên kết nhanh</h4>
            <p className="hover:text-white transition-colors cursor-pointer">Cổng thông tin Sở GD&ĐT</p>
            <p className="hover:text-white transition-colors cursor-pointer">Hướng dẫn sử dụng hệ thống</p>
            <p className="hover:text-white transition-colors cursor-pointer">Điều khoản dịch vụ bảo mật</p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-8 pt-8 border-t border-neutral-800 text-center text-xs text-neutral-500">
          <p>© {new Date().getFullYear()} EduLMS. Bảo lưu mọi quyền.</p>
        </div>
      </footer>
    </div>
  );
}
