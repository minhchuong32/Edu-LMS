import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../../components/common/Button";
import Footer from "../../components/common/Footer";
import {
  BookOpen,
  GraduationCap,
  School,
  UserCheck,
  ShieldCheck,
  FileText,
  CheckCircle2,
  HelpCircle,
  Search,
  ArrowLeft,
  ChevronRight,
  Clock,
  Mail,
  Phone,
  MapPin,
  Sparkles,
  Layers,
  Check,
  ExternalLink,
  ArrowUp
} from "lucide-react";
import { useEffect } from "react";

export default function SystemGuidePage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.pageYOffset > 300) {
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const animateScrollTo = (targetPosition, duration = 850) => {
    const startPosition = window.pageYOffset;
    const distance = targetPosition - startPosition;
    let startTime = null;

    const easeInOutCubic = (t) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const animationStep = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const timeElapsed = currentTime - startTime;
      const progress = Math.min(timeElapsed / duration, 1);
      const easeProgress = easeInOutCubic(progress);

      window.scrollTo(0, startPosition + distance * easeProgress);

      if (timeElapsed < duration) {
        requestAnimationFrame(animationStep);
      }
    };

    requestAnimationFrame(animationStep);
  };

  const scrollToTop = () => {
    animateScrollTo(0, 850);
  };

  const GUIDE_STEPS = [
    {
      id: "student-activate",
      role: "student",
      roleLabel: "Học Sinh",
      stepNumber: "1.1",
      title: "Kích hoạt Tài khoản & Đăng nhập bằng Mã Học Sinh",
      summary: "Hướng dẫn nhận mã định danh (HS-XXXX) từ nhà trường và kích hoạt mật khẩu lần đầu.",
      badge: "Học Sinh",
      icon: <GraduationCap className="w-5 h-5 text-primary" />,
      instructions: [
        "Nhận Mã học sinh (VD: HS-1001) và Mã kích hoạt từ Giáo viên chủ nhiệm.",
        "Truy cập trang Kích hoạt tài khoản tại giao diện Đăng nhập.",
        "Nhập Email cá nhân, Mã định danh và chọn Mật khẩu mới (ít nhất 6 ký tự).",
        "Hoàn tất kích hoạt và đăng nhập vào không gian học tập của Học sinh."
      ]
    },
    {
      id: "student-schedule",
      role: "student",
      roleLabel: "Học Sinh",
      stepNumber: "1.2",
      title: "Xem Thời khóa biểu & Điểm danh tiết học",
      summary: "Tra cứu lịch học trực quan theo từng tiết trong tuần (Tiết 1 đến Tiết 10).",
      badge: "Học Sinh",
      icon: <Clock className="w-5 h-5 text-primary" />,
      instructions: [
        "Vào mục 'Thời khóa biểu' trên thanh điều hướng bên trái.",
        "Xem danh sách môn học, phòng học và tên giáo viên phụ trách theo thứ trong tuần.",
        "Kiểm tra trạng thái chuyên cần tiết học (Có mặt / Vắng mặt / Có phép)."
      ]
    },
    {
      id: "student-assignment",
      role: "student",
      roleLabel: "Học Sinh",
      stepNumber: "1.3",
      title: "Nộp Bài tập Tự luận (File PDF ≤ 10MB)",
      summary: "Quy trình tải tài liệu bài học và nộp bài làm tự luận đính kèm tệp tin.",
      badge: "Học Sinh",
      icon: <FileText className="w-5 h-5 text-primary" />,
      instructions: [
        "Mở mục 'Bài tập' và chọn bài tập được giao bởi giáo viên.",
        "Đọc kỹ yêu cầu bài làm và hạn nộp (Deadline).",
        "Chuyển bài làm của bạn sang định dạng PDF (dung lượng không vượt quá 10MB).",
        "Nhấn nút 'Chọn tệp nộp bài' và xác nhận 'Nộp bài'."
      ]
    },
    {
      id: "student-quiz",
      role: "student",
      roleLabel: "Học Sinh",
      stepNumber: "1.4",
      title: "Làm Bài thi Trắc nghiệm Bấm giờ Trực tuyến",
      summary: "Quy định làm bài thi trắc nghiệm tự động tính giờ và chấm điểm.",
      badge: "Học Sinh",
      icon: <CheckCircle2 className="w-5 h-5 text-primary" />,
      instructions: [
        "Vào mục 'Bài thi trắc nghiệm' khi đến giờ mở đề thi.",
        "Nhấn 'Bắt đầu làm bài' - đồng hồ đếm ngược sẽ tự động kích hoạt.",
        "Chọn câu trả lời trắc nghiệm. Hệ thống tự động lưu từng câu hỏi bạn chọn.",
        "Nhấn 'Nộp bài' trước khi hết giờ. Kết quả điểm số sẽ hiển thị tức thì."
      ]
    },
    {
      id: "teacher-class",
      role: "teacher",
      roleLabel: "Giáo Viên",
      stepNumber: "2.1",
      title: "Quản lý Lớp học & Sổ Điểm Điện tử",
      summary: "Nhập và quản lý điểm số theo đúng hệ số quy chuẩn của Bộ GD&ĐT (Hệ số 1, 2, 3).",
      badge: "Giáo Viên",
      icon: <School className="w-5 h-5 text-indigo-600" />,
      instructions: [
        "Đăng nhập tài khoản Giáo viên và chọn lớp được phân công giảng dạy.",
        "Truy cập 'Sổ điểm' để nhập điểm Miệng/15p (Hệ số 1), 1 Tiết (Hệ số 2) và Học kỳ (Hệ số 3).",
        "Hệ thống tự động tính điểm trung bình môn (GPA) theo thời gian thực.",
        "Xuất sổ điểm lớp dưới dạng tệp Excel hoặc bản in ký duyệt."
      ]
    },
    {
      id: "teacher-attendance",
      role: "teacher",
      roleLabel: "Giáo Viên",
      stepNumber: "2.2",
      title: "Thực hiện Điểm danh Tiết học Trực quan",
      summary: "Điểm danh học sinh chuyên cần nhanh chóng theo từng tiết học trong ngày.",
      badge: "Giáo Viên",
      icon: <Clock className="w-5 h-5 text-indigo-600" />,
      instructions: [
        "Mở mục 'Điểm danh' vào đầu mỗi tiết học.",
        "Danh sách học sinh được hiển thị kèm mã số và hình ảnh đại diện.",
        "Đánh dấu trạng thái: Có mặt, Vắng có phép, hoặc Vắng không phép.",
        "Lưu điểm danh. Thông báo tự động đồng bộ sang cổng Phụ huynh."
      ]
    },
    {
      id: "admin-structure",
      role: "admin",
      roleLabel: "Ban Giám Hiệu",
      stepNumber: "3.1",
      title: "Quản lý Cơ cấu Học vụ & Phân công Giảng dạy",
      summary: "Thiết lập niên khóa, khối lớp, môn học và phân công giáo viên bộ môn.",
      badge: "Admin",
      icon: <ShieldCheck className="w-5 h-5 text-amber-600" />,
      instructions: [
        "Vào Bảng điều khiển Quản trị viên (Admin Workspace).",
        "Khai báo Năm học mới, Danh sách Lớp THPT (VD: 10A1, 11B2, 12C3).",
        "Phân công Giáo viên chủ nhiệm và Giáo viên bộ môn cho từng lớp.",
        "Duyệt sổ điểm và theo dõi báo cáo tỷ lệ rèn luyện rèn luyện toàn trường."
      ]
    },
    {
      id: "parent-portal",
      role: "parent",
      roleLabel: "Phụ Huynh",
      stepNumber: "4.1",
      title: "Cổng Giao tiếp Phụ huynh & Sổ Liên lạc Số",
      summary: "Theo dõi rèn luyện, điểm danh và trao đổi với Giáo viên chủ nhiệm.",
      badge: "Phụ Huynh",
      icon: <UserCheck className="w-5 h-5 text-emerald-600" />,
      instructions: [
        "Đăng nhập bằng tài khoản Phụ huynh được liên kết với Mã học sinh của con.",
        "Tra cứu Nhật ký điểm danh tiết học hàng ngày của con.",
        "Xem Bảng điểm chi tiết các môn học và nhận xét từ giáo viên.",
        "Gửi tin nhắn phản hồi trực tiếp đến Giáo viên chủ nhiệm khi cần."
      ]
    }
  ];

  const filteredGuides = GUIDE_STEPS.filter((item) => {
    const matchesRole = selectedRole === "all" || item.role === selectedRole;
    const matchesSearch =
      searchQuery.trim() === "" ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.summary.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-800 font-sans flex flex-col selection:bg-primary selection:text-white">
      {/* HEADER NAVIGATION */}
      <header className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-neutral-200/80 z-50 px-6 py-3.5 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-primary text-white font-extrabold font-outfit flex items-center justify-center text-2xl shadow-md shadow-primary/25 group-hover:scale-105 transition-transform">
              E
            </div>
            <div>
              <h1 className="font-outfit font-extrabold text-lg tracking-wide text-neutral-900 leading-none group-hover:text-primary transition-colors">
                EduLMS
              </h1>
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block mt-0.5">
                Cổng Hướng Dẫn Sử Dụng Hệ Thống
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-primary transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Trang chủ</span>
            </Link>

            <Link
              to="/terms"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-primary transition"
            >
              <FileText className="w-4 h-4" />
              <span>Điều khoản & Bảo mật</span>
            </Link>

            <Button
              variant="primary"
              className="text-xs px-4 py-2 font-bold rounded-xl shadow-sm shadow-primary/10"
              onClick={() => navigate("/login")}
            >
              Đăng nhập ngay
            </Button>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="bg-gradient-to-b from-neutral-100 via-neutral-50 to-neutral-50 border-b border-neutral-200/80 py-12 px-6">
        <div className="max-w-7xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-light text-primary border border-primary/15 text-xs font-semibold shadow-sm">
            <BookOpen className="w-4 h-4 text-primary" />
            <span>EduLMS Knowledge Base • Tài Liệu Hướng Dẫn Chuẩn THPT</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-outfit text-neutral-900 tracking-tight">
            Hướng Dẫn Sử Dụng Hệ Thống EduLMS
          </h1>

          <p className="max-w-2xl mx-auto text-xs sm:text-sm text-neutral-600 leading-relaxed">
            Tài liệu hướng dẫn thao tác chi tiết từng bước dành cho Ban Giám Hiệu, Giáo viên, Học sinh và Phụ huynh khi tham gia nền tảng quản lý học tập.
          </p>

          {/* Quick Search */}
          <div className="max-w-xl mx-auto pt-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Tìm kiếm quy trình hướng dẫn (VD: Nộp bài tập, Điểm danh, Nhập điểm)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white border border-neutral-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary shadow-sm text-neutral-900"
              />
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3.5" />
            </div>
          </div>
        </div>
      </section>

      {/* ROLE FILTER TABS STRIP */}
      <section className="bg-white border-b border-neutral-200 py-6 px-6 sticky top-[65px] z-40 shadow-xs backdrop-blur-md bg-white/90">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 flex-wrap">
          <button
            onClick={() => setSelectedRole("all")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${selectedRole === "all"
              ? "bg-primary text-white shadow-md shadow-primary/20"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
          >
            Tất cả quy trình ({GUIDE_STEPS.length})
          </button>
          <button
            onClick={() => setSelectedRole("student")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${selectedRole === "student"
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Học sinh</span>
          </button>
          <button
            onClick={() => setSelectedRole("teacher")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${selectedRole === "teacher"
              ? "bg-purple-600 text-white shadow-md shadow-purple-500/20"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
          >
            <School className="w-4 h-4" />
            <span>Giáo viên</span>
          </button>
          <button
            onClick={() => setSelectedRole("admin")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${selectedRole === "admin"
              ? "bg-amber-600 text-white shadow-md shadow-amber-500/20"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Ban Giám Hiệu</span>
          </button>
          <button
            onClick={() => setSelectedRole("parent")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${selectedRole === "parent"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Phụ huynh</span>
          </button>
        </div>
      </section>

      {/* MAIN GUIDES GRID SECTION */}
      <main className="max-w-7xl mx-auto px-6 py-12 w-full flex-1 space-y-8">
        {filteredGuides.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-neutral-200 text-center space-y-3">
            <HelpCircle className="w-10 h-10 text-neutral-300 mx-auto" />
            <h3 className="text-base font-bold text-neutral-900">Không tìm thấy tài liệu phù hợp</h3>
            <p className="text-xs text-neutral-500">
              Vui lòng thử lại với từ khóa khác hoặc chuyển sang xem tất cả quy trình.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredGuides.map((guide) => (
              <div
                key={guide.id}
                className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm hover:shadow-md transition space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-primary-light flex items-center justify-center">
                        {guide.icon}
                      </div>
                      <span className="text-xs font-extrabold text-primary uppercase tracking-wider">
                        Mục {guide.stepNumber}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200">
                      {guide.badge}
                    </span>
                  </div>

                  <h3 className="text-base font-bold font-outfit text-neutral-900 leading-snug">
                    {guide.title}
                  </h3>

                  <p className="text-xs text-neutral-600 leading-relaxed">
                    {guide.summary}
                  </p>

                  {/* Step-by-step Bullet Points */}
                  <div className="pt-2 space-y-2 bg-neutral-50 p-4 rounded-xl border border-neutral-200/80">
                    <h5 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">Các bước thực hiện:</h5>
                    <ol className="space-y-1.5 text-xs text-neutral-700 pl-1">
                      {guide.instructions.map((ins, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="w-4 h-4 rounded-full bg-primary/10 text-primary font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <span>{ins}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>

                <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-xs">
                  <span className="text-neutral-600">Đã cập nhật cho EduLMS v1.0</span>
                  <button
                    onClick={() => navigate("/login")}
                    className="text-primary font-bold hover:underline flex items-center gap-1"
                  >
                    <span>Thực hành ngay</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Support Help Banner */}
        <div className="bg-gradient-to-r from-primary to-indigo-800 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl text-left">
            <h3 className="text-xl font-bold font-outfit">Cần Hỗ Trợ Trực Tiếp Từ Bộ Phận Kỹ Thuật?</h3>
            <p className="text-xs text-indigo-100 leading-relaxed">
              Nếu gặp sự cố đăng nhập hoặc cần hướng dẫn chi tiết riêng cho trường THPT của bạn, vui lòng liên hệ tổng đài hỗ trợ.
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <Button
              variant="secondary"
              className="px-5 py-2.5 text-xs font-bold rounded-xl bg-white text-primary hover:bg-neutral-100 shadow-md"
              onClick={() => navigate("/login")}
            >
              Đăng nhập hỗ trợ
            </Button>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <Footer />

      {/* FLOATING BACK TO TOP BUTTON */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          aria-label="Cuộn lên đầu trang"
          className="fixed bottom-8 right-8 z-50 p-3 rounded-2xl bg-primary text-white shadow-xl shadow-primary/30 hover:bg-primary-hover hover:scale-110 active:scale-95 transition-all"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
