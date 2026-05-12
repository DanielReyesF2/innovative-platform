import type { Prospect } from "@shared/schema/comercial";
import { STAGE } from "@shared/schema/comercial-stages";
import type { User } from "@shared/schema/common";
import type {
  CampoCompleto,
  KanbanProspecto,
  SeguimientoData,
  SeguimientoUrgency,
  StageGate,
} from "@shared/types/comercial";
import { businessDaysBetween } from "@shared/utils/business-days";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { useState } from "react";

export type { GateMissingField } from "@shared/types/comercial";

/**
 * Prospect row as returned by the API (JSON).
 * - Timestamps arrive as ISO strings (not Date objects)
 * - Includes joined rejection reason fields
 */
export type ApiProspect = Omit<
  Prospect,
  | "createdAt"
  | "updatedAt"
  | "rejectionDate"
  | "proposalDate"
  | "lastContactAt"
  | "nextFollowUpAt"
  | "fechaVencimientoContrato"
  | "sentToOpsAt"
  | "proposalDeadline"
  | "closeDate"
> & {
  createdAt: string | null;
  updatedAt: string | null;
  rejectionDate?: string | null;
  proposalDate?: string | null;
  lastContactAt?: string | null;
  nextFollowUpAt?: string | null;
  fechaVencimientoContrato?: string | null;
  sentToOpsAt?: string | null;
  proposalDeadline?: string | null;
  closeDate?: string | null;
  rejectionReasonText?: string | null;
  rejectionReasonCategory?: string | null;
};

// ═══════ SERVICIOS ═══════
export const SERVICIOS_INNOVATIVE = [
  { id: "rme", nombre: "RME", descripcion: "Residuos de Manejo Especial" },
  { id: "rsu", nombre: "RSU", descripcion: "Residuos Sólidos Urbanos" },
  { id: "organicos", nombre: "R.Orgánicos", descripcion: "Alimentos y Poda" },
  { id: "rp_rpbi", nombre: "RP y RPBI", descripcion: "Residuos Peligrosos y Biológico-Infecciosos" },
  { id: "destrucciones", nombre: "Destrucciones Fiscales", descripcion: "Destrucción fiscal certificada" },
  { id: "lodos", nombre: "Lodos", descripcion: "Lodos de planta de tratamiento" },
  { id: "true", nombre: "Certificación TRUE", descripcion: "Total Resource Use and Efficiency" },
  { id: "biodigestores", nombre: "Biodigestores", descripcion: "Digestión anaerobia de orgánicos" },
  { id: "sustayn", nombre: "Sustayn", descripcion: "Plataforma de sustentabilidad" },
  { id: "limpieza", nombre: "Limpieza Especializada", descripcion: "Servicios de limpieza industrial" },
] as const;

// ═══════ CATÁLOGO DE RESIDUOS ═══════
export const WASTE_TYPES_CATALOG = [
  // Reciclables
  { id: "carton", category: "Reciclables", label: "Cartón" },
  { id: "papel", category: "Reciclables", label: "Papel" },
  { id: "pet", category: "Reciclables", label: "PET" },
  { id: "hdpe", category: "Reciclables", label: "Plástico HDPE" },
  { id: "plastico_mixto", category: "Reciclables", label: "Plástico Mixto" },
  { id: "playo", category: "Reciclables", label: "Playo / Película Stretch" },
  { id: "aluminio", category: "Reciclables", label: "Aluminio" },
  { id: "fierro_metales", category: "Reciclables", label: "Fierro / Metales" },
  { id: "vidrio", category: "Reciclables", label: "Vidrio" },
  { id: "chatarra", category: "Reciclables", label: "Chatarra" },
  // Madera
  { id: "tarima_madera_estandar", category: "Madera", label: "Tarima Madera Estándar" },
  { id: "tarima_madera_chica", category: "Madera", label: "Tarima Madera Chica" },
  { id: "tarima_plastico", category: "Madera", label: "Tarima de Plástico" },
  { id: "madera_suelta", category: "Madera", label: "Madera Suelta" },
  // Orgánicos
  { id: "organicos_alimentos", category: "Orgánicos", label: "Orgánicos (Alimentos)" },
  { id: "organicos_poda", category: "Orgánicos", label: "Orgánicos (Poda / Jardinería)" },
  { id: "organicos_mixtos", category: "Orgánicos", label: "Orgánicos Mixtos" },
  // Especiales
  { id: "lodos_ptar", category: "Especiales", label: "Lodos de PTAR" },
  { id: "textiles", category: "Especiales", label: "Textiles / Tela" },
  { id: "unicel", category: "Especiales", label: "Unicel / EPS" },
  { id: "aceite_usado", category: "Especiales", label: "Aceite Usado" },
  { id: "electronico", category: "Especiales", label: "Residuo Electrónico (RAEE)" },
  { id: "destruccion_fiscal", category: "Especiales", label: "Destrucción Fiscal" },
  // Peligrosos
  { id: "rp_solventes", category: "Peligrosos", label: "RP — Solventes" },
  { id: "rp_aceites", category: "Peligrosos", label: "RP — Aceites y Grasas" },
  { id: "rp_baterias", category: "Peligrosos", label: "RP — Baterías" },
  { id: "rp_contenedores", category: "Peligrosos", label: "RP — Contenedores Contaminados" },
  { id: "rpbi", category: "Peligrosos", label: "RPBI — Biológico-Infecciosos" },
  // Genérico
  { id: "rsu_general", category: "General", label: "RSU General" },
  { id: "otro", category: "General", label: "Otro" },
] as const;

