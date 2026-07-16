import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import GuestLanding from "../features/auth/GuestLanding";
import Activate from "../features/auth/Activate";
import Login from "../features/auth/Login";

import AdminLayout from "../layouts/AdminLayout";
import TeacherLayout from "../layouts/TeacherLayout";
import StudentLayout from "../layouts/StudentLayout";
import ParentLayout from "../layouts/ParentLayout";

import PrivateRoute from "./PrivateRoute";
import RoleRoute from "./RoleRoute";

import { adminRoutes } from "./adminRoutes";
import { teacherRoutes } from "./teacherRoutes";
import { studentRoutes } from "./studentRoutes";
import { parentRoutes } from "./parentRoutes";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Landing & Authentication Routes */}
        <Route path="/" element={<GuestLanding />} />
        <Route path="/login" element={<Login />} />
        <Route path="/activate" element={<Activate />} />

        {/* Protected Session Routes */}
        <Route element={<PrivateRoute />}>

          {/* ADMIN WORKSPACE SUBROUTING */}
          <Route element={<RoleRoute allowedRoles={["admin"]} />}>
            <Route path="/admin" element={<AdminLayout />}>
              {adminRoutes.map((route, idx) => (
                route.index ? (
                  <Route key={idx} index element={<route.element />} />
                ) : (
                  <Route key={idx} path={route.path} element={<route.element />} />
                )
              ))}
            </Route>
          </Route>

          {/* TEACHER WORKSPACE SUBROUTING */}
          <Route element={<RoleRoute allowedRoles={["teacher"]} />}>
            <Route path="/teacher" element={<TeacherLayout />}>
              {teacherRoutes.map((route, idx) => (
                route.index ? (
                  <Route key={idx} index element={<route.element />} />
                ) : (
                  <Route key={idx} path={route.path} element={<route.element />} />
                )
              ))}
            </Route>
          </Route>

          {/* STUDENT WORKSPACE SUBROUTING */}
          <Route element={<RoleRoute allowedRoles={["student"]} />}>
            <Route path="/student" element={<StudentLayout />}>
              {studentRoutes.map((route, idx) => (
                route.index ? (
                  <Route key={idx} index element={<route.element />} />
                ) : (
                  <Route key={idx} path={route.path} element={<route.element />} />
                )
              ))}
            </Route>
          </Route>

          {/* PARENT WORKSPACE SUBROUTING */}
          <Route element={<RoleRoute allowedRoles={["parent"]} />}>
            <Route path="/parent" element={<ParentLayout />}>
              {parentRoutes.map((route, idx) => (
                route.index ? (
                  <Route key={idx} index element={<route.element />} />
                ) : (
                  <Route key={idx} path={route.path} element={<route.element />} />
                )
              ))}
            </Route>
          </Route>
        </Route>

        {/* Fallback Redirection */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
