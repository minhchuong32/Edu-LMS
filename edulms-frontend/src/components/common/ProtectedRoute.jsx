import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/useAuth'
import LoadingSpinner from './LoadingSpinner'

/**
 * ProtectedRoute: Kết hợp kiểm tra trạng thái đăng nhập và kiểm tra vai trò.
 */
export const ProtectedRoute = ({
  allowedRoles = [],
  children,
  redirectTo = '/unauthorized',
}) => {
  const { user, isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <LoadingSpinner fullScreen />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
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

export default ProtectedRoute
