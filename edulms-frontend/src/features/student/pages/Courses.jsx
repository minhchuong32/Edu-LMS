import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Video,
  FileText,
  Link as LinkIcon,
  FileEdit,
  Paperclip,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Download,
  ExternalLink,
  Maximize2,
  X,
  BookOpen,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  CheckCircle2,
  Circle,
  Check,
  CheckCircle,
  Link2,
  Lightbulb,
  Save,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import lessonContentService from "../../../services/lessonContentService";
import academicService from "../../../services/academicService";
import Button from "../../../components/common/Button";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";

const getFileViewUrl = (url) => {
  if (!url) return "#";
  if (url.startsWith("http")) {
    return `${API_BASE_URL}/upload/file?url=${encodeURIComponent(url)}&mode=view`;
  }
  return url;
};

const getFileDownloadUrl = (url) => {
  if (!url) return "#";
  if (url.startsWith("http")) {
    return `${API_BASE_URL}/upload/file?url=${encodeURIComponent(url)}&mode=download`;
  }
  return url;
};

const CONTENT_TYPES = [
  { value: "video", label: "Video bài giảng", icon: Video, color: "bg-purple-50 text-purple-700 border-purple-200" },
  { value: "document", label: "Tài liệu (PDF/Doc)", icon: FileText, color: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "link", label: "Đường dẫn (Link)", icon: LinkIcon, color: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "exercise", label: "Bài tập / Luyện tập", icon: FileEdit, color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "other", label: "Khác", icon: Paperclip, color: "bg-neutral-100 text-neutral-700 border-neutral-200" },
];

// Rich fallback sample data for interactive demonstration
const DEMO_SUBJECTS = [
  { _id: "sub-1", name: "Toán học - Đại số & Giải tích 12", code: "MATH12" },
  { _id: "sub-2", name: "Vật lý - Điện xoay chiều & Hạt nhân", code: "PHYS12" },
  { _id: "sub-3", name: "Ngữ văn - Tác phẩm văn học 12", code: "LIT12" },
  { _id: "sub-4", name: "Tiếng Anh - Luyện thi THPT QG", code: "ENG12" },
];

