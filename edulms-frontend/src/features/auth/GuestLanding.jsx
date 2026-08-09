import React, { useEffect, useState, useRef } from "react";
import Footer from "../../components/common/Footer";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Button from "../../components/common/Button";
import heroBg from "../../assets/hero-bg.webp";

export default function GuestLanding() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("top");

  const platformMetrics = [
    {
      label: "Học sinh phổ thông",
      value: "50,000+",
      icon: (
        <svg className="w-7 h-7 text-primary mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 01-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
        </svg>
      )
    },
    {
      label: "Giáo viên & Cán bộ",
      value: "3,500+",
      icon: (
        <svg className="w-7 h-7 text-primary mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      label: "Trường THPT kết nối",
      value: "120+",
      icon: (
        <svg className="w-7 h-7 text-primary mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0v-5a2 2 0 012-2h2a2 2 0 012 2v5m-4 0h4" />
        </svg>
      )
    },
    {
      label: "Độ ổn định hệ thống",
      value: "99.9%",
      icon: (
        <svg className="w-7 h-7 text-primary mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    },
  ];

  const lmsFeatures = [
    {
      title: "Sổ điểm điện tử & Hệ số",
      desc: "Hệ thống quản lý điểm số thông minh phân chia chuẩn theo hệ số 1 (miệng, 15 phút), hệ số 2 (1 tiết) và hệ số 3 (học kỳ) quy chuẩn Bộ GD&ĐT.",
      icon: (
        <svg className="w-6 h-6 text-primary group-hover:text-white transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      badge: "Tự động tính GPA"
    },
    {
      title: "Điểm danh & Thời khóa biểu",
      desc: "Theo dõi điểm danh chuyên cần theo từng tiết học (tiết 1-10) và cập nhật thời khóa biểu giảng dạy trực quan tự động theo tuần.",
      icon: (
        <svg className="w-6 h-6 text-primary group-hover:text-white transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      badge: "Cập nhật realtime"
    },
    {
      title: "Ngân hàng đề thi trực tuyến",
      desc: "Tạo và giao đề thi trắc nghiệm bấm giờ tự động chấm điểm, hỗ trợ bài tập tự luận nộp tệp đa phương tiện nhanh chóng.",
      icon: (
        <svg className="w-6 h-6 text-primary group-hover:text-white transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      badge: "Ngân hàng câu hỏi"
    },
    {
      title: "Cổng tương tác Phụ huynh",
      desc: "Cung cấp báo cáo kết quả học tập chi tiết thời gian thực và kênh liên lạc trực tiếp giúp phụ huynh sát sao đồng hành cùng con.",
      icon: (
        <svg className="w-6 h-6 text-primary group-hover:text-white transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      badge: "Sổ liên lạc số"
    },
  ];

  const roleWorkspaces = [
    {
      role: "Ban Giám Hiệu",
      tag: "Admin",
      color: "from-amber-500/20 to-orange-500/20 text-amber-600 border-amber-200",
      badgeColor: "bg-amber-100 text-amber-800",
      desc: "Quản lý cơ cấu học vụ, phân công giảng dạy, duyệt tổ chức lớp và theo dõi báo cáo toàn trường."
    },
    {
      role: "Hội Đồng Sư Phạm",
      tag: "Teacher",
      color: "from-purple-500/20 to-indigo-500/20 text-purple-600 border-purple-200",
      badgeColor: "bg-purple-100 text-purple-800",
      desc: "Quản lý lớp học, soạn bài giảng trực tuyến, chấm điểm bài tập và thực hiện điểm danh từng tiết."
    },
    {
      role: "Học Sinh Phổ Thông",
      tag: "Student",
      color: "from-blue-500/20 to-cyan-500/20 text-blue-600 border-blue-200",
      badgeColor: "bg-blue-100 text-blue-800",
      desc: "Xem thời khóa biểu, tham gia bài học, làm trắc nghiệm trực tuyến và tra cứu kết quả rèn luyện."
    },
    {
      role: "Phụ Huynh Học Sinh",
      tag: "Parent",
      color: "from-emerald-500/20 to-teal-500/20 text-emerald-600 border-emerald-200",
      badgeColor: "bg-emerald-100 text-emerald-800",
      desc: "Theo dõi tình hình điểm danh, xem bảng điểm học kỳ và trao đổi thông tin với giáo viên chủ nhiệm."
    }
  ];

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

  const isClickingNavRef = useRef(false);

  // Theo dõi vị trí cuộn trang để cập nhật active tab tương tự TermsPrivacyPage
  useEffect(() => {
    const handleScroll = () => {
      // Nếu đang trong quá trình cuộn tự động do click tab, bỏ qua cập nhật activeSection
      if (isClickingNavRef.current) return;

      const scrollPosition = window.pageYOffset + 120;
      const sections = [
        { id: "top" },
        { id: "features" },
        { id: "roles" },
      ];

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        if (section.id === "top") {
          if (window.pageYOffset < 300) {
            setActiveSection("top");
            break;
          }
          continue;
        }
        const element = document.getElementById(section.id);
        if (element) {
          const top = element.offsetTop;
          const height = element.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Hàm cuộn trang từ từ mượt mà sử dụng requestAnimationFrame và easeInOutCubic
  const animateScrollTo = (targetPosition, duration = 850, onComplete) => {
    const startPosition = window.pageYOffset;
    const distance = targetPosition - startPosition;
    let startTime = null;

    const easeInOutCubic = (t) => {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    const animationStep = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const timeElapsed = currentTime - startTime;
      const progress = Math.min(timeElapsed / duration, 1);
      const easeProgress = easeInOutCubic(progress);

      window.scrollTo(0, startPosition + distance * easeProgress);

      if (timeElapsed < duration) {
        requestAnimationFrame(animationStep);
      } else {
        if (onComplete) onComplete();
      }
    };

    requestAnimationFrame(animationStep);
  };

  // Xử lý cuộn từ từ đến mục được chọn
  const scrollToSection = (e, id) => {
    if (e && e.preventDefault) e.preventDefault();
    setActiveSection(id);
    isClickingNavRef.current = true;
    if (id === "top") {
      scrollToTop(e);
      return;
    }
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -90;
      const targetY = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      animateScrollTo(targetY, 850, () => {
        isClickingNavRef.current = false;
      });
    } else {
      isClickingNavRef.current = false;
    }
  };

  // Cuộn từ từ lên đầu trang
  const scrollToTop = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setActiveSection("top");
    isClickingNavRef.current = true;
    animateScrollTo(0, 850, () => {
      isClickingNavRef.current = false;
    });
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col font-sans selection:bg-primary selection:text-white" id="top">
      {/* STICKY HEADER */}
      <header className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-neutral-200/80 z-50 px-6 py-3.5 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={(e) => scrollToSection(e, "top")}
          >
            <div className="w-10 h-10 rounded-xl bg-primary text-white font-extrabold font-outfit flex items-center justify-center text-2xl shadow-md shadow-primary/25 group-hover:scale-105 transition-transform">
              E
            </div>
            <div>
              <h1 className="font-outfit font-extrabold text-lg tracking-wide text-neutral-900 leading-none group-hover:text-primary transition-colors">EduLMS</h1>
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block mt-0.5">
                Cổng Quản lý Học tập THPT
              </span>
            </div>
          </div>

          <div className="flex items-center gap-8 text-xs sm:text-sm font-semibold">
            <a
              href="#top"
              onClick={(e) => scrollToSection(e, "top")}
              className={`transition-colors hidden md:block ${activeSection === "top"
                ? "text-primary font-bold border-b-2 border-primary pb-0.5"
                : "text-neutral-600 hover:text-primary"
                }`}
            >
              Giới thiệu
            </a>
            <a
              href="#features"
              onClick={(e) => scrollToSection(e, "features")}
              className={`transition-colors hidden md:block ${activeSection === "features"
                ? "text-primary font-bold border-b-2 border-primary pb-0.5"
                : "text-neutral-600 hover:text-primary"
                }`}
            >
              Tính năng
            </a>
            <a
              href="#roles"
              onClick={(e) => scrollToSection(e, "roles")}
              className={`transition-colors hidden md:block ${activeSection === "roles"
                ? "text-primary font-bold border-b-2 border-primary pb-0.5"
                : "text-neutral-600 hover:text-primary"
                }`}
            >
              Phân hệ vai trò
            </a>
            <div className="h-4 w-px bg-neutral-200 hidden md:block"></div>

            {/* Header Login CTA Button */}
            <Button
              variant="primary"
              className="text-xs px-4 py-2 font-bold rounded-xl shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              onClick={() => navigate("/login")}
            >
              Đăng nhập ngay
            </Button>
          </div>
        </div>
      </header>

      {/* HERO SECTION WITH BACKGROUND IMAGE */}
      <section className="relative overflow-hidden bg-neutral-950 text-white min-h-[580px] lg:min-h-[640px] flex items-center">
        {/* Background Image Container with Overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 transform scale-105"
          style={{ backgroundImage: `url(${heroBg})` }}
        />
        {/* Dark Multi-layer Gradient & Glass Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-950/95 via-neutral-950/85 to-indigo-950/70 backdrop-blur-[1px]" />

        {/* Subtle Decorative Ambient Glows */}
        <div className="absolute top-1/4 left-10 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Hero Main Content */}
        <div className="relative z-10 max-w-7xl w-full mx-auto px-6 py-16 lg:py-24 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-semibold text-primary-light backdrop-blur-md shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>EduLMS v1.0 • Chuyển đổi số Giáo dục THPT</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-outfit tracking-tight leading-tight text-white">
              Đột phá sáng tạo trong <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 via-primary-light to-white">
                Quản lý & Giảng dạy THPT
              </span>
            </h1>

            <p className="text-sm sm:text-base text-neutral-300 leading-relaxed max-w-2xl font-normal">
              EduLMS chuẩn hóa toàn diện trải nghiệm giáo dục trường THPT. Kết nối đồng bộ dữ liệu thời gian thực giữa Ban Giám Hiệu, Giáo viên, Học sinh và Phụ huynh trên một nền tảng số hiện đại.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-3">
              <Button
                variant="primary"
                className="px-6 py-3 text-sm font-bold rounded-xl shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all flex items-center gap-2"
                onClick={() => navigate("/login")}
              >
                <span>Đăng nhập hệ thống</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Button>
              <a
                href="#features"
                onClick={(e) => scrollToSection(e, "features")}
                className="px-5 py-3 text-sm font-semibold rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 backdrop-blur-md transition"
              >
                Khám phá tính năng
              </a>
            </div>
          </div>

          {/* Right Floating Glass Card Overview */}
          <div className="lg:col-span-5">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-7 rounded-3xl shadow-2xl space-y-6 text-left">
              <div className="flex items-center justify-between border-b border-white/15 pb-4">
                <div>
                  <h3 className="text-lg font-extrabold text-white font-outfit">Hệ Thống LMS Tích Hợp</h3>
                  <p className="text-xs text-neutral-300 mt-0.5">Tiêu chuẩn rèn luyện THPT quốc gia</p>
                </div>
                <span className="w-3 h-3 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20" />
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Sổ điểm tự động</p>
                      <p className="text-[10.5px] text-neutral-300">Tính toán hệ số 1 - 2 - 3 chính xác</p>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-300 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Điểm danh tiết học</p>
                      <p className="text-[10.5px] text-neutral-300">Quản lý chuyên cần tiết 1 đến tiết 10</p>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Ngân hàng câu hỏi</p>
                      <p className="text-[10.5px] text-neutral-300">Trắc nghiệm bấm giờ & nộp bài tự luận</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant="primary"
                  className="w-full py-3 font-bold text-xs rounded-xl bg-gradient-to-r from-primary to-indigo-600 hover:from-primary-hover hover:to-indigo-700 shadow-md border border-white/20"
                  onClick={() => navigate("/login")}
                >
                  Truy cập Cổng Giáo Viên & Học Sinh
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* METRICS STRIP */}
      <section className="bg-white border-y border-neutral-200 py-8 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {platformMetrics.map((item) => (
            <div key={item.label} className="space-y-1">
              <div className="text-2xl mb-1">{item.icon}</div>
              <p className="text-2xl sm:text-3xl font-extrabold font-outfit text-neutral-900">{item.value}</p>
              <p className="text-xs font-semibold text-neutral-500">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CORE FEATURES SECTION */}
      <section className="scroll-mt-20 py-16 px-6 max-w-7xl mx-auto w-full space-y-12" id="features">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-primary bg-primary-light px-3 py-1 rounded-full border border-primary/10">
            Tính Năng Cốt Lõi
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 font-outfit">
            Giải Pháp Đột Phá Cho Nhà Trường Số
          </h2>
          <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
            Hệ thống hỗ trợ toàn diện công tác quản lý chuyên môn giáo dục, rèn luyện học sinh và trao đổi thông tin nhà trường.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {lmsFeatures.map((feat) => (
            <div
              key={feat.title}
              className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 space-y-4 flex flex-col justify-between group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-primary-light flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                    {feat.icon}
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-600 border border-neutral-200">
                    {feat.badge}
                  </span>
                </div>
                <h3 className="text-base font-bold text-neutral-900 group-hover:text-primary transition-colors">
                  {feat.title}
                </h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  {feat.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ROLE WORKSPACES SECTION */}
      <section className="scroll-mt-20 py-16 px-6 bg-neutral-100/70 border-y border-neutral-200" id="roles">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-primary bg-primary-light px-3 py-1 rounded-full border border-primary/10">
              Phân Hệ Vai Trò
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 font-outfit">
              Tối Ưu Trải Nghiệm Theo Đúng Vai Trò
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
              Mỗi người dùng đều có giao diện làm việc được thiết kế tối ưu cho chức năng nhiệm vụ riêng biệt.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {roleWorkspaces.map((rw) => (
              <div
                key={rw.role}
                className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm hover:shadow-md transition space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md ${rw.badgeColor}`}>
                    {rw.tag}
                  </span>
                </div>
                <h3 className="text-base font-bold text-neutral-900">{rw.role}</h3>
                <p className="text-xs text-neutral-600 leading-relaxed">{rw.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CALL TO ACTION BANNER */}
      <section className="py-16 px-6 max-w-7xl mx-auto w-full">
        <div className="relative overflow-hidden bg-gradient-to-r from-primary to-indigo-800 rounded-3xl p-8 sm:p-12 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-2xl text-left">
            <span className="inline-block text-xs font-extrabold uppercase tracking-wider bg-white/15 px-3 py-1 rounded-full text-white backdrop-blur-md">
              Sẵn Sàng Trải Nghiệm
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-outfit">
              Sẵn sàng hiện đại hóa quy trình dạy & học tại trường THPT?
            </h2>
            <p className="text-xs sm:text-sm text-indigo-100 leading-relaxed">
              Đăng nhập ngay để truy cập hệ thống quản lý học tập EduLMS với đầy đủ tính năng dành cho tài khoản của bạn.
            </p>
          </div>
          <Button
            variant="secondary"
            className="px-8 py-3.5 font-extrabold text-sm rounded-xl bg-white text-primary hover:bg-neutral-100 shadow-lg shrink-0 transition"
            onClick={() => navigate("/login")}
          >
            Đăng nhập ngay
          </Button>
        </div>
      </section>

      {/* FOOTER */}
      <Footer />
    </div>
  );
}
