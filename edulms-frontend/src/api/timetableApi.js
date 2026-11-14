import axiosClient from './axiosClient'

export const timetableApi = {
  // Lấy thời khóa biểu cá nhân của tài khoản đăng nhập (Học sinh xem lớp mình, Giáo viên xem lịch dạy)
  getMySchedule: (params) => axiosClient.get('/v1/academic/timetables/my-schedule', { params }),

  // Lấy thời khóa biểu theo Lớp học
  getClassTimetable: (classId, params) =>
    axiosClient.get(`/v1/academic/timetables/class/${classId}`, { params }),

  // Lấy thời khóa biểu theo Giáo viên
  getTeacherTimetable: (teacherId, params) =>
    axiosClient.get(`/v1/academic/timetables/teacher/${teacherId}`, { params }),

  // Lấy danh sách thời khóa biểu theo bộ lọc linh hoạt
  getTimetables: (params) => axiosClient.get('/v1/academic/timetables', { params }),

  // Lấy chi tiết một tiết thời khóa biểu
  getTimetableById: (id) => axiosClient.get(`/v1/academic/timetables/${id}`),

  // Kiểm tra xung đột thời khóa biểu trước khi lưu
  checkConflict: (data) => axiosClient.post('/v1/academic/timetables/check-conflict', data),

  // Thiết lập thời khóa biểu hàng loạt cho một Lớp (Admin)
  batchCreateOrUpdate: (data) => axiosClient.post('/v1/academic/timetables/batch', data),

  // Tạo mới một tiết thời khóa biểu (Admin)
  createTimetable: (data) => axiosClient.post('/v1/academic/timetables', data),

  // Cập nhật một tiết thời khóa biểu (Admin)
  updateTimetable: (id, data) => axiosClient.put(`/v1/academic/timetables/${id}`, data),

  // Xóa một tiết thời khóa biểu (Admin)
  deleteTimetable: (id) => axiosClient.delete(`/v1/academic/timetables/${id}`),
}

export default timetableApi
