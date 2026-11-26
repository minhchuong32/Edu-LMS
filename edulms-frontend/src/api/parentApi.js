import axiosClient from './axiosClient'

/**
 * API Client dành riêng cho Cổng thông tin Phụ huynh (Parent Portal - Read-only)
 * - Phụ huynh chỉ thực hiện các API đọc dữ liệu (GET) của học sinh nằm trong childrenRefs
 */
export const parentApi = {
  /**
   * Lấy danh sách toàn bộ học sinh được liên kết với tài khoản Phụ huynh (childrenRefs)
   * @param {Object} [params]
   */
  getLinkedChildren: (params) =>
    axiosClient.get('/v1/parent/children', { params }),

  /**
   * Lấy thông tin chi tiết học sinh, bảng điểm từng môn và thông báo của một học sinh được liên kết
   * @param {string} studentId
   * @param {Object} [params] - { semester }
   */
  getChildOverview: (studentId, params) =>
    axiosClient.get(`/v1/parent/children/${studentId}`, { params }),

  /**
   * Lấy bảng điểm theo môn học và học kỳ của một học sinh được liên kết
   * @param {string} studentId
   * @param {Object} [params] - { semester }
   */
  getChildGrades: (studentId, params) =>
    axiosClient.get(`/v1/parent/children/${studentId}/grades`, { params }),

  /**
   * Lấy danh sách thông báo từ nhà trường và giáo viên của một học sinh được liên kết
   * @param {string} studentId
   * @param {Object} [params] - { type }
   */
  getChildNotifications: (studentId, params) =>
    axiosClient.get(`/v1/parent/children/${studentId}/notifications`, {
      params,
    }),
}

export default parentApi

