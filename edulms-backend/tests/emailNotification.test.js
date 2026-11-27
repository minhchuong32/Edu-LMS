const mongoose = require("mongoose");
const EmailLog = require("../src/models/EmailLog");
const User = require("../src/models/User");
const GradeRecord = require("../src/models/GradeRecord");
const Notification = require("../src/models/Notification");
const {
  getSmtpConfig,
  setMailTransporter,
  resetMailTransporter,
} = require("../src/config/mailer");
const {
  buildAcademicGradeAlertEmailTemplate,
  buildPeriodicAcademicReportEmailTemplate,
  sendEmailWithDeduplicationAndRetry,
  triggerParentAcademicGradeEmail,
  retryFailedEmails,
  sendPeriodicAcademicReportsJob,
} = require("../src/services/emailNotification.service");
const gradebookService = require("../src/services/gradebook.service");

/**
 * Helper tạo chainable Mongoose query mock (.populate().select().sort().limit().lean())
 */
const createMockQuery = (resolvedValue) => {
  const query = {
    populate: jest.fn(),
    select: jest.fn(),
    sort: jest.fn(),
    limit: jest.fn(),
    lean: jest.fn(),
  };
  query.populate.mockReturnValue(query);
  query.select.mockReturnValue(query);
  query.sort.mockReturnValue(query);
  query.limit.mockReturnValue(query);
  query.lean.mockResolvedValue(resolvedValue);
  query.then = (resolve, reject) =>
    Promise.resolve(resolvedValue).then(resolve, reject);
  return query;
};

