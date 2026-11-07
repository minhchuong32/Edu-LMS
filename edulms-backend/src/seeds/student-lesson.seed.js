/**
 * =============================================================================
 * SCRIPT SEED DATA: DỮ LIỆU MẪU CHO CHỨC NĂNG XEM BÀI GIẢNG DÀNH CHO HỌC SINH
 * File: edulms-backend/src/seeds/student-lesson.seed.js
 * Dự án: Edu-LMS (Hệ thống Quản lý Học tập Trường THPT)
 * =============================================================================
 *
 * MỤC TIÊU:
 * - Khởi tạo dữ liệu mẫu thực tế chuẩn chương trình GDPT THPT (Lớp 10 & 11).
 * - Cấu hình 3 Lớp học mục tiêu: 10A1, 10A2, 11A1.
 * - Cấu hình 3 Môn học cốt lõi: TOAN (Toán học), LY (Vật lí), TIN (Tin học).
 * - Phân công giảng dạy (TeachingAssignment) đầy đủ cho 3 lớp x 3 môn = 9 phân công.
 * - Mỗi phân công có từ 6 đến 8 bài giảng được sắp xếp thứ tự chuẩn (#1, #2, #3...).
 * - Đa dạng các loại nội dung:
 *   + Video bài giảng (Sử dụng URL công khai truy cập được thực tế: Google/W3C).
 *   + Tài liệu PDF đính kèm (URL PDF chuẩn W3C/Mozilla).
 *   + Trình chiếu Slide (PPTX) & Văn bản (DOCX).
 *   + Bài giảng lý thuyết không có tài liệu đính kèm (Kiểm thử Empty State).
 * - Tự động đồng bộ liên kết classRef cho tài khoản học sinh (HS001, HS002, HS003, HS004).
 * - Cơ chế UPSERT thông minh: Chạy nhiều lần không trùng lặp, không xóa dữ liệu cũ.
 * - Hỗ trợ cả MongoDB Atlas (DNS SRV Google 8.8.8.8) và MongoDB Local.
 */

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

// Cấu hình DNS SRV hỗ trợ kết nối MongoDB Atlas trên các nhà mạng Việt Nam
const dns = require("node:dns");
try {
  dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);
} catch (dnsErr) {
  console.warn("DNS setServers warning:", dnsErr.message);
}

const mongoose = require("mongoose");
const User = require("../models/User");
const Grade = require("../models/Grade");
const Class = require("../models/Class");
const Subject = require("../models/Subject");
const TeachingAssignment = require("../models/TeachingAssignment");
const LessonContent = require("../models/LessonContent");

// 1. Cấu hình danh mục URL tài nguyên mẫu công khai (Đảm bảo truy cập thực tế)
const PUBLIC_MEDIA = {
  VIDEOS: {
    MATH_1:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    MATH_2:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    PHYSICS_1:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    PHYSICS_2:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    INFORMATICS_1:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    INFORMATICS_2:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4",
  },
  PDFS: {
    STANDARD_1:
      "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    STANDARD_2:
      "https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf",
    CURRICULUM:
      "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
  },
  OFFICE: {
    DOCX: "https://calibre-ebook.com/downloads/demos/demo.docx",
    PPTX: "https://view.officeapps.live.com/op/view.aspx?src=https://filesamples.com/samples/document/pptx/sample1.pptx",
  },
};

// 2. Danh mục 9 Phân công giảng dạy mục tiêu (3 Lớp x 3 Môn)
const TARGET_ASSIGNMENT_CONFIGS = [
  // --- LỚP 10A1 ---
  {
    className: "10A1",
    gradeLevel: 10,
    subjectCode: "TOAN",
    teacherCode: "GV001", // Thầy Nguyễn Văn Toán
    academicYear: "2025-2026",
    semester: "CaNam",
    note: "Toán học 10A1 - Thầy Nguyễn Văn Toán",
  },
  {
    className: "10A1",
    gradeLevel: 10,
    subjectCode: "LY",
    teacherCode: "GV004", // Cô Phạm Thị Lý
    academicYear: "2025-2026",
    semester: "CaNam",
    note: "Vật lí 10A1 - Cô Phạm Thị Lý",
  },
  {
    className: "10A1",
    gradeLevel: 10,
    subjectCode: "TIN",
    teacherCode: "GV009", // Thầy Ngô Văn Tin
    academicYear: "2025-2026",
    semester: "CaNam",
    note: "Tin học 10A1 - Thầy Ngô Văn Tin",
  },

  // --- LỚP 10A2 ---
  {
    className: "10A2",
    gradeLevel: 10,
    subjectCode: "TOAN",
    teacherCode: "GV001",
    academicYear: "2025-2026",
    semester: "CaNam",
    note: "Toán học 10A2 - Thầy Nguyễn Văn Toán",
  },
  {
    className: "10A2",
    gradeLevel: 10,
    subjectCode: "LY",
    teacherCode: "GV004",
    academicYear: "2025-2026",
    semester: "CaNam",
    note: "Vật lí 10A2 - Cô Phạm Thị Lý",
  },
  {
    className: "10A2",
    gradeLevel: 10,
    subjectCode: "TIN",
    teacherCode: "GV009",
    academicYear: "2025-2026",
    semester: "CaNam",
    note: "Tin học 10A2 - Thầy Ngô Văn Tin",
  },

  // --- LỚP 11A1 ---
  {
    className: "11A1",
    gradeLevel: 11,
    subjectCode: "TOAN",
    teacherCode: "GV001",
    academicYear: "2025-2026",
    semester: "CaNam",
    note: "Toán học 11A1 - Thầy Nguyễn Văn Toán",
  },
  {
    className: "11A1",
    gradeLevel: 11,
    subjectCode: "LY",
    teacherCode: "GV004",
    academicYear: "2025-2026",
    semester: "CaNam",
    note: "Vật lí 11A1 - Cô Phạm Thị Lý",
  },
  {
    className: "11A1",
    gradeLevel: 11,
    subjectCode: "TIN",
    teacherCode: "GV009",
    academicYear: "2025-2026",
    semester: "CaNam",
    note: "Tin học 11A1 - Thầy Ngô Văn Tin",
  },
];

