/**
 * File Seed Dữ liệu mẫu Bài giảng và Nội dung học tập (Lesson Content Seed)
 * Dự án: Edu-LMS (Hệ thống Quản lý Học tập Trường THPT)
 *
 * Chức năng:
 * - Tự động liên kết hoặc tạo bổ sung TeachingAssignment cho:
 *   + 3 Lớp học: 10A1, 10A2, 11A1
 *   + 3 Môn học: TOAN (Toán học), LY (Vật lí), TIN (Tin học)
 *   + 3 Giáo viên: Thầy Toán (GV001), Cô Lý (GV004), Thầy Tin (GV009)
 * - Tạo từ 6 đến 8 bài giảng thực tế cho từng phân công (Tổng cộng ~20 bài giảng THPT chuẩn)
 * - Đầy đủ các loại nội dung: video, pdf, slide, document, link, text
 * - Đính kèm URL tài nguyên mô phỏng chuẩn xác định dạng (.mp4, .pdf, .docx, .pptx, .xlsx, .zip)
 * - Cơ chế UPSERT thông minh: không tạo trùng lặp khi chạy nhiều lần
 * - Đóng kết nối an toàn, log chi tiết số lượng bản ghi
 */

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
require("node:dns").setServers(["8.8.8.8", "1.1.1.1"]);
const mongoose = require("mongoose");

const User = require("../models/User");
const Grade = require("../models/Grade");
const Class = require("../models/Class");
const Subject = require("../models/Subject");
const TeachingAssignment = require("../models/TeachingAssignment");
const LessonContent = require("../models/LessonContent");

// 1. Cấu hình 3 phân công mục tiêu theo đúng yêu cầu đề bài
const TARGET_ASSIGNMENTS = [
  {
    className: "10A1",
    gradeLevel: 10,
    subjectCode: "TOAN",
    teacherCode: "GV001",
    academicYear: "2025-2026",
    semester: "CaNam",
    note: "Toán học lớp 10A1 - Thầy Nguyễn Văn Toán",
  },
  {
    className: "10A2",
    gradeLevel: 10,
    subjectCode: "LY",
    teacherCode: "GV004",
    academicYear: "2025-2026",
    semester: "CaNam",
    note: "Vật lí lớp 10A2 - Cô Phạm Thị Lý",
  },
  {
    className: "11A1",
    gradeLevel: 11,
    subjectCode: "TIN",
    teacherCode: "GV009",
    academicYear: "2025-2026",
    semester: "CaNam",
    note: "Tin học lớp 11A1 - Thầy Ngô Văn Tin",
  },
  {
    className: "10A1",
    gradeLevel: 10,
    subjectCode: "VAN",
    teacherCode: "GV002",
    academicYear: "2025-2026",
    semester: "CaNam",
    note: "Ngữ văn lớp 10A1 - Cô Trần Thị Vân",
  },
  {
    className: "10A2",
    gradeLevel: 10,
    subjectCode: "VAN",
    teacherCode: "GV002",
    academicYear: "2025-2026",
    semester: "CaNam",
    note: "Ngữ văn lớp 10A2 - Cô Trần Thị Vân",
  },
];

