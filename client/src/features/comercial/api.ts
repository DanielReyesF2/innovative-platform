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

export function useQualifyProspect() {
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number; [key: string]: any }) => {
      const res = await apiRequest("POST", `/api/comercial/prospects/${id}/qualify`, data);
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

export function useDeleteProspect() {
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/comercial/prospects/${id}`);
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

export function useConvertLead() {
  return useMutation({
    mutationFn: async ({ id, ...data }: {
      id: number;
      industry?: string;
      location?: string;
      potential?: string;
      estimatedValue?: string;
      estimatedVolume?: string;
      wasteInfo?: {
        wasteTypes: string[];
        estimatedVolume: string;
        hasCurrentProvider: boolean;
        currentProviderName?: string;
        reasonForChange?: string;
      };
    }) => {
      const res = await apiRequest("POST", `/api/comercial/leads/${id}/convert`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comercial/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/comercial/prospects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/comercial/pipeline"] });
    },
  });
}

// --- Comercial Team ---

export function useComercialTeam() {
  return useQuery<any[]>({
    queryKey: ["/api/comercial/team"],
    staleTime: 5 * 60 * 1000,
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

// --- Handoff to Operaciones ---

export function useSendToOperaciones() {
  return useMutation({
    mutationFn: async (prospectId: number) => {
      const res = await apiRequest("POST", `/api/comercial/prospects/${prospectId}/send-to-operaciones`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comercial/prospects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/comercial/pipeline"] });
    },
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

// === CRM ENHANCEMENTS ===

// --- Activities ---

export function useProspectActivities(prospectId: number) {
  return useQuery<any[]>({
    queryKey: [`/api/comercial/prospects/${prospectId}/activities`],
    enabled: !!prospectId,
  });
}

export function useCreateActivity() {
  return useMutation({
    mutationFn: async ({ prospectId, ...data }: any) => {
      const res = await apiRequest("POST", `/api/comercial/prospects/${prospectId}/activities`, data);
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/comercial/prospects/${variables.prospectId}/activities`] });
      queryClient.invalidateQueries({ queryKey: ["/api/comercial/prospects"] });
    },
  });
}

// --- Notes ---

export function useProspectNotes(prospectId: number) {
  return useQuery<any[]>({
    queryKey: [`/api/comercial/prospects/${prospectId}/notes`],
    enabled: !!prospectId,
  });
}

export function useCreateNote() {
  return useMutation({
    mutationFn: async ({ prospectId, content }: { prospectId: number; content: string }) => {
      const res = await apiRequest("POST", `/api/comercial/prospects/${prospectId}/notes`, { content });
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/comercial/prospects/${variables.prospectId}/notes`] });
      queryClient.invalidateQueries({ queryKey: [`/api/comercial/prospects/${variables.prospectId}/activities`] });
    },
  });
}

export function useUpdateNote() {
  return useMutation({
    mutationFn: async ({ prospectId, noteId, content }: { prospectId: number; noteId: number; content: string }) => {
      const res = await apiRequest("PATCH", `/api/comercial/prospects/${prospectId}/notes/${noteId}`, { content });
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/comercial/prospects/${variables.prospectId}/notes`] });
    },
  });
}

export function useDeleteNote() {
  return useMutation({
    mutationFn: async ({ prospectId, noteId }: { prospectId: number; noteId: number }) => {
      const res = await apiRequest("DELETE", `/api/comercial/prospects/${prospectId}/notes/${noteId}`);
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/comercial/prospects/${variables.prospectId}/notes`] });
    },
  });
}

export function useToggleNotePin() {
  return useMutation({
    mutationFn: async ({ prospectId, noteId }: { prospectId: number; noteId: number }) => {
      const res = await apiRequest("POST", `/api/comercial/prospects/${prospectId}/notes/${noteId}/toggle-pin`);
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/comercial/prospects/${variables.prospectId}/notes`] });
    },
  });
}

// --- Meetings ---

export function useProspectMeetings(prospectId: number) {
  return useQuery<any[]>({
    queryKey: [`/api/comercial/prospects/${prospectId}/meetings`],
    enabled: !!prospectId,
  });
}

