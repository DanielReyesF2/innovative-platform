import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, invalidateByPrefix } from "@/lib/queryClient";
import type { ApiProspect } from "@/lib/comercial-constants";
import type {
  Lead,
  RejectionReason,
  SalesMetrics,
  PipelineSnapshot,
  ProspectActivity,
  ProspectNote,
  ProspectMeeting,
  ProspectDocument,
  ProposalVersion,
  FollowUpAlert,
  ComercialWeeklyReport,
} from "@shared/schema/comercial";

// --- Prospects ---

export function useProspects() {
  return useQuery<ApiProspect[]>({
    queryKey: ["/api/comercial/prospects"],
  });
}

export function useProspect(id: number) {
  return useQuery<ApiProspect>({
    queryKey: [`/api/comercial/prospects/${id}`],
    enabled: !!id,
  });
}

export function useProspectsByStage(stage: string) {
  return useQuery<ApiProspect[]>({
    queryKey: [`/api/comercial/prospects/stage/${stage}`],
    enabled: !!stage,
  });
}

// Any prospect mutation can change team-level aggregates (closed-deal totals,
// cumplimiento %, greeting, KPI cards) because getComercialTeam derives them
// from the prospect list. Always invalidate the same family of queries so the
// UI refreshes in lock-step.
function invalidateProspectAggregates() {
  invalidateByPrefix("/api/comercial/prospects");
  invalidateByPrefix("/api/comercial/pipeline");
  invalidateByPrefix("/api/comercial/team");
  invalidateByPrefix("/api/comercial/ventas-reales");
}

export function useCreateProspect() {
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", "/api/comercial/prospects", data);
      return res.json();
    },
    onSuccess: invalidateProspectAggregates,
  });
}

export function useQualifyProspect() {
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number; [key: string]: unknown }) => {
      const res = await apiRequest("POST", `/api/comercial/prospects/${id}/qualify`, data);
      return res.json();
    },
    onSuccess: invalidateProspectAggregates,
  });
}

export function useUpdateProspect() {
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number; [key: string]: unknown }) => {
      const res = await apiRequest("PATCH", `/api/comercial/prospects/${id}`, data);
      return res.json();
    },
    onSuccess: invalidateProspectAggregates,
  });
}

