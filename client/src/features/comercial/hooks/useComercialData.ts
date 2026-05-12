import { PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import type { User } from "@shared/schema/common";
import type { KanbanProspecto, TeamMember } from "@shared/types/comercial";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import type { ApiProspect } from "@/lib/comercial-constants";
import { calcularPipelineData, dbProspectToKanban, MONTH_LABELS } from "@/lib/comercial-constants";
import { apiRequest, invalidateByPrefix } from "@/lib/queryClient";

// ═══════ API RESPONSE SHAPES ═══════

/** Shape returned by GET /api/comercial/team */
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
  ventasRealesAnual: number;
}

/** Shape returned by GET /api/comercial/ventas-reales */
interface ApiVentaReal {
  id: number;
  userId: number;
  mes: number;
  año: number;
  monto: string; // numeric comes as string from DB
}

// ═══════ MUTATION PAYLOADS ═══════

interface UpdateProspectPayload {
  id: number;
  [key: string]: unknown;
}

interface RejectProspectPayload {
  id: number;
  rejectionReasonId?: number;
  rejectionDetail?: string;
  [key: string]: unknown;
}

interface CreateDocumentPayload {
  prospectId: number;
  [key: string]: unknown;
}

export function useComercialData() {
  const { user: authUser } = useAuth();

  // ═══════ QUERIES ═══════
  const {
    data: dbProspectsRaw = [],
    isLoading: prospectsLoading,
    isError: prospectsError,
  } = useQuery<ApiProspect[]>({
    queryKey: ["/api/comercial/prospects"],
    staleTime: 30 * 1000,
  });

  const { data: dbUsers = [] } = useQuery<Pick<User, "id" | "name" | "codigo">[]>({
    queryKey: ["/api/auth/team"],
    staleTime: 5 * 60 * 1000,
  });

  const usersMap = useMemo(() => {
    const map: Record<number, Pick<User, "name" | "codigo">> = {};
    dbUsers.forEach((u) => {
      map[u.id] = u;
    });
    return map;
  }, [dbUsers]);

  const {
    data: dbTeamRaw = [],
    isLoading: teamLoading,
    isError: teamError,
  } = useQuery<ApiTeamMember[]>({
    queryKey: ["/api/comercial/team"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: dbVentasReales = [] } = useQuery<ApiVentaReal[]>({
    queryKey: ["/api/comercial/ventas-reales"],
    staleTime: 60 * 1000,
  });

  // ═══════ DERIVED DATA ═══════
  const kanbanProspectos: KanbanProspecto[] = useMemo(() => {
    return dbProspectsRaw.map((p) => dbProspectToKanban(p, usersMap));
  }, [dbProspectsRaw, usersMap]);

  const salesTeamData: TeamMember[] = useMemo(() => {
    return dbTeamRaw.map((m) => ({
      id: m.id,
      dbUserId: m.id,
      codigo: m.codigo || "",
      name: m.name,
      role: m.role === "director" ? "Directora Comercial" : "Ejecutiva",
      ubicacion: "",
      zona: "",
      avatar: "👤",
      presupuestoAnual2026: m.presupuestoAnual || 0,
      presupuestoMensual: m.presupuestoMensual || 0,
      presupuestosMensuales: m.presupuestosMensuales || {},
      ventasReales: m.ventasReales || 0,
      ventasRealesAnual: m.ventasRealesAnual || 0,
      cumplimientoPresupuesto: m.presupuestoMensual > 0 ? Math.round((m.ventasReales / m.presupuestoMensual) * 100) : 0,
      leads: 0,
      levantamientos: 0,
      propuestasEnviadas: 0,
      reuniones: 0,
      cierres: 0,
      tasaConversion: 0,
      tiempoRespuesta: "",
      satisfaccionCliente: 0,
      activitiesSemanal: 0,
      eficienciaGlobal: 0,
      ultimaActividad: "",
      notas: "",
      kpisSemanales: [],
    }));
  }, [dbTeamRaw]);

  const presupuestoEvolution = useMemo(() => {
    const realPorMes: Record<string, number> = {};
    dbVentasReales.forEach((vr) => {
      const key = `${vr.año}-${vr.mes}`;
      realPorMes[key] = (realPorMes[key] || 0) + Number(vr.monto);
    });

    // Cotización por mes = suma del estimatedValue de prospectos activos cuyo
    // estimatedCloseTime cae en ese mes (excluye cierre_perdido). El
    // estimatedValue ya está sincronizado con la propuesta aceptada / más
    // reciente (ver updateProposalAmount en backend + backfill).
    const cotizacionPorMes: Record<string, number> = {};
    kanbanProspectos.forEach((p) => {
      if (p.status === "cierre_perdido") return;
      const ect = p.estimatedCloseTime; // "YYYY-MM"
      if (!ect) return;
      const amount = Number(p.propuesta?.ventaTotal || p.facturacionEstimada || 0);
      if (amount <= 0) return;
      const [year, month] = ect.split("-");
      const key = `${year}-${Number(month)}`;
      cotizacionPorMes[key] = (cotizacionPorMes[key] || 0) + amount;
    });

    const currentYear = new Date().getFullYear();
    return MONTH_LABELS.map((row) => {
      const period = `${currentYear}-${String(row.mesNum).padStart(2, "0")}`;
      const monthBudget = dbTeamRaw.reduce((sum, m) => {
        const budgets = m.presupuestosMensuales || {};
        return sum + (budgets[period] || 0);
      }, 0);
      const key = `${currentYear}-${row.mesNum}`;
      return {
        mes: row.mes,
        presupuesto: monthBudget,
        real: realPorMes[key] || 0,
        cotizacion: cotizacionPorMes[key] || 0,
      };
    });
  }, [dbVentasReales, dbTeamRaw, kanbanProspectos]);

  const pipelineData = useMemo(() => calcularPipelineData(kanbanProspectos), [kanbanProspectos]);

  // ═══════ MUTATIONS ═══════
  // Prospect stage/data changes ripple into team-level aggregates (closed-deal
  // totals, budget cumplimiento, dashboard cards) because the backend's
  // getComercialTeam sums prospectos in cierre_ganado per executive. Always
  // invalidate the team + ventas-reales queries too so the greeting, KPI
  // cards and team list refresh in lock-step with the kanban.
  const invalidateProspectAggregates = () => {
    invalidateByPrefix("/api/comercial/prospects");
    invalidateByPrefix("/api/comercial/pipeline");
    invalidateByPrefix("/api/comercial/team");
    invalidateByPrefix("/api/comercial/ventas-reales");
  };

  const updateProspectMutation = useMutation({
    mutationFn: async ({ id, ...data }: UpdateProspectPayload) => {
      const res = await apiRequest("PATCH", `/api/comercial/prospects/${id}`, data);
      return res.json();
    },
    onSettled: invalidateProspectAggregates,
  });

  const createProspectMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", "/api/comercial/prospects", data);
      return res.json();
    },
    onSettled: invalidateProspectAggregates,
  });

  const deleteProspectMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/comercial/prospects/${id}`);
      return res.json();
    },
    onSettled: invalidateProspectAggregates,
  });

  const rejectProspectMutation = useMutation({
    mutationFn: async ({ id, ...data }: RejectProspectPayload) => {
      const res = await apiRequest("POST", `/api/comercial/prospects/${id}/reject`, data);
      return res.json();
    },
    onSettled: invalidateProspectAggregates,
  });

  const createNoteMutation = useMutation({
    mutationFn: async ({ prospectId, content }: { prospectId: number; content: string }) => {
      const res = await apiRequest("POST", `/api/comercial/prospects/${prospectId}/notes`, {
        content,
        createdById: authUser?.id,
      });
      return res.json();
    },
    onSettled: (_data, _error, _variables) => {
      invalidateByPrefix("/api/comercial/prospects");
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async ({ prospectId, noteId }: { prospectId: number; noteId: number }) => {
      const res = await apiRequest("DELETE", `/api/comercial/prospects/${prospectId}/notes/${noteId}`);
      return res.json();
    },
    onSettled: (_data, _error, _variables) => {
      invalidateByPrefix("/api/comercial/prospects");
    },
  });

  const createDocumentMutation = useMutation({
    mutationFn: async ({ prospectId, ...data }: CreateDocumentPayload) => {
      const res = await apiRequest("POST", `/api/comercial/prospects/${prospectId}/documents`, data);
      return res.json();
    },
    onSettled: (_data, _error, _variables) => {
      invalidateByPrefix("/api/comercial/prospects");
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: async ({ prospectId, docId }: { prospectId: number; docId: number }) => {
      const res = await apiRequest("DELETE", `/api/comercial/prospects/${prospectId}/documents/${docId}`);
      return res.json();
    },
    onSettled: (_data, _error, _variables) => {
      invalidateByPrefix("/api/comercial/prospects");
    },
  });

  // ═══════ VENTAS REALES STATE ═══════
  const [ventasRealesEditadas, setVentasRealesEditadas] = useState<Record<string, number>>({});

  useEffect(() => {
    if (salesTeamData.length > 0) {
      const map: Record<string, number> = {};
      dbVentasReales.forEach((vr) => {
        const member = salesTeamData.find((m) => m.dbUserId === vr.userId);
        if (member) {
          map[`${member.id}-${vr.mes}-${vr.año}`] = Number(vr.monto);
        }
      });
      setVentasRealesEditadas(map);
    }
  }, [dbVentasReales, salesTeamData]);

  // ═══════ DND ═══════
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // ═══════ USER INFO ═══════
  const currentUserCodigo = useMemo(() => {
    if (!authUser) return "VA";
    const member = salesTeamData.find((m) => m.dbUserId === authUser.id);
    return member?.codigo || "VA";
  }, [authUser, salesTeamData]);

  const currentUserName = useMemo(() => {
    if (!authUser) return "Usuario";
    return authUser.name.split(" ")[0];
  }, [authUser]);

  const userGreeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Buenos días";
    if (h < 19) return "Buenas tardes";
    return "Buenas noches";
  })();

  return {
    // Loading / Error
    isLoading: prospectsLoading || teamLoading,
    isError: prospectsError || teamError,
    // Data
    kanbanProspectos,
    salesTeamData,
    presupuestoEvolution,
    pipelineData,
    usersMap,
    dbUsers,
    dbVentasReales,
    ventasRealesEditadas,
    setVentasRealesEditadas,
    // Mutations
    updateProspectMutation,
    createProspectMutation,
    deleteProspectMutation,
    rejectProspectMutation,
    createNoteMutation,
    deleteNoteMutation,
    createDocumentMutation,
    deleteDocumentMutation,
    // DnD
    sensors,
    // User
    authUser,
    currentUserCodigo,
    currentUserName,
    userGreeting,
  };
}
