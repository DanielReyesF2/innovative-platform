/**
 * Shared types for the Comercial module.
 *
 * KanbanProspecto is the frontend representation of a prospect,
 * produced by dbProspectToKanban(). Every component that touches
 * prospect data should use this type instead of `any`.
 *
 * TeamMember is the frontend representation of a sales team member,
 * produced by the salesTeamData mapper in useComercialData.
 */

// ═══════ KANBAN PROSPECTO ═══════

export interface KanbanContacto {
  nombre: string;
  puesto: string;
  correo: string;
  telefono: string;
}

export interface KanbanPropuesta {
  status: string | null;
  ventaTotal: number | null;
  utilidad: number | null;
  carton: number | null;
  playo: number | null;
}

export interface KanbanProspecto {
  id: number;
  empresa: string;
  planta: string | null;
  ciudad: string | null;
  industria: string | null;
  ejecutivo: string;
  assignedToId: number | null;
  contacto: KanbanContacto;
  servicios: string[];
  status: string;
  semana: string | null;
  fecha: string | null;
  fechaRegistro: string | null;
  propuesta: KanbanPropuesta;
  motivoRechazo: string | null;
  motivoRechazoCategory: string | null;
  comentarios: string;
  volumenEstimado: string | null;
  facturacionEstimada: number | null;
  fuente: string;
  fechaSeguimiento: string | null;
  followUpAction: string | null;
  recoveryStatus: string | null;
  fechaVencimientoContrato: string | null;
  levantamientoData: unknown;
  serviceVolumes: Record<string, string>;
  potential: string | null;
  probability: number | null;
  priority: string | null;
  nextStep: string | null;
  reason: string | null;
  estimatedCloseTime: string | null;
  meetingDate: string | null;
  surveyDate: string | null;
  // Deadline (ISO string) to upload the propuesta after the levantamiento was
  // agendado. Set server-side by the auto-advance hook. Null until the
  // prospect reaches Propuesta stage via that flow.
  proposalDeadline: string | null;
  proposalDate: string | null;
  updatedAt: string | null;
}

// ═══════ TEAM MEMBER ═══════

export interface TeamMember {
  id: number;
  dbUserId: number;
  codigo: string;
  name: string;
  role: string;
  ubicacion: string;
  zona: string;
  avatar: string;
  presupuestoAnual2026: number;
  presupuestoMensual: number;
  presupuestosMensuales: Record<string, number>;
  ventasReales: number;
  ventasRealesAnual: number;
  cumplimientoPresupuesto: number;
  leads: number;
  levantamientos: number;
  propuestasEnviadas: number;
  reuniones: number;
  cierres: number;
  tasaConversion: number;
  tiempoRespuesta: string;
  satisfaccionCliente: number;
  activitiesSemanal: number;
  eficienciaGlobal: number;
  ultimaActividad: string;
  notas: string;
  kpisSemanales: unknown[];
}

// ═══════ SEGUIMIENTO ═══════

export interface SeguimientoData {
  fechaSeguimiento: string | null;
  accion?: string | null;
  followUpAction?: string | null;
  recoveryStatus?: string | null;
  fechaVencimientoContrato?: string | null;
}

export interface SeguimientoUrgency {
  label: string;
  color: string;
  bg: string;
  overdue: boolean;
  days: number;
}

// ═══════ STAGE GATE ═══════

export interface GateMissingField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'services' | 'date';
  placeholder?: string;
}

export interface StageGate {
  label: string;
  validate: (p: KanbanProspecto) => boolean;
  message: (p: KanbanProspecto) => string;
  requirement: string;
  missingFields: (p: KanbanProspecto) => GateMissingField[];
}

// ═══════ PENDING MOVE (DnD) ═══════

export interface PendingMove {
  prospecto: KanbanProspecto;
  fromStage: string;
  toStage: string;
}

// ═══════ CAMPO COMPLETO ═══════

export interface CampoCompleto {
  label: string;
  ok: boolean;
}
