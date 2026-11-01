import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/useAuth'
import LoadingSpinner from '@/components/common/LoadingSpinner'

/**
 * PrivateRoute: Bảo vệ các tuyến đường yêu cầu người dùng phải đăng nhập.
 * - Nếu đang tải thông tin xác thực: hiển thị LoadingSpinner.
 * - Nếu chưa đăng nhập: chuyển hướng về trang /login kèm vị trí hiện tại trong location.state.
 * - Nếu đã đăng nhập: render children hoặc <Outlet />.
 */
export const PrivateRoute = ({ children, redirectTo = '/login' }) => {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <LoadingSpinner fullScreen />
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />
  }

  return children ? children : <Outlet />
}

export default PrivateRoute
