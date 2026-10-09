/**
 * Định nghĩa vai trò người dùng trong hệ thống EduLMS (RBAC)
 */
export const ROLES = {
  ADMIN: 'admin',
  TEACHER: 'teacher',
  STUDENT: 'student',
  PARENT: 'parent',
}

/**
 * Tên hiển thị tiếng Việt tương ứng với từng vai trò
 */
export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Quản trị viên',
  [ROLES.TEACHER]: 'Giáo viên',
  [ROLES.STUDENT]: 'Học sinh',
  [ROLES.PARENT]: 'Phụ huynh',
}

/**
 * Mã màu Badge giao diện cho từng vai trò
 */
export const ROLE_BADGE_CLASSES = {
  [ROLES.ADMIN]: 'bg-red-100 text-red-700 border-red-200',
  [ROLES.TEACHER]: 'bg-blue-100 text-blue-700 border-blue-200',
  [ROLES.STUDENT]: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  [ROLES.PARENT]: 'bg-amber-100 text-amber-700 border-amber-200',
}
