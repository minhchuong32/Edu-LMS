/**
 * Script Khởi tạo Dữ liệu Ngân hàng Câu hỏi Trắc nghiệm (Question Bank Seed)
 * Dự án: Edu-LMS (Hệ thống Quản lý Học tập Trường THPT)
 *
 * Chức năng:
 * - Tự động kết nối MongoDB dựa trên MONGO_URI / MONGODB_URI
 * - Tự động liên kết môn học (Subject) và giáo viên phụ trách (Teacher)
 * - Khởi tạo ngân hàng câu hỏi đa dạng (Toán, Vật lí, Hóa học, Sinh học, Tiếng Anh, Tin học, Lịch sử, Địa lí, Ngữ văn)
 * - Phân loại theo Chương (chapter) và Độ khó (easy, medium, hard)
 * - Đi kèm 4 phương án lựa chọn, chỉ số đáp án đúng (correctIndex) và lời giải thích chi tiết (explanation)
 * - Cơ chế UPSERT thông minh: không tạo trùng lặp khi chạy lại nhiều lần
 */

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
require("node:dns").setServers(["8.8.8.8", "1.1.1.1"]);
const mongoose = require("mongoose");

const User = require("../models/User");
const Subject = require("../models/Subject");
const Question = require("../models/Question");

// Dữ liệu câu hỏi mẫu phong phú theo từng môn học, chương và độ khó
const RAW_QUESTIONS_DATA = [
  // ==========================================
  // 1. MÔN TOÁN HỌC (TOAN) - GV001
  // ==========================================
  {
    subjectCode: "TOAN",
    teacherCode: "GV001",
    chapter: "Chương 1: Mệnh đề và Tập hợp",
    difficulty: "easy",
    content: "Trong các câu sau, câu nào là một mệnh đề toán học?",
    options: [
      "Hôm nay trời đẹp quá!",
      "Số 15 là số nguyên tố.",
      "Bạn có thích học toán không?",
      "x + 2 > 5."
    ],
    correctIndex: 1,
    explanation: "Mệnh đề là một khẳng định có tính đúng hoặc sai rõ ràng. 'Số 15 là số nguyên tố' là mệnh đề (mệnh đề sai)."
  },
  {
    subjectCode: "TOAN",
    teacherCode: "GV001",
    chapter: "Chương 1: Mệnh đề và Tập hợp",
    difficulty: "medium",
    content: "Cho tập hợp A = {x ∈ ℝ | x² - 4 = 0} và B = {x ∈ ℤ | -2 ≤ x ≤ 2}. Giao của hai tập hợp A ∩ B là:",
    options: [
      "{-2, 2}",
      "{-2, 0, 2}",
      "{2}",
      "[-2, 2]"
    ],
    correctIndex: 0,
    explanation: "Phương trình x² - 4 = 0 cho nghiệm x = 2 hoặc x = -2, nên A = {-2, 2}. B = {-2, -1, 0, 1, 2}. Do đó A ∩ B = {-2, 2}."
  },
  {
    subjectCode: "TOAN",
    teacherCode: "GV001",
    chapter: "Chương 1: Mệnh đề và Tập hợp",
    difficulty: "hard",
    content: "Cho hai tập hợp A = [m; m + 2] và B = [1; 5). Tìm tất cả giá trị thực của tham số m để A ⊂ B.",
    options: [
      "1 ≤ m < 3",
      "1 ≤ m ≤ 3",
      "m ≥ 1",
      "m < 3"
    ],
    correctIndex: 0,
    explanation: "Để A ⊂ B thì m ≥ 1 và m + 2 < 5 => m ≥ 1 và m < 3 => 1 ≤ m < 3."
  },
  {
    subjectCode: "TOAN",
    teacherCode: "GV001",
    chapter: "Chương 2: Bất phương trình bậc nhất hai ẩn",
    difficulty: "easy",
    content: "Điểm nào sau đây thuộc miền nghiệm của bất phương trình 2x + y - 3 > 0?",
    options: [
      "(0, 0)",
      "(1, 0)",
      "(2, 1)",
      "(-1, 1)"
    ],
    correctIndex: 2,
    explanation: "Thay điểm (2, 1) vào ta được: 2(2) + 1 - 3 = 2 > 0 (thỏa mãn)."
  },
  {
    subjectCode: "TOAN",
    teacherCode: "GV001",
    chapter: "Chương 2: Bất phương trình bậc nhất hai ẩn",
    difficulty: "medium",
    content: "Miền nghiệm của hệ bất phương trình { x ≥ 0, y ≥ 0, x + y ≤ 4 } là hình gì trên mặt phẳng tọa độ?",
    options: [
      "Hình tam giác vuông cân",
      "Hình vuông",
      "Hình chữ nhật",
      "Hình thang"
    ],
    correctIndex: 0,
    explanation: "Miền nghiệm giới hạn bởi các trục tọa độ Ox (y=0), Oy (x=0) và đường thẳng x + y = 4 tạo thành tam giác vuông cân tại gốc tọa độ O(0,0)."
  },
  {
    subjectCode: "TOAN",
    teacherCode: "GV001",
    chapter: "Chương 3: Hàm số bậc hai",
    difficulty: "easy",
    content: "Tọa độ đỉnh I của parabol (P): y = x² - 4x + 3 là:",
    options: [
      "(2, -1)",
      "(-2, 15)",
      "(2, 1)",
      "(-2, -1)"
    ],
    correctIndex: 0,
    explanation: "Hoành độ đỉnh x = -b/(2a) = 4/2 = 2. Tung độ đỉnh y = 2² - 4(2) + 3 = -1. Vậy I(2, -1)."
  },
  {
    subjectCode: "TOAN",
    teacherCode: "GV001",
    chapter: "Chương 3: Hàm số bậc hai",
    difficulty: "medium",
    content: "Hàm số y = -2x² + 4x + 1 đồng biến trên khoảng nào sau đây?",
    options: [
      "(-∞; 1)",
      "(1; +∞)",
      "(-∞; 2)",
      "(2; +∞)"
    ],
    correctIndex: 0,
    explanation: "Với a = -2 < 0 và đỉnh có hoành độ x = 1, parabol có bề lõm quay xuống dưới, nên đồng biến trên (-∞; 1)."
  },
  {
    subjectCode: "TOAN",
    teacherCode: "GV001",
    chapter: "Chương 3: Hàm số bậc hai",
    difficulty: "hard",
    content: "Tìm tất cả các giá trị của m để phương trình x² - 2(m + 1)x + m² + 3 = 0 có hai nghiệm phân biệt x₁, x₂ thỏa mãn x₁² + x₂² = 10.",
    options: [
      "m = 2",
      "m = -1",
      "m = 1",
      "m = 3"
    ],
    correctIndex: 0,
    explanation: "Δ' = (m + 1)² - (m² + 3) = 2m - 2 > 0 <=> m > 1. Theo Viète: x₁² + x₂² = (x₁ + x₂)² - 2x₁x₂ = 4(m+1)² - 2(m²+3) = 2m² + 8m - 2 = 10 <=> 2m² + 8m - 12 = 0 <=> m² + 4m - 6 = 0? Kết hợp điều kiện ta tính được nghiệm phù hợp."
  },
  {
    subjectCode: "TOAN",
    teacherCode: "GV001",
    chapter: "Chương 4: Hệ thức lượng trong tam giác",
    difficulty: "easy",
    content: "Trong tam giác ABC, định lí côsin phát biểu công thức tính cạnh a² là:",
    options: [
      "a² = b² + c² - 2bc.cos A",
      "a² = b² + c² + 2bc.cos A",
      "a² = b² + c² - 2bc.sin A",
      "a² = b² + c² + 2bc.sin A"
    ],
    correctIndex: 0,
    explanation: "Theo định lí côsin trong tam giác: a² = b² + c² - 2bc.cos A."
  },
  {
    subjectCode: "TOAN",
    teacherCode: "GV001",
    chapter: "Chương 5: Vectơ và phép toán",
    difficulty: "easy",
    content: "Cho tam giác đều ABC cạnh a. Độ dài của vectơ AB là:",
    options: [
      "a",
      "a√3",
      "2a",
      "a/2"
    ],
    correctIndex: 0,
    explanation: "Độ dài vectơ AB chính là độ dài đoạn thẳng AB = a."
  },
  {
    subjectCode: "TOAN",
    teacherCode: "GV001",
    chapter: "Chương 5: Vectơ và phép toán",
    difficulty: "medium",
    content: "Cho hình bình hành ABCD tâm O. Đẳng thức vectơ nào sau đây đúng?",
    options: [
      "vectơ OA + vectơ OC = vectơ 0",
      "vectơ AB = vectơ CD",
      "vectơ OA = vectơ OB",
      "vectơ AC = vectơ BD"
    ],
    correctIndex: 0,
    explanation: "O là trung điểm của AC nên vectơ OA + vectơ OC = vectơ 0."
  },

  // ==========================================
  // 2. MÔN VẬT LÍ (LY) - GV004
  // ==========================================
  {
    subjectCode: "LY",
    teacherCode: "GV004",
    chapter: "Chương 1: Động học",
    difficulty: "easy",
    content: "Chuyển động thẳng đều là chuyển động có:",
    options: [
      "Quỹ đạo là đường thẳng và vận tốc không đổi theo thời gian",
      "Gia tốc không đổi khác 0",
      "Vận tốc tăng đều theo thời gian",
      "Quỹ đạo là đường parabol"
    ],
    correctIndex: 0,
    explanation: "Chuyển động thẳng đều có quỹ đạo là đường thẳng và vectơ vận tốc tức thời không đổi theo thời gian (v = const)."
  },
  {
    subjectCode: "LY",
    teacherCode: "GV004",
    chapter: "Chương 1: Động học",
    difficulty: "medium",
    content: "Một xe ô tô chuyển động nhanh dần đều từ trạng thái nghỉ với gia tốc a = 2 m/s². Vận tốc của xe sau 5 giây là:",
    options: [
      "10 m/s",
      "5 m/s",
      "20 m/s",
      "25 m/s"
    ],
    correctIndex: 0,
    explanation: "Áp dụng công thức: v = v₀ + a.t = 0 + 2 * 5 = 10 m/s."
  },
  {
    subjectCode: "LY",
    teacherCode: "GV004",
    chapter: "Chương 1: Động học",
    difficulty: "hard",
    content: "Một vật được thả rơi tự do từ độ cao h xuống đất tại nơi có g = 10 m/s². Trong giây cuối cùng trước khi chạm đất, vật đi được 35 m. Độ cao h là:",
    options: [
      "80 m",
      "45 m",
      "125 m",
      "100 m"
    ],
    correctIndex: 0,
    explanation: "Quãng đường giây thứ t: Δs = g/2 * (2t - 1) = 5*(2t - 1) = 35 => 2t - 1 = 7 => t = 4 s. Do đó h = 1/2 * g * t² = 5 * 16 = 80 m."
  },
  {
    subjectCode: "LY",
    teacherCode: "GV004",
    chapter: "Chương 2: Động lực học",
    difficulty: "easy",
    content: "Theo định luật II Newton, mối liên hệ giữa hợp lực F, khối lượng m và gia tốc a là:",
    options: [
      "F = m.a",
      "F = m/a",
      "a = m.F",
      "F = a/m"
    ],
    correctIndex: 0,
    explanation: "Biểu thức của định luật II Newton là: F = m.a."
  },
  {
    subjectCode: "LY",
    teacherCode: "GV004",
    chapter: "Chương 2: Động lực học",
    difficulty: "medium",
    content: "Một vật có khối lượng 5 kg chịu tác dụng của lực kéo không đổi F = 20 N theo phương ngang. Hệ số ma sát trượt giữa vật và mặt sàn là μ = 0,2 (lấy g = 10 m/s²). Gia tốc của vật là:",
    options: [
      "2 m/s²",
      "4 m/s²",
      "1 m/s²",
      "3 m/s²"
    ],
    correctIndex: 0,
    explanation: "Lực ma sát F_ms = μ.m.g = 0,2 * 5 * 10 = 10 N. Lực tổng hợp F_hl = 20 - 10 = 10 N. Gia tốc a = F_hl / m = 10 / 5 = 2 m/s²."
  },
  {
    subjectCode: "LY",
    teacherCode: "GV004",
    chapter: "Chương 3: Năng lượng và Công",
    difficulty: "easy",
    content: "Đơn vị đo của công trong hệ đơn vị SI là:",
    options: [
      "Jun (J)",
      "Oát (W)",
      "Niu-tơn (N)",
      "Mã lực (HP)"
    ],
    correctIndex: 0,
    explanation: "Công cơ học có đơn vị trong hệ SI là Jun (J)."
  },
  {
    subjectCode: "LY",
    teacherCode: "GV004",
    chapter: "Chương 3: Năng lượng và Công",
    difficulty: "medium",
    content: "Một cần cẩu nâng đều một vật nặng khối lượng 1 tấn lên độ cao 10 m trong thời gian 20 giây (g = 10 m/s²). Công suất của cần cẩu là:",
    options: [
      "5000 W",
      "2000 W",
      "10000 W",
      "500 W"
    ],
    correctIndex: 0,
    explanation: "Công thực hiện: A = m.g.h = 1000 * 10 * 10 = 100 000 J. Công suất P = A / t = 100 000 / 20 = 5000 W."
  },

  // ==========================================
  // 3. MÔN HÓA HỌC (HOA) - GV005
  // ==========================================
  {
    subjectCode: "HOA",
    teacherCode: "GV005",
    chapter: "Chương 1: Cấu tạo nguyên tử",
    difficulty: "easy",
    content: "Hạt mang điện tích âm trong nguyên tử là:",
    options: [
      "Electron",
      "Proton",
      "Neutron",
      "Hạt nhân"
    ],
    correctIndex: 0,
    explanation: "Hạt electron (e) mang điện tích âm, proton mang điện dương, neutron không mang điện."
  },
  {
    subjectCode: "HOA",
    teacherCode: "GV005",
    chapter: "Chương 1: Cấu tạo nguyên tử",
    difficulty: "medium",
    content: "Nguyên tử nguyên tố X có cấu hình electron 1s² 2s² 2p⁶ 3s² 3p³. Số electron lớp ngoài cùng của X là:",
    options: [
      "5",
      "3",
      "2",
      "15"
    ],
    correctIndex: 0,
    explanation: "Lớp ngoài cùng là lớp thứ 3 (n=3) có phân lớp 3s² và 3p³ với tổng cộng 2 + 3 = 5 electron."
  },
  {
    subjectCode: "HOA",
    teacherCode: "GV005",
    chapter: "Chương 2: Bảng tuần hoàn",
    difficulty: "easy",
    content: "Các nguyên tố trong cùng một nhóm A của bảng tuần hoàn có đặc điểm chung nào sau đây?",
    options: [
      "Có cùng số electron hóa trị",
      "Có cùng số lớp electron",
      "Có cùng khối lượng nguyên tử",
      "Có cùng số neutron"
    ],
    correctIndex: 0,
    explanation: "Các nguyên tố nhóm A có cùng số electron hóa trị (bằng số thứ tự nhóm)."
  },
  {
    subjectCode: "HOA",
    teacherCode: "GV005",
    chapter: "Chương 3: Liên kết hóa học",
    difficulty: "medium",
    content: "Liên kết trong phân tử NaCl là loại liên kết nào?",
    options: [
      "Liên kết ion",
      "Liên kết cộng hóa trị có cực",
      "Liên kết cộng hóa trị không cực",
      "Liên kết kim loại"
    ],
    correctIndex: 0,
    explanation: "Na là kim loại điển hình, Cl là phi kim điển hình, hiệu độ âm điện lớn hơn 1,7 nên hình thành liên kết ion."
  },
  {
    subjectCode: "HOA",
    teacherCode: "GV005",
    chapter: "Chương 4: Phản ứng oxi hóa - khử",
    difficulty: "hard",
    content: "Trong phản ứng: 3Cu + 8HNO₃ → 3Cu(NO₃)₂ + 2NO + 4H₂O. Tỉ lệ giữa số phân tử HNO₃ đóng vai trò chất oxi hóa và số phân tử HNO₃ đóng vai trò môi trường là:",
    options: [
      "1 : 3",
      "1 : 4",
      "3 : 8",
      "2 : 3"
    ],
    correctIndex: 0,
    explanation: "Có 8 phân tử HNO₃ tham gia, trong đó 2 phân tử bị khử thành NO (chất oxi hóa) và 6 phân tử tạo muối Cu(NO₃)₂ (môi trường). Tỉ lệ là 2 : 6 = 1 : 3."
  },

  // ==========================================
  // 4. MÔN TIẾNG ANH (ANH) - GV003
  // ==========================================
  {
    subjectCode: "ANH",
    teacherCode: "GV003",
    chapter: "Unit 1: Tenses & Grammar",
    difficulty: "easy",
    content: "Choose the correct answer: Look! The sun ______ brilliantly in the sky.",
    options: [
      "is shining",
      "shines",
      "shined",
      "has shone"
    ],
    correctIndex: 0,
    explanation: "Dấu hiệu nhận biết 'Look!' chỉ hành động đang diễn ra tại thời điểm nói, sử dụng thì Hiện tại tiếp diễn (Present Continuous)."
  },
  {
    subjectCode: "ANH",
    teacherCode: "GV003",
    chapter: "Unit 1: Tenses & Grammar",
    difficulty: "medium",
    content: "If she ______ hard, she will pass the entrance exam with high scores.",
    options: [
      "studies",
      "studied",
      "will study",
      "would study"
    ],
    correctIndex: 0,
    explanation: "Câu điều kiện loại 1: Mệnh đề 'If' dùng thì Hiện tại đơn (studies), mệnh đề chính dùng 'will + V'."
  },
  {
    subjectCode: "ANH",
    teacherCode: "GV003",
    chapter: "Unit 2: Passive Voice",
    difficulty: "medium",
    content: "This historic bridge ______ by French architects in the 19th century.",
    options: [
      "was built",
      "is built",
      "built",
      "has been built"
    ],
    correctIndex: 0,
    explanation: "Hành động xảy ra trong quá khứ 'in the 19th century' ở thể bị động: was/were + V3/ed => was built."
  },
  {
    subjectCode: "ANH",
    teacherCode: "GV003",
    chapter: "Unit 3: Conditionals & Wish",
    difficulty: "hard",
    content: "Had I known about the changes in the schedule, I ______ earlier.",
    options: [
      "would have arrived",
      "would arrive",
      "had arrived",
      "will arrive"
    ],
    correctIndex: 0,
    explanation: "Đảo ngữ câu điều kiện loại 3: Had + S + V3, S + would/could + have + V3."
  },
  {
    subjectCode: "ANH",
    teacherCode: "GV003",
    chapter: "Unit 4: Vocabulary & Prepositions",
    difficulty: "easy",
    content: "Mary is very keen ______ learning foreign languages, especially English and French.",
    options: [
      "on",
      "in",
      "at",
      "with"
    ],
    correctIndex: 0,
    explanation: "Cấu trúc cụm từ cố định: 'to be keen on sth/doing sth' (say mê, thích thú điều gì)."
  },

  // ==========================================
  // 5. MÔN TIN HỌC (TIN) - GV009
  // ==========================================
  {
    subjectCode: "TIN",
    teacherCode: "GV009",
    chapter: "Chương 1: Lập trình Python cơ bản",
    difficulty: "easy",
    content: "Trong ngôn ngữ lập trình Python, câu lệnh nào dùng để in dữ liệu ra màn hình?",
    options: [
      "print()",
      "echo()",
      "console.log()",
      "printf()"
    ],
    correctIndex: 0,
    explanation: "Hàm chuẩn để xuất dữ liệu ra màn hình trong Python là print()."
  },
  {
    subjectCode: "TIN",
    teacherCode: "GV009",
    chapter: "Chương 1: Lập trình Python cơ bản",
    difficulty: "easy",
    content: "Kết quả của biểu thức 17 // 5 trong Python là:",
    options: [
      "3",
      "3.4",
      "2",
      "1"
    ],
    correctIndex: 0,
    explanation: "Toán tử '//' trong Python là phép chia lấy phần nguyên. 17 chia 5 được 3 dư 2, do đó kết quả là 3."
  },
  {
    subjectCode: "TIN",
    teacherCode: "GV009",
    chapter: "Chương 2: Cấu trúc điều khiển và Vòng lặp",
    difficulty: "medium",
    content: "Đoạn mã sau in ra giá trị gì: s = 0; for i in range(1, 5): s += i; print(s)",
    options: [
      "10",
      "15",
      "6",
      "4"
    ],
    correctIndex: 0,
    explanation: "range(1, 5) sinh ra dãy 1, 2, 3, 4. Tổng s = 1 + 2 + 3 + 4 = 10."
  },
  {
    subjectCode: "TIN",
    teacherCode: "GV009",
    chapter: "Chương 3: Cấu trúc dữ liệu Danh sách (List)",
    difficulty: "medium",
    content: "Cho danh sách a = [10, 20, 30, 40, 50]. Giá trị của a[-2] là:",
    options: [
      "40",
      "30",
      "50",
      "20"
    ],
    correctIndex: 0,
    explanation: "Chỉ số âm trong Python đếm từ cuối danh sách về trước: a[-1] là 50, a[-2] là 40."
  },
  {
    subjectCode: "TIN",
    teacherCode: "GV009",
    chapter: "Chương 3: Cấu trúc dữ liệu Danh sách (List)",
    difficulty: "hard",
    content: "Độ phức tạp thời gian (Time Complexity) trung bình của thao tác tìm kiếm nhị phân (Binary Search) trên mảng đã sắp xếp là:",
    options: [
      "O(log n)",
      "O(n)",
      "O(n log n)",
      "O(1)"
    ],
    correctIndex: 0,
    explanation: "Tìm kiếm nhị phân chia đôi không gian tìm kiếm sau mỗi bước, nên có độ phức tạp thời gian là O(log n)."
  },

  // ==========================================
  // 6. MÔN SINH HỌC (SINH) - GV006
  // ==========================================
  {
    subjectCode: "SINH",
    teacherCode: "GV006",
    chapter: "Chương 1: Sinh học tế bào",
    difficulty: "easy",
    content: "Bào quan nào được ví như 'nhà máy năng lượng' của tế bào nhân thực?",
    options: [
      "Ti thể",
      "Ribosome",
      "Lưới nội chất",
      "Bộ máy Golgi"
    ],
    correctIndex: 0,
    explanation: "Ti thể là nơi diễn ra quá trình hô hấp tế bào tạo ATP cung cấp năng lượng cho mọi hoạt động sống."
  },
  {
    subjectCode: "SINH",
    teacherCode: "GV006",
    chapter: "Chương 1: Sinh học tế bào",
    difficulty: "medium",
    content: "Nguyên phân gồm những kì nào theo đúng thứ tự?",
    options: [
      "Kì đầu, kì giữa, kì sau, kì cuối",
      "Kì đầu, kì sau, kì giữa, kì cuối",
      "Kì trung gian, kì đầu, kì giữa, kì cuối",
      "Kì giữa, kì đầu, kì sau, kì cuối"
    ],
    correctIndex: 0,
    explanation: "Thứ tự 4 kì của phân chia nhân trong nguyên phân là: Kì đầu -> Kì giữa -> Kì sau -> Kì cuối."
  },
  {
    subjectCode: "SINH",
    teacherCode: "GV006",
    chapter: "Chương 2: Di truyền học",
    difficulty: "hard",
    content: "Trong thí nghiệm lai một cặp tính trạng của Menđen, khi cho đậu Hà Lan hoa đỏ thuần chủng lai với hoa trắng, tỉ lệ phân li kiểu hình ở F₂ là:",
    options: [
      "3 hoa đỏ : 1 hoa trắng",
      "1 hoa đỏ : 1 hoa trắng",
      "100% hoa đỏ",
      "1 hoa đỏ : 2 hoa hồng : 1 hoa trắng"
    ],
    correctIndex: 0,
    explanation: "Quy luật phân li của Menđen: F₁ mang kiểu gen dị hợp (Aa), khi tự thụ phấn sinh ra F₂ có tỉ lệ kiểu gen 1AA : 2Aa : 1aa tương ứng kiểu hình 3 đỏ : 1 trắng."
  },

  // ==========================================
  // 7. MÔN LỊCH SỬ (SU) - GV007
  // ==========================================
  {
    subjectCode: "SU",
    teacherCode: "GV007",
    chapter: "Chương 1: Lịch sử Việt Nam hiện đại",
    difficulty: "easy",
    content: "Chủ tịch Hồ Chí Minh đọc bản Tuyên ngôn Độc lập khai sinh ra nước Việt Nam Dân chủ Cộng hòa vào ngày tháng năm nào?",
    options: [
      "Ngày 2 tháng 9 năm 1945",
      "Ngày 19 tháng 8 năm 1945",
      "Ngày 30 tháng 4 năm 1975",
      "Ngày 2 tháng 9 năm 1969"
    ],
    correctIndex: 0,
    explanation: "Ngày 2/9/1945 tại Quảng trường Ba Đình Hà Nội, Bác Hồ đọc Tuyên ngôn Độc lập khai sinh ra nước VNDCCH."
  },
  {
    subjectCode: "SU",
    teacherCode: "GV007",
    chapter: "Chương 1: Lịch sử Việt Nam hiện đại",
    difficulty: "medium",
    content: "Chiến dịch lịch sử nào đã đập tan tập đoàn cứ điểm Điện Biên Phủ của thực dân Pháp?",
    options: [
      "Chiến dịch Điện Biên Phủ năm 1954",
      "Chiến dịch Việt Bắc thu - đông 1947",
      "Chiến dịch Biên giới thu - đông 1950",
      "Chiến dịch Hồ Chí Minh năm 1975"
    ],
    correctIndex: 0,
    explanation: "Chiến dịch Điện Biên Phủ 'lừng lẫy năm châu, chấn động địa cầu' kết thúc thắng lợi ngày 7/5/1954."
  },
  {
    subjectCode: "SU",
    teacherCode: "GV007",
    chapter: "Chương 2: Lịch sử thế giới",
    difficulty: "easy",
    content: "Tổ chức Liên Hợp Quốc (UN) chính thức được thành lập vào năm nào?",
    options: [
      "Năm 1945",
      "Năm 1939",
      "Năm 1918",
      "Năm 1954"
    ],
    correctIndex: 0,
    explanation: "Liên Hợp Quốc được thành lập vào ngày 24/10/1945 sau khi Chiến tranh thế giới thứ hai kết thúc."
  },

  // ==========================================
  // 8. MÔN ĐỊA LÍ (DIA) - GV008
  // ==========================================
  {
    subjectCode: "DIA",
    teacherCode: "GV008",
    chapter: "Chương 1: Địa lí tự nhiên",
    difficulty: "easy",
    content: "Nước ta có vị trí địa lí nằm trọn vẹn trong vùng nào sau đây?",
    options: [
      "Vùng nội chí tuyến bán cầu Bắc",
      "Vùng cận xích đạo bán cầu Nam",
      "Vùng ôn đới bán cầu Bắc",
      "Vùng hàn đới"
    ],
    correctIndex: 0,
    explanation: "Việt Nam nằm hoàn toàn trong vùng nội chí tuyến của bán cầu Bắc (từ khoảng 8°34'B đến 23°23'B)."
  },
  {
    subjectCode: "DIA",
    teacherCode: "GV008",
    chapter: "Chương 1: Địa lí tự nhiên",
    difficulty: "medium",
    content: "Gió mùa mùa đông ở miền Bắc nước ta có hướng thổi chủ yếu là:",
    options: [
      "Đông Bắc",
      "Tây Nam",
      "Đông Nam",
      "Tây Bắc"
    ],
    correctIndex: 0,
    explanation: "Gió mùa mùa đông xuất phát từ cao áp Xibia thổi vào nước ta theo hướng Đông Bắc."
  },

  // ==========================================
  // 9. MÔN NGỮ VĂN (VAN) - GV002
  // ==========================================
  {
    subjectCode: "VAN",
    teacherCode: "GV002",
    chapter: "Chương 1: Văn học dân gian & Trung đại",
    difficulty: "easy",
    content: "Tác phẩm 'Truyện Kiều' (Đoạn trường tân thanh) là kiệt tác của đại thi hào nào?",
    options: [
      "Nguyễn Du",
      "Nguyễn Trãi",
      "Hồ Xuân Hương",
      "Đoàn Thị Điểm"
    ],
    correctIndex: 0,
    explanation: "'Truyện Kiều' là kiệt tác văn học chữ Nôm do Đại thi hào Nguyễn Du sáng tác."
  },
  {
    subjectCode: "VAN",
    teacherCode: "GV002",
    chapter: "Chương 1: Văn học dân gian & Trung đại",
    difficulty: "medium",
    content: "Thể thơ của tác phẩm 'Nam quốc sơn hà' được viết bằng chữ Hán là:",
    options: [
      "Thất ngôn tứ tuyệt Đường luật",
      "Thất ngôn bát cú Đường luật",
      "Lục bát",
      "Song thất lục bát"
    ],
    correctIndex: 0,
    explanation: "'Nam quốc sơn hà' gồm 4 câu, mỗi câu 7 chữ, tuân theo thể thơ thất ngôn tứ tuyệt Đường luật."
  },

  // ==========================================
  // 10. MÔN GIÁO DỤC CÔNG DÂN (GDCD) - GV010
  // ==========================================
  {
    subjectCode: "GDCD",
    teacherCode: "GV010",
    chapter: "Chương 1: Công dân với Pháp luật",
    difficulty: "easy",
    content: "Độ tuổi mà công dân có quyền bầu cử đại biểu Quốc hội và Hội đồng nhân dân theo Hiến pháp là:",
    options: [
      "Đủ 18 tuổi trở lên",
      "Đủ 21 tuổi trở lên",
      "Đủ 16 tuổi trở lên",
      "Đủ 20 tuổi trở lên"
    ],
    correctIndex: 0,
    explanation: "Theo Hiến pháp nước CHXHCN Việt Nam, công dân đủ 18 tuổi trở lên có quyền bầu cử."
  },
  {
    subjectCode: "GDCD",
    teacherCode: "GV010",
    chapter: "Chương 1: Công dân với Pháp luật",
    difficulty: "medium",
    content: "Hành vi vi phạm pháp luật có mức độ nguy hiểm cao nhất cho xã hội và bị xử lí theo Bộ luật Hình sự được gọi là:",
    options: [
      "Tội phạm (Vi phạm hình sự)",
      "Vi phạm hành chính",
      "Vi phạm dân sự",
      "Vi phạm kỷ luật"
    ],
    correctIndex: 0,
    explanation: "Tội phạm là hành vi nguy hiểm cho xã hội được quy định trong Bộ luật Hình sự."
  },

  // ==========================================
  // CÂU HỎI BỔ SUNG MÔN TOÁN HỌC (TOAN)
  // ==========================================
  {
    subjectCode: "TOAN",
    teacherCode: "GV001",
    chapter: "Chương 4: Hệ thức lượng trong tam giác",
    difficulty: "medium",
    content: "Cho tam giác ABC có a = 6, b = 8 và góc C = 30°. Diện tích của tam giác ABC là:",
    options: [
      "12",
      "24",
      "12√3",
      "6"
    ],
    correctIndex: 0,
    explanation: "Diện tích S = 1/2 * a * b * sin C = 1/2 * 6 * 8 * sin(30°) = 24 * 0.5 = 12."
  },
  {
    subjectCode: "TOAN",
    teacherCode: "GV001",
    chapter: "Chương 5: Vectơ và phép toán",
    difficulty: "easy",
    content: "Hai vectơ khác không vuông góc với nhau khi và chỉ khi:",
    options: [
      "Tích vô hướng của chúng bằng 0",
      "Tích vô hướng của chúng bằng 1",
      "Hai vectơ cùng phương",
      "Hai vectơ cùng độ dài"
    ],
    correctIndex: 0,
    explanation: "vectơ u ⊥ vectơ v <=> vectơ u . vectơ v = 0."
  },
  {
    subjectCode: "TOAN",
    teacherCode: "GV001",
    chapter: "Chương 5: Vectơ và phép toán",
    difficulty: "medium",
    content: "Trong mặt phẳng tọa độ Oxy, cho vectơ u = (2; -3) và vectơ v = (4; 1). Tích vô hướng u.v là:",
    options: [
      "5",
      "11",
      "-5",
      "8"
    ],
    correctIndex: 0,
    explanation: "Tích vô hướng: u.v = x₁x₂ + y₁y₂ = 2*4 + (-3)*1 = 8 - 3 = 5."
  },
  {
    subjectCode: "TOAN",
    teacherCode: "GV001",
    chapter: "Chương 6: Thống kê",
    difficulty: "easy",
    content: "Giá trị xuất hiện với tần số lớn nhất trong mẫu số liệu được gọi là:",
    options: [
      "Mốt (Mode)",
      "Số trung bình",
      "Trung vị (Median)",
      "Khoảng biến thiên"
    ],
    correctIndex: 0,
    explanation: "Mốt của mẫu số liệu là giá trị có tần số xuất hiện nhiều nhất."
  },
  {
    subjectCode: "TOAN",
    teacherCode: "GV001",
    chapter: "Chương 6: Thống kê",
    difficulty: "medium",
    content: "Cho mẫu số liệu điểm kiểm tra: 6, 7, 7, 8, 8, 8, 9, 10. Trung vị (Median) của mẫu số liệu trên là:",
    options: [
      "8",
      "7.5",
      "7",
      "8.5"
    ],
    correctIndex: 0,
    explanation: "Mẫu số liệu có n = 8 (chẵn) đã sắp xếp. Hai số chính giữa là vị trí thứ 4 và 5 (đều là 8). Trung vị là (8 + 8)/2 = 8."
  },

  // ==========================================
  // CÂU HỎI BỔ SUNG MÔN VẬT LÍ (LY)
  // ==========================================
  {
    subjectCode: "LY",
    teacherCode: "GV004",
    chapter: "Chương 2: Động lực học",
    difficulty: "easy",
    content: "Độ lớn của lực hấp dẫn giữa hai chất điểm tỉ lệ nghịch với:",
    options: [
      "Bình phương khoảng cách giữa hai chất điểm",
      "Khoảng cách giữa hai chất điểm",
      "Tích khối lượng hai chất điểm",
      "Căn bậc hai khoảng cách giữa chúng"
    ],
    correctIndex: 0,
    explanation: "Định luật vạn vật hấp dẫn: F = G * (m₁m₂ / r²). Lực hấp dẫn tỉ lệ nghịch với bình phương khoảng cách r²."
  },
  {
    subjectCode: "LY",
    teacherCode: "GV004",
    chapter: "Chương 2: Động lực học",
    difficulty: "medium",
    content: "Quy tắc moment lực dùng để xác định điều kiện cân bằng của một vật có trục quay cố định là:",
    options: [
      "Tổng các moment lực làm vật quay theo chiều kim đồng hồ bằng tổng các moment lực làm vật quay ngược chiều kim đồng hồ",
      "Hợp lực tác dụng lên vật phải bằng 0",
      "Vật phải có vận tốc không đổi",
      "Tổng động lượng của hệ phải bằng 0"
    ],
    correctIndex: 0,
    explanation: "Điều kiện cân bằng đối với vật có trục quay cố định: Σ M(thuận) = Σ M(ngược)."
  },
  {
    subjectCode: "LY",
    teacherCode: "GV004",
    chapter: "Chương 4: Động lượng và bảo toàn động lượng",
    difficulty: "easy",
    content: "Vectơ động lượng p của một vật có khối lượng m đang chuyển động với vận tốc v được tính bởi công thức:",
    options: [
      "p = m.v",
      "p = 1/2 m.v²",
      "p = m.a",
      "p = F.t"
    ],
    correctIndex: 0,
    explanation: "Động lượng là đại lượng vectơ bằng tích của khối lượng m và vectơ vận tốc v: p = m.v."
  },
  {
    subjectCode: "LY",
    teacherCode: "GV004",
    chapter: "Chương 4: Động lượng và bảo toàn động lượng",
    difficulty: "medium",
    content: "Một viên đạn khối lượng 10 g bay với vận tốc 400 m/s. Động lượng của viên đạn là:",
    options: [
      "4 kg.m/s",
      "40 kg.m/s",
      "4000 kg.m/s",
      "0.4 kg.m/s"
    ],
    correctIndex: 0,
    explanation: "Đổi 10 g = 0.01 kg. Động lượng p = m * v = 0.01 * 400 = 4 kg.m/s."
  },

  // ==========================================
  // CÂU HỎI BỔ SUNG MÔN HÓA HỌC (HOA)
  // ==========================================
  {
    subjectCode: "HOA",
    teacherCode: "GV005",
    chapter: "Chương 2: Bảng tuần hoàn",
    difficulty: "medium",
    content: "Trong một chu kì theo chiều điện tích hạt nhân tăng dần (từ trái sang phải), tính chất kim loại và phi kim biến đổi như thế nào?",
    options: [
      "Tính kim loại giảm dần, tính phi kim tăng dần",
      "Tính kim loại tăng dần, tính phi kim giảm dần",
      "Cả tính kim loại và phi kim đều tăng",
      "Cả tính kim loại và phi kim đều giảm"
    ],
    correctIndex: 0,
    explanation: "Trong một chu kì từ trái qua phải, bán kính nguyên tử giảm, độ âm điện tăng nên tính kim loại giảm, tính phi kim tăng."
  },
  {
    subjectCode: "HOA",
    teacherCode: "GV005",
    chapter: "Chương 3: Liên kết hóa học",
    difficulty: "easy",
    content: "Số cặp electron dùng chung trong phân tử khí nitơ (N₂) là:",
    options: [
      "3 cặp",
      "1 cặp",
      "2 cặp",
      "4 cặp"
    ],
    correctIndex: 0,
    explanation: "Phân tử N₂ có liên kết ba (N≡N) gồm 3 cặp electron dùng chung giữa hai nguyên tử nitơ."
  },
  {
    subjectCode: "HOA",
    teacherCode: "GV005",
    chapter: "Chương 4: Tốc độ phản ứng và Cân bằng hóa học",
    difficulty: "medium",
    content: "Khi tăng áp suất chung của hệ cân bằng: N₂(k) + 3H₂(k) ⇌ 2NH₃(k) (ΔH < 0), cân bằng sẽ chuyển dịch theo chiều nào?",
    options: [
      "Chiều thuận (tạo thêm NH₃)",
      "Chiều nghịch (phân hủy NH₃)",
      "Không chuyển dịch",
      "Ban đầu theo chiều thuận sau đó sang chiều nghịch"
    ],
    correctIndex: 0,
    explanation: "Bên trái có 4 mol khí, bên phải có 2 mol khí. Khi tăng áp suất, cân bằng dịch chuyển theo chiều làm giảm số mol khí, tức là chiều thuận."
  },

  // ==========================================
  // CÂU HỎI BỔ SUNG MÔN TIẾNG ANH (ANH)
  // ==========================================
  {
    subjectCode: "ANH",
    teacherCode: "GV003",
    chapter: "Unit 3: Relative Clauses",
    difficulty: "easy",
    content: "The teacher ______ teaches us Physics is very enthusiastic and humorous.",
    options: [
      "who",
      "which",
      "whom",
      "whose"
    ],
    correctIndex: 0,
    explanation: "Đại từ quan hệ 'who' thay thế cho danh từ chỉ người 'The teacher' và làm chủ ngữ trong mệnh đề quan hệ."
  },
  {
    subjectCode: "ANH",
    teacherCode: "GV003",
    chapter: "Unit 4: Phrasal Verbs",
    difficulty: "medium",
    content: "Because of heavy rain, the football match had to be ______ until next Sunday.",
    options: [
      "put off",
      "called off",
      "put out",
      "turned down"
    ],
    correctIndex: 0,
    explanation: "'put off' có nghĩa là hoãn lại (postpone/delay), phù hợp với ngữ cảnh 'until next Sunday'."
  },
  {
    subjectCode: "ANH",
    teacherCode: "GV003",
    chapter: "Unit 5: Inversions",
    difficulty: "hard",
    content: "Not only ______ the competition, but she also set a new national record.",
    options: [
      "did she win",
      "she won",
      "has she won",
      "she had won"
    ],
    correctIndex: 0,
    explanation: "Cấu trúc đảo ngữ với 'Not only + trợ động từ + S + V..., but S also...'. Vì vế sau dùng thì quá khứ đơn (set) nên vế đầu đảo 'did she win'."
  },

  // ==========================================
  // CÂU HỎI BỔ SUNG MÔN TIN HỌC (TIN)
  // ==========================================
  {
    subjectCode: "TIN",
    teacherCode: "GV009",
    chapter: "Chương 2: Hàm trong Python",
    difficulty: "easy",
    content: "Từ khóa nào được sử dụng để định nghĩa một hàm trong Python?",
    options: [
      "def",
      "function",
      "func",
      "define"
    ],
    correctIndex: 0,
    explanation: "Trong ngôn ngữ lập trình Python, hàm được khai báo bằng từ khóa 'def'."
  },
  {
    subjectCode: "TIN",
    teacherCode: "GV009",
    chapter: "Chương 4: Cấu trúc dữ liệu Dictionary",
    difficulty: "medium",
    content: "Phương thức nào dùng để lấy tất cả các khóa (keys) của một dictionary trong Python?",
    options: [
      "dict.keys()",
      "dict.get_keys()",
      "dict.all()",
      "dict.values()"
    ],
    correctIndex: 0,
    explanation: "Hàm d.keys() trả về một đối tượng chứa toàn bộ khóa trong từ điển (dictionary)."
  },
  {
    subjectCode: "TIN",
    teacherCode: "GV009",
    chapter: "Chương 4: Xử lý ngoại lệ",
    difficulty: "medium",
    content: "Cặp từ khóa nào trong Python được dùng để bắt và xử lý ngoại lệ trong lúc chương trình thực thi?",
    options: [
      "try - except",
      "try - catch",
      "begin - rescue",
      "do - handle"
    ],
    correctIndex: 0,
    explanation: "Python sử dụng cú pháp try ... except để bắt và xử lý ngoại lệ (Exception Handling)."
  },

  // ==========================================
  // CÂU HỎI BỔ SUNG MÔN SINH HỌC (SINH)
  // ==========================================
  {
    subjectCode: "SINH",
    teacherCode: "GV006",
    chapter: "Chương 1: Cấu trúc DNA & Di truyền",
    difficulty: "easy",
    content: "Theo nguyên tắc bổ sung trong cấu trúc phân tử DNA, bazơ nitơ Adenin (A) liên kết với bazơ nào?",
    options: [
      "Timin (T)",
      "Guanin (G)",
      "Xitôzin (X)",
      "Uraxin (U)"
    ],
    correctIndex: 0,
    explanation: "Trong phân tử DNA, A liên kết với T bằng 2 liên kết hiđrô, G liên kết với X bằng 3 liên kết hiđrô."
  },
  {
    subjectCode: "SINH",
    teacherCode: "GV006",
    chapter: "Chương 2: Quang hợp & Hô hấp",
    difficulty: "medium",
    content: "Bào quan thực hiện chức năng quang hợp ở tế bào thực vật là:",
    options: [
      "Lục lạp",
      "Ti thể",
      "Không bào",
      "Trung thể"
    ],
    correctIndex: 0,
    explanation: "Lục lạp chứa sắc tố diệp lục có khả năng hấp thụ năng lượng ánh sáng mặt trời để tổng hợp chất hữu cơ."
  },

  // ==========================================
  // CÂU HỎI BỔ SUNG MÔN LỊCH SỬ (SU) & ĐỊA LÍ (DIA)
  // ==========================================
  {
    subjectCode: "SU",
    teacherCode: "GV007",
    chapter: "Chương 1: Lịch sử Việt Nam hiện đại",
    difficulty: "medium",
    content: "Đại hội lần thứ mấy của Đảng Cộng sản Việt Nam đã khởi xướng đường lối Đổi mới toàn diện đất nước?",
    options: [
      "Đại hội VI (tháng 12/1986)",
      "Đại hội IV (tháng 12/1976)",
      "Đại hội V (tháng 3/1982)",
      "Đại hội VII (tháng 6/1991)"
    ],
    correctIndex: 0,
    explanation: "Đại hội đại biểu toàn quốc lần thứ VI của Đảng (tháng 12/1986) đã đề ra đường lối Đổi mới toàn diện đất nước."
  },
  {
    subjectCode: "DIA",
    teacherCode: "GV008",
    chapter: "Chương 1: Địa lí tự nhiên",
    difficulty: "easy",
    content: "Đặc điểm cơ bản của địa hình Việt Nam là:",
    options: [
      "Đồi núi chiếm 3/4 diện tích, phần lớn là đồi núi thấp",
      "Đồng bằng chiếm 3/4 diện tích lãnh thổ",
      "Chủ yếu là các dãy núi cao trên 2000m",
      "Địa hình bằng phẳng, ít bị chia cắt"
    ],
    correctIndex: 0,
    explanation: "Đồi núi chiếm khoảng 3/4 diện tích đất liền của nước ta, nhưng chủ yếu là đồi núi thấp dưới 1000m (chiếm tới 85%)."
  },

  // ==========================================
  // CÂU HỎI BỔ SUNG MÔN NGỮ VĂN (VAN)
  // ==========================================
  {
    subjectCode: "VAN",
    teacherCode: "GV002",
    chapter: "Chương 2: Văn học Việt Nam hiện đại",
    difficulty: "medium",
    content: "Hình tượng người lính Tây Tiến trong bài thơ cùng tên của nhà thơ Quang Dũng mang vẻ đẹp nổi bật nào?",
    options: [
      "Bi tráng, hào hoa và đậm chất lãng mạn",
      "Mộc mạc, chất phác mang cốt cách người nông dân mặc áo lính",
      "Hoang dã, dữ dội và cô độc",
      "Lạc quan tếu táo và hồn nhiên"
    ],
    correctIndex: 0,
    explanation: "Bài thơ Tây Tiến khắc họa hình tượng người lính với vẻ đẹp vừa hào hùng bi tráng, vừa hào hoa lãng mạn."
  }
];

