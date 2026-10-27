import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/useAuth'
import LoadingSpinner from '@/components/common/LoadingSpinner'

/**
 * RoleRoute: Kiểm tra vai trò của người dùng dựa trên danh sách vai trò được phép (allowedRoles).
 * - Hỗ trợ cả 1 vai trò (chuỗi) hoặc danh sách nhiều vai trò (mảng).
 * - Nếu đang tải thông tin người dùng: hiển thị LoadingSpinner.
 * - Nếu chưa đăng nhập: chuyển hướng về /login.
 * - Nếu vai trò người dùng không thuộc danh sách cho phép: chuyển hướng về /unauthorized.
 * - Nếu hợp lệ: hiển thị children hoặc <Outlet />.
 */
export const RoleRoute = ({
  allowedRoles = [],
  children,
  redirectTo = '/unauthorized',
}) => {
  const { user, isAuthenticated, loading } = useAuth()

  if (loading) {
    return <LoadingSpinner fullScreen />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  const normalizedAllowedRoles = Array.isArray(allowedRoles)
    ? allowedRoles
    : allowedRoles
    ? [allowedRoles]
    : []

  if (
    normalizedAllowedRoles.length > 0 &&
    (!user?.role || !normalizedAllowedRoles.includes(user.role))
  ) {
    return <Navigate to={redirectTo} replace />
  }

  return children ? children : <Outlet />
}

export default RoleRoute
