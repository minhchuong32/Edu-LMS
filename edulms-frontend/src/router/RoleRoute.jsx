import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Badge from "../components/common/Badge";

/**
 * Route wrapper for role-based access control (RBAC).
 * @param {Array<string>|string} allowedRoles Single role string or array of allowed role strings
 * @param {React.ReactNode} [children] Optional children to render instead of Outlet
 */
export default function RoleRoute({ allowedRoles = [], children }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  const userRole = user?.role?.toLowerCase();
  const isAuthorized = user && rolesArray.some((r) => r.toLowerCase() === userRole);

  if (!isAuthorized) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-neutral-50 min-h-[80vh]">
        <Card className="max-w-md w-full text-center space-y-5 p-8 border-danger/20 shadow-lg shadow-danger/5">
          <div className="w-16 h-16 bg-rose-50 text-danger rounded-full flex items-center justify-center mx-auto mb-2 ring-8 ring-rose-50/50">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h3 className="font-sans font-extrabold text-xl text-neutral-900 mb-1">Access Denied</h3>
            <p className="text-sm text-neutral-600 leading-relaxed mb-4">
              Your profile role (<span className="font-bold uppercase text-neutral-900">{user?.role || "UNKNOWN"}</span>) does not have privileges to view this section.
            </p>
            <div className="flex justify-center gap-2">
              <Badge variant="danger">Restricted Area</Badge>
            </div>
          </div>
          <div className="pt-2 flex justify-center">
            <Button variant="primary" className="text-xs px-5" onClick={() => navigate("/")}>
              Return to Portal Home
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return children ? children : <Outlet />;
}
