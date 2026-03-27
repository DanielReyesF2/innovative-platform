import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';

// ═══════ SERVICIOS ═══════
export const SERVICIOS_INNOVATIVE = [
  { id: 'rme', nombre: 'RME', descripcion: 'Residuos de Manejo Especial' },
  { id: 'rsu', nombre: 'RSU', descripcion: 'Residuos Sólidos Urbanos' },
  { id: 'organicos', nombre: 'R.Orgánicos', descripcion: 'Alimentos y Poda' },
  { id: 'rp_rpbi', nombre: 'RP y RPBI', descripcion: 'Residuos Peligrosos y Biológico-Infecciosos' },
  { id: 'destrucciones', nombre: 'Destrucciones Fiscales', descripcion: 'Destrucción fiscal certificada' },
  { id: 'lodos', nombre: 'Lodos', descripcion: 'Lodos de planta de tratamiento' },
  { id: 'true', nombre: 'Certificación TRUE', descripcion: 'Total Resource Use and Efficiency' },
  { id: 'biodigestores', nombre: 'Biodigestores', descripcion: 'Digestión anaerobia de orgánicos' },
  { id: 'sustayn', nombre: 'Sustayn', descripcion: 'Plataforma de sustentabilidad' },
  { id: 'limpieza', nombre: 'Limpieza Especializada', descripcion: 'Servicios de limpieza industrial' },
] as const;

export const SERVICE_COLORS: Record<string, { bg: string; border: string; text: string; label: string }> = {
  rme:            { bg: '#EFF6FF', border: '#3B82F6', text: '#2563EB', label: 'RME' },
  rsu:            { bg: '#F0FDF4', border: '#22C55E', text: '#16A34A', label: 'RSU' },
  organicos:      { bg: '#F7FEE7', border: '#84CC16', text: '#4D7C0F', label: 'Orgánicos' },
  rp_rpbi:        { bg: '#FEF2F2', border: '#EF4444', text: '#DC2626', label: 'RP/RPBI' },
  destrucciones:  { bg: '#FAF5FF', border: '#A855F7', text: '#7C3AED', label: 'Destrucciones' },
  lodos:          { bg: '#FFFBEB', border: '#F59E0B', text: '#B45309', label: 'Lodos' },
  true:           { bg: '#F0FDFA', border: '#14B8A6', text: '#0F766E', label: 'TRUE' },
  biodigestores:  { bg: '#FFF7ED', border: '#F97316', text: '#C2410C', label: 'Biodigestores' },
  sustayn:        { bg: '#ECFDF5', border: '#10B981', text: '#047857', label: 'Sustayn' },
  limpieza:       { bg: '#F8FAFC', border: '#64748B', text: '#475569', label: 'Limpieza' },
};

export const INDUSTRIAS = [
  'Automotriz', 'Alimenticia', 'Abarrotes', 'Bebidas', 'Retail', 'Hotelería', 'Restaurantes',
  'Servicios', 'Pinturas / Industrial', 'Fabricación de motores', 'Equipo óptico',
  'Farmacéutica', 'Tecnología', 'Logística', 'Construcción', 'Minería', 'Otro',
];

// ═══════ KANBAN STAGES ═══════
export const KANBAN_STAGES = [
  { id: 'contacto_inicial', label: 'Lead Nuevo', color: '#6b7280', prob: '5%' },
  { id: 'presentacion', label: 'Reunión', color: '#0D47A1', prob: '20%' },
  { id: 'levantamiento', label: 'Levantamiento', color: '#F57C00', prob: '35%' },
  { id: 'propuesta', label: 'Propuesta', color: '#00a8a8', prob: '50%' },
  { id: 'negociacion', label: 'Negociación', color: '#7C3AED', prob: '70%' },
  { id: 'cierre_ganado', label: 'Socio Ambiental', color: '#2E7D32', prob: '100%' },
] as const;

export const HUB_KANBAN_STAGES = [
  { id: 'contacto_inicial', label: 'Lead', color: '#6b7280' },
  { id: 'presentacion', label: 'Prospecto', color: '#0D47A1' },
  { id: 'levantamiento', label: 'Reunión', color: '#F57C00' },
  { id: 'propuesta', label: 'Levantamiento', color: '#00a8a8' },
  { id: 'negociacion', label: 'Propuesta', color: '#7C3AED' },
  { id: 'cierre_ganado', label: 'Socio Ambiental', color: '#2E7D32' },
] as const;

