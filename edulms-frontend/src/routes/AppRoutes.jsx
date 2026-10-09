import React from 'react'
import { Routes, Route } from 'react-router-dom'
import MainLayout from '@/layouts/MainLayout'
import AuthLayout from '@/layouts/AuthLayout'
import DashboardLayout from '@/layouts/DashboardLayout'
import ProtectedRoute from '@/components/common/ProtectedRoute'

// Feature Pages
import LoginPage from '@/features/auth/LoginPage'
import RegisterPage from '@/features/auth/RegisterPage'
import AdminDashboard from '@/features/admin/AdminDashboard'
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
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* Admin Protected Dashboard */}
      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
        </Route>
      </Route>

      {/* Teacher Protected Dashboard */}
      <Route element={<ProtectedRoute allowedRoles={['teacher']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
        </Route>
      </Route>

      {/* Student Protected Dashboard */}
      <Route element={<ProtectedRoute allowedRoles={['student']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/student/dashboard" element={<StudentDashboard />} />
        </Route>
      </Route>

      {/* Parent Protected Dashboard */}
      <Route element={<ProtectedRoute allowedRoles={['parent']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/parent/dashboard" element={<ParentDashboard />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default AppRoutes
