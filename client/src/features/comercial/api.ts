import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

// --- Prospects ---

export function useProspects() {
  return useQuery<any[]>({
    queryKey: ["/api/comercial/prospects"],
  });
}

export function useProspect(id: number) {
  return useQuery<any>({
    queryKey: [`/api/comercial/prospects/${id}`],
    enabled: !!id,
  });
}

export function useProspectsByStage(stage: string) {
  return useQuery<any[]>({
    queryKey: [`/api/comercial/prospects/stage/${stage}`],
    enabled: !!stage,
  });
}

export function useCreateProspect() {
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/comercial/prospects", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comercial/prospects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/comercial/pipeline"] });
    },
  });
}

export function useUpdateProspect() {
  return useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await apiRequest("PATCH", `/api/comercial/prospects/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comercial/prospects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/comercial/pipeline"] });
    },
  });
}

export function useRejectProspect() {
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number; rejectionReasonId: number; rejectionDetail?: string }) => {
      const res = await apiRequest("POST", `/api/comercial/prospects/${id}/reject`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comercial/prospects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/comercial/pipeline"] });
    },
  });
}

// --- Leads ---

export function useLeads() {
  return useQuery<any[]>({
    queryKey: ["/api/comercial/leads"],
  });
}

export function useCreateLead() {
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/comercial/leads", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comercial/leads"] });
    },
  });
}

export function useAssignLead() {
  return useMutation({
    mutationFn: async ({ id, assignedToId }: { id: number; assignedToId: number }) => {
      const res = await apiRequest("PATCH", `/api/comercial/leads/${id}/assign`, { assignedToId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comercial/leads"] });
    },
  });
}

// --- Pipeline ---

export function usePipeline() {
  return useQuery<any[]>({
    queryKey: ["/api/comercial/pipeline"],
  });
}

// --- Rejection Reasons ---

export function useRejectionReasons() {
  return useQuery<any[]>({
    queryKey: ["/api/comercial/rejection-reasons"],
  });
}

// --- Sales Metrics ---

export function useSalesMetrics(period?: string) {
  return useQuery<any[]>({
    queryKey: ["/api/comercial/sales-metrics", period].filter(Boolean),
  });
}

export function useUserSalesMetrics(userId: number) {
  return useQuery<any[]>({
    queryKey: [`/api/comercial/sales-metrics/user/${userId}`],
    enabled: !!userId,
  });
}