export const STAGE_PROBABILITY: Record<string, number> = {
  contacto_inicial: 0.05,
  presentacion: 0.20,
  levantamiento: 0.35,
  propuesta: 0.50,
  negociacion: 0.70,
  cierre_ganado: 1.0,
  cierre_perdido: 0,
};

// ═══════ KPI METAS ═══════
export const KPI_METAS: Record<string, { meta: number; frecuencia: string; label: string; peso: number }> = {
  leadsNuevos: { meta: 5, frecuencia: 'semanal', label: 'Leads Nuevos', peso: 0.20 },
  reunionesAgendadas: { meta: 2, frecuencia: 'semanal', label: 'Reuniones Agendadas', peso: 0.25 },
  levantamientos: { meta: 2, frecuencia: 'mensual', label: 'Levantamientos', peso: 0.30 },
  propuestasEnviadas: { meta: 0, frecuencia: 'semanal', label: 'Propuestas Enviadas', peso: 0.25 },
  propuestasRechazadas: { meta: 0, frecuencia: 'semanal', label: 'Propuestas Rechazadas', peso: 0 },
};

// ═══════ MOTIVOS RECHAZO ═══════
export const MOTIVOS_RECHAZO = [
  { id: 1, motivo: 'Precios no competitivos', categoria: 'Comercial' },
  { id: 2, motivo: 'Tardanza en entregar propuesta', categoria: 'Proceso' },
  { id: 3, motivo: 'No tienen destinos finales suficientes', categoria: 'Operativo' },
  { id: 4, motivo: 'No pueden hacer recolecciones diarias', categoria: 'Operativo' },
  { id: 5, motivo: 'Cliente se queda con proveedor actual', categoria: 'Competencia' },
  { id: 6, motivo: 'Falta de permisos/documentos', categoria: 'Legal' },
  { id: 7, motivo: 'Muy poco material (< 10 ton)', categoria: 'Viabilidad' },
  { id: 8, motivo: 'Otro (especificar)', categoria: 'Otro' },
];

export const RECHAZO_CATEGORIES: Record<string, {
  id: string; label: string; color: string; bgColor: string; borderColor: string;
  recoverable: boolean; defaultFollowUpDays: number;
  suggestedActions: string[];
  followUpQuestion: string;
}> = {
  pricing: {
    id: 'pricing', label: 'Precios', color: '#F59E0B', bgColor: '#FFFBEB', borderColor: '#F59E0B',
    recoverable: true, defaultFollowUpDays: 180,
    suggestedActions: [
      'Investigar fecha de vencimiento de contrato actual',
      'Preparar contrapropuesta con precios revisados',
      'Solicitar desglose de precios del competidor',
      'Agendar re-contacto al cierre de su ejercicio fiscal',
    ],
    followUpQuestion: 'Cuando vence el contrato actual del cliente?',
  },
  proposal: {
    id: 'proposal', label: 'Propuesta', color: '#3B82F6', bgColor: '#EFF6FF', borderColor: '#3B82F6',
    recoverable: true, defaultFollowUpDays: 90,
    suggestedActions: [
      'Solicitar retroalimentacion detallada sobre propuesta',
      'Rediseñar propuesta con enfoque diferente',
      'Identificar que ofrecia el competidor ganador',
      'Re-contactar con nueva propuesta de valor',
    ],
    followUpQuestion: 'Que mejorarias de la propuesta para re-intentar?',
  },
  operational: {
    id: 'operational', label: 'Operativo', color: '#6b7280', bgColor: '#f3f4f6', borderColor: '#6b7280',
    recoverable: false, defaultFollowUpDays: 365,
    suggestedActions: [
      'Verificar si ya se tiene proveeduria en la zona',
      'Evaluar viabilidad con nuevas rutas o alianzas',
      'Monitorear expansion de cobertura propia',
    ],
    followUpQuestion: 'Ya se tiene cobertura o proveeduria en esa zona?',
  },
};