export function useDeleteProspect() {
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/comercial/prospects/${id}`);
      return res.json();
    },
    onSuccess: invalidateProspectAggregates,
  });
}

export function useRejectProspect() {
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number; rejectionReasonId: number; rejectionDetail?: string }) => {
      const res = await apiRequest("POST", `/api/comercial/prospects/${id}/reject`, data);
      return res.json();
    },
    onSuccess: invalidateProspectAggregates,
  });
}

// --- Leads ---

export function useLeads() {
  return useQuery<Lead[]>({
    queryKey: ["/api/comercial/leads"],
  });
}

export function useCreateLead() {
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", "/api/comercial/leads", data);
      return res.json();
    },
    onSuccess: () => {
      invalidateByPrefix("/api/comercial/leads");
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
      invalidateByPrefix("/api/comercial/leads");
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
      invalidateByPrefix("/api/comercial/leads");
      invalidateByPrefix("/api/comercial/prospects");
      invalidateByPrefix("/api/comercial/pipeline");
    },
  });
}

// --- Comercial Team ---

interface ApiTeamMember {
  id: number;
  codigo: string | null;
  name: string;
  email: string;
  role: string;
  presupuestoMensual: number;
  presupuestoAnual: number;
  presupuestosMensuales: Record<string, number>;
  ventasReales: number;
}

export function useComercialTeam() {
  return useQuery<ApiTeamMember[]>({
    queryKey: ["/api/comercial/team"],
    staleTime: 5 * 60 * 1000,
  });
}

// --- Pipeline ---

export function usePipeline() {
  return useQuery<PipelineSnapshot[]>({
    queryKey: ["/api/comercial/pipeline"],
  });
}

// --- Rejection Reasons ---

export function useRejectionReasons() {
  return useQuery<RejectionReason[]>({
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
      invalidateByPrefix("/api/comercial/prospects");
      invalidateByPrefix("/api/comercial/pipeline");
    },
  });
}

// --- Sales Metrics ---

export function useSalesMetrics(period?: string) {
  return useQuery<SalesMetrics[]>({
    queryKey: ["/api/comercial/sales-metrics", period].filter(Boolean),
  });
}

export function useUserSalesMetrics(userId: number) {
  return useQuery<SalesMetrics[]>({
    queryKey: [`/api/comercial/sales-metrics/user/${userId}`],
    enabled: !!userId,
  });
}

// === CRM ENHANCEMENTS ===

// --- Activities ---

export function useProspectActivities(prospectId: number) {
  return useQuery<ProspectActivity[]>({
    queryKey: [`/api/comercial/prospects/${prospectId}/activities`],
    enabled: !!prospectId,
  });
}

export function useCreateActivity() {
  return useMutation({
    mutationFn: async ({ prospectId, ...data }: { prospectId: number; [key: string]: unknown }) => {
      const res = await apiRequest("POST", `/api/comercial/prospects/${prospectId}/activities`, data);
      return res.json();
    },
    onSuccess: () => {
      invalidateByPrefix("/api/comercial/prospects");
    },
  });
}

// --- Notes ---

export function useProspectNotes(prospectId: number) {
  return useQuery<ProspectNote[]>({
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
    onSuccess: () => {
      invalidateByPrefix("/api/comercial/prospects");
    },
  });
}

export function useUpdateNote() {
  return useMutation({
    mutationFn: async ({ prospectId, noteId, content }: { prospectId: number; noteId: number; content: string }) => {
      const res = await apiRequest("PATCH", `/api/comercial/prospects/${prospectId}/notes/${noteId}`, { content });
      return res.json();
    },
    onSuccess: () => {
      invalidateByPrefix("/api/comercial/prospects");
    },
  });
}

export function useDeleteNote() {
  return useMutation({
    mutationFn: async ({ prospectId, noteId }: { prospectId: number; noteId: number }) => {
      const res = await apiRequest("DELETE", `/api/comercial/prospects/${prospectId}/notes/${noteId}`);
      return res.json();
    },
    onSuccess: () => {
      invalidateByPrefix("/api/comercial/prospects");
    },
  });
}

export function useToggleNotePin() {
  return useMutation({
    mutationFn: async ({ prospectId, noteId }: { prospectId: number; noteId: number }) => {
      const res = await apiRequest("POST", `/api/comercial/prospects/${prospectId}/notes/${noteId}/toggle-pin`);
      return res.json();
    },
    onSuccess: () => {
      invalidateByPrefix("/api/comercial/prospects");
    },
  });
}

// --- Meetings ---

export function useProspectMeetings(prospectId: number) {
  return useQuery<ProspectMeeting[]>({
    queryKey: [`/api/comercial/prospects/${prospectId}/meetings`],
    enabled: !!prospectId,
  });
}

export function useCreateMeeting() {
  return useMutation({
    mutationFn: async ({ prospectId, ...data }: { prospectId: number; title: string; scheduledAt: string; location?: string; [key: string]: unknown }) => {
      const res = await apiRequest("POST", `/api/comercial/prospects/${prospectId}/meetings`, data);
      return res.json();
    },
    onSuccess: () => {
      invalidateByPrefix("/api/comercial/prospects");
    },
  });
}

export function useCompleteMeeting() {
  return useMutation({
    mutationFn: async ({ prospectId, meetingId, outcome }: { prospectId: number; meetingId: number; outcome: string }) => {
      const res = await apiRequest("POST", `/api/comercial/prospects/${prospectId}/meetings/${meetingId}/complete`, { outcome });
      return res.json();
    },
    onSuccess: () => {
      invalidateByPrefix("/api/comercial/prospects");
    },
  });
}

export function useCancelMeeting() {
  return useMutation({
    mutationFn: async ({ prospectId, meetingId }: { prospectId: number; meetingId: number }) => {
      const res = await apiRequest("POST", `/api/comercial/prospects/${prospectId}/meetings/${meetingId}/cancel`);
      return res.json();
    },
    onSuccess: () => {
      invalidateByPrefix("/api/comercial/prospects");
    },
  });
}

interface UpdateMeetingPayload {
  prospectId: number;
  meetingId: number;
  title?: string;
  description?: string | null;
  scheduledAt?: string;
  duration?: number;
  location?: string | null;
  meetingUrl?: string | null;
  // Fase 2 bloque 1 — campos de Reunión del spec de Vero.
  meetingType?: "virtual" | "presencial" | null;
  objective?: string | null;
  attendees?: unknown;
}

export function useUpdateMeeting() {
  return useMutation({
    mutationFn: async ({ prospectId, meetingId, ...data }: UpdateMeetingPayload) => {
      const res = await apiRequest("PATCH", `/api/comercial/prospects/${prospectId}/meetings/${meetingId}`, data);
      return res.json();
    },
    onSuccess: () => {
      invalidateByPrefix("/api/comercial/prospects");
    },
  });
}

export function useDeleteMeeting() {
  return useMutation({
    mutationFn: async ({ prospectId, meetingId }: { prospectId: number; meetingId: number }) => {
      const res = await apiRequest("DELETE", `/api/comercial/prospects/${prospectId}/meetings/${meetingId}`);
      return res.json();
    },
    onSuccess: () => {
      invalidateByPrefix("/api/comercial/prospects");
    },
  });
}

// --- Documents ---

export function useProspectDocuments(prospectId: number) {
  return useQuery<ProspectDocument[]>({
    queryKey: [`/api/comercial/prospects/${prospectId}/documents`],
    enabled: !!prospectId,
  });
}

export function useCreateDocument() {
  return useMutation({
    mutationFn: async ({ prospectId, ...data }: { prospectId: number; name: string; type: string; url?: string; [key: string]: unknown }) => {
      const res = await apiRequest("POST", `/api/comercial/prospects/${prospectId}/documents`, data);
      return res.json();
    },
    onSuccess: () => {
      invalidateByPrefix("/api/comercial/prospects");
    },
  });
}

export function useDeleteDocument() {
  return useMutation({
    mutationFn: async ({ prospectId, docId }: { prospectId: number; docId: number }) => {
      const res = await apiRequest("DELETE", `/api/comercial/prospects/${prospectId}/documents/${docId}`);
      return res.json();
    },
    onSuccess: () => {
      invalidateByPrefix("/api/comercial/prospects");
    },
  });
}

// --- Proposals ---

export function useProposalVersions(prospectId: number) {
  return useQuery<ProposalVersion[]>({
    queryKey: [`/api/comercial/prospects/${prospectId}/proposals`],
    enabled: !!prospectId,
  });
}

export function useCreateProposal() {
  return useMutation({
    mutationFn: async ({ prospectId, ...data }: { prospectId: number; [key: string]: unknown }) => {
      const res = await apiRequest("POST", `/api/comercial/prospects/${prospectId}/proposals`, data);
      return res.json();
    },
    onSuccess: () => {
      invalidateByPrefix("/api/comercial/prospects");
    },
  });
}

export function useSendProposal() {
  return useMutation({
    mutationFn: async ({ prospectId, proposalId }: { prospectId: number; proposalId: number }) => {
      const res = await apiRequest("POST", `/api/comercial/prospects/${prospectId}/proposals/${proposalId}/send`);
      return res.json();
    },
    onSuccess: () => {
      invalidateByPrefix("/api/comercial/prospects");
    },
  });
}

export function useChangeProposalStatus() {
  return useMutation({
    mutationFn: async ({ prospectId, proposalId, status }: { prospectId: number; proposalId: number; status: string }) => {
      const res = await apiRequest("POST", `/api/comercial/prospects/${prospectId}/proposals/${proposalId}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      invalidateByPrefix("/api/comercial/prospects");
    },
  });
}

