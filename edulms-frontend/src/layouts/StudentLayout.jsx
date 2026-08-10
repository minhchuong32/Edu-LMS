import React from "react";
import RoleSidebarLayout from "./RoleSidebarLayout";
import { Calendar, BookOpen, ClipboardList, Award, ShieldCheck } from "lucide-react";

export default function StudentLayout() {
  const studentNavItems = [
    {
      name: "Thời khóa biểu",
      path: "/student/schedule",
      icon: <Calendar className="w-5 h-5" />
    },
    {
      name: "Bài học",
      path: "/student/courses",
      icon: <BookOpen className="w-5 h-5" />
    },
    {
      name: "Bài tập",
      path: "/student/quizzes",
      icon: <ClipboardList className="w-5 h-5" />
    },
    {
      name: "Điểm",
      path: "/student/grades",
      icon: <Award className="w-5 h-5" />
    },
    {
      name: "Bảo mật & Mật khẩu",
      path: "/student/security",
      icon: <ShieldCheck className="w-5 h-5" />
    }
  ];

  return <RoleSidebarLayout role="Student" navItems={studentNavItems} />;
}