export const RECOVERY_STATES: Record<string, { id: string; label: string; color: string; bg: string; icon: string; order: number }> = {
  sin_seguimiento: { id: 'sin_seguimiento', label: 'Sin seguimiento', color: '#EF4444', bg: '#FEF2F2', icon: 'AlertCircle', order: 0 },
  en_seguimiento: { id: 'en_seguimiento', label: 'En seguimiento', color: '#F59E0B', bg: '#FFFBEB', icon: 'Clock', order: 1 },
  re_contactada: { id: 're_contactada', label: 'Re-contactada', color: '#3B82F6', bg: '#EFF6FF', icon: 'PhoneCall', order: 2 },
  recuperada: { id: 'recuperada', label: 'Recuperada', color: '#22C55E', bg: '#F0FDF4', icon: 'CheckCircle', order: 3 },
};

// ═══════ PRESUPUESTO ═══════
export const MONTH_LABELS = [
  { mes: 'Ene', mesNum: 1 }, { mes: 'Feb', mesNum: 2 }, { mes: 'Mar', mesNum: 3 },
  { mes: 'Abr', mesNum: 4 }, { mes: 'May', mesNum: 5 }, { mes: 'Jun', mesNum: 6 },
  { mes: 'Jul', mesNum: 7 }, { mes: 'Ago', mesNum: 8 }, { mes: 'Sep', mesNum: 9 },
  { mes: 'Oct', mesNum: 10 }, { mes: 'Nov', mesNum: 11 }, { mes: 'Dic', mesNum: 12 },
];

export const COLORS_INNOVATIVE = {
  primary: '#00a8a8',
  secondary: '#008080',
  accent: '#00b3b3',
  blue: '#008080',
  lightBlue: '#5FA8D3',
  gray: '#f3f4f6',
  darkGray: '#1c2c4a',
  borderGray: '#e5e7eb',
  textGray: '#6b7280',
};

export const COLORS_CHART = ['#00a8a8', '#0D47A1', '#008080', '#F57C00', '#2E7D32'];

// ═══════ HELPER FUNCTIONS ═══════

export const timeAgo = (dateStr: string | null | undefined): string | null => {
  if (!dateStr) return null;
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'hoy';
  if (diffDays === 0) return 'hoy';
  if (diffDays === 1) return '1d';
  if (diffDays < 7) return `${diffDays}d`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}sem`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}m`;
  return `${Math.floor(diffDays / 365)}a`;
};

export const urgencyColor = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '#9ca3af';
  const diffDays = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 7) return '#22C55E';
  if (diffDays <= 21) return '#F59E0B';
  if (diffDays <= 45) return '#F97316';
  return '#EF4444';
};

export const estimarFechaProspecto = (p: any): string | null => {
  return p.fecha || null;
};

export const getScoreColor = (score: number) => {
  if (score >= 110) return { bg: '#1B5E20', bgLight: 'rgba(27,94,32,0.10)', text: '#1B5E20', label: 'Destacado' };
  if (score >= 90) return { bg: '#2E7D32', bgLight: 'rgba(46,125,50,0.10)', text: '#2E7D32', label: 'En Meta' };
  if (score >= 70) return { bg: '#F57C00', bgLight: 'rgba(245,124,0,0.10)', text: '#F57C00', label: 'En Riesgo' };
  return { bg: '#EF4444', bgLight: 'rgba(239,68,68,0.10)', text: '#EF4444', label: 'Fuera de Meta' };
};

export const getBarColor = (pct: number): string => {
  if (pct >= 110) return '#1B5E20';
  if (pct >= 90) return '#2E7D32';
  if (pct >= 70) return '#F57C00';
  return '#EF4444';
};

export const calcularWeightedPipeline = (prospectos: any[]): number => {
  return prospectos.reduce((sum, p) => {
    const valor = p.propuesta?.ventaTotal || p.facturacionEstimada || 0;
    const prob = STAGE_PROBABILITY[p.status] || 0.05;
    return sum + (valor * prob);
  }, 0);
};

