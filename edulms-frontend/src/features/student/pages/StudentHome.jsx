import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import academicService from "../../../services/academicService";
import Button from "../../../components/common/Button";
import Footer from "../../../components/common/Footer";
import {
  BookOpen,
  Calendar,
  ClipboardList,
  Award,
  Clock,
  UserCheck,
  Search,
  ArrowRight,
  Sparkles,
  ChevronRight,
  GraduationCap,
  Bell,
  CheckCircle2,
} from "lucide-react";
import heroBg from "../../../assets/hero-bg.webp";

// Sample fallback courses for rich display if API return is empty
const DEMO_STUDENT_COURSES = [
  {
    id: "course-1",
    title: "Toán Học 12 - Đại Số & Giải Tích Nâng Cao",
    code: "MATH12",
    teacher: "ThS. Nguyễn Văn Toán",
    teacherAvatar: "N",
    category: "Toán Học",
    lessonsCount: 48,
    studentsCount: 38,
    status: "Đang diễn ra",
    progress: 75,
    badge: "Học kỳ I",
    image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "course-2",
    title: "Vật Lý 11 - Điện Tích & Dòng Điện Không Đổi",
    code: "PHYS11",
    teacher: "Cô Lê Thị Mai",
    teacherAvatar: "L",
    category: "Vật Lý",
    lessonsCount: 42,
    studentsCount: 40,
    status: "Đang diễn ra",
    progress: 60,
    badge: "Học kỳ I",
    image: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "course-3",
    title: "Hóa Học 10 - Cấu Tạo Nguyên Tử & Liên Kết",
    code: "CHEM10",
    teacher: "ThS. Trần Hoàng Nam",
    teacherAvatar: "T",
    category: "Hóa Học",
    lessonsCount: 36,
    studentsCount: 42,
    status: "Đang diễn ra",
    progress: 85,
    badge: "Học kỳ I",
    image: "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "course-4",
    title: "Ngữ Văn 12 - Tác Phẩm Văn Học Trọng Tâm THPT",
    code: "LIT12",
    teacher: "Cô Phan Minh Anh",
    teacherAvatar: "P",
    category: "Ngữ Văn",
    lessonsCount: 52,
    studentsCount: 38,
    status: "Đang diễn ra",
    progress: 50,
    badge: "Luyện Thi THPTQG",
    image: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "course-5",
    title: "Tiếng Anh 12 - Ôn Luyện Đề THPT Quốc Gia",
    code: "ENG12",
    teacher: "ThS. Đặng Thị Hồng",
    teacherAvatar: "D",
    category: "Ngoại Ngữ",
    lessonsCount: 60,
    studentsCount: 45,
    status: "Đang diễn ra",
    progress: 90,
    badge: "Bấm giờ tự động",
    image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80",
  },
];

