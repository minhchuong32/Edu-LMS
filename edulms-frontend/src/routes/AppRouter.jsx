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
import Card from "../components/common/Card";
import Badge from "../components/common/Badge";
import Button from "../components/common/Button";

// Styled placeholder component for workspace sub-views
const PagePlaceholder = ({ title, desc, icon, badgeText, badgeRole }) => (
  <div className="max-w-xl mx-auto mt-10">
    <Card className="text-center p-8 space-y-5">
      <div className="w-16 h-16 bg-primary-light text-primary rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm">
        {icon}
      </div>
      <div>
        <h3 className="font-sans font-bold text-xl text-neutral-900 mb-1">{title}</h3>
        <p className="text-sm text-neutral-600 leading-relaxed mb-4">{desc}</p>
        <Badge role={badgeRole}>{badgeText}</Badge>
      </div>
      <div className="pt-2">
        <Button variant="outline" className="mx-auto" onClick={() => window.history.back()}>
          Go Back
        </Button>
      </div>
    </Card>
  </div>
);

// Admin Pages Placeholders
const AdminDashboard = () => (
  <PagePlaceholder
    title="Admin System Control"
    desc="Global overview of student registration counts, server CPU loads, database health replica logs, and configuration matrices."
    badgeText="Administrator Active"
    badgeRole="Admin"
    icon={
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
      </svg>
    }
  />
);

const AdminUsers = () => (
  <PagePlaceholder
    title="User Management Desk"
    desc="Create, search, filter, adjust role badges, and deactivate student, instructor, parent, and support system accounts."
    badgeText="Security Admin"
    badgeRole="Admin"
    icon={
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    }
  />
);

const AdminCourses = () => (
  <PagePlaceholder
    title="Course Curriculum Manager"
    desc="Approve new syllabus designs, create departments, allocate teachers to subject categories, and view overall statistics."
    badgeText="Curriculum Settings"
    badgeRole="Admin"
    icon={
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    }
  />
);

const AdminLogs = () => (
  <PagePlaceholder
    title="System Activity & Auth Logs"
    desc="Live logs tracking token generations, security assertions, database updates, background docker triggers, and system sync errors."
    badgeText="Server Audit"
    badgeRole="Admin"
    icon={
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    }
  />
);

const AdminSettings = () => (
  <PagePlaceholder
    title="Global Configuration Suite"
    desc="Setup global portals, security backup schedules, auth timeouts, SMTP credentials, and third-party Cloudinary attachments."
    badgeText="System Master"
    badgeRole="Admin"
    icon={
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      </svg>
    }
  />
);

// Teacher Pages Placeholders
const TeacherDashboard = () => (
  <PagePlaceholder
    title="Instructor Panel Hub"
    desc="Summary of classroom performance graphs, grading tasks waiting for feedback, and syllabus progression timelines."
    badgeText="Instructor Active"
    badgeRole="Teacher"
    icon={
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    }
  />
);

const TeacherClasses = () => (
  <PagePlaceholder
    title="My Active Classrooms"
    desc="Manage classroom lists, student directories, lecture materials, schedule live events, and configure attendance sheets."
    badgeText="Classroom Admin"
    badgeRole="Teacher"
    icon={
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 4a2 2 0 00-2-2m2 2a2 2 0 110 4m0 0a2 2 0 01-2-2m2 2v7a2 2 0 01-2 2H9" />
      </svg>
    }
  />
);

const TeacherSyllabus = () => (
  <PagePlaceholder
    title="Syllabus & Lesson Planner"
    desc="Define subject milestones, upload lesson assets, embed quiz tests, structure final tasks, and publish lecture calendars."
    badgeText="Curriculum Designer"
    badgeRole="Teacher"
    icon={
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    }
  />
);

const TeacherGrading = () => (
  <PagePlaceholder
    title="Grading & Evaluation Desk"
    desc="Examine essay submissions, review student code files, grade quiz scores, write feedback, and lock class grades."
    badgeText="Gradebook Master"
    badgeRole="Teacher"
    icon={
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    }
  />
);

const TeacherAssignments = () => (
  <PagePlaceholder
    title="Assignments & Quizzes Feed"
    desc="Configure quiz constraints (time limits, retake criteria), compose examination papers, and post homework details."
    badgeText="Exam Controller"
    badgeRole="Teacher"
    icon={
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    }
  />
);

// Student Pages Placeholders
const StudentDashboard = () => (
  <PagePlaceholder
    title="Student Learning Space"
    desc="Track study progress metrics, view homework feedback, read teacher notifications, and join live online classes."
    badgeText="Student Active"
    badgeRole="Student"
    icon={
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
      </svg>
    }
  />
);