export const calcularWinRate = (prospectos: any[]): number => {
  const ganadas = prospectos.filter(p => p.status === 'cierre_ganado').length;
  const perdidas = prospectos.filter(p => p.status === 'cierre_perdido').length;
  const total = ganadas + perdidas;
  return total > 0 ? ((ganadas / total) * 100) : 0;
};

export const calcularPipelineVelocity = (prospectos: any[]): number => {
  const oportunidadesActivas = prospectos.filter(p =>
    !['cierre_perdido', 'cierre_ganado'].includes(p.status)
  );
  const numOpps = oportunidadesActivas.length;
  const avgDeal = numOpps > 0
    ? oportunidadesActivas.reduce((sum, p) => sum + (p.propuesta?.ventaTotal || p.facturacionEstimada || 0), 0) / numOpps
    : 0;
  const winRate = calcularWinRate(prospectos) / 100;
  const avgCycleDays = 45;
  return avgCycleDays > 0 ? (numOpps * avgDeal * winRate) / avgCycleDays : 0;
};

export const esProspectoCalificado = (lead: any): boolean => {
  return !!(lead.empresa && lead.industria && lead.contacto?.nombre && lead.contacto?.puesto && lead.contacto?.correo && lead.contacto?.telefono);
};

export const camposFaltantes = (lead: any): string[] => {
  const faltantes: string[] = [];
  if (!lead.empresa) faltantes.push('Empresa');
  if (!lead.industria) faltantes.push('Industria');
  if (!lead.contacto?.nombre) faltantes.push('Nombre contacto');
  if (!lead.contacto?.puesto) faltantes.push('Puesto');
  if (!lead.contacto?.correo) faltantes.push('Correo');
  if (!lead.contacto?.telefono) faltantes.push('Celular');
  return faltantes;
};

