import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, getAuthToken, queryClient } from "@/lib/queryClient";

// ─── Team Dashboard ─────────────────────────────────────

interface OpsTeamMember {
  id: number;
  name: string;
  email: string;
  codigo: string | null;
  assigned: number;
  completed: number;
  total: number;
  avgResponseHours: number | null;
}

export function useOpsTeam() {
  return useQuery<OpsTeamMember[]>({
    queryKey: ["/api/operaciones/team"],
    staleTime: 60 * 1000,
  });
}

// ─── KPI Tiempo de Respuesta ────────────────────────────

export interface TiempoRespuestaRow {
  userId: number;
  userName: string;
  codigo: string | null;
  completadosEnMes: number;
  tiempoPromedioHoras: number | null;
  calificacion: number | null;
}

export interface TiempoRespuestaResponse {
  month: string;
  rows: TiempoRespuestaRow[];
}

export function useKpiTiempoRespuesta(month: string) {
  return useQuery<TiempoRespuestaResponse>({
    queryKey: [`/api/operaciones/kpi/tiempo-respuesta?month=${month}`],
    staleTime: 60 * 1000,
  });
}

// ─── Surveys ────────────────────────────────────────────

export function useSurveys() {
  return useQuery<any[]>({
    queryKey: ["/api/operaciones/surveys"],
  });
}

export function useSurvey(id: number | null) {
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
    onSuccess: (_data: any, variables: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/operaciones/surveys"] });
      queryClient.invalidateQueries({ queryKey: [`/api/operaciones/surveys/${variables.id}`] });
    },
  });
}

// ─── Section update (JSONB) ─────────────────────────────