const DEMO_LESSONS = {
  "sub-1": [
    {
      _id: "m-1",
      title: "Bài 1: Ứng dụng đạo hàm để khảo sát hàm số",
      description: "Nắm vững lý thuyết tính đơn điệu, cực trị, giá trị lớn nhất và nhỏ nhất của hàm số. Các dạng toán trắc nghiệm trọng tâm thi THPT QG.",
      contentType: "video",
      attachmentUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      order: 1,
      duration: "18:45",
      createdAt: "2026-08-01",
      teacherName: "ThS. Nguyễn Văn Toán",
    },
    {
      _id: "m-2",
      title: "Bài 2: Tài liệu lý thuyết & Đề luyện tập Cực trị Hàm số (PDF)",
      description: "Bộ tài liệu PDF 50 câu hỏi trắc nghiệm cực trị hàm số có đáp án chi tiết và phương pháp giải nhanh bằng máy tính Casio.",
      contentType: "document",
      attachmentUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      order: 2,
      duration: "25 trang",
      createdAt: "2026-08-02",
      teacherName: "ThS. Nguyễn Văn Toán",
    },
    {
      _id: "m-3",
      title: "Bài 3: Khảo sát sự biến thiên và vẽ đồ thị hàm số (Video bài giảng)",
      description: "Hướng dẫn nhận dạng đồ thị hàm số bậc 3, bậc 4 trùng phương, hàm nhất biến và phương pháp giải nhanh bài toán chứa tham số m.",
      contentType: "video",
      attachmentUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
      order: 3,
      duration: "24:10",
      createdAt: "2026-08-03",
      teacherName: "ThS. Nguyễn Văn Toán",
    },
    {
      _id: "m-4",
      title: "Bài 4: Tóm tắt công thức Đạo hàm & Tiệm cận (PDF Ghi nhớ)",
      description: "Bảng tổng hợp công thức tính nhanh đường tiệm cận đứng, tiệm cận ngang và tâm đối xứng của đồ thị.",
      contentType: "document",
      attachmentUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      order: 4,
      duration: "10 trang",
      createdAt: "2026-08-04",
      teacherName: "ThS. Nguyễn Văn Toán",
    },
  ],
  "sub-2": [
    {
      _id: "p-1",
      title: "Bài 1: Đại cương về Dòng điện xoay chiều",
      description: "Hiểu rõ biểu thức điện áp, cường độ dòng điện, công suất tiêu thụ và hệ số công suất cosφ trong mạch RLC nối tiếp.",
      contentType: "video",
      attachmentUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      order: 1,
      duration: "22:15",
      createdAt: "2026-08-01",
      teacherName: "ThS. Trần Thị Lý",
    },
    {
      _id: "p-2",
      title: "Bài 2: Giáo trình Mạch RLC nối tiếp & Hiện tượng Cộng hưởng (PDF)",
      description: "File tài liệu PDF mô phỏng giản đồ Fre-nel, công thức cộng hưởng điện và các dạng bài tập nâng cao 8+.",
      contentType: "document",
      attachmentUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      order: 2,
      duration: "30 trang",
      createdAt: "2026-08-02",
      teacherName: "ThS. Trần Thị Lý",
    },
  ],
  "sub-3": [
    {
      _id: "l-1",
      title: "Bài 1: Phân tích Tác phẩm 'Tây Tiến' - Quang Dũng",
      description: "Phân tích vẻ đẹp bi hùng của người lính Tây Tiến và thiên nhiên Tây Bắc hùng vĩ, thơ mộng qua 4 đoạn thơ.",
      contentType: "document",
      attachmentUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      order: 1,
      duration: "15 trang",
      createdAt: "2026-08-01",
      teacherName: "Cô Phan Thị Văn",
    },
  ],
  "sub-4": [
    {
      _id: "e-1",
      title: "Unit 1: Advanced English Grammar & Reading Comprehension",
      description: "Master complex sentence structures, relative clauses, and speed reading strategies for the national exam.",
      contentType: "video",
      attachmentUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
      order: 1,
      duration: "15:30",
      createdAt: "2026-08-01",
      teacherName: "Mr. David Smith",
    },
  ]
};

// Custom Helper Format Time (seconds to mm:ss)
const formatTime = (seconds) => {
  if (isNaN(seconds) || seconds === null) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
};