// 3. Ngân hàng Bài giảng chi tiết theo từng cặp Lớp - Môn (5–8 bài/môn)
const LESSON_CURRICULUM_DATA = {
  // ==========================================
  // LỚP 10A1: TOÁN, VẬT LÍ, TIN HỌC
  // ==========================================
  "10A1_TOAN": [
    {
      title: "Bài 1: Mệnh đề và Mệnh đề chứa biến",
      description:
        "Tìm hiểu khái niệm mệnh đề toán học, mệnh đề phủ định, mệnh đề kéo theo (P => Q) và mệnh đề tương đương. Phân biệt mệnh đề chứa biến với mệnh đề thông thường.",
      contentType: "video",
      resourceUrl: PUBLIC_MEDIA.VIDEOS.MATH_1,
      order: 1,
      isActive: true,
    },
    {
      title: "Bài 2: Tập hợp và Các phép toán trên tập hợp",
      description:
        "Tập con, hai tập hợp bằng nhau. Các phép toán giao, hợp, hiệu và phần bù của tập hợp. Biểu diễn tập nghiệm trên sơ đồ Ven.",
      contentType: "pdf",
      resourceUrl: PUBLIC_MEDIA.PDFS.STANDARD_1,
      order: 2,
      isActive: true,
    },
    {
      title: "Bài 3: Các tập hợp số và Khoảng đoạn số thực",
      description:
        "Tập số tự nhiên N, số nguyên Z, số hữu tỉ Q và số thực R. Rèn luyện kỹ năng xác định giao và hợp của các khoảng, đoạn, nửa khoảng.",
      contentType: "document",
      resourceUrl: PUBLIC_MEDIA.OFFICE.DOCX,
      order: 3,
      isActive: true,
    },
    {
      title: "Bài 4: Bất phương trình bậc nhất hai ẩn",
      description:
        "Định nghĩa bất phương trình bậc nhất hai ẩn và cách biểu diễn miền nghiệm của bất phương trình trên mặt phẳng tọa độ Descartes Oxy.",
      contentType: "slide",
      resourceUrl: PUBLIC_MEDIA.OFFICE.PPTX,
      order: 4,
      isActive: true,
    },
    {
      title: "Bài 5: Hệ bất phương trình bậc nhất hai ẩn & Ứng dụng quy hoạch tuyến tính",
      description:
        "Biểu diễn miền nghiệm của hệ bất phương trình. Ứng dụng giải bài toán kinh tế tìm giá trị lớn nhất, nhỏ nhất của hàm mục tiêu F(x, y).",
      contentType: "video",
      resourceUrl: PUBLIC_MEDIA.VIDEOS.MATH_2,
      order: 5,
      isActive: true,
    },
    {
      title: "Bài 6: Ôn tập Chương 1 & Hướng dẫn tự học lý thuyết",
      description:
        "Tổng kết toàn bộ kiến thức trọng tâm của Chương 1: Mệnh đề, Tập hợp và Bất phương trình. Bài học tập trung vào lý thuyết nền tảng và phương pháp tự giải.",
      contentType: "text", // Kiểm thử Empty State (không có file đính kèm)
      resourceUrl: "",
      order: 6,
      isActive: true,
    },
    {
      title: "Bài 7: Đề kiểm tra đánh giá thường xuyên số 1 (PDF)",
      description:
        "Đề luyện tập trắc nghiệm và tự luận 45 phút có đáp án và ma trận đề chuẩn Bộ GD&ĐT.",
      contentType: "pdf",
      resourceUrl: PUBLIC_MEDIA.PDFS.STANDARD_2,
      order: 7,
      isActive: true,
    },
  ],

  "10A1_LY": [
    {
      title: "Bài 1: Khái quát về môn Vật lí và An toàn trong phòng thí nghiệm",
      description:
        "Giới thiệu đối tượng nghiên cứu của Vật lí, các bước trong phương pháp thực nghiệm và quy tắc an toàn khi làm việc với thiết bị điện, nhiệt trong phòng lab.",
      contentType: "video",
      resourceUrl: PUBLIC_MEDIA.VIDEOS.PHYSICS_1,
      order: 1,
      isActive: true,
    },
    {
      title: "Bài 2: Vấn đề sai số trong phép đo các đại lượng vật lí",
      description:
        "Phân biệt sai số hệ thống và sai số ngẫu nhiên. Cách viết kết quả đo kèm sai số tuyệt đối và sai số tỉ đối.",
      contentType: "pdf",
      resourceUrl: PUBLIC_MEDIA.PDFS.STANDARD_1,
      order: 2,
      isActive: true,
    },
    {
      title: "Bài 3: Độ dịch chuyển và Quãng đường đi được",
      description:
        "Khái niệm độ dịch chuyển (vecto d) và quãng đường (s). Đồ thị độ dịch chuyển - thời gian (d - t) và ứng dụng xác định vận tốc tức thời.",
      contentType: "slide",
      resourceUrl: PUBLIC_MEDIA.OFFICE.PPTX,
      order: 3,
      isActive: true,
    },
    {
      title: "Bài 4: Chuyển động biến đổi và Chuyển động thẳng biến đổi đều",
      description:
        "Gia tốc của chuyển động. Các công thức vận tốc, quãng đường và hệ thức độc lập với thời gian trong chuyển động thẳng biến đổi đều.",
      contentType: "video",
      resourceUrl: PUBLIC_MEDIA.VIDEOS.PHYSICS_2,
      order: 4,
      isActive: true,
    },
    {
      title: "Bài 5: Rơi tự do & Gia tốc trọng trường g",
      description:
        "Đặc điểm của sự rơi tự do trong chân không. Thí nghiệm đo gia tốc trọng trường bằng đồng hồ đo thời gian hiện số và cổng quang điện.",
      contentType: "pdf",
      resourceUrl: PUBLIC_MEDIA.PDFS.STANDARD_2,
      order: 5,
      isActive: true,
    },
    {
      title: "Bài 6: Tổng kết Động học chất điểm & Ghi chú tự học",
      description:
        "Bảng tra cứu công thức động học, so sánh chuyển động thẳng đều và chuyển động biến đổi đều. Học sinh ghi nhớ công thức trọng tâm.",
      contentType: "text", // Empty state
      resourceUrl: "",
      order: 6,
      isActive: true,
    },
  ],

  "10A1_TIN": [
    {
      title: "Bài 1: Thông tin và Dữ liệu trong thời đại số",
      description:
        "Phân biệt thông tin và dữ liệu, vai trò của công nghệ thông tin trong cuộc cách mạng công nghiệp 4.0 và chuyển đổi số giáo dục.",
      contentType: "video",
      resourceUrl: PUBLIC_MEDIA.VIDEOS.INFORMATICS_1,
      order: 1,
      isActive: true,
    },
    {
      title: "Bài 2: Vai trò của thiết bị thông minh và Mạng máy tính",
      description:
        "Cấu trúc hệ thống phần cứng, kiến trúc mạng LAN/WAN và Internet. Khái niệm điện toán đám mây và Internet vạn vật (IoT).",
      contentType: "pdf",
      resourceUrl: PUBLIC_MEDIA.PDFS.STANDARD_1,
      order: 2,
      isActive: true,
    },
    {
      title: "Bài 3: Làm quen với ngôn ngữ lập trình Python",
      description:
        "Cài đặt môi trường Python 3, IDE VS Code, làm quen với lệnh print(), input() và cú pháp cơ bản của chương trình Python đầu tiên.",
      contentType: "slide",
      resourceUrl: PUBLIC_MEDIA.OFFICE.PPTX,
      order: 3,
      isActive: true,
    },
    {
      title: "Bài 4: Biến, Kiểu dữ liệu và Các phép toán số học",
      description:
        "Các kiểu dữ liệu cơ sở trong Python: int, float, str, bool. Các phép toán chia lấy nguyên //, chia lấy dư % và hàm toán học math.",
      contentType: "video",
      resourceUrl: PUBLIC_MEDIA.VIDEOS.INFORMATICS_2,
      order: 4,
      isActive: true,
    },
    {
      title: "Bài 5: Cấu trúc rẽ nhánh if - elif - else trong Python",
      description:
        "Cú pháp khối lệnh lùi dòng (indentation) trong Python. Giải các bài toán biện luận phương trình và tìm số lớn nhất với if - else.",
      contentType: "pdf",
      resourceUrl: PUBLIC_MEDIA.PDFS.STANDARD_2,
      order: 5,
      isActive: true,
    },
    {
      title: "Bài 6: Sổ tay cú pháp Python căn bản (Text Only)",
      description:
        "Bảng tổng hợp nhanh các hàm built-in, quy tắc đặt tên biến theo chuẩn PEP8 và lưu ý về thụt đầu dòng trong Python.",
      contentType: "text", // Empty state
      resourceUrl: "",
      order: 6,
      isActive: true,
    },
  ],

  // ==========================================
  // LỚP 10A2: TOÁN, VẬT LÍ, TIN HỌC
  // ==========================================
  "10A2_TOAN": [
    {
      title: "Bài 1: Giá trị lượng giác của một góc từ 0° đến 180°",
      description:
        "Nửa đường tròn đơn vị, định nghĩa sin, cos, tan, cot. Bảng giá trị lượng giác của các góc đặc biệt 30°, 45°, 60°, 90°, 120°.",
      contentType: "video",
      resourceUrl: PUBLIC_MEDIA.VIDEOS.MATH_1,
      order: 1,
      isActive: true,
    },
    {
      title: "Bài 2: Định lí Côsin và Định lí Sin trong tam giác",
      description:
        "Chứng minh và ứng dụng định lí côsin a² = b² + c² - 2bc.cosA và định lí sin a/sinA = 2R để giải tam giác.",
      contentType: "pdf",
      resourceUrl: PUBLIC_MEDIA.PDFS.STANDARD_1,
      order: 2,
      isActive: true,
    },
    {
      title: "Bài 3: Các công thức tính diện tích tam giác",
      description:
        "5 công thức tính diện tích tam giác: đáy x cao, 1/2.ab.sinC, p.r, abc/4R và công thức Heron. Phiếu bài tập tự luyện.",
      contentType: "slide",
      resourceUrl: PUBLIC_MEDIA.OFFICE.PPTX,
      order: 3,
      isActive: true,
    },
    {
      title: "Bài 4: Khái niệm Vecto & Các phép toán vecto cơ bản",
      description:
        "Định nghĩa vecto, phương, hướng, độ dài. Hai vecto cùng phương, cùng hướng, vecto bằng nhau và vecto-không.",
      contentType: "video",
      resourceUrl: PUBLIC_MEDIA.VIDEOS.MATH_2,
      order: 4,
      isActive: true,
    },
    {
      title: "Bài 5: Hướng dẫn thực hành giải toán tam giác bằng máy tính cầm tay",
      description:
        "Quy trình bấm máy tính Casio fx-580VN X để tìm góc, cạnh và giải nhanh bài toán thực tế đo chiều cao ngọn tháp.",
      contentType: "text", // Empty state
      resourceUrl: "",
      order: 5,
      isActive: true,
    },
    {
      title: "Bài 6: Đề kiểm tra giữa học kỳ 1 Toán 10 (PDF)",
      description:
        "Bộ đề thi thử giữa học kỳ 1 có thang điểm chi tiết cho học sinh lớp 10A2 ôn luyện.",
      contentType: "pdf",
      resourceUrl: PUBLIC_MEDIA.PDFS.STANDARD_2,
      order: 6,
      isActive: true,
    },
  ],

  "10A2_LY": [
    {
      title: "Bài 1: Tổng hợp và Phân tích lực - Cân bằng lực",
      description:
        "Quy tắc hình bình hành lực, điều kiện cân bằng của một chất điểm dưới tác dụng của nhiều lực đồng quy.",
      contentType: "video",
      resourceUrl: PUBLIC_MEDIA.VIDEOS.PHYSICS_1,
      order: 1,
      isActive: true,
    },
    {
      title: "Bài 2: Ba định luật Newton về chuyển động",
      description:
        "Định luật I Newton (quán tính), Định luật II Newton (F = m.a) và Định luật III Newton (lực và phản lực).",
      contentType: "pdf",
      resourceUrl: PUBLIC_MEDIA.PDFS.STANDARD_1,
      order: 2,
      isActive: true,
    },
    {
      title: "Bài 3: Lực hấp dẫn và Trọng lực",
      description:
        "Định luật vạn vật hấp dẫn của Newton, biểu thức lực hấp dẫn và gia tốc rơi tự do ở độ cao h so với mặt đất.",
      contentType: "slide",
      resourceUrl: PUBLIC_MEDIA.OFFICE.PPTX,
      order: 3,
      isActive: true,
    },
    {
      title: "Bài 4: Lực ma sát và Vai trò trong đời sống",
      description:
        "Ma sát trượt, ma sát nghỉ và ma sát lăn. Hệ số ma sát trượt và các biện pháp tăng/giảm ma sát trong kỹ thuật.",
      contentType: "video",
      resourceUrl: PUBLIC_MEDIA.VIDEOS.PHYSICS_2,
      order: 4,
      isActive: true,
    },
    {
      title: "Bài 5: Tóm tắt lý thuyết Động lực học chất điểm",
      description:
        "Hệ thống hóa kiến thức các loại lực cơ học và phương pháp động lực học giải bài toán kéo vật trên mặt phẳng nghiêng.",
      contentType: "text", // Empty state
      resourceUrl: "",
      order: 5,
      isActive: true,
    },
  ],

  "10A2_TIN": [
    {
      title: "Bài 1: Cấu trúc lặp for trong Python",
      description:
        "Hàm range(start, stop, step) và vòng lặp for đếm số lần lặp biết trước. Ứng dụng tính tổng dãy số và in bảng cửu chương.",
      contentType: "video",
      resourceUrl: PUBLIC_MEDIA.VIDEOS.INFORMATICS_1,
      order: 1,
      isActive: true,
    },
    {
      title: "Bài 2: Cấu trúc lặp while trong Python",
      description:
        "Vòng lặp điều kiện while, kiểm soát vòng lặp vô hạn và lệnh break, continue trong xử lý nhập dữ liệu hợp lệ.",
      contentType: "pdf",
      resourceUrl: PUBLIC_MEDIA.PDFS.STANDARD_1,
      order: 2,
      isActive: true,
    },
    {
      title: "Bài 3: Kiểu dữ liệu xâu ký tự (String) trong Python",
      description:
        "Truy cập ký tự qua chỉ số, cắt lát xâu (slicing), các phương thức len(), find(), replace(), split() và join().",
      contentType: "slide",
      resourceUrl: PUBLIC_MEDIA.OFFICE.PPTX,
      order: 3,
      isActive: true,
    },
    {
      title: "Bài 4: Kiểu dữ liệu danh sách (List) trong Python",
      description:
        "Khởi tạo list, các thao tác append(), insert(), pop(), remove() và duyệt phần tử bằng vòng lặp.",
      contentType: "video",
      resourceUrl: PUBLIC_MEDIA.VIDEOS.INFORMATICS_2,
      order: 4,
      isActive: true,
    },
    {
      title: "Bài 5: Hướng dẫn viết thuật toán tìm kiếm tuần tự (Text)",
      description:
        "Các bước cài đặt thuật toán Linear Search trên danh sách số nguyên kèm phân tích độ phức tạp thời gian.",
      contentType: "text", // Empty state
      resourceUrl: "",
      order: 5,
      isActive: true,
    },
    {
      title: "Bài 6: Phiếu bài tập thực hành lập trình Python (PDF)",
      description:
        "10 bài toán lập trình thuật toán kinh điển từ cơ bản đến nâng cao dành cho học sinh lớp 10A2.",
      contentType: "pdf",
      resourceUrl: PUBLIC_MEDIA.PDFS.STANDARD_2,
      order: 6,
      isActive: true,
    },
  ],

  // ==========================================
  // LỚP 11A1: TOÁN, VẬT LÍ, TIN HỌC
  // ==========================================
  "11A1_TOAN": [
    {
      title: "Bài 1: Góc lượng giác & Công thức lượng giác",
      description:
        "Đơn vị radian, công thức cộng, công thức nhân đôi, công thức biến đổi tích thành tổng và tổng thành tích.",
      contentType: "video",
      resourceUrl: PUBLIC_MEDIA.VIDEOS.MATH_1,
      order: 1,
      isActive: true,
    },
    {
      title: "Bài 2: Hàm số lượng giác và Đồ thị",
      description:
        "Tập xác định, tính tuần hoàn, chu kỳ và đồ thị của 4 hàm số y = sin x, y = cos x, y = tan x, y = cot x.",
      contentType: "pdf",
      resourceUrl: PUBLIC_MEDIA.PDFS.STANDARD_1,
      order: 2,
      isActive: true,
    },
    {
      title: "Bài 3: Phương trình lượng giác cơ bản",
      description:
        "Phương pháp giải phương trình sin x = m, cos x = m, tan x = m và cot x = m. Lưu ý điều kiện có nghiệm.",
      contentType: "slide",
      resourceUrl: PUBLIC_MEDIA.OFFICE.PPTX,
      order: 3,
      isActive: true,
    },
    {
      title: "Bài 4: Dãy số và Cấp số cộng",
      description:
        "Định nghĩa cấp số cộng, số hạng tổng quát un = u1 + (n - 1)d và công thức tính tổng n số hạng đầu Sn.",
      contentType: "video",
      resourceUrl: PUBLIC_MEDIA.VIDEOS.MATH_2,
      order: 4,
      isActive: true,
    },
    {
      title: "Bài 5: Cấp số nhân & Ứng dụng tính lãi suất ngân hàng",
      description:
        "Công thức số hạng tổng quát un = u1 . q^(n - 1), tổng n số hạng đầu và bài toán thực tế gửi tiết kiệm ngân hàng.",
      contentType: "document",
      resourceUrl: PUBLIC_MEDIA.OFFICE.DOCX,
      order: 5,
      isActive: true,
    },
    {
      title: "Bài 6: Tổng kết Đại số 11 Chương 1 (Hướng dẫn tự học)",
      description:
        "Sơ đồ tư duy toàn bộ chương Hàm số lượng giác & Phương trình lượng giác. Các dạng toán trắc nghiệm thường gặp trong đề thi THPT.",
      contentType: "text", // Empty state
      resourceUrl: "",
      order: 6,
      isActive: true,
    },
    {
      title: "Bài 7: Bộ đề kiểm tra chất lượng định kỳ Đại số 11 (PDF)",
      description:
        "Đề thi chuẩn hóa 50 câu trắc nghiệm khách quan có lời giải chi tiết từng câu.",
      contentType: "pdf",
      resourceUrl: PUBLIC_MEDIA.PDFS.STANDARD_2,
      order: 7,
      isActive: true,
    },
  ],

  "11A1_LY": [
    {
      title: "Bài 1: Dao động điều hòa và Phương trình li độ",
      description:
        "Định nghĩa dao động cơ, dao động điều hòa. Khái niệm biên độ A, tần số góc omega, pha ban đầu phi và chu kỳ T.",
      contentType: "video",
      resourceUrl: PUBLIC_MEDIA.VIDEOS.PHYSICS_1,
      order: 1,
      isActive: true,
    },
    {
      title: "Bài 2: Vận tốc, Gia tốc và Đồ thị trong dao động điều hòa",
      description:
        "Mối quan hệ pha giữa li độ, vận tốc và gia tốc. Công thức độc lập thời gian giữa x, v và a.",
      contentType: "pdf",
      resourceUrl: PUBLIC_MEDIA.PDFS.STANDARD_1,
      order: 2,
      isActive: true,
    },
    {
      title: "Bài 3: Năng lượng trong dao động điều hòa",
      description:
        "Động năng Wd, thế năng Wt và định luật bảo toàn cơ năng của vật dao động điều hòa W = 1/2.m.omega^2.A^2.",
      contentType: "slide",
      resourceUrl: PUBLIC_MEDIA.OFFICE.PPTX,
      order: 3,
      isActive: true,
    },
    {
      title: "Bài 4: Dao động tắt dần, Dao động cưỡng bức và Hiện tượng cộng hưởng",
      description:
        "Nguyên nhân gây tắt dần dao động. Điều kiện xảy ra hiện tượng cộng hưởng cơ và ứng dụng/tác hại trong xây dựng cầu đường.",
      contentType: "video",
      resourceUrl: PUBLIC_MEDIA.VIDEOS.PHYSICS_2,
      order: 4,
      isActive: true,
    },
    {
      title: "Bài 5: Hướng dẫn thí nghiệm đo chu kỳ con lắc đơn (Text)",
      description:
        "Các bước tiến hành đo thời gian 10 dao động toàn phần để xác định gia tốc trọng trường g tại phòng thực hành.",
      contentType: "text", // Empty state
      resourceUrl: "",
      order: 5,
      isActive: true,
    },
  ],

  "11A1_TIN": [
    {
      title: "Bài 1: Hệ quản trị cơ sở dữ liệu và Mô hình quan hệ",
      description:
        "Khái niệm CSDL, bảng (table), trường (field), bản ghi (record), khóa chính (Primary Key) và khóa ngoại (Foreign Key).",
      contentType: "video",
      resourceUrl: PUBLIC_MEDIA.VIDEOS.INFORMATICS_1,
      order: 1,
      isActive: true,
    },
    {
      title: "Bài 2: Làm quen với ngôn ngữ truy vấn SQL",
      description:
        "Cú pháp cơ bản của lệnh SELECT, FROM, WHERE, ORDER BY để trích xuất dữ liệu từ một bảng.",
      contentType: "pdf",
      resourceUrl: PUBLIC_MEDIA.PDFS.STANDARD_1,
      order: 2,
      isActive: true,
    },
    {
      title: "Bài 3: Các phép toán gộp và Nhóm dữ liệu trong SQL",
      description:
        "Sử dụng các hàm COUNT(), SUM(), AVG(), MIN(), MAX() kết hợp mệnh đề GROUP BY và HAVING.",
      contentType: "slide",
      resourceUrl: PUBLIC_MEDIA.OFFICE.PPTX,
      order: 3,
      isActive: true,
    },
    {
      title: "Bài 4: Liên kết nhiều bảng với JOIN trong SQL",
      description:
        "Phân biệt INNER JOIN, LEFT JOIN và RIGHT JOIN trong kết nối các bảng dữ liệu học sinh, điểm số và lớp học.",
      contentType: "video",
      resourceUrl: PUBLIC_MEDIA.VIDEOS.INFORMATICS_2,
      order: 4,
      isActive: true,
    },
    {
      title: "Bài 5: Tổng quan an toàn bảo mật cơ sở dữ liệu (Text)",
      description:
        "Các nguyên tắc sao lưu (backup), phân quyền người dùng và phòng chống tấn công SQL Injection cơ bản.",
      contentType: "text", // Empty state
      resourceUrl: "",
      order: 5,
      isActive: true,
    },
    {
      title: "Bài 6: Đề cương bài tập thực hành CSDL MySQL (PDF)",
      description:
        "Hệ thống câu hỏi bài tập thiết kế mô hình thực thể ERD và viết câu lệnh SQL hoàn chỉnh.",
      contentType: "pdf",
      resourceUrl: PUBLIC_MEDIA.PDFS.STANDARD_2,
      order: 6,
      isActive: true,
    },
  ],
};

