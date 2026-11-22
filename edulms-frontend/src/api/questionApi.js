import axiosClient from './axiosClient'

export const questionApi = {
  /**
   * Lấy danh sách câu hỏi trong ngân hàng
   * @param {Object} params - { subject, chapter, difficulty, search, page, limit }
   */
  getQuestions: (params) => axiosClient.get('/v1/questions', { params }),

  /**
   * Lấy chi tiết một câu hỏi theo ID
   * @param {string} id
   */
  getQuestionById: (id) => axiosClient.get(`/v1/questions/${id}`),

  /**
   * Tạo câu hỏi mới trong ngân hàng
   * @param {Object} data - { subject, chapter, difficulty, content, options, correctIndex, explanation }
   */
  createQuestion: (data) => axiosClient.post('/v1/questions', data),

  /**
   * Cập nhật thông tin câu hỏi
   * @param {string} id
   * @param {Object} data
   */
  updateQuestion: (id, data) => axiosClient.put(`/v1/questions/${id}`, data),

  /**
   * Xóa câu hỏi (soft delete)
   * @param {string} id
   */
  deleteQuestion: (id) => axiosClient.delete(`/v1/questions/${id}`),

  /**
   * Lấy danh sách các chương của môn học
   * @param {string} subjectId
   */
  getChapters: (subjectId) =>
    axiosClient.get('/v1/questions/chapters', {
      params: { subject: subjectId },
    }),

  /**
   * Lấy thống kê số câu hỏi theo độ khó/chương
   * @param {string} subjectId
   */
  getSummary: (subjectId) =>
    axiosClient.get('/v1/questions/summary', {
      params: { subject: subjectId },
    }),
}

export default questionApi
