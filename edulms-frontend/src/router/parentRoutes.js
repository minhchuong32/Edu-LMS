import Children from "../features/parent/pages/Children";
import Dashboard from "../features/parent/pages/Dashboard";
import Reports from "../features/parent/pages/Reports";
import Chat from "../features/parent/pages/Chat";
import Notifications from "../features/parent/pages/Notifications";

export const parentRoutes = [
  { index: true, element: Children },
  { path: "children", element: Children },
  { path: "dashboard", element: Dashboard },
  { path: "reports", element: Reports },
  { path: "chat", element: Chat },
  { path: "notifications", element: Notifications }
];

