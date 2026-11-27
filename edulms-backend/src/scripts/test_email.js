/**
 * Script kiểm tra cấu hình SMTP và gửi thử Email thông báo Phụ huynh (Nodemailer).
 *
 * Cách sử dụng:
 * 1. Kiểm tra kết nối SMTP & gửi thử email cảnh báo điểm thấp tới chính SMTP_USER trong .env:
 *    npm --prefix edulms-backend run test:email
 *
 * 2. Gửi thử tới một địa chỉ email cụ thể:
 *    node src/scripts/test_email.js --to=email_nhan@gmail.com
 *
 * 3. Gửi thử mẫu Báo cáo học tập định kỳ:
 *    node src/scripts/test_email.js --type=periodic --to=email_nhan@gmail.com
 */
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const {
  getSmtpConfig,
  isSmtpConfigured,
  createMailTransporter,
} = require("../config/mailer");
const {
  buildAcademicGradeAlertEmailTemplate,
  buildPeriodicAcademicReportEmailTemplate,
} = require("../services/emailNotification.service");

const maskSecret = (val) => {
  if (!val) return "[Chưa cấu hình]";
  const str = String(val).trim();
  if (str.length <= 4) return "****";
  return `${str.slice(0, 2)}***${str.slice(-2)} (độ dài: ${str.length})`;
};

async function runEmailTest() {
  const args = process.argv.slice(2);
  const toArg = args.find((a) => a.startsWith("--to="));
  const typeArg = args.find((a) => a.startsWith("--type="));
  const verifyOnly = args.includes("--verify-only");

  const smtpConfig = getSmtpConfig();
  const recipientEmail = toArg
    ? toArg.replace("--to=", "").trim()
    : process.env.TEST_EMAIL_TO || smtpConfig.auth?.user || "";
  const mailType = typeArg ? typeArg.replace("--type=", "").trim() : "alert";

  console.log("==============================================================");
  console.log("   KIỂM TRA CẤU HÌNH SMTP & GỬI THỬ EMAIL (NODEMAILER)");
  console.log("==============================================================");

  console.log("\n1. Thông tin cấu hình biến môi trường (.env):");
  console.log(`- SMTP_HOST:   ${smtpConfig.host}`);
  console.log(`- SMTP_PORT:   ${smtpConfig.port}`);
  console.log(`- SMTP_SECURE: ${smtpConfig.secure}`);
  console.log(`- SMTP_USER:   ${smtpConfig.auth?.user || "[Chưa cấu hình]"}`);
  console.log(`- SMTP_PASS:   ${maskSecret(smtpConfig.auth?.pass)}`);
  console.log(`- SMTP_FROM:   ${smtpConfig.from}`);

  if (!isSmtpConfigured()) {
    console.warn(
      "\n[CẢNH BÁO] Bạn chưa điền đủ SMTP_HOST, SMTP_USER, SMTP_PASS trong file edulms-backend/.env!"
    );
    console.log(
      "Hệ thống sẽ sử dụng Fallback Transporter giả lập (250 OK) để kiểm tra template HTML."
    );
  }

  const transporter = createMailTransporter();

  // Bước 2: Kiểm tra xác thực kết nối SMTP (transporter.verify)
  console.log("\n2. Đang kiểm tra kết nối & xác thực với máy chủ SMTP...");
  if (typeof transporter.verify === "function") {
    try {
      await transporter.verify();
      console.log("  ✓ Kết nối và xác thực SMTP thành công!");
    } catch (verifyErr) {
      console.error("  ✗ Kết nối hoặc xác thực SMTP thất bại!");
      console.error(`  - Chi tiết lỗi: ${verifyErr.message}`);
      console.log(
        "\n  Gợi ý khắc phục:\n  - Với Gmail: Đảm bảo đã bật Xác minh 2 bước (2FA) và dùng Mật khẩu ứng dụng (App Password 16 ký tự) cho SMTP_PASS.\n  - Kiểm tra lại SMTP_USER và SMTP_PORT (587 với SMTP_SECURE=false, hoặc 465 với SMTP_SECURE=true)."
      );
      process.exitCode = 1;
      return;
    }
  }

  if (verifyOnly) {
    console.log("\nĐã hoàn tất kiểm tra kết nối (--verify-only).");
    console.log("==============================================================\n");
    return;
  }

  if (!recipientEmail) {
    console.error(
      "\n✗ Không xác định được địa chỉ email người nhận. Hãy cấu hình SMTP_USER trong .env hoặc truyền cờ --to=your_email@gmail.com"
    );
    process.exitCode = 1;
    return;
  }

  // Bước 3: Tạo nội dung Email từ Template thực tế của hệ thống
  const template =
    mailType === "periodic"
      ? buildPeriodicAcademicReportEmailTemplate({
          parentName: "Phụ huynh Nguyễn Văn Nam",
          studentName: "Nguyễn Văn An",
          studentCode: "HS001",
          className: "10A1",
          periodLabel: "Học kỳ 1 (2025-2026)",
          currentGPA: 8.7,
          academicPerformance: "Giỏi",
          subjects: [
            { subjectName: "Toán học", average: 8.9, recordCount: 5 },
            { subjectName: "Ngữ văn", average: 8.3, recordCount: 5 },
            { subjectName: "Tiếng Anh", average: 8.9, recordCount: 5 },
            { subjectName: "Tin học", average: 9.4, recordCount: 5 },
          ],
        })
      : buildAcademicGradeAlertEmailTemplate({
          parentName: "Phụ huynh Trần Thị Lan",
          studentName: "Trần Thị Bình",
          studentCode: "HS002",
          className: "10A1",
          subjectName: "Toán học",
          gradeType: "midterm",
          score: 4.0,
          semester: "HK1",
          teacherName: "Thầy Nguyễn Văn Toán",
          note: "Học sinh cần ôn tập kỹ chương Mệnh đề, Tập hợp và Hệ bất phương trình bậc nhất hai ẩn.",
          isLowGrade: true,
        });

  console.log(`\n3. Đang gửi email thử nghiệm (loại: ${mailType}) tới: ${recipientEmail} ...`);
  console.log(`- Tiêu đề: ${template.subject}`);

  try {
    const info = await transporter.sendMail({
      from: smtpConfig.from,
      to: recipientEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    console.log("\n  ✓ GỬI EMAIL THÀNH CÔNG!");
    console.log(`  - Message ID: ${info.messageId}`);
    if (info.response) {
      console.log(`  - Phản hồi SMTP: ${info.response}`);
    }
    console.log(`  - Hãy kiểm tra hộp thư đến (hoặc mục Spam/Quảng cáo) của: ${recipientEmail}`);
  } catch (sendErr) {
    console.error("\n  ✗ GỬI EMAIL THẤT BẠI!");
    console.error(`  - Chi tiết lỗi: ${sendErr.message}`);
    process.exitCode = 1;
  }

  console.log("==============================================================\n");
}

if (require.main === module) {
  runEmailTest();
}

module.exports = { runEmailTest };

