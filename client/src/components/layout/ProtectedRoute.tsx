import type { ReactNode } from "react";
import { Redirect, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { AppLayout } from "./AppLayout";

interface ProtectedRouteProps {
  children: ReactNode;
  adminOnly?: boolean;
  roles?: string[];
}

export function ProtectedRoute({ children, adminOnly, roles }: ProtectedRouteProps) {
  const { user, isLoading, authReady } = useAuth();
  const [location] = useLocation();

  // Wait for auth to be ready
  if (!authReady || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    sessionStorage.setItem("redirectAfterLogin", location);
    return <Redirect to="/login" />;
  }

  // Admin check
  if (adminOnly && user.role !== "admin") {
    return <Redirect to="/" />;
  }

  // Role check
  if (roles && !roles.includes(user.role) && user.role !== "admin") {
    return <Redirect to="/" />;
  }

  return <AppLayout>{children}</AppLayout>;
}
