import { Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from '@/layouts/MainLayout'
import AuthLayout from '@/layouts/AuthLayout'
import DashboardLayout from '@/layouts/DashboardLayout'
import PrivateRoute from './PrivateRoute'
import RoleRoute from './RoleRoute'

// Feature Pages
import LoginPage from '@/features/auth/LoginPage'
import ActivatePage from '@/features/auth/ActivatePage'
import AdminDashboard from '@/features/admin/AdminDashboard'
import ImportUsersPage from '@/features/admin/ImportUsersPage'
import TeacherDashboard from '@/features/teacher/TeacherDashboard'
import StudentDashboard from '@/features/student/StudentDashboard'
import ParentDashboard from '@/features/parent/ParentDashboard'
import HomePage from '@/features/portal/HomePage'
import NewsPage from '@/features/portal/NewsPage'
import GuidePage from '@/features/portal/GuidePage'
import NotFoundPage from '@/features/portal/NotFoundPage'
import UnauthorizedPage from '@/features/portal/UnauthorizedPage'

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Portal Routes */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/portal/news" element={<NewsPage />} />
        <Route path="/portal/guides" element={<GuidePage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/activate" element={<ActivatePage />} />
        <Route path="/register" element={<Navigate to="/activate" replace />} />
      </Route>

      {/* Authenticated Routes Protected by PrivateRoute */}
      <Route element={<PrivateRoute />}>
        {/* Admin Protected Dashboard */}
        <Route element={<RoleRoute allowedRoles={['admin']} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/import-users" element={<ImportUsersPage />} />
          </Route>
        </Route>

        {/* Teacher Protected Dashboard */}
        <Route element={<RoleRoute allowedRoles={['teacher']} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
          </Route>
        </Route>

        {/* Student Protected Dashboard */}
        <Route element={<RoleRoute allowedRoles={['student']} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/student/dashboard" element={<StudentDashboard />} />
          </Route>
        </Route>

        {/* Parent Protected Dashboard */}
        <Route element={<RoleRoute allowedRoles={['parent']} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/parent/dashboard" element={<ParentDashboard />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  )
}

export const AppRouter = AppRoutes
export default AppRoutes
