# Sơ đồ Sequence Diagram - Chức năng Giáo viên Chấm điểm, Gửi Nhận xét & Tạo Thông báo cho Học sinh

Tài liệu này mô tả chi tiết luồng hoạt động giữa **Giao diện Giáo viên (`TeacherSubmissionGradingPanel`)**, **Hệ thống API Chấm bài (`submission.service`)**, **Dịch vụ Thông báo (`notification.service`)** và **Học sinh**.

---

## 1. Sơ đồ 1: Sequence Diagram Tổng hợp FE ⇄ BE (Gọn 5 cột – Đầy đủ các luồng chính)

```mermaid
sequenceDiagram
    autonumber
    actor GV as Giáo viên (Teacher)
    participant FE as Frontend UI<br/>(TeacherSubmissionGradingPanel)
    participant API as FE API Client<br/>(assignmentApi / axiosClient)
    participant BE_MW as BE Route & Middleware<br/>(protect + submissionPermission)
    participant BE_Core as BE Service, Notification & DB<br/>(submission.service + notification.service + MongoDB)

    note over GV,BE_Core: LUỒNG 1: XEM DANH SÁCH BÀI NỘP & XEM TRƯỚC / TẢI FILE BÀI LÀM
    GV->>FE: 1. Bấm "Xem bài nộp & Chấm điểm" trên thẻ bài tập
    FE->>API: 2. getSubmissionsByAssignment(assignmentId)
    API->>BE_MW: 3. GET /api/v1/submissions/assignment/:assignmentId (+ Bearer JWT)
    BE_MW->>BE_Core: 4. canViewSubmissionsByAssignment (Kiểm tra GV phụ trách Assignment) -> Query Submission
    BE_Core-->>FE: 5. Trả về danh sách bài nộp (student, fileUrl, submittedAt, isLate, score, feedback)
    FE-->>GV: 6. Hiển thị Bảng bài nộp, Badge (Đúng hạn / Trễ hạn) & Badge (Đã chấm / Chưa chấm)
    opt Xem trước hoặc tải file bài làm
        GV->>FE: 7. Bấm "Xem trước" (hoặc "Tải file")
        FE-->>GV: 8. Mở Modal Preview hiển thị trực tiếp PDF/Ảnh từ Cloudinary URL
    end

    note over GV,BE_Core: LUỒNG 2: CHẤM ĐIỂM & NHẬN XÉT INLINE + TRIGGER TẠO THÔNG BÁO CHO HỌC SINH
    GV->>FE: 9. Nhập Điểm (score: 0 - 10) và Nhận xét (feedback) trực tiếp trên dòng -> Bấm "Lưu kết quả"
    FE->>FE: 10. Kiểm tra điểm phía Client (bắt buộc nhập, 0 <= score <= 10)
    alt Điểm nhập ngoài khoảng 0 - 10
        FE-->>GV: 11a. Hiển thị thông báo lỗi đỏ ngay trên bảng ("Điểm phải nằm trong khoảng từ 0 đến 10")
    else Điểm hợp lệ
        FE->>API: 11b. assignmentApi.gradeSubmission(submissionId, { score, feedback })
        API->>BE_MW: 12. PATCH /api/v1/submissions/:id/grade (hoặc /:id/score, /:id/feedback)
        BE_MW->>BE_MW: 13. canGradeSubmission: Đối chiếu Submission -> Assignment -> TeachingAssignment.teacher === userId

        alt Không phải Giáo viên phụ trách Assignment (Chống IDOR)
            BE_MW-->>FE: 14a. Trả về 403 Forbidden ("Bạn không phải giáo viên phụ trách bài tập này!")
            FE-->>GV: Hiển thị thông báo cập nhật thất bại
        else Đúng Giáo viên phụ trách
            BE_MW->>BE_Core: 14b. Chuyển sang submission.controller -> submission.service.gradeSubmission
            BE_Core->>BE_Core: 15. validateScore(0 - 10) & validateFeedback(<= 2000 ký tự)
            BE_Core->>BE_Core: 16. Cập nhật score, feedback, gradedAt, gradedBy vào Submission trong MongoDB
            BE_Core->>BE_Core: 17. Trigger notificationService.createGradingNotification(recipient: student) lưu vào MongoDB
            BE_Core-->>FE: 18. Trả về 200 OK kèm bài nộp đã cập nhật điểm & nhận xét
            FE-->>GV: 19. Đổi Badge sang "Đã chấm (score/10)" & Hiển thị thông báo lưu thành công
        end
    end

    note over GV,BE_Core: LUỒNG 3: HỌC SINH NHẬN THÔNG BÁO & CHỈ XEM ĐIỂM / NHẬN XÉT CỦA CHÍNH MÌNH
    FE->>API: 20. Học sinh gọi GET /api/v1/notifications & GET /api/v1/submissions/:id (hoặc /my/:assignmentId)
    API->>BE_MW: 21. canViewSubmissionDetail: Kiểm tra submission.student === req.user.userId (Chặn 403 nếu xem của bạn khác)
    BE_MW->>BE_Core: 22. Truy vấn điểm, nhận xét và thông báo của học sinh chính chủ
    BE_Core-->>FE: 23. Hiển thị thông báo kết quả mới, Badge "Đã chấm" kèm Điểm số & Nhận xét của giáo viên
```

