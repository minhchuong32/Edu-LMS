import React from "react";
import RoleSidebarLayout from "./RoleSidebarLayout";
import { Building2, Users, BarChart3 } from "lucide-react";

export default function AdminLayout() {
  const adminNavItems = [
    {
      name: "Cơ cấu học vụ",
      path: "/admin/academic-structure",
      icon: <Building2 className="w-5 h-5" />
    },
    {
      name: "Người dùng",
      path: "/admin/users",
      icon: <Users className="w-5 h-5" />
    },
    {
      name: "Báo cáo",
      path: "/admin/reports",
      icon: <BarChart3 className="w-5 h-5" />
    }
  ];

  return <RoleSidebarLayout role="Admin" navItems={adminNavItems} />;
}