export function useCreateMeeting() {
  return useMutation({
    mutationFn: async ({ prospectId, ...data }: any) => {
      const res = await apiRequest("POST", `/api/comercial/prospects/${prospectId}/meetings`, data);
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/comercial/prospects/${variables.prospectId}/meetings`] });
      queryClient.invalidateQueries({ queryKey: [`/api/comercial/prospects/${variables.prospectId}/activities`] });
    },
  });
}

export function useCompleteMeeting() {
  return useMutation({
    mutationFn: async ({ prospectId, meetingId, outcome }: { prospectId: number; meetingId: number; outcome: string }) => {
      const res = await apiRequest("POST", `/api/comercial/prospects/${prospectId}/meetings/${meetingId}/complete`, { outcome });
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/comercial/prospects/${variables.prospectId}/meetings`] });
    },
  });
}

export function useCancelMeeting() {
  return useMutation({
    mutationFn: async ({ prospectId, meetingId }: { prospectId: number; meetingId: number }) => {
      const res = await apiRequest("POST", `/api/comercial/prospects/${prospectId}/meetings/${meetingId}/cancel`);
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/comercial/prospects/${variables.prospectId}/meetings`] });
    },
  });
}

// --- Documents ---

export function useProspectDocuments(prospectId: number) {
  return useQuery<any[]>({
    queryKey: [`/api/comercial/prospects/${prospectId}/documents`],
    enabled: !!prospectId,
  });
}

export function useCreateDocument() {
  return useMutation({
    mutationFn: async ({ prospectId, ...data }: any) => {
      const res = await apiRequest("POST", `/api/comercial/prospects/${prospectId}/documents`, data);
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/comercial/prospects/${variables.prospectId}/documents`] });
      queryClient.invalidateQueries({ queryKey: [`/api/comercial/prospects/${variables.prospectId}/activities`] });
    },
  });
}

export function useDeleteDocument() {
  return useMutation({
    mutationFn: async ({ prospectId, docId }: { prospectId: number; docId: number }) => {
      const res = await apiRequest("DELETE", `/api/comercial/prospects/${prospectId}/documents/${docId}`);
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/comercial/prospects/${variables.prospectId}/documents`] });
    },
  });
}

// --- Proposals ---

export function useProposalVersions(prospectId: number) {
  return useQuery<any[]>({
    queryKey: [`/api/comercial/prospects/${prospectId}/proposals`],
    enabled: !!prospectId,
  });
}

export function useCreateProposal() {
  return useMutation({
    mutationFn: async ({ prospectId, ...data }: any) => {
      const res = await apiRequest("POST", `/api/comercial/prospects/${prospectId}/proposals`, data);
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/comercial/prospects/${variables.prospectId}/proposals`] });
      queryClient.invalidateQueries({ queryKey: [`/api/comercial/prospects/${variables.prospectId}/activities`] });
    },
  });
}

export function useSendProposal() {
  return useMutation({
    mutationFn: async ({ prospectId, proposalId }: { prospectId: number; proposalId: number }) => {
      const res = await apiRequest("POST", `/api/comercial/prospects/${prospectId}/proposals/${proposalId}/send`);
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/comercial/prospects/${variables.prospectId}/proposals`] });
    },
  });
}

export function useChangeProposalStatus() {
  return useMutation({
    mutationFn: async ({ prospectId, proposalId, status }: { prospectId: number; proposalId: number; status: string }) => {
      const res = await apiRequest("POST", `/api/comercial/prospects/${prospectId}/proposals/${proposalId}/status`, { status });
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/comercial/prospects/${variables.prospectId}/proposals`] });
    },
  });
}

// --- Alerts ---

export function useAlerts(status?: string) {
  return useQuery<any[]>({
    queryKey: ["/api/comercial/alerts", status].filter(Boolean),
  });
}

export function usePendingAlertsCount() {
  return useQuery<{ count: number }>({
    queryKey: ["/api/comercial/alerts/count"],
  });
}

export function useAcknowledgeAlert() {
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/comercial/alerts/${id}/acknowledge`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comercial/alerts"] });
    },
  });
}

export function useDismissAlert() {
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/comercial/alerts/${id}/dismiss`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comercial/alerts"] });
    },
  });
}

export function useGenerateAlerts() {
  return useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/comercial/alerts/generate");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comercial/alerts"] });
    },
  });
}

// --- Reports ---

export function useLeadSourcesReport() {
  return useQuery<any[]>({
    queryKey: ["/api/comercial/reports/lead-sources"],
  });
}

export function useSalesForecast() {
  return useQuery<any[]>({
    queryKey: ["/api/comercial/reports/forecast"],
  });
}

export function useWinLossAnalysis() {
  return useQuery<any>({
    queryKey: ["/api/comercial/reports/win-loss"],
  });
}

export function useCompetitorAnalysis() {
  return useQuery<any[]>({
    queryKey: ["/api/comercial/reports/competitors"],
  });
}
