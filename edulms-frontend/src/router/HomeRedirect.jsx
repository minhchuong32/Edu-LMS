import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function HomeRedirect() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const role = user.role.toLowerCase();

  switch (role) {
    case "admin":
      return <Navigate to="/admin" replace />;
    case "teacher":
      return <Navigate to="/teacher" replace />;
    case "parent":
      return <Navigate to="/parent" replace />;
    case "student":
    default:
      return <Navigate to="/student" replace />;
  }
}
