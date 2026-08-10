import React from "react";
import RoleSidebarLayout from "./RoleSidebarLayout";
import { Users, BookOpen, UserCheck, FileText, Award, ShieldCheck } from "lucide-react";

export default function TeacherLayout() {
  const teacherNavItems = [
    {
      name: "Lớp của tôi",
      path: "/teacher/classes",
      icon: <Users className="w-5 h-5" />
    },
    {
      name: "Bài giảng",
      path: "/teacher/syllabus",
      icon: <BookOpen className="w-5 h-5" />
    },
    {
      name: "Điểm danh",
      path: "/teacher/attendance",
      icon: <UserCheck className="w-5 h-5" />
    },
    {
      name: "Bài tập",
      path: "/teacher/assignments",
      icon: <FileText className="w-5 h-5" />
    },
    {
      name: "Sổ điểm",
      path: "/teacher/grading",
      icon: <Award className="w-5 h-5" />
    },
    {
      name: "Bảo mật & Mật khẩu",
      path: "/teacher/security",
      icon: <ShieldCheck className="w-5 h-5" />
    }
  ];

  return <RoleSidebarLayout role="Teacher" navItems={teacherNavItems} />;
}

