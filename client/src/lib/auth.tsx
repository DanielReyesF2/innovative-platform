import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { useLocation } from "wouter";
import { hasPermission as checkPermission } from "@shared/auth/permissions";
import { apiRequest, getAuthToken, queryClient, removeAuthToken, setAuthToken } from "./queryClient";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  companyId: number | null;
  areaId: number | null;
  permissions?: string[];
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  authReady: boolean;
  isAdmin: boolean;
  hasPermission: (permission: string) => boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [, setLocation] = useLocation();

  const refreshUser = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      setAuthReady(true);
      return;
    }

    // Evita que una petición antigua pise el login recién hecho (token ya cambió)
    const tokenAlInicio = token;

    try {
      const res = await apiRequest("GET", "/api/auth/user");
      const userData = await res.json();
      if (getAuthToken() !== tokenAlInicio) return;
      setUser(userData);
    } catch {
      if (getAuthToken() !== tokenAlInicio) return;
      removeAuthToken();
      setUser(null);
    } finally {
      setIsLoading(false);
      setAuthReady(true);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(
    async (username: string, password: string) => {
      const res = await apiRequest("POST", "/api/auth/login", {
        username,
        password,
      });
      const data = await res.json();
      // Aplica token y usuario en el mismo ciclo antes de navegar (evita carreras con refreshUser)
      flushSync(() => {
        setAuthToken(data.token);
        setUser(data.user as User);
      });
      queryClient.clear();

      // Si el usuario intentaba acceder a una página específica, respeta esa intención.
      // Si no, lo manda a su home según su rol.
      const intendedPath = sessionStorage.getItem("redirectAfterLogin");
      sessionStorage.removeItem("redirectAfterLogin");
      const role = (data.user as User).role;
      const homeByRole =
        role === "director" || role === "operaciones" ? "/operaciones" : "/";
      setLocation(intendedPath || homeByRole);
    },
    [setLocation],
  );

  const logout = useCallback(async () => {
    removeAuthToken();
    setUser(null);
    queryClient.clear();
    setLocation("/login");
  }, [setLocation]);

  const isAdmin = user?.role === "admin";

  const hasPermission = useCallback(
    (permission: string) => checkPermission(user?.permissions, permission),
    [user],
  );

  return (
    <AuthContext.Provider
      value={{ user, isLoading, authReady, isAdmin, hasPermission, login, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
