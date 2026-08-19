import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../../components/common/Button";
import {
  Building2,
  FileText,
  Search,
  ArrowLeft,
  ChevronRight,
  Calendar,
  Tag,
  BookOpen,
  Award,
  Bell,
  Download,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  Users,
  GraduationCap,
  ArrowUp
} from "lucide-react";
import { useEffect } from "react";

export default function EduPortalPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
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

  const NEWS_ARTICLES = [
    {
      id: 1,
      category: "Chỉ đạo",
      badge: "Thông báo Sở GD&ĐT",
      title: "Triển khai Chương trình Chuyển đổi số Giáo dục THPT năm học 2026-2027",
      date: "08/08/2026",
      summary: "Sở Giáo dục & Đào tạo công bố định hướng chuẩn hóa sổ điểm điện tử, thời khóa biểu số và kết nối Phụ huynh trên hệ thống EduLMS.",
      author: "Ban Biên Tập Cổng Thông Tin",
      readTime: "5 phút đọc",
      url: "https://giaoduc.net.vn/bo-gddt-huong-dan-thuc-hien-nhiem-vu-giao-duc-pho-thong-nam-hoc-2026-2027-post261950.gd"
    },
    {
      id: 2,
      category: "Thi cử",
      badge: "Kế hoạch Thi cử",
      title: "Hướng dẫn Tổ chức Thi thử Tốt nghiệp THPT & Đánh giá Năng lực Trực tuyến",
      date: "05/08/2026",
      summary: "Chi tiết quy chế tổ chức thi trắc nghiệm trực tuyến bấm giờ, bảo mật ngân hàng đề thi và quy trình tự động chấm điểm.",
      author: "Phòng Khảo Thí & Kiểm Định",
      readTime: "7 phút đọc",
      url: "https://thuvienphapluat.vn/lao-dong-tien-luong/so-gddt-huong-dan-to-chuc-thi-thu-ky-thi-tot-nghiep-thpt-nam-2026-59864.html"
    },
    {
      id: 3,
      category: "Chuyên môn",
      badge: "Hội đồng Sư phạm",
      title: "Hội thảo Tập huấn Ứng dụng Học tập Số & Soạn Bài giảng Điện tử THPT",
      date: "02/08/2026",
      summary: "Tăng cường năng lực ứng dụng CNTT cho Giáo viên bộ môn trong việc thiết lập bài học PDF/Video và bài tập nộp tự luận.",
      author: "Phòng Giáo Dục Phổ Thông",
      readTime: "4 phút đọc",
      url: "https://thptdoican.thainguyen.edu.vn/tin-tuc-su-kien/-tap-huan-cong-nghe-thong-tin-ung-dung-ai-trong-soan-giang-va-nang-cao-nang-luc-so-cho-giao-vien-truong-thpt-doi-can-.html"
    },
    {
      id: 4,
      category: "Công nghệ",
      badge: "An toàn Dữ liệu",
      title: "Tiêu chuẩn Bảo mật Thông tin Học sinh & Mã hóa Sổ điểm SSL 256-bit",
      date: "28/07/2026",
      summary: "Quy định mã hóa dữ liệu rèn luyện, bảo vệ quyền riêng tư học sinh và kiểm soát phân quyền 4 vai trò nghiêm ngặt.",
      author: "Trung Tâm CNTT Giáo Dục",
      readTime: "6 phút đọc",
      url: "https://thuvienphapluat.vn/van-ban/Cong-nghe-thong-tin/Thong-tu-96-2023-TT-BQP-Quy-chuan-dac-tinh-ky-thuat-mat-ma-su-dung-trong-san-pham-bao-mat-du-lieu-luu-giu-588676.aspx"
    },
    {
      id: 5,
      category: "Văn bản",
      badge: "Văn bản Chỉ đạo",
      title: "Quyết định 1024/QĐ-SGDĐT về việc Ban hành Quy chế Quản lý Sổ điểm Điện tử",
      date: "20/07/2026",
      summary: "Ban hành các biểu mẫu điểm số (hệ số 1, hệ số 2, hệ số 3) và quy trình ký duyệt học kỳ trực tiếp trên EduLMS.",
      author: "Văn Phòng Sở GD&ĐT",
      readTime: "8 phút đọc",
      url: "https://thuvienphapluat.vn/cong-van/Giao-duc/Cong-van-1121-SGDDT-KTKD-2022-thi-tuyen-sinh-vao-lop-10-So-Giao-duc-Ho-Chi-Minh-510805.aspx"
    }
  ];

  const OFFICIAL_DOCUMENTS = [
    {
      code: "VB-1024/SGDĐT-GDPT",
      title: "Quy chế Quản lý & Sử dụng Sổ điểm Điện tử trong các Trường THPT",
      date: "20/07/2026",
      type: "PDF (1.2 MB)",
      status: "Có hiệu lực",
      url: "https://moet.gov.vn/van-ban/van-ban-chi-dao-dieu-hanh/"
    },
    {
      code: "VB-856/SGDĐT-KTKĐ",
      title: "Hướng dẫn Tổ chức Kiểm tra Đánh giá Định kỳ & Ngân hàng Đề thi Trắc nghiệm",
      date: "15/07/2026",
      type: "PDF (850 KB)",
      status: "Có hiệu lực",
      url: "https://moet.gov.vn/van-ban/van-ban-chi-dao-dieu-hanh/"
    },
    {
      code: "VB-612/SGDĐT-CNTT",
      title: "Quy chuẩn Bảo an Dữ liệu Cá nhân Học sinh & Cổng Kết nối Phụ huynh Số",
      date: "02/06/2026",
      type: "PDF (2.1 MB)",
      status: "Có hiệu lực",
      url: "https://moet.gov.vn/van-ban/van-ban-chi-dao-dieu-hanh/"
    }
  ];

  const filteredNews = NEWS_ARTICLES.filter((article) => {
    const matchesCategory = selectedCategory === "all" || article.category === selectedCategory;
    const matchesSearch =
      searchQuery.trim() === "" ||
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.summary.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="bg-neutral-50 text-neutral-800 font-sans flex flex-col selection:bg-primary selection:text-white">
      {/* HERO SECTION */}
      <section className="bg-gradient-to-b from-neutral-100 via-neutral-50 to-neutral-50 border-b border-neutral-200/80 py-12 px-6">
        <div className="max-w-7xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-light text-primary border border-primary/15 text-xs font-semibold shadow-sm">
            <Building2 className="w-4 h-4 text-primary" />
            <span>Cổng Thông Tin Sở Giáo Dục & Đào Tạo THPT</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-outfit text-neutral-900 tracking-tight">
            Thông Tin Giáo Dục & Văn Bản Chỉ Đạo
          </h1>

          <p className="max-w-2xl mx-auto text-xs sm:text-sm text-neutral-600 leading-relaxed">
            Kênh thông tin chính thức cập nhật văn bản chỉ đạo, tin tức đổi mới giảng dạy và hướng dẫn chuyên môn dành cho Nhà trường, Giáo viên, Học sinh & Phụ huynh.
          </p>

          {/* Quick Search */}
          <div className="max-w-xl mx-auto pt-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Tìm kiếm văn bản chỉ đạo, thông báo sở GD&ĐT, lịch thi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white border border-neutral-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary shadow-sm text-neutral-900"
              />
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3.5" />
            </div>
          </div>
        </div>
      </section>

      {/* METRICS STRIP */}
      <section className="bg-white border-b border-neutral-200 py-8 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="space-y-1">
            <Building2 className="w-7 h-7 text-primary mx-auto" />
            <p className="text-2xl sm:text-3xl font-extrabold font-outfit text-neutral-900">120+</p>
            <p className="text-xs font-semibold text-neutral-500">Trường THPT kết nối</p>
          </div>
          <div className="space-y-1">
            <Users className="w-7 h-7 text-primary mx-auto" />
            <p className="text-2xl sm:text-3xl font-extrabold font-outfit text-neutral-900">3,500+</p>
            <p className="text-xs font-semibold text-neutral-500">Cán bộ & Giáo viên</p>
          </div>
          <div className="space-y-1">
            <GraduationCap className="w-7 h-7 text-primary mx-auto" />
            <p className="text-2xl sm:text-3xl font-extrabold font-outfit text-neutral-900">50,000+</p>
            <p className="text-xs font-semibold text-neutral-500">Học sinh Phổ thông</p>
          </div>
          <div className="space-y-1">
            <ShieldCheck className="w-7 h-7 text-primary mx-auto" />
            <p className="text-2xl sm:text-3xl font-extrabold font-outfit text-neutral-900">100%</p>
            <p className="text-xs font-semibold text-neutral-500">Văn bản chỉ đạo số hóa</p>
          </div>
        </div>
      </section>

      {/* CATEGORY TABS STRIP */}
      <section className="bg-white border-b border-neutral-200 py-4 px-6 sticky top-[65px] z-40 backdrop-blur-md bg-white/90 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${selectedCategory === "all"
              ? "bg-primary text-white shadow-md shadow-primary/20"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
          >
            Tất cả tin tức ({NEWS_ARTICLES.length})
          </button>
          <button
            onClick={() => setSelectedCategory("Chỉ đạo")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${selectedCategory === "Chỉ đạo"
              ? "bg-primary text-white shadow-md shadow-primary/20"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
          >
            Chỉ đạo & Định hướng
          </button>
          <button
            onClick={() => setSelectedCategory("Thi cử")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${selectedCategory === "Thi cử"
              ? "bg-primary text-white shadow-md shadow-primary/20"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
          >
            Thi cử & Kiểm định
          </button>
          <button
            onClick={() => setSelectedCategory("Chuyên môn")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${selectedCategory === "Chuyên môn"
              ? "bg-primary text-white shadow-md shadow-primary/20"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
          >
            Chuyên môn Giáo viên
          </button>
          <button
            onClick={() => setSelectedCategory("Công nghệ")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${selectedCategory === "Công nghệ"
              ? "bg-primary text-white shadow-md shadow-primary/20"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
          >
            An toàn & Bảo mật
          </button>
        </div>
      </section>

      {/* MAIN PORTAL GRID */}
      <main className="max-w-7xl mx-auto px-6 py-12 w-full flex-1 space-y-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT NEWS LIST */}
          <section className="lg:col-span-8 space-y-6">
            <h2 className="text-xl font-bold font-outfit text-neutral-900 flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              <span>Tin Tức & Thông Báo Giáo Dục Mới Nhất</span>
            </h2>

            <div className="space-y-4">
              {filteredNews.map((news) => (
                <article
                  key={news.id}
                  className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm hover:shadow-md hover:border-primary/40 transition space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-3">
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-primary-light text-primary border border-primary/15">
                      {news.badge}
                    </span>
                    <span className="text-xs text-neutral-600 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                      <span>{news.date}</span>
                    </span>
                  </div>

                  <a
                    href={news.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block font-bold font-outfit text-neutral-900 text-base sm:text-lg leading-snug hover:text-primary transition"
                  >
                    {news.title}
                  </a>

                  <p className="text-xs text-neutral-600 leading-relaxed">
                    {news.summary}
                  </p>

                  <div className="pt-2 flex items-center justify-between text-xs text-neutral-600 font-medium">
                    <span>{news.author} • {news.readTime}</span>
                    <a
                      href={news.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary font-bold hover:underline inline-flex items-center gap-1"
                    >
                      <span>Xem bài báo gốc</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* RIGHT OFFICIAL DOCUMENTS SIDEBAR */}
          <aside className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <h3 className="font-bold font-outfit text-neutral-900 text-sm uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <span>Văn Bản Quy Phạm Giáo Dục</span>
                </h3>
              </div>

              <div className="space-y-3">
                {OFFICIAL_DOCUMENTS.map((doc, idx) => (
                  <a
                    key={idx}
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/80 space-y-2 hover:border-primary/40 transition group"
                  >
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span className="text-primary">{doc.code}</span>
                      <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{doc.status}</span>
                    </div>
                    <h4 className="text-xs font-bold text-neutral-900 leading-snug group-hover:text-primary transition">
                      {doc.title}
                    </h4>
                    <div className="flex items-center justify-between text-[11px] text-neutral-600 pt-1">
                      <span>{doc.date}</span>
                      <span className="font-semibold text-primary inline-flex items-center gap-1 group-hover:underline">
                        <Download className="w-3 h-3 text-primary" />
                        <span>Tải tệp {doc.type}</span>
                      </span>
                    </div>
                  </a>
                ))}
              </div>

              <div className="pt-2">
                <Button
                  variant="outline"
                  className="w-full text-xs font-bold py-2.5 rounded-xl"
                  onClick={() => navigate("/guide")}
                >
                  Xem hướng dẫn quy trình
                </Button>
              </div>
            </div>

            {/* Support Callout */}
            <div className="bg-gradient-to-br from-primary-light to-indigo-50 p-5 rounded-2xl border border-primary/15 space-y-2 text-xs">
              <h4 className="font-bold text-neutral-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                <span>Liên Hệ Sở GD&ĐT THPT</span>
              </h4>
              <p className="text-neutral-600 text-[11px] leading-relaxed">
                Địa chỉ: 01 Võ Văn Ngân, TP. Thủ Đức, TP. Hồ Chí Minh<br />
                Điện thoại: (028) 3896-xxxx | Email: edulms@gmail.com
              </p>
            </div>
          </aside>
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