// ═══════ EPP OPTIONS ═══════
export const EPP_OPTIONS = [
  { id: "casco", label: "Casco" },
  { id: "chaleco", label: "Chaleco Reflejante" },
  { id: "botas", label: "Botas de Seguridad" },
  { id: "lentes", label: "Lentes de Seguridad" },
  { id: "guantes", label: "Guantes" },
  { id: "cubrebocas", label: "Cubrebocas" },
  { id: "tapones", label: "Tapones Auditivos" },
  { id: "pantalon_largo", label: "Pantalón Largo" },
] as const;

// ═══════ REQUISITOS DE ACCESO A SITIO ═══════
// Lo que el personal debe llevar / presentar para entrar al sitio del cliente
// durante el levantamiento. Catálogo base — la UI permite agregar "Otro" libre.
export const ACCESS_REQUIREMENTS_OPTIONS = [
  { id: "ine", label: "INE" },
  { id: "credencial_empresa", label: "Credencial empresa" },
  { id: "pase_qr", label: "Pase QR" },
  { id: "registro_previo", label: "Registro previo" },
  { id: "documentos_vehiculo", label: "Docs vehículo" },
  { id: "seguro_vehiculo", label: "Seguro vigente" },
  { id: "examen_medico", label: "Examen médico" },
  { id: "induccion_seguridad", label: "Inducción seguridad" },
] as const;

export const SERVICE_COLORS: Record<string, { bg: string; border: string; text: string; label: string }> = {
  rme: { bg: "#EFF6FF", border: "#3B82F6", text: "#2563EB", label: "RME" },
  rsu: { bg: "#F0FDF4", border: "#22C55E", text: "#16A34A", label: "RSU" },
  organicos: { bg: "#F7FEE7", border: "#84CC16", text: "#4D7C0F", label: "Orgánicos" },
  rp_rpbi: { bg: "#FEF2F2", border: "#EF4444", text: "#DC2626", label: "RP/RPBI" },
  destrucciones: { bg: "#FAF5FF", border: "#A855F7", text: "#7C3AED", label: "Destrucciones" },
  lodos: { bg: "#FFFBEB", border: "#F59E0B", text: "#B45309", label: "Lodos" },
  true: { bg: "#F0FDFA", border: "#14B8A6", text: "#0F766E", label: "TRUE" },
  biodigestores: { bg: "#FFF7ED", border: "#F97316", text: "#C2410C", label: "Biodigestores" },
  sustayn: { bg: "#ECFDF5", border: "#10B981", text: "#047857", label: "Sustayn" },
  limpieza: { bg: "#F8FAFC", border: "#64748B", text: "#475569", label: "Limpieza" },
};

export const INDUSTRIAS = [
  "Automotriz",
  "Alimenticia",
  "Abarrotes",
  "Bebidas",
  "Retail",
  "Hotelería",
  "Restaurantes",
  "Servicios",
  "Pinturas / Industrial",
  "Fabricación de motores",
  "Equipo óptico",
  "Farmacéutica",
  "Tecnología",
  "Logística",
  "Construcción",
  "Minería",
  "Otro",
];

