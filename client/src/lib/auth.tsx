import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { apiRequest, getAuthToken, setAuthToken, removeAuthToken, queryClient } from "./queryClient";
import { useLocation } from "wouter";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  companyId: number | null;
  areaId: number | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  authReady: boolean;
  isAdmin: boolean;
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

    try {
      const res = await apiRequest("GET", "/api/user");
      const userData = await res.json();
      setUser(userData);
    } catch {
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
      setAuthToken(data.token);
      setUser(data.user);
      queryClient.clear();

      // Redirect to saved path or dashboard
      const redirectPath = sessionStorage.getItem("redirectAfterLogin") || "/";
      sessionStorage.removeItem("redirectAfterLogin");
      setLocation(redirectPath);
    },
    [setLocation]
  );

  const logout = useCallback(async () => {
    removeAuthToken();
    setUser(null);
    queryClient.clear();
    setLocation("/login");
  }, [setLocation]);

  const isAdmin = user?.role === "admin";

  return (
    <AuthContext.Provider
      value={{ user, isLoading, authReady, isAdmin, login, logout, refreshUser }}
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
