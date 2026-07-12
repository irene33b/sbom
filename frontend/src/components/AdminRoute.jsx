import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AdminRoute({ children }) {
  const { user, ready } = useAuth();

  if (!ready) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.access_level !== "admin") return <Navigate to="/dashboard" replace />;
  return children;
}