export default function StudentHome() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    fetchStudentCourses();
  }, []);

  const fetchStudentCourses = async () => {
    setLoading(true);
    try {
      const res = await academicService.getTeachingAssignments();
      const rawData = res.data?.data || res.data || [];

      if (Array.isArray(rawData) && rawData.length > 0) {
        const formatted = rawData.map((item, idx) => {
          const sub = item.subjectRef || {};
          const teacher = item.teacherRef || {};
          const cls = item.classRef || {};

          return {
            id: item._id || `sub-${idx}`,
            title: sub.name || `Môn học ${idx + 1}`,
            code: sub.code || "SUBJ",
            teacher: teacher.name || "Giáo viên bộ môn",
            teacherAvatar: (teacher.name || "G").charAt(0).toUpperCase(),
            category: sub.category || "Môn học chính",
            className: cls.name || "",
            lessonsCount: sub.totalLessons || 40,
            studentsCount: cls.totalStudents || 35,
            status: "Đang diễn ra",
            badge: cls.name ? `Lớp ${cls.name}` : "Học kỳ I",
            image:
              DEMO_STUDENT_COURSES[idx % DEMO_STUDENT_COURSES.length].image,
          };
        });
        setAssignments(formatted);
      } else {
        setAssignments(DEMO_STUDENT_COURSES);
      }
    } catch (err) {
      console.warn("Could not load teaching assignments, using demo data:", err);
      setAssignments(DEMO_STUDENT_COURSES);
    } finally {
      setLoading(false);
    }
  };

  const studentName = user?.name || "Học sinh";
  const studentCode = user?.studentCode || user?.userCode || "HS-2026";
  
  // Resolve class name dynamically from logged in user or fetched teaching assignments
  const detectedClass =
    (typeof user?.classRef === "object" ? user?.classRef?.name : user?.classRef) ||
    (assignments.length > 0 && assignments[0]?.className ? assignments[0].className : null);

  const className = detectedClass ? (detectedClass.startsWith("Lớp") ? detectedClass : `Lớp ${detectedClass}`) : "Chưa xếp lớp";

  // Filter courses
  const filteredCourses = assignments.filter((course) => {
    const matchesSearch =
      searchQuery.trim() === "" ||
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.teacher.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col font-sans -mx-4 sm:-mx-6 -mt-6">
      {/* HERO BANNER - GUEST LANDING STYLE FOR LOGGED IN STUDENT */}
      <section className="relative overflow-hidden bg-neutral-950 text-white min-h-[460px] lg:min-h-[500px] flex items-center">
        {/* Background Image Container with Gradient Overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 transform scale-105"
          style={{ backgroundImage: `url(${heroBg})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-950/95 via-neutral-950/90 to-indigo-950/80 backdrop-blur-[1px]" />

        {/* Ambient Decorative Glows */}
        <div className="absolute top-1/4 left-10 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Hero Content */}
        <div className="relative z-10 max-w-7xl w-full mx-auto px-6 py-12 lg:py-16 grid lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-5 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md text-xs font-semibold text-neutral-200">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Cổng Thông Tin Học Sinh THPT</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span className="text-emerald-300 font-bold">{className}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-outfit tracking-tight leading-tight text-white">
              Chào mừng trở lại, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 via-primary-light to-white">
                {studentName}!
              </span>
            </h1>

            <p className="text-sm sm:text-base text-neutral-300 leading-relaxed max-w-xl font-normal">
              Theo dõi lộ trình học tập, hoàn thành bài tập trắc nghiệm trực tuyến, tra cứu điểm số và cập nhật thời khóa biểu giảng dạy của bạn một cách nhanh chóng.
            </p>

            {/* Quick Action CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button
                variant="primary"
                className="px-5 py-3 text-xs font-bold rounded-xl shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all flex items-center gap-2"
                onClick={() => navigate("/student/courses")}
              >
                <BookOpen className="w-4 h-4" />
                <span>Vào danh sách khóa học</span>
              </Button>
              <Button
                variant="secondary"
                className="px-5 py-3 text-xs font-bold rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 backdrop-blur-md transition flex items-center gap-2"
                onClick={() => navigate("/student/schedule")}
              >
                <Calendar className="w-4 h-4" />
                <span>Xem thời khóa biểu</span>
              </Button>
            </div>
          </div>

          {/* Right Floating Glass Card Summary */}
          <div className="lg:col-span-5">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-3xl shadow-2xl space-y-4 text-left">
              <div className="flex items-center justify-between border-b border-white/15 pb-3">
                <div>
                  <h3 className="text-base font-extrabold text-white font-outfit">Hồ sơ Học Sinh</h3>
                  <p className="text-xs text-neutral-300 mt-0.5">Mã số: <strong className="text-white font-mono">{studentCode}</strong></p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10.5px] font-bold">
                  Đang theo học
                </span>
              </div>

              <div className="space-y-2.5">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-300 flex items-center justify-center">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Khóa học đăng ký</p>
                      <p className="text-[10.5px] text-neutral-300">{assignments.length} môn học trong học kỳ</p>
                    </div>
                  </div>
                  <span className="text-sm font-extrabold text-white">{assignments.length}</span>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
                      <Award className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Điểm rèn luyện GPA</p>
                      <p className="text-[10.5px] text-neutral-300">Đánh giá học kỳ vừa qua</p>
                    </div>
                  </div>
                  <span className="text-sm font-extrabold text-emerald-400">8.6 / 10</span>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center">
                      <ClipboardList className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Bài tập cần nộp</p>
                      <p className="text-[10.5px] text-neutral-300">Hạn chót trong tuần này</p>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    2 bài tập
                  </span>
                </div>
              </div>

              <div className="pt-1">
                <Button
                  variant="primary"
                  className="w-full py-2.5 font-bold text-xs rounded-xl bg-gradient-to-r from-primary to-indigo-600 hover:from-primary-hover hover:to-indigo-700 shadow-md border border-white/20 flex items-center justify-center gap-2"
                  onClick={() => navigate("/student/grades")}
                >
                  <Award className="w-4 h-4" />
                  <span>Tra cứu Bảng Điểm Chi Tiết</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* METRICS STRIP */}
      <section className="bg-white border-b border-neutral-200 py-6 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="p-3 rounded-xl hover:bg-neutral-50 transition">
            <div className="w-10 h-10 rounded-xl bg-primary-light text-primary flex items-center justify-center mx-auto mb-2">
              <BookOpen className="w-5 h-5" />
            </div>
            <p className="text-2xl font-extrabold font-outfit text-neutral-900">{assignments.length}</p>
            <p className="text-xs font-semibold text-neutral-500">Môn học đang theo dõi</p>
          </div>

          <div className="p-3 rounded-xl hover:bg-neutral-50 transition">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2">
              <UserCheck className="w-5 h-5" />
            </div>
            <p className="text-2xl font-extrabold font-outfit text-neutral-900">100%</p>
            <p className="text-xs font-semibold text-neutral-500">Tỷ lệ chuyên cần</p>
          </div>

          <div className="p-3 rounded-xl hover:bg-neutral-50 transition">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-2">
              <ClipboardList className="w-5 h-5" />
            </div>
            <p className="text-2xl font-extrabold font-outfit text-neutral-900">14 / 16</p>
            <p className="text-xs font-semibold text-neutral-500">Bài tập đã hoàn thành</p>
          </div>

          <div className="p-3 rounded-xl hover:bg-neutral-50 transition">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-2">
              <Award className="w-5 h-5" />
            </div>
            <p className="text-2xl font-extrabold font-outfit text-neutral-900">Giỏi</p>
            <p className="text-xs font-semibold text-neutral-500">Xếp loại học lực</p>
          </div>
        </div>
      </section>

      {/* MY ENROLLED COURSES SECTION ("Danh sách các khóa học của học sinh đó") */}
      <section className="py-14 px-6 max-w-7xl mx-auto w-full space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-neutral-200 pb-5">
          <div className="space-y-1.5 text-left">
            <span className="text-xs font-bold uppercase tracking-widest text-primary bg-primary-light px-3 py-1 rounded-full border border-primary/10">
              Khóa Học Của Tôi
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 font-outfit">
              Danh sách khóa học của bạn
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600">
              Các môn học và chuyên đề đã được phân công cho lớp học <strong className="text-neutral-900">{className}</strong> trong học kỳ này.
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="Tìm kiếm khóa học, giáo viên..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-neutral-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            />
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
          </div>
        </div>

        {/* Course Cards Grid */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-80 bg-white rounded-2xl border border-neutral-200 p-4 animate-pulse space-y-4">
                <div className="h-40 bg-neutral-200 rounded-xl"></div>
                <div className="h-4 bg-neutral-200 rounded w-3/4"></div>
                <div className="h-4 bg-neutral-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-neutral-200 space-y-3">
            <BookOpen className="w-12 h-12 text-neutral-300 mx-auto" />
            <p className="text-sm font-semibold text-neutral-600">Không tìm thấy khóa học nào phù hợp.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <div
                key={course.id}
                className="bg-white rounded-2xl border border-neutral-200/90 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col justify-between group"
              >
                <div>
                  {/* Course Image Header */}
                  <div className="relative h-44 w-full overflow-hidden bg-neutral-100">
                    <img
                      src={course.image}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-white/90 backdrop-blur-md text-[10.5px] font-extrabold text-neutral-800 shadow-sm border border-white/50">
                      Mã: {course.code}
                    </span>
                    <span className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-primary/90 text-white backdrop-blur-md text-[10.5px] font-bold shadow-sm">
                      {course.badge}
                    </span>
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-[11px] font-semibold">
                      <span className="bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-md">
                        {course.category}
                      </span>
                      <span className="bg-emerald-500/90 backdrop-blur-md px-2 py-0.5 rounded-md font-bold">
                        {course.status}
                      </span>
                    </div>
                  </div>

                  {/* Course Body */}
                  <div className="p-5 space-y-3 text-left">
                    <h3 className="text-base font-bold text-neutral-900 leading-snug group-hover:text-primary transition-colors line-clamp-2">
                      {course.title}
                    </h3>

                    <div className="flex items-center gap-2 pt-1 border-t border-neutral-100">
                      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs flex-shrink-0">
                        {course.teacherAvatar}
                      </div>
                      <p className="text-xs text-neutral-600 font-medium truncate">
                        Giáo viên: <strong className="text-neutral-900 font-semibold">{course.teacher}</strong>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Course Footer & CTA */}
                <div className="px-5 pb-5 pt-3 flex items-center justify-between border-t border-neutral-100 bg-neutral-50/50">
                  <span className="text-[11px] text-neutral-500 font-medium flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-neutral-400" />
                    {course.lessonsCount} bài học
                  </span>

                  <Button
                    variant="primary"
                    className="text-xs px-3.5 py-1.5 font-bold rounded-lg shadow-sm flex items-center gap-1 hover:scale-105 transition"
                    onClick={() => navigate("/student/courses")}
                  >
                    <span>Vào học</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* QUICK SCHEDULE & UPCOMING ASSIGNMENTS SECTION */}
      <section className="py-12 px-6 bg-neutral-100/80 border-t border-neutral-200">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-8">
          {/* Today's Schedule Card */}
          <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary-light text-primary flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-neutral-900">Lịch Học Hôm Nay</h3>
              </div>
              <Button
                variant="outline"
                className="text-xs px-2.5 py-1 rounded-lg"
                onClick={() => navigate("/student/schedule")}
              >
                Xem tất cả
              </Button>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-md bg-primary text-white text-xs font-bold font-mono">
                    Tiết 1 - 2
                  </span>
                  <div>
                    <p className="text-xs font-bold text-neutral-900">Toán Học 12 (Đại số)</p>
                    <p className="text-[11px] text-neutral-500">Phòng H1-203 • ThS. Nguyễn Văn Toán</p>
                  </div>
                </div>
                <span className="text-[10.5px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  Đã hoàn thành
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-md bg-indigo-600 text-white text-xs font-bold font-mono">
                    Tiết 3 - 4
                  </span>
                  <div>
                    <p className="text-xs font-bold text-neutral-900">Vật Lý 11 (Thực hành)</p>
                    <p className="text-[11px] text-neutral-500">Phòng Lab-02 • Cô Lê Thị Mai</p>
                  </div>
                </div>
                <span className="text-[10.5px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                  Sắp diễn ra
                </span>
              </div>
            </div>
          </div>

          {/* Pending Homework Card */}
          <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <ClipboardList className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-neutral-900">Bài Tập Cần Hoàn Thành</h3>
              </div>
              <Button
                variant="outline"
                className="text-xs px-2.5 py-1 rounded-lg"
                onClick={() => navigate("/student/quizzes")}
              >
                Vào làm bài
              </Button>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/80 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-neutral-900">Trắc nghiệm Khảo sát hàm số (20 câu)</p>
                  <p className="text-[11px] text-neutral-500">Môn Toán • Hạn chót: 23:59 Hôm nay</p>
                </div>
                <Button
                  variant="primary"
                  className="text-xs px-3 py-1 rounded-lg shadow-sm"
                  onClick={() => navigate("/student/quizzes")}
                >
                  Làm ngay
                </Button>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/80 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-neutral-900">Bài đọc hiểu Tiếng Anh Unit 4</p>
                  <p className="text-[11px] text-neutral-500">Môn Tiếng Anh • Hạn chót: Ngày mai</p>
                </div>
                <Button
                  variant="outline"
                  className="text-xs px-3 py-1 rounded-lg"
                  onClick={() => navigate("/student/quizzes")}
                >
                  Xem đề
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <Footer />
    </div>
  );
}