export function useUpdateSurveySection() {
  return useMutation({
    mutationFn: async ({ surveyId, sectionName, data }: { surveyId: number; sectionName: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/operaciones/surveys/${surveyId}/section/${sectionName}`, data);
      return res.json();
    },
    onSuccess: (_data: any, variables: any) => {
      queryClient.invalidateQueries({ queryKey: [`/api/operaciones/surveys/${variables.surveyId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/operaciones/surveys/${variables.surveyId}/gate-status`] });
    },
  });
}

// ─── Gate status ────────────────────────────────────────

export function useGateStatus(surveyId: number | null, gate: string = "phase1") {
  return useQuery<any>({
    queryKey: [`/api/operaciones/surveys/${surveyId}/gate-status?gate=${gate}`],
    enabled: !!surveyId,
  });
}

// ─── Status advancement ─────────────────────────────────

export function useAdvanceSurveyStatus() {
  return useMutation({
    mutationFn: async ({ surveyId, targetStatus }: { surveyId: number; targetStatus: string }) => {
      const res = await apiRequest("POST", `/api/operaciones/surveys/${surveyId}/advance`, { targetStatus });
      return res.json();
    },
    onSuccess: (_data: any, variables: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/operaciones/surveys"] });
      queryClient.invalidateQueries({ queryKey: [`/api/operaciones/surveys/${variables.surveyId}`] });
    },
  });
}

// ─── Handoff: Pending review, Accept, Reject ────────────

export function usePendingReviewSurveys() {
  return useQuery<any[]>({
    queryKey: ["/api/operaciones/surveys/pending-review"],
  });
}

export function useAcceptSurvey() {
  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: number;
      scheduledDate: string;
      assignedToId: number;
      schedulingNotes?: string;
    }) => {
      const res = await apiRequest("POST", `/api/operaciones/surveys/${id}/accept`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/operaciones/surveys"] });
      queryClient.invalidateQueries({ queryKey: ["/api/operaciones/surveys/pending-review"] });
    },
  });
}

export function useRejectSurvey() {
  return useMutation({
    mutationFn: async ({ id, rejectionReason }: { id: number; rejectionReason: string }) => {
      const res = await apiRequest("POST", `/api/operaciones/surveys/${id}/reject`, { rejectionReason });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/operaciones/surveys"] });
      queryClient.invalidateQueries({ queryKey: ["/api/operaciones/surveys/pending-review"] });
    },
  });
}

// ─── Approval: Director reviews completed surveys ────────

export function usePendingApprovalSurveys() {
  return useQuery<any[]>({
    queryKey: ["/api/operaciones/surveys/pending-approval"],
  });
}

export function useApprovedSurveys() {
  return useQuery<any[]>({
    queryKey: ["/api/operaciones/surveys/approved"],
  });
}

export function useApproveSurvey() {
  return useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes?: string }) => {
      const res = await apiRequest("POST", `/api/operaciones/surveys/${id}/approve`, { notes });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/operaciones/surveys"] });
      queryClient.invalidateQueries({ queryKey: ["/api/operaciones/surveys/pending-approval"] });
      queryClient.invalidateQueries({ queryKey: ["/api/operaciones/surveys/approved"] });
    },
  });
}

export function useReturnSurvey() {
  return useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const res = await apiRequest("POST", `/api/operaciones/surveys/${id}/return`, { reason });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/operaciones/surveys"] });
      queryClient.invalidateQueries({ queryKey: ["/api/operaciones/surveys/pending-approval"] });
    },
  });
}

// ─── Generic sub-item CRUD hook factory ─────────────────

function createSubItemHooks(resource: string) {
  return {
    useItems: (surveyId: number | null) =>
      useQuery<any[]>({
        queryKey: [`/api/operaciones/surveys/${surveyId}/${resource}`],
        enabled: !!surveyId,
      }),

    useCreate: () =>
      useMutation({
        mutationFn: async ({ surveyId, ...data }: any) => {
          const res = await apiRequest("POST", `/api/operaciones/surveys/${surveyId}/${resource}`, data);
          return res.json();
        },
        onSuccess: (_data: any, variables: any) => {
          queryClient.invalidateQueries({ queryKey: [`/api/operaciones/surveys/${variables.surveyId}/${resource}`] });
          queryClient.invalidateQueries({ queryKey: [`/api/operaciones/surveys/${variables.surveyId}`] });
        },
      }),

    useUpdate: () =>
      useMutation({
        mutationFn: async ({ surveyId, itemId, ...data }: any) => {
          const res = await apiRequest("PATCH", `/api/operaciones/surveys/${surveyId}/${resource}/${itemId}`, data);
          return res.json();
        },
        onSuccess: (_data: any, variables: any) => {
          queryClient.invalidateQueries({ queryKey: [`/api/operaciones/surveys/${variables.surveyId}/${resource}`] });
          queryClient.invalidateQueries({ queryKey: [`/api/operaciones/surveys/${variables.surveyId}`] });
        },
      }),

    useDelete: () =>
      useMutation({
        mutationFn: async ({ surveyId, itemId }: { surveyId: number; itemId: number }) => {
          const res = await apiRequest("DELETE", `/api/operaciones/surveys/${surveyId}/${resource}/${itemId}`);
          return res.json();
        },
        onSuccess: (_data: any, variables: any) => {
          queryClient.invalidateQueries({ queryKey: [`/api/operaciones/surveys/${variables.surveyId}/${resource}`] });
          queryClient.invalidateQueries({ queryKey: [`/api/operaciones/surveys/${variables.surveyId}`] });
        },
      }),
  };
}

// ─── Photo upload (multipart) ────────────────────────────

export function useUploadPhoto() {
  return useMutation({
    mutationFn: async ({ surveyId, file, caption, section }: { surveyId: number; file: File; caption?: string; section?: string }) => {
      const formData = new FormData();
      formData.append("photo", file);
      if (caption) formData.append("caption", caption);
      formData.append("section", section || "general");

      const token = getAuthToken();
      const res = await fetch(`/api/operaciones/surveys/${surveyId}/photos/upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Error al subir foto" }));
        throw new Error(err.message || "Error al subir foto");
      }

      return res.json();
    },
    onSuccess: (_data: any, variables: any) => {
      queryClient.invalidateQueries({ queryKey: [`/api/operaciones/surveys/${variables.surveyId}/photos`] });
      queryClient.invalidateQueries({ queryKey: [`/api/operaciones/surveys/${variables.surveyId}`] });
    },
  });
}

// Sub-item hooks
export const subproductsApi = createSubItemHooks("subproducts");
export const servicesApi = createSubItemHooks("services");
export const photosApi = createSubItemHooks("photos");
export const proposalPersonnelApi = createSubItemHooks("proposal-personnel");
export const proposalEquipmentApi = createSubItemHooks("proposal-equipment");
export const proposalSuppliesApi = createSubItemHooks("proposal-supplies");
export const proposalRentalsApi = createSubItemHooks("proposal-rentals");
export const toolsApi = createSubItemHooks("tools");
export const maintenanceApi = createSubItemHooks("maintenance");
export const expensesApi = createSubItemHooks("expenses");

// ─── Master Catalog ─────────────────────────────────────

export interface CatalogItem {
  id: number;
  category: string;
  name: string;
  sortOrder: number | null;
  active: boolean | null;
}

export function useCatalog(category: string) {
  return useQuery<CatalogItem[]>({
    queryKey: [`/api/operaciones/catalog/${category}`],
    staleTime: 5 * 60 * 1000, // 5min - catálogo cambia poco
  });
}

// ─── Documents ──────────────────────────────────────────

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
