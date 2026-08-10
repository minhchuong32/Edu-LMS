import React from "react";
import RoleSidebarLayout from "./RoleSidebarLayout";
import { GraduationCap, ShieldCheck } from "lucide-react";

export default function ParentLayout() {
  const parentNavItems = [
    {
      name: "Điểm & Điểm danh của con",
      path: "/parent/children",
      icon: <GraduationCap className="w-5 h-5" />
    },
    {
      name: "Bảo mật & Mật khẩu",
      path: "/parent/security",
      icon: <ShieldCheck className="w-5 h-5" />
    }
  ];

  return <RoleSidebarLayout role="Parent" navItems={parentNavItems} />;
}

