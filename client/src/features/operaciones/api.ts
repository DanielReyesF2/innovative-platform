import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

// --- Surveys ---

export function useSurveys() {
  return useQuery<any[]>({
    queryKey: ["/api/operaciones/surveys"],
  });
}

export function useSurvey(id: number) {
  return useQuery<any>({
    queryKey: [`/api/operaciones/surveys/${id}`],
    enabled: !!id,
  });
}

export function useSurveySummary() {
  return useQuery<Record<string, number>>({
    queryKey: ["/api/operaciones/surveys/summary"],
  });
}

export function useCreateSurvey() {
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/operaciones/surveys", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/operaciones/surveys"] });
    },
  });
}

export function useUpdateSurvey() {
  return useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await apiRequest("PATCH", `/api/operaciones/surveys/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/operaciones/surveys"] });
    },
  });
}

export function useCompleteSurvey() {
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/operaciones/surveys/${id}/complete`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/operaciones/surveys"] });
    },
  });
}

// --- Documents ---

export function useDocuments() {
  return useQuery<any[]>({
    queryKey: ["/api/operaciones/documents"],
  });
}

export function useDocument(id: number) {
  return useQuery<any>({
    queryKey: [`/api/operaciones/documents/${id}`],
    enabled: !!id,
  });
}

export function useExpiringDocuments(days: number = 30) {
  return useQuery<any[]>({
    queryKey: [`/api/operaciones/documents/expiring?days=${days}`],
  });
}

export function useExpiredDocuments() {
  return useQuery<any[]>({
    queryKey: ["/api/operaciones/documents/expired"],
  });
}

export function useCreateDocument() {
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/operaciones/documents", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/operaciones/documents"] });
    },
  });
}

export function useUpdateDocument() {
  return useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await apiRequest("PATCH", `/api/operaciones/documents/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/operaciones/documents"] });
    },
  });
}

export function useDeleteDocument() {
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/operaciones/documents/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/operaciones/documents"] });
    },
  });
}