// ═══════ KANBAN STAGES ═══════
// Labels reflect the BUSINESS flow, not the DB stage IDs.
// See CLAUDE.md "Stage ID vs Business Label Mismatch" for details.
export const KANBAN_STAGES = [
  { id: STAGE.CONTACTO_INICIAL, label: "Lead", color: "#6b7280", prob: "5%" },
  { id: STAGE.PRESENTACION, label: "Prospecto", color: "#0D47A1", prob: "20%" },
  { id: STAGE.LEVANTAMIENTO, label: "Reunión", color: "#F57C00", prob: "35%" },
  { id: STAGE.PROPUESTA, label: "Agendar levantamiento", color: "#00a8a8", prob: "50%" },
  { id: STAGE.NEGOCIACION, label: "Propuesta", color: "#7C3AED", prob: "70%" },
  { id: STAGE.CIERRE_GANADO, label: "Socio Ambiental", color: "#2E7D32", prob: "100%" },
] as const;

export const STAGE_PROBABILITY: Record<string, number> = {
  [STAGE.CONTACTO_INICIAL]: 0.05,
  [STAGE.PRESENTACION]: 0.2,
  [STAGE.LEVANTAMIENTO]: 0.35,
  [STAGE.PROPUESTA]: 0.5,
  [STAGE.NEGOCIACION]: 0.7,
  [STAGE.CIERRE_GANADO]: 1.0,
  [STAGE.CIERRE_PERDIDO]: 0,
};

// ═══════ KPI METAS ═══════
export const KPI_METAS: Record<string, { meta: number; frecuencia: string; label: string; peso: number }> = {
  leadsNuevos: { meta: 5, frecuencia: "mensual", label: "Leads Nuevos", peso: 0.15 },
  reunionesAgendadas: { meta: 4, frecuencia: "mensual", label: "Reuniones Agendadas", peso: 0.15 },
  levantamientos: { meta: 2, frecuencia: "mensual", label: "Levantamientos", peso: 0.2 },
  propuestasEnviadas: { meta: 3, frecuencia: "mensual", label: "Propuestas Presentadas", peso: 0.2 },
  propuestasRechazadas: { meta: 0, frecuencia: "mensual", label: "Propuestas Rechazadas", peso: 0.1 },
  propuestasGanadas: { meta: 1, frecuencia: "mensual", label: "Propuestas Ganadas", peso: 0.2 },
};

// MOTIVOS_RECHAZO removed — rejection reasons now loaded from API: GET /api/comercial/rejection-reasons

export const RECHAZO_CATEGORIES: Record<
  string,
  {
    id: string;
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
    recoverable: boolean;
    defaultFollowUpDays: number;
    suggestedActions: string[];
    followUpQuestion: string;
  }
> = {
  pricing: {
    id: "pricing",
    label: "Precios",
    color: "#F59E0B",
    bgColor: "#FFFBEB",
    borderColor: "#F59E0B",
    recoverable: true,
    defaultFollowUpDays: 180,
    suggestedActions: [
      "Investigar fecha de vencimiento de contrato actual",
      "Preparar contrapropuesta con precios revisados",
      "Solicitar desglose de precios del competidor",
      "Agendar re-contacto al cierre de su ejercicio fiscal",
    ],
    followUpQuestion: "Cuando vence el contrato actual del cliente?",
  },
  proposal: {
    id: "proposal",
    label: "Propuesta",
    color: "#3B82F6",
    bgColor: "#EFF6FF",
    borderColor: "#3B82F6",
    recoverable: true,
    defaultFollowUpDays: 90,
    suggestedActions: [
      "Solicitar retroalimentacion detallada sobre propuesta",
      "Rediseñar propuesta con enfoque diferente",
      "Identificar que ofrecia el competidor ganador",
      "Re-contactar con nueva propuesta de valor",
    ],
    followUpQuestion: "Que mejorarias de la propuesta para re-intentar?",
  },
  operational: {
    id: "operational",
    label: "Operativo",
    color: "#6b7280",
    bgColor: "#f3f4f6",
    borderColor: "#6b7280",
    recoverable: false,
    defaultFollowUpDays: 365,
    suggestedActions: [
      "Verificar si ya se tiene proveeduria en la zona",
      "Evaluar viabilidad con nuevas rutas o alianzas",
      "Monitorear expansion de cobertura propia",
    ],
    followUpQuestion: "Ya se tiene cobertura o proveeduria en esa zona?",
  },
};

