import axiosClient from './axiosClient'

export const lessonApi = {
  /**
   * Lấy danh sách nội dung bài giảng chung
   * @param {Object} params - { teachingAssignment, contentType, isActive, search }
   */
  getLessons: (params) => axiosClient.get('/v1/lessons', { params }),

  /**
   * Lấy danh sách bài giảng theo Lớp học và Môn học
   * @param {Object} params - { classId, subjectId, academicYear, semester, page, limit }
   */
  getLessonsByClassAndSubject: (params) =>
    axiosClient.get('/v1/lessons/by-class-subject', { params }),

  /**
   * Lấy chi tiết một bài giảng theo ID
   * @param {string} id
   */
  getLessonById: (id) => axiosClient.get(`/v1/lessons/${id}`),

  /**
   * Tạo mới bài giảng
   * @param {Object} data - { title, description, contentType, resourceUrl, order, teachingAssignment, isActive }
   */
  createLesson: (data) => axiosClient.post('/v1/lessons', data),

  /**
   * Cập nhật thông tin bài giảng
   * @param {string} id
   * @param {Object} data - { title, description, contentType, resourceUrl, order, isActive }
   */
  updateLesson: (id, data) => axiosClient.put(`/v1/lessons/${id}`, data),

  /**
   * Xóa mềm bài giảng
   * @param {string} id
   */
  deleteLesson: (id) => axiosClient.delete(`/v1/lessons/${id}`),

  /**
   * Cập nhật thứ tự hàng loạt nhiều bài giảng sau khi kéo thả (gọi update theo order)
   * @param {Array<{ _id: string, order: number }>} orderedItems
   */
  reorderLessons: async (orderedItems) => {
    // Cập nhật song song thứ tự từng bài giảng thông qua API PUT /v1/lessons/:id
    return Promise.all(
      orderedItems.map(({ _id, order }) =>
        axiosClient.put(`/v1/lessons/${_id}`, { order })
      )
    )
  },

  /**
   * Upload tài liệu hoặc media lên Cloudinary có hỗ trợ onUploadProgress
   * @param {File} file
   * @param {Function} [onProgress] - Callback nhận số % tiến độ (0 -> 100)
   */
  uploadMedia: (file, onProgress) => {
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
}

export default lessonApi