export const dbProspectToKanban = (prospect: any, usersMap: Record<number, any> = {}): any => {
  const user = usersMap[prospect.assignedToId];
  const ejecutivoCode = user?.codigo || (user?.name ? user.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : '');
  return {
    id: prospect.id,
    empresa: prospect.name,
    planta: null,
    ciudad: prospect.location || null,
    industria: prospect.industry || null,
    ejecutivo: ejecutivoCode,
    assignedToId: prospect.assignedToId,
    contacto: {
      nombre: prospect.contactName || '',
      puesto: prospect.contactRole || '',
      correo: prospect.contactEmail || '',
      telefono: prospect.contactPhone || '',
    },
    servicios: prospect.services || [],
    status: prospect.stage,
    semana: null,
    fecha: prospect.createdAt ? new Date(prospect.createdAt).toISOString().split('T')[0] : null,
    propuesta: {
      status: null,
      ventaTotal: prospect.estimatedValue ? Number(prospect.estimatedValue) : null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: prospect.rejectionDetail || null,
    comentarios: prospect.reason || prospect.nextStep || '',
    volumenEstimado: prospect.estimatedVolume || null,
    facturacionEstimada: prospect.estimatedValue ? Number(prospect.estimatedValue) : null,
    fuente: prospect.source || 'otro',
    fechaSeguimiento: prospect.nextFollowUpAt ? new Date(prospect.nextFollowUpAt).toISOString().split('T')[0] : null,
    followUpAction: prospect.followUpAction || null,
    recoveryStatus: prospect.recoveryStatus || null,
    fechaVencimientoContrato: prospect.fechaVencimientoContrato ? new Date(prospect.fechaVencimientoContrato).toISOString().split('T')[0] : null,
    levantamientoData: prospect.levantamientoData || null,
    serviceVolumes: prospect.serviceVolumes || {},
    potential: prospect.potential || null,
    probability: prospect.probability ?? null,
    priority: prospect.priority || null,
    nextStep: prospect.nextStep || null,
    reason: prospect.reason || null,
    estimatedCloseTime: prospect.estimatedCloseTime || null,
  };
};

export const calcularPipelineData = (prospectos: any[]) => {
  const stages = ['contacto_inicial', 'presentacion', 'levantamiento', 'propuesta', 'negociacion', 'cierre_ganado'];
  const labels: Record<string, string> = { contacto_inicial: 'Lead nuevo', presentacion: 'Reunión', levantamiento: 'Levantamiento', propuesta: 'Propuesta', negociacion: 'Negociación', cierre_ganado: 'Socio Ambiental' };
  const objetivos: Record<string, number> = { contacto_inicial: 50, presentacion: 30, levantamiento: 20, propuesta: 15, negociacion: 10, cierre_ganado: 5 };
  return stages.map(stage => {
    const items = prospectos.filter(p => p.status === stage);
    return {
      etapa: labels[stage] || stage,
      cantidad: items.length,
      valor: items.reduce((sum, p) => sum + (p.propuesta?.ventaTotal || p.facturacionEstimada || 0), 0),
      objetivo: objetivos[stage] || 5,
    };
  });
};

export const calcularCamposCompletos = (p: any) => {
  return [
    { label: 'Empresa', ok: !!p.empresa },
    { label: 'Industria', ok: !!p.industria },
    { label: 'Contacto', ok: !!p.contacto?.nombre },
    { label: 'Puesto', ok: !!p.contacto?.puesto },
    { label: 'Correo', ok: !!p.contacto?.correo },
    { label: 'Servicios', ok: !!(p.servicios?.length > 0) },
    { label: 'Ciudad', ok: !!p.ciudad },
    { label: 'Tipos de residuos', ok: !!p.tiposResiduos },
    { label: 'Volumen estimado', ok: !!p.volumenEstimado },
  ];
};

export const getRecoveryState = (seg: any) => {
  if (!seg) return RECOVERY_STATES.sin_seguimiento;
  if (seg.recoveryStatus === 're_contactada') return RECOVERY_STATES.re_contactada;
  if (seg.fechaSeguimiento) return RECOVERY_STATES.en_seguimiento;
  return RECOVERY_STATES.sin_seguimiento;
};

export const classifyRechazo = (motivoRechazo: string | null | undefined) => {
  if (!motivoRechazo) return RECHAZO_CATEGORIES.operational;
  const lower = motivoRechazo.toLowerCase();
  if (lower.includes('precio') || lower.includes('competitivo') || lower.includes('costo') || lower.includes('elevado')) return RECHAZO_CATEGORIES.pricing;
  if (lower.includes('propuesta') || lower.includes('expectativa') || lower.includes('demora') || lower.includes('eligieron') || lower.includes('suficientemente')) return RECHAZO_CATEGORIES.proposal;
  if (lower.includes('proveedur') || lower.includes('zona') || lower.includes('viable') || lower.includes('declinamos')) return RECHAZO_CATEGORIES.operational;
  return RECHAZO_CATEGORIES.operational;
};

export const getSeguimientoUrgency = (seg: any) => {
  if (!seg?.fechaSeguimiento) return null;
  const today = new Date();
  const target = new Date(seg.fechaSeguimiento);
  const diffDays = Math.floor((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: `Vencido ${Math.abs(diffDays)}d`, color: '#EF4444', bg: '#FEF2F2', overdue: true, days: Math.abs(diffDays) };
  if (diffDays === 0) return { label: 'Hoy', color: '#EF4444', bg: '#FEF2F2', overdue: false, days: 0 };
  if (diffDays <= 7) return { label: `${diffDays}d`, color: '#F59E0B', bg: '#FFFBEB', overdue: false, days: diffDays };
  if (diffDays <= 30) return { label: `${Math.floor(diffDays / 7)}sem`, color: '#22C55E', bg: '#F0FDF4', overdue: false, days: diffDays };
  return { label: `${Math.floor(diffDays / 30)}m`, color: '#6b7280', bg: '#f3f4f6', overdue: false, days: diffDays };
};

// ═══════ TAB UNLOCK BY STAGE ═══════
export const TAB_UNLOCK_STAGE: Record<string, string> = {
  info: 'contacto_inicial',
  timeline: 'contacto_inicial',
  notas: 'contacto_inicial',
  reuniones: 'presentacion',
  levantamiento: 'levantamiento',
  docs: 'levantamiento',
  propuestas: 'propuesta',
};

const STAGE_ORDER = ['contacto_inicial', 'presentacion', 'levantamiento', 'propuesta', 'negociacion', 'cierre_ganado'];

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
  if (!requiredStage) return '';
  const stage = KANBAN_STAGES.find(s => s.id === requiredStage);
  return stage?.label || requiredStage;
}

// ═══════ STAGE GATES ═══════
export interface GateMissingField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'services';
  placeholder?: string;
}

