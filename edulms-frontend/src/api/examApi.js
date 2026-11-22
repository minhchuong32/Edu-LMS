import axiosClient from './axiosClient'

export const examApi = {
  /**
   * Lấy danh sách đề kiểm tra
   * @param {Object} params - { teachingAssignment, status, search, page, limit }
   */
  getExams: (params) => axiosClient.get('/v1/exams', { params }),

  /**
   * Lấy chi tiết đề kiểm tra theo ID (học sinh không nhận correctIndex)
   * @param {string} id
   */
  getExamById: (id) => axiosClient.get(`/v1/exams/${id}`),

  /**
   * Tạo đề kiểm tra thủ công từ danh sách questionIds
   * @param {Object} data - { teachingAssignment, title, description, duration, questionIds, scoreWeight }
   */
  createManualExam: (data) => axiosClient.post('/v1/exams/manual', data),

  /**
   * Tạo đề kiểm tra ngẫu nhiên theo tiêu chí
   * @param {Object} data - { teachingAssignment, title, description, duration, scoreWeight, totalQuestions, chapter, difficulty, criteria }
   */
  createRandomExam: (data) => axiosClient.post('/v1/exams/random', data),

  /**
   * Xem trước danh sách câu hỏi ngẫu nhiên sinh ra theo tiêu chí
   * @param {Object} data - { teachingAssignment, totalQuestions, chapter, difficulty, criteria }
   */
  previewRandom: (data) => axiosClient.post('/v1/exams/preview-random', data),

  /**
   * Cập nhật thông tin đề kiểm tra (chỉ sửa câu hỏi khi chưa publish)
   * @param {string} id
   * @param {Object} data
   */
  updateExam: (id, data) => axiosClient.put(`/v1/exams/${id}`, data),

  /**
   * Phát hành đề kiểm tra cho học sinh trong lớp
   * @param {string} id
   */
  publishExam: (id) => axiosClient.patch(`/v1/exams/${id}/publish`),

  /**
   * Xóa mềm đề kiểm tra
   * @param {string} id
   */
  deleteExam: (id) => axiosClient.delete(`/v1/exams/${id}`),
}

export default examApi