describe("Automated Parent Email Notification System (SMTP, Templates, Triggers, Deduplication, Retry & Periodic Report Tests)", () => {
  const teacherId = new mongoose.Types.ObjectId().toString();
  const student1Id = new mongoose.Types.ObjectId().toString();
  const parent1Id = new mongoose.Types.ObjectId().toString();
  const class10A1Id = new mongoose.Types.ObjectId().toString();
  const taMath10A1Id = new mongoose.Types.ObjectId().toString();
  const gradeRecord1Id = new mongoose.Types.ObjectId().toString();

  let mockSendMail;

  beforeEach(() => {
    jest.restoreAllMocks();
    mockSendMail = jest.fn().mockResolvedValue({
      messageId: "<smtp-msg-001@edulms.edu.vn>",
      accepted: ["phuhuynh1@edulms.edu.vn"],
    });
    setMailTransporter({
      sendMail: mockSendMail,
      verify: jest.fn().mockResolvedValue(true),
    });
  });

  afterEach(() => {
    resetMailTransporter();
  });

  /* =========================================================================
     1. CẤU HÌNH NODEMAILER & SMTP QUA .ENV + MODEL EMAILLOG
  ========================================================================= */
  describe("1. Cấu hình Nodemailer với SMTP qua .env & Schema EmailLog", () => {
    it("getSmtpConfig đọc chính xác cấu hình SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS từ process.env", () => {
      const oldHost = process.env.SMTP_HOST;
      const oldPort = process.env.SMTP_PORT;
      const oldUser = process.env.SMTP_USER;
      const oldPass = process.env.SMTP_PASS;

      process.env.SMTP_HOST = "smtp.edulms.edu.vn";
      process.env.SMTP_PORT = "587";
      process.env.SMTP_USER = "mailer@edulms.edu.vn";
      process.env.SMTP_PASS = "secret_app_password";

      const cfg = getSmtpConfig();
      expect(cfg.host).toBe("smtp.edulms.edu.vn");
      expect(cfg.port).toBe(587);
      expect(cfg.secure).toBe(false);
      expect(cfg.auth).toEqual({
        user: "mailer@edulms.edu.vn",
        pass: "secret_app_password",
      });

      process.env.SMTP_HOST = oldHost;
      process.env.SMTP_PORT = oldPort;
      process.env.SMTP_USER = oldUser;
      process.env.SMTP_PASS = oldPass;
    });

    it("EmailLog model validate hợp lệ các trường eventKey, eventType, student, parent, recipientEmail, subject, htmlContent, status, attempts", async () => {
      const logDoc = new EmailLog({
        eventKey: `grade_alert_${gradeRecord1Id}_midterm_4`,
        eventType: "low_grade_alert",
        student: new mongoose.Types.ObjectId(student1Id),
        parent: new mongoose.Types.ObjectId(parent1Id),
        recipientEmail: "phuhuynh1@edulms.edu.vn",
        subject: "[Edu-LMS] Cảnh báo điểm thấp",
        htmlContent: "<p>Nội dung cảnh báo điểm thấp</p>",
        status: "sent",
        attempts: 1,
      });

      await expect(logDoc.validate()).resolves.toBeUndefined();
      expect(logDoc.status).toBe("sent");
      expect(logDoc.attempts).toBe(1);
    });
  });

  /* =========================================================================
     2. TEMPLATE EMAIL CẢNH BÁO ĐIỂM THẤP & BÁO CÁO HỌC TẬP ĐỊNH KỲ
  ========================================================================= */
  describe("2. Xây dựng Template Email thông báo kết quả học tập / cảnh báo điểm thấp & báo cáo định kỳ", () => {
    it("buildAcademicGradeAlertEmailTemplate tạo đúng tiêu đề, nội dung HTML và text cho cảnh báo điểm thấp (< 5.0)", () => {
      const tpl = buildAcademicGradeAlertEmailTemplate({
        parentName: "Ông Nguyễn Văn Ba",
        studentName: "Nguyễn Minh Anh",
        studentCode: "HS1001",
        className: "10A1",
        subjectName: "Toán học 10",
        gradeType: "midterm",
        score: 4.0,
        semester: "HK1",
        teacherName: "Cô Lê Thị Lan",
        note: "Cần ôn lại phần phương trình bậc hai",
        isLowGrade: true,
      });

      expect(tpl.subject).toMatch(/Cảnh báo kết quả học tập cần lưu ý/i);
      expect(tpl.subject).toContain("Nguyễn Minh Anh");
      expect(tpl.subject).toContain("Toán học 10");
      expect(tpl.html).toContain("CẢNH BÁO ĐIỂM THẤP (< 5.0)");
      expect(tpl.html).toContain("4.0 / 10");
      expect(tpl.html).toContain("Cần ôn lại phần phương trình bậc hai");
      expect(tpl.text).toContain("4.0/10");
    });

    it("buildPeriodicAcademicReportEmailTemplate tạo bảng tổng hợp GPA và điểm trung bình các môn học định kỳ", () => {
      const tpl = buildPeriodicAcademicReportEmailTemplate({
        parentName: "Ông Nguyễn Văn Ba",
        studentName: "Nguyễn Minh Anh",
        studentCode: "HS1001",
        className: "10A1",
        periodLabel: "Tháng 11 - Học kỳ 1",
        currentGPA: 8.4,
        academicPerformance: "Giỏi",
        subjects: [
          { subjectName: "Toán học 10", average: 8.8, recordCount: 3 },
          { subjectName: "Ngữ văn 10", average: 8.0, recordCount: 2 },
        ],
      });

      expect(tpl.subject).toMatch(/Báo cáo tổng hợp kết quả học tập định kỳ/i);
      expect(tpl.html).toContain("8.4 / 10");
      expect(tpl.html).toContain("Giỏi");
      expect(tpl.html).toContain("Toán học 10");
      expect(tpl.html).toContain("8.8");
    });
  });

  /* =========================================================================
     3. TRIGGER TỰ ĐỘNG GỬI EMAIL CHO PHỤ HUYNH LIÊN KẾT QUA childrenRefs
  ========================================================================= */
  describe("3. Trigger tự động gửi email cho Phụ huynh được liên kết (childrenRefs) khi học sinh có điểm thấp", () => {
    it("tự động tìm email của Phụ huynh liên kết qua childrenRefs và gửi email cảnh báo khi học sinh có điểm < 5.0", async () => {
      // 1. Mock tìm thông tin học sinh
      jest.spyOn(User, "findOne").mockReturnValue(
        createMockQuery({
          _id: student1Id,
          fullName: "Nguyễn Minh Anh",
          userCode: "HS1001",
          className: "10A1",
          role: "student",
          classRef: class10A1Id,
        })
      );

      // 2. Mock tìm tài khoản Phụ huynh có childrenRefs chứa student1Id
      jest.spyOn(User, "find").mockReturnValue(
        createMockQuery([
          {
            _id: parent1Id,
            fullName: "Ông Nguyễn Văn Ba",
            email: "phuhuynh1@edulms.edu.vn",
            role: "parent",
            childrenRefs: [student1Id],
          },
        ])
      );

      // 3. Chưa có bản ghi EmailLog trùng trước đó
      jest.spyOn(EmailLog, "findOne").mockResolvedValue(null);
      const savedEmailLogs = [];
      jest
        .spyOn(EmailLog.prototype, "save")
        .mockImplementation(function () {
          savedEmailLogs.push(this);
          return Promise.resolve(this);
        });

      jest
        .spyOn(GradeRecord.prototype, "save")
        .mockImplementation(function () {
          this._id = new mongoose.Types.ObjectId(gradeRecord1Id);
          return Promise.resolve(this);
        });
      jest
        .spyOn(Notification.prototype, "save")
        .mockImplementation(function () {
          return Promise.resolve(this);
        });

      // Giáo viên nhập điểm thấp (value = 3.5 < 5.0) trong Sổ điểm
      await gradebookService.createGradeRecord(
        {
          student: student1Id,
          teachingAssignment: taMath10A1Id,
          semester: "HK1",
          gradeType: "midterm",
          value: 3.5,
          note: "Học sinh cần ôn tập kỹ chương Hàm số",
        },
        {
          user: { userId: teacherId, role: "teacher" },
          targetTeachingAssignment: {
            _id: taMath10A1Id,
            class: { _id: class10A1Id, name: "10A1" },
            subject: { name: "Toán học 10" },
            teacher: { _id: teacherId, fullName: "Cô Lê Thị Lan" },
          },
        }
      );

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "phuhuynh1@edulms.edu.vn",
          subject: expect.stringMatching(/Cảnh báo kết quả học tập cần lưu ý/i),
        })
      );

      expect(savedEmailLogs).toHaveLength(1);
      expect(savedEmailLogs[0].status).toBe("sent");
      expect(savedEmailLogs[0].recipientEmail).toBe("phuhuynh1@edulms.edu.vn");
      expect(savedEmailLogs[0].attempts).toBe(1);
    });

    it("không tự động gửi email cảnh báo điểm thấp khi điểm số đạt yêu cầu (>= 5.0) và không bật forceSend", async () => {
      const res = await triggerParentAcademicGradeEmail({
        student: student1Id,
        score: 8.5,
        gradeType: "midterm",
        semester: "HK1",
      });

      expect(res.triggered).toBe(false);
      expect(res.reason).toBe("score_above_threshold");
      expect(mockSendMail).not.toHaveBeenCalled();
    });
  });

  /* =========================================================================
     4. CƠ CHẾ CHỐNG GỬI EMAIL TRÙNG LẶP CHO CÙNG MỘT SỰ KIỆN
  ========================================================================= */
  describe("4. Cơ chế chống gửi email trùng lặp (Deduplication)", () => {
    it("đảm bảo cùng một sự kiện (eventKey + recipientEmail) đã gửi thành công (status = 'sent') sẽ không gửi email lần thứ 2", async () => {
      const eventKey = `grade_alert_${gradeRecord1Id}_midterm_4`;

      // Lần gọi thứ 1: Chưa có trong EmailLog -> Gửi email qua SMTP
      jest.spyOn(EmailLog, "findOne").mockResolvedValueOnce(null);
      jest
        .spyOn(EmailLog.prototype, "save")
        .mockImplementation(function () {
          return Promise.resolve(this);
        });

      const firstAttempt = await sendEmailWithDeduplicationAndRetry({
        eventKey,
        eventType: "low_grade_alert",
        studentId: student1Id,
        parentId: parent1Id,
        recipientEmail: "phuhuynh1@edulms.edu.vn",
        subject: "Cảnh báo điểm thấp lần 1",
        html: "<p>Điểm 4.0</p>",
      });

      expect(firstAttempt.sent).toBe(true);
      expect(firstAttempt.skippedDuplicate).toBe(false);
      expect(mockSendMail).toHaveBeenCalledTimes(1);

      // Lần gọi thứ 2 với cùng eventKey và recipientEmail: EmailLog đã có bản ghi status = 'sent'
      jest.spyOn(EmailLog, "findOne").mockResolvedValueOnce({
        _id: new mongoose.Types.ObjectId(),
        eventKey,
        recipientEmail: "phuhuynh1@edulms.edu.vn",
        status: "sent",
        attempts: 1,
      });

      const secondAttempt = await sendEmailWithDeduplicationAndRetry({
        eventKey,
        eventType: "low_grade_alert",
        studentId: student1Id,
        parentId: parent1Id,
        recipientEmail: "phuhuynh1@edulms.edu.vn",
        subject: "Cảnh báo điểm thấp lần 2 (Trùng)",
        html: "<p>Điểm 4.0</p>",
      });

      expect(secondAttempt.sent).toBe(false);
      expect(secondAttempt.skippedDuplicate).toBe(true);
      expect(secondAttempt.status).toBe("skipped_duplicate");
      // sendMail vẫn chỉ được gọi đúng 1 lần duy nhất
      expect(mockSendMail).toHaveBeenCalledTimes(1);
    });
  });

  /* =========================================================================
     5. XỬ LÝ LỖI, GHI NHẬN TRẠNG THÁI VÀ RETRY KHI GỬI EMAIL THẤT BẠI
  ========================================================================= */
  describe("5. Xử lý lỗi, ghi nhận trạng thái gửi email và Retry khi thất bại", () => {
    it("tự động retry khi SMTP thất bại tạm thời và lưu status = 'sent' khi lần thử tiếp theo thành công", async () => {
      jest.spyOn(EmailLog, "findOne").mockResolvedValue(null);
      jest
        .spyOn(EmailLog.prototype, "save")
        .mockImplementation(function () {
          return Promise.resolve(this);
        });

      // Lần 1 và lần 2 lỗi kết nối SMTP, lần 3 thành công
      mockSendMail
        .mockRejectedValueOnce(new Error("SMTP timeout attempt 1"))
        .mockRejectedValueOnce(new Error("SMTP timeout attempt 2"))
        .mockResolvedValueOnce({
          messageId: "<retry-success-3@edulms.edu.vn>",
        });

      const res = await sendEmailWithDeduplicationAndRetry({
        eventKey: "grade_alert_retry_success_case",
        eventType: "low_grade_alert",
        studentId: student1Id,
        parentId: parent1Id,
        recipientEmail: "phuhuynh1@edulms.edu.vn",
        subject: "Test Retry Thành Công",
        html: "<p>Retry</p>",
        maxRetries: 3,
        retryDelayMs: 0,
      });

      expect(mockSendMail).toHaveBeenCalledTimes(3);
      expect(res.sent).toBe(true);
      expect(res.status).toBe("sent");
      expect(res.attempts).toBe(3);
      expect(res.emailLog.lastError).toBeNull();
    });

    it("ghi nhận status = 'failed' cùng thông tin lastError và attempts vào EmailLog khi hết số lần retry, sau đó retryFailedEmails có thể gửi lại thành công", async () => {
      jest.spyOn(EmailLog, "findOne").mockResolvedValue(null);
      let persistedFailedLog = null;
      jest
        .spyOn(EmailLog.prototype, "save")
        .mockImplementation(function () {
          persistedFailedLog = this;
          return Promise.resolve(this);
        });

      // Toàn bộ 2 lần thử đều thất bại
      mockSendMail.mockRejectedValue(
        new Error("535 Incorrect authentication data")
      );

      const failedRes = await sendEmailWithDeduplicationAndRetry({
        eventKey: "grade_alert_persistent_fail_case",
        eventType: "low_grade_alert",
        studentId: student1Id,
        parentId: parent1Id,
        recipientEmail: "phuhuynh1@edulms.edu.vn",
        subject: "Test Ghi Nhận Lỗi",
        html: "<p>Fail</p>",
        maxRetries: 2,
        retryDelayMs: 0,
      });

      expect(failedRes.sent).toBe(false);
      expect(failedRes.status).toBe("failed");
      expect(failedRes.attempts).toBe(2);
      expect(failedRes.error).toContain("535 Incorrect authentication data");
      expect(persistedFailedLog.status).toBe("failed");
      expect(persistedFailedLog.lastError).toContain("535");

      // Sau khi khắc phục SMTP, gọi retryFailedEmails() để gửi lại các bản ghi 'failed'
      mockSendMail.mockReset();
      mockSendMail.mockResolvedValue({
        messageId: "<recovered-after-retry@edulms.edu.vn>",
      });

      jest
        .spyOn(EmailLog, "find")
        .mockReturnValue(createMockQuery([persistedFailedLog]));
      jest
        .spyOn(EmailLog, "findOne")
        .mockResolvedValue(persistedFailedLog);

      const retryBatchRes = await retryFailedEmails({ retryDelayMs: 0 });
      expect(retryBatchRes.totalProcessed).toBe(1);
      expect(retryBatchRes.succeededCount).toBe(1);
      expect(persistedFailedLog.status).toBe("sent");
    });
  });

  /* =========================================================================
     6. JOB GỬI BÁO CÁO HỌC TẬP ĐỊNH KỲ CHO PHỤ HUYNH
  ========================================================================= */
  describe("6. Job gửi báo cáo học tập định kỳ (sendPeriodicAcademicReportsJob)", () => {
    it("tổng hợp điểm trung bình các môn và gửi email báo cáo học tập định kỳ cho các Phụ huynh có liên kết học sinh trong childrenRefs", async () => {
      jest.spyOn(User, "find").mockReturnValue(
        createMockQuery([
          {
            _id: parent1Id,
            fullName: "Ông Nguyễn Văn Ba",
            email: "phuhuynh1@edulms.edu.vn",
            role: "parent",
            childrenRefs: [
              {
                _id: student1Id,
                fullName: "Nguyễn Minh Anh",
                userCode: "HS1001",
                className: "10A1",
              },
            ],
          },
        ])
      );

      jest.spyOn(GradeRecord, "find").mockReturnValue(
        createMockQuery([
          {
            value: 9.0,
            weight: 2,
            teachingAssignment: { subject: { name: "Toán học 10" } },
          },
          {
            value: 8.0,
            weight: 2,
            teachingAssignment: { subject: { name: "Ngữ văn 10" } },
          },
        ])
      );

      jest.spyOn(EmailLog, "findOne").mockResolvedValue(null);
      jest
        .spyOn(EmailLog.prototype, "save")
        .mockImplementation(function () {
          return Promise.resolve(this);
        });

      const jobRes = await sendPeriodicAcademicReportsJob({
        periodKey: "2026-HK1-NOV",
        periodLabel: "Tháng 11/2026 - Học kỳ 1",
        semester: "HK1",
      });

      expect(jobRes.totalReportsProcessed).toBe(1);
      expect(jobRes.sentCount).toBe(1);
      expect(mockSendMail).toHaveBeenCalledTimes(1);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "phuhuynh1@edulms.edu.vn",
          subject: expect.stringMatching(/Báo cáo tổng hợp kết quả học tập định kỳ/i),
        })
      );
    });
  });
});
