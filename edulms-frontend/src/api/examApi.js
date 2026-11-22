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
   * Học sinh nộp bài kiểm tra & Hệ thống tự động chấm điểm tại Backend
   * @param {string} id - examId
   * @param {Object} data - { answers: [{ questionId, selectedOption }], durationSpent, startedAt }
   */
  submitExam: (id, data) => axiosClient.post(`/v1/exams/${id}/submit`, data),

  /**
   * Xem kết quả chi tiết bài làm (kèm đáp án đúng sau khi đã nộp)
   * @param {string} id - examId
   * @param {Object} params - { studentId } (dành cho giáo viên/admin)
   */
  getExamResult: (id, params) =>
    axiosClient.get(`/v1/exams/${id}/result`, { params }),

  /**
   * Giáo viên / Quản trị viên xem toàn bộ danh sách kết quả bài làm của cả lớp
   * @param {string} id - examId
   */
  getExamAttempts: (id) => axiosClient.get(`/v1/exams/${id}/attempts`),

  /**
   * Lấy server time để đồng bộ đồng hồ đếm ngược (tránh học sinh chỉnh giờ máy)
   */
  getServerTime: () => axiosClient.get('/v1/exams/server-time'),

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
