import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../../components/common/Button";
import {
  Shield,
  ShieldCheck,
  Lock,
  Ban,
  FileCheck,
  Calendar,
  Tag,
  CheckCircle2,
  Info,
  XCircle,
  Mail,
  Search,
  ArrowUp,
  ChevronRight,
  ArrowLeft,
  FileText,
  UserCheck,
  BookOpen,
  Server,
  Users
} from "lucide-react";

export default function TermsPrivacyPage() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("collection");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState("all"); // "all", "privacy", "terms"
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Danh sách các mục Quy định & Chính sách Bảo mật EduLMS
  const SECTIONS = [
    {
      id: "collection",
      number: "1",
      title: "Thu thập thông tin & Phạm vi sử dụng",
      type: "privacy",
      badge: "Chính sách bảo mật",
      summary: "Các loại dữ liệu học tập, chuyên cần và thông tin cá nhân mà EduLMS thu thập để phục vụ công tác rèn luyện THPT.",
      icon: <Shield className="w-5 h-5 text-primary" />,
      content: (
        <div className="space-y-4 text-neutral-700 leading-relaxed text-sm">
          <p>
            Hệ thống Quản lý Học tập <strong className="text-neutral-900 font-bold">EduLMS</strong> thu thập và xử lý các thông tin cần thiết phục vụ cho việc quản lý rèn luyện, giảng dạy và liên lạc giữa Nhà trường - Giáo viên - Học sinh - Phụ huynh.
          </p>
          <div className="grid sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/80 space-y-1">
              <h5 className="font-bold text-neutral-900 text-xs uppercase tracking-wider text-primary">Thông tin định danh</h5>
              <p className="text-xs text-neutral-600">Họ và tên, Email, Mã học sinh (HS-XXXX), Mã giáo viên (GV-XXXX), Lớp học và Trường THPT trực thuộc.</p>
            </div>
            <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/80 space-y-1">
              <h5 className="font-bold text-neutral-900 text-xs uppercase tracking-wider text-primary">Dữ liệu học tập & Chuyên cần</h5>
              <p className="text-xs text-neutral-600">Bảng điểm số (hệ số 1, hệ số 2, hệ số 3), nhật ký điểm danh theo tiết học (tiết 1-10) và tệp bài tập nộp.</p>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-start gap-3">
            <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-indigo-950 font-medium leading-relaxed">
              <strong>Cam kết sử dụng đúng mục đích:</strong> Mọi thông tin thu thập được chỉ sử dụng duy nhất cho mục đích quản lý chuyên môn giáo dục, rèn luyện rèn luyện và hỗ trợ phụ huynh theo dõi tiến độ rèn luyện của học sinh.
            </p>
          </div>
        </div>
      )
    },
    {
      id: "rbac",
      number: "2",
      title: "Phân quyền truy cập theo vai trò (RBAC)",
      type: "terms",
      badge: "Phân quyền vai trò",
      summary: "Quy định phân quyền dữ liệu nghiêm ngặt giữa Ban Giám Hiệu, Giáo viên, Học sinh và Phụ huynh.",
      icon: <Lock className="w-5 h-5 text-primary" />,
      content: (
        <div className="space-y-4 text-neutral-700 leading-relaxed text-sm">
          <p>
            EduLMS áp dụng mô hình phân quyền bảo mật 4 lớp <strong className="text-neutral-900 font-bold">(Role-Based Access Control)</strong> để đảm bảo thông tin được bảo vệ tối đa:
          </p>
          <div className="space-y-2.5">
            <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/80 flex items-center justify-between text-xs">
              <span className="font-bold text-neutral-900">Ban Giám Hiệu (Admin)</span>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">Quyền quản trị hệ thống & cơ cấu học vụ</span>
            </div>
            <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/80 flex items-center justify-between text-xs">
              <span className="font-bold text-neutral-900">Hội Đồng Sư Phạm (Teacher)</span>
              <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">Quyền nhập điểm, điểm danh & giao bài kiểm tra</span>
            </div>
            <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/80 flex items-center justify-between text-xs">
              <span className="font-bold text-neutral-900">Học Sinh (Student)</span>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">Quyền học tập, làm trắc nghiệm & xem rèn luyện cá nhân</span>
            </div>
            <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/80 flex items-center justify-between text-xs">
              <span className="font-bold text-neutral-900">Phụ Huynh (Parent)</span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Quyền xem điểm danh, sổ điểm & thông báo của con</span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "security",
      number: "3",
      title: "Lưu trữ & Bảo mật dữ liệu",
      type: "privacy",
      badge: "Hạ tầng & Bảo mật",
      summary: "Mã hóa SSL/TLS 256-bit, JWT Token và sao lưu cơ sở dữ liệu định kỳ an toàn.",
      icon: <Server className="w-5 h-5 text-primary" />,
      content: (
        <div className="space-y-4 text-neutral-700 leading-relaxed text-sm">
          <p>
            EduLMS áp dụng tiêu chuẩn bảo mật dữ liệu hàng đầu dành cho nền tảng giáo dục số:
          </p>
          <ul className="list-disc list-inside space-y-2 text-xs text-neutral-600 pl-1">
            <li><strong>Mã hóa kết nối:</strong> Toàn bộ dữ liệu truyền tải giữa máy tính người dùng và máy chủ được mã hóa qua giao thức HTTPS SSL/TLS 256-bit.</li>
            <li><strong>Xác thực phiên làm việc:</strong> Sử dụng JWT Token kết hợp Refresh Token lưu trữ dạng HTTP-Only Cookie ngăn ngừa tấn công XSS/CSRF.</li>
            <li><strong>Mật khẩu người dùng:</strong> Được mã hóa một chiều bằng thuật toán BCrypt trước khi lưu trữ vào cơ sở dữ liệu MongoDB.</li>
            <li><strong>Sao lưu an toàn:</strong> Dữ liệu điểm số và danh mục rèn luyện được sao lưu tự động định kỳ hàng ngày.</li>
          </ul>
        </div>
      )
    },
    {
      id: "submissions",
      number: "4",
      title: "Quy định bài tập & Ngân hàng đề thi",
      type: "terms",
      badge: "Quy định học thuật",
      summary: "Quy chuẩn nộp tệp bài tập tự luận (PDF ≤10MB), làm trắc nghiệm bấm giờ và bảo mật đề thi.",
      icon: <FileText className="w-5 h-5 text-primary" />,
      content: (
        <div className="space-y-4 text-neutral-700 leading-relaxed text-sm">
          <p>
            Hệ thống hỗ trợ quản lý quy trình nộp bài tập và tổ chức thi trực tuyến theo đúng quy định:
          </p>
          <div className="grid sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1">
              <h5 className="font-bold text-neutral-900">Bài tập tự luận</h5>
              <p className="text-neutral-600">Học sinh phải nộp tệp tin định dạng PDF có dung lượng không quá 10MB trước thời hạn quy định.</p>
            </div>
            <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1">
              <h5 className="font-bold text-neutral-900">Bài thi trắc nghiệm</h5>
              <p className="text-neutral-600">Được chấm điểm tự động. Đề thi và đáp án được niêm phong bảo mật cho tới thời điểm mở đề.</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "student-rights",
      number: "5",
      title: "Quyền hạn của Học sinh & Phụ huynh",
      type: "privacy",
      badge: "Quyền lợi người dùng",
      summary: "Quyền tra cứu điểm số, phản hồi kết quả rèn luyện và yêu cầu hỗ trợ kỹ thuật.",
      icon: <UserCheck className="w-5 h-5 text-primary" />,
      content: (
        <div className="space-y-3 text-neutral-700 leading-relaxed text-sm">
          <p>
            Người dùng Học sinh và Phụ huynh trên hệ thống EduLMS được đảm bảo đầy đủ các quyền hạn:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-xs text-neutral-600 pl-1">
            <li>Xem điểm số chi tiết từng môn học và lịch sử điểm danh từng tiết học.</li>
            <li>Gửi yêu cầu phúc khảo hoặc phản hồi sai sót điểm số đến Giáo viên bộ môn.</li>
            <li>Yêu cầu xuất báo cáo rèn luyện học kỳ dưới định dạng bản in hoặc tệp tin số.</li>
            <li>Được hỗ trợ kỹ thuật và khôi phục tài khoản trong trường hợp quên mật khẩu.</li>
          </ul>
        </div>
      )
    },
    {
      id: "copyright",
      number: "6",
      title: "Sở hữu trí tuệ & Bản quyền tài liệu",
      type: "terms",
      badge: "Bản quyền & Pháp lý",
      summary: "Bản quyền các bài giảng điện tử (PDF/Video ≤30MB) thuộc về Giáo viên và Nhà trường THPT.",
      icon: <BookOpen className="w-5 h-5 text-primary" />,
      content: (
        <div className="space-y-4 text-neutral-700 leading-relaxed text-sm">
          <p>
            Tất cả bài giảng điện tử, video hướng dẫn (tối đa 30MB) và ngân hàng câu hỏi do Giáo viên đăng tải lên EduLMS thuộc bản quyền của Giáo viên và Nhà trường THPT quản lý.
          </p>
          <p className="text-xs text-neutral-600">
            Nghiêm cấm hành vi sao chép, mua bán hoặc phát tán tài liệu bài học của trường ra bên ngoài hệ thống khi chưa có sự đồng ý của hội đồng giáo viên.
          </p>
        </div>
      )
    },
    {
      id: "acceptable-behavior",
      number: "7",
      title: "Chuẩn mực hành vi & Trung thực học thuật",
      type: "terms",
      badge: "An toàn học thuật",
      summary: "Nghiêm cấm gian lận thi cử, phát tán nội dung độc hại hoặc can thiệp trái phép hệ thống.",
      icon: <Ban className="w-5 h-5 text-primary" />,
      content: (
        <div className="space-y-3 text-neutral-700 leading-relaxed text-sm">
          <p>Để xây dựng môi trường giáo dục văn minh, người dùng cam kết không thực hiện các hành vi:</p>
          <div className="grid sm:grid-cols-2 gap-2.5 text-xs">
            <div className="p-2.5 rounded-lg bg-rose-50/70 border border-rose-100 text-rose-900 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Gian lận thi cử hoặc nộp bài thay người khác</span>
            </div>
            <div className="p-2.5 rounded-lg bg-rose-50/70 border border-rose-100 text-rose-900 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Tải lên tệp chứa virus hay mã độc</span>
            </div>
            <div className="p-2.5 rounded-lg bg-rose-50/70 border border-rose-100 text-rose-900 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Giả mạo danh tính học sinh, giáo viên hay admin</span>
            </div>
            <div className="p-2.5 rounded-lg bg-rose-50/70 border border-rose-100 text-rose-900 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Tấn công rà quét hoặc can thiệp dữ liệu điểm số</span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "contact",
      number: "8",
      title: "Cập nhật chính sách & Liên hệ pháp lý",
      type: "privacy",
      badge: "Hỗ trợ pháp lý",
      summary: "Quy trình điều chỉnh điều khoản và kênh hỗ trợ kỹ thuật bảo mật EduLMS.",
      icon: <Mail className="w-5 h-5 text-primary" />,
      content: (
        <div className="space-y-4 text-neutral-700 leading-relaxed text-sm">
          <p>
            Chính sách bảo mật này có thể được điều chỉnh định kỳ để phù hợp với các quy định mới của Bộ Giáo dục & Đào tạo. Mọi thay đổi lớn sẽ được thông báo trực tiếp trên hệ thống trước 14 ngày.
          </p>
          <div className="p-4 rounded-xl bg-neutral-900 text-white space-y-2">
            <h5 className="font-bold text-sm font-outfit">Bộ Phận An Toàn Dữ Liệu EduLMS</h5>
            <p className="text-xs text-neutral-300">- Địa chỉ: 01 Võ Văn Ngân, TP. Thủ Đức, TP. Hồ Chí Minh</p>
            <p className="text-xs text-neutral-300">- Email pháp lý & bảo mật: <strong className="text-white">hotro@edulms.edu.vn</strong></p>
            <p className="text-xs text-neutral-300">- Tổng đài kỹ thuật: <strong className="text-white">1900 12xx (8:00 - 17:30)</strong></p>
          </div>
        </div>
      )
    }
  ];

  const isClickingNavRef = useRef(false);

  // Lắng nghe cuộn chuột để làm sáng mục lục bên trái (Scroll Spy)
  useEffect(() => {
    const handleScroll = () => {
      if (window.pageYOffset > 300) {
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }

      // Nếu đang trong quá trình cuộn tự động do click tab, bỏ qua cập nhật activeSection theo vị trí cuộn
      if (isClickingNavRef.current) return;

      const scrollPosition = window.pageYOffset + 140;
      for (let i = SECTIONS.length - 1; i >= 0; i--) {
        const sec = SECTIONS[i];
        const el = document.getElementById(sec.id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(sec.id);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [SECTIONS]);

  // Hàm cuộn mượt bằng requestAnimationFrame (easeInOutCubic)
  const animateScrollTo = (targetPosition, duration = 850, onComplete) => {
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
      } else {
        if (onComplete) onComplete();
      }
    };

    requestAnimationFrame(animationStep);
  };

  const scrollToSection = (id) => {
    setActiveSection(id);
    isClickingNavRef.current = true;
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -90;
      const targetY = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      animateScrollTo(Math.max(0, targetY), 850, () => {
        isClickingNavRef.current = false;
      });
    } else {
      isClickingNavRef.current = false;
    }
  };

  const scrollToTop = () => {
    setActiveSection(SECTIONS[0].id);
    isClickingNavRef.current = true;
    animateScrollTo(0, 850, () => {
      isClickingNavRef.current = false;
    });
  };

  // Filter sections by tab and search query
  const filteredSections = SECTIONS.filter((sec) => {
    const matchesTab = selectedTab === "all" || sec.type === selectedTab;
    const matchesQuery =
      searchQuery.trim() === "" ||
      sec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sec.summary.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesQuery;
  });

  return (
    <div className="bg-neutral-50 text-neutral-800 font-sans flex flex-col selection:bg-primary selection:text-white">
      {/* HERO SECTION */}
      <section className="bg-gradient-to-b from-neutral-100 via-neutral-50 to-neutral-50 border-b border-neutral-200/80 py-12 px-6">
        <div className="max-w-7xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-light text-primary border border-primary/15 text-xs font-semibold shadow-sm">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span>EduLMS Trust Center • Quyền Riêng Tư & An Toàn Dữ Liệu</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-outfit text-neutral-900 tracking-tight">
            Chính Sách Bảo Mật & Điều Khoản Dịch Vụ
          </h1>

          <p className="max-w-2xl mx-auto text-xs sm:text-sm text-neutral-600 leading-relaxed">
            Cam kết minh bạch về cách thức thu thập, bảo vệ dữ liệu rèn luyện học tập của học sinh và tuân thủ các quy chuẩn an toàn thông tin trường THPT.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-neutral-500 pt-2 font-medium">
            <span className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-lg border border-neutral-200 shadow-sm">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <span><strong>Cập nhật lần cuối:</strong> 03/08/2026</span>
            </span>
            <span className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-lg border border-neutral-200 shadow-sm">
              <Tag className="w-3.5 h-3.5 text-primary" />
              <span><strong>Phiên bản:</strong> v2.4 Standard</span>
            </span>
            <span className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-lg border border-neutral-200 shadow-sm">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span><strong>Tiêu chuẩn:</strong> Quy định Bộ GD&ĐT</span>
            </span>
          </div>
        </div>
      </section>

      {/* CORE TRUST PILLARS STRIP */}
      <section className="bg-white border-b border-neutral-200 py-8 px-6">
        <div className="max-w-7xl mx-auto grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-1.5">
            <div className="w-9 h-9 rounded-xl bg-primary-light text-primary flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <h4 className="text-xs font-bold text-neutral-900">Bảo vệ Dữ liệu Học sinh</h4>
            <p className="text-[11px] text-neutral-600 leading-relaxed">Mã hóa kết nối SSL 256-bit bảo vệ tuyệt đối bảng điểm và nhật ký rèn luyện.</p>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-1.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Lock className="w-5 h-5 text-indigo-600" />
            </div>
            <h4 className="text-xs font-bold text-neutral-900">Kiểm soát Phân quyền (RBAC)</h4>
            <p className="text-[11px] text-neutral-600 leading-relaxed">Phân quyền riêng biệt 4 vai trò Admin, Giáo viên, Học sinh và Phụ huynh.</p>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-1.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Ban className="w-5 h-5 text-emerald-600" />
            </div>
            <h4 className="text-xs font-bold text-neutral-900">Không Bán Dữ liệu</h4>
            <p className="text-[11px] text-neutral-600 leading-relaxed">Tuyệt đối không chia sẻ hay kinh doanh thông tin học sinh cho bên thứ ba.</p>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-1.5">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <FileCheck className="w-5 h-5 text-purple-600" />
            </div>
            <h4 className="text-xs font-bold text-neutral-900">Minh bạch & Quyền Hạn</h4>
            <p className="text-[11px] text-neutral-600 leading-relaxed">Phụ huynh và học sinh có quyền tra cứu, xuất báo cáo và yêu cầu hỗ trợ.</p>
          </div>
        </div>
      </section>

      {/* MAIN CONTENT SPLIT GRID */}
      <main className="max-w-7xl mx-auto px-6 py-12 w-full flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* LEFT STICKY NAVIGATION SIDEBAR */}
          <aside className="lg:col-span-4 space-y-5">
            <div className="lg:sticky lg:top-24 space-y-4">
              {/* Search input */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Tìm kiếm quy định & bảo mật..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white border border-neutral-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary shadow-sm text-neutral-900"
                />
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
              </div>

              {/* Filter tabs */}
              <div className="flex bg-neutral-200/60 p-1 rounded-xl gap-1 text-xs font-semibold">
                <button
                  onClick={() => setSelectedTab("all")}
                  className={`flex-1 py-1.5 rounded-lg transition ${selectedTab === "all" ? "bg-white text-primary shadow-sm font-bold" : "text-neutral-600 hover:text-neutral-900"}`}
                >
                  Tất cả ({SECTIONS.length})
                </button>
                <button
                  onClick={() => setSelectedTab("privacy")}
                  className={`flex-1 py-1.5 rounded-lg transition ${selectedTab === "privacy" ? "bg-white text-primary shadow-sm font-bold" : "text-neutral-600 hover:text-neutral-900"}`}
                >
                  Bảo mật
                </button>
                <button
                  onClick={() => setSelectedTab("terms")}
                  className={`flex-1 py-1.5 rounded-lg transition ${selectedTab === "terms" ? "bg-white text-primary shadow-sm font-bold" : "text-neutral-600 hover:text-neutral-900"}`}
                >
                  Điều khoản
                </button>
              </div>

              {/* TOC card */}
              <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                  <h3 className="font-bold text-neutral-900 text-xs uppercase tracking-wider">Mục lục nội dung</h3>
                  <span className="text-[10px] font-bold text-primary bg-primary-light px-2 py-0.5 rounded-md">
                    {filteredSections.length} Mục
                  </span>
                </div>

                <nav aria-label="Mục lục" className="space-y-1 max-h-[calc(100vh-340px)] overflow-y-auto pr-1">
                  {filteredSections.length === 0 ? (
                    <p className="text-xs text-neutral-400 py-3 text-center">Không tìm thấy nội dung phù hợp</p>
                  ) : (
                    filteredSections.map((sec) => {
                      const isActive = activeSection === sec.id;
                      return (
                        <button
                          key={sec.id}
                          onClick={() => scrollToSection(sec.id)}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition text-left ${isActive
                              ? "bg-primary text-white shadow-sm shadow-primary/20"
                              : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                            }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 ${isActive ? "bg-white/20 text-white" : "bg-neutral-100 text-neutral-500"
                              }`}>
                              {sec.number}
                            </span>
                            <span className="truncate">{sec.title}</span>
                          </div>
                          <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${isActive ? "text-white translate-x-0.5" : "text-neutral-400"}`} />
                        </button>
                      );
                    })
                  )}
                </nav>
              </div>

              {/* Support Card */}
              <div className="bg-gradient-to-br from-primary-light to-indigo-50 p-4 rounded-2xl border border-primary/15 space-y-2 text-xs">
                <h4 className="font-bold text-neutral-900 flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-primary shrink-0" />
                  <span>Thắc mắc về bảo mật & điều khoản?</span>
                </h4>
                <p className="text-neutral-600 text-[11px] leading-relaxed">
                  Liên hệ Bộ phận An toàn Dữ liệu EduLMS tại <strong className="text-neutral-900 font-semibold">hotro@edulms.edu.vn</strong>
                </p>
              </div>
            </div>
          </aside>

          {/* RIGHT DETAILED POLICY SECTIONS */}
          <section className="lg:col-span-8 space-y-6">
            {filteredSections.map((sec) => (
              <article
                key={sec.id}
                id={sec.id}
                className="bg-white rounded-2xl border border-neutral-200 p-6 sm:p-8 shadow-sm space-y-4 scroll-mt-24 hover:border-primary/40 transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-neutral-100 gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center shrink-0">
                      {sec.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold text-primary uppercase tracking-wider">
                          Mục {sec.number}
                        </span>
                        <span className="text-neutral-300">•</span>
                        <span className="text-[10px] font-semibold text-neutral-600">
                          {sec.badge}
                        </span>
                      </div>
                      <h2 className="text-lg sm:text-xl font-bold font-outfit text-neutral-900">
                        {sec.title}
                      </h2>
                    </div>
                  </div>
                </div>

                {/* Summary bar */}
                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/80 text-xs text-neutral-700 font-medium flex items-center gap-2">
                  <Info className="w-4 h-4 text-primary shrink-0" />
                  <span><strong>Tóm tắt nội dung:</strong> {sec.summary}</span>
                </div>

                {/* Dynamic Content */}
                <div className="pt-1">
                  {sec.content}
                </div>
              </article>
            ))}

            {/* Commitment Box Footer */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-6 text-center space-y-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg mx-auto font-bold">
                <ShieldCheck className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="font-bold font-outfit text-neutral-900 text-base">Cam Kết Đồng Hành Giáo Dục THPT</h3>
              <p className="text-xs text-neutral-600 max-w-md mx-auto leading-relaxed">
                EduLMS luôn nỗ lực không ngừng nâng cao chất lượng quản lý rèn luyện đi đôi với việc bảo đảm tuyệt đối quyền riêng tư và an toàn thông tin của học sinh.
              </p>
              <div className="pt-2 flex justify-center gap-4 text-xs font-bold text-primary">
                <Link to="/" className="hover:underline flex items-center gap-1">
                  <span>Trở về Trang chủ EduLMS</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>

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
