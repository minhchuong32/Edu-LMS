import axiosClient from './axiosClient'

export const gradebookApi = {
  /**
   * Truy vấn danh sách điểm và điểm trung bình theo học sinh / lớp / môn / học kỳ
   * @param {Object} params - { student, teachingAssignment, classId, subjectId, semester, academicYear, gradeType }
   */
  getGradeRecords: (params) => axiosClient.get('/v1/gradebook', { params }),

  /**
   * Lấy sổ điểm theo mã phân công giảng dạy (TeachingAssignment)
   * @param {string} teachingAssignmentId
   * @param {Object} [params] - { semester, student, gradeType }
   */
  getGradeRecordsByTeachingAssignment: (teachingAssignmentId, params) =>
    axiosClient.get(
      `/v1/gradebook/teaching-assignment/${teachingAssignmentId}`,
      { params }
    ),

  /**
   * Nhập mới một bản ghi điểm
   * @param {Object} data - { student, teachingAssignment, semester, gradeType, value, weight, note }
   */
  createGradeRecord: (data) => axiosClient.post('/v1/gradebook', data),

  /**
   * Cập nhật một bản ghi điểm theo ID
   * @param {string} id
   * @param {Object} data - { value, gradeType, weight, semester, note }
   */
  updateGradeRecord: (id, data) => axiosClient.put(`/v1/gradebook/${id}`, data),

  /**
   * Xóa mềm một bản ghi điểm theo ID
   * @param {string} id
   */
  deleteGradeRecord: (id) => axiosClient.delete(`/v1/gradebook/${id}`),

  /**
   * Lưu hàng loạt nhiều đầu điểm trong một lần thao tác (Bulk Save / Upsert)
   * @param {Object} data - { teachingAssignment, semester, records: Array }
   */
  bulkSaveGradeRecords: (data) => axiosClient.post('/v1/gradebook/bulk', data),

  /**
   * Lấy cấu hình hệ số điểm hiện tại
   */
  getGradeWeightConfig: () => axiosClient.get('/v1/gradebook/weights'),

  /**
   * Cập nhật cấu hình hệ số điểm
   * @param {Object} weights - { oral, '15min', regular, '45min', midterm, final }
   */
  updateGradeWeightConfig: (weights) =>
    axiosClient.put('/v1/gradebook/weights', weights),
}

export default gradebookApi

