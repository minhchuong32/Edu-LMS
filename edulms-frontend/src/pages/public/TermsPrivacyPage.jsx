import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Shield,
  FileText,
  Lock,
  User,
  BookOpen,
  Cookie,
  Mail,
  Database,
  CheckCircle,
  AlertCircle,
  ArrowUp,
  ChevronRight,
  Search,
  Moon,
  Sun,
  GraduationCap,
  Clock,
  ExternalLink,
  HelpCircle,
  Layers,
  Sparkles,
  Server,
  UserCheck,
  Ban,
  Scale,
  Bell,
  Check,
} from "lucide-react";

// Dữ liệu 15 mục Điều khoản dịch vụ & Chính sách bảo mật bằng tiếng Việt
const SECTIONS = [
  {
    id: "acceptance",
    number: "1",
    title: "Chấp nhận điều khoản",
    category: "Điều khoản dịch vụ",
    icon: FileText,
    badge: "Thỏa thuận cốt lõi",
    summary: "Bằng việc truy cập hoặc sử dụng EduLMS, bạn đồng ý tuân thủ các Điều khoản dịch vụ này.",
    content: (
      <div className="space-y-4">
        <p className="leading-relaxed text-gray-700 dark:text-gray-300">
          Chào mừng bạn đến với <strong className="text-indigo-600 dark:text-indigo-400">EduLMS</strong> ("Nền tảng"), Hệ thống Quản lý Học tập hiện đại được thiết kế dành riêng cho nhà trường, giáo viên, học sinh và phụ huynh. Khi đăng ký, truy cập hoặc sử dụng bất kỳ tính năng nào của EduLMS, bạn đã chính thức đồng ý tuân thủ và chịu sự ràng buộc pháp lý bởi các Điều khoản dịch vụ và Chính sách bảo mật này.
        </p>
        <p className="leading-relaxed text-gray-700 dark:text-gray-300">
          Các điều khoản này áp dụng chung cho tất cả đối tượng người dùng—bao gồm Quản trị viên nhà trường, Hội đồng sư phạm (Giáo viên), Học sinh phổ thông và Phụ huynh học sinh. Nếu bạn không đồng ý với bất kỳ phần nào trong các điều khoản này, vui lòng ngừng truy cập và sử dụng Nền tảng ngay lập tức.
        </p>
        <div className="p-4 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60">
          <div className="flex items-start space-x-3">
            <CheckCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mt-0.5 flex-shrink-0" />
            <span className="text-sm text-indigo-900 dark:text-indigo-200">
              Người dùng Đại diện Tổ chức: Nếu bạn truy cập EduLMS thay mặt cho một trường học hoặc tổ chức giáo dục, bạn cam kết rằng mình có đầy đủ thẩm quyền ràng buộc tổ chức đó với các Điều khoản này.
            </span>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "user-accounts",
    number: "2",
    title: "Tài khoản người dùng",
    category: "Điều khoản dịch vụ",
    icon: User,
    badge: "Xác thực & Bảo mật",
    summary: "Quy định về khởi tạo tài khoản, mã xác thực và trách nhiệm bảo vệ thông tin đăng nhập.",
    content: (
      <div className="space-y-4">
        <p className="leading-relaxed text-gray-700 dark:text-gray-300">
          Tài khoản trên EduLMS được khởi tạo dựa trên danh tính chính thức do Ban Giám Hiệu nhà trường cung cấp. Các vai trò hệ thống bao gồm: <strong>Quản trị viên (Admin)</strong>, <strong>Giáo viên (Teacher)</strong>, <strong>Học sinh (Student)</strong> và <strong>Phụ huynh (Parent)</strong>.
        </p>
        <ul className="space-y-2 text-gray-700 dark:text-gray-300 list-disc list-inside pl-2">
          <li><strong>Mã định danh duy nhất:</strong> Học sinh và Giáo viên được liên kết với Mã học sinh (VD: HS-XXXX) hoặc Mã giáo viên (VD: GV-XXXX) được cấp bởi nhà trường.</li>
          <li><strong>Kích hoạt tài khoản:</strong> Người dùng mới phải sử dụng Mã kích hoạt được gửi qua email nhà trường để hoàn tất đăng ký mật khẩu trước khi đăng nhập.</li>
          <li><strong>Bảo mật thông tin:</strong> Bạn chịu trách nhiệm duy nhất trong việc bảo mật mật khẩu và mã xác thực truy cập. Không chia sẻ tài khoản với bất kỳ ai khác.</li>
        </ul>
        <div className="p-4 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/60 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-amber-900 dark:text-amber-200">
            Bạn phải thông báo ngay cho Quản trị viên EduLMS nếu phát hiện bất kỳ dấu hiệu truy cập trái phép hoặc sự cố bảo mật nào liên quan đến tài khoản của mình.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "acceptable-use",
    number: "3",
    title: "Quy định sử dụng hợp lệ",
    category: "Điều khoản dịch vụ",
    icon: Ban,
    badge: "Chuẩn mực hành vi",
    summary: "Các hành vi bị nghiêm cấm, tính trung thực trong học thuật và an toàn hệ thống.",
    content: (
      <div className="space-y-4">
        <p className="leading-relaxed text-gray-700 dark:text-gray-300">
          EduLMS cam kết duy trì một môi trường học tập lành mạnh, văn minh và an toàn. Bạn đồng ý sử dụng Nền tảng duy nhất cho mục đích học tập và giảng dạy hợp pháp.
        </p>
        <h4 className="font-semibold text-gray-900 dark:text-white">Các hành vi bị nghiêm cấm tuyệt đối:</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            "Gian lận thi cử, đạo văn hoặc nộp bài làm của người khác",
            "Quấy rầy, xúc phạm, bắt nạt hoặc phát ngôn thù thù địch",
            "Tải lên tệp tin độc hại, chứa virus hoặc mã gian lận",
            "Cố gắng xâm nhập trái phép vào cơ sở dữ liệu hệ thống",
            "Sử dụng công cụ tự động cào/trích xuất nội dung bài học",
            "Giả mạo danh tính của học sinh, giáo viên hoặc admin",
          ].map((item, idx) => (
            <div key={idx} className="flex items-center space-x-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/50">
              <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0" />
              <span className="text-sm text-gray-700 dark:text-gray-300">{item}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "learning-content",
    number: "4",
    title: "Nội dung bài học & Bài nộp",
    category: "Điều khoản dịch vụ",
    icon: BookOpen,
    badge: "Tài liệu học thuật",
    summary: "Quyền hạn và trách nhiệm đối với bài giảng, tài liệu đính kèm và bài kiểm tra.",
    content: (
      <div className="space-y-4">
        <p className="leading-relaxed text-gray-700 dark:text-gray-300">
          EduLMS hỗ trợ truyền tải bài giảng điện tử, bài giảng video, tài liệu tham khảo PDF, bài thi trắc nghiệm và bài tập tự luận.
        </p>
        <div className="space-y-3">
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
            <h5 className="font-medium text-gray-900 dark:text-white mb-1">Trách nhiệm của Giáo viên</h5>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Giáo viên đảm bảo các tài liệu bài học dạng PDF và bài giảng video (tối đa 30MB) được tải lên phù hợp với chương trình giảng dạy của Bộ GD&ĐT và không vi phạm bản quyền.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
            <h5 className="font-medium text-gray-900 dark:text-white mb-1">Trách nhiệm của Học sinh</h5>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Học sinh phải hoàn thành bài tập đúng hạn. Tệp tin bài nộp tự luận (định dạng PDF ≤10MB) là căn cứ chính thức để giáo viên chấm điểm và lưu vào sổ điểm điện tử.
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "intellectual-property",
    number: "5",
    title: "Quyền sở hữu trí tuệ",
    category: "Điều khoản dịch vụ",
    icon: Scale,
    badge: "Bản quyền & Sỡ hữu",
    summary: "Quyền sở hữu phần mềm EduLMS và quyền tác giả của tài liệu giáo án.",
    content: (
      <div className="space-y-4">
        <p className="leading-relaxed text-gray-700 dark:text-gray-300">
          Mã nguồn, giao diện người dùng, logo, hệ thống cơ sở dữ liệu và thương hiệu <strong className="text-indigo-600 dark:text-indigo-400">EduLMS</strong> thuộc quyền sở hữu trí tuệ độc quyền của EduLMS và các đối tác cấp phép.
        </p>
        <p className="leading-relaxed text-gray-700 dark:text-gray-300">
          Tài liệu bài giảng do Giáo viên tải lên thuộc bản quyền của Giáo viên hoặc nhà trường tương ứng. Bằng việc đưa tài liệu lên EduLMS, Giáo viên cấp cho Nền tảng quyền lưu trữ, hiển thị và phân phối tài liệu đó trong phạm vi lớp học được phân công.
        </p>
      </div>
    ),
  },
  {
    id: "privacy-policy",
    number: "6",
    title: "Tổng quan chính sách bảo mật",
    category: "Chính sách bảo mật",
    icon: Shield,
    badge: "Bảo vệ dữ liệu",
    summary: "Cam kết tối thượng của chúng tôi trong việc bảo vệ dữ liệu cá nhân của học sinh.",
    content: (
      <div className="space-y-4">
        <p className="leading-relaxed text-gray-700 dark:text-gray-300">
          Quyền riêng tư của bạn là ưu tiên hàng đầu của EduLMS. Chính sách này giải thích chi tiết cách EduLMS thu thập, xử lý, lưu trữ và bảo vệ dữ liệu cá nhân của học sinh, giáo viên và phụ huynh.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-4 text-center rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40">
            <Lock className="w-6 h-6 text-indigo-600 dark:text-indigo-400 mx-auto mb-2" />
            <h5 className="font-semibold text-gray-900 dark:text-white text-sm">Mã hóa TLS 256-bit</h5>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Bảo vệ dữ liệu truyền qua mạng</p>
          </div>
          <div className="p-4 text-center rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
            <UserCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
            <h5 className="font-semibold text-gray-900 dark:text-white text-sm">Không Quảng cáo</h5>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Dữ liệu học sinh không bị thương mại hóa</p>
          </div>
          <div className="p-4 text-center rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40">
            <Database className="w-6 h-6 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
            <h5 className="font-semibold text-gray-900 dark:text-white text-sm">Kiểm soát Phân quyền</h5>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Cơ chế bảo vệ Scope từng Lớp học (RBAC)</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "information-collected",
    number: "7",
    title: "Thông tin chúng tôi thu thập",
    category: "Chính sách bảo mật",
    icon: Database,
    badge: "Thu thập dữ liệu",
    summary: "Các loại dữ liệu cá nhân, nhật ký đăng nhập và hồ sơ học tập được hệ thống ghi nhận.",
    content: (
      <div className="space-y-4">
        <p className="leading-relaxed text-gray-700 dark:text-gray-300">
          Để cung cấp đầy đủ các tính năng quản lý học tập, EduLMS thu thập các danh mục thông tin sau:
        </p>
        <div className="space-y-2">
          {[
            { label: "Thông tin Tài khoản", detail: "Họ và tên, Email, Mật khẩu đã mã hóa, Mã học sinh/giáo viên, Lớp học và Vai trò." },
            { label: "Kết quả Học tập", detail: "Tiến độ học bài, Điểm kiểm tra (hệ số 1, 2, 3), Điểm trung bình, Lịch sử điểm danh và Lịch sử chuyển lớp." },
            { label: "Tệp tin & Bài nộp", detail: "Bài làm tự luận PDF (≤10MB), Bài giảng video giáo viên (≤30MB) và tệp tin đính kèm." },
            { label: "Nhật ký Kỹ thuật", detail: "Địa chỉ IP, loại trình duyệt, thiết bị đăng nhập, thời gian truy cập và Refresh Token." },
            { label: "Thông tin Giao tiếp", detail: "Thông báo hệ thống, tin nhắn thông báo lớp học và phản hồi hỗ trợ." },
          ].map((item, idx) => (
            <div key={idx} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/50">
              <span className="font-semibold text-gray-900 dark:text-white text-sm">{item.label}: </span>
              <span className="text-sm text-gray-600 dark:text-gray-300">{item.detail}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "data-usage",
    number: "8",
    title: "Mục đích sử dụng dữ liệu",
    category: "Chính sách bảo mật",
    icon: Sparkles,
    badge: "Xử lý dữ liệu",
    summary: "Dữ liệu học tập được sử dụng để quản lý sổ điểm, điểm danh và báo cáo phụ huynh.",
    content: (
      <div className="space-y-4">
        <p className="leading-relaxed text-gray-700 dark:text-gray-300">
          EduLMS xử lý dữ liệu thu thập duy nhất cho các hoạt động giáo dục và quản lý nhà trường:
        </p>
        <ul className="space-y-2 text-gray-700 dark:text-gray-300 list-disc list-inside pl-2">
          <li>Quản lý danh sách lớp học và phân công giảng dạy môn học cho giáo viên.</li>
          <li>Hỗ trợ giáo viên nhập điểm, theo dõi chuyên cần và cập nhật tiến độ bài học.</li>
          <li>Cho phép phụ huynh theo dõi tình hình học tập và điểm danh của con em thời gian thực.</li>
          <li>Tính toán điểm trung bình môn, điểm tổng kết và chuyển lớp theo năm học.</li>
          <li>Bảo đảm an ninh hệ thống, phát hiện truy cập bất thường và xử lý lỗi kỹ thuật.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "cookies",
    number: "9",
    title: "Cookie & Công nghệ theo dõi",
    category: "Chính sách bảo mật",
    icon: Cookie,
    badge: "Lưu trữ phiên",
    summary: "Sử dụng Cookie cần thiết, JWT Token và bộ nhớ cục bộ để duy trì đăng nhập.",
    content: (
      <div className="space-y-4">
        <p className="leading-relaxed text-gray-700 dark:text-gray-300">
          EduLMS sử dụng công nghệ lưu trữ phiên an toàn để duy trì trạng thái đăng nhập của người dùng.
        </p>
        <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 space-y-2">
          <div className="flex items-center space-x-2">
            <Check className="w-4 h-4 text-emerald-500" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">JWT Access Token & Refresh Token</span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 pl-6">
            Mã thông báo JWT ngắn hạn đảm bảo giao tiếp API bảo mật giữa trình duyệt và máy chủ.
          </p>
          <div className="flex items-center space-x-2 pt-2">
            <Check className="w-4 h-4 text-emerald-500" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Giao diện Sáng/Tối (Dark Mode)</span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 pl-6">
            Local Storage lưu trữ cài đặt giao diện ưa thích của người dùng.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "data-security",
    number: "10",
    title: "Bảo mật & Mã hóa dữ liệu",
    category: "Chính sách bảo mật",
    icon: Lock,
    badge: "An ninh hạ tầng",
    summary: "Các biện pháp mã hóa dữ liệu học sinh tuân thủ tiêu chuẩn an toàn thông tin.",
    content: (
      <div className="space-y-4">
        <p className="leading-relaxed text-gray-700 dark:text-gray-300">
          Chúng tôi áp dụng các biện pháp bảo mật kỹ thuật và tổ chức chặt chẽ nhằm bảo vệ dữ liệu chống lại sự truy cập, thay đổi hoặc phá hoại trái phép:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
            <h5 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">Mã hóa Mật khẩu Bcrypt</h5>
            <p className="text-xs text-gray-600 dark:text-gray-400">Mật khẩu được băm và thêm muối mã hóa bằng thuật toán Bcrypt trước khi lưu trữ.</p>
          </div>
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
            <h5 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">Lưu trữ Đám mây Cloudinary</h5>
            <p className="text-xs text-gray-600 dark:text-gray-400">Các tệp PDF và Video được bảo vệ an toàn trên Cloudinary thông qua kênh kết nối HTTPS.</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "third-party",
    number: "11",
    title: "Dịch vụ bên thứ ba",
    category: "Chính sách bảo mật",
    icon: Server,
    badge: "Tích hợp hệ thống",
    summary: "Các đối tác cung cấp hạ tầng cơ sở dữ liệu và lưu trữ phương tiện đám mây.",
    content: (
      <div className="space-y-4">
        <p className="leading-relaxed text-gray-700 dark:text-gray-300">
          EduLMS hợp tác với các nhà cung cấp dịch vụ hạ tầng đám mây hàng đầu đạt chuẩn quốc tế:
        </p>
        <ul className="space-y-2 text-gray-700 dark:text-gray-300 list-disc list-inside pl-2 text-sm">
          <li><strong>MongoDB Atlas:</strong> Hạ tầng cơ sở dữ liệu đám mây bảo mật với cơ chế mã hóa dữ liệu tại chỗ.</li>
          <li><strong>Cloudinary API:</strong> Dịch vụ lưu trữ và phân phối tệp bài giảng PDF và Video bài học tốc độ cao.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "user-rights",
    number: "12",
    title: "Quyền của người dùng & GDPR",
    category: "Chính sách bảo mật",
    icon: UserCheck,
    badge: "Quyền riêng tư",
    summary: "Quyền truy cập, chỉnh sửa, trích xuất hoặc yêu cầu xóa dữ liệu cá nhân.",
    content: (
      <div className="space-y-4">
        <p className="leading-relaxed text-gray-700 dark:text-gray-300">
          Tuân thủ các nguyên tắc bảo vệ dữ liệu hiện đại, người dùng EduLMS có đầy đủ các quyền sau đối với dữ liệu của mình:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { title: "Quyền Xem Dữ Liệu", desc: "Xem đầy đủ lịch sử học tập, bảng điểm và chuyên cần bất kỳ lúc nào." },
            { title: "Quyền Điều Chỉnh", desc: "Yêu cầu Quản trị viên cập nhật thông tin cá nhân bị sai lệch." },
            { title: "Quyền Trích Xuất", desc: "Xuất dữ liệu học tập và bảng điểm cá nhân ra định dạng Excel." },
            { title: "Quyền Xóa Tài Khoản", desc: "Yêu cầu vô hiệu hóa tài khoản và ẩn hồ sơ sau khi ra trường." },
          ].map((right, idx) => (
            <div key={idx} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/50">
              <h5 className="font-semibold text-gray-900 dark:text-white text-sm">{right.title}</h5>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{right.desc}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "account-termination",
    number: "13",
    title: "Chấm dứt & Tạm khóa tài khoản",
    category: "Điều khoản dịch vụ",
    icon: Ban,
    badge: "Thực thi quy định",
    summary: "Các trường hợp tài khoản bị tạm khóa hoặc ngừng hoạt động trên hệ thống.",
    content: (
      <div className="space-y-4">
        <p className="leading-relaxed text-gray-700 dark:text-gray-300">
          Ban Giám Hiệu hoặc Quản trị viên EduLMS có quyền tạm ngưng hoặc vô hiệu hóa quyền truy cập tài khoản trong các trường hợp:
        </p>
        <ul className="space-y-2 text-gray-700 dark:text-gray-300 list-disc list-inside pl-2 text-sm">
          <li>Học sinh đã tốt nghiệp, chuyển trường hoặc thôi học theo quyết định của nhà trường.</li>
          <li>Vi phạm nghiêm trọng Quy định sử dụng hợp lệ hoặc gian lận học thuật nhiều lần.</li>
          <li>Có yêu cầu bằng văn bản từ Phụ huynh hoặc Cơ quan quản lý giáo dục.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "changes-to-terms",
    number: "14",
    title: "Thay đổi điều khoản & Thông báo",
    category: "Điều khoản dịch vụ",
    icon: Bell,
    badge: "Cập nhật",
    summary: "Quy trình cập nhật các điều khoản dịch vụ và thông báo cho người dùng.",
    content: (
      <div className="space-y-4">
        <p className="leading-relaxed text-gray-700 dark:text-gray-300">
          EduLMS có thể cập nhật các Điều khoản dịch vụ và Chính sách bảo mật này theo thời gian để đáp ứng sự thay đổi của công nghệ hoặc quy định pháp luật. Những thay đổi quan trọng sẽ được thông báo công khai trên bảng tin chung của bảng điều khiển EduLMS.
        </p>
      </div>
    ),
  },
  {
    id: "contact-info",
    number: "15",
    title: "Thông tin liên hệ & Hỗ trợ",
    category: "Liên hệ pháp lý",
    icon: Mail,
    badge: "Bộ phận hỗ trợ",
    summary: "Địa chỉ liên hệ giải đáp thắc mắc về điều khoản dịch vụ và an toàn dữ liệu.",
    content: (
      <div className="space-y-4">
        <p className="leading-relaxed text-gray-700 dark:text-gray-300">
          Nếu bạn có bất kỳ thắc mắc, góp ý hoặc yêu cầu hỗ trợ nào liên quan đến Điều khoản dịch vụ và Bảo mật thông tin, vui lòng liên hệ với chúng tôi:
        </p>
        <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md">
          <div className="space-y-2 text-sm">
            <p className="font-semibold text-base">Bộ phận Hỗ trợ Kỹ thuật & Bảo mật EduLMS</p>
            <p className="flex items-center space-x-2">
              <Mail className="w-4 h-4 flex-shrink-0" />
              <span>Email: <strong>hotro@edulms.edu.vn</strong> / <strong>baomat@edulms.edu.vn</strong></span>
            </p>
            <p className="flex items-center space-x-2">
              <GraduationCap className="w-4 h-4 flex-shrink-0" />
              <span>Trường Đại học Sư phạm Kỹ thuật TP. Hồ Chí Minh (HCMUTE)</span>
            </p>
            <p className="text-xs text-indigo-100 pt-2 border-t border-indigo-400/40">
              Thời gian làm việc: Thứ Hai – Thứ Sáu (8:00 AM – 5:00 PM)
            </p>
          </div>
        </div>
      </div>
    ),
  },
];

export default function TermsPrivacyPage() {
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Lọc danh sách mục theo từ khóa tìm kiếm
  const filteredSections = SECTIONS.filter(
    (sec) =>
      sec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sec.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sec.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Chuyển đổi giao diện Sáng / Tối (Dark Mode)
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  // Theo dõi cuộn trang (Scroll Spy) & nút Quay lại đầu trang
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }

      const scrollPosition = window.scrollY + 200;
      for (const section of SECTIONS) {
        const element = document.getElementById(section.id);
        if (element) {
          const top = element.offsetTop;
          const height = element.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Hàm cuộn trang từ từ mượt mà sử dụng requestAnimationFrame và easeInOutCubic
  const animateScrollTo = (targetPosition, duration = 850) => {
    const startPosition = window.pageYOffset;
    const distance = targetPosition - startPosition;
    let startTime = null;

    const easeInOutCubic = (t) => {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

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

  // Xử lý cuộn từ từ đến mục được chọn
  const scrollToSection = (id) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -90;
      const targetY = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      animateScrollTo(targetY, 850);
    }
  };

  // Cuộn từ từ lên đầu trang
  const scrollToTop = () => {
    animateScrollTo(0, 850);
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? "dark bg-gray-950 text-gray-100" : "bg-slate-50 text-gray-900"}`}>
      {/* Thanh điều hướng trên cùng */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border-b border-gray-200/80 dark:border-gray-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white font-extrabold font-outfit flex items-center justify-center text-xl shadow-sm shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              E
            </div>
            <div>
              <h1 className="font-outfit font-extrabold text-base tracking-wide text-gray-900 dark:text-white leading-none">
                EduLMS
              </h1>
              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block mt-0.5">
                Hệ thống Quản lý Học tập
              </span>
            </div>
          </Link>

          <div className="flex items-center space-x-3">
            <button
              onClick={toggleDarkMode}
              aria-label="Chuyển đổi giao diện sáng tối"
              className="p-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-100/80 dark:bg-gray-800/80 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
            >
              {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-600" />}
            </button>

            <Link
              to="/login"
              className="hidden sm:flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md shadow-indigo-500/20 transition-all hover:shadow-indigo-500/30"
            >
              <span>Quay lại Đăng nhập</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Banner Section */}
      <section className="relative overflow-hidden pt-12 pb-16 bg-gradient-to-b from-indigo-50/70 via-slate-50 to-slate-50 dark:from-indigo-950/20 dark:via-gray-950 dark:to-gray-950 border-b border-gray-200/60 dark:border-gray-800/80">
        <div className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-20">
          <div className="absolute -top-24 -left-20 w-96 h-96 rounded-full bg-indigo-400/30 blur-3xl" />
          <div className="absolute top-10 -right-20 w-96 h-96 rounded-full bg-purple-400/30 blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-100/80 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
            <Shield className="w-3.5 h-3.5" />
            <span>Văn bản Quy định & Bảo mật Chính thức</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Điều khoản dịch vụ & Chính sách bảo mật
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-gray-600 dark:text-gray-400">
            Vui lòng đọc kỹ các điều khoản dưới đây trước khi sử dụng EduLMS. Sự minh bạch, an toàn dữ liệu và quyền riêng tư của học sinh là cam kết hàng đầu của chúng tôi.
          </p>

          <div className="flex items-center justify-center space-x-4 text-xs text-gray-500 dark:text-gray-400 pt-2">
            <span className="flex items-center space-x-1.5">
              <Clock className="w-4 h-4 text-indigo-500" />
              <span>Cập nhật lần cuối: <strong>03 tháng 08, 2026</strong></span>
            </span>
            <span>•</span>
            <span className="flex items-center space-x-1.5">
              <Layers className="w-4 h-4 text-purple-500" />
              <span>Phiên bản 2.4</span>
            </span>
          </div>
        </div>
      </section>

      {/* Thân trang & Bố cục Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Thanh Mục lục Cố định (Sticky Sidebar) */}
          <aside className="lg:col-span-4">
            <div className="lg:sticky lg:top-24 space-y-4">
              
              {/* Ô tìm kiếm mục */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm 15 mục quy định..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-gray-900 dark:text-white shadow-sm"
                />
              </div>

              {/* Card Danh sách Mục lục */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/80 dark:border-gray-800 p-5 shadow-lg shadow-gray-200/50 dark:shadow-none space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <h2 className="font-bold text-gray-900 dark:text-white text-base">Mục lục Nội dung</h2>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                    15 Mục
                  </span>
                </div>

                <nav aria-label="Mục lục" className="max-h-[calc(100vh-280px)] overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                  {filteredSections.length === 0 ? (
                    <p className="text-xs text-gray-500 py-4 text-center">Không tìm thấy mục nào khớp với "{searchQuery}"</p>
                  ) : (
                    filteredSections.map((sec) => {
                      const isActive = activeSection === sec.id;
                      return (
                        <button
                          key={sec.id}
                          onClick={() => scrollToSection(sec.id)}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium transition-all text-left group ${
                            isActive
                              ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                              : "text-gray-600 dark:text-gray-400 hover:bg-indigo-50/70 dark:hover:bg-gray-800 hover:text-indigo-600 dark:hover:text-indigo-300"
                          }`}
                        >
                          <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                            <span className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                              isActive ? "bg-white/20 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-950"
                            }`}>
                              {sec.number}
                            </span>
                            <span className="truncate">{sec.title}</span>
                          </div>
                          <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${isActive ? "text-white translate-x-0.5" : "text-gray-400 group-hover:translate-x-0.5"}`} />
                        </button>
                      );
                    })
                  )}
                </nav>
              </div>

              {/* Card Hỗ trợ Pháp lý */}
              <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 dark:from-indigo-950/40 dark:to-purple-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-900/60 p-4 space-y-2 text-xs">
                <div className="flex items-center space-x-2 text-indigo-700 dark:text-indigo-300 font-semibold">
                  <HelpCircle className="w-4 h-4" />
                  <span>Bạn có thắc mắc về điều khoản?</span>
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  Gửi email trực tiếp đến Bộ phận Pháp lý & Bảo mật tại <strong className="text-gray-900 dark:text-white">hotro@edulms.edu.vn</strong>
                </p>
              </div>

            </div>
          </aside>

          {/* Các Card Nội dung Chi tiết */}
          <section className="lg:col-span-8 space-y-8">
            {SECTIONS.map((sec) => {
              const IconComponent = sec.icon;
              return (
                <article
                  key={sec.id}
                  id={sec.id}
                  className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/80 dark:border-gray-800 p-6 sm:p-8 shadow-lg shadow-gray-200/40 dark:shadow-none transition-all hover:border-indigo-200 dark:hover:border-indigo-900/80 scroll-mt-24"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 mb-6 border-b border-gray-100 dark:border-gray-800 gap-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0 shadow-sm">
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 tracking-wider uppercase">
                            Mục {sec.number}
                          </span>
                          <span className="text-gray-300 dark:text-gray-700">•</span>
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            {sec.category}
                          </span>
                        </div>
                        <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-0.5">
                          {sec.title}
                        </h3>
                      </div>
                    </div>

                    <span className="self-start sm:self-auto px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                      {sec.badge}
                    </span>
                  </div>

                  <p className="text-sm font-medium text-indigo-900 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/30 p-3 rounded-xl border border-indigo-100/60 dark:border-indigo-900/40 mb-5">
                    💡 <strong>Tóm tắt cốt lõi:</strong> {sec.summary}
                  </p>

                  <div className="prose prose-indigo dark:prose-invert max-w-none text-sm leading-relaxed">
                    {sec.content}
                  </div>
                </article>
              );
            })}

            {/* Thông báo cam kết chân trang */}
            <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-center space-y-3">
              <Shield className="w-8 h-8 text-indigo-600 dark:text-indigo-400 mx-auto" />
              <h4 className="font-bold text-gray-900 dark:text-white text-base">Cam kết Pháp lý EduLMS</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400 max-w-lg mx-auto">
                Cảm ơn bạn đã lựa chọn EduLMS làm nền tảng Quản lý Học tập đồng hành. Chúng tôi nỗ lực thúc đẩy hiệu quả giảng dạy đi đôi với việc bảo vệ an toàn thông tin của người dùng.
              </p>
              <div className="pt-2 flex justify-center space-x-4 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                <Link to="/login" className="hover:underline flex items-center space-x-1">
                  <span>Đăng nhập hệ thống EduLMS</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </section>

        </div>
      </main>

      {/* Nút Nổi Cuộn lên Đầu trang */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          aria-label="Cuộn lên đầu trang"
          className="fixed bottom-8 right-8 z-50 p-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-600/30 transition-all hover:scale-110 active:scale-95"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