export const RECOVERY_STATES: Record<
  string,
  { id: string; label: string; color: string; bg: string; icon: string; order: number }
> = {
  sin_seguimiento: {
    id: "sin_seguimiento",
    label: "Sin seguimiento",
    color: "#EF4444",
    bg: "#FEF2F2",
    icon: "AlertCircle",
    order: 0,
  },
  en_seguimiento: {
    id: "en_seguimiento",
    label: "En seguimiento",
    color: "#F59E0B",
    bg: "#FFFBEB",
    icon: "Clock",
    order: 1,
  },
  re_contactada: {
    id: "re_contactada",
    label: "Re-contactada",
    color: "#3B82F6",
    bg: "#EFF6FF",
    icon: "PhoneCall",
    order: 2,
  },
  recuperada: { id: "recuperada", label: "Recuperada", color: "#22C55E", bg: "#F0FDF4", icon: "CheckCircle", order: 3 },
};

// ═══════ PRESUPUESTO ═══════
export const MONTH_LABELS = [
  { mes: "Ene", mesNum: 1 },
  { mes: "Feb", mesNum: 2 },
  { mes: "Mar", mesNum: 3 },
  { mes: "Abr", mesNum: 4 },
  { mes: "May", mesNum: 5 },
  { mes: "Jun", mesNum: 6 },
  { mes: "Jul", mesNum: 7 },
  { mes: "Ago", mesNum: 8 },
  { mes: "Sep", mesNum: 9 },
  { mes: "Oct", mesNum: 10 },
  { mes: "Nov", mesNum: 11 },
  { mes: "Dic", mesNum: 12 },
];

export const COLORS_INNOVATIVE = {
  primary: "#00a8a8",
  secondary: "#008080",
  accent: "#00b3b3",
  blue: "#008080",
  lightBlue: "#5FA8D3",
  gray: "#f3f4f6",
  darkGray: "#1c2c4a",
  borderGray: "#e5e7eb",
  textGray: "#6b7280",
};

export const COLORS_CHART = ["#00a8a8", "#0D47A1", "#008080", "#F57C00", "#2E7D32"];

// ═══════ HELPER FUNCTIONS ═══════

export const timeAgo = (dateStr: string | null | undefined): string | null => {
  if (!dateStr) return null;
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "hoy";
  if (diffDays === 0) return "hoy";
  if (diffDays === 1) return "1d";
  if (diffDays < 7) return `${diffDays}d`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}sem`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}m`;
  return `${Math.floor(diffDays / 365)}a`;
};

export const urgencyColor = (dateStr: string | null | undefined): string => {
  if (!dateStr) return "#9ca3af";
  const diffDays = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 7) return "#22C55E";
  if (diffDays <= 21) return "#F59E0B";
  if (diffDays <= 45) return "#F97316";
  return "#EF4444";
};

export const estimarFechaProspecto = (p: KanbanProspecto): string | null => {
  return p.fecha || null;
};

export const getScoreColor = (score: number) => {
  if (score >= 110) return { bg: "#1B5E20", bgLight: "rgba(27,94,32,0.10)", text: "#1B5E20", label: "Destacado" };
  if (score >= 90) return { bg: "#2E7D32", bgLight: "rgba(46,125,50,0.10)", text: "#2E7D32", label: "En Meta" };
  if (score >= 70) return { bg: "#F57C00", bgLight: "rgba(245,124,0,0.10)", text: "#F57C00", label: "En Riesgo" };
  return { bg: "#EF4444", bgLight: "rgba(239,68,68,0.10)", text: "#EF4444", label: "Fuera de Meta" };
};

export const getBarColor = (pct: number): string => {
  if (pct >= 110) return "#1B5E20";
  if (pct >= 90) return "#2E7D32";
  if (pct >= 70) return "#F57C00";
  return "#EF4444";
};

