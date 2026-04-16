import { QueryClient, QueryFunction } from "@tanstack/react-query";

// JWT token management
export function getAuthToken(): string | null {
  try {
    return localStorage.getItem("authToken");
  } catch {
    return null;
  }
}

export function setAuthToken(token: string): void {
  localStorage.setItem("authToken", token);
}

export function removeAuthToken(): void {
  try {
    localStorage.removeItem("authToken");
  } catch {
    // Silently handle
  }
}

export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

// Throw if response is not OK
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    if (res.status === 401) {
      removeAuthToken();
      if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
        sessionStorage.setItem("redirectAfterLogin", window.location.pathname);
      }
    }

    if (res.status === 429) {
      let errorMessage = "Demasiadas solicitudes. Intenta de nuevo en unos minutos.";
      try {
        const contentType = res.headers.get("content-type");
        if (contentType?.includes("application/json")) {
          const errorData = await res.json();
          errorMessage = errorData.message || errorMessage;
        }
      } catch {
        // Use default message
      }
      throw new Error(`429: ${errorMessage}`);
    }

    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Main API request function — use this for ALL API calls
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown
): Promise<Response> {
  const headers: Record<string, string> = data
    ? { "Content-Type": "application/json" }
    : {};

  const token = getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Evita pantalla infinita de carga si el servidor no responde o hay puerto incorrecto
  const signal =
    typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
      ? AbortSignal.timeout(30_000)
      : undefined;

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
    signal,
  });

  await throwIfResNotOk(res);
  return res;
}

// Query function factory for React Query
type UnauthorizedBehavior = "returnNull" | "throw";

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey[0] as string;

    try {
      const res = await apiRequest("GET", url);

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      const contentType = res.headers.get("content-type");
      if (!contentType?.includes("application/json")) {
        throw new Error(`Expected JSON but received ${contentType}`);
      }

      return await res.json();
    } catch (error) {
      if (error instanceof Error && error.message.includes("401")) {
        if (unauthorizedBehavior === "returnNull") {
          return null;
        }
      }
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchOnWindowFocus: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: (failureCount, error) => {
        if (error instanceof Error && error.message.includes("401")) {
          return false;
        }
        return failureCount < 1;
      },
      retryDelay: 1000,
      cacheTime: 30 * 60 * 1000, // 30 minutes
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});
