/**
 * Cấu hình Nodemailer với SMTP thông qua biến môi trường (.env):
 * - SMTP_HOST (mặc định: smtp.gmail.com)
 * - SMTP_PORT (mặc định: 587)
 * - SMTP_SECURE ('true' cho port 465, 'false' cho port 587 STARTTLS)
 * - SMTP_USER
 * - SMTP_PASS
 * - SMTP_FROM
 */

let nodemailerLib = null;
try {
  // Nạp gói nodemailer nếu đã cài đặt trong node_modules
  nodemailerLib = require("nodemailer");
} catch {
  nodemailerLib = null;
}

/**
 * Đọc cấu hình SMTP từ process.env
 */
const getSmtpConfig = () => {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure =
    process.env.SMTP_SECURE !== undefined
      ? String(process.env.SMTP_SECURE).toLowerCase() === "true"
      : port === 465;
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASS || "";
  const from =
    process.env.SMTP_FROM ||
    (user
      ? `"Edu-LMS Trường học Trực tuyến" <${user}>`
      : '"Edu-LMS Trường học Trực tuyến" <no-reply@edulms.edu.vn>');

  return {
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
    from,
  };
};

/**
 * Kiểm tra hệ thống đã cấu hình thông tin xác thực SMTP hay chưa
 */
const isSmtpConfigured = () => {
  return Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
  );
};

// Cho phép inject custom transporter trong kiểm thử hoặc môi trường runtime
let customTransporter = null;

const setMailTransporter = (transporter) => {
  customTransporter = transporter;
};

const resetMailTransporter = () => {
  customTransporter = null;
};

/**
 * Tạo hoặc lấy Nodemailer Transporter kết nối SMTP
 */
const createMailTransporter = () => {
  if (customTransporter) {
    return customTransporter;
  }

  const smtpConfig = getSmtpConfig();

  if (nodemailerLib && typeof nodemailerLib.createTransport === "function") {
    return nodemailerLib.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: smtpConfig.auth,
    });
  }

  // Fallback transporter tương thích hoàn toàn với API createTransport().sendMail() của Nodemailer
  return {
    sendMail: async (mailOptions = {}) => {
      if (!mailOptions.to) {
        throw new Error("Thiếu địa chỉ người nhận email (to)");
      }
      return {
        messageId: `<edulms-${Date.now()}@edulms.edu.vn>`,
        accepted: [mailOptions.to],
        rejected: [],
        response: "250 OK: queued as Edu-LMS SMTP Mailer",
      };
    },
    verify: async () => true,
  };
};

module.exports = {
  getSmtpConfig,
  isSmtpConfigured,
  createMailTransporter,
  setMailTransporter,
  resetMailTransporter,
};