// 2. Danh mục bài giảng chuẩn chương trình GDPT THPT (Toán 10, Vật lí 10, Tin học 11)
// Sử dụng URL tài nguyên công khai / mẫu chuẩn định dạng
const SAMPLE_LESSONS = {
  // --- MÔN TOÁN HỌC - LỚP 10A1 (THẦY TOÁN - GV001) ---
  TOAN_10A1: [
    {
      title: "Bài 1: Mệnh đề và mệnh đề chứa biến",
      description:
        "Khái niệm mệnh đề toán học, mệnh đề phủ định, mệnh đề kéo theo và mệnh đề tương đương. Các bài tập nhận biết cơ bản.",
      contentType: "video",
      resourceUrl:
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      order: 1,
      isActive: true,
    },
    {
      title: "Bài 2: Tập hợp và các phép toán trên tập hợp",
      description:
        "Tập con, tập hợp bằng nhau. Các phép toán giao, hợp, hiệu của hai tập hợp và phần bù. Biểu đồ Ven.",
      contentType: "pdf",
      resourceUrl:
        "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      order: 2,
      isActive: true,
    },
    {
      title: "Bài 3: Bài tập rèn luyện Tập hợp & Các khoảng đoạn số thực",
      description:
        "Phiếu bài tập tổng hợp về các khoảng, đoạn, nửa khoảng trên trục số thực R kèm hướng dẫn giải chi tiết.",
      contentType: "document",
      resourceUrl:
        "https://calibre-ebook.com/downloads/demos/demo.docx",
      order: 3,
      isActive: true,
    },
    {
      title: "Bài 4: Bất phương trình bậc nhất hai ẩn",
      description:
        "Khái niệm bất phương trình bậc nhất hai ẩn, biểu diễn miền nghiệm của bất phương trình trên mặt phẳng tọa độ Oxy.",
      contentType: "slide",
      resourceUrl:
        "https://view.officeapps.live.com/op/view.aspx?src=https://filesamples.com/samples/document/pptx/sample1.pptx",
      order: 4,
      isActive: true,
    },
    {
      title: "Bài 5: Hệ bất phương trình bậc nhất hai ẩn & Ứng dụng thực tế",
      description:
        "Giải bài toán quy hoạch tuyến tính thực tế tìm giá trị lớn nhất và nhỏ nhất của biểu thức F(x, y).",
      contentType: "video",
      resourceUrl:
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
      order: 5,
      isActive: true,
    },
    {
      title: "Bài 6: Bảng tính phân tích số liệu thống kê điểm số đầu năm",
      description:
        "Bảng thống kê số liệu mẫu, tính số trung bình, trung vị, tứ phân vị và độ lệch chuẩn bằng phần mềm bảng tính.",
      contentType: "document",
      resourceUrl:
        "https://filesamples.com/samples/document/xlsx/sample1.xlsx",
      order: 6,
      isActive: true,
    },
    {
      title: "Bài 7: Trọn bộ tài liệu ôn tập & Đề kiểm tra Chương 1 (File nén)",
      description:
        "Gói tài liệu định dạng ZIP bao gồm 5 đề thi thử trắc nghiệm và tự luận có đáp án và ma trận đề thi.",
      contentType: "document",
      resourceUrl:
        "https://filesamples.com/samples/archive/zip/sample1.zip",
      order: 7,
      isActive: true,
    },
  ],

  // --- MÔN VẬT LÍ - LỚP 10A2 (CÔ LÝ - GV004) ---
  LY_10A2: [
    {
      title: "Bài 1: Khái quát về môn Vật lí & An toàn trong phòng thực hành",
      description:
        "Đối tượng nghiên cứu của Vật lí, các quy tắc an toàn khi sử dụng thiết bị thí nghiệm điện, quang học.",
      contentType: "slide",
      resourceUrl:
        "https://view.officeapps.live.com/op/view.aspx?src=https://filesamples.com/samples/document/pptx/sample2.pptx",
      order: 1,
      isActive: true,
    },
    {
      title: "Bài 2: Độ dịch chuyển và quãng đường đi được",
      description:
        "Phân biệt độ dịch chuyển và quãng đường. Vận tốc và tốc độ. Đồ thị độ dịch chuyển - thời gian.",
      contentType: "video",
      resourceUrl:
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      order: 2,
      isActive: true,
    },
    {
      title: "Bài 3: Chuyển động thẳng biến đổi đều & Gia tốc",
      description:
        "Khái niệm gia tốc, công thức tính vận tốc, quãng đường và công thức liên hệ trong chuyển động thẳng nhanh dần đều và chậm dần đều.",
      contentType: "pdf",
      resourceUrl:
        "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      order: 3,
      isActive: true,
    },
    {
      title: "Bài 4: Thực hành đo gia tốc rơi tự do của vật",
      description:
        "Báo cáo thực hành sử dụng đồng hồ đo thời gian hiện số và cổng quang điện để xác định gia tốc trọng trường g.",
      contentType: "document",
      resourceUrl:
        "https://calibre-ebook.com/downloads/demos/demo.docx",
      order: 4,
      isActive: true,
    },
    {
      title: "Bài 5: Ba định luật Newton về chuyển động",
      description:
        "Định luật I (quán tính), Định luật II (F = ma) và Định luật III Newton (lực và phản lực). Ứng dụng thực tế đời sống.",
      contentType: "video",
      resourceUrl:
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
      order: 5,
      isActive: true,
    },
    {
      title: "Bài 6: Một số lực trong thực tiễn (Trọng lực, Lực ma sát, Lực căng dây)",
      description:
        "Đặc điểm điểm đặt, phương, chiều, độ lớn của trọng lực, lực ma sát trượt, ma sát nghỉ và lực cản của không khí.",
      contentType: "pdf",
      resourceUrl:
        "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      order: 6,
      isActive: false, // Bài giảng tạm ẩn để test tính năng filter isActive
    },
  ],

  // --- MÔN TIN HỌC - LỚP 11A1 (THẦY TIN - GV009) ---
  TIN_11A1: [
    {
      title: "Bài 1: Khái niệm hệ điều hành và phần mềm ứng dụng",
      description:
        "Lịch sử phát triển của hệ điều hành, vai trò quản lý tài nguyên phần cứng và cung cấp môi trường cho người dùng.",
      contentType: "slide",
      resourceUrl:
        "https://view.officeapps.live.com/op/view.aspx?src=https://filesamples.com/samples/document/pptx/sample3.pptx",
      order: 1,
      isActive: true,
    },
    {
      title: "Bài 2: Phần mềm nguồn mở và bản quyền phần mềm",
      description:
        "Tìm hiểu các giấy phép mã nguồn mở GPL, MIT, Apache và đạo đức ứng xử trong môi trường số.",
      contentType: "pdf",
      resourceUrl:
        "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      order: 2,
      isActive: true,
    },
    {
      title: "Bài 3: Giới thiệu lập trình Python nâng cao & Kiểu dữ liệu danh sách (List)",
      description:
        "Video hướng dẫn thao tác với List trong Python: thêm, xóa, sắp xếp, duyệt phần tử và list comprehension.",
      contentType: "video",
      resourceUrl:
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
      order: 3,
      isActive: true,
    },
    {
      title: "Bài 4: Kiểu dữ liệu từ điển (Dictionary) & Cấu trúc dữ liệu nâng cao",
      description:
        "Cặp khóa - giá trị trong Dictionary, ứng dụng giải bài toán đếm tần số xuất hiện của các từ trong văn bản.",
      contentType: "document",
      resourceUrl:
        "https://calibre-ebook.com/downloads/demos/demo.docx",
      order: 4,
      isActive: true,
    },
    {
      title: "Bài 5: Thuật toán tìm kiếm nhị phân & Sắp xếp nhanh (Quick Sort)",
      description:
        "Phân tích độ phức tạp thuật toán O(log N) và O(N log N). Code mẫu Python thực thi kèm bộ test case.",
      contentType: "text",
      resourceUrl: "",
      order: 5,
      isActive: true,
    },
    {
      title: "Bài 6: Bảng tổng hợp điểm thực hành lập trình các tuần (File Excel)",
      description:
        "Bảng điểm các bài tập nộp trên hệ thống chấm tự động, phân loại mức độ hoàn thành theo từng học sinh.",
      contentType: "document",
      resourceUrl:
        "https://filesamples.com/samples/document/xlsx/sample2.xlsx",
      order: 6,
      isActive: true,
    },
    {
      title: "Bài 7: Gói mã nguồn mẫu và bộ dữ liệu test dự án cuối kỳ (File RAR)",
      description:
        "Tập tin nén chứa toàn bộ code khung của dự án quản lý học sinh và cơ sở dữ liệu mẫu.",
      contentType: "document",
      resourceUrl:
        "https://filesamples.com/samples/archive/rar/sample.rar",
      order: 7,
      isActive: true,
    },
  ],

  // --- MÔN NGỮ VĂN - LỚP 10A1 (CÔ TRẦN THỊ VÂN - GV002) ---
  VAN_10A1: [
    {
      title: "Bài 1: Chiến thắng Mtao Mxây (Trích Sử thi Đăm Săn)",
      description:
        "Hình tượng người anh hùng Đăm Săn dũng cảm, trọng danh dự và khát vọng cuộc sống phồn vinh của cộng đồng người Ê-đê. Nghệ thuật miêu tả và thủ pháp so sánh phóng đại.",
      contentType: "video",
      resourceUrl:
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      order: 1,
      isActive: true,
    },
    {
      title: "Bài 2: Văn bản Chữ người tử tù (Tác giả Nguyễn Tuân)",
      description:
        "Tài liệu toàn văn tác phẩm Chữ người tử tù, chân dung nhân vật Huấn Cao – người nghệ sĩ tài hoa, khí phách thiên lương và cảnh cho chữ xưa nay chưa từng có.",
      contentType: "pdf",
      resourceUrl:
        "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      order: 2,
      isActive: true,
    },
    {
      title: "Bài 3: Bài trình chiếu Kỹ năng viết bài văn nghị luận xã hội",
      description:
        "Hệ thống slide hướng dẫn các bước lập dàn ý bài văn nghị luận 600 chữ: giải thích, phân tích chứng minh, bình luận mở rộng và bài học nhận thức hành động.",
      contentType: "slide",
      resourceUrl:
        "https://view.officeapps.live.com/op/view.aspx?src=https://filesamples.com/samples/document/pptx/sample1.pptx",
      order: 3,
      isActive: true,
    },
    {
      title: "Bài 4: Đề cương ôn tập & Phiếu bài tập Ngữ văn Học kỳ 1",
      description:
        "Tập tin văn bản docx tổng hợp các tác phẩm văn học trung đại và văn học hiện đại trọng tâm phục vụ kỳ thi học kỳ 1.",
      contentType: "document",
      resourceUrl:
        "https://calibre-ebook.com/downloads/demos/demo.docx",
      order: 4,
      isActive: true,
    },
    {
      title: "Bài 5: Hướng dẫn đọc hiểu văn bản thông tin và văn bản nhật dụng",
      description:
        "Khám phá cấu trúc, cách thức trình bày thông tin, sơ đồ tư duy và biện pháp tu từ trong các bản tin thời sự hiện đại.",
      contentType: "text",
      resourceUrl: "",
      order: 5,
      isActive: true,
    },
  ],

  // --- MÔN NGỮ VĂN - LỚP 10A2 (CÔ TRẦN THỊ VÂN - GV002) ---
  VAN_10A2: [
    {
      title: "Bài 1: Truyện Kiều - Nỗi thương mình & Nghệ thuật miêu tả nội tâm",
      description:
        "Video bài giảng phân tích diễn biến tâm trạng Thúy Kiều qua ngôn ngữ độc thoại nội tâm và nghệ thuật tả cảnh ngụ tình bậc thầy của Nguyễn Du.",
      contentType: "video",
      resourceUrl:
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
      order: 1,
      isActive: true,
    },
    {
      title: "Bài 2: Tài liệu đọc hiểu Thơ Duyên (Xuân Diệu) & Thơ mới",
      description:
        "Văn bản thơ và hệ thống câu hỏi định hướng cảm thụ vẻ đẹp giao cảm tinh tế của thiên nhiên và tình yêu tuổi trẻ trong phong trào Thơ mới.",
      contentType: "pdf",
      resourceUrl:
        "https://raw.githubusercontent.com/mozilla/pdf.js/master/web/compressed.tracemonkey-pldi-09.pdf",
      order: 2,
      isActive: true,
    },
    {
      title: "Bài 3: Bài trình chiếu Chuyên đề Biện pháp tu từ & Tiếng Việt",
      description:
        "Slide PPTX tổng hợp các biện pháp tu từ: ẩn dụ, hoán dụ, điệp từ, chêm xen và ứng dụng nhận diện trong các đề thi tuyển sinh, học kỳ.",
      contentType: "slide",
      resourceUrl:
        "https://view.officeapps.live.com/op/view.aspx?src=https://filesamples.com/samples/document/pptx/sample2.pptx",
      order: 3,
      isActive: true,
    },
    {
      title: "Bài 4: Gói tài liệu tham khảo các bài văn mẫu đạt giải Quốc gia (File ZIP)",
      description:
        "Tập tin nén chứa tuyển tập 30 bài văn nghị luận văn học và nghị luận xã hội đặc sắc của học sinh giỏi toàn quốc.",
      contentType: "document",
      resourceUrl:
        "https://filesamples.com/samples/archive/zip/sample.zip",
      order: 4,
      isActive: true,
    },
  ],
};