export const STAGE_GATES: Record<string, {
  label: string;
  validate: (p: any) => boolean;
  message: (p: any) => string;
  requirement: string;
  /** Returns fields the user can fill inline to pass the gate. Empty = use special flow (e.g. QualifyLeadDialog) */
  missingFields: (p: any) => GateMissingField[];
}> = {
  presentacion: {
    label: 'Lead Calificado',
    validate: (p) => esProspectoCalificado(p),
    message: () => 'Usa "Calificar" en el detalle del lead para completar datos',
    requirement: 'Requiere: Calificar lead con datos de negocio',
    // Gate 'presentacion' uses QualifyLeadDialog for lead→prospect conversion logic
    missingFields: () => [],
  },
  levantamiento: {
    label: 'Volumen Verificado',
    validate: (p) => !!(p.volumenEstimado || p.facturacionEstimada),
    message: () => 'Falta volumen estimado o facturación estimada',
    requirement: 'Requiere: Volumen estimado o Facturación estimada',
    missingFields: (p) => [
      ...(!p.volumenEstimado ? [{ key: 'estimatedVolume', label: 'Volumen estimado', type: 'text' as const, placeholder: 'Ej: 120 ton/mes' }] : []),
      ...(!p.facturacionEstimada && !p.volumenEstimado ? [{ key: 'estimatedValue', label: 'Facturación estimada ($)', type: 'number' as const, placeholder: '0.00' }] : []),
    ],
  },
  propuesta: {
    label: 'Levantamiento Completado',
    validate: (p) => !!(p.volumenEstimado && (p.servicios?.length > 0)),
    message: (p) => `Completa: ${[!p.volumenEstimado && 'volumen estimado', !p.servicios?.length && 'servicios seleccionados'].filter(Boolean).join(', ')}`,
    requirement: 'Requiere: Volumen + Servicios',
    missingFields: (p) => [
      ...(!p.volumenEstimado ? [{ key: 'estimatedVolume', label: 'Volumen estimado', type: 'text' as const, placeholder: 'Ej: 120 ton/mes' }] : []),
      ...(!(p.servicios?.length > 0) ? [{ key: 'services', label: 'Servicios', type: 'services' as const }] : []),
    ],
  },
  negociacion: {
    label: 'Propuesta Acusada',
    validate: (p) => !!(p.propuesta?.ventaTotal || p.facturacionEstimada),
    message: () => 'Falta monto de propuesta o facturación estimada',
    requirement: 'Requiere: Monto de propuesta definido',
    missingFields: (p) => [
      ...(!p.facturacionEstimada && !p.propuesta?.ventaTotal ? [{ key: 'estimatedValue', label: 'Valor estimado ($)', type: 'number' as const, placeholder: '0.00' }] : []),
    ],
  },
};

// ═══════ SHARED COMPONENTS ═══════

export function ExecutiveAvatar({ codigo, name, size = 'md', className = '' }: {
  codigo: string; name?: string; size?: string; className?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const src = `/avatars/${codigo.toLowerCase()}.jpg`;
  const sizeClasses: Record<string, string> = {
    xs: 'w-7 h-7 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-9 h-9 text-xs',
    lg: 'w-10 h-10 text-xs',
    xl: 'w-12 h-12 text-lg',
    '2xl': 'w-16 h-16 text-2xl',
  };
  const s = sizeClasses[size] || sizeClasses.md;
  const fallback = name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : codigo;

  if (imgError) {
    return (
      <div className={`${s} rounded-full bg-gradient-to-br from-[#00a8a8] to-[#0D47A1] flex items-center justify-center text-white font-bold flex-shrink-0 shadow-sm ${className}`}>
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

export function SectionHeader({ color, icon: Icon, label, linkLabel, onLinkClick }: {
  color: string;
  icon: React.ComponentType<any>;
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
        <button onClick={onLinkClick} className="ml-auto text-xs font-medium flex items-center gap-1 hover:underline" style={{ color }}>
          {linkLabel} <ChevronRight size={14} />
        </button>
      )}
    </div>
  );
}