const StudentCourses = () => (
  <PagePlaceholder
    title="My Enrolled Classrooms"
    desc="Browse lecture recordings, download study notes, check upcoming course tasks, and ask teacher questions."
    badgeText="Classmate Workspace"
    badgeRole="Student"
    icon={
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    }
  />
);

const StudentQuizzes = () => (
  <PagePlaceholder
    title="Active Quiz Board"
    desc="Start ongoing online tests, check score sheets, verify correct solutions, and track exam deadlines."
    badgeText="Exam Center"
    badgeRole="Student"
    icon={
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" />
      </svg>
    }
  />
);

const StudentGrades = () => (
  <PagePlaceholder
    title="My Gradebook Summary"
    desc="View detailed score distributions, monitor final class ratings, read teacher grading feedback reports, and review transcripts."
    badgeText="Academic Scores"
    badgeRole="Student"
    icon={
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    }
  />
);

const StudentSchedule = () => (
  <PagePlaceholder
    title="Calendar & Class Schedule"
    desc="Track classroom hours, calendar schedules, project deadlines, holiday closures, and special events schedules."
    badgeText="Personal Planner"
    badgeRole="Student"
    icon={
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    }
  />
);

// Parent Pages Placeholders
const ParentDashboard = () => (
  <PagePlaceholder
    title="Parent Overview Panel"
    desc="Follow children study timelines, view grade charts, receive school announcements, and view teacher response logs."
    badgeText="Parent Profile"
    badgeRole="Parent"
    icon={
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    }
  />
);

const ParentChildren = () => (
  <PagePlaceholder
    title="Children Academic Profiles"
    desc="Check enrollment files, active classes databases, study status reports, and classroom advisor contacts."
    badgeText="Family Admin"
    badgeRole="Parent"
    icon={
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    }
  />
);

const ParentReports = () => (
  <PagePlaceholder
    title="Academic Performance Reports"
    desc="Examine semester report cards, monitor children attendance charts, review quiz answers, and check teacher reviews."
    badgeText="Performance Audit"
    badgeRole="Parent"
    icon={
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    }
  />
);

const ParentChat = () => (
  <PagePlaceholder
    title="Teacher Contact Channels"
    desc="Open text chat with course teachers, set parent-teacher appointments, and discuss children learning status reports."
    badgeText="Teacher Messenger"
    badgeRole="Parent"
    icon={
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    }
  />
);

const ParentNotifications = () => (
  <PagePlaceholder
    title="School Announcement Notifications"
    desc="Track important school newsletters, exam timetables, fee payments requests, and campus event schedules."
    badgeText="Campus Bulletins"
    badgeRole="Parent"
    icon={
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    }
  />
);

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
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="courses" element={<AdminCourses />} />
              <Route path="logs" element={<AdminLogs />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>
          </Route>

          {/* TEACHER WORKSPACE SUBROUTING */}
          <Route element={<RoleRoute allowedRoles={["teacher"]} />}>
            <Route path="/teacher" element={<TeacherLayout />}>
              <Route index element={<TeacherDashboard />} />
              <Route path="classes" element={<TeacherClasses />} />
              <Route path="syllabus" element={<TeacherSyllabus />} />
              <Route path="grading" element={<TeacherGrading />} />
              <Route path="assignments" element={<TeacherAssignments />} />
            </Route>
          </Route>

          {/* STUDENT WORKSPACE SUBROUTING */}
          <Route element={<RoleRoute allowedRoles={["student"]} />}>
            <Route path="/student" element={<StudentLayout />}>
              <Route index element={<StudentDashboard />} />
              <Route path="courses" element={<StudentCourses />} />
              <Route path="quizzes" element={<StudentQuizzes />} />
              <Route path="grades" element={<StudentGrades />} />
              <Route path="schedule" element={<StudentSchedule />} />
            </Route>
          </Route>

          {/* PARENT WORKSPACE SUBROUTING */}
          <Route element={<RoleRoute allowedRoles={["parent"]} />}>
            <Route path="/parent" element={<ParentLayout />}>
              <Route index element={<ParentDashboard />} />
              <Route path="children" element={<ParentChildren />} />
              <Route path="reports" element={<ParentReports />} />
              <Route path="chat" element={<ParentChat />} />
              <Route path="notifications" element={<ParentNotifications />} />
            </Route>
          </Route>
        </Route>

        {/* Fallback Redirection */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
