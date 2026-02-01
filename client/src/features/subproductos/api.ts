import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

// --- Service Clients ---

export function useServiceClients() {
  return useQuery<any[]>({
    queryKey: ["/api/subproductos/clients"],
  });
}

export function useServiceClient(id: number) {
  return useQuery<any>({
    queryKey: [`/api/subproductos/clients/${id}`],
    enabled: !!id,
  });
}

export function useCreateServiceClient() {
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/subproductos/clients", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subproductos/clients"] });
    },
  });
}

// --- Traceability ---

export function useClientTraceability(clientId: number) {
  return useQuery<any[]>({
    queryKey: [`/api/subproductos/traceability/client/${clientId}`],
    enabled: !!clientId,
  });
}

export function useClientTraceabilitySummary(clientId: number) {
  return useQuery<any>({
    queryKey: [`/api/subproductos/traceability/client/${clientId}/summary`],
    enabled: !!clientId,
  });
}

export function useCreateTraceability() {
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/subproductos/traceability", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subproductos/traceability"] });
    },
  });
}

// --- Reports ---

export function useClientReports(clientId?: number) {
  const url = clientId
    ? `/api/subproductos/reports?clientId=${clientId}`
    : "/api/subproductos/reports";
  return useQuery<any[]>({ queryKey: [url] });
}

export function usePendingReports() {
  return useQuery<any[]>({
    queryKey: ["/api/subproductos/reports/pending"],
  });
}

export function useCreateReport() {
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/subproductos/reports", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subproductos/reports"] });
    },
  });
}

export function useUpdateReportStatus() {
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/subproductos/reports/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subproductos/reports"] });
    },
  });
}

// --- Economic Models ---

export function useEconomicModels(clientId?: number) {
  const url = clientId
    ? `/api/subproductos/economic-models?clientId=${clientId}`
    : "/api/subproductos/economic-models";
  return useQuery<any[]>({ queryKey: [url] });
}

export function useEconomicModel(id: number) {
  return useQuery<any>({
    queryKey: [`/api/subproductos/economic-models/${id}`],
    enabled: !!id,
  });
}

export function useCreateEconomicModel() {
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/subproductos/economic-models", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subproductos/economic-models"] });
    },
  });
}

// --- Conciliation ---

export function useConciliations(clientId?: number) {
  const url = clientId
    ? `/api/subproductos/conciliations?clientId=${clientId}`
    : "/api/subproductos/conciliations";
  return useQuery<any[]>({ queryKey: [url] });
}

// --- Summary ---

export function useSubproductosSummary() {
  return useQuery<any>({
    queryKey: ["/api/subproductos/summary"],
  });
}
