import Dashboard from "../features/parent/pages/Dashboard";
import Children from "../features/parent/pages/Children";
import Reports from "../features/parent/pages/Reports";
import Chat from "../features/parent/pages/Chat";
import Notifications from "../features/parent/pages/Notifications";

export const parentRoutes = [
  { index: true, element: Dashboard },
  { path: "children", element: Children },
  { path: "reports", element: Reports },
  { path: "chat", element: Chat },
  { path: "notifications", element: Notifications }
];