// --- SUBCOMPONENT: HTML5 VIDEO PLAYER WITH CONTROLS ---
function HTML5VideoPlayer({ url, title, onVideoEnded }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // Check if URL is YouTube or external embed
  const isYouTube = url && (url.includes("youtube.com") || url.includes("youtu.be"));
  const isVimeo = url && url.includes("vimeo.com");

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [url]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
  };

  const handleSeekChange = (e) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const newMuteState = !isMuted;
    setIsMuted(newMuteState);
    videoRef.current.muted = newMuteState;
  };

  const handleSpeedChange = (rate) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.error("Lỗi xem toàn màn hình:", err);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch((err) => {
        console.error("Lỗi thoát toàn màn hình:", err);
      });
      setIsFullscreen(false);
    }
  };

  // Embed player fallback for YouTube / Vimeo
  if (isYouTube || isVimeo) {
    let embedUrl = url;
    if (isYouTube) {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const match = url.match(regExp);
      const videoId = match && match[2].length === 11 ? match[2] : null;
      embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=0` : url;
    }

    return (
      <div className="relative w-full aspect-video bg-neutral-950 rounded-2xl overflow-hidden shadow-2xl border border-neutral-800">
        <iframe
          src={embedUrl}
          title={title || "Video bài giảng"}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(isPlaying ? false : true)}
      className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-neutral-800 group select-none flex flex-col justify-center items-center"
    >
      {/* HTML5 VIDEO ELEMENT */}
      <video
        ref={videoRef}
        src={url}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => {
          setIsPlaying(false);
          if (onVideoEnded) onVideoEnded();
        }}
        onClick={togglePlay}
        className="w-full h-full object-contain cursor-pointer"
        poster="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80"
      />

      {/* OVERLAY PLAY BUTTON WHEN PAUSED */}
      {!isPlaying && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 m-auto w-20 h-20 rounded-full bg-primary/90 text-white flex items-center justify-center shadow-2xl hover:scale-110 hover:bg-primary transition-all duration-300 backdrop-blur-sm group-hover:opacity-100"
          title="Phát video"
        >
          <Play className="w-10 h-10 fill-current translate-x-0.5 text-white" />
        </button>
      )}

      {/* CUSTOM PLAYER CONTROLS BAR */}
      <div
        className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 transition-opacity duration-300 flex flex-col gap-2 ${
          showControls || !isPlaying ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* PROGRESS SEEK BAR */}
        <div className="relative flex items-center group/scrubber">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeekChange}
            className="w-full h-1.5 bg-neutral-600/60 rounded-lg appearance-none cursor-pointer accent-primary hover:h-2.5 transition-all"
          />
        </div>

        {/* CONTROLS ROW */}
        <div className="flex items-center justify-between text-white text-xs">
          <div className="flex items-center gap-3">
            {/* Play / Pause Toggle */}
            <button
              onClick={togglePlay}
              className="p-1.5 rounded-lg hover:bg-white/20 transition text-white flex items-center justify-center"
              title={isPlaying ? "Tạm dừng" : "Phát"}
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 fill-current text-white" />
              ) : (
                <Play className="w-6 h-6 fill-current text-white" />
              )}
            </button>

            {/* Volume Control */}
            <div className="flex items-center gap-1.5 group/vol">
              <button
                onClick={toggleMute}
                className="p-1.5 rounded-lg hover:bg-white/20 transition text-white flex items-center justify-center"
                title={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-5 h-5 text-rose-400" />
                ) : (
                  <Volume2 className="w-5 h-5 text-white" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 bg-neutral-600/60 rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>

            {/* Time Display */}
            <span className="font-mono text-xs font-semibold text-neutral-300 ml-1">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* RIGHT SIDE CONTROLS: SPEED & FULLSCREEN */}
          <div className="flex items-center gap-3">
            {/* Speed Selector */}
            <div className="relative group/speed">
              <button
                type="button"
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold font-mono transition flex items-center gap-1"
                title="Tốc độ phát"
              >
                <span>{playbackRate}x</span>
              </button>
              <div className="absolute bottom-full right-0 mb-2 hidden group-hover/speed:flex flex-col bg-neutral-900/95 backdrop-blur border border-neutral-700 rounded-xl p-1 shadow-xl z-30">
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => handleSpeedChange(rate)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg hover:bg-primary hover:text-white transition text-left ${
                      playbackRate === rate ? "bg-primary/20 text-primary font-bold" : "text-neutral-300"
                    }`}
                  >
                    {rate}x {rate === 1 ? "(Bình thường)" : ""}
                  </button>
                ))}
              </div>
            </div>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg hover:bg-white/20 transition text-white flex items-center justify-center"
              title="Toàn màn hình"
            >
              {isFullscreen ? (
                <Minimize className="w-5 h-5 text-white" />
              ) : (
                <Maximize className="w-5 h-5 text-white" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- SUBCOMPONENT: PDF VIEWER & DOWNLOAD FRAME ---
function PDFDocumentViewer({ url, title }) {
  const [showModal, setShowModal] = useState(false);

  const viewUrl = getFileViewUrl(url);
  const downloadUrl = getFileDownloadUrl(url);

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden flex flex-col">
      {/* PDF TOOLBAR HEADER */}
      <div className="bg-neutral-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 font-extrabold text-xs flex items-center justify-center flex-shrink-0 border border-rose-500/30">
            <FileText className="w-5 h-5 text-rose-400" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-bold truncate text-white">
              {title || "Tài liệu bài giảng (PDF)"}
            </h3>
            <p className="text-[11px] text-neutral-400">
              Khung xem tài liệu trực tuyến & tải về máy
            </p>
          </div>
        </div>

        {/* TOOLBAR ACTIONS */}
        <div className="flex items-center gap-2">
          {/* Direct Download Button */}
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm"
            title="Tải tệp PDF về máy tính"
          >
            <Download className="w-4 h-4" />
            <span>Tải về PDF</span>
          </a>

          {/* Open In New Tab */}
          <a
            href={viewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition"
            title="Mở tài liệu trên tab mới"
          >
            <ExternalLink className="w-4 h-4" />
            <span className="hidden sm:inline">Mở tab mới</span>
          </a>

          {/* Fullscreen Popup Toggle */}
          <button
            onClick={() => setShowModal(true)}
            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition flex items-center justify-center"
            title="Phóng to toàn màn hình"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* EMBEDDED IFRAME PDF VIEWER */}
      <div className="relative w-full h-[550px] bg-neutral-100">
        {url ? (
          <iframe
            src={`${viewUrl}#toolbar=1&navpanes=0`}
            title={title || "PDF Viewer"}
            className="w-full h-full border-0"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-neutral-400 p-6 text-center">
            <FileText className="w-16 h-16 mb-3 text-neutral-300" strokeWidth={1} />
            <p className="text-sm font-semibold">Tài liệu không có sẵn đính kèm URL</p>
          </div>
        )}
      </div>

      {/* FULLSCREEN POPUP MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-neutral-900/80 backdrop-blur-md flex flex-col p-4">
          <div className="flex items-center justify-between bg-neutral-900 text-white px-4 py-3 rounded-t-2xl border-b border-neutral-800">
            <h4 className="text-sm font-bold truncate">{title}</h4>
            <button
              onClick={() => setShowModal(false)}
              className="p-1.5 rounded-lg bg-neutral-800 text-neutral-300 hover:text-white transition flex items-center gap-1.5 text-xs font-semibold"
            >
              <X className="w-4 h-4" />
              <span>Đóng toàn màn hình</span>
            </button>
          </div>
          <iframe
            src={`${viewUrl}#toolbar=1`}
            title="PDF Fullscreen Modal"
            className="w-full flex-1 rounded-b-2xl border-0 bg-white"
          />
        </div>
      )}
    </div>
  );
}

// --- MAIN PAGE COMPONENT: COURSES / STUDENT LECTURES VIEW ---
export default function Courses() {
  // State for subjects & selected subject
  const [subjects, setSubjects] = useState(DEMO_SUBJECTS);
  const [selectedSubjectId, setSelectedSubjectId] = useState(DEMO_SUBJECTS[0]._id);

  // State for lesson contents & active lesson
  const [lessons, setLessons] = useState(DEMO_LESSONS["sub-1"]);
  const [selectedLesson, setSelectedLesson] = useState(DEMO_LESSONS["sub-1"][0]);

  // UI States
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("overview"); // overview, attachments, notes

  // Student saved notes state per lesson
  const [lessonNotes, setLessonNotes] = useState({});
  const [currentNoteText, setCurrentNoteText] = useState("");

  // Completed lessons tracking state
  const [completedLessons, setCompletedLessons] = useState(() => {
    try {
      const saved = localStorage.getItem("student_completed_lessons");
      return saved ? JSON.parse(saved) : { "m-1": true };
    } catch {
      return { "m-1": true };
    }
  });

  // Fetch student subjects & lessons on mount
  useEffect(() => {
    fetchStudentAcademicData();
  }, []);

  // Update lessons list when subject changes
  useEffect(() => {
    loadLessonsForSubject(selectedSubjectId);
  }, [selectedSubjectId]);

  // Sync note text when active lesson changes
  useEffect(() => {
    if (selectedLesson) {
      setCurrentNoteText(lessonNotes[selectedLesson._id] || "");
    }
  }, [selectedLesson, lessonNotes]);

  const fetchStudentAcademicData = async () => {
    try {
      const res = await academicService.getSubjects();
      const list = res?.data || res || [];
      if (Array.isArray(list) && list.length > 0) {
        setSubjects(list);
        setSelectedSubjectId(list[0]._id);
      }
    } catch (err) {
      console.warn("Dùng danh sách môn học minh họa:", err);
    }
  };

  const loadLessonsForSubject = async (subjectId) => {
    setLoading(true);
    try {
      // Try fetching real API data first
      const res = await lessonContentService.getLessonContents();
      const list = res?.data || res || [];
      
      // Filter lessons matching subject if available
      const subjectLessons = list.filter((item) => {
        const itemSubId = item.teachingAssignmentRef?.subjectRef?._id || item.teachingAssignmentRef?.subjectRef;
        return itemSubId === subjectId;
      });

      if (subjectLessons.length > 0) {
        setLessons(subjectLessons);
        setSelectedLesson(subjectLessons[0]);
      } else if (DEMO_LESSONS[subjectId]) {
        setLessons(DEMO_LESSONS[subjectId]);
        setSelectedLesson(DEMO_LESSONS[subjectId][0]);
      } else {
        setLessons([]);
        setSelectedLesson(null);
      }
    } catch (err) {
      console.warn("Dùng danh sách bài giảng minh họa:", err);
      const fallback = DEMO_LESSONS[subjectId] || [];
      setLessons(fallback);
      setSelectedLesson(fallback[0] || null);
    } finally {
      setLoading(false);
    }
  };

  // Toggle lesson completed state
  const toggleLessonCompleted = (lessonId) => {
    const updated = {
      ...completedLessons,
      [lessonId]: !completedLessons[lessonId],
    };
    setCompletedLessons(updated);
    localStorage.setItem("student_completed_lessons", JSON.stringify(updated));
  };

  // Save student note for lesson
  const handleSaveNote = () => {
    if (!selectedLesson) return;
    const updated = {
      ...lessonNotes,
      [selectedLesson._id]: currentNoteText,
    };
    setLessonNotes(updated);
    alert("✨ Đã lưu ghi chú học tập cá nhân!");
  };

  // Navigation handlers
  const filteredLessons = useMemo(() => {
    return lessons.filter((item) =>
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [lessons, searchTerm]);

  const currentIndex = useMemo(() => {
    if (!selectedLesson) return -1;
    return filteredLessons.findIndex((l) => l._id === selectedLesson._id);
  }, [filteredLessons, selectedLesson]);

  const handleNextLesson = () => {
    if (currentIndex >= 0 && currentIndex < filteredLessons.length - 1) {
      setSelectedLesson(filteredLessons[currentIndex + 1]);
    }
  };

  const handlePrevLesson = () => {
    if (currentIndex > 0) {
      setSelectedLesson(filteredLessons[currentIndex - 1]);
    }
  };

  // Compute progress percentage
  const completedCount = useMemo(() => {
    return lessons.filter((l) => completedLessons[l._id]).length;
  }, [lessons, completedLessons]);

  const progressPercent = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;

  const currentSubject = subjects.find((s) => s._id === selectedSubjectId) || subjects[0];

  return (
    <div className="space-y-5 pb-12 font-sans">
      {/* TOP HEADER BAR: SUBJECT PICKER & PROGRESS */}
      <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-primary/10 text-primary font-bold text-xs px-2.5 py-0.5 rounded-full">
              Học sinh xem Bài giảng
            </span>
            <span className="bg-emerald-100 text-emerald-800 font-bold text-xs px-2.5 py-0.5 rounded-full">
              Tiến độ môn: {progressPercent}% ({completedCount}/{lessons.length} bài)
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-neutral-900">
            {currentSubject ? currentSubject.name : "Danh sách Môn học & Bài giảng"}
          </h1>
        </div>

        {/* SUBJECT SELECTOR DROPDOWN & FOCUS TOGGLE */}
        <div className="flex items-center gap-3">
          <div className="relative min-w-[240px]">
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 text-neutral-900 text-xs font-bold rounded-xl px-3.5 py-2.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition cursor-pointer"
            >
              {subjects.map((sub) => (
                <option key={sub._id} value={sub._id}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>

          <Button
            variant="outline"
            className="py-2 px-3 text-xs flex items-center gap-1.5"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            title="Ẩn/hiện thanh bài giảng bên trái"
          >
            {isSidebarOpen ? (
              <PanelLeftClose className="w-4 h-4" />
            ) : (
              <PanelLeftOpen className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">
              {isSidebarOpen ? "Ẩn danh sách" : "Hiện danh sách"}
            </span>
          </Button>
        </div>
      </div>

      {/* 2-COLUMN MAIN LAYOUT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: SIDEBAR DANH SÁCH BÀI GIẢNG THEO MÔN */}
        {isSidebarOpen && (
          <div className="lg:col-span-4 xl:col-span-4 bg-white rounded-2xl border border-neutral-200 shadow-sm p-4 space-y-4">
            {/* SIDEBAR TITLE & SEARCH */}
            <div className="space-y-3 pb-3 border-b border-neutral-100">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <span>Danh sách bài học</span>
                </h3>
                <span className="text-xs bg-neutral-100 font-extrabold text-neutral-600 px-2 py-0.5 rounded-full">
                  {filteredLessons.length} bài
                </span>
              </div>

              {/* SEARCH INPUT */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Tìm bài học..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-lg outline-none focus:border-primary transition"
                />
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>

              {/* PROGRESS BAR TRACK */}
              <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* LECTURES LIST ITEMS */}
            <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
              {loading ? (
                <div className="py-8 text-center text-xs font-semibold text-neutral-400">
                  Đang tải danh sách bài học...
                </div>
              ) : filteredLessons.length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-500 border border-dashed rounded-xl">
                  Không tìm thấy bài học phù hợp.
                </div>
              ) : (
                filteredLessons.map((item, index) => {
                  const isSelected = selectedLesson?._id === item._id;
                  const isDone = completedLessons[item._id];
                  const typeInfo = CONTENT_TYPES.find((t) => t.value === item.contentType) || CONTENT_TYPES[0];
                  const TypeIcon = typeInfo.icon;

                  return (
                    <div
                      key={item._id}
                      onClick={() => setSelectedLesson(item)}
                      className={`group relative p-3 rounded-xl border transition-all duration-200 cursor-pointer flex items-start justify-between gap-3 ${
                        isSelected
                          ? "bg-primary/5 border-primary shadow-sm ring-1 ring-primary/30"
                          : "bg-white border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50/50"
                      }`}
                    >
                      {/* ITEM LEFT CONTENT */}
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        {/* INDEX / TYPE ICON */}
                        <span
                          className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            isSelected ? "bg-primary text-white" : "bg-neutral-100 text-neutral-700"
                          }`}
                        >
                          #{index + 1}
                        </span>

                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border inline-flex items-center gap-1 ${typeInfo.color}`}>
                              {TypeIcon && <TypeIcon className="w-3 h-3" />}
                              <span>{typeInfo.label}</span>
                            </span>
                            {item.duration && (
                              <span className="text-[10px] font-mono text-neutral-400">
                                • {item.duration}
                              </span>
                            )}
                          </div>

                          <h4 className={`text-xs font-bold line-clamp-2 ${isSelected ? "text-primary" : "text-neutral-800"}`}>
                            {item.title}
                          </h4>
                        </div>
                      </div>

                      {/* COMPLETED CHECKMARK TOGGLE */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLessonCompleted(item._id);
                        }}
                        className={`p-1 rounded-lg transition flex-shrink-0 mt-0.5 ${
                          isDone ? "text-emerald-600 bg-emerald-50" : "text-neutral-300 hover:text-neutral-500"
                        }`}
                        title={isDone ? "Đã hoàn thành (Nhấn để hủy)" : "Đánh dấu đã hoàn thành"}
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                        ) : (
                          <Circle className="w-5 h-5 text-neutral-300" />
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* RIGHT COLUMN: KHUNG XEM CHÍNH (MAIN VIEWING AREA) */}
        <div className={`space-y-4 ${isSidebarOpen ? "lg:col-span-8 xl:col-span-8" : "lg:col-span-12"}`}>
          {selectedLesson ? (
            <>
              {/* LECTURE HEADER & ACTIONS */}
              <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-sm space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="bg-primary/10 text-primary font-bold text-xs px-2.5 py-1 rounded-lg">
                      {currentSubject?.name}
                    </span>
                    <span className="text-xs text-neutral-400">
                      Đăng bởi: <strong className="text-neutral-700">{selectedLesson.teacherName || "Giáo viên bộ môn"}</strong>
                    </span>
                  </div>

                  {/* COMPLETE TOGGLE BUTTON */}
                  <Button
                    variant={completedLessons[selectedLesson._id] ? "success" : "outline"}
                    className="py-1.5 px-3 text-xs flex items-center gap-1.5"
                    onClick={() => toggleLessonCompleted(selectedLesson._id)}
                  >
                    {completedLessons[selectedLesson._id] ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    <span>
                      {completedLessons[selectedLesson._id] ? "Đã hoàn thành bài học" : "Đánh dấu hoàn thành"}
                    </span>
                  </Button>
                </div>

                <h2 className="text-lg md:text-xl font-bold text-neutral-900">
                  {selectedLesson.title}
                </h2>
              </div>

              {/* MEDIA VIEWER FRAME (VIDEO PLAYER HTML5 / PDF VIEWER & DOWNLOAD / OTHER) */}
              <div>
                {selectedLesson.contentType === "video" || (selectedLesson.attachmentUrl && (selectedLesson.attachmentUrl.endsWith(".mp4") || selectedLesson.attachmentUrl.includes("youtube") || selectedLesson.attachmentUrl.includes("vimeo"))) ? (
                  <HTML5VideoPlayer
                    url={selectedLesson.attachmentUrl}
                    title={selectedLesson.title}
                    onVideoEnded={() => toggleLessonCompleted(selectedLesson._id)}
                  />
                ) : selectedLesson.contentType === "document" || (selectedLesson.attachmentUrl && selectedLesson.attachmentUrl.includes(".pdf")) ? (
                  <PDFDocumentViewer
                    url={selectedLesson.attachmentUrl}
                    title={selectedLesson.title}
                  />
                ) : (
                  /* LINK / OTHER ATTACHMENT CARD */
                  <div className="bg-white rounded-2xl border border-neutral-200 p-6 text-center space-y-4 shadow-sm">
                    <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                      <Link2 className="w-7 h-7 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-neutral-900">Đường dẫn liên kết / Bài tập trực tuyến</h3>
                      <p className="text-xs text-neutral-500 mt-1 max-w-md mx-auto">
                        Bài học này sử dụng tài nguyên liên kết ngoài hoặc tài liệu bài tập đính kèm.
                      </p>
                    </div>
                    {selectedLesson.attachmentUrl && (
                      <a
                        href={getFileViewUrl(selectedLesson.attachmentUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition shadow-sm"
                      >
                        <span>Mở liên kết đính kèm</span>
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* LESSON SUPPLEMENTARY TABS & FOOTER NAVIGATION */}
              <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                {/* TAB HEADERS */}
                <div className="flex border-b border-neutral-200 bg-neutral-50/50">
                  <button
                    onClick={() => setActiveTab("overview")}
                    className={`px-5 py-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
                      activeTab === "overview"
                        ? "border-primary text-primary bg-white"
                        : "border-transparent text-neutral-500 hover:text-neutral-800"
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Mô tả bài học</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("attachments")}
                    className={`px-5 py-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
                      activeTab === "attachments"
                        ? "border-primary text-primary bg-white"
                        : "border-transparent text-neutral-500 hover:text-neutral-800"
                    }`}
                  >
                    <Paperclip className="w-4 h-4" />
                    <span>Tài liệu đính kèm</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("notes")}
                    className={`px-5 py-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
                      activeTab === "notes"
                        ? "border-primary text-primary bg-white"
                        : "border-transparent text-neutral-500 hover:text-neutral-800"
                    }`}
                  >
                    <Lightbulb className="w-4 h-4" />
                    <span>Ghi chú cá nhân</span>
                  </button>
                </div>

                {/* TAB CONTENT */}
                <div className="p-5">
                  {activeTab === "overview" && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                        Nội dung chi tiết & Yêu cầu học tập
                      </h4>
                      <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-line">
                        {selectedLesson.description || "Chưa có mô tả chi tiết cho bài học này."}
                      </p>
                    </div>
                  )}

                  {activeTab === "attachments" && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                        Tệp đính kèm bài giảng
                      </h4>
                      {selectedLesson.attachmentUrl ? (
                        <div className="flex items-center justify-between p-3.5 rounded-xl border border-neutral-200 bg-neutral-50">
                          <div className="flex items-center gap-3 min-w-0">
                            <FileText className="w-6 h-6 text-blue-600 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-neutral-900 truncate">
                                {selectedLesson.title}
                              </p>
                              <p className="text-[11px] text-neutral-400">
                                {selectedLesson.attachmentUrl.split("/").pop() || "Tai_lieu_dinh_kem"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <a
                              href={getFileDownloadUrl(selectedLesson.attachmentUrl)}
                              target="_blank"
                              rel="noopener noreferrer"
                              download
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary-hover transition"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Tải về</span>
                            </a>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-neutral-500">Bài học này không có tệp đính kèm phụ.</p>
                      )}
                    </div>
                  )}

                  {activeTab === "notes" && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                        Ghi chú bài học cá nhân (Tự động lưu)
                      </h4>
                      <textarea
                        rows={4}
                        placeholder="Viết ghi chú, công thức cần nhớ hoặc câu hỏi thắc mắc tại đây..."
                        value={currentNoteText}
                        onChange={(e) => setCurrentNoteText(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs text-neutral-800 bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:border-primary focus:bg-white transition"
                      />
                      <div className="flex justify-end">
                        <Button variant="primary" className="py-1.5 px-4 text-xs flex items-center gap-1.5" onClick={handleSaveNote}>
                          <Save className="w-3.5 h-3.5" />
                          <span>Lưu ghi chú</span>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* FOOTER NAVIGATION BUTTONS */}
                <div className="bg-neutral-50 px-5 py-3.5 border-t border-neutral-200 flex items-center justify-between gap-4">
                  <Button
                    variant="outline"
                    className="py-2 px-4 text-xs flex items-center gap-1.5"
                    disabled={currentIndex <= 0}
                    onClick={handlePrevLesson}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Bài trước</span>
                  </Button>

                  <span className="text-xs font-semibold text-neutral-500">
                    Bài {currentIndex + 1} / {filteredLessons.length}
                  </span>

                  <Button
                    variant="primary"
                    className="py-2 px-4 text-xs flex items-center gap-1.5"
                    disabled={currentIndex >= filteredLessons.length - 1 || currentIndex === -1}
                    onClick={handleNextLesson}
                  >
                    <span>Bài tiếp theo</span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center space-y-3">
              <BookOpen className="w-12 h-12 text-neutral-400 mx-auto" />
              <h3 className="text-base font-bold text-neutral-800">Vui lòng chọn bài học từ danh sách</h3>
              <p className="text-xs text-neutral-500">Chọn môn học và nhấp vào bài giảng ở cột bên trái để bắt đầu học.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