// 4. Hàm thực thi chính: Seed dữ liệu bài giảng và phân quyền
async function seedStudentLessons() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

  if (!mongoUri) {
    console.error(
      "❌ LỖI: Không tìm thấy biến môi trường MONGO_URI trong file .env!"
    );
    process.exit(1);
  }

  console.log("==========================================================");
  console.log("🚀 BẮT ĐẦU SEED DỮ LIỆU BÀI GIẢNG HỌC SINH (EDU-LMS)");
  console.log("==========================================================");
  console.log(`🔗 Đang kết nối tới MongoDB...`);

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 15000,
    });
    console.log(
      `✅ Kết nối MongoDB thành công! Host: ${mongoose.connection.host}`
    );

    // BƯỚC 1: Kiểm tra và liên kết Khối học (Grade 10, 11)
    console.log("\n--- [BƯỚC 1] Đồng bộ Khối học (Grades) ---");
    const grades = {};
    for (const level of [10, 11, 12]) {
      let grade = await Grade.findOne({ level, isDeleted: false });
      if (!grade) {
        grade = await Grade.create({
          level,
          name: `Khối ${level}`,
          description: `Khối ${level} cấp THPT`,
          isActive: true,
        });
        console.log(`  + Đã tạo mới Khối ${level}`);
      }
      grades[level] = grade;
    }

    // BƯỚC 2: Kiểm tra và liên kết 3 Lớp học mục tiêu (10A1, 10A2, 11A1)
    console.log("\n--- [BƯỚC 2] Đồng bộ Lớp học (10A1, 10A2, 11A1) ---");
    const classes = {};
    const classConfigs = [
      { name: "10A1", gradeLevel: 10, room: "P.101" },
      { name: "10A2", gradeLevel: 10, room: "P.102" },
      { name: "11A1", gradeLevel: 11, room: "P.201" },
    ];

    for (const c of classConfigs) {
      let cls = await Class.findOne({ name: c.name, isDeleted: false });
      if (!cls) {
        cls = await Class.create({
          name: c.name,
          grade: grades[c.gradeLevel]._id,
          academicYear: "2025-2026",
          room: c.room,
          capacity: 45,
          isActive: true,
        });
        console.log(`  + Đã tạo mới Lớp ${c.name}`);
      }
      classes[c.name] = cls;
    }

    // BƯỚC 3: Đồng bộ liên kết classRef cho Học sinh mục tiêu (chống lỗi phân quyền IDOR)
    console.log("\n--- [BƯỚC 3] Cập nhật classRef cho tài khoản Học sinh ---");
    const studentClassMapping = [
      { code: "HS001", className: "10A1" },
      { code: "HS002", className: "10A1" },
      { code: "HS003", className: "10A2" },
      { code: "HS004", className: "11A1" },
    ];

    for (const item of studentClassMapping) {
      const targetClass = classes[item.className];
      if (targetClass) {
        const updated = await User.findOneAndUpdate(
          { userCode: item.code },
          {
            $set: {
              classRef: targetClass._id,
              className: item.className,
              isActivated: true,
            },
          },
          { new: true }
        );
        if (updated) {
          console.log(
            `  ✓ Học sinh [${item.code}] ${updated.fullName} -> Liên kết ${item.className} (classRef: ${targetClass._id})`
          );
        }
      }
    }

    // BƯỚC 4: Kiểm tra và liên kết Môn học (TOAN, LY, TIN)
    console.log("\n--- [BƯỚC 4] Đồng bộ Môn học (TOAN, LY, TIN) ---");
    const subjects = {};
    const subjectList = [
      { code: "TOAN", name: "Toán học", periodsPerWeek: 4 },
      { code: "LY", name: "Vật lí", periodsPerWeek: 2 },
      { code: "TIN", name: "Tin học", periodsPerWeek: 2 },
    ];

    for (const s of subjectList) {
      let subj = await Subject.findOne({ code: s.code, isDeleted: false });
      if (!subj) {
        subj = await Subject.create({
          code: s.code,
          name: s.name,
          periodsPerWeek: s.periodsPerWeek,
          isActive: true,
        });
        console.log(`  + Đã tạo mới Môn học ${s.name} (${s.code})`);
      }
      subjects[s.code] = subj;
    }

    // BƯỚC 5: Kiểm tra và liên kết Giáo viên giảng dạy
    console.log("\n--- [BƯỚC 5] Xác nhận tài khoản Giáo viên phụ trách ---");
    const teachers = {};
    for (const code of ["GV001", "GV004", "GV009"]) {
      let teacher = await User.findOne({ userCode: code });
      if (!teacher) {
        console.warn(`  ⚠️ Không tìm thấy GV ${code}, tìm theo email...`);
        teacher = await User.findOne({ role: "teacher" });
      }
      teachers[code] = teacher;
      console.log(
        `  ✓ Giáo viên ${code}: ${teacher?.fullName || "Chưa xác định"} (${teacher?.email || "N/A"})`
      );
    }

    // BƯỚC 6: Tạo / Cập nhật 9 Phân công giảng dạy (TeachingAssignments)
    console.log(
      "\n--- [BƯỚC 6] Khởi tạo / Cập nhật Phân công giảng dạy (TeachingAssignments) ---"
    );
    const assignmentsMap = {};
    let createdAssignmentCount = 0;
    let existingAssignmentCount = 0;

    for (const conf of TARGET_ASSIGNMENT_CONFIGS) {
      const cls = classes[conf.className];
      const subj = subjects[conf.subjectCode];
      const teacher = teachers[conf.teacherCode] || (await User.findOne({ role: "teacher" }));

      if (!cls || !subj || !teacher) {
        console.error(
          `  ❌ Thiếu dữ liệu liên kết cho phân công: ${conf.className} - ${conf.subjectCode}`
        );
        continue;
      }

      const key = `${conf.className}_${conf.subjectCode}`;

      // Tìm phân công đã tồn tại
      let assignment = await TeachingAssignment.findOne({
        class: cls._id,
        subject: subj._id,
        academicYear: conf.academicYear,
        semester: conf.semester,
        isDeleted: false,
      });

      if (!assignment) {
        assignment = await TeachingAssignment.create({
          class: cls._id,
          subject: subj._id,
          teacher: teacher._id,
          academicYear: conf.academicYear,
          semester: conf.semester,
          periodsPerWeek: subj.periodsPerWeek || 2,
          note: conf.note,
          status: "active",
          isActive: true,
        });
        createdAssignmentCount++;
        console.log(`  + [Tạo mới Phân công] ${conf.className} - ${subj.name} (GV: ${teacher.fullName})`);
      } else {
        // Cập nhật teacher đúng chuẩn nếu cần
        if (assignment.teacher.toString() !== teacher._id.toString()) {
          assignment.teacher = teacher._id;
          await assignment.save();
        }
        existingAssignmentCount++;
        console.log(`  ✓ [Đã có Phân công] ${conf.className} - ${subj.name} (ID: ${assignment._id})`);
      }

      assignmentsMap[key] = assignment;
    }

    // BƯỚC 7: Seed Ngân hàng Bài giảng chi tiết (LessonContent)
    console.log("\n--- [BƯỚC 7] Khởi tạo / Cập nhật Nội dung bài giảng (LessonContent) ---");
    let totalLessonsCreated = 0;
    let totalLessonsUpdated = 0;

    for (const [key, lessonList] of Object.entries(LESSON_CURRICULUM_DATA)) {
      const assignment = assignmentsMap[key];
      if (!assignment) {
        console.warn(`  ⚠️ Bỏ qua danh mục bài giảng ${key} do không có phân công tương ứng.`);
        continue;
      }

      const [cName, sCode] = key.split("_");
      console.log(`\n  >> Đang xử lý ${lessonList.length} bài học cho Lớp ${cName} - Môn ${subjects[sCode]?.name}...`);

      for (const item of lessonList) {
        // Tìm xem bài giảng thứ tự này đã tồn tại trong phân công chưa
        let lesson = await LessonContent.findOne({
          teachingAssignment: assignment._id,
          order: item.order,
          isDeleted: false,
        });

        if (!lesson) {
          // Cũng thử tìm theo tiêu đề để tránh trùng lặp
          lesson = await LessonContent.findOne({
            teachingAssignment: assignment._id,
            title: item.title,
            isDeleted: false,
          });
        }

        if (!lesson) {
          await LessonContent.create({
            title: item.title,
            description: item.description,
            contentType: item.contentType,
            resourceUrl: item.resourceUrl || "",
            order: item.order,
            teachingAssignment: assignment._id,
            isActive: item.isActive,
          });
          totalLessonsCreated++;
          console.log(
            `     + [Tạo mới] #${item.order} [${item.contentType.toUpperCase()}] ${item.title}`
          );
        } else {
          // Cập nhật thông tin bài giảng
          lesson.title = item.title;
          lesson.description = item.description;
          lesson.contentType = item.contentType;
          lesson.resourceUrl = item.resourceUrl || "";
          lesson.order = item.order;
          lesson.isActive = item.isActive;
          await lesson.save();
          totalLessonsUpdated++;
          console.log(
            `     ✓ [Cập nhật] #${item.order} [${item.contentType.toUpperCase()}] ${item.title}`
          );
        }
      }
    }

    // BƯỚC 8: Tổng kết và Báo cáo số lượng
    const totalActiveLessons = await LessonContent.countDocuments({
      isDeleted: false,
    });

    console.log("\n==========================================================");
    console.log("🎉 HOÀN TẤT SEED DỮ LIỆU BÀI GIẢNG HỌC SINH THÀNH CÔNG!");
    console.log("==========================================================");
    console.log(`📊 BÁO CÁO TỔNG HỢP:`);
    console.log(`   - Số Lớp học mục tiêu: 3 (10A1, 10A2, 11A1)`);
    console.log(`   - Số Môn học cốt lõi: 3 (Toán, Vật lí, Tin học)`);
    console.log(`   - Phân công mới tạo: ${createdAssignmentCount}`);
    console.log(`   - Phân công tái sử dụng: ${existingAssignmentCount}`);
    console.log(`   - Bài giảng tạo mới: ${totalLessonsCreated}`);
    console.log(`   - Bài giảng cập nhật: ${totalLessonsUpdated}`);
    console.log(`   - Tổng số bài giảng trong hệ thống: ${totalActiveLessons}`);
    console.log("----------------------------------------------------------");
    console.log(`🔑 TÀI KHOẢN HỌC SINH KIỂM THỬ:`);
    console.log(`   1. Học sinh Lớp 10A1: student1@edulms.test (userCode: HS001)`);
    console.log(`   2. Học sinh Lớp 10A1: student2@edulms.test (userCode: HS002)`);
    console.log(`   3. Học sinh Lớp 10A2: student3@edulms.test (userCode: HS003)`);
    console.log(`   4. Học sinh Lớp 11A1: student4@edulms.test (userCode: HS004)`);
    console.log(`   * Mật khẩu mặc định: eduLMS@2026 hoặc mật khẩu đã đặt khi kích hoạt`);
    console.log("==========================================================\n");
  } catch (error) {
    console.error("❌ LỖI TRONG QUÁ TRÌNH SEED DỮ LIỆU:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Đã ngắt kết nối MongoDB an toàn.\n");
  }
}

// Chạy trực tiếp script khi được gọi qua CLI
if (require.main === module) {
  seedStudentLessons();
}

module.exports = { seedStudentLessons };

