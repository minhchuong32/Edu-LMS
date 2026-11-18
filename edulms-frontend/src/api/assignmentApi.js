import axiosClient from './axiosClient'

export const assignmentApi = {
  /**
   * Lấy danh sách bài tập
   * @param {Object} params - { teachingAssignment, status, isActive, search }
   */
  getAssignments: (params) => axiosClient.get('/v1/assignments', { params }),

  /**
   * Lấy danh sách bài tập theo Lớp học và Môn học
   * @param {Object} params - { classId, subjectId, academicYear, semester, status }
   */
  getAssignmentsByClassAndSubject: (params) =>
    axiosClient.get('/v1/assignments/by-class-subject', { params }),

  /**
   * Lấy chi tiết một bài tập theo ID
   * @param {string} id
   */
  getAssignmentById: (id) => axiosClient.get(`/v1/assignments/${id}`),

  /**
   * Tạo mới bài tập
   * @param {Object} data - { teachingAssignment, title, description, dueDate, attachmentUrl, attachments, status }
   */
  createAssignment: (data) => axiosClient.post('/v1/assignments', data),

  /**
   * Cập nhật thông tin bài tập
   * @param {string} id
   * @param {Object} data
   */
  updateAssignment: (id, data) => axiosClient.put(`/v1/assignments/${id}`, data),

  /**
   * Xóa mềm bài tập
   * @param {string} id
   */
  deleteAssignment: (id) => axiosClient.delete(`/v1/assignments/${id}`),

  /**
   * Cập nhật hoặc đảo trạng thái Mở / Khóa nhận bài ('open' | 'locked')
   * @param {string} id
   * @param {string} [status] - 'open' | 'locked'
   */
  updateAssignmentStatus: (id, status) =>
    axiosClient.patch(
      `/v1/assignments/${id}/status`,
      status ? { status } : {}
    ),

  /**
   * Khóa nhận bài tập (status = 'locked')
   * @param {string} id
   */
  lockAssignment: (id) => axiosClient.patch(`/v1/assignments/${id}/lock`),

  /**
   * Mở nhận bài tập (status = 'open')
   * @param {string} id
   */
  openAssignment: (id) => axiosClient.patch(`/v1/assignments/${id}/open`),

  /**
   * Upload file đề bài lên Cloudinary có hỗ trợ tiến trình %
   * @param {File} file
   * @param {Function} [onProgress]
   */
  uploadAttachment: (file, onProgress) => {
    const formData = new FormData()
    formData.append('file', file)
    return axiosClient.post('/v1/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          )
          onProgress(percentCompleted)
        }
      },
    })
  },

  /**
   * Xóa file đề bài đã tải lên trên Cloudinary
   * @param {{ publicId?: string, url?: string, resourceType?: string }} payload
   */
  deleteUploadedFile: (payload) =>
    axiosClient.post('/v1/upload/delete', payload),

  /**
   * Học sinh nộp bài tập (hoặc nộp lại khi bài tập đang mở)
   * @param {{ assignment: string, fileUrl: string, attachments?: Array, note?: string }} data
   */
  submitAssignment: (data) => axiosClient.post('/v1/submissions', data),

  /**
   * Lấy thông tin bài nộp của học sinh hiện tại cho một bài tập
   * @param {string} assignmentId
   */
  getMySubmission: (assignmentId) =>
    axiosClient.get(`/v1/submissions/my/${assignmentId}`),

  /**
   * Lấy danh sách bài nộp theo bài tập (dành cho Giáo viên phụ trách)
   * @param {string} assignmentId
   * @param {Object} [params] - { isLate, student }
   */
  getSubmissionsByAssignment: (assignmentId, params) =>
    axiosClient.get(`/v1/submissions/assignment/${assignmentId}`, { params }),

  /**
   * Giáo viên chấm điểm và nhận xét bài nộp
   * @param {string} submissionId
   * @param {{ score: number, feedback?: string }} data
   */
  gradeSubmission: (submissionId, data) =>
    axiosClient.patch(`/v1/submissions/${submissionId}/grade`, data),
}

export default assignmentApi

