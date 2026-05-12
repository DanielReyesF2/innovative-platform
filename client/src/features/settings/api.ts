import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

// --- Users ---

export function useSettingsUsers(filters?: { search?: string; role?: string; isActive?: string }) {
  const params = new URLSearchParams();
  if (filters?.search) params.set("search", filters.search);
  if (filters?.role) params.set("role", filters.role);
  if (filters?.isActive) params.set("isActive", filters.isActive);
  const qs = params.toString();
  return useQuery<any[]>({
    queryKey: ["/api/settings/users", qs],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/settings/users${qs ? `?${qs}` : ""}`);
      return res.json();
    },
  });
}

export function useUserStats() {
  return useQuery<any>({
    queryKey: ["/api/settings/users/stats"],
  });
}

export function useCreateUser() {
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/settings/users", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/users/stats"] });
    },
  });
}

export function useUpdateUser() {
  return useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await apiRequest("PATCH", `/api/settings/users/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/users/stats"] });
    },
  });
}

export function useToggleUserActive() {
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/settings/users/${id}/toggle-active`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/users/stats"] });
    },
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async ({ id, newPassword }: { id: number; newPassword: string }) => {
      const res = await apiRequest("POST", `/api/settings/users/${id}/reset-password`, { newPassword });
      return res.json();
    },
  });
}

// --- Roles ---

export function useRoles() {
  return useQuery<any[]>({
    queryKey: ["/api/settings/roles"],
  });
}

export function useCreateRole() {
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/settings/roles", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/roles"] });
    },
  });
}

export function useUpdateRole() {
  return useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await apiRequest("PATCH", `/api/settings/roles/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/roles"] });
    },
  });
}

export function useDeleteRole() {
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/settings/roles/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/roles"] });
    },
  });
}

// --- Areas ---

export function useAreas() {
  return useQuery<any[]>({
    queryKey: ["/api/settings/areas"],
  });
}

export function useCreateArea() {
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/settings/areas", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/areas"] });
    },
  });
}

export function useUpdateArea() {
  return useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await apiRequest("PATCH", `/api/settings/areas/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/areas"] });
    },
  });
}

export function useDeleteArea() {
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/settings/areas/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/areas"] });
    },
  });
}

// --- Company ---

export function useCompany() {
  return useQuery<any>({
    queryKey: ["/api/settings/company"],
  });
}

export function useUpdateCompany() {
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", "/api/settings/company", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/company"] });
    },
  });
}

export function useUpdateCompanySettings() {
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", "/api/settings/company/settings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/company"] });
    },
  });
}

// --- Modules ---

export function useModules() {
  return useQuery<any[]>({
    queryKey: ["/api/modules"],
  });
}

export function useModuleConfig(moduleName: string) {
  return useQuery<any[]>({
    queryKey: [`/api/settings/modules/${moduleName}/config`],
    enabled: !!moduleName,
  });
}

export function useUpsertModuleConfig() {
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PUT", "/api/settings/modules/config", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/modules"] });
    },
  });
}

// --- Audit Log ---

export function useAuditLog(entityType?: string) {
  const qs = entityType ? `?entityType=${entityType}` : "";
  return useQuery<any[]>({
    queryKey: ["/api/settings/audit-log", entityType].filter(Boolean),
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/settings/audit-log${qs}`);
      return res.json();
    },
  });
}
