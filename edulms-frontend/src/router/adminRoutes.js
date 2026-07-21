import AcademicStructure from "../features/admin/pages/AcademicStructure";
import UserManagement from "../features/users/UserManagement";
import Reports from "../features/admin/pages/Reports";
import Courses from "../features/admin/pages/Courses";
import Logs from "../features/admin/pages/Logs";
import Settings from "../features/admin/pages/Settings";

export const adminRoutes = [
  { index: true, element: AcademicStructure },
  { path: "academic-structure", element: AcademicStructure },
  { path: "users", element: UserManagement },
  { path: "reports", element: Reports },
  { path: "courses", element: Courses },
  { path: "logs", element: Logs },
  { path: "settings", element: Settings }
];