interface UpdateProposalPayload {
  prospectId: number;
  proposalId: number;
  amount?: string | number;
  utilidad?: string | number | null;
  recipientName?: string | null;
  recipientRole?: string | null;
  notes?: string | null;
  validUntil?: string | null;
}

export function useUpdateProposal() {
  return useMutation({
    mutationFn: async ({ prospectId, proposalId, ...data }: UpdateProposalPayload) => {
      const res = await apiRequest("PATCH", `/api/comercial/prospects/${prospectId}/proposals/${proposalId}`, data);
      return res.json();
    },
    onSuccess: () => {
      invalidateByPrefix("/api/comercial/prospects");
    },
  });
}

// --- Alerts ---

export function useAlerts(status?: string) {
  return useQuery<FollowUpAlert[]>({
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
      invalidateByPrefix("/api/comercial/alerts");
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
      invalidateByPrefix("/api/comercial/alerts");
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
      invalidateByPrefix("/api/comercial/alerts");
    },
  });
}

// --- Reports ---

interface LeadSourceReport {
  source: string;
  count: number;
  value: number;
}

interface ForecastEntry {
  month: string;
  predicted: number;
  actual: number;
}

interface WinLossAnalysis {
  totalWon: number;
  totalLost: number;
  winRate: number;
  avgDealSize: number;
  topReasons: { reason: string; count: number }[];
}

