import { Navigate } from "react-router-dom";
import type { ReactElement } from "react";
import { getCurrentUser } from "../lib/auth";
import type { UserRole } from "../types/api";

interface ProtectedRouteProps {
  element: ReactElement;
  allowRoles?: UserRole[];
}

export function ProtectedRoute({ element, allowRoles }: ProtectedRouteProps) {
  const user = getCurrentUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowRoles && !allowRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return element;
}