/**
 * Hàm thực thi Seed dữ liệu Bài giảng
 */
async function seedLessonData() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.error("LỖI: Chưa cấu hình biến môi trường MONGO_URI trong .env");
    process.exit(1);
  }

  // Bảo vệ môi trường: Chỉ chạy trên database staging, dev, edulms hoặc localhost
  const isAllowed =
    uri.includes("staging") ||
    uri.includes("dev") ||
    uri.includes("edulms") ||
    uri.includes("localhost") ||
    uri.includes("127.0.0.1");

  if (!isAllowed) {
    console.error(
      "CẢNH BÁO: MONGO_URI phải chứa 'dev', 'staging', 'edulms' hoặc 'localhost' để tránh ghi đè dữ liệu production!"
    );
    process.exit(1);
  }

  console.log("=================================================");
  console.log("   KHỞI TẠO DỮ LIỆU MẪU BÀI GIẢNG (LESSON SEED)   ");
  console.log("=================================================");
  console.log(`- Kết nối: ${uri.replace(/\/\/.*@/, "//<credentials-hidden>@")}`);

  try {
    await mongoose.connect(uri);
    console.log(`- Database mục tiêu: ${mongoose.connection.name}`);

    // BƯỚC 1: XÁC MINH CÁC THỰC THỂ CƠ SỞ (GRADE, CLASS, SUBJECT, USER)
    console.log("\n1. Xác minh thực thể cơ sở (Khối, Lớp, Môn học, Giáo viên)...");

    const assignmentMap = new Map();

    for (const target of TARGET_ASSIGNMENTS) {
      // 1.1 Tìm giáo viên
      const teacher = await User.findOne({
        userCode: target.teacherCode,
        role: "teacher",
        isDeleted: { $ne: true },
      });
      if (!teacher) {
        throw new Error(
          `Không tìm thấy Giáo viên với mã '${target.teacherCode}'. Vui lòng chạy lệnh 'npm run seed' trước để khởi tạo tài khoản!`
        );
      }

      // 1.2 Tìm môn học
      const subject = await Subject.findOne({
        code: target.subjectCode,
        isDeleted: { $ne: true },
      });
      if (!subject) {
        throw new Error(
          `Không tìm thấy Môn học với mã '${target.subjectCode}'. Vui lòng chạy lệnh 'npm run seed' trước!`
        );
      }

      // 1.3 Tìm lớp học
      let classDoc = await Class.findOne({
        name: target.className,
        academicYear: target.academicYear,
        isDeleted: { $ne: true },
      });

      // Nếu chưa có lớp, tìm Khối và tạo lớp mới
      if (!classDoc) {
        let gradeDoc = await Grade.findOne({
          level: target.gradeLevel,
          isDeleted: { $ne: true },
        });
        if (!gradeDoc) {
          gradeDoc = await Grade.findOneAndUpdate(
            { level: target.gradeLevel },
            {
              $set: {
                name: `Khối ${target.gradeLevel}`,
                description: `Khối lớp ${target.gradeLevel} THPT`,
                isActive: true,
                isDeleted: false,
              },
            },
            { upsert: true, new: true }
          );
        }

        classDoc = await Class.findOneAndUpdate(
          { name: target.className, academicYear: target.academicYear },
          {
            $set: {
              grade: gradeDoc._id,
              academicYear: target.academicYear,
              room: `P.${target.gradeLevel}01`,
              capacity: 45,
              description: `Lớp ${target.className} chuẩn năm học ${target.academicYear}`,
              isActive: true,
              isDeleted: false,
            },
          },
          { upsert: true, new: true }
        );
      }

      // 1.4 Đảm bảo có TeachingAssignment tương ứng
      const assignmentDoc = await TeachingAssignment.findOneAndUpdate(
        {
          class: classDoc._id,
          subject: subject._id,
          academicYear: target.academicYear,
          semester: target.semester,
        },
        {
          $set: {
            teacher: teacher._id,
            periodsPerWeek: subject.periodsPerWeek || 3,
            status: "active",
            note: target.note,
            isActive: true,
            isDeleted: false,
          },
        },
        { upsert: true, new: true, runValidators: true }
      );

      const key = `${target.subjectCode}_${target.className}`;
      assignmentMap.set(key, {
        assignmentId: assignmentDoc._id,
        className: classDoc.name,
        subjectName: subject.name,
        teacherName: teacher.fullName,
      });

      console.log(
        `[OK] Phân công: ${classDoc.name} | ${subject.name} | GV: ${teacher.fullName} (${target.teacherCode}) -> ID: ${assignmentDoc._id}`
      );
    }

    // BƯỚC 2: SEED BÀI GIẢNG (LESSONCONTENT) DÙNG UPSERT
    console.log("\n2. Đang nạp dữ liệu bài giảng theo chương trình THPT...");

    let totalCreated = 0;
    let totalUpdated = 0;

    for (const [key, lessonList] of Object.entries(SAMPLE_LESSONS)) {
      const assignmentInfo = assignmentMap.get(key);
      if (!assignmentInfo) {
        console.warn(`[SKIP] Không tìm thấy phân công cho key '${key}'`);
        continue;
      }

      console.log(
        `\n--- Nạp bài giảng cho Lớp ${assignmentInfo.className} - Môn ${assignmentInfo.subjectName} (${assignmentInfo.teacherName}) ---`
      );

      for (const lesson of lessonList) {
        // Upsert dựa trên tiêu chí duy nhất: teachingAssignment + order
        const existing = await LessonContent.findOne({
          teachingAssignment: assignmentInfo.assignmentId,
          order: lesson.order,
          isDeleted: false,
        });

        const lessonDoc = await LessonContent.findOneAndUpdate(
          {
            teachingAssignment: assignmentInfo.assignmentId,
            order: lesson.order,
          },
          {
            $set: {
              title: lesson.title,
              description: lesson.description,
              contentType: lesson.contentType,
              resourceUrl: lesson.resourceUrl,
              order: lesson.order,
              teachingAssignment: assignmentInfo.assignmentId,
              isActive: lesson.isActive,
              isDeleted: false,
            },
          },
          { upsert: true, new: true, runValidators: true }
        );

        if (existing) {
          totalUpdated += 1;
          console.log(
            `  [CẬP NHẬT] #${lessonDoc.order} - [${lessonDoc.contentType.toUpperCase().padEnd(8)}] ${lessonDoc.title}`
          );
        } else {
          totalCreated += 1;
          console.log(
            `  [TẠO MỚI]  #${lessonDoc.order} - [${lessonDoc.contentType.toUpperCase().padEnd(8)}] ${lessonDoc.title}`
          );
        }
      }
    }

    // BƯỚC 3: TỔNG KẾT VÀ BÁO CÁO
    const finalCount = await LessonContent.countDocuments({
      isDeleted: false,
    });

    console.log("\n=================================================");
    console.log("          KẾT QUẢ SEED DỮ LIỆU BÀI GIẢNG         ");
    console.log("=================================================");
    console.log(`- Bản ghi tạo mới:          ${totalCreated}`);
    console.log(`- Bản ghi cập nhật/giữ lại:  ${totalUpdated}`);
    console.log(`- Tổng số bài giảng hiện có: ${finalCount}`);
    console.log("=================================================\n");
  } catch (error) {
    console.error("LỖI XẢY RA TRONG QUÁ TRÌNH SEED:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("Đã đóng kết nối MongoDB an toàn.\n");
  }
}

// Chạy trực tiếp nếu file được thực thi bằng node
if (require.main === module) {
  seedLessonData();
}

module.exports = {
  seedLessonData,
  TARGET_ASSIGNMENTS,
  SAMPLE_LESSONS,
};