---

## 2. Sơ đồ 2: Sequence Diagram Chi tiết Phân tầng Backend (Middleware $\rightarrow$ Controller $\rightarrow$ Submission Service $\rightarrow$ Notification Service $\rightarrow$ MongoDB)

```mermaid
sequenceDiagram
    autonumber
    actor GV as Giáo viên (Teacher)
    participant FE as TeacherSubmissionGradingPanel.jsx
    participant MW as Middleware (canGradeSubmission)
    participant Ctrl as Controller (submission.controller.js)
    participant SubSvc as Service (submission.service.js)
    participant NotiSvc as Service (notification.service.js)
    participant DB as MongoDB (Submission, Assignment, TeachingAssignment, Notification)

    GV->>FE: 1. Nhập score, feedback trên dòng học sinh & bấm "Lưu kết quả"
    FE->>MW: 2. PATCH /api/v1/submissions/:id/grade { score, feedback }
    MW->>DB: 3. Tìm Submission -> Assignment -> TeachingAssignment
    DB-->>MW: 4. Trả về thông tin bài nộp & phân công giảng dạy

    alt Giáo viên không phụ trách Assignment này
        MW-->>FE: 5a. Trả về 403 Forbidden ("Bạn không phải giáo viên phụ trách bài tập này!")
    else Quyền hợp lệ
        MW->>Ctrl: 5b. Gắn req.targetSubmissionDoc, req.targetAssignmentDoc & gọi gradeSubmission
        Ctrl->>SubSvc: 6. gradeSubmission(submissionId, { score, feedback }, context)
        SubSvc->>SubSvc: 7. validateScore(score) [0 <= score <= 10] & validateFeedback(feedback)

        alt Điểm số không hợp lệ (< 0 hoặc > 10)
            SubSvc-->>Ctrl: 8a. Throw AppError (400 Bad Request)
            Ctrl-->>FE: 9a. Trả về 400 Bad Request
        else Dữ liệu hợp lệ
            SubSvc->>DB: 8b. Cập nhật submissionDoc (score, feedback, gradedAt, gradedBy) & save()
            DB-->>SubSvc: 9b. Trả về savedSubmission
            SubSvc->>NotiSvc: 10. Trigger createGradingNotification({ recipient: student, sender: teacher, submission, assignment, score, feedback })
            NotiSvc->>DB: 11. Lưu Notification mới (type: 'assignment_graded', isRead: false)
            DB-->>NotiSvc: 12. Xác nhận lưu thông báo thành công
            SubSvc-->>Ctrl: 13. Trả về savedSubmission
            Ctrl-->>FE: 14. Trả về 200 OK ("Chấm điểm bài nộp thành công")
            FE-->>GV: 15. Cập nhật trạng thái "Đã chấm (score/10)" & hiện thông báo thành công
        end
    end
```