export const calcularWeightedPipeline = (prospectos: KanbanProspecto[]): number => {
  return prospectos.reduce((sum, p) => {
    const valor = p.propuesta?.ventaTotal || p.facturacionEstimada || 0;
    const prob = STAGE_PROBABILITY[p.status] || 0.05;
    return sum + valor * prob;
  }, 0);
};

export const calcularWinRate = (prospectos: KanbanProspecto[]): number => {
  const ganadas = prospectos.filter((p) => p.status === "cierre_ganado").length;
  const perdidas = prospectos.filter((p) => p.status === "cierre_perdido").length;
  const total = ganadas + perdidas;
  return total > 0 ? (ganadas / total) * 100 : 0;
};

export const calcularPipelineVelocity = (prospectos: KanbanProspecto[]): number => {
  const oportunidadesActivas = prospectos.filter((p) => !["cierre_perdido", "cierre_ganado"].includes(p.status));
  const numOpps = oportunidadesActivas.length;
  const avgDeal =
    numOpps > 0
      ? oportunidadesActivas.reduce((sum, p) => sum + (p.propuesta?.ventaTotal || p.facturacionEstimada || 0), 0) /
        numOpps
      : 0;
  const winRate = calcularWinRate(prospectos) / 100;
  const avgCycleDays = 45;
  return avgCycleDays > 0 ? (numOpps * avgDeal * winRate) / avgCycleDays : 0;
};

export const esProspectoCalificado = (lead: KanbanProspecto): boolean => {
  return !!(
    lead.empresa &&
    lead.industria &&
    lead.contacto?.nombre &&
    lead.contacto?.puesto &&
    lead.contacto?.correo &&
    lead.contacto?.telefono
  );
};

export const camposFaltantes = (lead: KanbanProspecto): string[] => {
  const faltantes: string[] = [];
  if (!lead.empresa) faltantes.push("Empresa");
  if (!lead.industria) faltantes.push("Industria");
  if (!lead.contacto?.nombre) faltantes.push("Nombre contacto");
  if (!lead.contacto?.puesto) faltantes.push("Puesto");
  if (!lead.contacto?.correo) faltantes.push("Correo");
  if (!lead.contacto?.telefono) faltantes.push("Celular");
  return faltantes;
};

