import axiosClient from './axiosClient'

export const academicApi = {
  // --- KHỐI HỌC (GRADES) ---
  getGrades: (params) => axiosClient.get('/v1/academic/grades', { params }),
  getGradeById: (id) => axiosClient.get(`/v1/academic/grades/${id}`),
  createGrade: (data) => axiosClient.post('/v1/academic/grades', data),
  updateGrade: (id, data) => axiosClient.put(`/v1/academic/grades/${id}`, data),
  deleteGrade: (id) => axiosClient.delete(`/v1/academic/grades/${id}`),

  // --- MÔN HỌC (SUBJECTS) ---
  getSubjects: (params) => axiosClient.get('/v1/academic/subjects', { params }),
  getSubjectById: (id) => axiosClient.get(`/v1/academic/subjects/${id}`),
  createSubject: (data) => axiosClient.post('/v1/academic/subjects', data),
  updateSubject: (id, data) => axiosClient.put(`/v1/academic/subjects/${id}`, data),
  deleteSubject: (id) => axiosClient.delete(`/v1/academic/subjects/${id}`),

  // --- LỚP HỌC (CLASSES) ---
  getClasses: (params) => axiosClient.get('/v1/academic/classes', { params }),
  getClassById: (id) => axiosClient.get(`/v1/academic/classes/${id}`),
  createClass: (data) => axiosClient.post('/v1/academic/classes', data),
  updateClass: (id, data) => axiosClient.put(`/v1/academic/classes/${id}`, data),
  assignHomeroom: (id, teacherId) =>
    axiosClient.patch(`/v1/academic/classes/${id}/homeroom`, { teacherId }),
  deleteClass: (id) => axiosClient.delete(`/v1/academic/classes/${id}`),

  // --- PHÂN CÔNG GIẢNG DẠY (TEACHING ASSIGNMENTS) ---
  getAssignments: (params) => axiosClient.get('/v1/academic/assignments', { params }),
  getAssignmentById: (id) => axiosClient.get(`/v1/academic/assignments/${id}`),
  createAssignment: (data) => axiosClient.post('/v1/academic/assignments', data),
  updateAssignment: (id, data) => axiosClient.put(`/v1/academic/assignments/${id}`, data),
  deleteAssignment: (id) => axiosClient.delete(`/v1/academic/assignments/${id}`),
  checkConflict: (data) => axiosClient.post('/v1/academic/assignments/check-conflict', data),
  getTeacherSchedule: (teacherId, params) =>
    axiosClient.get(`/v1/academic/assignments/teacher/${teacherId}`, { params }),

  // --- DANH SÁCH GIÁO VIÊN ---
  getTeachers: (params) => axiosClient.get('/v1/academic/teachers', { params }),

  // --- XẾP LỚP & CHUYỂN LỚP HỌC SINH (STUDENT ASSIGNMENTS) ---
  getStudentsByClass: (classId, params) =>
    axiosClient.get(`/v1/academic/classes/${classId}/students`, { params }),
  getUnassignedStudents: (params) =>
    axiosClient.get('/v1/academic/students/unassigned', { params }),
  addStudentsToClass: (classId, data) =>
    axiosClient.post(`/v1/academic/classes/${classId}/students`, data),
  removeStudentFromClass: (classId, studentId, data) =>
    axiosClient.delete(`/v1/academic/classes/${classId}/students/${studentId}`, { data }),
  transferStudent: (data) =>
    axiosClient.post('/v1/academic/classes/transfer-student', data),
  getClassHistory: (params) =>
    axiosClient.get('/v1/academic/class-history', { params }),
  getClassHistoryByClassId: (classId, params) =>
    axiosClient.get(`/v1/academic/classes/${classId}/history`, { params }),
}

export default academicApi
