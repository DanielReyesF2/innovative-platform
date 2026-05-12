import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

// --- Summary ---

export function useKpiSummary(areaId?: number) {
  const qs = areaId ? `?areaId=${areaId}` : "";
  return useQuery<any>({
    queryKey: ["/api/kpis/summary", areaId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/kpis/summary${qs}`);
      return res.json();
    },
  });
}

// --- Categories ---

export function useKpiCategories() {
  return useQuery<any[]>({
    queryKey: ["/api/kpis/categories"],
  });
}

export function useCreateKpiCategory() {
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/kpis/categories", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kpis/categories"] });
    },
  });
}

// --- KPIs ---

export function useKpis(filters?: {
  categoryId?: number;
  status?: string;
  frequency?: string;
  ownerId?: number;
  areaId?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.categoryId) params.set("categoryId", String(filters.categoryId));
  if (filters?.status) params.set("status", filters.status);
  if (filters?.frequency) params.set("frequency", filters.frequency);
  if (filters?.ownerId) params.set("ownerId", String(filters.ownerId));
  if (filters?.areaId) params.set("areaId", String(filters.areaId));
  const qs = params.toString();

  return useQuery<any[]>({
    queryKey: ["/api/kpis", qs],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/kpis${qs ? `?${qs}` : ""}`);
      return res.json();
    },
  });
}

export function useKpi(id: number) {
  return useQuery<any>({
    queryKey: [`/api/kpis/${id}`],
    enabled: !!id,
  });
}

export function useCreateKpi() {
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/kpis", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kpis"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kpis/summary"] });
    },
  });
}

export function useUpdateKpi() {
  return useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await apiRequest("PATCH", `/api/kpis/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kpis"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kpis/summary"] });
    },
  });
}

export function useArchiveKpi() {
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/kpis/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kpis"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kpis/summary"] });
    },
  });
}

// --- Entries ---

export function useKpiEntries(kpiId: number) {
  return useQuery<any[]>({
    queryKey: [`/api/kpis/${kpiId}/entries`],
    enabled: !!kpiId,
  });
}

export function useCreateKpiEntry() {
  return useMutation({
    mutationFn: async ({ kpiId, ...data }: any) => {
      const res = await apiRequest("POST", `/api/kpis/${kpiId}/entries`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kpis"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kpis/summary"] });
    },
  });
}

export function useUpdateKpiEntry() {
  return useMutation({
    mutationFn: async ({ entryId, ...data }: any) => {
      const res = await apiRequest("PATCH", `/api/kpis/entries/${entryId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kpis"] });
    },
  });
}

// --- Trend ---

export function useKpiTrend(kpiId: number) {
  return useQuery<any[]>({
    queryKey: [`/api/kpis/${kpiId}/trend`],
    enabled: !!kpiId,
  });
}

// --- Action Plans ---

export function usePendingActionPlans(areaId?: number) {
  const qs = areaId ? `?areaId=${areaId}` : "";
  return useQuery<any[]>({
    queryKey: ["/api/kpis/action-plans/pending", areaId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/kpis/action-plans/pending${qs}`);
      return res.json();
    },
  });
}

export function useKpiActionPlans(kpiId: number) {
  return useQuery<any[]>({
    queryKey: [`/api/kpis/${kpiId}/action-plans`],
    enabled: !!kpiId,
  });
}

export function useCreateActionPlan() {
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/kpis/action-plans", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kpis/action-plans/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kpis"] });
    },
  });
}

export function useUpdateActionPlan() {
  return useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await apiRequest("PATCH", `/api/kpis/action-plans/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kpis/action-plans/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kpis"] });
    },
  });
}

// --- Area by Module ---

export function useAreaByModule(slug?: string) {
  return useQuery<{ areaId: number; areaName: string } | null>({
    queryKey: ["/api/kpis/area-by-module", slug],
    queryFn: async () => {
      if (!slug) return null;
      const res = await apiRequest("GET", `/api/kpis/area-by-module/${slug}`);
      return res.json();
    },
    enabled: !!slug,
  });
}
