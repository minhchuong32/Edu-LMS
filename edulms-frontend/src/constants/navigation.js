import {
  LayoutDashboard,
  Users,
  FileSpreadsheet,
  BarChart3,
  Building2,
  BookOpen,
  CheckSquare,
  GraduationCap,
  ClipboardList,
  Calendar,
  Award,
  Bell,
} from 'lucide-react'
import { ROLES } from './roles'

/**
 * Cấu hình danh mục menu tập trung theo từng vai trò (Role-Based Menu)
 * Quản trị viên, Giáo viên, Học sinh, Phụ huynh
 */
export const ROLE_NAVIGATION_MENU = {
  [ROLES.ADMIN]: [
    {
      label: 'Tổng quan hệ thống',
      path: '/admin/dashboard',
      icon: LayoutDashboard,
    },
    {
      label: 'Cơ cấu học vụ',
      path: '/admin/academic-structure',
      icon: Building2,
    },
    {
      label: 'Quản lý người dùng',
      path: '/admin/users',
      icon: Users,
    },
    {
      label: 'Import tài khoản',
      path: '/admin/import-users',
      icon: FileSpreadsheet,
    },
    {
      label: 'Báo cáo',
      path: '/admin/reports',
      icon: BarChart3,
    },
  ],
  [ROLES.TEACHER]: [
    {
      label: 'Trang tổng quan',
      path: '/teacher/dashboard',
      icon: LayoutDashboard,
    },
    {
      label: 'Lớp của tôi',
      path: '/teacher/classes',
      icon: BookOpen,
    },
    {
      label: 'Điểm danh',
      path: '/teacher/attendance',
      icon: CheckSquare,
    },
    {
      label: 'Bài tập',
      path: '/teacher/assignments',
      icon: GraduationCap,
    },
    {
      label: 'Sổ điểm',
      path: '/teacher/gradebook',
      icon: ClipboardList,
    },
  ],
  [ROLES.STUDENT]: [
    {
      label: 'Góc học tập',
      path: '/student/dashboard',
      icon: LayoutDashboard,
    },
    {
      label: 'Thời khóa biểu',
      path: '/student/timetable',
      icon: Calendar,
    },
    {
      label: 'Bài học',
      path: '/student/lessons',
      icon: BookOpen,
    },
    {
      label: 'Bài tập',
      path: '/student/assignments',
      icon: ClipboardList,
    },
    {
      label: 'Điểm',
      path: '/student/grades',
      icon: Award,
    },
  ],
  [ROLES.PARENT]: [
    {
      label: 'Tổng quan con em',
      path: '/parent/dashboard',
      icon: LayoutDashboard,
    },
    {
      label: 'Điểm và điểm danh của con',
      path: '/parent/grades',
      icon: Award,
    },
    {
      label: 'Thông báo nhà trường',
      path: '/parent/notifications',
      icon: Bell,
    },
  ],
}

/**
 * Lấy danh sách menu điều hướng theo vai trò người dùng
 * @param {string} role - Vai trò của người dùng ('admin', 'teacher', 'student', 'parent')
 * @returns {Array} Danh sách menu items
 */
export const getNavigationByRole = (role) => {
  return ROLE_NAVIGATION_MENU[role] || ROLE_NAVIGATION_MENU[ROLES.STUDENT] || []
}

export default ROLE_NAVIGATION_MENU
