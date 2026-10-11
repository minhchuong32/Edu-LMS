/**
 * Danh sách Endpoints API của hệ thống Backend Express
 */
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
    LOGOUT: '/auth/logout',
  },
  USERS: {
    BASE: '/users',
    PROFILE: '/users/profile',
    STUDENTS: '/users/students',
    TEACHERS: '/users/teachers',
  },
  ACADEMIC: {
    CLASSES: '/academic/classes',
    SUBJECTS: '/academic/subjects',
    GRADES: '/academic/grades',
    TIMETABLE: '/academic/timetable',
  },
  GRADEBOOK: {
    BASE: '/gradebook',
    STUDENT_SCORES: '/gradebook/student',
    CLASS_SUMMARY: '/gradebook/class-summary',
  },
  ASSIGNMENTS: {
    BASE: '/assignments',
    SUBMISSIONS: '/assignments/submissions',
  },
  NOTIFICATIONS: '/notifications',
}