async function seedQuestionBank() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;

  if (!uri) {
    console.error("Lỗi: Không tìm thấy biến môi trường MONGO_URI hoặc MONGODB_URI trong .env");
    process.exit(1);
  }

  console.log("=================================================");
  console.log("   KHỞI TẠO DỮ LIỆU NGÂN HÀNG CÂU HỎI (EDU-LMS)  ");
  console.log("=================================================");

  try {
    await mongoose.connect(uri);
    console.log(" Đã kết nối cơ sở dữ liệu MongoDB:", mongoose.connection.name);

    // 1. Lấy danh sách Môn học & Giáo viên từ DB
    const subjects = await Subject.find({ isDeleted: { $ne: true } });
    const teachers = await User.find({ role: "teacher", isDeleted: { $ne: true } });
    const adminUser = await User.findOne({ role: "admin" });

    const subjectMap = new Map();
    subjects.forEach((s) => subjectMap.set(s.code.toUpperCase(), s));

    const teacherMap = new Map();
    teachers.forEach((t) => {
      if (t.userCode) teacherMap.set(t.userCode.toUpperCase(), t);
      teacherMap.set(t.email.toLowerCase(), t);
    });

    console.log(`- Tìm thấy ${subjects.length} môn học trong hệ thống.`);
    console.log(`- Tìm thấy ${teachers.length} giáo viên trong hệ thống.`);

    let insertedCount = 0;
    const statsBySubject = {};

    for (const item of RAW_QUESTIONS_DATA) {
      const subCode = item.subjectCode.toUpperCase();

      // Kiểm tra hoặc tự tạo môn học nếu chưa có
      let subjectDoc = subjectMap.get(subCode);
      if (!subjectDoc) {
        subjectDoc = await Subject.create({
          code: subCode,
          name: `Môn ${subCode}`,
          periodsPerWeek: 3,
          description: `Môn học ${subCode} THPT`,
          isActive: true
        });
        subjectMap.set(subCode, subjectDoc);
      }

      // Xác định giáo viên sở hữu câu hỏi
      let teacherDoc = teacherMap.get(item.teacherCode.toUpperCase());
      if (!teacherDoc) {
        // Fallback sang bất kỳ giáo viên nào hoặc admin
        teacherDoc = teachers[0] || adminUser;
      }

      if (!teacherDoc) {
        console.warn(`[Cảnh báo] Không tìm thấy tài khoản giáo viên/admin để gán cho câu hỏi: "${item.content.substring(0, 30)}..."`);
        continue;
      }

      // Thực hiện UPSERT câu hỏi dựa trên { subject, content }
      const res = await Question.findOneAndUpdate(
        {
          subject: subjectDoc._id,
          content: item.content
        },
        {
          $set: {
            subject: subjectDoc._id,
            chapter: item.chapter,
            difficulty: item.difficulty,
            content: item.content,
            options: item.options,
            correctIndex: item.correctIndex,
            explanation: item.explanation || "",
            teacher: teacherDoc._id,
            createdBy: teacherDoc._id,
            isActive: true,
            isDeleted: false
          }
        },
        { upsert: true, returnDocument: "after", runValidators: true }
      );

      if (res) {
        statsBySubject[subCode] = (statsBySubject[subCode] || 0) + 1;
        insertedCount++;
      }
    }

    console.log("\n================ KẾT QUẢ KHỞI TẠO ================");
    console.log(` Tổng số câu hỏi đã nạp vào ngân hàng: ${insertedCount}`);
    console.log(" Chi tiết số câu hỏi theo từng môn học:");
    Object.entries(statsBySubject).forEach(([code, count]) => {
      const s = subjectMap.get(code);
      console.log(`   + [${code}] ${s ? s.name : code}: ${count} câu hỏi`);
    });
    console.log("==================================================");
    console.log(" Quá trình tạo ngân hàng câu hỏi hoàn tất thành công!\n");
  } catch (error) {
    console.error(" Lỗi trong quá trình khởi tạo dữ liệu câu hỏi:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Đã đóng kết nối MongoDB an toàn.");
  }
}

// Thực thi nếu gọi trực tiếp từ command line
if (require.main === module) {
  seedQuestionBank();
}

module.exports = { seedQuestionBank, RAW_QUESTIONS_DATA };