interface CompetitorEntry {
  name: string;
  deals: number;
  wins: number;
}

export function useLeadSourcesReport() {
  return useQuery<LeadSourceReport[]>({
    queryKey: ["/api/comercial/reports/lead-sources"],
  });
}

export function useSalesForecast() {
  return useQuery<ForecastEntry[]>({
    queryKey: ["/api/comercial/reports/forecast"],
  });
}

export function useWinLossAnalysis() {
  return useQuery<WinLossAnalysis>({
    queryKey: ["/api/comercial/reports/win-loss"],
  });
}

export function useCompetitorAnalysis() {
  return useQuery<CompetitorEntry[]>({
    queryKey: ["/api/comercial/reports/competitors"],
  });
}

// === RESUMEN SEMANAL ===

export function useWeeklyReport(weekStart: string) {
  return useQuery<ComercialWeeklyReport>({
    queryKey: ["/api/comercial/weekly-report", weekStart],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/comercial/weekly-report?week=${weekStart}`);
      return res.json();
    },
    enabled: !!weekStart,
  });
}

export function useSaveWeeklyReport() {
  return useMutation({
    mutationFn: async (data: { weekStart: string; content: string; meetingNotes?: string }) => {
      const res = await apiRequest("PUT", "/api/comercial/weekly-report", data);
      return res.json();
    },
    onSuccess: () => {
      invalidateByPrefix("/api/comercial/weekly-report");
    },
  });
}

export function useSendWeeklyReport() {
  return useMutation({
    mutationFn: async (data: { weekStart: string; content: string; recipients: string[] }) => {
      const res = await apiRequest("POST", "/api/comercial/weekly-report/send", data);
      return res.json();
    },
    onSuccess: () => {
      invalidateByPrefix("/api/comercial/weekly-report");
    },
  });
}

// === CALENDAR VIEW ===

export function useWeeklyReportsRange(from: string, to: string) {
  return useQuery<ComercialWeeklyReport[]>({
    queryKey: ["/api/comercial/weekly-reports", from, to],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/comercial/weekly-reports?from=${from}&to=${to}`);
      return res.json();
    },
    enabled: !!from && !!to,
  });
}

// === COMPROMISOS ===

interface WeeklyCommitment {
  id: number;
  weekStart: string;
  description: string;
  responsible: string;
  responsibleUserId: number | null;
  dueDate: string | null;
  status: string;
  createdById: number | null;
  createdAt: string;
}

export function useCommitments(weekStart?: string) {
  const url = weekStart
    ? `/api/comercial/commitments?week=${weekStart}`
    : "/api/comercial/commitments";
  return useQuery<WeeklyCommitment[]>({
    queryKey: ["/api/comercial/commitments", weekStart || "pending"],
    queryFn: async () => {
      const res = await apiRequest("GET", url);
      return res.json();
    },
  });
}

export function useCreateCommitment() {
  return useMutation({
    mutationFn: async (data: { weekStart: string; description: string; responsible: string; responsibleUserId?: number; dueDate?: string | null }) => {
      const res = await apiRequest("POST", "/api/comercial/commitments", data);
      return res.json();
    },
    onSuccess: () => {
      invalidateByPrefix("/api/comercial/commitments");
    },
  });
}

export function useUpdateCommitmentStatus() {
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: "pendiente" | "cumplido" }) => {
      const res = await apiRequest("PATCH", `/api/comercial/commitments/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      invalidateByPrefix("/api/comercial/commitments");
    },
  });
}

export function useUpdateCommitment() {
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number; description?: string; responsible?: string; responsibleUserId?: number | null; dueDate?: string | null }) => {
      const res = await apiRequest("PATCH", `/api/comercial/commitments/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      invalidateByPrefix("/api/comercial/commitments");
    },
  });
}

export function useDeleteCommitment() {
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/comercial/commitments/${id}`);
      return res.json();
    },
    onSuccess: () => {
      invalidateByPrefix("/api/comercial/commitments");
    },
  });
}

export function useCommitmentsRange(from: string, to: string) {
  return useQuery<WeeklyCommitment[]>({
    queryKey: ["/api/comercial/commitments/calendar", from, to],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/comercial/commitments/calendar?from=${from}&to=${to}`);
      return res.json();
    },
    enabled: !!from && !!to,
  });
}