export const dbProspectToKanban = (
  prospect: ApiProspect,
  usersMap: Record<number, Pick<User, "name" | "codigo">> = {},
): KanbanProspecto => {
  const user = prospect.assignedToId ? usersMap[prospect.assignedToId] : undefined;
  const ejecutivoCode =
    user?.codigo ||
    (user?.name
      ? user.name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .substring(0, 2)
          .toUpperCase()
      : "");
  return {
    id: prospect.id,
    empresa: prospect.name,
    planta: null,
    ciudad: prospect.location || null,
    industria: prospect.industry || null,
    ejecutivo: ejecutivoCode,
    assignedToId: prospect.assignedToId,
    contacto: {
      nombre: prospect.contactName || "",
      puesto: prospect.contactRole || "",
      correo: prospect.contactEmail || "",
      telefono: prospect.contactPhone || "",
    },
    servicios: prospect.services || [],
    status: prospect.stage,
    semana: null,
    fecha: prospect.firstContactDate || (prospect.createdAt ? prospect.createdAt.split("T")[0] : null),
    fechaRegistro: prospect.createdAt ? prospect.createdAt.split("T")[0] : null,
    propuesta: {
      status: null,
      ventaTotal: prospect.estimatedValue ? Number(prospect.estimatedValue) : null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: prospect.rejectionReasonText || prospect.rejectionDetail || null,
    motivoRechazoCategory: prospect.rejectionReasonCategory || null,
    comentarios: prospect.reason || prospect.nextStep || "",
    volumenEstimado: prospect.estimatedVolume || null,
    facturacionEstimada: prospect.estimatedValue ? Number(prospect.estimatedValue) : null,
    fuente: prospect.source || "otro",
    fechaSeguimiento: prospect.nextFollowUpAt ? prospect.nextFollowUpAt.split("T")[0] : null,
    followUpAction: prospect.followUpAction || null,
    recoveryStatus: prospect.recoveryStatus || null,
    fechaVencimientoContrato: prospect.fechaVencimientoContrato
      ? prospect.fechaVencimientoContrato.split("T")[0]
      : null,
    levantamientoData: prospect.levantamientoData || null,
    serviceVolumes: prospect.serviceVolumes || {},
    potential: prospect.potential || null,
    probability: prospect.probability ?? null,
    priority: prospect.priority || null,
    nextStep: prospect.nextStep || null,
    reason: prospect.reason || null,
    estimatedCloseTime: prospect.estimatedCloseTime || null,
    meetingDate: prospect.meetingDate || null,
    surveyDate: prospect.surveyDate || null,
    proposalDeadline: prospect.proposalDeadline || null,
    proposalDate: prospect.proposalDate || null,
    estimatedStartDate: prospect.estimatedStartDate || null,
    closeDate: prospect.closeDate || null,
    operationsStartDate: prospect.operationsStartDate || null,
    hasContract: prospect.hasContract ?? null,
    contractDurationMonths: prospect.contractDurationMonths ?? null,
    paymentTermsServices: prospect.paymentTermsServices ?? null,
    paymentTermsValuables: prospect.paymentTermsValuables ?? null,
    updatedAt: prospect.updatedAt || null,
  };
};

/**
 * Build a chip descriptor for the propuesta SLA deadline. Returns null when
 * the deadline isn't applicable — either no deadline recorded or a propuesta
 * was already uploaded (so the SLA clock is stopped).
 */
export function proposalDeadlineChip(p: KanbanProspecto): {
  label: string;
  color: string;
  bg: string;
  overdue: boolean;
} | null {
  if (!p.proposalDeadline) return null;
  // Propuesta already uploaded → SLA stopped, don't show chip.
  if (p.proposalDate) return null;
  const deadline = new Date(p.proposalDeadline);
  if (Number.isNaN(deadline.getTime())) return null;
  const now = new Date();
  const diffBusiness = businessDaysBetween(now, deadline);
  const overdue = deadline.getTime() < now.getTime();
  if (overdue) {
    const daysLate = Math.max(1, Math.abs(diffBusiness));
    return { label: `Vencido ${daysLate}d`, color: "#DC2626", bg: "#FEF2F2", overdue: true };
  }
  if (diffBusiness <= 1) {
    return { label: `Vence hoy`, color: "#F57C00", bg: "#FFF7ED", overdue: false };
  }
  return { label: `Vence en ${diffBusiness}d hábiles`, color: "#00a8a8", bg: "#ECFEFE", overdue: false };
}

export const calcularPipelineData = (prospectos: KanbanProspecto[]) => {
  const stages = ["contacto_inicial", "presentacion", "levantamiento", "propuesta", "negociacion", "cierre_ganado"];
  const labels: Record<string, string> = {
    contacto_inicial: "Lead nuevo",
    presentacion: "Reunión",
    levantamiento: "Levantamiento",
    propuesta: "Propuesta",
    negociacion: "Negociación",
    cierre_ganado: "Socio Ambiental",
  };
  const objetivos: Record<string, number> = {
    contacto_inicial: 50,
    presentacion: 30,
    levantamiento: 20,
    propuesta: 15,
    negociacion: 10,
    cierre_ganado: 5,
  };
  return stages.map((stage) => {
    const items = prospectos.filter((p) => p.status === stage);
    return {
      etapa: labels[stage] || stage,
      cantidad: items.length,
      valor: items.reduce((sum, p) => sum + (p.propuesta?.ventaTotal || p.facturacionEstimada || 0), 0),
      objetivo: objetivos[stage] || 5,
    };
  });
};

export const calcularCamposCompletos = (p: KanbanProspecto): CampoCompleto[] => {
  return [
    { label: "Empresa", ok: !!p.empresa },
    { label: "Industria", ok: !!p.industria },
    { label: "Contacto", ok: !!p.contacto?.nombre },
    { label: "Puesto", ok: !!p.contacto?.puesto },
    { label: "Correo", ok: !!p.contacto?.correo },
    { label: "Servicios", ok: !!(p.servicios?.length > 0) },
    { label: "Ciudad", ok: !!p.ciudad },
    { label: "Tipos de residuos", ok: !!p.levantamientoData },
    { label: "Volumen estimado", ok: !!p.volumenEstimado },
  ];
};

export const getRecoveryState = (seg: SeguimientoData | null | undefined) => {
  if (!seg) return RECOVERY_STATES.sin_seguimiento;
  if (seg.recoveryStatus === "re_contactada") return RECOVERY_STATES.re_contactada;
  if (seg.fechaSeguimiento) return RECOVERY_STATES.en_seguimiento;
  return RECOVERY_STATES.sin_seguimiento;
};

/**
 * Clasifica un rechazo usando la categoría del catálogo (DB) como fuente primaria.
 * Fallback a keyword matching sobre el texto del motivo si no hay categoría.
 */
export const classifyRechazo = (motivoRechazo: string | null | undefined, dbCategory?: string | null) => {
  // Primary: use the category from rejection_reasons table
  if (dbCategory) {
    const lower = dbCategory.toLowerCase();
    if (lower === "comercial" || lower === "competencia") return RECHAZO_CATEGORIES.pricing;
    if (lower === "proceso") return RECHAZO_CATEGORIES.proposal;
    // Operativo, Legal, Viabilidad → operational
    return RECHAZO_CATEGORIES.operational;
  }
  // Fallback: keyword matching on rejection text (legacy data without category)
  if (!motivoRechazo) return RECHAZO_CATEGORIES.operational;
  const lower = motivoRechazo.toLowerCase();
  if (lower.includes("precio") || lower.includes("competitivo") || lower.includes("costo") || lower.includes("elevado"))
    return RECHAZO_CATEGORIES.pricing;
  if (
    lower.includes("propuesta") ||
    lower.includes("expectativa") ||
    lower.includes("demora") ||
    lower.includes("eligieron") ||
    lower.includes("suficientemente")
  )
    return RECHAZO_CATEGORIES.proposal;
  if (lower.includes("proveedur") || lower.includes("zona") || lower.includes("viable") || lower.includes("declinamos"))
    return RECHAZO_CATEGORIES.operational;
  return RECHAZO_CATEGORIES.operational;
};

export const getSeguimientoUrgency = (seg: SeguimientoData | null | undefined): SeguimientoUrgency | null => {
  if (!seg?.fechaSeguimiento) return null;
  const today = new Date();
  const target = new Date(seg.fechaSeguimiento);
  const diffDays = Math.floor((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0)
    return {
      label: `Vencido ${Math.abs(diffDays)}d`,
      color: "#EF4444",
      bg: "#FEF2F2",
      overdue: true,
      days: Math.abs(diffDays),
    };
  if (diffDays === 0) return { label: "Hoy", color: "#EF4444", bg: "#FEF2F2", overdue: false, days: 0 };
  if (diffDays <= 7) return { label: `${diffDays}d`, color: "#F59E0B", bg: "#FFFBEB", overdue: false, days: diffDays };
  if (diffDays <= 30)
    return { label: `${Math.floor(diffDays / 7)}sem`, color: "#22C55E", bg: "#F0FDF4", overdue: false, days: diffDays };
  return { label: `${Math.floor(diffDays / 30)}m`, color: "#6b7280", bg: "#f3f4f6", overdue: false, days: diffDays };
};

// ═══════ TAB UNLOCK BY STAGE ═══════
export const TAB_UNLOCK_STAGE: Record<string, string> = {
  info: "contacto_inicial",
  timeline: "contacto_inicial",
  notas: "contacto_inicial",
  reuniones: "presentacion",
  levantamiento: "levantamiento",
  docs: "levantamiento",
  propuestas: "propuesta",
};

const STAGE_ORDER = ["contacto_inicial", "presentacion", "levantamiento", "propuesta", "negociacion", "cierre_ganado"];

export function isTabLocked(tabId: string, currentStage: string): boolean {
  const requiredStage = TAB_UNLOCK_STAGE[tabId];
  if (!requiredStage) return false;
  const currentIdx = STAGE_ORDER.indexOf(currentStage);
  const requiredIdx = STAGE_ORDER.indexOf(requiredStage);
  if (currentIdx === -1 || requiredIdx === -1) return false;
  return currentIdx < requiredIdx;
}

export function tabUnlockLabel(tabId: string): string {
  const requiredStage = TAB_UNLOCK_STAGE[tabId];
  if (!requiredStage) return "";
  const stage = KANBAN_STAGES.find((s) => s.id === requiredStage);
  return stage?.label || requiredStage;
}

// ═══════ STAGE GATES ═══════

export const STAGE_GATES: Record<string, StageGate> = {
  // Lead (contacto_inicial) → Prospecto (presentacion): se califica desde el
  // QualifyLeadDialog, no por este gate.

  // Prospecto (presentacion) → Reunión (DB levantamiento): requiere que haya
  // fecha de reunión agendada.
  levantamiento: {
    label: "Fecha de Reunión",
    validate: (p) => !!p.meetingDate,
    message: () => "Falta agendar fecha de reunión",
    requirement: "Requiere: Fecha de reunión agendada",
    missingFields: (p) => [
      ...(!p.meetingDate
        ? [{ key: "meetingDate", label: "Fecha de reunión", type: "date" as const, placeholder: "" }]
        : []),
    ],
  },
  // Reunión (DB levantamiento) → Agendar Levantamiento (DB propuesta):
  // per Vero, el prospecto debe tener próximo paso definido (campo obligatorio
  // de Reunión) además de la fecha de levantamiento agendada.
  propuesta: {
    label: "Agendamiento + Próximo paso",
    validate: (p) => !!p.surveyDate && !!p.nextStep?.trim(),
    message: (p) => {
      const missing = [];
      if (!p.surveyDate) missing.push("fecha de levantamiento");
      if (!p.nextStep?.trim()) missing.push("próximo paso");
      return `Falta: ${missing.join(" y ")}`;
    },
    requirement: "Requiere: Fecha de levantamiento agendada + Próximo paso definido",
    missingFields: (p) => [
      ...(!p.surveyDate
        ? [{ key: "surveyDate", label: "Fecha de levantamiento", type: "date" as const, placeholder: "" }]
        : []),
      ...(!p.nextStep?.trim()
        ? [
            {
              key: "nextStep",
              label: "Próximo paso",
              type: "text" as const,
              placeholder: "Ej: confirmar volumen con gerente",
            },
          ]
        : []),
    ],
  },
  // No gate for negociacion: auto-advance cuando se completa el agendamiento
  // (ver server/storage.ts isSchedulingComplete + updateProspect hook).
};

// ═══════ SHARED COMPONENTS ═══════

export function ExecutiveAvatar({
  codigo,
  name,
  size = "md",
  className = "",
}: {
  codigo: string;
  name?: string;
  size?: string;
  className?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const src = `/avatars/${codigo.toLowerCase()}.jpg`;
  const sizeClasses: Record<string, string> = {
    xs: "w-7 h-7 text-[10px]",
    sm: "w-8 h-8 text-xs",
    md: "w-9 h-9 text-xs",
    lg: "w-10 h-10 text-xs",
    xl: "w-12 h-12 text-lg",
    "2xl": "w-16 h-16 text-2xl",
  };
  const s = sizeClasses[size] || sizeClasses.md;
  const fallback = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : codigo;

  if (imgError) {
    return (
      <div
        className={`${s} rounded-full bg-gradient-to-br from-[#00a8a8] to-[#0D47A1] flex items-center justify-center text-white font-bold flex-shrink-0 shadow-sm ${className}`}
      >
        {fallback}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name || codigo}
      onError={() => setImgError(true)}
      className={`${s} rounded-full object-cover flex-shrink-0 shadow-sm ${className}`}
    />
  );
}

export function SectionHeader({
  color,
  icon: Icon,
  label,
  linkLabel,
  onLinkClick,
}: {
  color: string;
  icon: LucideIcon;
  label: string;
  linkLabel?: string;
  onLinkClick?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 mb-4 mt-8 first:mt-0">
      <div className="w-1 h-8 rounded-full" style={{ backgroundColor: color }} />
      <Icon size={18} style={{ color }} />
      <h2 className="text-[13px] font-bold text-[#1c2c4a] uppercase tracking-wider">{label}</h2>
      {linkLabel && (
        <button
          onClick={onLinkClick}
          className="ml-auto text-xs font-medium flex items-center gap-1 hover:underline"
          style={{ color }}
        >
          {linkLabel} <ChevronRight size={14} />
        </button>
      )}
    </div>
  );
}
