import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/lib/auth';
import {
  dbProspectToKanban,
  calcularPipelineData,
  KANBAN_STAGES,
  HUB_KANBAN_STAGES,
  STAGE_GATES,
  STAGE_PROBABILITY,
  MONTH_LABELS,
} from '@/lib/comercial-constants';
import { PointerSensor, useSensor, useSensors } from '@dnd-kit/core';

export function useComercialData() {
  const { user: authUser } = useAuth();

  // ═══════ QUERIES ═══════
  const { data: dbProspectsRaw = [], isLoading: prospectsLoading } = useQuery({
    queryKey: ['/api/comercial/prospects'],
    staleTime: 30 * 1000,
  });

  const { data: dbUsers = [] } = useQuery<any[]>({
    queryKey: ['/api/auth/team'],
    staleTime: 5 * 60 * 1000,
  });

  const usersMap = useMemo(() => {
    const map: Record<number, any> = {};
    (dbUsers as any[]).forEach((u: any) => { map[u.id] = u; });
    return map;
  }, [dbUsers]);

  const { data: dbTeamRaw = [], isLoading: teamLoading } = useQuery<any[]>({
    queryKey: ['/api/comercial/team'],
    staleTime: 5 * 60 * 1000,
  });

  const { data: dbVentasReales = [] } = useQuery<any[]>({
    queryKey: ['/api/comercial/ventas-reales'],
    staleTime: 60 * 1000,
  });

  // ═══════ DERIVED DATA ═══════
  const kanbanProspectos = useMemo(() => {
    return (dbProspectsRaw as any[]).map((p: any) => dbProspectToKanban(p, usersMap));
  }, [dbProspectsRaw, usersMap]);

  const salesTeamData = useMemo(() => {
    return (dbTeamRaw as any[]).map((m: any) => ({
      id: m.id,
      dbUserId: m.id,
      codigo: m.codigo || '',
      name: m.name,
      role: m.role === 'director' ? 'Directora Comercial' : 'Ejecutiva',
      ubicacion: '',
      zona: '',
      avatar: '👤',
      presupuestoAnual2026: m.presupuestoAnual || 0,
      presupuestoMensual: m.presupuestoMensual || 0,
      presupuestosMensuales: m.presupuestosMensuales || {},
      ventasReales: m.ventasReales || 0,
      cumplimientoPresupuesto: m.presupuestoMensual > 0
        ? Math.round((m.ventasReales / m.presupuestoMensual) * 100) : 0,
      leads: 0, levantamientos: 0, propuestasEnviadas: 0, reuniones: 0, cierres: 0,
      tasaConversion: 0, tiempoRespuesta: '', satisfaccionCliente: 0,
      activitiesSemanal: 0, eficienciaGlobal: 0,
      ultimaActividad: '', notas: '', kpisSemanales: [],
    }));
  }, [dbTeamRaw]);

  const presupuestoEvolution = useMemo(() => {
    const realPorMes: Record<string, number> = {};
    (dbVentasReales as any[]).forEach((vr: any) => {
      const key = `${vr.año}-${vr.mes}`;
      realPorMes[key] = (realPorMes[key] || 0) + Number(vr.monto);
    });
    const currentYear = new Date().getFullYear();
    return MONTH_LABELS.map(row => {
      const period = `${currentYear}-${String(row.mesNum).padStart(2, '0')}`;
      const monthBudget = (dbTeamRaw as any[]).reduce((sum: number, m: any) => {
        const budgets = m.presupuestosMensuales || {};
        return sum + (budgets[period] || 0);
      }, 0);
      return {
        mes: row.mes,
        presupuesto: monthBudget,
        real: realPorMes[`${currentYear}-${row.mesNum}`] || 0,
      };
    });
  }, [dbVentasReales, dbTeamRaw]);

  const pipelineData = useMemo(() => calcularPipelineData(kanbanProspectos), [kanbanProspectos]);

  // ═══════ MUTATIONS ═══════
  const updateProspectMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await apiRequest("PATCH", `/api/comercial/prospects/${id}`, data);
      return res.json();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/comercial/prospects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/comercial/pipeline'] });
    },
  });

  const createProspectMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/comercial/prospects", data);
      return res.json();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/comercial/prospects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/comercial/pipeline'] });
    },
  });

  const deleteProspectMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/comercial/prospects/${id}`);
      return res.json();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/comercial/prospects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/comercial/pipeline'] });
    },
  });

  const rejectProspectMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await apiRequest("POST", `/api/comercial/prospects/${id}/reject`, data);
      return res.json();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/comercial/prospects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/comercial/pipeline'] });
    },
  });

  const createNoteMutation = useMutation({
    mutationFn: async ({ prospectId, content }: { prospectId: number; content: string }) => {
      const res = await apiRequest("POST", `/api/comercial/prospects/${prospectId}/notes`, { content, createdById: authUser?.id });
      return res.json();
    },
    onSettled: (_: any, __: any, variables: any) => {
      queryClient.invalidateQueries({ queryKey: [`/api/comercial/prospects/${variables.prospectId}/notes`] });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async ({ prospectId, noteId }: { prospectId: number; noteId: number }) => {
      const res = await apiRequest("DELETE", `/api/comercial/prospects/${prospectId}/notes/${noteId}`);
      return res.json();
    },
    onSettled: (_: any, __: any, variables: any) => {
      queryClient.invalidateQueries({ queryKey: [`/api/comercial/prospects/${variables.prospectId}/notes`] });
    },
  });

  const createDocumentMutation = useMutation({
    mutationFn: async ({ prospectId, ...data }: any) => {
      const res = await apiRequest("POST", `/api/comercial/prospects/${prospectId}/documents`, data);
      return res.json();
    },
    onSettled: (_: any, __: any, variables: any) => {
      queryClient.invalidateQueries({ queryKey: [`/api/comercial/prospects/${variables.prospectId}/documents`] });
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: async ({ prospectId, docId }: { prospectId: number; docId: number }) => {
      const res = await apiRequest("DELETE", `/api/comercial/prospects/${prospectId}/documents/${docId}`);
      return res.json();
    },
    onSettled: (_: any, __: any, variables: any) => {
      queryClient.invalidateQueries({ queryKey: [`/api/comercial/prospects/${variables.prospectId}/documents`] });
    },
  });

  // ═══════ VENTAS REALES STATE ═══════
  const [ventasRealesEditadas, setVentasRealesEditadas] = useState<Record<string, number>>({});

  useEffect(() => {
    if (salesTeamData.length > 0) {
      const map: Record<string, number> = {};
      (dbVentasReales as any[]).forEach((vr: any) => {
        const member = salesTeamData.find((m: any) => m.dbUserId === vr.userId);
        if (member) {
          map[`${member.id}-${vr.mes}-${vr.año}`] = Number(vr.monto);
        }
      });
      setVentasRealesEditadas(map);
    }
  }, [dbVentasReales, salesTeamData]);

  // ═══════ DND ═══════
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  // ═══════ USER INFO ═══════
  const currentUserCodigo = useMemo(() => {
    if (!authUser) return 'VA';
    const member = salesTeamData.find((m: any) => m.dbUserId === authUser.id);
    return member?.codigo || 'VA';
  }, [authUser, salesTeamData]);

  const currentUserName = useMemo(() => {
    if (!authUser) return 'Usuario';
    return authUser.name.split(' ')[0];
  }, [authUser]);

  const userGreeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 19) return 'Buenas tardes';
    return 'Buenas noches';
  })();

  return {
    // Loading
    isLoading: prospectsLoading || teamLoading,
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
