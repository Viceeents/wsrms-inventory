import { Navigate, Outlet } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { Loading } from "../components/common/UI";
export default function ProtectedRoute({ admin = false, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (admin && user.role !== "admin") return <Navigate to="/" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <Outlet />;
}
