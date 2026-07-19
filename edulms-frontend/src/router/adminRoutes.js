import Dashboard from "../features/admin/pages/Dashboard";
import UserManagement from "../features/users/UserManagement";
import Courses from "../features/admin/pages/Courses";
import Logs from "../features/admin/pages/Logs";
import Settings from "../features/admin/pages/Settings";

export const adminRoutes = [
  { index: true, element: Dashboard },
  { path: "users", element: UserManagement },
  { path: "courses", element: Courses },
  { path: "logs", element: Logs },
  { path: "settings", element: Settings }
];
