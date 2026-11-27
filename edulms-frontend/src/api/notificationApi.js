import axiosClient from './axiosClient'

/**
 * API Client cho Hệ thống Thông báo trong ứng dụng (In-App Notification System)
 */
export const notificationApi = {
  /**
   * Lấy danh sách thông báo của người dùng hiện tại kèm số lượng chưa đọc (unreadCount)
   * @param {Object} [params] - { isRead, type }
   */
  getMyNotifications: (params) =>
    axiosClient.get('/v1/notifications', { params }),

  /**
   * Tạo thông báo mới cho người dùng (dành cho Giáo viên / Quản trị viên)
   * @param {Object} data - { recipient, type, content, link, title }
   */
  createNotification: (data) => axiosClient.post('/v1/notifications', data),

  /**
   * Đánh dấu một thông báo cụ thể là đã đọc
   * @param {string} id - notificationId
   */
  markAsRead: (id) => axiosClient.patch(`/v1/notifications/${id}/read`),

  /**
   * Đánh dấu tất cả thông báo của người dùng hiện tại là đã đọc
   */
  markAllAsRead: () => axiosClient.patch('/v1/notifications/read-all'),
}

export default notificationApi

