import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  CheckCheck,
  Clock,
  BookOpen,
  Award,
  AlertCircle,
  ExternalLink,
  RefreshCw,
} from 'lucide-react'
import { useAuth } from '@/context/useAuth'
import notificationApi from '@/api/notificationApi'

/**
 * Định dạng thời gian thông báo sang tiếng Việt
 */
const formatNotificationTime = (dateInput) => {
  if (!dateInput) return 'Vừa xong'
  const d = new Date(dateInput)
  if (Number.isNaN(d.getTime())) return '---'
  return d.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * Xác định đường dẫn điều hướng liên quan cho một thông báo:
 * - Ưu tiên trường `notif.link`
 * - Nếu không có `link`, suy luận theo `type` / `assignment` / `gradeRecord` và vai trò người dùng
 */
const resolveNotificationLink = (notif, userRole = 'student') => {
  if (!notif) return ''
  if (notif.link && typeof notif.link === 'string' && notif.link.trim()) {
    return notif.link.trim()
  }

  const assignId =
    notif.assignment?._id ||
    notif.assignment ||
    notif.metadata?.assignmentId ||
    null

  if (
    notif.type === 'assignment_created' ||
    notif.type === 'assignment_graded' ||
    notif.type === 'assignment'
  ) {
    if (userRole === 'teacher') {
      return '/teacher/assignments'
    }
    return assignId
      ? `/student/assignments?assignmentId=${assignId}`
      : '/student/assignments'
  }

  if (
    notif.type === 'grade_created' ||
    notif.type === 'grade_updated' ||
    notif.type === 'grade'
  ) {
    if (userRole === 'parent') {
      return '/parent/grades'
    }
    if (userRole === 'teacher') {
      return '/teacher/gradebook'
    }
    const sem = notif.metadata?.semester || ''
    return sem ? `/student/grades?semester=${sem}` : '/student/grades'
  }

  return ''
}

/**
 * Biểu tượng và nhãn màu sắc theo loại thông báo
 */
const getNotificationMeta = (type) => {
  switch (type) {
    case 'assignment_created':
    case 'assignment':
      return {
        label: 'Bài tập mới',
        badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
        Icon: BookOpen,
      }
    case 'assignment_graded':
    case 'grade_created':
    case 'grade_updated':
    case 'grade':
      return {
        label: 'Điểm số',
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        Icon: Award,
      }
    default:
      return {
        label: 'Thông báo',
        badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        Icon: Bell,
      }
  }
}

/**
 * Component Icon Chuông Thông báo, Badge Số lượng Chưa đọc & Dropdown Danh sách Thông báo trên Header
 * - Hiển thị icon chuông trên Header
 * - Hiển thị badge số lượng thông báo chưa đọc (ẩn khi = 0, hiển thị '99+' nếu > 99)
 * - Click vào chuông mở/đóng dropdown danh sách thông báo
 * - Phân biệt trực quan giữa thông báo Chưa đọc (unread) và Đã đọc (read)
 * - Click vào một thông báo:
 *    1. Tự động gọi API đánh dấu đã đọc (`markAsRead`) và cập nhật state
 *    2. Tự động điều hướng (`navigate`) đến nội dung liên quan nếu có `link`
 * - Hỗ trợ nút "Đánh dấu tất cả đã đọc" và bộ lọc "Tất cả" / "Chưa đọc"
 * - Thiết kế Responsive trênทั้ง Desktop và Mobile
 */
export const NotificationBell = () => {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const containerRef = useRef(null)

  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  const [filterTab, setFilterTab] = useState('ALL') // 'ALL' | 'UNREAD'

  const userId = user?._id || user?.userId || user?.id || null
  const userRole = user?.role || 'student'

  // Tải danh sách thông báo của người dùng hiện tại
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return
    if (typeof notificationApi?.getMyNotifications !== 'function') return

    setLoading(true)
    setErrorMsg(null)

    try {
      const res = await notificationApi.getMyNotifications()
      const payload = res?.data || res || {}
      const list = Array.isArray(payload.notifications)
        ? payload.notifications
        : Array.isArray(payload)
          ? payload
          : []

      setNotifications(list)
    } catch (err) {
      // Xử lý an toàn nếu trong unit test của Header chưa mock notificationApi
      setErrorMsg(err?.message || null)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated) return

    let ignore = false
    const loadInitial = async () => {
      if (typeof notificationApi?.getMyNotifications !== 'function') return
      setLoading(true)
      setErrorMsg(null)
      try {
        const res = await notificationApi.getMyNotifications()
        if (ignore) return
        const payload = res?.data || res || {}
        const list = Array.isArray(payload.notifications)
          ? payload.notifications
          : Array.isArray(payload)
            ? payload
            : []
        setNotifications(list)
      } catch (err) {
        if (!ignore) {
          setErrorMsg(err?.message || null)
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    void loadInitial()
    return () => {
      ignore = true
    }
  }, [isAuthenticated, userId])

  // Đóng dropdown khi click ra ngoài hoặc nhấn phím Escape
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  // Tính tổng số lượng thông báo chưa đọc
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  )

  // Lọc danh sách thông báo hiển thị trong dropdown
  const displayedNotifications = useMemo(() => {
    if (filterTab === 'UNREAD') {
      return notifications.filter((n) => !n.isRead)
    }
    return notifications
  }, [notifications, filterTab])

  // Mở / đóng dropdown khi click vào chuông
  const handleToggleDropdown = () => {
    const nextOpen = !isOpen
    setIsOpen(nextOpen)
    if (nextOpen && notifications.length === 0) {
      void fetchNotifications()
    }
  }

  // Click vào 1 thông báo: Đánh dấu đã đọc + Điều hướng đến nội dung liên quan nếu có link
  const handleNotificationClick = async (notif) => {
    if (!notif) return
    const notifId = notif._id || notif.id

    // 1. Nếu thông báo chưa đọc -> cập nhật optimistic state ngay lập tức
    if (!notif.isRead && notifId) {
      setNotifications((prev) =>
        prev.map((item) =>
          String(item._id || item.id) === String(notifId)
            ? { ...item, isRead: true, readAt: new Date().toISOString() }
            : item
        )
      )
    }

    // 2. Điều hướng ngay đến nội dung liên quan nếu có link và đóng dropdown
    const targetLink = resolveNotificationLink(notif, userRole)
    if (targetLink) {
      setIsOpen(false)
      navigate(targetLink)
    }

    // 3. Đồng bộ đánh dấu đã đọc lên Backend
    if (!notif.isRead && notifId && typeof notificationApi?.markAsRead === 'function') {
      try {
        await notificationApi.markAsRead(notifId)
      } catch {
        // Giữ trạng thái UI mượt mà ngay cả khi mạng trễ
      }
    }
  }

  // Đánh dấu tất cả thông báo là đã đọc
  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return

    setNotifications((prev) =>
      prev.map((item) => ({
        ...item,
        isRead: true,
        readAt: item.readAt || new Date().toISOString(),
      }))
    )

    if (typeof notificationApi?.markAllAsRead === 'function') {
      try {
        await notificationApi.markAllAsRead()
      } catch {
        // ignore network error
      }
    }
  }

  if (!isAuthenticated) return null

  return (
    <div ref={containerRef} className="relative">
      {/* 1. Nút Icon Chuông & Badge Số lượng Thông báo Chưa đọc */}
      <button
        type="button"
        data-testid="notification-bell-button"
        aria-label="Thông báo"
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Thông báo"
        onClick={handleToggleDropdown}
        className={`p-2 rounded-full transition-all relative focus:outline-hidden ${
          isOpen
            ? 'bg-blue-50 text-blue-600'
            : 'text-slate-500 hover:text-blue-600 hover:bg-slate-100'
        }`}
      >
        <Bell className="w-5 h-5" />

        {unreadCount > 0 && (
          <span
            data-testid="notification-unread-badge"
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-600 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center border-2 border-white shadow-2xs"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* 2. Dropdown Danh sách Thông báo (Responsive trên Mobile & Desktop) */}
      {isOpen && (
        <div
          data-testid="notification-dropdown-panel"
          role="dialog"
          aria-label="Danh sách thông báo"
          className="fixed inset-x-3 top-16 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 overflow-hidden flex flex-col max-h-[80vh]"
        >
          {/* Header của Dropdown */}
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/80 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-extrabold text-slate-900">
                  Thông báo của bạn
                </h3>
                <span
                  data-testid="dropdown-unread-count-pill"
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    unreadCount > 0
                      ? 'bg-red-100 text-red-700'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {unreadCount} chưa đọc
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    data-testid="mark-all-notifications-read-btn"
                    onClick={handleMarkAllAsRead}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Đọc tất cả</span>
                  </button>
                )}

                <button
                  type="button"
                  data-testid="refresh-notifications-btn"
                  onClick={() => void fetchNotifications()}
                  disabled={loading}
                  title="Làm mới thông báo"
                  aria-label="Làm mới thông báo"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
                  />
                </button>
              </div>
            </div>

            {/* Bộ lọc Tất cả / Chưa đọc */}
            <div className="flex items-center gap-1 bg-slate-200/70 p-0.5 rounded-xl">
              <button
                type="button"
                data-testid="filter-notifications-all"
                onClick={() => setFilterTab('ALL')}
                className={`flex-1 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  filterTab === 'ALL'
                    ? 'bg-white text-blue-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tất cả ({notifications.length})
              </button>
              <button
                type="button"
                data-testid="filter-notifications-unread"
                onClick={() => setFilterTab('UNREAD')}
                className={`flex-1 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  filterTab === 'UNREAD'
                    ? 'bg-white text-blue-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Chưa đọc ({unreadCount})
              </button>
            </div>
          </div>

          {/* Danh sách Thông báo */}
          <div
            data-testid="notification-list-container"
            className="overflow-y-auto divide-y divide-slate-100 max-h-96"
          >
            {loading && notifications.length === 0 ? (
              <div
                data-testid="notification-loading-state"
                className="p-8 text-center text-xs text-slate-500"
              >
                Đang tải danh sách thông báo...
              </div>
            ) : errorMsg && notifications.length === 0 ? (
              <div
                data-testid="notification-error-state"
                className="p-6 text-center space-y-2"
              >
                <AlertCircle className="w-6 h-6 text-red-500 mx-auto" />
                <p className="text-xs text-red-700 font-medium">{errorMsg}</p>
              </div>
            ) : displayedNotifications.length === 0 ? (
              <div
                data-testid="notification-empty-state"
                className="p-8 text-center space-y-1.5"
              >
                <Bell className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-700">
                  {filterTab === 'UNREAD'
                    ? 'Bạn đã đọc hết tất cả thông báo!'
                    : 'Hiện chưa có thông báo nào'}
                </p>
                <p className="text-[11px] text-slate-500">
                  Các thông báo về bài tập mới và điểm số sẽ xuất hiện tại đây.
                </p>
              </div>
            ) : (
              displayedNotifications.map((notif, idx) => {
                const notifId = String(notif._id || notif.id || idx)
                const isUnread = !notif.isRead
                const meta = getNotificationMeta(notif.type)
                const ItemIcon = meta.Icon
                const targetLink = resolveNotificationLink(notif, userRole)
                const contentText =
                  notif.content || notif.message || notif.title || ''

                return (
                  <button
                    key={notifId}
                    type="button"
                    data-testid={`notification-item-${notifId}`}
                    data-read-status={isUnread ? 'unread' : 'read'}
                    onClick={() => void handleNotificationClick(notif)}
                    className={`w-full text-left p-3.5 transition-colors flex items-start gap-3 cursor-pointer ${
                      isUnread
                        ? 'bg-blue-50/60 hover:bg-blue-100/60'
                        : 'bg-white hover:bg-slate-50'
                    }`}
                  >
                    {/* Icon loại thông báo */}
                    <div
                      className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                        isUnread
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <ItemIcon className="w-4 h-4" />
                    </div>

                    {/* Nội dung thông báo */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${meta.badgeClass}`}
                        >
                          {meta.label}
                        </span>
                        <span
                          data-testid={`notification-status-label-${notifId}`}
                          className={`text-[10px] font-bold ${
                            isUnread ? 'text-blue-700' : 'text-slate-400'
                          }`}
                        >
                          {isUnread ? 'Chưa đọc' : 'Đã đọc'}
                        </span>
                      </div>

                      {notif.title && notif.title !== contentText && (
                        <p
                          className={`text-xs truncate ${
                            isUnread
                              ? 'font-extrabold text-slate-900'
                              : 'font-semibold text-slate-700'
                          }`}
                        >
                          {notif.title}
                        </p>
                      )}

                      <p
                        className={`text-xs leading-snug line-clamp-2 ${
                          isUnread
                            ? 'font-semibold text-slate-800'
                            : 'font-normal text-slate-600'
                        }`}
                      >
                        {contentText}
                      </p>

                      <div className="flex items-center justify-between gap-2 pt-0.5 text-[10px] text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatNotificationTime(notif.createdAt)}</span>
                        </span>

                        {targetLink && (
                          <span className="inline-flex items-center gap-0.5 text-blue-600 font-semibold">
                            <span>Xem chi tiết</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Chấm tròn xanh chỉ báo thông báo chưa đọc */}
                    {isUnread && (
                      <span
                        data-testid={`notification-unread-dot-${notifId}`}
                        className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0 mt-1.5"
                      />
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationBell
