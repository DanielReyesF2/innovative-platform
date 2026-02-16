import React, { useState, useEffect, useRef, useCallback } from 'react';
import { QueryClientProvider, useQuery } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { AuthProvider, useAuth } from '@/lib/auth';
import { Toaster } from '@/components/ui/toaster';
import LoginPage from '@/features/auth/page';
// CRM Components
import { ProspectTimeline } from '@/features/comercial/components/ProspectTimeline';
import { ProspectNotes } from '@/features/comercial/components/ProspectNotes';
import { ProspectMeetings } from '@/features/comercial/components/ProspectMeetings';
import { ProspectDocuments } from '@/features/comercial/components/ProspectDocuments';
import { ProspectProposals } from '@/features/comercial/components/ProspectProposals';
import { BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, ReferenceLine, RadialBarChart, RadialBar } from 'recharts';
import { ResponsiveSankey } from '@nivo/sankey';
import { ResponsiveFunnel } from '@nivo/funnel';
import { ResponsiveBar } from '@nivo/bar';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay, useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import html2canvas from 'html2canvas';
import { Home, TrendingUp, Package, Users, FileText, Settings, ChevronRight, Download, Search, Filter, Bell, LogOut, Menu, X, DollarSign, Target, PhoneCall, Award, Calendar, MapPin, Truck, Leaf, Briefcase, ClipboardList, CheckSquare, AlertCircle, Send, Eye, Recycle, Trash2, BarChart3, TrendingDown, ChevronDown, ChevronUp, Save, FileImage, RotateCcw, Building2, GripVertical, Lock, Unlock, ArrowRight, Plus, ArrowLeft, Upload, Paperclip, MessageSquare, Clock, Image, Phone, Mail, ExternalLink, Copy, Check, XCircle, CheckCircle } from 'lucide-react';

// AVATAR COMPONENT — muestra foto del ejecutivo con fallback a iniciales
const ExecutiveAvatar = ({ codigo, name, size = 'md', className = '' }) => {
  const [imgError, setImgError] = React.useState(false);
  const src = `/avatars/${codigo.toLowerCase()}.jpg`;
  const sizeClasses = {
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
};

// SERVICIOS INNOVATIVE
const SERVICIOS_INNOVATIVE = [
  { id: 'rme', nombre: 'RME', descripcion: 'Residuos de Manejo Especial' },
  { id: 'rsu', nombre: 'RSU', descripcion: 'Residuos Sólidos Urbanos' },
  { id: 'organicos', nombre: 'R.Orgánicos', descripcion: 'Alimentos y Poda' },
  { id: 'rp_rpbi', nombre: 'RP y RPBI', descripcion: 'Residuos Peligrosos y Biológico-Infecciosos' },
  { id: 'destrucciones', nombre: 'Destrucciones Fiscales', descripcion: 'Destrucción fiscal certificada' },
  { id: 'lodos', nombre: 'Lodos', descripcion: 'Lodos de planta de tratamiento' },
  { id: 'true', nombre: 'Certificación TRUE', descripcion: 'Total Resource Use and Efficiency' },
  { id: 'biodigestores', nombre: 'Biodigestores', descripcion: 'Digestión anaerobia de orgánicos' },
  { id: 'sustayn', nombre: 'Sustayn', descripcion: 'Plataforma de sustentabilidad' },
  { id: 'limpieza', nombre: 'Limpieza Especializada', descripcion: 'Servicios de limpieza industrial' }
];

// Antigüedad helper — calcula "hace X días/sem/meses" desde una fecha
const timeAgo = (dateStr) => {
  if (!dateStr) return null;
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'hoy';
  if (diffDays === 0) return 'hoy';
  if (diffDays === 1) return '1d';
  if (diffDays < 7) return `${diffDays}d`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}sem`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}m`;
  return `${Math.floor(diffDays / 365)}a`;
};

// Color de urgencia basado en días sin actividad
const urgencyColor = (dateStr) => {
  if (!dateStr) return '#9ca3af';
  const diffDays = Math.floor((new Date() - new Date(dateStr)) / (1000 * 60 * 60 * 24));
  if (diffDays <= 7) return '#22C55E'; // verde — reciente
  if (diffDays <= 21) return '#F59E0B'; // amarillo — hay que dar seguimiento
  if (diffDays <= 45) return '#F97316'; // naranja — atención
  return '#EF4444'; // rojo — urgente, mucho tiempo sin tocar
};

// Fecha estimada para prospectos sin fecha — basada en patrones conocidos de captación
const estimarFechaProspecto = (p) => {
  if (p.fecha) return p.fecha;
  // Carmen (CR) leads nuevos captados progresivamente sep 2025 - feb 2026
  if (p.ejecutivo === 'CR') {
    if (p.id <= 110) return '2025-09-15';
    if (p.id <= 120) return '2025-10-15';
    if (p.id <= 131) return '2025-11-15';
    return '2025-12-15';
  }
  // Otros ejecutivos — leads viejos creados jul-ago 2025
  if (p.status === 'Lead nuevo') return '2025-08-01';
  if (p.status === 'Reunión agendada') return '2025-09-01';
  return '2025-10-01';
};

// Color mapping for service types — subtle backgrounds + accents for Kanban cards
const SERVICE_COLORS = {
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

// INDUSTRIAS ESTÁNDAR
const INDUSTRIAS = [
  'Automotriz', 'Alimenticia', 'Bebidas', 'Retail', 'Hotelería', 'Restaurantes',
  'Servicios', 'Pinturas / Industrial', 'Fabricación de motores', 'Equipo óptico',
  'Farmacéutica', 'Tecnología', 'Logística', 'Construcción', 'Minería', 'Otro'
];

// KPIs METAS SEMANALES POR EJECUTIVO
const KPI_METAS = {
  leadsNuevos: { meta: 5, frecuencia: 'semanal', label: 'Leads Nuevos', peso: 0.20 },
  reunionesAgendadas: { meta: 2, frecuencia: 'semanal', label: 'Reuniones Agendadas', peso: 0.25 },
  levantamientos: { meta: 2, frecuencia: 'mensual', label: 'Levantamientos', peso: 0.30 },
  propuestasEnviadas: { meta: 0, frecuencia: 'semanal', label: 'Propuestas Enviadas', peso: 0.25 },
  propuestasRechazadas: { meta: 0, frecuencia: 'semanal', label: 'Propuestas Rechazadas', peso: 0 }
};

// 4-tier RAG color system for KPI scores
const getScoreColor = (score) => {
  if (score >= 110) return { bg: '#1B5E20', bgLight: 'rgba(27,94,32,0.10)', text: '#1B5E20', label: 'Destacado' };
  if (score >= 90) return { bg: '#2E7D32', bgLight: 'rgba(46,125,50,0.10)', text: '#2E7D32', label: 'En Meta' };
  if (score >= 70) return { bg: '#F57C00', bgLight: 'rgba(245,124,0,0.10)', text: '#F57C00', label: 'En Riesgo' };
  return { bg: '#EF4444', bgLight: 'rgba(239,68,68,0.10)', text: '#EF4444', label: 'Fuera de Meta' };
};

const getBarColor = (pct) => {
  if (pct >= 110) return '#1B5E20';
  if (pct >= 90) return '#2E7D32';
  if (pct >= 70) return '#F57C00';
  return '#EF4444';
};

// Weighted score calculation
const calcularScorePonderado = (ultimaSemana) => {
  if (!ultimaSemana) return 0;
  const kpiKeys = Object.keys(KPI_METAS);
  let totalPeso = 0;
  let scorePonderado = 0;
  kpiKeys.forEach(k => {
    if (KPI_METAS[k].meta > 0) {
      const real = ultimaSemana[k] || 0;
      const cumplimiento = Math.min((real / KPI_METAS[k].meta) * 100, 150); // cap 150%
      scorePonderado += cumplimiento * KPI_METAS[k].peso;
      totalPeso += KPI_METAS[k].peso;
    }
  });
  return totalPeso > 0 ? scorePonderado / totalPeso : 0;
};

// SVG Sparkline component (zero dependencies)
const Sparkline = ({ data, width = 80, height = 24, color = '#00a8a8' }) => {
  if (!data || data.length < 2) return <span className="text-[10px] text-[#9ca3af]">Sin datos</span>;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((v, i) =>
    `${(i / (data.length - 1)) * width},${height - 2 - ((v - min) / range) * (height - 4)}`
  ).join(' ');
  const lastY = height - 2 - ((data[data.length - 1] - min) / range) * (height - 4);
  const areaPoints = `0,${height} ${points} ${width},${height}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polygon points={areaPoints} fill={`${color}15`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={width} cy={lastY} r="2.5" fill={color} />
    </svg>
  );
};

// Pace calculation: ahead/behind based on time elapsed
const calcularPace = (real, meta, frecuencia) => {
  if (meta <= 0) return null;
  const now = new Date();
  let expected;
  if (frecuencia === 'mensual') {
    const day = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    expected = (day / daysInMonth) * meta;
  } else {
    // semanal: lun=1 ... vie=5
    const dow = now.getDay();
    const businessDays = dow === 0 ? 5 : dow === 6 ? 5 : dow; // sat/sun = full week
    expected = (businessDays / 5) * meta;
  }
  return real - expected;
};

// PROBABILIDADES POR STAGE (mejores prácticas CRM B2B)
const STAGE_PROBABILITY = {
  'Lead nuevo': 0.05,
  'Reunión agendada': 0.20,
  'Levantamiento': 0.35,
  'Propuesta enviada': 0.50,
  'Negociación': 0.70,
  'Inicio de operación': 1.0,
  'Propuesta Rechazada': 0,
  'Licitación pendiente': 0.30,
  'Contacto inicial': 0.10,
  'Sin respuesta': 0.05,
};

// FUNCIÓN: Calcular Pipeline Ponderado (Weighted Pipeline Value)
const calcularWeightedPipeline = (prospectos) => {
  return prospectos.reduce((sum, p) => {
    const valor = p.propuesta?.ventaTotal || p.facturacionEstimada || 0;
    const prob = STAGE_PROBABILITY[p.status] || 0.05;
    return sum + (valor * prob);
  }, 0);
};

// FUNCIÓN: Calcular Win Rate
const calcularWinRate = (prospectos) => {
  const ganadas = prospectos.filter(p => p.status === 'Inicio de operación').length;
  const perdidas = prospectos.filter(p => p.status === 'Propuesta Rechazada').length;
  const total = ganadas + perdidas;
  return total > 0 ? ((ganadas / total) * 100) : 0;
};

// FUNCIÓN: Calcular Pipeline Velocity (MXN/día)
const calcularPipelineVelocity = (prospectos) => {
  const oportunidadesActivas = prospectos.filter(p =>
    !['Propuesta Rechazada', 'Inicio de operación'].includes(p.status)
  );
  const numOpps = oportunidadesActivas.length;
  const avgDeal = numOpps > 0
    ? oportunidadesActivas.reduce((sum, p) => sum + (p.propuesta?.ventaTotal || p.facturacionEstimada || 0), 0) / numOpps
    : 0;
  const winRate = calcularWinRate(prospectos) / 100;
  const avgCycleDays = 45; // Ciclo promedio estimado en días para residuos industriales
  return avgCycleDays > 0 ? (numOpps * avgDeal * winRate) / avgCycleDays : 0;
};

// FUNCIÓN: Determina si un lead califica como "Prospecto"
const esProspectoCalificado = (lead) => {
  return !!(lead.empresa && lead.industria && lead.contacto?.nombre && lead.contacto?.puesto && lead.contacto?.correo);
};

// FUNCIÓN: Campos faltantes para ser prospecto
const camposFaltantes = (lead) => {
  const faltantes = [];
  if (!lead.empresa) faltantes.push('Empresa');
  if (!lead.industria) faltantes.push('Industria');
  if (!lead.contacto?.nombre) faltantes.push('Nombre contacto');
  if (!lead.contacto?.puesto) faltantes.push('Puesto');
  if (!lead.contacto?.correo) faltantes.push('Correo');
  return faltantes;
};

// BASE DE DATOS REAL DE PROSPECTOS/LEADS - DATOS DEL EXCEL LEADS + MARIANA + LAURA MESA
const topProspectos = [
  // ==========================================================================
  // VERO ALVARADO (VA) LEADS - IDs 1-20
  // ==========================================================================
  {
    id: 1,
    empresa: 'Liverpool Plan',
    planta: null,
    ciudad: 'CDMX',
    industria: 'Retail',
    ejecutivo: 'VA',
    contacto: {
      nombre: 'Gabriela Cisnero',
      puesto: 'Coordinadora Sustentabilidad',
      correo: 'agcisnerosc@liverpool.com.mx',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Propuesta enviada',
    semana: null,
    fecha: null,
    propuesta: {
      status: 'Aceptada',
      ventaTotal: 1358778,
      utilidad: 0.107,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 2,
    empresa: 'DHL',
    planta: null,
    ciudad: 'Edo Mex',
    industria: 'Logística',
    ejecutivo: 'VA',
    contacto: {
      nombre: 'Marco Pardines',
      puesto: 'DHL Purchasing Buyer México',
      correo: 'Marco.Pardinesc@dhl.com',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Propuesta enviada',
    semana: null,
    fecha: '2025-07-25',
    propuesta: {
      status: null,
      ventaTotal: 158785,
      utilidad: 0.111,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 3,
    empresa: 'BRINCO',
    planta: null,
    ciudad: 'CDMX',
    industria: 'Retail',
    ejecutivo: 'VA',
    contacto: {
      nombre: 'David Mizrahi',
      puesto: 'Owner',
      correo: 'dmizd@brinco.com.mx',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Propuesta enviada',
    semana: null,
    fecha: '2025-07-01',
    propuesta: {
      status: 'Aceptada',
      ventaTotal: 163255,
      utilidad: 0.064,
      carton: 2000,
      playo: 1000,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 4,
    empresa: 'BIMBO MARINELA',
    planta: 'Marinela',
    ciudad: 'CDMX',
    industria: 'Alimenticia',
    ejecutivo: 'VA',
    contacto: {
      nombre: 'Jesus Efrain Orozco',
      puesto: 'Indirect Procurement',
      correo: 'jesus.orozco01@grupobimbo.com',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Propuesta enviada',
    semana: null,
    fecha: '2025-07-25',
    propuesta: {
      status: null,
      ventaTotal: 1195906,
      utilidad: 0.202,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 5,
    empresa: 'BIMBO AZCAPOTZALCO',
    planta: 'Azcapotzalco',
    ciudad: 'CDMX',
    industria: 'Alimenticia',
    ejecutivo: 'VA',
    contacto: {
      nombre: 'Jesus Efrain Orozco',
      puesto: 'Indirect Procurement',
      correo: 'jesus.orozco01@grupobimbo.com',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Propuesta enviada',
    semana: null,
    fecha: '2025-07-25',
    propuesta: {
      status: null,
      ventaTotal: 259902,
      utilidad: 0.073,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 6,
    empresa: 'BIMBO LERMA',
    planta: 'Lerma',
    ciudad: 'Edo Mex',
    industria: 'Alimenticia',
    ejecutivo: 'VA',
    contacto: {
      nombre: 'Lucia Baeza',
      puesto: 'Sup. Legal de Sustentabilidad',
      correo: 'lucia.baeza@grupobimbo.com',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Propuesta enviada',
    semana: null,
    fecha: '2025-08-18',
    propuesta: {
      status: null,
      ventaTotal: 376213,
      utilidad: 0.14,
      carton: 20000,
      playo: 842,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 7,
    empresa: 'BIMBO METROPOLITANO',
    planta: 'Metropolitano',
    ciudad: 'CDMX',
    industria: 'Alimenticia',
    ejecutivo: 'VA',
    contacto: {
      nombre: 'Alan Avendaño',
      puesto: 'Ingenieria CDM',
      correo: 'alan.avendano01@grupobimbo.com',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Propuesta enviada',
    semana: null,
    fecha: '2025-08-18',
    propuesta: {
      status: null,
      ventaTotal: 160752,
      utilidad: 0.188,
      carton: 3444,
      playo: 7630,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 8,
    empresa: 'JLL',
    planta: null,
    ciudad: 'CDMX',
    industria: 'Servicios',
    ejecutivo: 'VA',
    contacto: {
      nombre: 'Valeria Grimaldo',
      puesto: 'Facilities Coordinator',
      correo: 'Valeria.Bernal@jll.com',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Rechazada',
    semana: null,
    fecha: '2025-07-25',
    propuesta: {
      status: 'Rechazada',
      ventaTotal: 57721,
      utilidad: 0.142,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 9,
    empresa: 'GRUPO PEÑAFIEL TECAMAC',
    planta: 'Tecamac',
    ciudad: 'Edo Mex',
    industria: 'Bebidas',
    ejecutivo: 'VA',
    contacto: {
      nombre: 'Alin Rodriguez',
      puesto: '',
      correo: 'AlinMariana.Rodriguez@kdrp.com',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Propuesta enviada',
    semana: null,
    fecha: '2025-07-28',
    propuesta: {
      status: null,
      ventaTotal: 924336,
      utilidad: 0.22,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 10,
    empresa: 'DPWORLD',
    planta: null,
    ciudad: 'CDMX',
    industria: 'Logística',
    ejecutivo: 'VA',
    contacto: {
      nombre: 'Manuel Hernandez',
      puesto: 'Procurement Manager',
      correo: 'manuel.hernandez@dpworld.com',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Propuesta enviada',
    semana: null,
    fecha: '2025-07-07',
    propuesta: {
      status: null,
      ventaTotal: 37000,
      utilidad: 0.232,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 11,
    empresa: 'ITALIKA DESTRUCCION TOLUCA',
    planta: 'Destrucción Toluca',
    ciudad: 'Edo Mex',
    industria: 'Automotriz',
    ejecutivo: 'VA',
    contacto: {
      nombre: 'Ofelia Borjon',
      puesto: 'Analista Compras',
      correo: 'ofelia.borjon@f6p.mx',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Rechazada',
    semana: null,
    fecha: '2025-07-15',
    propuesta: {
      status: 'Rechazada',
      ventaTotal: 119100,
      utilidad: 0.207,
      carton: null,
      playo: null,
    },
    motivoRechazo: 'Demora en responder',
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 12,
    empresa: 'ITALIKA GDL',
    planta: 'Guadalajara',
    ciudad: 'Guadalajara',
    industria: 'Automotriz',
    ejecutivo: 'VA',
    contacto: {
      nombre: 'Ofelia Borjon',
      puesto: 'Analista Compras',
      correo: 'ofelia.borjon@f6p.mx',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Rechazada',
    semana: null,
    fecha: '2025-07-04',
    propuesta: {
      status: 'Rechazada',
      ventaTotal: 499,
      utilidad: 0.377,
      carton: null,
      playo: null,
    },
    motivoRechazo: 'Demora en responder',
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 13,
    empresa: 'ITALIKA LERMA',
    planta: 'Lerma',
    ciudad: 'Edo Mex',
    industria: 'Automotriz',
    ejecutivo: 'VA',
    contacto: {
      nombre: 'Ofelia Borjon',
      puesto: 'Analista Compras',
      correo: 'ofelia.borjon@f6p.mx',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Rechazada',
    semana: null,
    fecha: '2025-07-15',
    propuesta: {
      status: 'Rechazada',
      ventaTotal: 208415,
      utilidad: 0.179,
      carton: null,
      playo: null,
    },
    motivoRechazo: 'Demora en responder',
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 14,
    empresa: 'ITALIKA TOLUCA BATERIAS',
    planta: 'Toluca Baterías',
    ciudad: 'Edo Mex',
    industria: 'Automotriz',
    ejecutivo: 'VA',
    contacto: {
      nombre: 'Ofelia Borjon',
      puesto: 'Analista Compras',
      correo: 'ofelia.borjon@f6p.mx',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Rechazada',
    semana: null,
    fecha: '2025-07-08',
    propuesta: {
      status: 'Rechazada',
      ventaTotal: 7661,
      utilidad: 0.171,
      carton: null,
      playo: null,
    },
    motivoRechazo: 'Demora en responder',
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 15,
    empresa: 'HEINEKEN PUEBLA',
    planta: 'Puebla',
    ciudad: 'Puebla',
    industria: 'Bebidas',
    ejecutivo: 'VA',
    contacto: {
      nombre: 'Aidee Olvera',
      puesto: 'Venta Residuos',
      correo: 'aidee.olvera@heineken.com',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Rechazada',
    semana: null,
    fecha: '2025-07-08',
    propuesta: {
      status: 'Rechazada',
      ventaTotal: 166495,
      utilidad: 0.181,
      carton: null,
      playo: null,
    },
    motivoRechazo: 'Precios no competitivos',
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 16,
    empresa: 'HOTEL CONRAD PUNTA DE MITA',
    planta: null,
    ciudad: 'Punta de Mita',
    industria: 'Hotelería',
    ejecutivo: 'VA',
    contacto: {
      nombre: 'Miriam Flores',
      puesto: 'Purchasing Manager',
      correo: 'Miriam.Flores@ConradHotels.com',
      telefono: '',
    },
    servicios: ['biodigestores'],
    status: 'Propuesta enviada',
    semana: null,
    fecha: '2025-07-07',
    propuesta: {
      status: null,
      ventaTotal: 927480,
      utilidad: 0.238,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 17,
    empresa: 'DACOMSA',
    planta: null,
    ciudad: 'CDMX',
    industria: 'Servicios',
    ejecutivo: 'VA',
    contacto: {
      nombre: 'Giovana Lopez',
      puesto: 'Area Ambiental',
      correo: 'giovana.lopez@dacomsa.com',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Propuesta enviada',
    semana: null,
    fecha: '2025-05-14',
    propuesta: {
      status: null,
      ventaTotal: 443507,
      utilidad: 0.132,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 18,
    empresa: 'FOUR SEASONS',
    planta: null,
    ciudad: 'CDMX',
    industria: 'Hotelería',
    ejecutivo: 'VA',
    contacto: {
      nombre: 'Benjamin Ruiz',
      puesto: 'Compras',
      correo: 'bruiz@manhattanconstruction.com',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Propuesta enviada',
    semana: null,
    fecha: '2025-08-01',
    propuesta: {
      status: null,
      ventaTotal: 741000,
      utilidad: 0.221,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 19,
    empresa: 'GRUPO SALINAS',
    planta: null,
    ciudad: 'CDMX',
    industria: 'Retail',
    ejecutivo: 'VA',
    contacto: {
      nombre: '',
      puesto: '',
      correo: '',
      telefono: '',
    },
    servicios: ['biodigestores'],
    status: 'Lead nuevo',
    semana: null,
    fecha: null,
    propuesta: {
      status: 'Biodigestor',
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 20,
    empresa: 'PALLADIUM HOTEL',
    planta: null,
    ciudad: 'Riviera Maya',
    industria: 'Hotelería',
    ejecutivo: 'VA',
    contacto: {
      nombre: 'Javier Lopez',
      puesto: 'Sustentabilidad',
      correo: 'javier.lopez@palladiumhotelgroup.com',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Lead nuevo',
    semana: null,
    fecha: null,
    propuesta: {
      status: null,
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },

  // ==========================================================================
  // LAURA MESA (LM) LEADS - IDs 21-34
  // ==========================================================================
  {
    id: 21,
    empresa: 'SMART MTY',
    planta: 'Monterrey',
    ciudad: 'Monterrey',
    industria: 'Retail',
    ejecutivo: 'LM',
    contacto: {
      nombre: 'Jesus Galvan',
      puesto: 'Director de compras',
      correo: 'Jesus.Galvan@s-martmx.com',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Lead nuevo',
    semana: 31,
    fecha: null,
    propuesta: {
      status: null,
      ventaTotal: 5969026,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 22,
    empresa: 'SMART CJ',
    planta: 'Ciudad Juárez',
    ciudad: 'Ciudad Juárez',
    industria: 'Retail',
    ejecutivo: 'LM',
    contacto: {
      nombre: 'Jesus Galvan',
      puesto: 'Director de compras',
      correo: 'Jesus.Galvan@s-martmx.com',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Lead nuevo',
    semana: 31,
    fecha: null,
    propuesta: {
      status: null,
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 23,
    empresa: 'CASA LEY',
    planta: null,
    ciudad: '',
    industria: 'Retail',
    ejecutivo: 'LM',
    contacto: {
      nombre: '',
      puesto: '',
      correo: '',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Lead nuevo',
    semana: 31,
    fecha: null,
    propuesta: {
      status: null,
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 24,
    empresa: 'ALSUPER',
    planta: null,
    ciudad: '',
    industria: 'Retail',
    ejecutivo: 'LM',
    contacto: {
      nombre: 'Israel Buerba',
      puesto: 'Gerente de logistica',
      correo: 'israel.buerba@alsuper.com',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Lead nuevo',
    semana: 31,
    fecha: null,
    propuesta: {
      status: null,
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 25,
    empresa: 'OFFICE DEPOT',
    planta: null,
    ciudad: 'CDMX',
    industria: 'Retail',
    ejecutivo: 'LM',
    contacto: {
      nombre: 'Mauricio Mosquera',
      puesto: 'Gerente de logistica',
      correo: 'mmosquera@officedepot.com.mx',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Lead nuevo',
    semana: 31,
    fecha: null,
    propuesta: {
      status: null,
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: 'Lead original de Vero Excel',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 26,
    empresa: 'MERCADO LIBRE',
    planta: null,
    ciudad: 'CDMX',
    industria: 'Retail',
    ejecutivo: 'LM',
    contacto: {
      nombre: 'Federico Yanes',
      puesto: 'Gerente de compras',
      correo: 'ext_fedyanez@mercadolibre.com.mx',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Propuesta enviada',
    semana: 32,
    fecha: null,
    propuesta: {
      status: 'Aceptada',
      ventaTotal: 698000,
      utilidad: 0.231,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 27,
    empresa: '3B',
    planta: null,
    ciudad: 'CDMX',
    industria: 'Retail',
    ejecutivo: 'LM',
    contacto: {
      nombre: 'Vivian Salamanca',
      puesto: 'Subdirectora de compras',
      correo: 'vsr@tiendas3b.com',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Reunión agendada',
    semana: 32,
    fecha: null,
    propuesta: {
      status: null,
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 28,
    empresa: 'CHROMALOX',
    planta: null,
    ciudad: 'CDMX',
    industria: 'Fabricación de motores',
    ejecutivo: 'LM',
    contacto: {
      nombre: 'Deyaira Silva',
      puesto: 'Gerente de logistica',
      correo: 'Deyanira.Silva@chromalox.com',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Reunión agendada',
    semana: 32,
    fecha: null,
    propuesta: {
      status: null,
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 29,
    empresa: 'LUSA',
    planta: null,
    ciudad: 'CDMX',
    industria: 'Fabricación de motores',
    ejecutivo: 'LM',
    contacto: {
      nombre: 'Nayeli Regino',
      puesto: 'Gerente de compras',
      correo: 'auxiliarcomprasizt@iusa.com.mx',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Lead nuevo',
    semana: 32,
    fecha: null,
    propuesta: {
      status: null,
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 30,
    empresa: 'CRM SYNERGIES',
    planta: null,
    ciudad: 'CDMX',
    industria: 'Servicios',
    ejecutivo: 'LM',
    contacto: {
      nombre: 'Alondra',
      puesto: 'Gerente de logistica',
      correo: 'logisticsmx2@crmsynergies.com',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Reunión agendada',
    semana: 32,
    fecha: null,
    propuesta: {
      status: null,
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 31,
    empresa: 'BIC',
    planta: null,
    ciudad: 'CDMX',
    industria: 'Fabricación de motores',
    ejecutivo: 'LM',
    contacto: {
      nombre: 'Julian Quevec',
      puesto: 'Inventory manager',
      correo: '',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Lead nuevo',
    semana: 33,
    fecha: null,
    propuesta: {
      status: null,
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 32,
    empresa: 'JUGOS DEL VALLE',
    planta: null,
    ciudad: 'CDMX',
    industria: 'Bebidas',
    ejecutivo: 'LM',
    contacto: {
      nombre: 'Guillermo Lopez',
      puesto: 'Gerente de logistica',
      correo: '',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Lead nuevo',
    semana: 33,
    fecha: null,
    propuesta: {
      status: null,
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 33,
    empresa: 'GRUPO CORVI',
    planta: null,
    ciudad: 'CDMX',
    industria: 'Retail',
    ejecutivo: 'LM',
    contacto: {
      nombre: 'Enrique Villaseñor',
      puesto: 'CEO',
      correo: '',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Lead nuevo',
    semana: 33,
    fecha: null,
    propuesta: {
      status: null,
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 34,
    empresa: 'WALDOS',
    planta: null,
    ciudad: 'Edo Mex',
    industria: 'Retail',
    ejecutivo: 'LM',
    contacto: {
      nombre: '',
      puesto: '',
      correo: '',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Propuesta enviada',
    semana: null,
    fecha: '2025-09-22',
    propuesta: {
      status: null,
      ventaTotal: 658658,
      utilidad: 0.286,
      carton: 43000,
      playo: 33000,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },

  // ==========================================================================
  // CRISTINA SESCOSSE (CS) LEADS - IDs 35-47
  // ==========================================================================
  {
    id: 35,
    empresa: 'GRUPO CARSO',
    planta: null,
    ciudad: 'Guadalajara',
    industria: 'Retail',
    ejecutivo: 'CS',
    contacto: {
      nombre: '',
      puesto: '',
      correo: '',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Lead nuevo',
    semana: null,
    fecha: null,
    propuesta: {
      status: null,
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 36,
    empresa: 'TRACSA',
    planta: null,
    ciudad: 'Guadalajara',
    industria: 'Automotriz',
    ejecutivo: 'CS',
    contacto: {
      nombre: 'Rafael',
      puesto: 'Procurement',
      correo: 'irrodriguez@tracsa.com.mx',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Propuesta enviada',
    semana: null,
    fecha: null,
    propuesta: {
      status: 'Aceptada',
      ventaTotal: 640710,
      utilidad: 0.186,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 37,
    empresa: 'FARMACIAS GUADALAJARA',
    planta: null,
    ciudad: 'Guadalajara',
    industria: 'Farmacéutica',
    ejecutivo: 'CS',
    contacto: {
      nombre: 'Claudia',
      puesto: 'Compras institucionales',
      correo: 'chermosillo@fragua.com.mx',
      telefono: '',
    },
    servicios: ['biodigestores'],
    status: 'Propuesta enviada',
    semana: null,
    fecha: null,
    propuesta: {
      status: null,
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 38,
    empresa: 'SENSATA TECHNOLOGIES',
    planta: null,
    ciudad: 'Guadalajara',
    industria: 'Tecnología',
    ejecutivo: 'CS',
    contacto: {
      nombre: 'Samuel',
      puesto: 'Compras',
      correo: 'sromosanchez@sensata.com',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Lead nuevo',
    semana: null,
    fecha: null,
    propuesta: {
      status: null,
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 39,
    empresa: 'JABIL',
    planta: null,
    ciudad: 'Guadalajara',
    industria: 'Tecnología',
    ejecutivo: 'CS',
    contacto: {
      nombre: 'Alberto',
      puesto: 'Compras',
      correo: '',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Lead nuevo',
    semana: null,
    fecha: null,
    propuesta: {
      status: null,
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 40,
    empresa: 'AMAZON',
    planta: null,
    ciudad: 'Guadalajara',
    industria: 'Tecnología',
    ejecutivo: 'CS',
    contacto: {
      nombre: 'Gustavo',
      puesto: 'Compras',
      correo: 'enriqugt@amazon.com',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Reunión agendada',
    semana: null,
    fecha: null,
    propuesta: {
      status: 'Pendiente',
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 41,
    empresa: 'GRUPO SANBORNS',
    planta: null,
    ciudad: 'CDMX',
    industria: 'Retail',
    ejecutivo: 'CS',
    contacto: {
      nombre: 'Sergio',
      puesto: 'Compras y Abastecimientos',
      correo: 'smendieta@sears.com.mx',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Propuesta enviada',
    semana: null,
    fecha: null,
    propuesta: {
      status: 'Aceptada',
      ventaTotal: 157560,
      utilidad: 0.164,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 42,
    empresa: 'GENERAL MOTORS',
    planta: null,
    ciudad: 'Guadalajara',
    industria: 'Automotriz',
    ejecutivo: 'CS',
    contacto: {
      nombre: 'Guillermo',
      puesto: 'Facilities Director',
      correo: 'guillermo.arias@gm.com',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Lead nuevo',
    semana: null,
    fecha: null,
    propuesta: {
      status: null,
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 43,
    empresa: 'RAPPI',
    planta: null,
    ciudad: 'CDMX',
    industria: 'Tecnología',
    ejecutivo: 'CS',
    contacto: {
      nombre: 'Ivan Cadavid',
      puesto: 'CEO',
      correo: '',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Lead nuevo',
    semana: null,
    fecha: null,
    propuesta: {
      status: null,
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: 'Consiguiendo contacto',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 44,
    empresa: 'FARMACIAS DEL AHORRO',
    planta: null,
    ciudad: 'CDMX',
    industria: 'Farmacéutica',
    ejecutivo: 'CS',
    contacto: {
      nombre: 'Alejandro Aldaco',
      puesto: 'Director de Finanzas',
      correo: 'alejandr.aldaco@fahorro.com.mx',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Lead nuevo',
    semana: null,
    fecha: null,
    propuesta: {
      status: null,
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 45,
    empresa: 'FIESTA AMERICANA GDL',
    planta: null,
    ciudad: 'Guadalajara',
    industria: 'Hotelería',
    ejecutivo: 'CS',
    contacto: {
      nombre: 'Eduardo Cordero',
      puesto: 'Dueño',
      correo: '',
      telefono: '',
    },
    servicios: ['biodigestores'],
    status: 'Reunión agendada',
    semana: null,
    fecha: null,
    propuesta: {
      status: null,
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 46,
    empresa: 'JW MARRIOTT GDL',
    planta: null,
    ciudad: 'Guadalajara',
    industria: 'Hotelería',
    ejecutivo: 'CS',
    contacto: {
      nombre: 'Jorge Favier',
      puesto: 'Dueño',
      correo: '',
      telefono: '',
    },
    servicios: ['biodigestores'],
    status: 'Reunión agendada',
    semana: null,
    fecha: null,
    propuesta: {
      status: null,
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 47,
    empresa: 'ACEITE VEGETAL',
    planta: null,
    ciudad: 'Guadalajara',
    industria: 'Alimenticia',
    ejecutivo: 'CS',
    contacto: {
      nombre: 'Mariana Capetillo',
      puesto: 'Dueño',
      correo: '',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Reunión agendada',
    semana: null,
    fecha: null,
    propuesta: {
      status: 'Spot',
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },

  // ==========================================================================
  // JOSE ARMANDO MARTINEZ (AM) LEADS - IDs 48-74
  // ==========================================================================
  {
    id: 48,
    empresa: 'SANMINA PLANTA APODACA',
    planta: 'Apodaca',
    ciudad: 'Monterrey',
    industria: 'Tecnología',
    ejecutivo: 'AM',
    contacto: {
      nombre: 'Daniel Vaca',
      puesto: 'Compras',
      correo: 'daniel.baca@sanmina.com',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Rechazada',
    semana: 31,
    fecha: null,
    propuesta: {
      status: 'Rechazada',
      ventaTotal: 150000,
      utilidad: 0.204,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 49,
    empresa: 'SANMINA PLANTA GUADALUPE',
    planta: 'Guadalupe',
    ciudad: 'Monterrey',
    industria: 'Tecnología',
    ejecutivo: 'AM',
    contacto: {
      nombre: 'Daniel Vaca',
      puesto: 'Compras',
      correo: 'daniel.baca@sanmina.com',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Rechazada',
    semana: 31,
    fecha: null,
    propuesta: {
      status: 'Rechazada',
      ventaTotal: 210000,
      utilidad: 0.157,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 50,
    empresa: 'GIVAUDAN QRO',
    planta: 'Querétaro',
    ciudad: 'Querétaro',
    industria: 'Alimenticia',
    ejecutivo: 'AM',
    contacto: {
      nombre: 'Marisol Medina',
      puesto: 'Trainee in service',
      correo: 'marisol.medina-aniq@givaudan.com',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Propuesta enviada',
    semana: 31,
    fecha: '2025-09-22',
    propuesta: {
      status: 'Pendiente',
      ventaTotal: 1519203,
      utilidad: 0.151,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 51,
    empresa: 'ALPURA',
    planta: null,
    ciudad: 'Monterrey',
    industria: 'Alimenticia',
    ejecutivo: 'AM',
    contacto: {
      nombre: 'Ricardo',
      puesto: 'Jefe compras',
      correo: 'daniel.loera@alpura.com',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Levantamiento',
    semana: 31,
    fecha: null,
    propuesta: {
      status: null,
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 52,
    empresa: 'BIMBO PLANTA BARCEL',
    planta: 'Barcel S31',
    ciudad: 'Monterrey',
    industria: 'Alimenticia',
    ejecutivo: 'AM',
    contacto: {
      nombre: 'Gabriela Cruz',
      puesto: 'Jefe mantenimiento',
      correo: 'gabriela.cruz@grupobimbo.com',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Propuesta enviada',
    semana: 31,
    fecha: '2025-08-18',
    propuesta: {
      status: null,
      ventaTotal: 360929,
      utilidad: 0.131,
      carton: 20000,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 53,
    empresa: 'GRUPO GONHER',
    planta: null,
    ciudad: 'Monterrey',
    industria: 'Automotriz',
    ejecutivo: 'AM',
    contacto: {
      nombre: 'Guillermo Gonzalez',
      puesto: 'Jefe compras',
      correo: 'ggonzalezr@grupogonher.com',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Lead nuevo',
    semana: 31,
    fecha: null,
    propuesta: {
      status: null,
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 54,
    empresa: 'COSTCO MTY',
    planta: 'Monterrey',
    ciudad: 'Monterrey',
    industria: 'Retail',
    ejecutivo: 'AM',
    contacto: {
      nombre: 'Adrian Trejo',
      puesto: 'Compras',
      correo: 'atrejo@costco.com',
      telefono: '',
    },
    servicios: ['biodigestores'],
    status: 'Lead nuevo',
    semana: 31,
    fecha: null,
    propuesta: {
      status: null,
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 55,
    empresa: 'WYN DE MEXICO',
    planta: null,
    ciudad: 'Monterrey',
    industria: 'Hotelería',
    ejecutivo: 'AM',
    contacto: {
      nombre: 'Raul Vazquez',
      puesto: 'HHS',
      correo: 'raulvh@wyindemexico.com',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Reunión agendada',
    semana: 31,
    fecha: null,
    propuesta: {
      status: null,
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 56,
    empresa: 'QUANTUM',
    planta: null,
    ciudad: 'Monterrey',
    industria: 'Tecnología',
    ejecutivo: 'AM',
    contacto: {
      nombre: 'Sebastian Monroy',
      puesto: 'Compras',
      correo: 's.monroy@infraquantum.com',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Lead nuevo',
    semana: 31,
    fecha: null,
    propuesta: {
      status: null,
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 57,
    empresa: 'GRUPO AVANDARO',
    planta: null,
    ciudad: 'Monterrey',
    industria: 'Hotelería',
    ejecutivo: 'AM',
    contacto: {
      nombre: 'Victor Perez',
      puesto: 'Compras',
      correo: 'vperez@grupoavandaro.com.mx',
      telefono: '',
    },
    servicios: ['biodigestores'],
    status: 'Lead nuevo',
    semana: 31,
    fecha: null,
    propuesta: {
      status: null,
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: 'Oct. 6 BIOS',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 58,
    empresa: 'SAMUEL SON AND CO',
    planta: null,
    ciudad: 'Monterrey',
    industria: 'Fabricación de motores',
    ejecutivo: 'AM',
    contacto: {
      nombre: 'Silvia Coronado',
      puesto: 'Seguridad salud y m.ambiente',
      correo: 'alicia.corona@samuel.com',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Lead nuevo',
    semana: 31,
    fecha: null,
    propuesta: {
      status: null,
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 59,
    empresa: 'KFC MEXICO',
    planta: null,
    ciudad: 'Monterrey',
    industria: 'Restaurantes',
    ejecutivo: 'AM',
    contacto: {
      nombre: 'Joel Elias Arevalo',
      puesto: 'Gerente general regional',
      correo: '',
      telefono: '',
    },
    servicios: ['biodigestores'],
    status: 'Lead nuevo',
    semana: 31,
    fecha: null,
    propuesta: {
      status: null,
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 60,
    empresa: 'NUTEC BICKLEY',
    planta: null,
    ciudad: 'Monterrey',
    industria: 'Fabricación de motores',
    ejecutivo: 'AM',
    contacto: {
      nombre: 'Jesus Eduardo Mtz',
      puesto: 'Compras',
      correo: '',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Lead nuevo',
    semana: 31,
    fecha: null,
    propuesta: {
      status: null,
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 61,
    empresa: 'CADENA COMERCIAL OXXO',
    planta: null,
    ciudad: 'Monterrey',
    industria: 'Retail',
    ejecutivo: 'AM',
    contacto: {
      nombre: 'Abraham Garza',
      puesto: 'Compras',
      correo: 'abraham.garza@oxxo.com',
      telefono: '',
    },
    servicios: ['biodigestores'],
    status: 'Reunión agendada',
    semana: 32,
    fecha: null,
    propuesta: {
      status: null,
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 62,
    empresa: 'PEPSICO',
    planta: null,
    ciudad: 'Nacional',
    industria: 'Alimenticia',
    ejecutivo: 'AM',
    contacto: {
      nombre: 'Monica Lopez',
      puesto: 'Compras',
      correo: 'monicalopez.navarro@pepsico.com',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Levantamiento',
    semana: 32,
    fecha: null,
    propuesta: {
      status: null,
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 63,
    empresa: 'FIBRA UNO',
    planta: null,
    ciudad: 'Monterrey',
    industria: 'Servicios',
    ejecutivo: 'AM',
    contacto: {
      nombre: 'Marianela Vargas',
      puesto: 'Compras',
      correo: 'mblara@fibrauno.mx',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Reunión agendada',
    semana: 32,
    fecha: null,
    propuesta: {
      status: null,
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 64,
    empresa: 'BIMBO PLANTA BARCEL',
    planta: 'Barcel S32',
    ciudad: 'Monterrey',
    industria: 'Alimenticia',
    ejecutivo: 'AM',
    contacto: {
      nombre: 'Gabi',
      puesto: 'Jefe mantenimiento',
      correo: '',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Levantamiento',
    semana: 32,
    fecha: null,
    propuesta: {
      status: null,
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 65,
    empresa: 'MINI SUPER DOLLAR GENERAL',
    planta: null,
    ciudad: 'Monterrey',
    industria: 'Retail',
    ejecutivo: 'AM',
    contacto: {
      nombre: 'Lawrence Hernandez',
      puesto: 'Compras',
      correo: 'lawrenceh@dollargeneral.com',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Reunión agendada',
    semana: 33,
    fecha: null,
    propuesta: {
      status: null,
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 66,
    empresa: 'BACHOCO',
    planta: null,
    ciudad: 'Monterrey',
    industria: 'Alimenticia',
    ejecutivo: 'AM',
    contacto: {
      nombre: 'Jorge Lozano',
      puesto: 'Compras',
      correo: '',
      telefono: '',
    },
    servicios: ['rp_rpbi'],
    status: 'Propuesta enviada',
    semana: 33,
    fecha: '2025-09-04',
    propuesta: {
      status: null,
      ventaTotal: 24934,
      utilidad: 0.231,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 67,
    empresa: 'RIISA MONTERREY',
    planta: null,
    ciudad: 'Monterrey',
    industria: 'Servicios',
    ejecutivo: 'AM',
    contacto: {
      nombre: 'Nancy Cueva',
      puesto: 'Compras',
      correo: 'ndelacueva@riisa.mx',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Levantamiento',
    semana: 33,
    fecha: null,
    propuesta: {
      status: 'Spot',
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 68,
    empresa: 'HEINEKEN MTY',
    planta: 'Monterrey',
    ciudad: 'Monterrey',
    industria: 'Bebidas',
    ejecutivo: 'AM',
    contacto: {
      nombre: 'Adriana',
      puesto: 'Compras',
      correo: '',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Reunión agendada',
    semana: 33,
    fecha: null,
    propuesta: {
      status: null,
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 69,
    empresa: 'REFISESA',
    planta: null,
    ciudad: 'Monterrey',
    industria: 'Alimenticia',
    ejecutivo: 'AM',
    contacto: {
      nombre: 'Rolando Zacarias',
      puesto: 'Gerencia de abastecimientos',
      correo: 'jrzacarias@refisesa.com',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Propuesta enviada',
    semana: 34,
    fecha: null,
    propuesta: {
      status: 'Spot',
      ventaTotal: 2353000,
      utilidad: 0.073,
      carton: 500000,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 70,
    empresa: 'PEPSICO',
    planta: 'Propuesta Nacional',
    ciudad: 'Nacional',
    industria: 'Alimenticia',
    ejecutivo: 'AM',
    contacto: {
      nombre: 'Monica Lopez',
      puesto: 'Compras',
      correo: 'monicalopez.navarro@pepsico.com',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Propuesta enviada',
    semana: 34,
    fecha: null,
    propuesta: {
      status: null,
      ventaTotal: 11834934,
      utilidad: 0.1332,
      carton: 296000,
      playo: 39000,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 71,
    empresa: 'MORPHOS RECYCLING',
    planta: null,
    ciudad: 'Monterrey',
    industria: 'Servicios',
    ejecutivo: 'AM',
    contacto: {
      nombre: 'Reina Mondragon',
      puesto: 'Gerencia general',
      correo: 'gerente@morphosrecycling.com',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Levantamiento',
    semana: 34,
    fecha: null,
    propuesta: {
      status: 'Spot',
      ventaTotal: 95000,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 72,
    empresa: 'SUMERCA (TIENDAS)',
    planta: null,
    ciudad: 'Monterrey',
    industria: 'Retail',
    ejecutivo: 'AM',
    contacto: {
      nombre: '',
      puesto: '',
      correo: '',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Lead nuevo',
    semana: 34,
    fecha: null,
    propuesta: {
      status: null,
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 73,
    empresa: 'PROMODA',
    planta: null,
    ciudad: 'Monterrey',
    industria: 'Retail',
    ejecutivo: 'AM',
    contacto: {
      nombre: '',
      puesto: '',
      correo: '',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Lead nuevo',
    semana: 34,
    fecha: null,
    propuesta: {
      status: null,
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 74,
    empresa: 'GEON PERFORMANCE',
    planta: null,
    ciudad: 'Monterrey',
    industria: 'Fabricación de motores',
    ejecutivo: 'AM',
    contacto: {
      nombre: 'Alexis Martinez',
      puesto: 'Sourcing specialist',
      correo: 'alexis.martinez@geon.com',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Lead nuevo',
    semana: 35,
    fecha: null,
    propuesta: {
      status: null,
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },

  // ==========================================================================
  // MARIANA OLMOS (MO) - STELLANTIS 6 PLANTS - IDs 75-80
  // ==========================================================================
  {
    id: 75,
    empresa: 'STELLANTIS',
    planta: 'Van Assembly Plant',
    ciudad: 'Saltillo',
    industria: 'Automotriz',
    ejecutivo: 'MO',
    contacto: {
      nombre: 'Carolina Salmerón',
      puesto: 'Senior Buyer Indirect – Cleaning & Waste',
      correo: '',
      telefono: '',
    },
    servicios: ['rme', 'rp_rpbi'],
    status: 'Levantamiento',
    semana: null,
    fecha: null,
    propuesta: {
      status: null,
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: 'Licitación inicia 09-feb-2026. Levantamientos realizados nov-2025. Scrap ferroso y no ferroso, RME, RP, Segregación en sitio',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 76,
    empresa: 'STELLANTIS',
    planta: 'Truck Assembly Plant',
    ciudad: 'Saltillo',
    industria: 'Automotriz',
    ejecutivo: 'MO',
    contacto: {
      nombre: 'Carolina Salmerón',
      puesto: 'Senior Buyer Indirect – Cleaning & Waste',
      correo: '',
      telefono: '',
    },
    servicios: ['rme', 'rp_rpbi'],
    status: 'Levantamiento',
    semana: null,
    fecha: null,
    propuesta: {
      status: null,
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: 'Licitación inicia 09-feb-2026. Levantamientos realizados nov-2025. Scrap ferroso y no ferroso, RME, RP, Segregación en sitio',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 77,
    empresa: 'STELLANTIS',
    planta: 'South Engine Plant',
    ciudad: 'Saltillo',
    industria: 'Automotriz',
    ejecutivo: 'MO',
    contacto: {
      nombre: 'Carolina Salmerón',
      puesto: 'Senior Buyer Indirect – Cleaning & Waste',
      correo: '',
      telefono: '',
    },
    servicios: ['rme', 'rp_rpbi'],
    status: 'Levantamiento',
    semana: null,
    fecha: null,
    propuesta: {
      status: null,
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: 'Licitación inicia 09-feb-2026. Levantamientos realizados nov-2025. Scrap ferroso y no ferroso, RME, RP, Segregación en sitio',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 78,
    empresa: 'STELLANTIS',
    planta: 'North Engine Plant',
    ciudad: 'Ramos Arizpe',
    industria: 'Automotriz',
    ejecutivo: 'MO',
    contacto: {
      nombre: 'Carolina Salmerón',
      puesto: 'Senior Buyer Indirect – Cleaning & Waste',
      correo: '',
      telefono: '',
    },
    servicios: ['rme', 'rp_rpbi'],
    status: 'Levantamiento',
    semana: null,
    fecha: null,
    propuesta: {
      status: null,
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: 'Licitación inicia 09-feb-2026. Levantamientos realizados nov-2025. Scrap ferroso y no ferroso, RME, RP, Segregación en sitio',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 79,
    empresa: 'STELLANTIS',
    planta: 'Toluca Assembly Plant',
    ciudad: 'Toluca',
    industria: 'Automotriz',
    ejecutivo: 'MO',
    contacto: {
      nombre: 'Carolina Salmerón',
      puesto: 'Senior Buyer Indirect – Cleaning & Waste',
      correo: '',
      telefono: '',
    },
    servicios: ['rme', 'rp_rpbi'],
    status: 'Levantamiento',
    semana: null,
    fecha: null,
    propuesta: {
      status: null,
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: 'Licitación inicia 09-feb-2026. Levantamientos realizados nov-2025. Scrap ferroso y no ferroso, RME, RP, Segregación en sitio',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 80,
    empresa: 'STELLANTIS',
    planta: 'Toluca PDC',
    ciudad: 'Toluca',
    industria: 'Automotriz',
    ejecutivo: 'MO',
    contacto: {
      nombre: 'Carolina Salmerón',
      puesto: 'Senior Buyer Indirect – Cleaning & Waste',
      correo: '',
      telefono: '',
    },
    servicios: ['rme', 'rp_rpbi'],
    status: 'Levantamiento',
    semana: null,
    fecha: null,
    propuesta: {
      status: null,
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: 'Licitación inicia 09-feb-2026. Levantamientos realizados nov-2025. Scrap ferroso y no ferroso, RME, RP, Segregación en sitio',
    volumenEstimado: null,
    facturacionEstimada: null,
  },

  // ==========================================================================
  // MARIANA OLMOS (MO) - FEMSA/COCA-COLA 5 PLANTS - IDs 81-85
  // ==========================================================================
  {
    id: 81,
    empresa: 'FEMSA COCA-COLA',
    planta: 'Planta Reyes',
    ciudad: 'Los Reyes La Paz',
    industria: 'Bebidas',
    ejecutivo: 'MO',
    contacto: {
      nombre: 'Alejandro Efraín Espinosa Díaz / Carlos Covarrubias Canut',
      puesto: 'Coord Abastecimientos / Global Strategic Procurement',
      correo: '',
      telefono: '',
    },
    servicios: ['organicos', 'lodos', 'rp_rpbi'],
    status: 'Licitación pendiente',
    semana: null,
    fecha: null,
    propuesta: {
      status: null,
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: 'Licitación entrega 09-feb-2026 / Fallo 01-mar-2026. Subproductos. Pendiente licitación adicional de otros residuos',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 82,
    empresa: 'FEMSA COCA-COLA',
    planta: 'Planta Cuautitlán',
    ciudad: 'Cuautitlán Izcalli',
    industria: 'Bebidas',
    ejecutivo: 'MO',
    contacto: {
      nombre: 'Alejandro Efraín Espinosa Díaz / Carlos Covarrubias Canut',
      puesto: 'Coord Abastecimientos / Global Strategic Procurement',
      correo: '',
      telefono: '',
    },
    servicios: ['organicos', 'lodos', 'rp_rpbi'],
    status: 'Licitación pendiente',
    semana: null,
    fecha: null,
    propuesta: {
      status: null,
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: 'Licitación entrega 09-feb-2026 / Fallo 01-mar-2026. Subproductos. Pendiente licitación adicional de otros residuos',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 83,
    empresa: 'FEMSA COCA-COLA',
    planta: 'Planta Morelia',
    ciudad: 'Morelia',
    industria: 'Bebidas',
    ejecutivo: 'MO',
    contacto: {
      nombre: 'Alejandro Efraín Espinosa Díaz / Carlos Covarrubias Canut',
      puesto: 'Coord Abastecimientos / Global Strategic Procurement',
      correo: '',
      telefono: '',
    },
    servicios: ['organicos', 'lodos', 'rp_rpbi'],
    status: 'Licitación pendiente',
    semana: null,
    fecha: null,
    propuesta: {
      status: null,
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: 'Licitación entrega 09-feb-2026 / Fallo 01-mar-2026. Subproductos. Pendiente licitación adicional de otros residuos',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 84,
    empresa: 'FEMSA COCA-COLA',
    planta: 'Planta Cuernavaca',
    ciudad: 'Cuernavaca',
    industria: 'Bebidas',
    ejecutivo: 'MO',
    contacto: {
      nombre: 'Alejandro Efraín Espinosa Díaz / Carlos Covarrubias Canut',
      puesto: 'Coord Abastecimientos / Global Strategic Procurement',
      correo: '',
      telefono: '',
    },
    servicios: ['organicos', 'lodos', 'rp_rpbi'],
    status: 'Licitación pendiente',
    semana: null,
    fecha: null,
    propuesta: {
      status: null,
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: 'Licitación entrega 09-feb-2026 / Fallo 01-mar-2026. Subproductos. Pendiente licitación adicional de otros residuos',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 85,
    empresa: 'FEMSA COCA-COLA',
    planta: 'Planta Ixtacomitán',
    ciudad: 'Villahermosa',
    industria: 'Bebidas',
    ejecutivo: 'MO',
    contacto: {
      nombre: 'Alejandro Efraín Espinosa Díaz / Carlos Covarrubias Canut',
      puesto: 'Coord Abastecimientos / Global Strategic Procurement',
      correo: '',
      telefono: '',
    },
    servicios: ['organicos', 'lodos', 'rp_rpbi'],
    status: 'Licitación pendiente',
    semana: null,
    fecha: null,
    propuesta: {
      status: null,
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: 'Licitación entrega 09-feb-2026 / Fallo 01-mar-2026. Subproductos. Pendiente licitación adicional de otros residuos',
    volumenEstimado: null,
    facturacionEstimada: null,
  },

  // ==========================================================================
  // MARIANA OLMOS (MO) - PPG 2 PLANTS - IDs 86-87
  // ==========================================================================
  {
    id: 86,
    empresa: 'PPG',
    planta: 'Tepexpan',
    ciudad: 'Acolman',
    industria: 'Química',
    ejecutivo: 'MO',
    contacto: {
      nombre: 'Gerardo Valdez Sánchez',
      puesto: 'Gerente Jr de Servicios y Sustentabilidad',
      correo: '',
      telefono: '',
    },
    servicios: ['sustayn', 'lodos'],
    status: 'Propuesta enviada',
    semana: null,
    fecha: null,
    propuesta: {
      status: 'Pendiente',
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: 'Cotización enviada nov-2025, pendiente respuesta para reunión',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 87,
    empresa: 'PPG',
    planta: 'AGA',
    ciudad: 'Tepotzotlán',
    industria: 'Química',
    ejecutivo: 'MO',
    contacto: {
      nombre: 'Gerardo Valdez Sánchez',
      puesto: 'Gerente Jr de Servicios y Sustentabilidad',
      correo: '',
      telefono: '',
    },
    servicios: ['sustayn', 'lodos'],
    status: 'Propuesta enviada',
    semana: null,
    fecha: null,
    propuesta: {
      status: 'Pendiente',
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: 'AGA pendiente por definir frecuencias',
    volumenEstimado: null,
    facturacionEstimada: null,
  },

  // ==========================================================================
  // MARIANA OLMOS (MO) - OTHER PROSPECTS - IDs 88-92
  // ==========================================================================
  {
    id: 88,
    empresa: 'CLASE AZUL',
    planta: null,
    ciudad: 'Los Altos de Jalisco',
    industria: 'Bebidas',
    ejecutivo: 'MO',
    contacto: {
      nombre: 'Juan Carlos Gutiérrez López',
      puesto: 'Coordinador EHS SR',
      correo: '',
      telefono: '',
    },
    servicios: ['biodigestores'],
    status: 'Propuesta enviada',
    semana: null,
    fecha: null,
    propuesta: {
      status: 'Pendiente',
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: 'Cotización enviada 27-ene; análisis de agua enviado 03-feb; pendiente respuesta. Biodigestor OG50',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 89,
    empresa: 'CADENA HOTELES RED NACIONAL',
    planta: null,
    ciudad: 'Nacional',
    industria: 'Hotelería',
    ejecutivo: 'MO',
    contacto: {
      nombre: 'Ing. Reynaldo Alonso José Gómez',
      puesto: 'Director General Red Nacional Gestión de Residuos y EC',
      correo: '',
      telefono: '',
    },
    servicios: ['rme', 'rsu', 'organicos'],
    status: 'Reunión agendada',
    semana: null,
    fecha: null,
    propuesta: {
      status: null,
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: 'Llamada 05-feb; presentación Innovative 06-feb',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 90,
    empresa: 'COSTCO TOLUCA',
    planta: 'Toluca',
    ciudad: 'Toluca',
    industria: 'Retail',
    ejecutivo: 'MO',
    contacto: {
      nombre: 'Leonardo Joel Gallardo Jiménez',
      puesto: 'Coordinador de Sustentabilidad y Energía',
      correo: '',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Lead nuevo',
    semana: null,
    fecha: null,
    propuesta: {
      status: null,
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: 'Correo enviado 12-ene; esperando respuesta',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 91,
    empresa: 'ZEISS',
    planta: 'CDMX',
    ciudad: 'CDMX',
    industria: 'Equipo óptico',
    ejecutivo: 'MO',
    contacto: {
      nombre: 'Ingrid Eunice Millan Salazar',
      puesto: 'Auxiliar de Compras',
      correo: '',
      telefono: '',
    },
    servicios: ['rsu', 'destrucciones'],
    status: 'Propuesta enviada',
    semana: null,
    fecha: null,
    propuesta: {
      status: 'Pendiente',
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: 'Contacto reunión 28-ene, cotizando. Equipo JM cotizando',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 92,
    empresa: 'ZEISS',
    planta: 'Apodaca',
    ciudad: 'Apodaca',
    industria: 'Equipo óptico',
    ejecutivo: 'MO',
    contacto: {
      nombre: 'Ingrid Eunice Millan Salazar',
      puesto: 'Auxiliar de Compras',
      correo: '',
      telefono: '',
    },
    servicios: ['rsu', 'destrucciones'],
    status: 'Propuesta enviada',
    semana: null,
    fecha: null,
    propuesta: {
      status: 'Pendiente',
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: 'Contacto reunión 28-ene, cotizando. Equipo JM cotizando',
    volumenEstimado: null,
    facturacionEstimada: null,
  },

  // ==========================================================================
  // LAURA MESA (LM) DETAILED PROSPECTS (from photo) - IDs 93-101
  // ==========================================================================
  {
    id: 93,
    empresa: 'OFFICE DEPOT',
    planta: 'Operación',
    ciudad: 'CDMX',
    industria: 'Retail',
    ejecutivo: 'LM',
    contacto: {
      nombre: 'Karla Hernandez',
      puesto: '',
      correo: 'Karlahernandez@officedepot.com',
      telefono: '5533746748',
    },
    servicios: ['rme'],
    status: 'Inicio de operación',
    semana: null,
    fecha: null,
    propuesta: {
      status: 'Aceptada',
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: 'Contrato ganado',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 94,
    empresa: 'TRUPER',
    planta: null,
    ciudad: 'CDMX',
    industria: 'Fabricación de motores',
    ejecutivo: 'LM',
    contacto: {
      nombre: 'Ana Laura Magaña',
      puesto: '',
      correo: 'almaganat@truper.com',
      telefono: '5518496178',
    },
    servicios: ['rme'],
    status: 'Propuesta enviada',
    semana: null,
    fecha: null,
    propuesta: {
      status: null,
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 95,
    empresa: 'TOTAL PLAY',
    planta: null,
    ciudad: 'CDMX',
    industria: 'Servicios',
    ejecutivo: 'LM',
    contacto: {
      nombre: 'Ofelia Borjon',
      puesto: '',
      correo: 'ofelia.borjon@f6p.mx',
      telefono: '5631090269',
    },
    servicios: ['rme'],
    status: 'Propuesta enviada',
    semana: null,
    fecha: null,
    propuesta: {
      status: null,
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 96,
    empresa: 'WALDOS',
    planta: 'Detalle LM',
    ciudad: 'Edo Mex',
    industria: 'Retail',
    ejecutivo: 'LM',
    contacto: {
      nombre: 'Aylin Alvarez',
      puesto: '',
      correo: 'alvarezal@grupovision.com.mx',
      telefono: '5631218519',
    },
    servicios: ['rme'],
    status: 'Propuesta enviada',
    semana: null,
    fecha: null,
    propuesta: {
      status: null,
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: '',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 97,
    empresa: 'PALACIO DE HIERRO',
    planta: null,
    ciudad: 'CDMX',
    industria: 'Retail',
    ejecutivo: 'LM',
    contacto: {
      nombre: 'Hector Rico',
      puesto: '',
      correo: 'hrico@ph.com.mx',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Licitación pendiente',
    semana: null,
    fecha: null,
    propuesta: {
      status: null,
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: 'Información de licitación pendiente',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 98,
    empresa: 'MERCADO LIBRE',
    planta: 'Operación',
    ciudad: 'CDMX',
    industria: 'Retail',
    ejecutivo: 'LM',
    contacto: {
      nombre: 'Federico Yanez',
      puesto: '',
      correo: 'ext_fedyanez@mercadolibre.com.mx',
      telefono: '5575408039',
    },
    servicios: ['rme'],
    status: 'Inicio de operación',
    semana: null,
    fecha: null,
    propuesta: {
      status: 'Aceptada',
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: 'Licitación ganada sin inicio de operación',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 99,
    empresa: 'DIDI',
    planta: null,
    ciudad: 'CDMX',
    industria: 'Servicios',
    ejecutivo: 'LM',
    contacto: {
      nombre: 'Kaily Paez',
      puesto: '',
      correo: 'Kailypaezpaez@didiglobal.com',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Levantamiento',
    semana: null,
    fecha: null,
    propuesta: {
      status: null,
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: 'En revisión de volúmenes y materiales',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 100,
    empresa: 'PALMAS CHIAPAS',
    planta: null,
    ciudad: 'Chiapas',
    industria: 'Alimenticia',
    ejecutivo: 'LM',
    contacto: {
      nombre: 'Deisy Mendez',
      puesto: '',
      correo: 'deisy.mendez@palma.com.mx',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Reunión agendada',
    semana: null,
    fecha: null,
    propuesta: {
      status: null,
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: 'Prospecto - presentación por agendar',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  {
    id: 101,
    empresa: 'GUNDERSON CONCARRIL',
    planta: null,
    ciudad: 'CDMX',
    industria: 'Automotriz',
    ejecutivo: 'LM',
    contacto: {
      nombre: 'Gabriela Ramirez',
      puesto: '',
      correo: 'gabriela.ramirez@gbrx.com',
      telefono: '',
    },
    servicios: ['rme'],
    status: 'Reunión agendada',
    semana: null,
    fecha: null,
    propuesta: {
      status: null,
      ventaTotal: null,
      utilidad: null,
      carton: null,
      playo: null,
    },
    motivoRechazo: null,
    comentarios: 'Prospecto - presentación por agendar',
    volumenEstimado: null,
    facturacionEstimada: null,
  },
  // ==========================================================================
  // CARMEN RODRÍGUEZ (CR) LEADS - IDs 102-141 (Prospectos en seguimiento)
  // ==========================================================================
  { id: 102, empresa: 'Tritech Autoparts Mexicana', planta: null, ciudad: 'Guanajuato', industria: 'Automotriz', ejecutivo: 'CR', contacto: { nombre: 'Allain Christy Walker Morales', puesto: 'Supervisor de seguridad y medio ambiente', correo: 'awalker@tritechautoparts.com.mx', telefono: '4641165018' }, servicios: ['rme'], status: 'Lead nuevo', semana: null, fecha: null, propuesta: { status: null, ventaTotal: null, utilidad: null, carton: null, playo: null }, motivoRechazo: null, comentarios: '', volumenEstimado: null, facturacionEstimada: null },
  { id: 103, empresa: 'ZKW Mexico', planta: null, ciudad: 'Silao, Guanajuato', industria: 'Automotriz', ejecutivo: 'CR', contacto: { nombre: 'Hector Abraham Anguiano Ramirez', puesto: 'Gerente de EHS', correo: 'hector.anguiano@zkw.mx', telefono: '4771266333' }, servicios: ['rme'], status: 'Lead nuevo', semana: null, fecha: null, propuesta: { status: null, ventaTotal: null, utilidad: null, carton: null, playo: null }, motivoRechazo: null, comentarios: '', volumenEstimado: null, facturacionEstimada: null },
  { id: 104, empresa: 'Nishikawa Sealing Systems Mexico', planta: null, ciudad: 'Guanajuato', industria: 'Automotriz', ejecutivo: 'CR', contacto: { nombre: 'Yesenia America Landa Juarez', puesto: 'Jefe de Seguridad y Medio Ambiente', correo: 'ylanda@nsm-mx.com', telefono: '4773090323' }, servicios: ['rme'], status: 'Lead nuevo', semana: null, fecha: null, propuesta: { status: null, ventaTotal: null, utilidad: null, carton: null, playo: null }, motivoRechazo: null, comentarios: '', volumenEstimado: null, facturacionEstimada: null },
  { id: 105, empresa: 'Astemo Silao', planta: null, ciudad: 'Silao, Guanajuato', industria: 'Automotriz', ejecutivo: 'CR', contacto: { nombre: 'Patricia Moramay Patiño de Lucio', puesto: 'Assistant Manager HSE', correo: 'patricia.patino.qh@astemo.com', telefono: '477 126 0516' }, servicios: ['rme'], status: 'Lead nuevo', semana: null, fecha: null, propuesta: { status: null, ventaTotal: null, utilidad: null, carton: null, playo: null }, motivoRechazo: null, comentarios: '', volumenEstimado: null, facturacionEstimada: null },
  { id: 106, empresa: 'Ashimori Industria de México', planta: null, ciudad: 'Guanajuato', industria: 'Automotriz', ejecutivo: 'CR', contacto: { nombre: 'Jonathan Baruk García González', puesto: 'Ingeniero de medio ambiente', correo: 'baruk.garcia@ashimorimexico.com', telefono: '4772768003' }, servicios: ['rme'], status: 'Lead nuevo', semana: null, fecha: null, propuesta: { status: null, ventaTotal: null, utilidad: null, carton: null, playo: null }, motivoRechazo: null, comentarios: '', volumenEstimado: null, facturacionEstimada: null },
  { id: 107, empresa: 'Avanzar Interior (Adient)', planta: null, ciudad: 'Celaya, Guanajuato', industria: 'Automotriz', ejecutivo: 'CR', contacto: { nombre: 'Ricardo Plazola Navarrete', puesto: 'EHS Superintendente', correo: 'ricardo.plazola@adient.com', telefono: '4622351833' }, servicios: ['rme'], status: 'Lead nuevo', semana: null, fecha: null, propuesta: { status: null, ventaTotal: null, utilidad: null, carton: null, playo: null }, motivoRechazo: null, comentarios: '', volumenEstimado: null, facturacionEstimada: null },
  { id: 108, empresa: 'Furukawa Automotive Systems', planta: null, ciudad: 'San Luis Potosí', industria: 'Automotriz', ejecutivo: 'CR', contacto: { nombre: 'Ignacio Quiroz Rodriguez', puesto: 'Supervisor SR de SSyMA', correo: 'iquiroz01@fasmexico.com', telefono: '4111243211' }, servicios: ['rme'], status: 'Lead nuevo', semana: null, fecha: null, propuesta: { status: null, ventaTotal: null, utilidad: null, carton: null, playo: null }, motivoRechazo: null, comentarios: '', volumenEstimado: null, facturacionEstimada: null },
  { id: 109, empresa: 'Hutchinson Autopartes Mexico', planta: null, ciudad: 'Celaya, Guanajuato', industria: 'Automotriz', ejecutivo: 'CR', contacto: { nombre: 'Claudia Rodriguez Mtz', puesto: 'Gte. Compras', correo: 'claudia.rodriguez@hutchinson.com', telefono: '4612109743' }, servicios: ['rsu'], status: 'Propuesta enviada', semana: null, fecha: '2026-02-01', propuesta: { status: null, ventaTotal: null, utilidad: null, carton: null, playo: null }, motivoRechazo: null, comentarios: 'Se presentó propuesta licitación RSU, en espera de fallo', volumenEstimado: null, facturacionEstimada: null },
  { id: 110, empresa: 'TYW Manufacturing Mexico', planta: null, ciudad: 'Celaya, Guanajuato', industria: 'Automotriz', ejecutivo: 'CR', contacto: { nombre: 'Lucas Fu', puesto: 'Gerente General', correo: 'tywmanufacturingmexico@gmail.com', telefono: '4622543278' }, servicios: ['rme'], status: 'Lead nuevo', semana: null, fecha: null, propuesta: { status: null, ventaTotal: null, utilidad: null, carton: null, playo: null }, motivoRechazo: null, comentarios: '', volumenEstimado: null, facturacionEstimada: null },
  { id: 111, empresa: 'Tsubakimoto Automotive Mexico', planta: null, ciudad: 'Guanajuato', industria: 'Automotriz', ejecutivo: 'CR', contacto: { nombre: 'Claudia Irene García Martínez', puesto: 'Gerente de EHS', correo: 'c.garcia@tsubakimoto.com.mx', telefono: '4777300614' }, servicios: ['rme'], status: 'Reunión agendada', semana: null, fecha: null, propuesta: { status: null, ventaTotal: null, utilidad: null, carton: null, playo: null }, motivoRechazo: null, comentarios: 'En seguimiento, en espera de que comparta volúmenes y confirme cita para levantamiento', volumenEstimado: null, facturacionEstimada: null },
  { id: 112, empresa: 'VCST de México', planta: null, ciudad: 'Guanajuato', industria: 'Automotriz', ejecutivo: 'CR', contacto: { nombre: 'Mayra Ivethe Murillo Flores', puesto: 'EHS Officer', correo: 'mayra.murillo@vcst.com', telefono: '4774018874' }, servicios: ['rme'], status: 'Lead nuevo', semana: null, fecha: null, propuesta: { status: null, ventaTotal: null, utilidad: null, carton: null, playo: null }, motivoRechazo: null, comentarios: '', volumenEstimado: null, facturacionEstimada: null },
  { id: 113, empresa: 'OSG Royco', planta: null, ciudad: 'Toluca, Estado de México', industria: 'Automotriz', ejecutivo: 'CR', contacto: { nombre: 'Luis Guillermo Aguirre Villarreal', puesto: 'Coordinador Certificación Ambiental', correo: 'luis.aguirre@osgroyco.com.mx', telefono: '722 410 3324' }, servicios: ['rme'], status: 'Lead nuevo', semana: null, fecha: null, propuesta: { status: null, ventaTotal: null, utilidad: null, carton: null, playo: null }, motivoRechazo: null, comentarios: '', volumenEstimado: null, facturacionEstimada: null },
  { id: 114, empresa: 'AFT Automotive Mx', planta: null, ciudad: 'Guanajuato', industria: 'Automotriz', ejecutivo: 'CR', contacto: { nombre: 'Lucia Shalom Hernandez Mendez', puesto: 'Project Manager', correo: 's.hernandez@aft-automotive.mx', telefono: '4792326386' }, servicios: ['rme'], status: 'Lead nuevo', semana: null, fecha: null, propuesta: { status: null, ventaTotal: null, utilidad: null, carton: null, playo: null }, motivoRechazo: null, comentarios: '', volumenEstimado: null, facturacionEstimada: null },
  { id: 115, empresa: 'USUI International Manufacturing', planta: null, ciudad: 'Guanajuato', industria: 'Automotriz', ejecutivo: 'CR', contacto: { nombre: 'Luis Antonio Roque Frausto', puesto: 'Operations Manager', correo: 'LuisRoque@usui.co.jp', telefono: '4777247061' }, servicios: ['rme'], status: 'Lead nuevo', semana: null, fecha: null, propuesta: { status: null, ventaTotal: null, utilidad: null, carton: null, playo: null }, motivoRechazo: null, comentarios: '', volumenEstimado: null, facturacionEstimada: null },
  { id: 116, empresa: 'SARRELMEX', planta: null, ciudad: 'Celaya, Guanajuato', industria: 'Automotriz', ejecutivo: 'CR', contacto: { nombre: 'Francisco Javier Quevedo Hernandez', puesto: 'Coord. de EHS', correo: 'ehs@sarrel.com', telefono: '4613451860' }, servicios: ['rme'], status: 'Propuesta enviada', semana: null, fecha: '2026-01-15', propuesta: { status: null, ventaTotal: null, utilidad: null, carton: null, playo: null }, motivoRechazo: null, comentarios: 'Se presentó propuesta. Fallo negativo inicial — precios fuera de rango. Se dio oportunidad de contrapropuesta, en seguimiento.', volumenEstimado: null, facturacionEstimada: null },
  { id: 117, empresa: 'Pasubio Mexico', planta: null, ciudad: 'León, Guanajuato', industria: 'Automotriz', ejecutivo: 'CR', contacto: { nombre: 'Joel Cuellar Mireles', puesto: 'Director de Planta', correo: 'joel.cuellar@pasubio.com', telefono: '477 592 0625' }, servicios: ['rme'], status: 'Lead nuevo', semana: null, fecha: null, propuesta: { status: null, ventaTotal: null, utilidad: null, carton: null, playo: null }, motivoRechazo: null, comentarios: '', volumenEstimado: null, facturacionEstimada: null },
  { id: 118, empresa: 'Toyoetsu de Mexico', planta: null, ciudad: 'San Miguel de Allende', industria: 'Automotriz', ejecutivo: 'CR', contacto: { nombre: 'Juan Manuel Medina', puesto: 'Responsable Ambiental', correo: 'jumedina@ttna.com', telefono: '4421099466' }, servicios: ['rme'], status: 'Lead nuevo', semana: null, fecha: null, propuesta: { status: null, ventaTotal: null, utilidad: null, carton: null, playo: null }, motivoRechazo: null, comentarios: '', volumenEstimado: null, facturacionEstimada: null },
  { id: 119, empresa: 'Inteva Mexico', planta: null, ciudad: 'Guanajuato', industria: 'Automotriz', ejecutivo: 'CR', contacto: { nombre: 'Rosalba Zuñiga Lopez', puesto: 'EHS and Security Responsible', correo: 'Rzuniga@intevaproducts.com', telefono: '4791024463' }, servicios: ['rme'], status: 'Lead nuevo', semana: null, fecha: null, propuesta: { status: null, ventaTotal: null, utilidad: null, carton: null, playo: null }, motivoRechazo: null, comentarios: '', volumenEstimado: null, facturacionEstimada: null },
  { id: 120, empresa: 'KASAI Mexicana', planta: null, ciudad: 'Guanajuato', industria: 'Automotriz', ejecutivo: 'CR', contacto: { nombre: 'Martha Angelica Quesada Duran', puesto: 'EHS Manager', correo: 'martha.quesada@kasai-group.com', telefono: '4771231911' }, servicios: ['rme'], status: 'Reunión agendada', semana: null, fecha: null, propuesta: { status: null, ventaTotal: null, utilidad: null, carton: null, playo: null }, motivoRechazo: null, comentarios: 'En comunicación, en espera de concertar cita con Gerente de compras para presentación', volumenEstimado: null, facturacionEstimada: null },
  { id: 121, empresa: 'Almond Cataforesis', planta: null, ciudad: 'Guanajuato', industria: 'Automotriz', ejecutivo: 'CR', contacto: { nombre: 'Mauricio Ramirez', puesto: 'Sup. EHS', correo: 'mantenimiento@almondcataforesis.com', telefono: '4724788600' }, servicios: ['rme'], status: 'Lead nuevo', semana: null, fecha: null, propuesta: { status: null, ventaTotal: null, utilidad: null, carton: null, playo: null }, motivoRechazo: null, comentarios: '', volumenEstimado: null, facturacionEstimada: null },
  { id: 122, empresa: 'Celay S.A. de C.V.', planta: null, ciudad: 'Celaya, Guanajuato', industria: 'Automotriz', ejecutivo: 'CR', contacto: { nombre: 'Samantha Montalvo Rodriguez', puesto: 'Coordinadora SSyMA', correo: 'tecenfermeria@celay.com.mx', telefono: '4641811511' }, servicios: ['rme'], status: 'Lead nuevo', semana: null, fecha: null, propuesta: { status: null, ventaTotal: null, utilidad: null, carton: null, playo: null }, motivoRechazo: null, comentarios: '', volumenEstimado: null, facturacionEstimada: null },
  { id: 123, empresa: 'Wollsdorf Mexico', planta: null, ciudad: 'Guanajuato', industria: 'Automotriz', ejecutivo: 'CR', contacto: { nombre: 'Rafael Lopez', puesto: 'HSE+HR Manager', correo: 'rafael.lopez@wollsdorf.com', telefono: '4778060290' }, servicios: ['rme'], status: 'Lead nuevo', semana: null, fecha: null, propuesta: { status: null, ventaTotal: null, utilidad: null, carton: null, playo: null }, motivoRechazo: null, comentarios: '', volumenEstimado: null, facturacionEstimada: null },
  { id: 124, empresa: 'Minebea AccessSolutions Mexico', planta: null, ciudad: 'Celaya, Guanajuato', industria: 'Automotriz', ejecutivo: 'CR', contacto: { nombre: 'Jose Francisco Baltazar Samudio', puesto: 'A.Manager EHS', correo: 'jose_baltazar@minebea-as.com', telefono: '4621264932' }, servicios: ['rme'], status: 'Lead nuevo', semana: null, fecha: null, propuesta: { status: null, ventaTotal: null, utilidad: null, carton: null, playo: null }, motivoRechazo: null, comentarios: '', volumenEstimado: null, facturacionEstimada: null },
  { id: 125, empresa: 'IKD Mexico', planta: null, ciudad: 'Celaya, Guanajuato', industria: 'Automotriz', ejecutivo: 'CR', contacto: { nombre: 'Jorge Luis Esquinca Pacheco', puesto: 'Gerente Infraestructura y Equipamiento', correo: 'jorge.esquinca@ikdmexico.com', telefono: '4622527287' }, servicios: ['rme'], status: 'Lead nuevo', semana: null, fecha: null, propuesta: { status: null, ventaTotal: null, utilidad: null, carton: null, playo: null }, motivoRechazo: null, comentarios: '', volumenEstimado: null, facturacionEstimada: null },
  { id: 126, empresa: 'NKPM Mexico', planta: null, ciudad: 'Guanajuato', industria: 'Automotriz', ejecutivo: 'CR', contacto: { nombre: 'Enrique Garcia', puesto: 'Especialista en Logística y cadena de suministro', correo: 'enrique.garcia@nkpm.com.mx', telefono: '' }, servicios: ['rme'], status: 'Lead nuevo', semana: null, fecha: null, propuesta: { status: null, ventaTotal: null, utilidad: null, carton: null, playo: null }, motivoRechazo: null, comentarios: '', volumenEstimado: null, facturacionEstimada: null },
  { id: 127, empresa: 'MAZDA', planta: null, ciudad: 'Salamanca, Guanajuato', industria: 'Automotriz', ejecutivo: 'CR', contacto: { nombre: 'Karla Paramo Garcia', puesto: 'Coordinador PR & BR', correo: 'paramo.k@mx.mazda.com', telefono: '464 647 9300 x6081' }, servicios: ['rme'], status: 'Lead nuevo', semana: null, fecha: null, propuesta: { status: null, ventaTotal: null, utilidad: null, carton: null, playo: null }, motivoRechazo: null, comentarios: '', volumenEstimado: null, facturacionEstimada: null },
  { id: 128, empresa: 'Nissen Chemitec Mexico', planta: null, ciudad: 'Guanajuato', industria: 'Automotriz', ejecutivo: 'CR', contacto: { nombre: 'Franco Omar', puesto: '', correo: 'ofranco@nissenchemitec.mx', telefono: '' }, servicios: ['rme'], status: 'Lead nuevo', semana: null, fecha: null, propuesta: { status: null, ventaTotal: null, utilidad: null, carton: null, playo: null }, motivoRechazo: null, comentarios: '', volumenEstimado: null, facturacionEstimada: null },
  { id: 129, empresa: 'General Motors de Mexico', planta: 'Planta Silao', ciudad: 'Silao, Guanajuato', industria: 'Automotriz', ejecutivo: 'CR', contacto: { nombre: 'Victor Cabral', puesto: 'Director', correo: 'victor.cabral@gm.com', telefono: '' }, servicios: ['rme'], status: 'Lead nuevo', semana: null, fecha: null, propuesta: { status: null, ventaTotal: null, utilidad: null, carton: null, playo: null }, motivoRechazo: null, comentarios: '', volumenEstimado: null, facturacionEstimada: null },
  { id: 130, empresa: 'Toyota Motor Manufacturing de Guanajuato', planta: null, ciudad: 'Apaseo el Grande, Guanajuato', industria: 'Automotriz', ejecutivo: 'CR', contacto: { nombre: 'Sonia Ayma', puesto: 'Gerente de asuntos externos y RSE', correo: 'sonia.ayma@toyota.com', telefono: '' }, servicios: ['rme'], status: 'Lead nuevo', semana: null, fecha: null, propuesta: { status: null, ventaTotal: null, utilidad: null, carton: null, playo: null }, motivoRechazo: null, comentarios: '', volumenEstimado: null, facturacionEstimada: null },
  { id: 131, empresa: 'Honda de Mexico', planta: 'Planta Celaya', ciudad: 'Celaya, Guanajuato', industria: 'Automotriz', ejecutivo: 'CR', contacto: { nombre: 'J. Luis Tejeda Rico', puesto: 'Business Celaya & RMO', correo: 'luis_tejeda@hdm.honda.com', telefono: '' }, servicios: ['rme'], status: 'Lead nuevo', semana: null, fecha: null, propuesta: { status: null, ventaTotal: null, utilidad: null, carton: null, playo: null }, motivoRechazo: null, comentarios: '', volumenEstimado: null, facturacionEstimada: null },
  { id: 132, empresa: "L'Oréal", planta: 'Planta Cosbel', ciudad: 'Estado de México', industria: 'Cosmética y cuidado personal', ejecutivo: 'CR', contacto: { nombre: 'Miriam Alvarez', puesto: 'Compras indirectas', correo: 'miriam.alvarez@loreal.com', telefono: '55 4354 5773' }, servicios: ['rme'], status: 'Propuesta enviada', semana: null, fecha: '2026-01-20', propuesta: { status: null, ventaTotal: null, utilidad: null, carton: null, playo: null }, motivoRechazo: null, comentarios: 'En proceso de licitación, segundo round, en espera de instrucciones', volumenEstimado: null, facturacionEstimada: null },
  { id: 133, empresa: "L'Oréal", planta: 'Planta Centrex', ciudad: 'Estado de México', industria: 'Cosmética y cuidado personal', ejecutivo: 'CR', contacto: { nombre: 'Miriam Alvarez', puesto: 'Compras indirectas', correo: 'miriam.alvarez@loreal.com', telefono: '55 4354 5773' }, servicios: ['rme'], status: 'Propuesta enviada', semana: null, fecha: '2026-01-20', propuesta: { status: null, ventaTotal: null, utilidad: null, carton: null, playo: null }, motivoRechazo: null, comentarios: 'En proceso de licitación, segundo round, en espera de instrucciones', volumenEstimado: null, facturacionEstimada: null },
  { id: 134, empresa: "L'Oréal", planta: 'Planta Mitikah', ciudad: 'CDMX', industria: 'Cosmética y cuidado personal', ejecutivo: 'CR', contacto: { nombre: 'Miriam Alvarez', puesto: 'Compras indirectas', correo: 'miriam.alvarez@loreal.com', telefono: '55 4354 5773' }, servicios: ['rme'], status: 'Propuesta enviada', semana: null, fecha: '2026-01-20', propuesta: { status: null, ventaTotal: null, utilidad: null, carton: null, playo: null }, motivoRechazo: null, comentarios: 'En proceso de licitación, segundo round, en espera de instrucciones', volumenEstimado: null, facturacionEstimada: null },
  { id: 135, empresa: 'HOPE GLOBAL', planta: null, ciudad: 'León, Guanajuato', industria: 'Automotriz', ejecutivo: 'CR', contacto: { nombre: 'Ivette Medina A.', puesto: 'Compras', correo: 'gmedina@hopeglobal.com', telefono: '477 441 4664' }, servicios: ['rme'], status: 'Propuesta enviada', semana: null, fecha: '2026-02-05', propuesta: { status: null, ventaTotal: null, utilidad: null, carton: null, playo: null }, motivoRechazo: null, comentarios: 'Se presentó Propuesta 05 feb/2026, en espera de fallo', volumenEstimado: null, facturacionEstimada: null },
  { id: 136, empresa: 'SOVERE', planta: 'Planta Sol', ciudad: 'León, Guanajuato', industria: 'Automotriz', ejecutivo: 'CR', contacto: { nombre: 'Yanete Jaramillo', puesto: 'Jefe de sistema de gestión y Seg', correo: 'sgc@sovere.com.mx', telefono: '477 142 7930' }, servicios: ['rme'], status: 'Levantamiento', semana: null, fecha: null, propuesta: { status: null, ventaTotal: null, utilidad: null, carton: null, playo: null }, motivoRechazo: null, comentarios: 'En espera de presentar propuesta', volumenEstimado: null, facturacionEstimada: null },
  { id: 137, empresa: 'SOVERE', planta: 'Planta 1', ciudad: 'León, Guanajuato', industria: 'Automotriz', ejecutivo: 'CR', contacto: { nombre: 'Yanete Jaramillo', puesto: 'Jefe de sistema de gestión y Seg', correo: 'sgc@sovere.com.mx', telefono: '477 142 7930' }, servicios: ['rme'], status: 'Levantamiento', semana: null, fecha: null, propuesta: { status: null, ventaTotal: null, utilidad: null, carton: null, playo: null }, motivoRechazo: null, comentarios: 'En espera de presentar propuesta', volumenEstimado: null, facturacionEstimada: null },
  { id: 138, empresa: 'MAGNA COSMA', planta: 'Planta SLP', ciudad: 'San Luis Potosí', industria: 'Automotriz', ejecutivo: 'CR', contacto: { nombre: 'Ma. Guadalupe Loredo', puesto: 'Compras', correo: 'maguadalupe.loredo@magna.com', telefono: '444 499 8300' }, servicios: ['rp'], status: 'Propuesta enviada', semana: null, fecha: '2026-01-28', propuesta: { status: null, ventaTotal: null, utilidad: null, carton: null, playo: null }, motivoRechazo: null, comentarios: 'Se presentó propuesta licitación residuos peligrosos, en espera de fallo', volumenEstimado: null, facturacionEstimada: null },
  // ==========================================================================
  // CARMEN RODRÍGUEZ (CR) OPORTUNIDADES NO GANADAS - IDs 139-157
  // ==========================================================================
  { id: 139, empresa: 'MARQUARDT', planta: 'Puerto Interior', ciudad: 'Silao, Guanajuato', industria: 'Automotriz', ejecutivo: 'CR', contacto: { nombre: 'Gema Espinoza', puesto: 'Compras', correo: 'Gema.Espinoza@marquardt.com', telefono: '462 187 4457' }, servicios: ['rme'], status: 'Propuesta Rechazada', semana: null, fecha: null, propuesta: { status: 'Rechazada', ventaTotal: null, utilidad: null, carton: null, playo: null }, motivoRechazo: 'Precios considerados excesivamente altos', comentarios: 'Propuesta Manejo Integral rechazada por costos altos', volumenEstimado: null, facturacionEstimada: null },
  { id: 140, empresa: 'NSK Warner', planta: null, ciudad: 'Guanajuato', industria: 'Automotriz', ejecutivo: 'CR', contacto: { nombre: 'Alejandro Gonzalez / Itchel Romero', puesto: 'Compras / Seg e Hig', correo: 'alejandro.gonzalez@nsk.com', telefono: '4775283578' }, servicios: ['rme'], status: 'Propuesta Rechazada', semana: null, fecha: null, propuesta: { status: 'Rechazada', ventaTotal: null, utilidad: null, carton: null, playo: null }, motivoRechazo: 'Propuesta no se alineaba a sus expectativas', comentarios: 'Propuesta Manejo Integral, fallo no favorable', volumenEstimado: null, facturacionEstimada: null },
  { id: 141, empresa: 'NSK Bearings', planta: null, ciudad: 'Guanajuato', industria: 'Automotriz', ejecutivo: 'CR', contacto: { nombre: 'Alejandro Gonzalez / Itchel Romero', puesto: 'Compras / Seg e Hig', correo: 'alejandro.gonzalez@nsk.com', telefono: '4775283578' }, servicios: ['rme'], status: 'Propuesta Rechazada', semana: null, fecha: null, propuesta: { status: 'Rechazada', ventaTotal: null, utilidad: null, carton: null, playo: null }, motivoRechazo: 'Propuesta no se alineaba a sus expectativas', comentarios: 'Propuesta Manejo Integral, fallo no favorable', volumenEstimado: null, facturacionEstimada: null },
  { id: 142, empresa: 'Continental', planta: 'FIPASI Silao', ciudad: 'Silao, Guanajuato', industria: 'Automotriz/Neumáticos', ejecutivo: 'CR', contacto: { nombre: 'Nancy Federico', puesto: 'Compras', correo: 'nancy.federico@continental-corporation.com', telefono: '333 955 5274' }, servicios: ['rme'], status: 'Propuesta Rechazada', semana: null, fecha: null, propuesta: { status: 'Rechazada', ventaTotal: null, utilidad: null, carton: null, playo: null }, motivoRechazo: 'Propuesta no suficientemente buena, eligieron otros participantes', comentarios: 'No hemos sido invitados nuevamente', volumenEstimado: null, facturacionEstimada: null },
  { id: 143, empresa: 'Continental Contitech', planta: 'Planta 3 CS - SLP', ciudad: 'San Luis Potosí', industria: 'Automotriz/Neumáticos', ejecutivo: 'CR', contacto: { nombre: 'Nancy Federico', puesto: 'Compras', correo: 'nancy.federico@continental-corporation.com', telefono: '333 955 5274' }, servicios: ['rme'], status: 'Propuesta Rechazada', semana: null, fecha: null, propuesta: { status: 'Rechazada', ventaTotal: null, utilidad: null, carton: null, playo: null }, motivoRechazo: 'Propuesta no suficientemente buena', comentarios: 'No hemos sido invitados nuevamente', volumenEstimado: null, facturacionEstimada: null },
  { id: 144, empresa: 'Continental Contitech', planta: 'Planta 2 PTG - SLP', ciudad: 'San Luis Potosí', industria: 'Automotriz/Neumáticos', ejecutivo: 'CR', contacto: { nombre: 'Nancy Federico', puesto: 'Compras', correo: 'nancy.federico@continental-corporation.com', telefono: '333 955 5274' }, servicios: ['rme'], status: 'Propuesta Rechazada', semana: null, fecha: null, propuesta: { status: 'Rechazada', ventaTotal: null, utilidad: null, carton: null, playo: null }, motivoRechazo: 'Propuesta no suficientemente buena', comentarios: 'No hemos sido invitados nuevamente', volumenEstimado: null, facturacionEstimada: null },
  { id: 145, empresa: 'Continental Contitech', planta: 'Planta 1 ADI - SLP', ciudad: 'San Luis Potosí', industria: 'Automotriz/Neumáticos', ejecutivo: 'CR', contacto: { nombre: 'Nancy Federico', puesto: 'Compras', correo: 'nancy.federico@continental-corporation.com', telefono: '333 955 5274' }, servicios: ['rme'], status: 'Propuesta Rechazada', semana: null, fecha: null, propuesta: { status: 'Rechazada', ventaTotal: null, utilidad: null, carton: null, playo: null }, motivoRechazo: 'Propuesta no suficientemente buena', comentarios: 'No hemos sido invitados nuevamente', volumenEstimado: null, facturacionEstimada: null },
  { id: 146, empresa: 'Continental Contitech', planta: 'Planta 5 SSL - SLP', ciudad: 'San Luis Potosí', industria: 'Automotriz/Neumáticos', ejecutivo: 'CR', contacto: { nombre: 'Nancy Federico', puesto: 'Compras', correo: 'nancy.federico@continental-corporation.com', telefono: '333 955 5274' }, servicios: ['rme'], status: 'Propuesta Rechazada', semana: null, fecha: null, propuesta: { status: 'Rechazada', ventaTotal: null, utilidad: null, carton: null, playo: null }, motivoRechazo: 'Propuesta no suficientemente buena', comentarios: 'No hemos sido invitados nuevamente', volumenEstimado: null, facturacionEstimada: null },
  { id: 147, empresa: 'Continental Contitech', planta: 'Planta 4 ADSM - SLP', ciudad: 'San Luis Potosí', industria: 'Automotriz/Neumáticos', ejecutivo: 'CR', contacto: { nombre: 'Nancy Federico', puesto: 'Compras', correo: 'nancy.federico@continental-corporation.com', telefono: '333 955 5274' }, servicios: ['rme'], status: 'Propuesta Rechazada', semana: null, fecha: null, propuesta: { status: 'Rechazada', ventaTotal: null, utilidad: null, carton: null, playo: null }, motivoRechazo: 'Propuesta no suficientemente buena', comentarios: 'No hemos sido invitados nuevamente', volumenEstimado: null, facturacionEstimada: null },
  { id: 148, empresa: 'Grupo FLEXI', planta: 'Planta Advance', ciudad: 'León, Guanajuato', industria: 'Calzado', ejecutivo: 'CR', contacto: { nombre: 'Julieta Ramirez Arriaga', puesto: 'Compras', correo: 'jrmzarriaga@flexi.com.mx', telefono: '' }, servicios: ['rme', 'rp', 'rsu'], status: 'Propuesta Rechazada', semana: null, fecha: '2026-01-15', propuesta: { status: 'Rechazada', ventaTotal: null, utilidad: null, carton: null, playo: null }, motivoRechazo: 'Costos aumentan hasta 136% vs actuales', comentarios: 'Propuesta manejo integral enero 2026, costos no competitivos', volumenEstimado: null, facturacionEstimada: null },
  { id: 149, empresa: 'Grupo FLEXI', planta: 'CEDIS Puerto Interior', ciudad: 'Silao, Guanajuato', industria: 'Calzado', ejecutivo: 'CR', contacto: { nombre: 'Julieta Ramirez Arriaga', puesto: 'Compras', correo: 'jrmzarriaga@flexi.com.mx', telefono: '' }, servicios: ['rme', 'rp', 'rsu'], status: 'Propuesta Rechazada', semana: null, fecha: '2026-01-15', propuesta: { status: 'Rechazada', ventaTotal: null, utilidad: null, carton: null, playo: null }, motivoRechazo: 'Costos aumentan hasta 136% vs actuales', comentarios: 'Propuesta manejo integral enero 2026, costos no competitivos', volumenEstimado: null, facturacionEstimada: null },
  { id: 150, empresa: 'Grupo FLEXI', planta: 'Planta Duende', ciudad: 'León, Guanajuato', industria: 'Calzado', ejecutivo: 'CR', contacto: { nombre: 'Julieta Ramirez Arriaga', puesto: 'Compras', correo: 'jrmzarriaga@flexi.com.mx', telefono: '' }, servicios: ['rme', 'rp', 'rsu'], status: 'Propuesta Rechazada', semana: null, fecha: '2026-01-15', propuesta: { status: 'Rechazada', ventaTotal: null, utilidad: null, carton: null, playo: null }, motivoRechazo: 'Costos aumentan hasta 136% vs actuales', comentarios: 'Propuesta manejo integral enero 2026, costos no competitivos', volumenEstimado: null, facturacionEstimada: null },
  { id: 151, empresa: 'Grupo FLEXI', planta: 'Planta Oriental', ciudad: 'León, Guanajuato', industria: 'Calzado', ejecutivo: 'CR', contacto: { nombre: 'Julieta Ramirez Arriaga', puesto: 'Compras', correo: 'jrmzarriaga@flexi.com.mx', telefono: '' }, servicios: ['rme', 'rp', 'rsu'], status: 'Propuesta Rechazada', semana: null, fecha: '2026-01-15', propuesta: { status: 'Rechazada', ventaTotal: null, utilidad: null, carton: null, playo: null }, motivoRechazo: 'Costos aumentan hasta 136% vs actuales', comentarios: 'Propuesta manejo integral enero 2026, costos no competitivos', volumenEstimado: null, facturacionEstimada: null },
  { id: 152, empresa: 'Grupo FLEXI', planta: 'Planta Stiva', ciudad: 'León, Guanajuato', industria: 'Calzado', ejecutivo: 'CR', contacto: { nombre: 'Julieta Ramirez Arriaga', puesto: 'Compras', correo: 'jrmzarriaga@flexi.com.mx', telefono: '' }, servicios: ['rme', 'rp', 'rsu'], status: 'Propuesta Rechazada', semana: null, fecha: '2026-01-15', propuesta: { status: 'Rechazada', ventaTotal: null, utilidad: null, carton: null, playo: null }, motivoRechazo: 'Costos aumentan hasta 136% vs actuales', comentarios: 'Propuesta manejo integral enero 2026, costos no competitivos', volumenEstimado: null, facturacionEstimada: null },
  { id: 153, empresa: 'Schreiber Foods', planta: 'Puerto Interior', ciudad: 'Silao, Guanajuato', industria: 'Alimentos y Lácteos', ejecutivo: 'CR', contacto: { nombre: 'Juan Carlos Salazar', puesto: 'Compras', correo: 'JuanCarlos.SalazarRamirez@schreiberfoods.com', telefono: '' }, servicios: ['rme'], status: 'Propuesta Rechazada', semana: null, fecha: null, propuesta: { status: 'Rechazada', ventaTotal: null, utilidad: null, carton: null, playo: null }, motivoRechazo: 'Precios no competitivos con otros proveedores', comentarios: 'Propuesta manejo integral no aprobada', volumenEstimado: null, facturacionEstimada: null },
  { id: 154, empresa: 'AGRIZAR', planta: 'Planta Silao', ciudad: 'Silao, Guanajuato', industria: 'Alimentos y Lácteos', ejecutivo: 'CR', contacto: { nombre: 'Lorena Luna Covarubias', puesto: 'Compras', correo: 'lorena.luna@agrizar.com', telefono: '462 251 1500' }, servicios: ['rme'], status: 'Propuesta Rechazada', semana: null, fecha: null, propuesta: { status: 'Rechazada', ventaTotal: null, utilidad: null, carton: null, playo: null }, motivoRechazo: 'No somos competitivos, precios más elevados a los actuales', comentarios: 'Propuesta Manejo Integral rechazada', volumenEstimado: null, facturacionEstimada: null },
  { id: 155, empresa: 'ArcelorMittal', planta: 'Planta Siderúrgica', ciudad: 'Lázaro Cárdenas, Michoacán', industria: 'Siderúrgica y Acero', ejecutivo: 'CR', contacto: { nombre: 'Jair Hernandez', puesto: 'Compras', correo: 'MX.Jair.Hernandez@arcelormittal.com', telefono: '' }, servicios: ['rme'], status: 'Propuesta Rechazada', semana: null, fecha: null, propuesta: { status: 'Rechazada', ventaTotal: null, utilidad: null, carton: null, playo: null }, motivoRechazo: 'Declinamos - sin proveeduría en la zona', comentarios: 'Invitados 2 veces a licitar. Primera vez fuimos a levantamiento sin presentar propuesta. Segunda vez declinamos.', volumenEstimado: null, facturacionEstimada: null },
  { id: 156, empresa: 'ArcelorMittal', planta: 'Mina', ciudad: 'Lázaro Cárdenas, Michoacán', industria: 'Siderúrgica y Acero', ejecutivo: 'CR', contacto: { nombre: 'Jair Hernandez', puesto: 'Compras', correo: 'MX.Jair.Hernandez@arcelormittal.com', telefono: '753 139 5823' }, servicios: ['rme'], status: 'Propuesta Rechazada', semana: null, fecha: null, propuesta: { status: 'Rechazada', ventaTotal: null, utilidad: null, carton: null, playo: null }, motivoRechazo: 'Declinamos - sin proveeduría en la zona', comentarios: 'Invitados 2 veces a licitar, declinamos por falta de proveeduría', volumenEstimado: null, facturacionEstimada: null },
  { id: 157, empresa: 'BOS Automotive', planta: 'Planta Irapuato', ciudad: 'Irapuato, Guanajuato', industria: 'Automotriz', ejecutivo: 'CR', contacto: { nombre: 'Saul Garcia', puesto: 'Compras', correo: 'sfgarcia@bos.de', telefono: '' }, servicios: ['biodigestores'], status: 'Propuesta Rechazada', semana: null, fecha: null, propuesta: { status: 'Rechazada', ventaTotal: null, utilidad: null, carton: null, playo: null }, motivoRechazo: 'No viable por el momento', comentarios: 'Propuesta Biodigestor rechazada', volumenEstimado: null, facturacionEstimada: null },
];

// leadsData ahora se genera dinámicamente desde topProspectos
const leadsData = topProspectos.map(p => ({
  id: p.id,
  empresa: p.empresa + (p.planta ? ` - ${p.planta}` : ''),
  contacto: p.contacto?.nombre ? `${p.contacto.nombre} - ${p.contacto.puesto || ''}` : 'Sin contacto',
  fecha: p.fecha || null,
  origen: 'Directo',
  valor: p.propuesta?.ventaTotal || p.facturacionEstimada || 0,
  industria: p.industria,
  ubicacion: p.ciudad,
  asignadoA: p.ejecutivo,
  status: p.status
}));

// Pipeline se calcula dinámicamente desde los datos reales
const calcularPipelineData = (prospectos) => {
  const stages = ['Lead nuevo', 'Reunión agendada', 'Levantamiento', 'Propuesta enviada', 'Inicio de operación'];
  return stages.map(stage => {
    const items = prospectos.filter(p => p.status === stage);
    return {
      etapa: stage,
      cantidad: items.length,
      valor: items.reduce((sum, p) => sum + (p.propuesta?.ventaTotal || p.facturacionEstimada || 0), 0),
      objetivo: stage === 'Lead nuevo' ? 50 : stage === 'Reunión agendada' ? 30 : stage === 'Levantamiento' ? 20 : stage === 'Propuesta enviada' ? 15 : 5
    };
  });
};

const pipelineData = calcularPipelineData(topProspectos);

// DATOS DEL EQUIPO REAL - INNOVATIVE GROUP
const salesTeamData = [
  {
    id: 1,
    codigo: 'VA',
    name: 'Veronica Arias',
    role: 'Directora Comercial',
    ubicacion: 'CDMX',
    zona: 'Nacional (Dirección)',
    leads: 4,
    levantamientos: 4,
    propuestasEnviadas: 5,
    reuniones: 4,
    cierres: 2,
    tasaConversion: 125,
    presupuestoAnual2026: 130130812,
    presupuestoMensual: 10844234,
    ventasReales: 4200000,
    cumplimientoPresupuesto: 31,
    tiempoRespuesta: '1.5 hrs',
    satisfaccionCliente: 4.9,
    activitiesSemanal: 35,
    eficienciaGlobal: 90,
    avatar: '👩‍💼',
    ultimaActividad: 'Kick Off Hub Digital Comercial',
    notas: 'Directora del equipo comercial. Presupuesto = total equipo ($164.5M). Prospectos directos con cuentas estratégicas.',
    // KPIs semanales reales del Excel (semana 31)
    kpisSemanales: [
      { semana: 31, leadsNuevos: 4, reunionesAgendadas: 4, levantamientos: 4, propuestasEnviadas: 5, propuestasRechazadas: 0 }
    ]
  },
  {
    id: 2,
    codigo: 'CR',
    name: 'Carmen Rodríguez',
    role: 'Ejecutiva Senior',
    ubicacion: 'León, Guanajuato',
    zona: 'Bajío',
    leads: 37,
    levantamientos: 2,
    propuestasEnviadas: 7,
    reuniones: 22,
    cierres: 0,
    tasaConversion: 19,
    presupuestoAnual2026: 47135000,
    presupuestoMensual: 3928000,
    ventasReales: 0,
    cumplimientoPresupuesto: 0,
    tiempoRespuesta: '1.5 hrs',
    satisfaccionCliente: 4.9,
    activitiesSemanal: 35,
    eficienciaGlobal: 85,
    avatar: '👩‍💼',
    ultimaActividad: 'Propuesta HOPE GLOBAL enviada 05/feb',
    notas: 'Ejecutiva más activa del equipo. 37 prospectos en seguimiento (zona Bajío/SLP). 7 propuestas enviadas en espera de fallo. 19 oportunidades rechazadas documentadas.',
    kpisSemanales: [
      { semana: 31, leadsNuevos: 6, reunionesAgendadas: 1, levantamientos: 0, propuestasEnviadas: 0, propuestasRechazadas: 2, comentario: 'MARQUARDT, NSK Warner – propuestas rechazadas' },
      { semana: 32, leadsNuevos: 2, reunionesAgendadas: 2, levantamientos: 1, propuestasEnviadas: 0, propuestasRechazadas: 2, comentario: 'NSK Bearings, Continental FIPASI – rechazadas' },
      { semana: 33, leadsNuevos: 5, reunionesAgendadas: 2, levantamientos: 0, propuestasEnviadas: 0, propuestasRechazadas: 5, comentario: 'Continental Contitech 5 plantas SLP – rechazadas' },
      { semana: 34, leadsNuevos: 6, reunionesAgendadas: 2, levantamientos: 0, propuestasEnviadas: 0, propuestasRechazadas: 5, comentario: 'Grupo FLEXI 5 plantas – costos +136%' },
      { semana: 35, leadsNuevos: 1, reunionesAgendadas: 2, levantamientos: 0, propuestasEnviadas: 1, propuestasRechazadas: 3, comentario: 'Schreiber, AGRIZAR, BOS – rechazadas. SARRELMEX propuesta enviada' },
      { semana: 36, leadsNuevos: 2, reunionesAgendadas: 2, levantamientos: 0, propuestasEnviadas: 1, propuestasRechazadas: 2, comentario: 'ArcelorMittal 2 plantas – declinamos. Hutchinson propuesta RSU enviada' },
      { semana: 37, leadsNuevos: 14, reunionesAgendadas: 5, levantamientos: 0, propuestasEnviadas: 3, propuestasRechazadas: 0, comentario: "L'Oréal 3 plantas – licitación segundo round" },
      { semana: 38, leadsNuevos: 1, reunionesAgendadas: 2, levantamientos: 2, propuestasEnviadas: 0, propuestasRechazadas: 0, comentario: 'SOVERE 2 plantas – levantamiento para propuesta' },
      { semana: 39, leadsNuevos: 0, reunionesAgendadas: 2, levantamientos: 0, propuestasEnviadas: 1, propuestasRechazadas: 0, comentario: 'MAGNA COSMA SLP – propuesta licitación RP' },
      { semana: 40, leadsNuevos: 0, reunionesAgendadas: 2, levantamientos: 0, propuestasEnviadas: 1, propuestasRechazadas: 0, comentario: 'HOPE GLOBAL – propuesta enviada 05/feb/2026' }
    ]
  },
  {
    id: 3,
    codigo: 'AM',
    name: 'Jose Armando Martínez',
    role: 'Ejecutivo Senior',
    ubicacion: 'Monterrey, NL',
    zona: 'Norte',
    leads: 57,
    levantamientos: 22,
    propuestasEnviadas: 2,
    reuniones: 37,
    cierres: 0,
    tasaConversion: 3.5,
    presupuestoAnual2026: 79577000,
    presupuestoMensual: 6631000,
    ventasReales: 0,
    cumplimientoPresupuesto: 0,
    tiempoRespuesta: '4.2 hrs',
    satisfaccionCliente: 4.2,
    activitiesSemanal: 45,
    eficienciaGlobal: 45,
    avatar: '👨‍💼',
    ultimaActividad: 'Visita Tampico - levantamiento OXXO',
    notas: 'Alto volumen, bajo cierre - único que hace knock knock. Zona Norte con alto potencial.',
    kpisSemanales: [
      { semana: 31, leadsNuevos: 11, reunionesAgendadas: 5, levantamientos: 1, propuestasEnviadas: 0, propuestasRechazadas: 0 },
      { semana: 32, leadsNuevos: 3, reunionesAgendadas: 3, levantamientos: 1, propuestasEnviadas: 0, propuestasRechazadas: 0 },
      { semana: 33, leadsNuevos: 5, reunionesAgendadas: 4, levantamientos: 3, propuestasEnviadas: 0, propuestasRechazadas: 0 },
      { semana: 34, leadsNuevos: 4, reunionesAgendadas: 2, levantamientos: 2, propuestasEnviadas: 0, propuestasRechazadas: 0 },
      { semana: 35, leadsNuevos: 2, reunionesAgendadas: 2, levantamientos: 0, propuestasEnviadas: 0, propuestasRechazadas: 0 },
      { semana: 36, leadsNuevos: 4, reunionesAgendadas: 0, levantamientos: 0, propuestasEnviadas: 0, propuestasRechazadas: 0 },
      { semana: 37, leadsNuevos: 6, reunionesAgendadas: 2, levantamientos: 0, propuestasEnviadas: 0, propuestasRechazadas: 0 },
      { semana: 39, leadsNuevos: 7, reunionesAgendadas: 5, levantamientos: 3, propuestasEnviadas: 0, propuestasRechazadas: 0 },
      { semana: 40, leadsNuevos: 2, reunionesAgendadas: 1, levantamientos: 2, propuestasEnviadas: 0, propuestasRechazadas: 0 },
      { semana: 41, leadsNuevos: 2, reunionesAgendadas: 2, levantamientos: 5, propuestasEnviadas: 0, propuestasRechazadas: 0 },
      { semana: 42, leadsNuevos: 2, reunionesAgendadas: 2, levantamientos: 1, propuestasEnviadas: 0, propuestasRechazadas: 0 },
      { semana: 43, leadsNuevos: 2, reunionesAgendadas: 2, levantamientos: 1, propuestasEnviadas: 0, propuestasRechazadas: 0 },
      { semana: 44, leadsNuevos: 3, reunionesAgendadas: 3, levantamientos: 1, propuestasEnviadas: 0, propuestasRechazadas: 0 },
      { semana: 45, leadsNuevos: 2, reunionesAgendadas: 2, levantamientos: 1, propuestasEnviadas: 0, propuestasRechazadas: 0 },
      { semana: 46, leadsNuevos: 2, reunionesAgendadas: 2, levantamientos: 1, propuestasEnviadas: 2, propuestasRechazadas: 0 }
    ]
  },
  {
    id: 4,
    codigo: 'LM',
    name: 'Laura Mesa',
    role: 'Ejecutiva',
    ubicacion: 'CDMX',
    zona: 'CDMX / Edo Mex',
    leads: 19,
    levantamientos: 0,
    propuestasEnviadas: 0,
    reuniones: 4,
    cierres: 2,
    tasaConversion: 0,
    presupuestoAnual2026: 10513000,
    presupuestoMensual: 876000,
    ventasReales: 0,
    cumplimientoPresupuesto: 0,
    tiempoRespuesta: '5.5 hrs',
    satisfaccionCliente: 4.0,
    activitiesSemanal: 12,
    eficienciaGlobal: 25,
    avatar: '👩‍💼',
    ultimaActividad: 'Office Depot - inicio de operación',
    notas: 'Contactos personales, necesita coaching en cierre. Contratos ganados: Office Depot, Mercado Libre.',
    kpisSemanales: [
      { semana: 31, leadsNuevos: 5, reunionesAgendadas: 1, levantamientos: 0, propuestasEnviadas: 0, propuestasRechazadas: 0 },
      { semana: 32, leadsNuevos: 5, reunionesAgendadas: 1, levantamientos: 0, propuestasEnviadas: 0, propuestasRechazadas: 0 },
      { semana: 33, leadsNuevos: 4, reunionesAgendadas: 0, levantamientos: 0, propuestasEnviadas: 0, propuestasRechazadas: 0 },
      { semana: 34, leadsNuevos: 5, reunionesAgendadas: 2, levantamientos: 0, propuestasEnviadas: 0, propuestasRechazadas: 0 }
    ]
  },
  {
    id: 6,
    codigo: 'CS',
    name: 'Cristina Sescosse',
    role: 'Ejecutiva',
    ubicacion: 'Guadalajara, Jalisco',
    zona: 'Occidente',
    leads: 0,
    levantamientos: 0,
    propuestasEnviadas: 0,
    reuniones: 0,
    cierres: 0,
    tasaConversion: 0,
    presupuestoAnual2026: 18107320,
    presupuestoMensual: 1509000,
    ventasReales: 0,
    cumplimientoPresupuesto: 0,
    tiempoRespuesta: '2.0 hrs',
    satisfaccionCliente: 4.7,
    activitiesSemanal: 15,
    eficienciaGlobal: 70,
    avatar: '👩‍💼',
    ultimaActividad: 'Seguimiento Farmacias Guadalajara / Amazon',
    notas: 'Nueva pero trajo cuenta grande por contactos personales. Zona Occidente con biodigestores.',
    kpisSemanales: []
  },
  {
    id: 7,
    codigo: 'MO',
    name: 'Mariana Olmos',
    role: 'Ejecutiva',
    ubicacion: 'CDMX',
    zona: 'CDMX / Nacional',
    leads: 19,
    levantamientos: 6,
    propuestasEnviadas: 4,
    reuniones: 3,
    cierres: 0,
    tasaConversion: 0,
    presupuestoAnual2026: 0,
    presupuestoMensual: 0,
    ventasReales: 0,
    cumplimientoPresupuesto: 0,
    tiempoRespuesta: '3.0 hrs',
    satisfaccionCliente: 4.5,
    activitiesSemanal: 20,
    eficienciaGlobal: 60,
    avatar: '👩‍💼',
    ultimaActividad: 'Licitación Stellantis y FEMSA/Coca-Cola',
    notas: 'Cuentas grandes: Stellantis (6 plantas), FEMSA (5 plantas), PPG. Licitaciones activas feb-2026.',
    kpisSemanales: []
  }
];

// DATOS DETALLADOS DE LEVANTAMIENTOS
const levantamientosDetallados = [
  {
    id: 1,
    cliente: 'Walmart Satélite',
    fecha: '2025-11-08',
    fechaCompletado: '2025-11-08',
    ejecutivo: 'Ana Ruiz',
    tipo: 'Levantamiento',
    status: 'Completado',
    tieneReporte: false,
    siguientePaso: 'Generar propuesta',
    volumenEstimado: '35 ton/mes',
    valorEstimado: 1050000,
    // Información detallada del levantamiento
    informacionGeneral: {
      razonSocial: 'Walmart de México y Centroamérica S.A. de C.V.',
      rfc: 'WME850101ABC',
      direccion: 'Av. Gustavo Baz Prada 95, Satélite, Naucalpan, Estado de México',
      contacto: 'María González - Gerente de Operaciones',
      telefono: '55-1234-5678',
      email: 'maria.gonzalez@walmart.com.mx',
      superficie: '8,500 m²',
      numeroEmpleados: 120,
      horarioOperacion: 'Lun-Dom: 7:00 AM - 11:00 PM',
      requisitosReporte: ['GRI', 'SASB', 'ESR', 'ISO 14001']
    },
    tiposResiduos: [
      { tipo: 'Orgánicos', cantidad: '18 ton/mes', porcentaje: 51, destino: 'Relleno sanitario', costo: 45000 },
      { tipo: 'Cartón', cantidad: '8 ton/mes', porcentaje: 23, destino: 'Reciclaje externo', costo: 12000 },
      { tipo: 'Plástico', cantidad: '5 ton/mes', porcentaje: 14, destino: 'Reciclaje externo', costo: 8000 },
      { tipo: 'Vidrio', cantidad: '2 ton/mes', porcentaje: 6, destino: 'Relleno sanitario', costo: 3000 },
      { tipo: 'Otros', cantidad: '2 ton/mes', porcentaje: 6, destino: 'Relleno sanitario', costo: 3000 }
    ],
    generacion: {
      frecuencia: 'Diaria',
      diasSemana: 7,
      horariosRecoleccion: ['6:00 AM', '2:00 PM', '10:00 PM'],
      volumenDiario: '1.2 ton/día',
      volumenSemanal: '8.4 ton/semana',
      volumenMensual: '35 ton/mes',
      variacionesEstacionales: 'Aumento 15% en Diciembre y Enero'
    },
    serviciosActuales: {
      proveedor: 'Servicios Ambientales del Valle S.A.',
      contratoVigente: true,
      fechaInicio: '2023-01-15',
      fechaVencimiento: '2025-12-31',
      costoMensual: 52000,
      frecuenciaRecoleccion: '3 veces por día',
      tipoServicio: 'Recolección y transporte',
      incluyeSeparacion: false,
      incluyeValorizacion: false,
      incluyeReporteo: false,
      nivelSatisfaccion: 6,
      razonCambio: 'Necesidad de trazabilidad y valorización de residuos'
    },
    infraestructura: {
      tieneAreaAlmacenamiento: true,
      areaAlmacenamiento: '120 m²',
      tipoAlmacenamiento: 'Contenedores de 1.1 m³',
      numeroContenedores: 45,
      tieneCompactadora: false,
      tieneBodega: true,
      accesoVehiculos: 'Fácil - Patio trasero',
      restriccionesHorario: 'Recolección solo entre 6:00 AM - 8:00 PM',
      espacioDisponible: 'Suficiente para segregación'
    },
    necesidades: {
      separacionResiduos: true,
      valorizacionResiduos: true,
      trazabilidad: true,
      reporteoMensual: true,
      certificaciones: ['ISO 14001', 'RME'],
      objetivosAmbientales: 'Reducir envío a relleno sanitario en 60%',
      presupuestoDisponible: 65000,
      urgencia: 'Media',
      decisionMaker: 'María González - Gerente de Operaciones'
    },
    observaciones: 'Cliente interesado en programa de economía circular. Tienen programa interno de reciclaje básico pero buscan profesionalización. Área de almacenamiento bien organizada. Buena disposición del personal.'
  },
  {
    id: 2,
    cliente: 'Soriana Naucalpan',
    fecha: '2025-11-10',
    fechaCompletado: null,
    ejecutivo: 'Carlos Mendoza',
    tipo: 'Levantamiento',
    status: 'En proceso',
    siguientePaso: 'Completar análisis de residuos',
    volumenEstimado: '28 ton/mes',
    valorEstimado: 840000,
    informacionGeneral: {
      razonSocial: 'Organización Soriana S.A. de C.V.',
      rfc: 'OSO850101DEF',
      direccion: 'Av. Gustavo Baz Prada 200, Naucalpan, Estado de México',
      contacto: 'Roberto Martínez - Director de Sostenibilidad',
      telefono: '55-2345-6789',
      email: 'roberto.martinez@soriana.com.mx',
      superficie: '7,200 m²',
      numeroEmpleados: 95,
      horarioOperacion: 'Lun-Dom: 8:00 AM - 10:00 PM',
      requisitosReporte: ['NIS', 'GRI', 'ESR']
    },
    tiposResiduos: [
      { tipo: 'Orgánicos', cantidad: '14 ton/mes', porcentaje: 50, destino: 'Relleno sanitario', costo: 35000 },
      { tipo: 'Cartón', cantidad: '7 ton/mes', porcentaje: 25, destino: 'Reciclaje externo', costo: 10500 },
      { tipo: 'Plástico', cantidad: '4 ton/mes', porcentaje: 14, destino: 'Reciclaje externo', costo: 6000 },
      { tipo: 'Vidrio', cantidad: '2 ton/mes', porcentaje: 7, destino: 'Relleno sanitario', costo: 3000 },
      { tipo: 'Otros', cantidad: '1 ton/mes', porcentaje: 4, destino: 'Relleno sanitario', costo: 1500 }
    ],
    generacion: {
      frecuencia: 'Diaria',
      diasSemana: 7,
      horariosRecoleccion: ['7:00 AM', '3:00 PM'],
      volumenDiario: '0.9 ton/día',
      volumenSemanal: '6.3 ton/semana',
      volumenMensual: '28 ton/mes',
      variacionesEstacionales: 'Aumento 10% en temporada navideña'
    },
    serviciosActuales: {
      proveedor: 'EcoServicios México',
      contratoVigente: true,
      fechaInicio: '2024-03-01',
      fechaVencimiento: '2026-02-28',
      costoMensual: 45000,
      frecuenciaRecoleccion: '2 veces por día',
      tipoServicio: 'Solo recolección',
      incluyeSeparacion: false,
      incluyeValorizacion: false,
      incluyeReporteo: false,
      nivelSatisfaccion: 5,
      razonCambio: 'Cumplimiento normativo RME y mejora de imagen corporativa'
    },
    infraestructura: {
      tieneAreaAlmacenamiento: true,
      areaAlmacenamiento: '95 m²',
      tipoAlmacenamiento: 'Contenedores de 1.1 m³',
      numeroContenedores: 35,
      tieneCompactadora: false,
      tieneBodega: true,
      accesoVehiculos: 'Moderado - Calle lateral',
      restriccionesHorario: 'Recolección preferentemente en horario matutino',
      espacioDisponible: 'Limitado, requiere optimización'
    },
    necesidades: {
      separacionResiduos: true,
      valorizacionResiduos: true,
      trazabilidad: true,
      reporteoMensual: true,
      certificaciones: ['RME'],
      objetivosAmbientales: 'Cumplir normativa RME y obtener certificaciones',
      presupuestoDisponible: 55000,
      urgencia: 'Alta',
      decisionMaker: 'Roberto Martínez - Director de Sostenibilidad'
    },
    observaciones: 'Cliente con presión normativa. Necesitan solución rápida. Área de almacenamiento limitada, requiere propuesta de optimización de espacio.'
  }
];

// LEVANTAMIENTOS Y PROPUESTAS ACTIVAS
const levantamientosActivos = [
  { 
    id: 1, 
    cliente: 'Walmart Satélite', 
    fecha: '2025-11-08', 
    fechaCompletado: '2025-11-08',
    ejecutivo: 'Jose Armando Martínez',
    tipo: 'Levantamiento',
    status: 'Completado',
    tieneReporte: false,
    siguientePaso: 'Generar propuesta',
    volumenEstimado: '35 ton/mes',
    valorEstimado: 1050000
  },
  {
    id: 2,
    cliente: 'Soriana Naucalpan',
    fecha: '2025-11-10',
    fechaCompletado: null,
    ejecutivo: 'Carmen Rodríguez',
    tipo: 'Propuesta',
    status: 'Enviada',
    tieneReporte: false,
    siguientePaso: 'Seguimiento telefónico',
    volumenEstimado: '28 ton/mes',
    valorEstimado: 840000
  },
  {
    id: 3,
    cliente: 'Chedraui Lindavista',
    fecha: '2025-11-09',
    fechaCompletado: null,
    ejecutivo: 'Mariana Olmos',
    tipo: 'Levantamiento',
    status: 'Agendado',
    tieneReporte: false,
    siguientePaso: 'Visita programada 14/Nov',
    volumenEstimado: '22 ton/mes',
    valorEstimado: 660000
  },
  {
    id: 4,
    cliente: 'La Comer Mixcoac',
    fecha: '2025-11-07',
    fechaCompletado: null,
    ejecutivo: 'Laura Mesa',
    tipo: 'Propuesta',
    status: 'En revisión',
    tieneReporte: false,
    siguientePaso: 'Respuesta esperada 15/Nov',
    volumenEstimado: '18 ton/mes',
    valorEstimado: 540000
  },
  {
    id: 5,
    cliente: 'Liverpool Insurgentes',
    fecha: '2025-11-11',
    fechaCompletado: null,
    ejecutivo: 'Laura Mesa',
    tipo: 'Levantamiento',
    status: 'En proceso',
    tieneReporte: false,
    siguientePaso: 'Análisis de datos',
    volumenEstimado: '30 ton/mes',
    valorEstimado: 900000
  },
  {
    id: 6,
    cliente: 'Costco Santa Fe',
    fecha: '2025-11-05',
    fechaCompletado: '2025-11-05',
    ejecutivo: 'Cristina Sescosse',
    tipo: 'Levantamiento',
    status: 'Completado',
    tieneReporte: false,
    siguientePaso: 'Generar reporte',
    volumenEstimado: '42 ton/mes',
    valorEstimado: 1260000
  },
  {
    id: 7,
    cliente: 'Sam\'s Club Polanco',
    fecha: '2025-11-04',
    fechaCompletado: '2025-11-04',
    ejecutivo: 'Jose Armando Martínez',
    tipo: 'Levantamiento',
    status: 'Completado',
    tieneReporte: true,
    siguientePaso: 'Enviar propuesta',
    volumenEstimado: '38 ton/mes',
    valorEstimado: 1140000
  },
  {
    id: 8,
    cliente: 'Bodega Aurrerá Insurgentes',
    fecha: '2025-11-12',
    fechaCompletado: null,
    ejecutivo: 'Mariana Olmos',
    tipo: 'Levantamiento',
    status: 'Agendado',
    tieneReporte: false,
    siguientePaso: 'Visita programada 15/Nov',
    volumenEstimado: '25 ton/mes',
    valorEstimado: 750000
  },
  {
    id: 9,
    cliente: 'Superama Lomas',
    fecha: '2025-10-28',
    fechaCompletado: '2025-10-28',
    ejecutivo: 'Laura Mesa',
    tipo: 'Levantamiento',
    status: 'Completado',
    tieneReporte: false,
    siguientePaso: 'Generar reporte',
    volumenEstimado: '20 ton/mes',
    valorEstimado: 600000
  },
  {
    id: 10,
    cliente: 'Chedraui Coyoacán',
    fecha: '2025-10-25',
    fechaCompletado: '2025-10-25',
    ejecutivo: 'Carmen Rodríguez',
    tipo: 'Levantamiento',
    status: 'Completado',
    tieneReporte: true,
    siguientePaso: 'Seguimiento',
    volumenEstimado: '33 ton/mes',
    valorEstimado: 990000
  }
];

// DATOS DE TRAZABILIDAD
const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// Función para generar datos de trazabilidad por cliente
const generarDatosTrazabilidadCliente = (clienteId, variacion = 0) => {
  const factor = 1 + (variacion * 0.1);
  return {
    reciclaje: [
      { material: 'Papel Mixto', Ene: Math.round(100 * factor), Feb: 0, Mar: 0, Abr: 0, May: 0, Jun: 0, Jul: Math.round(41 * factor), Ago: Math.round(112 * factor), Sep: 0, Oct: 0, Nov: 0, Dic: 0 },
      { material: 'Papel de oficina', Ene: 0, Feb: 0, Mar: 0, Abr: Math.round(36.8 * factor), May: Math.round(116 * factor), Jun: 0, Jul: Math.round(5.6 * factor), Ago: Math.round(2.5 * factor), Sep: Math.round(80 * factor), Oct: 0, Nov: 0, Dic: 0 },
      { material: 'Revistas', Ene: 0, Feb: 0, Mar: 0, Abr: 0, May: Math.round(437 * factor), Jun: 0, Jul: 0, Ago: 0, Sep: Math.round(35 * factor), Oct: 0, Nov: 0, Dic: 0 }
    ],
    composta: [
      { material: 'Residuos Orgánicos', Ene: Math.round(250 * factor), Feb: Math.round(180 * factor), Mar: Math.round(200 * factor), Abr: Math.round(260 * factor), May: Math.round(220 * factor), Jun: Math.round(190 * factor), Jul: Math.round(240 * factor), Ago: Math.round(230 * factor), Sep: Math.round(210 * factor), Oct: 0, Nov: 0, Dic: 0 }
    ],
    reuso: [
      { material: 'Material Reutilizable', Ene: Math.round(5 * factor), Feb: Math.round(3 * factor), Mar: Math.round(2 * factor), Abr: Math.round(4 * factor), May: Math.round(6 * factor), Jun: Math.round(3 * factor), Jul: Math.round(4 * factor), Ago: Math.round(5 * factor), Sep: 0, Oct: 0, Nov: 0, Dic: 0 }
    ],
    rellenoSanitario: [
      { material: 'Residuos No Reciclables', Ene: Math.round(15 * factor), Feb: Math.round(20 * factor), Mar: Math.round(18 * factor), Abr: Math.round(12 * factor), May: Math.round(16 * factor), Jun: Math.round(22 * factor), Jul: Math.round(14 * factor), Ago: Math.round(18 * factor), Sep: 0, Oct: 0, Nov: 0, Dic: 0 }
    ]
  };
};

// Datos de trazabilidad por cliente
const trazabilidadPorCliente = {
  1: generarDatosTrazabilidadCliente(1, 0.2), // Walmart - más volumen
  2: generarDatosTrazabilidadCliente(2, -0.1), // Soriana - menos volumen
  3: generarDatosTrazabilidadCliente(3, 0.05) // Chedraui - similar
};

// Datos base para gráficas generales
const datosTrazabilidad = generarDatosTrazabilidadCliente(0, 0);

// Función para calcular distribución por destino desde datos de trazabilidad
const calcularDistribucionPorDestino = (datos) => {
  const mesesGrafica = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago'];
  return mesesGrafica.map(mes => {
    const reciclaje = datos.reciclaje.reduce((sum, item) => sum + (item[mes] || 0), 0);
    const composta = datos.composta.reduce((sum, item) => sum + (item[mes] || 0), 0);
    const reuso = datos.reuso.reduce((sum, item) => sum + (item[mes] || 0), 0);
    const relleno = datos.rellenoSanitario.reduce((sum, item) => sum + (item[mes] || 0), 0);
    return {
      mes,
      Reciclaje: Math.round(reciclaje * 10) / 10,
      Composta: Math.round(composta * 10) / 10,
      Reuso: Math.round(reuso * 10) / 10,
      'Relleno sanitario': Math.round(relleno * 10) / 10
    };
  });
};

// Función para calcular evolución de desviación
const calcularEvolucionDesviacion = (datos) => {
  const mesesGrafica = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago'];
  return mesesGrafica.map(mes => {
    const reciclaje = datos.reciclaje.reduce((sum, item) => sum + (item[mes] || 0), 0);
    const composta = datos.composta.reduce((sum, item) => sum + (item[mes] || 0), 0);
    const reuso = datos.reuso.reduce((sum, item) => sum + (item[mes] || 0), 0);
    const relleno = datos.rellenoSanitario.reduce((sum, item) => sum + (item[mes] || 0), 0);
    const total = reciclaje + composta + reuso + relleno;
    const circulares = reciclaje + composta + reuso;
    const desviacion = total > 0 ? ((circulares / total) * 100) : 0;
    return {
      mes,
      desviacion: Math.round(desviacion * 10) / 10
    };
  });
};

// Datos base
const distribucionPorDestinoBase = calcularDistribucionPorDestino(datosTrazabilidad);
const evolucionDesviacionBase = calcularEvolucionDesviacion(datosTrazabilidad);

// Función para generar datos Sankey por cliente
const generarDatosSankeyCliente = (cliente, datosTrazabilidadCliente) => {
  if (!cliente || !datosTrazabilidadCliente) return null;

  // Calcular totales por categoría
  const totalReciclaje = datosTrazabilidadCliente.reciclaje.reduce((sum, item) => {
    return sum + meses.reduce((s, mes) => s + (item[mes] || 0), 0);
  }, 0);
  
  const totalComposta = datosTrazabilidadCliente.composta.reduce((sum, item) => {
    return sum + meses.reduce((s, mes) => s + (item[mes] || 0), 0);
  }, 0);
  
  const totalReuso = datosTrazabilidadCliente.reuso.reduce((sum, item) => {
    return sum + meses.reduce((s, mes) => s + (item[mes] || 0), 0);
  }, 0);
  
  const totalRelleno = datosTrazabilidadCliente.rellenoSanitario.reduce((sum, item) => {
    return sum + meses.reduce((s, mes) => s + (item[mes] || 0), 0);
  }, 0);

  const totalGenerado = totalReciclaje + totalComposta + totalReuso + totalRelleno;

  // Si no hay datos, retornar null
  if (totalGenerado === 0) {
    return null;
  }

  // Generar puntos de origen basados en sucursales
  const puntosOrigen = [];
  const linksOrigen = [];
  
  // Crear puntos de origen (máximo 5 para mantener el diagrama legible)
  const sucursalesPrincipales = Math.min(cliente.sucursales, 5);
  
  // Si hay más de 5 sucursales, agrupar las restantes
  if (cliente.sucursales > 5) {
    const nombreAdicionales = `${cliente.sucursales - 5} Sucursales Adicionales`;
    puntosOrigen.push({ id: nombreAdicionales, nodeColor: '#6b7280' });
    const volumenAdicional = (totalGenerado / cliente.sucursales) * (cliente.sucursales - 5);
    if (totalComposta > 0) linksOrigen.push({ source: nombreAdicionales, target: 'Orgánicos', value: (totalComposta / totalGenerado) * volumenAdicional });
    if (totalReciclaje > 0) linksOrigen.push({ source: nombreAdicionales, target: 'Reciclables', value: (totalReciclaje / totalGenerado) * volumenAdicional });
    if (totalReuso > 0) linksOrigen.push({ source: nombreAdicionales, target: 'Reuso', value: (totalReuso / totalGenerado) * volumenAdicional });
    if (totalRelleno > 0) linksOrigen.push({ source: nombreAdicionales, target: 'Inorgánicos', value: (totalRelleno / totalGenerado) * volumenAdicional });
  }
  
  for (let i = 1; i <= sucursalesPrincipales; i++) {
    const nombreSucursal = `${cliente.name} - Sucursal ${i}`;
    puntosOrigen.push({ id: nombreSucursal, nodeColor: '#3b82f6' });
    
    // Distribuir proporcionalmente entre categorías
    const volumenSucursal = totalGenerado / sucursalesPrincipales;
    if (totalComposta > 0) linksOrigen.push({ source: nombreSucursal, target: 'Orgánicos', value: (totalComposta / totalGenerado) * volumenSucursal });
    if (totalReciclaje > 0) linksOrigen.push({ source: nombreSucursal, target: 'Reciclables', value: (totalReciclaje / totalGenerado) * volumenSucursal });
    if (totalReuso > 0) linksOrigen.push({ source: nombreSucursal, target: 'Reuso', value: (totalReuso / totalGenerado) * volumenSucursal });
    if (totalRelleno > 0) linksOrigen.push({ source: nombreSucursal, target: 'Inorgánicos', value: (totalRelleno / totalGenerado) * volumenSucursal });
  }

  // Nodos y links finales - incluir número de registro ambiental directamente en el ID
  const destinoCompostaId = `${cliente.destinosFinales.composta} (${cliente.registrosAmbientales?.composta || ''})`;
  const destinoReciclajeId = `${cliente.destinosFinales.reciclaje} (${cliente.registrosAmbientales?.reciclaje || ''})`;
  const destinoReusoId = `${cliente.destinosFinales.reuso} (${cliente.registrosAmbientales?.reuso || ''})`;
  const destinoRellenoId = `${cliente.destinosFinales.rellenoSanitario} (${cliente.registrosAmbientales?.rellenoSanitario || ''})`;

  const nodes = [
    ...puntosOrigen,
    { id: 'Orgánicos', nodeColor: '#22c55e' },
    { id: 'Reciclables', nodeColor: '#3b82f6' },
    { id: 'Reuso', nodeColor: '#008080' },
    { id: 'Inorgánicos', nodeColor: '#6b7280' },
    { 
      id: destinoCompostaId,
      nodeColor: '#16a34a',
      registroAmbiental: cliente.registrosAmbientales?.composta || ''
    },
    { 
      id: destinoReciclajeId,
      nodeColor: '#2563eb',
      registroAmbiental: cliente.registrosAmbientales?.reciclaje || ''
    },
    { 
      id: destinoReusoId,
      nodeColor: '#0ea5e9',
      registroAmbiental: cliente.registrosAmbientales?.reuso || ''
    },
    { 
      id: destinoRellenoId,
      nodeColor: '#64748b',
      registroAmbiental: cliente.registrosAmbientales?.rellenoSanitario || ''
    }
  ];

  const links = [
    ...linksOrigen,
    ...(totalComposta > 0 ? [{ source: 'Orgánicos', target: destinoCompostaId, value: totalComposta }] : []),
    ...(totalReciclaje > 0 ? [{ source: 'Reciclables', target: destinoReciclajeId, value: totalReciclaje }] : []),
    ...(totalReuso > 0 ? [{ source: 'Reuso', target: destinoReusoId, value: totalReuso }] : []),
    ...(totalRelleno > 0 ? [{ source: 'Inorgánicos', target: destinoRellenoId, value: totalRelleno }] : [])
  ];
  
  // Filtrar nodos que no tienen links
  const nodeIdsWithLinks = new Set();
  links.forEach(link => {
    nodeIdsWithLinks.add(link.source);
    nodeIdsWithLinks.add(link.target);
  });
  
  const nodesFiltered = nodes.filter(node => nodeIdsWithLinks.has(node.id));

  return { nodes: nodesFiltered, links, totalGenerado, totalComposta, totalReciclaje, totalReuso, totalRelleno };
};

// CLIENTES CON REPORTES DE TRAZABILIDAD ENTREGADOS
const clientesConReportes = [
  { 
    id: 1, 
    name: 'Walmart México', 
    logo: '🛒',
    sucursales: 12,
    ultimoReporte: '2025-11-01',
    proximoReporte: '2025-12-01',
    statusReporte: 'Enviado',
    // Datos para conciliación
    serviciosContratados: ['Recolección', 'Transporte', 'Valorización', 'Reporteo'],
    rmeGestionado: 45.8,
    valoracionLograda: 96,
    ingresosMes: 1374000,
    // Impacto
    impactoMensual: {
      arboles: 892,
      co2: 23.4,
      agua: 125000
    },
    contacto: 'Laura Sánchez',
    email: 'laura.sanchez@walmart.com.mx',
    // Información operativa
    fechaInicioOperacion: '2023-03-15',
    promedioMensual: 42.5,
    tiposResiduos: ['Papel y Cartón', 'Plástico', 'Orgánicos', 'Vidrio', 'Metal'],
    destinosFinales: {
      reciclaje: 'Planta de Reciclaje CDMX',
      composta: 'Centro de Compostaje Estado de México',
      reuso: 'Centros de Reutilización',
      rellenoSanitario: 'Relleno Sanitario Bordo Poniente'
    },
    registrosAmbientales: {
      reciclaje: 'RA-REC-2023-0456',
      composta: 'RA-COM-2023-0234',
      reuso: 'RA-REU-2023-0123',
      rellenoSanitario: 'RA-RS-2023-0789'
    },
    frecuenciaRecoleccion: 'Diaria',
    volumenPromedioMensual: 42.5,
    tasaValorizacion: 96,
    requisitosReporte: ['GRI', 'SASB', 'ESR', 'ISO 14001']
  },
  { 
    id: 2, 
    name: 'Soriana', 
    logo: '🏬',
    sucursales: 9,
    ultimoReporte: '2025-11-01',
    proximoReporte: '2025-12-01',
    statusReporte: 'Enviado',
    serviciosContratados: ['Recolección', 'Transporte', 'Valorización'],
    rmeGestionado: 38.2,
    valoracionLograda: 94,
    ingresosMes: 1146000,
    impactoMensual: {
      arboles: 743,
      co2: 19.5,
      agua: 104000
    },
    contacto: 'Jorge Ramírez',
    email: 'jorge.ramirez@soriana.com',
    // Información operativa
    fechaInicioOperacion: '2023-06-20',
    promedioMensual: 35.8,
    tiposResiduos: ['Papel y Cartón', 'Plástico', 'Orgánicos', 'Vidrio'],
    destinosFinales: {
      reciclaje: 'Planta de Reciclaje Guadalajara',
      composta: 'Centro de Compostaje Jalisco',
      reuso: 'Centros de Reutilización',
      rellenoSanitario: 'Relleno Sanitario Los Laureles'
    },
    registrosAmbientales: {
      reciclaje: 'RA-REC-2023-0521',
      composta: 'RA-COM-2023-0312',
      reuso: 'RA-REU-2023-0189',
      rellenoSanitario: 'RA-RS-2023-0845'
    },
    frecuenciaRecoleccion: '3 veces por semana',
    volumenPromedioMensual: 35.8,
    tasaValorizacion: 94,
    requisitosReporte: ['NIS', 'GRI', 'ESR']
  },
  { 
    id: 3, 
    name: 'Chedraui', 
    logo: '🏪',
    sucursales: 8,
    ultimoReporte: '2025-11-01',
    proximoReporte: '2025-12-01',
    statusReporte: 'Pendiente',
    serviciosContratados: ['Recolección', 'Valorización', 'Reporteo'],
    rmeGestionado: 32.6,
    valoracionLograda: 91,
    ingresosMes: 978000,
    impactoMensual: {
      arboles: 634,
      co2: 16.6,
      agua: 88700
    },
    contacto: 'María López',
    email: 'maria.lopez@chedraui.com.mx',
    // Información operativa
    fechaInicioOperacion: '2023-09-10',
    promedioMensual: 30.2,
    tiposResiduos: ['Papel y Cartón', 'Plástico', 'Orgánicos'],
    destinosFinales: {
      reciclaje: 'Planta de Reciclaje Puebla',
      composta: 'Centro de Compostaje Puebla',
      reuso: 'Centros de Reutilización',
      rellenoSanitario: 'Relleno Sanitario Chiltepeque'
    },
    registrosAmbientales: {
      reciclaje: 'RA-REC-2023-0612',
      composta: 'RA-COM-2023-0398',
      reuso: 'RA-REU-2023-0256',
      rellenoSanitario: 'RA-RS-2023-0912'
    },
    frecuenciaRecoleccion: '2 veces por semana',
    volumenPromedioMensual: 30.2,
    tasaValorizacion: 91
  }
];

// EVOLUCIÓN PRESUPUESTO VS REAL — DATOS REALES 2026
const presupuestoEvolution = [
  { mes: 'Ene', presupuesto: 2774200, real: 0 },
  { mes: 'Feb', presupuesto: 2769810, real: 0 },
  { mes: 'Mar', presupuesto: 4009709, real: 0 },
  { mes: 'Abr', presupuesto: 11011618, real: 0 },
  { mes: 'May', presupuesto: 12452161, real: 0 },
  { mes: 'Jun', presupuesto: 14121018, real: 0 },
  { mes: 'Jul', presupuesto: 14216418, real: 0 },
  { mes: 'Ago', presupuesto: 15603961, real: 0 },
  { mes: 'Sep', presupuesto: 14951318, real: 0 },
  { mes: 'Oct', presupuesto: 14352318, real: 0 },
  { mes: 'Nov', presupuesto: 13006777, real: 0 },
  { mes: 'Dic', presupuesto: 10861507, real: 0 }
];

// HISTORIAL ANUAL DE VENTAS
const historicoVentas = [
  { año: '2024', valor: 44711877, tipo: 'Real' },
  { año: '2025', valor: 17602066, tipo: 'Real' },
  { año: '2026', valor: 130130812, tipo: 'Presupuesto' }
];

const COLORS_INNOVATIVE = {
  primary: '#00a8a8',      // Verde vibrante principal
  secondary: '#008080',    // Verde vibrante secundario
  accent: '#00b3b3',      // Verde claro para acentos
  blue: '#008080',         // Azul corporativo
  lightBlue: '#5FA8D3',
  gray: '#f3f4f6',         // Gris muy claro para fondos
  darkGray: '#1c2c4a',      // Gris oscuro para texto
  borderGray: '#e5e7eb',    // Gris para bordes sutiles
  textGray: '#6b7280'       // Gris para texto secundario
};

const COLORS_CHART = ['#00a8a8', '#0D47A1', '#008080', '#F57C00', '#2E7D32'];

// TIPOS Y CATEGORÍAS DE DOCUMENTOS
const TIPOS_DOCUMENTO = [
  'Permiso Ambiental',
  'Licencia de Funcionamiento',
  'Autorización de Transporte',
  'Certificado ISO',
  'Póliza de Seguro',
  'Registro Ambiental',
  'Manifiesto de Residuos',
  'Otro'
];

const CATEGORIAS_DOCUMENTO = [
  'Licencias',
  'Permisos',
  'Certificaciones',
  'Seguros',
  'Contratos',
  'Otros'
];

// DATOS DE DOCUMENTOS
const documentosIniciales = [
  {
    id: 1,
    nombre: 'Licencia Ambiental CDMX',
    tipo: 'Permiso Ambiental',
    categoria: 'Licencias',
    fechaEmision: '2024-01-15',
    fechaVencimiento: '2025-01-15',
    archivo: 'licencia_cdmx.pdf',
    status: 'Por Vencer',
    notas: 'Aplica para operaciones en CDMX - Renovar antes del 15/Ene'
  },
  {
    id: 2,
    nombre: 'Autorización Transporte Residuos Peligrosos',
    tipo: 'Autorización de Transporte',
    categoria: 'Permisos',
    fechaEmision: '2023-06-20',
    fechaVencimiento: '2026-06-20',
    archivo: 'autorizacion_transporte.pdf',
    status: 'Vigente',
    notas: 'Válido para toda la República Mexicana'
  },
  {
    id: 3,
    nombre: 'Certificado ISO 14001:2015',
    tipo: 'Certificado ISO',
    categoria: 'Certificaciones',
    fechaEmision: '2023-09-10',
    fechaVencimiento: '2026-09-10',
    archivo: 'iso_14001.pdf',
    status: 'Vigente',
    notas: 'Gestión Ambiental - Auditoría anual requerida'
  },
  {
    id: 4,
    nombre: 'Registro Ambiental Estatal EdoMex',
    tipo: 'Registro Ambiental',
    categoria: 'Permisos',
    fechaEmision: '2024-03-01',
    fechaVencimiento: '2025-03-01',
    archivo: 'registro_edomex.pdf',
    status: 'Vigente',
    notas: 'Aplica para operaciones en Estado de México'
  },
  {
    id: 5,
    nombre: 'Póliza Responsabilidad Civil',
    tipo: 'Póliza de Seguro',
    categoria: 'Seguros',
    fechaEmision: '2024-07-01',
    fechaVencimiento: '2025-07-01',
    archivo: 'poliza_rc.pdf',
    status: 'Vigente',
    notas: 'Cobertura: $10M MXN - Renovación automática'
  },
  {
    id: 6,
    nombre: 'Licencia Funcionamiento Planta Guadalajara',
    tipo: 'Licencia de Funcionamiento',
    categoria: 'Licencias',
    fechaEmision: '2023-11-15',
    fechaVencimiento: '2025-11-15',
    archivo: 'licencia_gdl.pdf',
    status: 'Vigente',
    notas: 'Planta de reciclaje Guadalajara'
  },
  {
    id: 7,
    nombre: 'Permiso Ambiental Monterrey',
    tipo: 'Permiso Ambiental',
    categoria: 'Permisos',
    fechaEmision: '2024-02-20',
    fechaVencimiento: '2024-12-20',
    archivo: 'permiso_mty.pdf',
    status: 'Vencido',
    notas: '¡URGENTE! Vencido - Iniciar renovación inmediatamente'
  },
  {
    id: 8,
    nombre: 'Certificado ISO 9001:2015',
    tipo: 'Certificado ISO',
    categoria: 'Certificaciones',
    fechaEmision: '2023-08-05',
    fechaVencimiento: '2026-08-05',
    archivo: 'iso_9001.pdf',
    status: 'Vigente',
    notas: 'Gestión de Calidad - Próxima auditoría: Ago 2025'
  },
  {
    id: 9,
    nombre: 'Manifiesto Generación Residuos 2024',
    tipo: 'Manifiesto de Residuos',
    categoria: 'Permisos',
    fechaEmision: '2024-01-01',
    fechaVencimiento: '2024-12-31',
    archivo: 'manifiesto_2024.pdf',
    status: 'Por Vencer',
    notas: 'Generar manifiesto 2025 en Diciembre'
  },
  {
    id: 10,
    nombre: 'Registro SEMARNAT Nacional',
    tipo: 'Registro Ambiental',
    categoria: 'Permisos',
    fechaEmision: '2022-05-10',
    fechaVencimiento: '2027-05-10',
    archivo: 'registro_semarnat.pdf',
    status: 'Vigente',
    notas: 'Registro federal - Renovación cada 5 años'
  }
];

// Función para calcular el status de un documento
const calcularStatusDocumento = (fechaVencimiento) => {
  if (!fechaVencimiento) return 'Sin Fecha';
  const hoy = new Date();
  const vencimiento = new Date(fechaVencimiento);
  const diasRestantes = Math.floor((vencimiento - hoy) / (1000 * 60 * 60 * 24));

  if (diasRestantes < 0) return 'Vencido';
  if (diasRestantes <= 30) return 'Por Vencer';
  if (diasRestantes <= 60) return 'Por Vencer';
  return 'Vigente';
};

// CATÁLOGO DE MOTIVOS DE RECHAZO
const MOTIVOS_RECHAZO = [
  { id: 1, motivo: 'Precios no competitivos', categoria: 'Comercial' },
  { id: 2, motivo: 'Tardanza en entregar propuesta', categoria: 'Proceso' },
  { id: 3, motivo: 'No tienen destinos finales suficientes', categoria: 'Operativo' },
  { id: 4, motivo: 'No pueden hacer recolecciones diarias', categoria: 'Operativo' },
  { id: 5, motivo: 'Cliente se queda con proveedor actual', categoria: 'Competencia' },
  { id: 6, motivo: 'Falta de permisos/documentos', categoria: 'Legal' },
  { id: 7, motivo: 'Muy poco material (< 10 ton)', categoria: 'Viabilidad' },
  { id: 8, motivo: 'Otro (especificar)', categoria: 'Otro' }
];

// CLASIFICACIÓN DE RECHAZOS — categorías con acciones sugeridas
const RECHAZO_CATEGORIES = {
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

// Recovery states for rejected opportunities
const RECOVERY_STATES = {
  sin_seguimiento: { id: 'sin_seguimiento', label: 'Sin seguimiento', color: '#EF4444', bg: '#FEF2F2', icon: 'AlertCircle', order: 0 },
  en_seguimiento: { id: 'en_seguimiento', label: 'En seguimiento', color: '#F59E0B', bg: '#FFFBEB', icon: 'Clock', order: 1 },
  re_contactada: { id: 're_contactada', label: 'Re-contactada', color: '#3B82F6', bg: '#EFF6FF', icon: 'PhoneCall', order: 2 },
  recuperada: { id: 'recuperada', label: 'Recuperada', color: '#22C55E', bg: '#F0FDF4', icon: 'CheckCircle', order: 3 },
};

const getRecoveryState = (seg) => {
  if (!seg) return RECOVERY_STATES.sin_seguimiento;
  if (seg.recoveryStatus === 're_contactada') return RECOVERY_STATES.re_contactada;
  if (seg.fechaSeguimiento) return RECOVERY_STATES.en_seguimiento;
  return RECOVERY_STATES.sin_seguimiento;
};

const classifyRechazo = (motivoRechazo) => {
  if (!motivoRechazo) return RECHAZO_CATEGORIES.operational;
  const lower = motivoRechazo.toLowerCase();
  if (lower.includes('precio') || lower.includes('competitivo') || lower.includes('costo') || lower.includes('elevado')) return RECHAZO_CATEGORIES.pricing;
  if (lower.includes('propuesta') || lower.includes('expectativa') || lower.includes('demora') || lower.includes('eligieron') || lower.includes('suficientemente')) return RECHAZO_CATEGORIES.proposal;
  if (lower.includes('proveedur') || lower.includes('zona') || lower.includes('viable') || lower.includes('declinamos')) return RECHAZO_CATEGORIES.operational;
  return RECHAZO_CATEGORIES.operational;
};

const getSeguimientoUrgency = (seg) => {
  if (!seg?.fechaSeguimiento) return null;
  const today = new Date();
  const target = new Date(seg.fechaSeguimiento);
  const diffDays = Math.floor((target - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: `Vencido ${Math.abs(diffDays)}d`, color: '#EF4444', bg: '#FEF2F2', overdue: true, days: Math.abs(diffDays) };
  if (diffDays === 0) return { label: 'Hoy', color: '#EF4444', bg: '#FEF2F2', overdue: false, days: 0 };
  if (diffDays <= 7) return { label: `${diffDays}d`, color: '#F59E0B', bg: '#FFFBEB', overdue: false, days: diffDays };
  if (diffDays <= 30) return { label: `${Math.floor(diffDays / 7)}sem`, color: '#22C55E', bg: '#F0FDF4', overdue: false, days: diffDays };
  return { label: `${Math.floor(diffDays / 30)}m`, color: '#6b7280', bg: '#f3f4f6', overdue: false, days: diffDays };
};

// FUNCIONES DE CÁLCULO DE DÍAS
const calcularDiasSinRespuesta = (fechaEnvio) => {
  if (!fechaEnvio) return 0;
  const hoy = new Date();
  const envio = new Date(fechaEnvio);
  const diferencia = Math.floor((hoy - envio) / (1000 * 60 * 60 * 24));
  return diferencia;
};

const calcularDiasHabiles = (fechaInicio) => {
  if (!fechaInicio) return 0;
  let dias = 0;
  let fecha = new Date(fechaInicio);
  const hoy = new Date();
  while (fecha < hoy) {
    const diaSemana = fecha.getDay();
    if (diaSemana !== 0 && diaSemana !== 6) dias++;
    fecha.setDate(fecha.getDate() + 1);
  }
  return dias;
};

const InnovativeDemo = () => {
  // Fetch prospects from DB for CRM tabs ID mapping
  const { data: dbProspectsForCRM = [] } = useQuery({
    queryKey: ['/api/comercial/prospects'],
    staleTime: 5 * 60 * 1000,
  });

  // Helper to find real prospect ID by name
  const findRealProspectId = (mockProspect) => {
    if (!mockProspect) return null;
    const match = dbProspectsForCRM.find(dp =>
      dp.name?.toLowerCase().includes(mockProspect.empresa?.toLowerCase()?.substring(0, 10)) ||
      mockProspect.empresa?.toLowerCase().includes(dp.name?.toLowerCase()?.substring(0, 10))
    );
    return match?.id || mockProspect.id;
  };

  const [currentView, setCurrentView] = useState('dashboard');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [selectedTeamMember, setSelectedTeamMember] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedLevantamiento, setSelectedLevantamiento] = useState(null);
  const [selectedProspecto, setSelectedProspecto] = useState(null);
  const [mostrarLevantamiento, setMostrarLevantamiento] = useState(false);
  const [mostrarPropuesta, setMostrarPropuesta] = useState(false);
  const [mostrarDetallesProspecto, setMostrarDetallesProspecto] = useState(false);
  const [detallesProspectoTab, setDetallesProspectoTab] = useState('info');
  const [mostrarLeads, setMostrarLeads] = useState(false);
  const [showNuevoLead, setShowNuevoLead] = useState(false);
  const [nuevoLeadForm, setNuevoLeadForm] = useState({
    empresa: '', planta: '', ciudad: '', industria: '',
    contactoNombre: '', contactoPuesto: '', contactoCorreo: '', contactoTelefono: '',
    servicios: [], comentarios: '',
    tiposResiduos: '', volumenEstimado: '', facturacionEstimada: ''
  });
  const [mostrarLevantamientos, setMostrarLevantamientos] = useState(false);
  const [selectedLevantamientoDetalle, setSelectedLevantamientoDetalle] = useState(null);
  const [mostrarNuevoLevantamiento, setMostrarNuevoLevantamiento] = useState(false);
  const [vistaCliente, setVistaCliente] = useState(false);
  const [clienteSeleccionadoVista, setClienteSeleccionadoVista] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedSections, setExpandedSections] = useState({
    comercial: false, operacion: false, trazabilidad: false, subproductos: false
  });
  const [showKpiPanel, setShowKpiPanel] = useState(false);
  const [kpiPanelArea, setKpiPanelArea] = useState(null); // 'comercial' | 'operacion' | 'subproductos'
  const [kpiSelectedEjecutivo, setKpiSelectedEjecutivo] = useState(null); // member object when row clicked
  const [ejecutivoComentarios, setEjecutivoComentarios] = useState({}); // { 'prospectoId': [{text, date}] }
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [notifications] = useState(7);
  const [leadsConAsignacion, setLeadsConAsignacion] = useState(leadsData.map(lead => ({ ...lead, asignadoA: lead.asignadoA || null })));
  const [mostrarTodosLeads, setMostrarTodosLeads] = useState(false);
  const [alertas, setAlertas] = useState([]);
  const [mostrarNotificaciones, setMostrarNotificaciones] = useState(false);
  const [mostrarModalRechazo, setMostrarModalRechazo] = useState(false);
  const [prospectoParaRechazar, setProspectoParaRechazar] = useState(null);
  const [motivoRechazoSeleccionado, setMotivoRechazoSeleccionado] = useState('');
  const [detalleRechazo, setDetalleRechazo] = useState('');
  const [documentos, setDocumentos] = useState(documentosIniciales);
  const [mostrarNuevoDocumento, setMostrarNuevoDocumento] = useState(false);
  const [filtroDocumentos, setFiltroDocumentos] = useState({ tipo: '', categoria: '', status: '' });

  // Ejecutivo Hub states
  const [hubEjecutivo, setHubEjecutivo] = useState(null); // salesTeamData member
  const [prospectoNotas, setProspectoNotas] = useState({}); // { prospectoId: [{text, date, id}] }
  const [prospectoNuevaNota, setProspectoNuevaNota] = useState('');
  const [prospectoArchivos, setProspectoArchivos] = useState({}); // { prospectoId: [{name, type, size, date, id}] }
  const [prospectoSeguimiento, setProspectoSeguimiento] = useState({}); // { prospectoId: { fechaSeguimiento, accion, notas, fechaCreacion } }

  // Pipeline view states
  const [pipelineViewMode, setPipelineViewMode] = useState('kanban'); // 'kanban' | 'funnel' | 'tabla'
  const [comercialTab, setComercialTab] = useState('pipeline'); // 'pipeline' | 'presupuesto' | 'rechazadas'
  const [kanbanProspectos, setKanbanProspectos] = useState(topProspectos);
  const [activeKanbanId, setActiveKanbanId] = useState(null);
  const [showStageGateModal, setShowStageGateModal] = useState(false);
  const [pendingMove, setPendingMove] = useState(null); // {prospecto, fromStage, toStage}
  const [filterServicio, setFilterServicio] = useState('todos');
  const [filterEjecutivo, setFilterEjecutivo] = useState('todos');
  const [filterEtapa, setFilterEtapa] = useState('todos');

  // Kanban stages definition
  const KANBAN_STAGES = [
    { id: 'Lead nuevo', label: 'Lead Nuevo', color: '#6b7280', prob: '5%' },
    { id: 'Reunión agendada', label: 'Reunión', color: '#0D47A1', prob: '20%' },
    { id: 'Levantamiento', label: 'Levantamiento', color: '#F57C00', prob: '35%' },
    { id: 'Propuesta enviada', label: 'Propuesta', color: '#00a8a8', prob: '50%' },
    { id: 'Negociación', label: 'Negociación', color: '#7C3AED', prob: '70%' },
    { id: 'Inicio de operación', label: 'Ganada', color: '#2E7D32', prob: '100%' },
  ];

  // Etapas del Kanban personal en Hub Ejecutivo (labels personalizados)
  const HUB_KANBAN_STAGES = [
    { id: 'Lead nuevo', label: 'Lead', color: '#6b7280' },
    { id: 'Reunión agendada', label: 'Prospecto', color: '#0D47A1' },
    { id: 'Levantamiento', label: 'Reunión', color: '#F57C00' },
    { id: 'Propuesta enviada', label: 'Levantamiento', color: '#00a8a8' },
    { id: 'Negociación', label: 'Propuesta', color: '#7C3AED' },
    { id: 'Inicio de operación', label: 'Cliente Nuevo', color: '#2E7D32' },
  ];

  // Stage gate validation rules
  const STAGE_GATES = {
    'Reunión agendada': {
      label: 'Prospecto Calificado',
      validate: (p) => esProspectoCalificado(p),
      message: (p) => `Faltan campos: ${camposFaltantes(p).join(', ')}`,
      requirement: 'Requiere: Empresa + Industria + Contacto + Puesto + Correo'
    },
    'Levantamiento': {
      label: 'Volumen Verificado',
      validate: (p) => !!(p.volumenEstimado || p.facturacionEstimada),
      message: () => 'Falta volumen estimado o facturación estimada',
      requirement: 'Requiere: Volumen estimado o Facturación estimada'
    },
    'Propuesta enviada': {
      label: 'Levantamiento Completado',
      validate: (p) => !!(p.volumenEstimado && (p.servicios?.length > 0)),
      message: (p) => `Falta: ${!p.volumenEstimado ? 'volumen estimado' : ''}${!p.servicios?.length ? ' servicios seleccionados' : ''}`,
      requirement: 'Requiere: Volumen + Servicios seleccionados'
    },
    'Negociación': {
      label: 'Propuesta Acusada',
      validate: (p) => !!(p.propuesta?.ventaTotal || p.facturacionEstimada),
      message: () => 'Falta monto de propuesta o facturación estimada',
      requirement: 'Requiere: Monto de propuesta definido'
    },
  };

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  // Handle Kanban drag end
  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    setActiveKanbanId(null);

    if (!over) return;

    const prospecto = kanbanProspectos.find(p => p.id === active.id);
    if (!prospecto) return;

    // The over.id could be a stage column or another card
    let targetStage = over.id;
    // If over is a card, get its stage
    const overProspecto = kanbanProspectos.find(p => p.id === over.id);
    if (overProspecto) {
      targetStage = overProspecto.status;
    }

    // Check if it's a valid stage
    const validStages = KANBAN_STAGES.map(s => s.id);
    if (!validStages.includes(targetStage)) return;

    if (prospecto.status === targetStage) return;

    // Check stage gate
    const gate = STAGE_GATES[targetStage];
    if (gate && !gate.validate(prospecto)) {
      setPendingMove({ prospecto, fromStage: prospecto.status, toStage: targetStage });
      setShowStageGateModal(true);
      return;
    }

    // Move the prospecto
    setKanbanProspectos(prev =>
      prev.map(p => p.id === prospecto.id ? { ...p, status: targetStage } : p)
    );
  }, [kanbanProspectos]);

  const handleDragStart = useCallback((event) => {
    setActiveKanbanId(event.active.id);
  }, []);

  // Calcular alertas automáticamente
  useEffect(() => {
    const nuevasAlertas = [];

    // Propuestas sin seguimiento (> 5 días hábiles)
    topProspectos.filter(p =>
      p.status === 'Propuesta enviada' &&
      p.fecha &&
      calcularDiasHabiles(p.fecha) >= 5
    ).forEach(p => {
      nuevasAlertas.push({
        tipo: 'seguimiento_propuesta',
        mensaje: `Propuesta a ${p.empresa} sin respuesta hace ${calcularDiasHabiles(p.fecha)} días hábiles`,
        prioridad: 'alta',
        prospecto: p,
        accion: 'Dar seguimiento'
      });
    });

    // Levantamientos completados sin reporte
    levantamientosActivos.filter(l =>
      l.status === 'Completado' && !l.tieneReporte
    ).forEach(l => {
      nuevasAlertas.push({
        tipo: 'levantamiento_sin_reporte',
        mensaje: `Levantamiento de ${l.cliente} completado sin reporte`,
        prioridad: 'media',
        levantamiento: l,
        accion: 'Generar reporte'
      });
    });

    // Leads inactivos (> 14 días sin actividad)
    leadsConAsignacion.filter(lead => {
      const diasSinActividad = calcularDiasSinRespuesta(lead.fecha);
      return diasSinActividad > 14;
    }).forEach(lead => {
      nuevasAlertas.push({
        tipo: 'lead_inactivo',
        mensaje: `Lead "${lead.empresa}" sin actividad hace ${calcularDiasSinRespuesta(lead.fecha)} días`,
        prioridad: 'media',
        lead: lead,
        accion: 'Reactivar contacto'
      });
    });

    // Documentos vencidos o por vencer (< 30 días)
    documentos.filter(doc => {
      const hoy = new Date();
      const vencimiento = new Date(doc.fechaVencimiento);
      const diasRestantes = Math.floor((vencimiento - hoy) / (1000 * 60 * 60 * 24));
      return diasRestantes <= 30;
    }).forEach(doc => {
      const hoy = new Date();
      const vencimiento = new Date(doc.fechaVencimiento);
      const diasRestantes = Math.floor((vencimiento - hoy) / (1000 * 60 * 60 * 24));
      const prioridad = diasRestantes < 0 ? 'alta' : 'media';
      const estado = diasRestantes < 0 ? 'vencido' : `vence en ${diasRestantes} días`;

      nuevasAlertas.push({
        tipo: 'documento_vencimiento',
        mensaje: `Documento "${doc.nombre}" ${estado}`,
        prioridad: prioridad,
        documento: doc,
        accion: diasRestantes < 0 ? 'Renovar urgente' : 'Programar renovación'
      });
    });

    // Seguimiento de rechazadas con fecha próxima o vencida
    topProspectos.filter(p => p.status === 'Propuesta Rechazada').forEach(p => {
      const seg = prospectoSeguimiento[p.id];
      if (!seg?.fechaSeguimiento) return;
      const urgency = getSeguimientoUrgency(seg);
      if (!urgency) return;
      if (urgency.overdue || urgency.days <= 7) {
        nuevasAlertas.push({
          tipo: 'seguimiento_rechazada',
          mensaje: urgency.overdue
            ? `Seguimiento vencido: ${p.empresa} — ${seg.accion || 'Dar seguimiento'} (hace ${urgency.days}d)`
            : `Seguimiento proximo: ${p.empresa} — ${seg.accion || 'Dar seguimiento'} (en ${urgency.days}d)`,
          prioridad: urgency.overdue ? 'alta' : 'media',
          prospecto: p,
          accion: seg.accion || 'Dar seguimiento',
        });
      }
    });

    setAlertas(nuevasAlertas);
  }, [leadsConAsignacion, documentos, prospectoSeguimiento]);

  // Componente Panel de Notificaciones
  const NotificationsPanel = ({ alertas, onClose, onAction }) => (
    <div className="absolute right-0 top-12 w-96 bg-white rounded-lg shadow-lg border border-[#e5e7eb] z-50">
      <div className="p-4 border-b border-[#e5e7eb] flex justify-between items-center">
        <h3 className="font-semibold text-[#1c2c4a]">Alertas ({alertas.length})</h3>
        <button onClick={onClose}><X size={18} /></button>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {alertas.length === 0 ? (
          <div className="p-8 text-center text-[#6b7280]">
            <CheckSquare size={48} className="mx-auto mb-3 opacity-50" />
            <p className="text-sm">No hay alertas pendientes</p>
          </div>
        ) : (
          alertas.map((alerta, idx) => (
            <div key={idx} className={`p-4 border-b border-[#e5e7eb] ${
              alerta.prioridad === 'alta' ? 'bg-red-50' : 'bg-yellow-50'
            }`}>
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className={`mt-0.5 flex-shrink-0 ${
                  alerta.prioridad === 'alta' ? 'text-red-600' : 'text-yellow-600'
                }`} />
                <div className="flex-1">
                  <div className="text-sm font-medium text-[#1c2c4a]">{alerta.mensaje}</div>
                  <button
                    onClick={() => onAction(alerta)}
                    className="mt-2 text-xs text-[#00a8a8] font-medium hover:text-[#008080]"
                  >
                    {alerta.accion} →
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  // Modal de Motivo de Rechazo
  const ModalMotivoRechazo = ({ prospecto, onClose, onSave }) => {
    const [motivoSeleccionado, setMotivoSeleccionado] = useState('');
    const [detalle, setDetalle] = useState('');

    const handleSubmit = (e) => {
      e.preventDefault();
      if (!motivoSeleccionado) {
        alert('Debe seleccionar un motivo de rechazo');
        return;
      }
      onSave({
        motivoRechazo: parseInt(motivoSeleccionado),
        motivoRechazoDetalle: detalle,
        fechaRechazo: new Date().toISOString().split('T')[0]
      });
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
          <div className="p-6 border-b border-[#e5e7eb]">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-[#1c2c4a]">Motivo de Rechazo</h3>
                <p className="text-sm text-[#6b7280] mt-1">
                  {prospecto?.empresa}
                </p>
              </div>
              <button onClick={onClose} className="text-[#6b7280] hover:text-[#1c2c4a]">
                <X size={24} />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-[#1c2c4a] mb-2">
                Motivo de Rechazo *
              </label>
              <select
                value={motivoSeleccionado}
                onChange={(e) => setMotivoSeleccionado(e.target.value)}
                className="w-full px-4 py-3 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00a8a8]"
                required
              >
                <option value="">Seleccione un motivo...</option>
                {MOTIVOS_RECHAZO.map(motivo => (
                  <option key={motivo.id} value={motivo.id}>
                    {motivo.motivo} ({motivo.categoria})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#1c2c4a] mb-2">
                Detalles adicionales
              </label>
              <textarea
                value={detalle}
                onChange={(e) => setDetalle(e.target.value)}
                className="w-full px-4 py-3 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00a8a8]"
                rows={4}
                placeholder="Proporcione información adicional sobre el rechazo..."
              />
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-orange-600 flex-shrink-0 mt-0.5" size={20} />
                <div className="text-sm text-orange-800">
                  <p className="font-semibold mb-1">Información importante</p>
                  <p>
                    El registro del motivo de rechazo es obligatorio y ayudará a mejorar nuestros procesos comerciales.
                    Valor estimado de esta propuesta: ${(prospecto?.valorEstimado || 0).toLocaleString('es-MX')}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[#e5e7eb]">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 border border-[#e5e7eb] text-[#6b7280] rounded-lg hover:bg-[#f3f4f6] font-medium text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#00a8a8] text-white rounded-lg hover:bg-[#008080] font-medium text-sm"
              >
                Guardar Motivo
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Login Screen
  const USUARIOS_AUTORIZADOS = [
    { email: 'daniel@econova.com.mx', password: 'Innovative2026!', nombre: 'Daniel Reyes', role: 'admin' },
    { email: 'vero@innovative.com.mx', password: 'Innovative2026!', nombre: 'Veronica Arias', role: 'director' },
  ];

  const handleLogin = (e) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setLoginError('Por favor ingresa tu correo y contraseña');
      return;
    }
    const usuario = USUARIOS_AUTORIZADOS.find(u => u.email.toLowerCase() === loginEmail.toLowerCase());
    if (!usuario) {
      setLoginError('Correo no registrado en el sistema');
      return;
    }
    if (usuario.password !== loginPassword) {
      setLoginError('Contraseña incorrecta');
      return;
    }
    setLoginError('');
    setLoginEmail(usuario.email);
    if (rememberMe) {
      localStorage.setItem('innovative_session', JSON.stringify({ email: usuario.email, loggedIn: true }));
    }
    setCurrentView('dashboard');
  };

  // Mapear email logueado a código de ejecutivo
  const currentUserCodigo = (() => {
    const emailToCode = { 'vero@innovative.com.mx': 'VA', 'daniel@econova.com.mx': 'VA' };
    return emailToCode[loginEmail.toLowerCase()] || 'VA';
  })();

  // Nombre del usuario actual y saludo contextual
  const currentUserName = (() => {
    const usuario = USUARIOS_AUTORIZADOS.find(u => u.email.toLowerCase() === loginEmail.toLowerCase());
    return usuario?.nombre?.split(' ')[0] || 'Usuario';
  })();
  const userGreeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 19) return 'Buenas tardes';
    return 'Buenas noches';
  })();

  // Shared section header component for all views
  const SectionHeader = ({ color, icon: Icon, label, linkLabel, onLinkClick }) => (
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

  // Campos requeridos para enviar a operaciones
  const calcularCamposCompletos = (p) => {
    const campos = [
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
    return campos;
  };

  // Crear nuevo lead
  const handleCrearLead = () => {
    if (!nuevoLeadForm.empresa.trim() || !nuevoLeadForm.contactoNombre.trim() || !nuevoLeadForm.ciudad.trim()) {
      return;
    }
    const nuevoProspecto = {
      id: Math.max(...kanbanProspectos.map(p => p.id), 0) + 1,
      empresa: nuevoLeadForm.empresa.trim(),
      planta: nuevoLeadForm.planta.trim() || null,
      ciudad: nuevoLeadForm.ciudad.trim(),
      industria: nuevoLeadForm.industria.trim() || null,
      ejecutivo: currentUserCodigo,
      contacto: {
        nombre: nuevoLeadForm.contactoNombre.trim(),
        puesto: nuevoLeadForm.contactoPuesto.trim() || '',
        correo: nuevoLeadForm.contactoCorreo.trim() || '',
        telefono: nuevoLeadForm.contactoTelefono.trim() || '',
      },
      servicios: nuevoLeadForm.servicios,
      status: 'Lead nuevo',
      semana: null,
      fecha: new Date().toISOString().split('T')[0],
      propuesta: { status: null, ventaTotal: null, utilidad: null, carton: null, playo: null },
      motivoRechazo: null,
      comentarios: nuevoLeadForm.comentarios.trim(),
      volumenEstimado: nuevoLeadForm.volumenEstimado ? parseFloat(nuevoLeadForm.volumenEstimado) : null,
      facturacionEstimada: nuevoLeadForm.facturacionEstimada ? parseFloat(nuevoLeadForm.facturacionEstimada) : null,
      tiposResiduos: nuevoLeadForm.tiposResiduos.trim() || null,
    };
    setKanbanProspectos(prev => [...prev, nuevoProspecto]);
    setShowNuevoLead(false);
    setNuevoLeadForm({
      empresa: '', planta: '', ciudad: '', industria: '',
      contactoNombre: '', contactoPuesto: '', contactoCorreo: '', contactoTelefono: '',
      servicios: [], comentarios: '', tiposResiduos: '', volumenEstimado: '', facturacionEstimada: ''
    });
  };

  // Enviar prospecto a operaciones
  const enviarAOperaciones = (prospecto) => {
    setKanbanProspectos(prev =>
      prev.map(p => p.id === prospecto.id ? { ...p, status: 'Levantamiento' } : p)
    );
    setMostrarDetallesProspecto(false);
  };

  // Login Screen - rendered inline to avoid focus loss on re-render
  const loginScreenJSX = (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#1B5E20] via-[#2E7D32] to-[#388E3C] relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-40 h-40 rounded-full border-2 border-white"></div>
          <div className="absolute top-40 right-20 w-60 h-60 rounded-full border border-white"></div>
          <div className="absolute bottom-20 left-20 w-80 h-80 rounded-full border border-white"></div>
          <div className="absolute bottom-40 right-10 w-32 h-32 rounded-full border-2 border-white"></div>
        </div>

        <div className="flex items-center justify-center w-full relative z-10">
          <img
            src="/IGMexico-Blanco.png"
            alt="Innovative Group México"
            className="w-80 drop-shadow-lg"
          />
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-[#faf7f2] px-8">
        <div className="w-full max-w-md">
          {/* Logo for mobile (hidden on desktop) */}
          <div className="lg:hidden flex justify-center mb-8">
            <img
              src="/IGMexico-V-Color-Logo.png"
              alt="Innovative Group México"
              className="w-48"
            />
          </div>

          {/* Welcome Text */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-[#1c2c4a] mb-2">Bienvenido</h1>
            <p className="text-[#6b7280] text-sm">Ingresa tus credenciales para acceder al sistema</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-[#1c2c4a] mb-2">Correo electrónico</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]">
                  <Send size={16} />
                </div>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => { setLoginEmail(e.target.value); setLoginError(''); }}
                  placeholder="nombre@innovative.com"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-[#e5e7eb] rounded-lg text-sm text-[#1c2c4a] placeholder-[#6b7280]/50 focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/30 focus:border-[#2E7D32] transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-[#1c2c4a] mb-2">Contraseña</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]">
                  <Lock size={16} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => { setLoginPassword(e.target.value); setLoginError(''); }}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-3 bg-white border border-[#e5e7eb] rounded-lg text-sm text-[#1c2c4a] placeholder-[#6b7280]/50 focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/30 focus:border-[#2E7D32] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7280] hover:text-[#1c2c4a] transition-colors"
                >
                  <Eye size={16} />
                </button>
              </div>
            </div>

            {/* Error */}
            {loginError && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <AlertCircle size={16} />
                {loginError}
              </div>
            )}

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-[#e5e7eb] text-[#2E7D32] focus:ring-[#2E7D32] accent-[#2E7D32]"
                />
                <span className="text-sm text-[#6b7280]">Recordarme</span>
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-[#1B5E20] to-[#2E7D32] hover:from-[#2E7D32] hover:to-[#388E3C] text-white rounded-lg font-semibold text-sm transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2"
            >
              Iniciar Sesión
              <ChevronRight size={16} />
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-[#6b7280]">
              Innovative Group México © 2026
            </p>
            <p className="text-xs text-[#6b7280]/60 mt-1">
              Powered by EcoNova Tech Solutions
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // Sidebar - Navegación modular por área
  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const sidebarNavItems = [
    { type: 'category', label: 'PRINCIPAL' },
    { type: 'item', id: 'dashboard', icon: Home, label: 'Dashboard' },
    { type: 'category', label: 'COMERCIAL' },
    { type: 'section', key: 'comercial', icon: TrendingUp, label: 'Nuevas Cuentas',
      items: [
        { id: 'comercial', icon: Briefcase, label: 'Pipeline & Prospectos' },
      ]
    },
    { type: 'section', key: 'trazabilidad', icon: BarChart3, label: 'Trazabilidad',
      items: [
        { id: 'trazabilidad', icon: Target, label: 'Pipeline General' },
      ]
    },
    { type: 'category', label: 'OPERACIONES' },
    { type: 'section', key: 'operacion', icon: Truck, label: 'Operación',
      items: [
        { id: 'operacion', icon: ClipboardList, label: 'Levantamientos' },
      ]
    },
    { type: 'section', key: 'subproductos', icon: Recycle, label: 'Subproductos',
      items: [
        { id: 'subproductos', icon: Leaf, label: 'Economía Circular' },
      ]
    },
  ];

  const Sidebar = () => {
    // Helper: check if any sub-item in a section is active
    const isSectionActive = (sectionKey) => {
      const section = sidebarNavItems.find(n => n.key === sectionKey);
      return section?.items?.some(i => currentView === i.id);
    };

    return (
    <div className={`bg-white h-screen transition-all duration-300 ${sidebarOpen ? 'w-56' : 'w-[60px]'} flex flex-col border-r border-[#e5e7eb] relative overflow-hidden`}>
      {/* Logo */}
      <div className="px-4 py-3 flex items-center justify-between">
        {sidebarOpen ? (
          <img src="/IGMexico-V-Color-Logo.png" alt="Innovative Group" className="h-8 object-contain" />
        ) : (
          <div className="w-7 h-7 rounded-md bg-[#00a8a8] flex items-center justify-center text-white text-[10px] font-bold">IG</div>
        )}
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-[#6b7280] hover:text-[#1c2c4a] transition-colors p-1 rounded-md hover:bg-[#f3f4f6]">
          {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
        </button>
      </div>

      {/* Search bar */}
      {sidebarOpen && (
        <div className="px-3 pb-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#f3f4f6]/50 border border-[#e5e7eb]/50 rounded-md text-[#6b7280] cursor-pointer hover:border-[#e5e7eb] transition-colors">
            <Search size={13} />
            <span className="text-[12px]">Buscar...</span>
            <kbd className="ml-auto text-[9px] bg-white px-1 py-0.5 rounded border border-[#e5e7eb] font-mono">⌘K</kbd>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-2 overflow-y-auto scrollbar-hide">
        {sidebarNavItems.map((navItem, idx) => {
          // --- Category label (Notion-style) ---
          if (navItem.type === 'category') {
            if (!sidebarOpen) return null;
            return (
              <div key={navItem.label} className="text-[9px] uppercase tracking-widest font-semibold text-[#6b7280]/40 px-2.5 pt-4 pb-0.5">
                {navItem.label}
              </div>
            );
          }
          // --- Single item (Dashboard, Admin) ---
          if (navItem.type === 'item') {
            return (
              <button
                key={navItem.id}
                onClick={() => {
                  setCurrentView(navItem.id);
                  setSelectedClient(null);
                  setSelectedTeamMember(null);
                }}
                className={`w-full flex items-center ${sidebarOpen ? 'justify-start gap-2.5' : 'justify-center'} px-2.5 py-1.5 rounded-md mb-px transition-all text-[13px] ${
                  currentView === navItem.id
                    ? 'bg-[#00a8a8]/10 text-[#00a8a8] font-semibold'
                    : 'text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#1c2c4a] font-medium'
                }`}
              >
                <navItem.icon size={16} className="flex-shrink-0" />
                {sidebarOpen && <span className="flex-1 text-left">{navItem.label}</span>}
              </button>
            );
          }

          // --- Collapsible section ---
          const isExpanded = expandedSections[navItem.key];
          const isActive = isSectionActive(navItem.key);

          return (
            <div key={navItem.key}>
              {/* Section header */}
              <button
                onClick={() => {
                  if (sidebarOpen) {
                    toggleSection(navItem.key);
                  } else {
                    const mainItem = navItem.items[0];
                    if (mainItem) {
                      setCurrentView(mainItem.id);
                      setSelectedClient(null);
                      setSelectedTeamMember(null);
                    }
                  }
                }}
                className={`w-full flex items-center ${sidebarOpen ? 'justify-start gap-2.5' : 'justify-center'} px-2.5 py-1.5 rounded-md mb-px transition-all text-[13px] ${
                  isActive
                    ? 'bg-[#00a8a8]/5 text-[#00a8a8] font-semibold'
                    : 'text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#1c2c4a] font-medium'
                }`}
              >
                <navItem.icon size={16} className="flex-shrink-0" />
                {sidebarOpen && (
                  <>
                    <span className="flex-1 text-left">{navItem.label}</span>
                    <ChevronDown size={12} className={`transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'} ${isActive ? 'text-[#00a8a8]' : 'text-[#6b7280]/50'}`} />
                  </>
                )}
              </button>

              {/* Sub-items */}
              {sidebarOpen && isExpanded && (
                <div className="ml-3.5 border-l border-[#e5e7eb] pl-2">
                  {navItem.items.map(subItem => (
                    <button
                      key={subItem.id}
                      onClick={() => {
                        setCurrentView(subItem.id);
                        setSelectedClient(null);
                        setSelectedTeamMember(null);
                      }}
                      className={`w-full flex items-center gap-2 px-2.5 py-1 rounded-md mb-px transition-all text-[12px] ${
                        currentView === subItem.id
                          ? 'bg-[#00a8a8]/10 text-[#00a8a8] font-semibold'
                          : 'text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#1c2c4a] font-medium'
                      }`}
                    >
                      <subItem.icon size={13} className="flex-shrink-0" />
                      <span className="flex-1 text-left">{subItem.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Usuario + Logout */}
      <div className="px-2 py-2 border-t border-[#e5e7eb]">
        {sidebarOpen ? (
          <div className="flex items-center gap-2.5 px-2.5 py-1.5 mb-1">
            <div className="w-7 h-7 rounded-full bg-[#00a8a8] flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0">
              {(USUARIOS_AUTORIZADOS.find(u => u.email.toLowerCase() === loginEmail.toLowerCase())?.nombre || 'U').charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-[#1c2c4a] truncate">{USUARIOS_AUTORIZADOS.find(u => u.email.toLowerCase() === loginEmail.toLowerCase())?.nombre || 'Usuario'}</div>
              <div className="text-[10px] text-[#6b7280] truncate">{loginEmail}</div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-1.5 mb-1">
            <div className="w-7 h-7 rounded-full bg-[#00a8a8] flex items-center justify-center text-[11px] font-semibold text-white">
              {(USUARIOS_AUTORIZADOS.find(u => u.email.toLowerCase() === loginEmail.toLowerCase())?.nombre || 'U').charAt(0)}
            </div>
          </div>
        )}
        <button
          onClick={() => {
            setCurrentView('admin');
            setSelectedClient(null);
            setSelectedTeamMember(null);
          }}
          className={`w-full flex items-center ${sidebarOpen ? 'justify-start gap-2.5' : 'justify-center'} px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-all ${
            currentView === 'admin'
              ? 'bg-[#00a8a8]/10 text-[#00a8a8]'
              : 'text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#1c2c4a]'
          }`}
        >
          <Settings size={16} className="flex-shrink-0" />
          {sidebarOpen && <span className="flex-1 text-left">Administración</span>}
        </button>
        <button
          onClick={() => { localStorage.removeItem('innovative_session'); setCurrentView('login'); setLoginEmail(''); setLoginPassword(''); }}
          className={`w-full flex items-center ${sidebarOpen ? 'justify-start gap-2.5' : 'justify-center'} px-2.5 py-1.5 text-[#6b7280] hover:bg-red-500/10 hover:text-red-600 rounded-md text-[13px] font-medium transition-all`}
        >
          <LogOut size={16} className="flex-shrink-0" />
          {sidebarOpen && <span className="flex-1 text-left">Cerrar sesión</span>}
        </button>
      </div>
    </div>
    );
  };

  // DASHBOARD PRINCIPAL
  // DASHBOARD EJECUTIVO - Resumen para Dirección
  const DashboardView = () => {
    // ============ COMERCIAL DATA ============
    const leadsActivos = topProspectos.filter(p => !['Propuesta Rechazada', 'Inicio de operación'].includes(p.status));
    const propuestasEnviadas = topProspectos.filter(p => p.status === 'Propuesta enviada');
    const ganadas = topProspectos.filter(p => p.status === 'Inicio de operación');
    const rechazadas = topProspectos.filter(p => p.status === 'Propuesta Rechazada');
    const pipelineBruto = topProspectos.reduce((s, p) => s + (p.propuesta?.ventaTotal || p.facturacionEstimada || 0), 0);
    const pipelinePonderado = calcularWeightedPipeline(topProspectos);
    const winRate = calcularWinRate(topProspectos);
    const presupuestoTotal = salesTeamData.reduce((s, m) => s + m.presupuestoAnual2026, 0);
    const ventasTotal = salesTeamData.reduce((s, m) => s + m.ventasReales, 0);
    const stageData = KANBAN_STAGES.map(stage => ({
      ...stage,
      count: topProspectos.filter(p => p.status === stage.id).length,
      valor: topProspectos.filter(p => p.status === stage.id).reduce((s, p) => s + (p.propuesta?.ventaTotal || p.facturacionEstimada || 0), 0),
    }));
    const topDeals = [...topProspectos]
      .filter(p => !['Propuesta Rechazada'].includes(p.status))
      .sort((a, b) => (b.propuesta?.ventaTotal || b.facturacionEstimada || 0) - (a.propuesta?.ventaTotal || a.facturacionEstimada || 0))
      .slice(0, 3);

    // ============ OPERACIONES DATA ============
    const levActivos = levantamientosActivos.filter(l => l.tipo === 'Levantamiento');
    const levCompletados = levantamientosActivos.filter(l => l.status === 'Completado');
    const levSinReporte = levantamientosActivos.filter(l => l.status === 'Completado' && !l.tieneReporte);
    const propuestasOps = levantamientosActivos.filter(l => l.tipo === 'Propuesta');
    const valorPipelineOps = levantamientosActivos.reduce((s, l) => s + (l.valorEstimado || 0), 0);
    const docsVigentes = documentos.filter(d => calcularStatusDocumento(d.fechaVencimiento) === 'Vigente');
    const docsPorVencer = documentos.filter(d => ['Por Vencer'].includes(calcularStatusDocumento(d.fechaVencimiento)));
    const docsVencidos = documentos.filter(d => calcularStatusDocumento(d.fechaVencimiento) === 'Vencido');

    // ============ ECONOMIA CIRCULAR DATA ============
    const toneladasReciclaje = datosTrazabilidad.reciclaje.reduce((sum, item) => sum + meses.reduce((s, m) => s + (item[m] || 0), 0), 0);
    const toneladasComposta = datosTrazabilidad.composta.reduce((sum, item) => sum + meses.reduce((s, m) => s + (item[m] || 0), 0), 0);
    const toneladasReuso = datosTrazabilidad.reuso.reduce((sum, item) => sum + meses.reduce((s, m) => s + (item[m] || 0), 0), 0);
    const toneladasRelleno = datosTrazabilidad.rellenoSanitario.reduce((sum, item) => sum + meses.reduce((s, m) => s + (item[m] || 0), 0), 0);
    const toneladasCirculares = toneladasReciclaje + toneladasComposta + toneladasReuso;
    const totalGenerado = toneladasCirculares + toneladasRelleno;
    const porcentajeDesviacion = totalGenerado > 0 ? ((toneladasCirculares / totalGenerado) * 100) : 0;
    const co2Evitado = (toneladasCirculares * 2.5);
    const ingresosOperativos = clientesConReportes.reduce((s, c) => s + c.ingresosMes, 0);

    // Alertas
    const alertasActivas = alertas.slice(0, 5);

    return (
    <div className="p-4 md:p-6 lg:p-8 bg-[#faf7f2] min-h-screen">
      <div className="max-w-[1400px] mx-auto">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#1c2c4a]">{userGreeting}, {currentUserName}</h1>
          <p className="text-sm text-[#6b7280] mt-0.5">Aquí tienes el pulso de toda tu operación</p>
        </div>
        <div className="text-xs text-[#6b7280] bg-white px-3 py-1.5 rounded-lg border border-[#e5e7eb]">
          {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* ═══════ ROW 0: EXECUTIVE MEGA-KPIs ═══════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pipeline Total */}
        <div className="bg-gradient-to-br from-[#1c2c4a] to-[#0D47A1] rounded-xl p-5 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-white/70">Pipeline por Ejecutivo</span>
            <DollarSign size={18} className="text-white/40" />
          </div>
          <div className="text-2xl font-bold">${(pipelinePonderado / 1000000).toFixed(1)}M</div>
          <div className="text-xs text-white/60 mt-1">Bruto: ${(pipelineBruto / 1000000).toFixed(0)}M · {leadsActivos.length} opps</div>
        </div>
        {/* Ingresos Operativos */}
        <div className="bg-gradient-to-br from-[#2E7D32] to-[#1B5E20] rounded-xl p-5 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-white/70">Ingresos Operativos</span>
            <TrendingUp size={18} className="text-white/40" />
          </div>
          <div className="text-2xl font-bold">${(ingresosOperativos / 1000000).toFixed(1)}M<span className="text-sm font-normal text-white/60">/mes</span></div>
          <div className="text-xs text-white/60 mt-1">{clientesConReportes.length} clientes activos · {clientesConReportes.reduce((s, c) => s + c.sucursales, 0)} sucursales</div>
        </div>
        {/* Toneladas Circulares */}
        <div className="bg-gradient-to-br from-[#00796B] to-[#004D40] rounded-xl p-5 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-white/70">Economía Circular</span>
            <Recycle size={18} className="text-white/40" />
          </div>
          <div className="text-2xl font-bold">{(toneladasCirculares / 1000).toFixed(1)}K<span className="text-sm font-normal text-white/60"> ton</span></div>
          <div className="text-xs text-white/60 mt-1">{porcentajeDesviacion.toFixed(0)}% desviación · {co2Evitado.toFixed(0)} ton CO₂ evitado</div>
        </div>
        {/* Alertas */}
        <div className={`bg-gradient-to-br ${alertas.length > 5 ? 'from-[#C62828] to-[#B71C1C]' : 'from-[#E65100] to-[#BF360C]'} rounded-xl p-5 text-white`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-white/70">Alertas Pendientes</span>
            <Bell size={18} className="text-white/40" />
          </div>
          <div className="text-2xl font-bold">{alertas.length}</div>
          <div className="text-xs text-white/60 mt-1">
            {alertas.filter(a => a.prioridad === 'alta').length} alta · {alertas.filter(a => a.prioridad === 'media').length} media prioridad
          </div>
        </div>
      </div>

      {/* ═══════ SECTION A: COMERCIAL ═══════ */}
      <SectionHeader color="#00a8a8" icon={TrendingUp} label="Comercial" linkLabel="Ver Pipeline" onLinkClick={() => setCurrentView('comercial')} />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-[#e5e7eb] p-4">
          <div className="text-xs text-[#6b7280] mb-1">Oportunidades</div>
          <div className="text-xl font-bold text-[#1c2c4a]">{leadsActivos.length}</div>
          <div className="text-[10px] text-[#6b7280]">{rechazadas.length} rechazadas</div>
        </div>
        <div className="bg-white rounded-xl border border-[#e5e7eb] p-4">
          <div className="text-xs text-[#6b7280] mb-1">Win Rate</div>
          <div className="text-xl font-bold text-[#1c2c4a]">{winRate.toFixed(0)}%</div>
          <div className="text-[10px] text-[#2E7D32]">{ganadas.length} ganadas</div>
        </div>
        <div className="bg-white rounded-xl border border-[#e5e7eb] p-4">
          <div className="text-xs text-[#6b7280] mb-1">Propuestas Pendientes</div>
          <div className="text-xl font-bold text-[#1c2c4a]">{propuestasEnviadas.length}</div>
          <div className="text-[10px] text-[#00a8a8]">${(propuestasEnviadas.reduce((s, p) => s + (p.propuesta?.ventaTotal || 0), 0) / 1000000).toFixed(1)}M</div>
        </div>
      </div>

      {/* Pipeline + Top Deals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        {/* Pipeline por Stage (compact) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#e5e7eb] p-4">
          <h3 className="text-sm font-semibold text-[#1c2c4a] mb-3">Pipeline por Stage</h3>
          <div className="space-y-1.5">
            {stageData.map(stage => {
              const maxCount = Math.max(...stageData.map(s => s.count), 1);
              const pct = (stage.count / maxCount) * 100;
              return (
                <div key={stage.id} className="flex items-center gap-2">
                  <div className="w-20 text-[11px] font-medium text-[#6b7280] text-right truncate">{stage.label}</div>
                  <div className="flex-1 bg-[#f3f4f6] rounded-full h-5 overflow-hidden">
                    <div className="h-full rounded-full flex items-center justify-end pr-2 transition-all"
                      style={{ width: `${Math.max(pct, 8)}%`, backgroundColor: stage.color }}>
                      <span className="text-[10px] font-bold text-white">{stage.count}</span>
                    </div>
                  </div>
                  <div className="w-14 text-right text-[11px] font-semibold text-[#1c2c4a]">${(stage.valor / 1000000).toFixed(1)}M</div>
                </div>
              );
            })}
          </div>
          <div className="mt-2 pt-2 border-t border-[#e5e7eb] flex items-center justify-between text-[11px] text-[#6b7280]">
            <span>Total: {topProspectos.length} oportunidades</span>
            <span>Ponderado: <span className="font-semibold text-[#00a8a8]">${(pipelinePonderado / 1000000).toFixed(1)}M</span></span>
          </div>
        </div>

        {/* Top 3 Deals */}
        <div className="bg-white rounded-xl border border-[#e5e7eb] p-4">
          <h3 className="text-sm font-semibold text-[#1c2c4a] mb-3">Top Oportunidades</h3>
          <div className="space-y-2">
            {topDeals.map((deal, idx) => {
              const valor = deal.propuesta?.ventaTotal || deal.facturacionEstimada || 0;
              const stage = KANBAN_STAGES.find(s => s.id === deal.status);
              return (
                <div key={deal.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-[#f3f4f6] transition-colors cursor-pointer"
                  onClick={() => { setSelectedProspecto(deal); setMostrarDetallesProspecto(true); }}>
                  <div className="w-5 h-5 rounded-full bg-[#f3f4f6] flex items-center justify-center text-[10px] font-bold text-[#6b7280]">{idx + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-[#1c2c4a] truncate">{deal.empresa}</div>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${stage?.color}15`, color: stage?.color }}>{stage?.label}</span>
                  </div>
                  <div className="text-xs font-bold text-[#0D47A1]">${(valor / 1000000).toFixed(1)}M</div>
                </div>
              );
            })}
          </div>
          {/* Historial anual */}
          <div className="mt-3 pt-3 border-t border-[#e5e7eb]">
            <div className="text-[11px] text-[#6b7280] mb-1">Historial Anual</div>
            <div className="space-y-1.5">
              {historicoVentas.map(h => {
                const maxVal = Math.max(...historicoVentas.map(v => v.valor));
                const pct = (h.valor / maxVal) * 100;
                return (
                  <div key={h.año} className="flex items-center gap-2">
                    <div className="w-8 text-[10px] font-semibold text-[#1c2c4a]">{h.año}</div>
                    <div className="flex-1 bg-[#f3f4f6] rounded-full h-2.5 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: h.tipo === 'Presupuesto' ? '#00a8a8' : '#0D47A1' }} />
                    </div>
                    <div className="text-[10px] font-semibold text-[#1c2c4a] w-10 text-right">${(h.valor / 1000000).toFixed(0)}M</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════ SECTION B: OPERACIONES ═══════ */}
      <SectionHeader color="#F57C00" icon={Truck} label="Operaciones" linkLabel="Ver Levantamientos" onLinkClick={() => setCurrentView('operacion')} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-[#e5e7eb] p-4">
          <div className="text-xs text-[#6b7280] mb-1">Levantamientos Activos</div>
          <div className="text-xl font-bold text-[#1c2c4a]">{levActivos.length}</div>
          <div className="text-[10px] text-[#6b7280]">{levCompletados.length} completados</div>
        </div>
        <div className={`bg-white rounded-xl border p-4 ${levSinReporte.length > 0 ? 'border-orange-300 bg-orange-50/30' : 'border-[#e5e7eb]'}`}>
          <div className="text-xs text-[#6b7280] mb-1">Sin Reporte</div>
          <div className={`text-xl font-bold ${levSinReporte.length > 0 ? 'text-[#F57C00]' : 'text-[#1c2c4a]'}`}>{levSinReporte.length}</div>
          <div className="text-[10px] text-[#F57C00]">{levSinReporte.length > 0 ? 'Requieren atención' : 'Todo al corriente'}</div>
        </div>
        <div className="bg-white rounded-xl border border-[#e5e7eb] p-4">
          <div className="text-xs text-[#6b7280] mb-1">Propuestas Op.</div>
          <div className="text-xl font-bold text-[#1c2c4a]">{propuestasOps.length}</div>
          <div className="text-[10px] text-[#6b7280]">${(valorPipelineOps / 1000000).toFixed(1)}M valor total</div>
        </div>
        <div className={`bg-white rounded-xl border p-4 ${docsVencidos.length > 0 ? 'border-red-300 bg-red-50/30' : 'border-[#e5e7eb]'}`}>
          <div className="text-xs text-[#6b7280] mb-1">Documentos</div>
          <div className="text-xl font-bold text-[#1c2c4a]">{documentos.length}</div>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="text-[#2E7D32]">{docsVigentes.length} vig.</span>
            <span className="text-[#F57C00]">{docsPorVencer.length} por venc.</span>
            {docsVencidos.length > 0 && <span className="text-red-600 font-bold">{docsVencidos.length} venc.</span>}
          </div>
        </div>
      </div>

      {/* Levantamientos list + Docs compliance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#e5e7eb] p-4">
          <h3 className="text-sm font-semibold text-[#1c2c4a] mb-3">Levantamientos y Propuestas</h3>
          <div className="space-y-1.5">
            {levantamientosActivos.slice(0, 6).map(lev => {
              const statusColor = lev.status === 'Completado' ? '#2E7D32' : lev.status === 'Enviada' ? '#0D47A1' : lev.status === 'Agendado' ? '#7C3AED' : '#F57C00';
              return (
                <div key={lev.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#f9fafb] text-xs">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: statusColor }} />
                  <span className="font-medium text-[#1c2c4a] w-36 truncate">{lev.cliente}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${statusColor}15`, color: statusColor }}>{lev.status}</span>
                  <span className="text-[#6b7280] flex-1 truncate">{lev.ejecutivo}</span>
                  <span className="text-[#6b7280]">{lev.volumenEstimado}</span>
                  <span className="font-semibold text-[#0D47A1] w-16 text-right">${(lev.valorEstimado / 1000000).toFixed(2)}M</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Documents compliance widget */}
        <div className="bg-white rounded-xl border border-[#e5e7eb] p-4">
          <h3 className="text-sm font-semibold text-[#1c2c4a] mb-3">Cumplimiento Documental</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-[#2E7D32]" />
              <span className="text-sm text-[#1c2c4a] flex-1">Vigentes</span>
              <span className="text-lg font-bold text-[#2E7D32]">{docsVigentes.length}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-[#F57C00]" />
              <span className="text-sm text-[#1c2c4a] flex-1">Por Vencer</span>
              <span className="text-lg font-bold text-[#F57C00]">{docsPorVencer.length}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-sm text-[#1c2c4a] flex-1">Vencidos</span>
              <span className="text-lg font-bold text-red-500">{docsVencidos.length}</span>
            </div>
          </div>
          {/* Compliance bar */}
          <div className="mt-4 pt-3 border-t border-[#e5e7eb]">
            <div className="text-[11px] text-[#6b7280] mb-1.5">Cumplimiento general</div>
            <div className="w-full h-3 bg-[#e5e7eb] rounded-full overflow-hidden flex">
              {documentos.length > 0 && (
                <>
                  <div className="h-full bg-[#2E7D32]" style={{ width: `${(docsVigentes.length / documentos.length) * 100}%` }} />
                  <div className="h-full bg-[#F57C00]" style={{ width: `${(docsPorVencer.length / documentos.length) * 100}%` }} />
                  <div className="h-full bg-red-500" style={{ width: `${(docsVencidos.length / documentos.length) * 100}%` }} />
                </>
              )}
            </div>
            <div className="text-[11px] text-[#6b7280] mt-1">{documentos.length > 0 ? Math.round((docsVigentes.length / documentos.length) * 100) : 100}% al corriente</div>
          </div>
        </div>
      </div>

      {/* ═══════ SECTION C: ECONOMIA CIRCULAR ═══════ */}
      <SectionHeader color="#2E7D32" icon={Recycle} label="Economía Circular" linkLabel="Ver Trazabilidad" onLinkClick={() => setCurrentView('subproductos')} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-[#e5e7eb] p-4">
          <div className="text-xs text-[#6b7280] mb-1">Toneladas Circulares</div>
          <div className="text-xl font-bold text-[#1c2c4a]">{(toneladasCirculares / 1000).toFixed(1)}K</div>
          <div className="text-[10px] text-[#6b7280]">de {(totalGenerado / 1000).toFixed(1)}K generadas</div>
        </div>
        <div className="bg-white rounded-xl border border-[#e5e7eb] p-4">
          <div className="text-xs text-[#6b7280] mb-1">Tasa de Desviación</div>
          <div className="text-xl font-bold" style={{ color: porcentajeDesviacion >= 90 ? '#2E7D32' : porcentajeDesviacion >= 70 ? '#F57C00' : '#DC2626' }}>{porcentajeDesviacion.toFixed(1)}%</div>
          <div className="text-[10px] text-[#2E7D32]">Meta: 95%</div>
        </div>
        <div className="bg-white rounded-xl border border-[#e5e7eb] p-4">
          <div className="text-xs text-[#6b7280] mb-1">Clientes Activos</div>
          <div className="text-xl font-bold text-[#1c2c4a]">{clientesConReportes.length}</div>
          <div className="text-[10px] text-[#6b7280]">{clientesConReportes.reduce((s, c) => s + c.sucursales, 0)} sucursales</div>
        </div>
        <div className="bg-white rounded-xl border border-[#e5e7eb] p-4">
          <div className="text-xs text-[#6b7280] mb-1">CO₂ Evitado</div>
          <div className="text-xl font-bold text-[#1c2c4a]">{co2Evitado.toFixed(0)}<span className="text-xs font-normal text-[#6b7280]"> ton</span></div>
          <div className="text-[10px] text-[#2E7D32]">≈ {clientesConReportes.reduce((s, c) => s + c.impactoMensual.arboles, 0).toLocaleString()} árboles</div>
        </div>
      </div>

      {/* Circular chart + Clientes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#e5e7eb] p-4">
          <h3 className="text-sm font-semibold text-[#1c2c4a] mb-2">Distribución por Destino</h3>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={distribucionPorDestinoBase}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} width={35} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              <Area type="monotone" dataKey="Reciclaje" stackId="1" stroke="#0D47A1" fill="#0D47A1" fillOpacity={0.7} />
              <Area type="monotone" dataKey="Composta" stackId="1" stroke="#2E7D32" fill="#2E7D32" fillOpacity={0.7} />
              <Area type="monotone" dataKey="Reuso" stackId="1" stroke="#00a8a8" fill="#00a8a8" fillOpacity={0.7} />
              <Area type="monotone" dataKey="Relleno sanitario" stackId="1" stroke="#6b7280" fill="#6b7280" fillOpacity={0.4} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-[#e5e7eb] p-4">
          <h3 className="text-sm font-semibold text-[#1c2c4a] mb-3">Clientes Circulares</h3>
          <div className="space-y-3">
            {clientesConReportes.map(c => (
              <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#f9fafb] cursor-pointer" onClick={() => setCurrentView('subproductos')}>
                <span className="text-lg">{c.logo}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-[#1c2c4a] truncate">{c.name}</div>
                  <div className="text-[10px] text-[#6b7280]">{c.rmeGestionado} ton · {c.sucursales} suc.</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-[#0D47A1]">${(c.ingresosMes / 1000000).toFixed(1)}M</div>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                    c.statusReporte === 'Enviado' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                  }`}>{c.statusReporte}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════ SECTION D: EQUIPO + ALERTAS ═══════ */}
      <SectionHeader color="#1c2c4a" icon={Users} label="Equipo y Alertas" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Team performance table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#e5e7eb] p-4">
          <h3 className="text-sm font-semibold text-[#1c2c4a] mb-3">Rendimiento del Equipo</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#e5e7eb]">
                  <th className="text-left py-2 text-[#6b7280] font-medium">Ejecutivo</th>
                  <th className="text-right py-2 text-[#6b7280] font-medium">Pipeline</th>
                  <th className="text-right py-2 text-[#6b7280] font-medium">Opps</th>
                  <th className="text-right py-2 text-[#6b7280] font-medium">Leads/S</th>
                  <th className="text-right py-2 text-[#6b7280] font-medium">Reun/S</th>
                  <th className="text-right py-2 text-[#6b7280] font-medium">Score</th>
                </tr>
              </thead>
              <tbody>
                {salesTeamData.filter(m => m.codigo !== 'VA').map(member => {
                  const memberProspectos = topProspectos.filter(p => p.ejecutivo === member.codigo);
                  const memberPipeline = memberProspectos.reduce((s, p) => s + (p.propuesta?.ventaTotal || p.facturacionEstimada || 0), 0);
                  const lastWeek = member.kpisSemanales && member.kpisSemanales.length > 0 ? member.kpisSemanales[member.kpisSemanales.length - 1] : null;
                  return (
                    <tr key={member.id}
                      className="border-b border-[#f3f4f6] hover:bg-[#f9fafb] cursor-pointer transition-colors"
                      onClick={() => { setHubEjecutivo(member);setCurrentView('hub-ejecutivo'); }}>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <ExecutiveAvatar codigo={member.codigo} name={member.name} size="xs" />
                          <div>
                            <div className="font-semibold text-[#1c2c4a]">{member.name.split(' ').slice(0, 2).join(' ')}</div>
                            <div className="text-[10px] text-[#6b7280]">{member.zona}</div>
                          </div>
                        </div>
                      </td>
                      <td className="text-right font-bold text-[#0D47A1] py-2.5">${(memberPipeline / 1000000).toFixed(1)}M</td>
                      <td className="text-right text-[#1c2c4a] py-2.5">{memberProspectos.length}</td>
                      <td className="text-right text-[#1c2c4a] py-2.5">{lastWeek?.leadsNuevos ?? '—'}</td>
                      <td className="text-right text-[#1c2c4a] py-2.5">{lastWeek?.reunionesAgendadas ?? '—'}</td>
                      <td className="text-right py-2.5">
                        <span className={`inline-block px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          member.eficienciaGlobal >= 75 ? 'bg-green-100 text-green-700' :
                          member.eficienciaGlobal >= 50 ? 'bg-orange-100 text-orange-700' :
                          'bg-red-100 text-red-700'
                        }`}>{member.eficienciaGlobal}%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Alertas */}
        <div className="bg-white rounded-xl border border-[#e5e7eb] p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[#1c2c4a]">Alertas</h3>
            <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">{alertas.length}</span>
          </div>
          {alertasActivas.length > 0 ? (
            <div className="space-y-2">
              {alertasActivas.map((alerta, idx) => (
                <div key={idx} className={`p-2.5 rounded-lg border text-[11px] ${
                  alerta.prioridad === 'alta' ? 'bg-red-50 border-red-200' :
                  alerta.prioridad === 'media' ? 'bg-orange-50 border-orange-200' :
                  'bg-yellow-50 border-yellow-200'
                }`}>
                  <div className="font-medium text-[#1c2c4a] mb-0.5">{alerta.mensaje}</div>
                  <span className={`font-semibold ${alerta.prioridad === 'alta' ? 'text-red-600' : 'text-orange-600'}`}>{alerta.accion}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-[#6b7280]">
              <CheckSquare size={28} className="mb-2 text-[#2E7D32]" />
              <span className="text-xs">Sin alertas pendientes</span>
            </div>
          )}
        </div>
      </div>

    </div>
    </div>
    );
  };

  // VISTA: HUB DEL EJECUTIVO — centro de trabajo personal
  const EjecutivoHubView = () => {
    if (!hubEjecutivo) return null;
    const member = hubEjecutivo;
    const memberProspectos = kanbanProspectos.filter(p => p.ejecutivo === member.codigo);
    const memberLeads = memberProspectos.filter(p => ['Lead nuevo', 'Reunión agendada'].includes(p.status));
    const memberProspectosActivos = memberProspectos.filter(p => !['Lead nuevo', 'Reunión agendada', 'Propuesta Rechazada'].includes(p.status));
    const memberRechazados = memberProspectos.filter(p => p.status === 'Propuesta Rechazada');
    const memberGanados = memberProspectos.filter(p => p.status === 'Inicio de operación');
    const memberPropuestas = memberProspectos.filter(p => ['Propuesta enviada', 'Negociación'].includes(p.status));
    const totalPipeline = memberProspectos.reduce((s, p) => s + (p.propuesta?.ventaTotal || p.facturacionEstimada || 0), 0);

    // Interactive state
    const [selectedProspecto, setSelectedProspecto] = React.useState(null);
    const [copiedField, setCopiedField] = React.useState(null);
    const [hubActiveKanbanId, setHubActiveKanbanId] = React.useState(null);

    const handleFileUpload = (e) => {
      if (!selectedProspecto) return;
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;
      const nuevosArchivos = files.map((f, idx) => ({
        id: Date.now() + idx,
        name: f.name,
        type: f.type,
        size: f.size,
        date: new Date().toISOString().split('T')[0],
      }));
      setProspectoArchivos(prev => ({
        ...prev,
        [selectedProspecto.id]: [...(prev[selectedProspecto.id] || []), ...nuevosArchivos]
      }));
      e.target.value = '';
    };

    const agregarNota = () => {
      if (!prospectoNuevaNota.trim() || !selectedProspecto) return;
      setProspectoNotas(prev => ({
        ...prev,
        [selectedProspecto.id]: [...(prev[selectedProspecto.id] || []), {
          id: Date.now(),
          text: prospectoNuevaNota.trim(),
          date: new Date().toISOString(),
        }]
      }));
      setProspectoNuevaNota('');
    };

    const eliminarNota = (notaId) => {
      if (!selectedProspecto) return;
      setProspectoNotas(prev => ({
        ...prev,
        [selectedProspecto.id]: (prev[selectedProspecto.id] || []).filter(n => n.id !== notaId)
      }));
    };

    const eliminarArchivo = (archivoId) => {
      if (!selectedProspecto) return;
      setProspectoArchivos(prev => ({
        ...prev,
        [selectedProspecto.id]: (prev[selectedProspecto.id] || []).filter(a => a.id !== archivoId)
      }));
    };

    const guardarSeguimiento = (prospectoId, data) => {
      setProspectoSeguimiento(prev => ({
        ...prev,
        [prospectoId]: {
          ...prev[prospectoId],
          ...data,
          fechaCreacion: prev[prospectoId]?.fechaCreacion || new Date().toISOString().split('T')[0],
        }
      }));
    };

    const getFileIcon = (type) => {
      if (type?.includes('pdf')) return <FileText size={16} className="text-red-500" />;
      if (type?.includes('image')) return <Image size={16} className="text-blue-500" />;
      if (type?.includes('sheet') || type?.includes('excel') || type?.includes('csv')) return <BarChart3 size={16} className="text-green-600" />;
      return <Paperclip size={16} className="text-gray-400" />;
    };

    const formatFileSize = (bytes) => {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const STAGE_COLORS = {
      'Lead nuevo': '#6b7280',
      'Reunión agendada': '#0D47A1',
      'Levantamiento': '#F57C00',
      'Propuesta enviada': '#00a8a8',
      'Negociación': '#7C3AED',
      'Inicio de operación': '#2E7D32',
      'Propuesta Rechazada': '#DC2626',
    };


    // Copy to clipboard helper
    const copyToClipboard = (text, fieldName) => {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    };

    // Hub Kanban drag handlers
    const hubHandleDragStart = React.useCallback((event) => {
      setHubActiveKanbanId(event.active.id);
    }, []);

    const hubHandleDragEnd = React.useCallback((event) => {
      setHubActiveKanbanId(null);
      const { active, over } = event;
      if (!over || !active) return;
      const prospecto = memberProspectos.find(p => p.id === active.id);
      if (!prospecto) return;
      const overId = String(over.id);
      const targetStage = over.data?.current?.type === 'card'
        ? memberProspectos.find(p => p.id === over.id)?.status
        : overId.startsWith('hub-') ? overId.replace('hub-', '') : overId;
      if (!targetStage || targetStage === prospecto.status) return;
      const gate = STAGE_GATES[targetStage];
      if (gate && !gate.validate(prospecto)) {
        setShowStageGateModal(true);
        setPendingMove({ prospecto, fromStage: prospecto.status, toStage: targetStage });
        return;
      }
      setKanbanProspectos(prev => prev.map(p => p.id === prospecto.id ? { ...p, status: targetStage } : p));
    }, [memberProspectos]);

    const hubActiveCard = hubActiveKanbanId ? memberProspectos.find(p => p.id === hubActiveKanbanId) : null;

    // Change prospect stage
    const changeProspectoStage = (prospectoId, newStage) => {
      setKanbanProspectos(prev => prev.map(p => p.id === prospectoId ? { ...p, status: newStage } : p));
      setSelectedProspecto(prev => prev ? { ...prev, status: newStage } : null);
    };

    // Calculate days since a date
    const diasDesde = (fecha) => {
      if (!fecha) return null;
      const diff = Math.floor((new Date() - new Date(fecha)) / (1000 * 60 * 60 * 24));
      return diff;
    };

    // --- PROSPECT DETAIL DRAWER ---
    const ProspectoDrawer = ({ prospecto, onClose }) => {
      const [drawerTab, setDrawerTab] = React.useState('info');

      // Fetch real prospect from DB by name to get the correct ID for CRM tabs
      const { data: dbProspects = [] } = useQuery({
        queryKey: ['/api/comercial/prospects'],
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
      });

      if (!prospecto) return null;
      const p = prospecto;

      // Find matching prospect in DB by name (empresa)
      const dbProspect = dbProspects.find(dp =>
        dp.name?.toLowerCase().includes(p.empresa?.toLowerCase()?.substring(0, 10)) ||
        p.empresa?.toLowerCase().includes(dp.name?.toLowerCase()?.substring(0, 10))
      );
      const realProspectId = dbProspect?.id || p.id;

      const stageInfo = KANBAN_STAGES.find(s => s.id === p.status);
      const dias = diasDesde(p.fecha);
      const valor = p.propuesta?.ventaTotal || p.facturacionEstimada || 0;
      const sc = p.servicios?.map(s => {
        const svc = SERVICIOS_INNOVATIVE.find(si => si.id === s);
        const col = SERVICE_COLORS[s] || { bg: '#f3f4f6', text: '#6b7280', label: s };
        return { ...col, nombre: svc?.nombre || s, id: s };
      }) || [];

      const CRM_TABS = [
        { id: 'info', label: 'Info', icon: ClipboardList },
        { id: 'timeline', label: 'Timeline', icon: Clock },
        { id: 'notas', label: 'Notas', icon: MessageSquare },
        { id: 'reuniones', label: 'Reuniones', icon: Users },
        { id: 'docs', label: 'Docs', icon: FileText },
        { id: 'propuestas', label: 'Propuestas', icon: Send },
      ];

      return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={onClose}>
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header - Clean minimal style */}
            <div className="px-6 pt-5 pb-4 border-b border-[#f0f0f0]">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-[#1a1a1a] tracking-tight">{p.empresa}</h2>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-sm text-[#666]">{p.ciudad}</span>
                    {p.industria && <span className="text-sm text-[#999]">·</span>}
                    {p.industria && <span className="text-sm text-[#666]">{p.industria}</span>}
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                      stageInfo?.color === '#2E7D32' ? 'bg-green-100 text-green-700' :
                      stageInfo?.color === '#7C3AED' ? 'bg-purple-100 text-purple-700' :
                      stageInfo?.color === '#00a8a8' ? 'bg-teal-100 text-teal-700' :
                      stageInfo?.color === '#F57C00' ? 'bg-orange-100 text-orange-700' :
                      stageInfo?.color === '#0D47A1' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>{stageInfo?.label || p.status}</span>
                  </div>
                </div>
                <button onClick={onClose} className="text-[#999] hover:text-[#333] p-1 -mr-1 -mt-1 transition-colors">
                  <X size={20} />
                </button>
              </div>

              {/* Tabs - Notion style */}
              <div className="flex gap-1 mt-5 border-b border-[#f0f0f0] -mx-6 px-6">
                {CRM_TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setDrawerTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-all relative ${
                      drawerTab === tab.id
                        ? 'text-[#1a1a1a]'
                        : 'text-[#999] hover:text-[#666]'
                    }`}
                  >
                    <tab.icon size={15} />
                    {tab.label}
                    {drawerTab === tab.id && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1a1a1a] rounded-full" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* CRM Components - shown based on tab */}
            <div className="flex-1 overflow-y-auto">
              {drawerTab === 'timeline' && (
                <div className="p-5">
                  <ProspectTimeline prospectId={realProspectId} />
                </div>
              )}
              {drawerTab === 'notas' && (
                <div className="p-5">
                  <ProspectNotes prospectId={realProspectId} />
                </div>
              )}
              {drawerTab === 'reuniones' && (
                <div className="p-5">
                  <ProspectMeetings prospectId={realProspectId} />
                </div>
              )}
              {drawerTab === 'docs' && (
                <div className="p-5">
                  <ProspectDocuments prospectId={realProspectId} />
                </div>
              )}
              {drawerTab === 'propuestas' && (
                <div className="p-5">
                  <ProspectProposals prospectId={realProspectId} />
                </div>
              )}

              {/* Info Tab - Original Content */}
              {drawerTab === 'info' && (
                <>
                  {/* REJECTION BANNER + FOLLOW-UP FORM */}
                  {p.status === 'Propuesta Rechazada' && (() => {
              const cat = classifyRechazo(p.motivoRechazo);
              const seg = prospectoSeguimiento[p.id];
              const urgency = getSeguimientoUrgency(seg);
              return (
                <div className="mx-5 mt-4 rounded-xl border-2 overflow-hidden" style={{ borderColor: cat?.color || '#EF4444' }}>
                  {/* Category Header */}
                  <div className="px-4 py-3 flex items-center justify-between" style={{ backgroundColor: cat?.bgColor || '#FEF2F2' }}>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${cat?.color}20` }}>
                        <XCircle size={16} style={{ color: cat?.color }} />
                      </div>
                      <div>
                        <div className="text-xs font-bold" style={{ color: cat?.color }}>{cat?.label || 'Rechazada'}</div>
                        <div className="text-[11px] text-[#6b7280] line-clamp-1">{p.motivoRechazo}</div>
                      </div>
                    </div>
                    {cat?.recoverable && (
                      <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-1 rounded-full flex-shrink-0">Recuperable</span>
                    )}
                  </div>

                  {/* Follow-up Form */}
                  <div className="px-4 py-3 bg-white space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#1c2c4a] mb-1">{cat?.followUpQuestion || 'Fecha de seguimiento'}</label>
                      <input type="date" value={seg?.fechaSeguimiento || ''}
                        onChange={(e) => guardarSeguimiento(p.id, { fechaSeguimiento: e.target.value })}
                        className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00a8a8]/30 focus:border-[#00a8a8]"
                        min={new Date().toISOString().split('T')[0]}
                      />
                      {urgency && (
                        <div className="mt-1 text-[10px] font-semibold" style={{ color: urgency.color }}>
                          {urgency.overdue ? `Vencido hace ${urgency.days} dias` : `Faltan ${urgency.days} dias`}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#1c2c4a] mb-1">Accion de seguimiento</label>
                      <input type="text" value={seg?.accion || ''}
                        onChange={(e) => guardarSeguimiento(p.id, { accion: e.target.value })}
                        placeholder="Ej: Revisar precios al vencer contrato"
                        className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00a8a8]/30 focus:border-[#00a8a8]"
                      />
                    </div>
                    {cat?.suggestedActions && (
                      <div>
                        <div className="text-[11px] font-semibold text-[#1c2c4a] mb-1.5">Acciones sugeridas</div>
                        <div className="space-y-1">
                          {cat.suggestedActions.map((accion, idx) => (
                            <button key={idx}
                              onClick={() => guardarSeguimiento(p.id, { accion })}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] border border-[#e5e7eb] hover:border-[#00a8a8] hover:bg-[#00a8a8]/5 transition-all flex items-center gap-2"
                            >
                              <ChevronRight size={10} className="text-[#00a8a8] flex-shrink-0" />
                              <span className="text-[#1c2c4a]">{accion}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Recovery state actions */}
                    {(() => {
                      const recovery = getRecoveryState(prospectoSeguimiento[p.id]);
                      return (
                        <div className="space-y-2 pt-1 border-t border-[#f3f4f6]">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-[#6b7280]">Estado:</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: recovery.bg, color: recovery.color }}>{recovery.label}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {recovery.id === 'sin_seguimiento' && seg?.fechaSeguimiento && null}
                            {recovery.id !== 're_contactada' && (
                              <button onClick={() => guardarSeguimiento(p.id, { recoveryStatus: 're_contactada' })}
                                className="px-3 py-2 rounded-lg bg-[#3B82F6]/10 text-[#3B82F6] text-xs font-semibold hover:bg-[#3B82F6]/20 transition-colors flex items-center justify-center gap-1.5 border border-[#3B82F6]/20">
                                <PhoneCall size={12} /> Marcar Re-contactada
                              </button>
                            )}
                            <button onClick={() => { changeProspectoStage(p.id, 'Lead nuevo'); guardarSeguimiento(p.id, { recoveryStatus: null, fechaSeguimiento: null }); }}
                              className="px-3 py-2 rounded-lg bg-[#00a8a8] text-white text-xs font-semibold hover:bg-[#008080] transition-colors flex items-center justify-center gap-1.5">
                              <RotateCcw size={12} /> Reactivar en Pipeline
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })()}

            <div className="p-5 space-y-5">
              {/* Value + date row */}
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-[#EFF6FF] rounded-xl p-3 text-center">
                  <div className="text-xs text-[#6b7280] mb-0.5">Valor estimado</div>
                  <div className="text-xl font-bold text-[#0D47A1]">{valor > 0 ? `$${(valor / 1000).toFixed(0)}K` : '—'}</div>
                </div>
                <div className="flex-1 bg-[#f3f4f6] rounded-xl p-3 text-center">
                  <div className="text-xs text-[#6b7280] mb-0.5">Días en pipeline</div>
                  <div className="text-xl font-bold text-[#1c2c4a]">{dias !== null ? dias : '—'}</div>
                </div>
                {p.propuesta?.status && (
                  <div className={`flex-1 rounded-xl p-3 text-center ${
                    p.propuesta.status === 'Aceptada' ? 'bg-green-50' : p.propuesta.status === 'Rechazada' ? 'bg-red-50' : 'bg-gray-50'
                  }`}>
                    <div className="text-xs text-[#6b7280] mb-0.5">Propuesta</div>
                    <div className={`text-sm font-bold ${
                      p.propuesta.status === 'Aceptada' ? 'text-green-700' : p.propuesta.status === 'Rechazada' ? 'text-red-600' : 'text-gray-600'
                    }`}>{p.propuesta.status}</div>
                  </div>
                )}
              </div>

              {/* Contact section */}
              {p.contacto?.nombre && (
                <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
                  <div className="px-4 py-3 bg-[#f9fafb] border-b border-[#e5e7eb]">
                    <h3 className="text-sm font-semibold text-[#1c2c4a] flex items-center gap-2"><Users size={14} /> Contacto</h3>
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <div className="text-sm font-semibold text-[#1c2c4a]">{p.contacto.nombre}</div>
                      {p.contacto.puesto && <div className="text-xs text-[#6b7280]">{p.contacto.puesto}</div>}
                    </div>
                    {/* Quick actions */}
                    <div className="flex flex-wrap gap-2">
                      {p.contacto.telefono && (
                        <a href={`tel:${p.contacto.telefono}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 transition-colors">
                          <Phone size={12} /> Llamar
                        </a>
                      )}
                      {p.contacto.telefono && (
                        <a href={`https://wa.me/52${p.contacto.telefono.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 transition-colors">
                          <MessageSquare size={12} /> WhatsApp
                        </a>
                      )}
                      {p.contacto.correo && (
                        <a href={`mailto:${p.contacto.correo}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors">
                          <Mail size={12} /> Email
                        </a>
                      )}
                    </div>
                    {/* Contact details with copy */}
                    {p.contacto.correo && (
                      <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-2 text-sm text-[#6b7280]">
                          <Mail size={13} className="text-[#9ca3af]" />
                          <span>{p.contacto.correo}</span>
                        </div>
                        <button onClick={() => copyToClipboard(p.contacto.correo, 'correo')} className="opacity-0 group-hover:opacity-100 text-[#9ca3af] hover:text-[#00a8a8] transition-all p-1">
                          {copiedField === 'correo' ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
                        </button>
                      </div>
                    )}
                    {p.contacto.telefono && (
                      <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-2 text-sm text-[#6b7280]">
                          <Phone size={13} className="text-[#9ca3af]" />
                          <span>{p.contacto.telefono}</span>
                        </div>
                        <button onClick={() => copyToClipboard(p.contacto.telefono, 'telefono')} className="opacity-0 group-hover:opacity-100 text-[#9ca3af] hover:text-[#00a8a8] transition-all p-1">
                          {copiedField === 'telefono' ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Services */}
              {sc.length > 0 && (
                <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
                  <div className="px-4 py-3 bg-[#f9fafb] border-b border-[#e5e7eb]">
                    <h3 className="text-sm font-semibold text-[#1c2c4a] flex items-center gap-2"><Package size={14} /> Servicios</h3>
                  </div>
                  <div className="p-4 flex flex-wrap gap-2">
                    {sc.map(s => (
                      <span key={s.id} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ backgroundColor: s.bg, color: s.text, border: `1px solid ${s.border || s.text}20` }}>
                        {s.nombre}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Stage change */}
              <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
                <div className="px-4 py-3 bg-[#f9fafb] border-b border-[#e5e7eb]">
                  <h3 className="text-sm font-semibold text-[#1c2c4a] flex items-center gap-2"><Target size={14} /> Cambiar Etapa</h3>
                </div>
                <div className="p-4">
                  <div className="flex flex-wrap gap-2">
                    {KANBAN_STAGES.map(stage => (
                      <button
                        key={stage.id}
                        onClick={() => changeProspectoStage(p.id, stage.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          p.status === stage.id
                            ? 'ring-2 ring-offset-1 shadow-sm'
                            : 'opacity-60 hover:opacity-100'
                        }`}
                        style={{
                          backgroundColor: p.status === stage.id ? stage.color + '15' : '#f9fafb',
                          borderColor: p.status === stage.id ? stage.color : '#e5e7eb',
                          color: p.status === stage.id ? stage.color : '#6b7280',
                          ringColor: p.status === stage.id ? stage.color : undefined,
                        }}
                      >
                        {stage.label}
                      </button>
                    ))}
                    <button
                      onClick={() => changeProspectoStage(p.id, 'Propuesta Rechazada')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        p.status === 'Propuesta Rechazada'
                          ? 'bg-red-50 border-red-300 text-red-600 ring-2 ring-red-200 ring-offset-1 shadow-sm'
                          : 'bg-[#f9fafb] border-[#e5e7eb] text-[#6b7280] opacity-60 hover:opacity-100'
                      }`}
                    >
                      Rechazada
                    </button>
                  </div>
                </div>
              </div>

              {/* Additional info */}
              {(p.volumenEstimado || p.siguientePaso || p.motivoRechazo || p.propuesta) && (
                <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
                  <div className="px-4 py-3 bg-[#f9fafb] border-b border-[#e5e7eb]">
                    <h3 className="text-sm font-semibold text-[#1c2c4a] flex items-center gap-2"><ClipboardList size={14} /> Detalles</h3>
                  </div>
                  <div className="p-4 space-y-2.5">
                    {p.volumenEstimado && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#6b7280]">Volumen estimado</span>
                        <span className="font-medium text-[#1c2c4a]">{p.volumenEstimado}</span>
                      </div>
                    )}
                    {p.propuesta?.ventaMensual && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#6b7280]">Venta mensual</span>
                        <span className="font-medium text-[#1c2c4a]">${(p.propuesta.ventaMensual / 1000).toFixed(0)}K</span>
                      </div>
                    )}
                    {p.propuesta?.ventaTotal && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#6b7280]">Venta total (contrato)</span>
                        <span className="font-bold text-[#0D47A1]">${(p.propuesta.ventaTotal / 1000).toFixed(0)}K</span>
                      </div>
                    )}
                    {p.siguientePaso && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#6b7280]">Siguiente paso</span>
                        <span className="font-medium text-[#00a8a8]">{p.siguientePaso}</span>
                      </div>
                    )}
                    {p.motivoRechazo && (() => {
                      const cat = classifyRechazo(p.motivoRechazo);
                      return (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-[#6b7280]">Motivo rechazo</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${cat?.color}15`, color: cat?.color }}>{cat?.label}</span>
                            <span className="font-medium text-sm truncate max-w-[200px]" style={{ color: cat?.color }}>{p.motivoRechazo}</span>
                          </div>
                        </div>
                      );
                    })()}
                    {p.fecha && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#6b7280]">Fecha</span>
                        <span className="font-medium text-[#1c2c4a]">{p.fecha}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* NOTAS per-prospecto */}
              <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
                <div className="px-4 py-3 bg-[#f9fafb] border-b border-[#e5e7eb]">
                  <h3 className="text-sm font-semibold text-[#1c2c4a] flex items-center gap-2">
                    <MessageSquare size={14} /> Notas
                    {(prospectoNotas[p.id]?.length > 0) && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#e5e7eb] text-[#6b7280]">{prospectoNotas[p.id].length}</span>
                    )}
                  </h3>
                </div>
                <div className="p-4 space-y-3">
                  {/* Input nueva nota */}
                  <div className="flex gap-2">
                    <textarea
                      value={prospectoNuevaNota}
                      onChange={(e) => setProspectoNuevaNota(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); agregarNota(); }}}
                      placeholder="Escribe una nota... (Enter para guardar)"
                      className="flex-1 border border-[#e5e7eb] rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#00a8a8]/30 focus:border-[#00a8a8]"
                      rows={1}
                    />
                    <button
                      onClick={agregarNota}
                      disabled={!prospectoNuevaNota.trim()}
                      className="self-end px-3 py-2 bg-[#00a8a8] hover:bg-[#008080] disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      <Send size={14} />
                    </button>
                  </div>
                  {/* Lista de notas */}
                  {(prospectoNotas[p.id]?.length > 0) ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {[...(prospectoNotas[p.id] || [])].reverse().map(nota => (
                        <div key={nota.id} className="bg-[#f9fafb] rounded-lg p-3 group">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm text-[#1c2c4a] flex-1 whitespace-pre-wrap">{nota.text}</p>
                            <button
                              onClick={() => eliminarNota(nota.id)}
                              className="opacity-0 group-hover:opacity-100 text-[#6b7280] hover:text-red-500 transition-all flex-shrink-0 mt-0.5"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                          <div className="flex items-center gap-1 mt-1.5 text-[10px] text-[#9ca3af]">
                            <Clock size={9} />
                            {timeAgo(nota.date) || 'ahora'}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#9ca3af] text-center py-2">Agrega una nota...</p>
                  )}
                </div>
              </div>

              {/* ARCHIVOS per-prospecto */}
              {(() => {
                const drawerFileRef = React.createRef();
                return (
                  <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
                    <div className="px-4 py-3 bg-[#f9fafb] border-b border-[#e5e7eb]">
                      <h3 className="text-sm font-semibold text-[#1c2c4a] flex items-center gap-2">
                        <Paperclip size={14} /> Archivos
                        {(prospectoArchivos[p.id]?.length > 0) && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#e5e7eb] text-[#6b7280]">{prospectoArchivos[p.id].length}</span>
                        )}
                      </h3>
                    </div>
                    <div className="p-4 space-y-3">
                      {/* Upload zone */}
                      <div
                        className="border border-dashed border-[#d1d5db] hover:border-[#00a8a8] rounded-lg p-3 text-center transition-colors cursor-pointer"
                        onClick={() => drawerFileRef.current?.click()}
                      >
                        <input
                          type="file"
                          ref={drawerFileRef}
                          className="hidden"
                          multiple
                          accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.xlsx,.xls,.csv,.doc,.docx"
                          onChange={handleFileUpload}
                        />
                        <Upload size={16} className="text-[#d1d5db] mx-auto mb-1" />
                        <p className="text-xs text-[#6b7280]">Click para subir archivos</p>
                      </div>
                      {/* File list */}
                      {(prospectoArchivos[p.id]?.length > 0) ? (
                        <div className="space-y-1.5 max-h-40 overflow-y-auto">
                          {[...(prospectoArchivos[p.id] || [])].reverse().map(archivo => (
                            <div key={archivo.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-[#f9fafb] group transition-colors">
                              <div className="w-7 h-7 rounded-md bg-[#f3f4f6] flex items-center justify-center flex-shrink-0">
                                {getFileIcon(archivo.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium text-[#1c2c4a] truncate">{archivo.name}</div>
                                <div className="text-[10px] text-[#9ca3af]">{formatFileSize(archivo.size)} · {archivo.date}</div>
                              </div>
                              <button
                                onClick={() => eliminarArchivo(archivo.id)}
                                className="opacity-0 group-hover:opacity-100 text-[#6b7280] hover:text-red-500 transition-all"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-[#9ca3af] text-center py-2">Sube un archivo...</p>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </>)}
            </div>
          </div>
        </div>
      );
    };

    return (
    <div className="p-4 md:p-6 lg:p-8 bg-[#faf7f2] min-h-screen">
      <div className="max-w-[1400px] mx-auto">

      {/* BACK + HEADER */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => { setHubEjecutivo(null); setCurrentView('dashboard'); }}
          className="flex items-center justify-center w-9 h-9 rounded-lg bg-white border border-[#e5e7eb] hover:bg-[#f3f4f6] transition-colors"
        >
          <ArrowLeft size={18} className="text-[#6b7280]" />
        </button>
        <ExecutiveAvatar codigo={member.codigo} name={member.name} size="xl" />
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-[#1c2c4a]">{member.name}</h1>
          <p className="text-sm text-[#6b7280]">{member.role} — {member.zona}</p>
        </div>
        <div className="text-right hidden md:block">
          <div className="text-sm text-[#6b7280]">Pipeline Total</div>
          <div className="text-xl font-bold text-[#0D47A1]">${(totalPipeline / 1000000).toFixed(1)}M</div>
        </div>
      </div>

      {/* KPI ROW — funnel de conversión */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-5">
        <div className="bg-white rounded-xl border border-[#e5e7eb] p-3 text-center">
          <div className="text-2xl font-bold text-[#6b7280]">{memberLeads.length}</div>
          <div className="text-xs text-[#6b7280] mt-0.5">Leads</div>
        </div>
        <div className="bg-white rounded-xl border border-[#e5e7eb] p-3 text-center">
          <div className="text-2xl font-bold text-[#00a8a8]">{memberProspectosActivos.length}</div>
          <div className="text-xs text-[#6b7280] mt-0.5">Prospectos</div>
        </div>
        <div className="bg-white rounded-xl border border-[#e5e7eb] p-3 text-center">
          <div className="text-2xl font-bold text-[#7C3AED]">{memberPropuestas.length}</div>
          <div className="text-xs text-[#6b7280] mt-0.5">Propuestas</div>
        </div>
        <div className="bg-white rounded-xl border border-[#e5e7eb] p-3 text-center">
          <div className="text-2xl font-bold text-[#2E7D32]">{memberGanados.length}</div>
          <div className="text-xs text-[#6b7280] mt-0.5">Cierres</div>
        </div>
        {memberRechazados.length > 0 && (() => {
          const vencidos = memberRechazados.filter(p => getSeguimientoUrgency(prospectoSeguimiento[p.id])?.overdue).length;
          const conSeg = memberRechazados.filter(p => prospectoSeguimiento[p.id]?.fechaSeguimiento).length;
          return (
            <div className={`bg-white rounded-xl border p-3 text-center ${vencidos > 0 ? 'border-red-300' : 'border-[#e5e7eb]'}`}>
              <div className="flex items-center justify-center gap-1">
                <div className="text-2xl font-bold" style={{ color: vencidos > 0 ? '#EF4444' : '#F59E0B' }}>{memberRechazados.length}</div>
                {vencidos > 0 && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
              </div>
              <div className="text-xs text-[#6b7280] mt-0.5">Rechazadas</div>
              <div className="text-[9px] text-[#9ca3af] mt-0.5">{conSeg} con seguimiento</div>
            </div>
          );
        })()}
        {member.presupuestoAnual2026 > 0 && (
          <div className="bg-white rounded-xl border border-[#e5e7eb] p-3 text-center">
            <div className="text-2xl font-bold" style={{ color: member.cumplimientoPresupuesto >= 70 ? '#2E7D32' : member.cumplimientoPresupuesto >= 40 ? '#F57C00' : '#DC2626' }}>
              {member.cumplimientoPresupuesto}%
            </div>
            <div className="text-xs text-[#6b7280] mt-0.5">Presupuesto</div>
            <div className="w-full h-1.5 bg-[#e5e7eb] rounded-full overflow-hidden mt-1.5">
              <div className="h-full rounded-full transition-all duration-500" style={{
                width: `${Math.min(member.cumplimientoPresupuesto, 100)}%`,
                backgroundColor: member.cumplimientoPresupuesto >= 70 ? '#2E7D32' : member.cumplimientoPresupuesto >= 40 ? '#F57C00' : '#DC2626',
              }} />
            </div>
          </div>
        )}
      </div>

      {/* PIPELINE — Kanban personal del ejecutivo */}
        <div className="space-y-4">
          {/* Quick summary bar */}
          <div className="flex items-center gap-4 text-xs">
            <span className="text-[#6b7280]"><strong className="text-[#1c2c4a]">{memberProspectos.filter(p => p.status !== 'Propuesta Rechazada').length}</strong> prospectos</span>
            <span className="text-[#6b7280]"><strong className="text-[#0D47A1]">${(totalPipeline / 1000000).toFixed(1)}M</strong> pipeline</span>
            {memberRechazados.length > 0 && <span className="text-red-500"><strong>{memberRechazados.length}</strong> rechazadas</span>}
            <div className="flex items-center gap-2 ml-auto">
              {HUB_KANBAN_STAGES.map(s => {
                const c = memberProspectos.filter(p => p.status === s.id).length;
                return c > 0 ? (
                  <div key={s.id} className="flex items-center gap-1 text-[10px]">
                    <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: s.color }} />
                    <span className="text-[#6b7280]">{s.label}</span>
                    <span className="font-bold text-[#1c2c4a]">{c}</span>
                  </div>
                ) : null;
              })}
            </div>
          </div>

          {/* KANBAN GRID */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={hubHandleDragStart}
            onDragEnd={hubHandleDragEnd}
          >
            <div className="grid grid-cols-6 gap-2">
              {HUB_KANBAN_STAGES.map(stage => {
                const stageItems = memberProspectos.filter(p => p.status === stage.id);
                const stageValue = stageItems.reduce((s, p) => s + (p.propuesta?.ventaTotal || p.facturacionEstimada || 0), 0);
                const gate = STAGE_GATES[stage.id];

                return (
                  <div key={stage.id} className="flex flex-col">
                    {/* Column Header */}
                    <div className="rounded-t-lg p-2.5 mb-1.5" style={{ borderTop: `3px solid ${stage.color}` }}>
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-xs font-semibold text-[#1c2c4a]">{stage.label}</h3>
                          <span className="text-[10px] bg-[#f3f4f6] text-[#6b7280] px-1.5 py-0.5 rounded-full font-medium">{stageItems.length}</span>
                        </div>
                        {gate && <Lock size={10} className="text-[#9ca3af]" />}
                      </div>
                      {stageValue > 0 && <div className="text-[10px] text-[#6b7280]">${(stageValue / 1000000).toFixed(1)}M</div>}
                    </div>

                    {/* Droppable Area */}
                    {(() => {
                      const { isOver, setNodeRef } = useDroppable({ id: `hub-${stage.id}`, data: { stageId: stage.id } });
                      return (
                        <div
                          ref={setNodeRef}
                          className={`min-h-[120px] transition-colors rounded-lg flex-1 ${isOver ? 'bg-[#00a8a8]/5 ring-2 ring-[#00a8a8]/30' : ''}`}
                        >
                          <SortableContext items={stageItems.map(p => p.id)} strategy={verticalListSortingStrategy}>
                            <div className="space-y-0">
                              {stageItems.map(prospecto => {
                                const { attributes, listeners, setNodeRef: cardRef, transform, transition, isDragging } = useSortable({
                                  id: prospecto.id,
                                  data: { type: 'card', prospecto },
                                });
                                const valor = prospecto.propuesta?.ventaTotal || prospecto.facturacionEstimada || 0;
                                const primaryService = (prospecto.servicios || [])[0] || 'rme';
                                const svc = SERVICE_COLORS[primaryService] || SERVICE_COLORS.rme;
                                return (
                                  <div
                                    key={prospecto.id}
                                    ref={cardRef}
                                    style={{
                                      transform: CSS.Transform.toString(transform),
                                      transition,
                                      opacity: isDragging ? 0.5 : 1,
                                      backgroundColor: svc.bg,
                                      borderLeft: `3px solid ${svc.border}`,
                                    }}
                                    {...attributes}
                                    {...listeners}
                                    className="rounded-lg p-1.5 mb-1 cursor-grab active:cursor-grabbing hover:shadow-md transition-all"
                                    onClick={(e) => { if (!isDragging) { e.stopPropagation(); setSelectedProspecto(prospecto); setMostrarDetallesProspecto(true); } }}
                                  >
                                    <div className="flex items-center justify-between gap-1 mb-0.5">
                                      <h4 className="text-[12px] font-semibold text-[#1c2c4a] truncate leading-tight flex-1 min-w-0">{prospecto.empresa}</h4>
                                      <span className="text-[8px] font-bold px-1 py-px rounded-full whitespace-nowrap flex-shrink-0" style={{ backgroundColor: `${svc.border}18`, color: svc.text }}>{svc.label}</span>
                                    </div>
                                    {(() => {
                                      const fechaRef = estimarFechaProspecto(prospecto);
                                      return (
                                        <div className="flex items-center justify-between text-[10px] text-[#9ca3af]">
                                          <div className="flex items-center gap-1">
                                            {prospecto.ciudad && <span className="truncate max-w-[50px]">{prospecto.ciudad.split(',')[0]}</span>}
                                            <span className="font-semibold px-1 py-px rounded text-[8px]" style={{ color: urgencyColor(fechaRef), backgroundColor: `${urgencyColor(fechaRef)}12` }}>
                                              {timeAgo(fechaRef)}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-1 flex-shrink-0">
                                            {(prospectoNotas[prospecto.id]?.length > 0) && <span className="flex items-center gap-0.5 text-[#9ca3af]"><MessageSquare size={8} />{prospectoNotas[prospecto.id].length}</span>}
                                            {(prospectoArchivos[prospecto.id]?.length > 0) && <span className="flex items-center gap-0.5 text-[#9ca3af]"><Paperclip size={8} />{prospectoArchivos[prospecto.id].length}</span>}
                                          </div>
                                          {valor > 0 && <span className="font-bold text-[#0D47A1]">${(valor / 1000000).toFixed(1)}M</span>}
                                        </div>
                                      );
                                    })()}
                                    {(() => {
                                      const campos = calcularCamposCompletos(prospecto);
                                      const completos = campos.filter(c => c.ok).length;
                                      const total = campos.length;
                                      const pct = (completos / total) * 100;
                                      const barColor = completos === total ? '#2E7D32' : pct >= 60 ? '#F57C00' : '#ef4444';
                                      return (
                                        <div className="mt-1">
                                          <div className="w-full h-[2px] bg-black/[0.04] rounded-full overflow-hidden">
                                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                );
                              })}
                            </div>
                          </SortableContext>
                          {stageItems.length === 0 && (
                            <div className="flex items-center justify-center h-16 border-2 border-dashed border-[#e5e7eb] rounded-lg text-[10px] text-[#9ca3af]">
                              Arrastra aquí
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>

            {/* Drag Overlay */}
            <DragOverlay>
              {hubActiveCard && (
                <div className="bg-white rounded-lg border-2 border-[#00a8a8] p-2 shadow-xl w-[160px] rotate-2">
                  <h4 className="text-xs font-semibold text-[#1c2c4a] truncate">{hubActiveCard.empresa}</h4>
                  <div className="text-[10px] text-[#6b7280] mt-0.5">{hubActiveCard.ciudad?.split(',')[0]}</div>
                </div>
              )}
            </DragOverlay>
          </DndContext>

          {/* Rejected section — Call to Action */}
          {memberRechazados.length > 0 && (
            <div className="bg-white rounded-lg border border-[#e5e7eb] p-3">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold text-[#1c2c4a] flex items-center gap-1.5">
                  <AlertCircle size={12} className="text-[#F59E0B]" />
                  Oportunidades Rechazadas ({memberRechazados.length})
                </h4>
                {(() => {
                  const conSeg = memberRechazados.filter(p => prospectoSeguimiento[p.id]?.fechaSeguimiento).length;
                  const vencidos = memberRechazados.filter(p => getSeguimientoUrgency(prospectoSeguimiento[p.id])?.overdue).length;
                  return (
                    <div className="flex items-center gap-2 text-[10px]">
                      {vencidos > 0 && <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded-full font-bold animate-pulse">{vencidos} vencido{vencidos > 1 ? 's' : ''}</span>}
                      <span className="text-[#6b7280]">{conSeg}/{memberRechazados.length} con seguimiento</span>
                    </div>
                  );
                })()}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {memberRechazados.map(p => {
                  const cat = classifyRechazo(p.motivoRechazo);
                  const seg = prospectoSeguimiento[p.id];
                  const urgency = getSeguimientoUrgency(seg);
                  return (
                    <div key={p.id}
                      className="rounded-lg p-2.5 cursor-pointer hover:shadow-md transition-all border"
                      style={{ backgroundColor: cat?.bgColor || '#f3f4f6', borderColor: `${cat?.color}30` || '#e5e7eb', borderLeft: `3px solid ${cat?.color || '#6b7280'}` }}
                      onClick={() => { setSelectedProspecto(p); setMostrarDetallesProspecto(true); }}
                    >
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h4 className="text-[11px] font-semibold text-[#1c2c4a] truncate flex-1">{p.empresa}</h4>
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap" style={{ backgroundColor: `${cat?.color}18`, color: cat?.color }}>{cat?.label}</span>
                      </div>
                      <div className="text-[10px] text-[#6b7280] truncate mb-1.5">{p.motivoRechazo || 'Sin motivo'}</div>
                      <div className="flex items-center justify-between">
                        {seg?.fechaSeguimiento ? (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-1" style={{ backgroundColor: urgency?.bg, color: urgency?.color }}>
                            <Calendar size={8} />
                            {urgency?.overdue ? `Vencido ${urgency.days}d` : urgency?.label}
                          </span>
                        ) : (
                          <span className="text-[9px] text-[#F59E0B] font-medium flex items-center gap-1 opacity-70">
                            <Bell size={8} /> Sin seguimiento
                          </span>
                        )}
                        {cat?.recoverable && <span className="text-[8px] text-green-600 font-medium bg-green-50 px-1 py-0.5 rounded">Recuperable</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty state */}
          {memberProspectos.length === 0 && (
            <div className="bg-white rounded-xl border border-[#e5e7eb] p-8 text-center">
              <Target size={32} className="text-[#d1d5db] mx-auto mb-2" />
              <p className="text-sm text-[#6b7280]">Este ejecutivo aún no tiene prospectos asignados.</p>
            </div>
          )}
        </div>

      {/* PROSPECT DETAIL DRAWER */}
      {selectedProspecto && <ProspectoDrawer prospecto={selectedProspecto} onClose={() => setSelectedProspecto(null)} />}

      </div>
    </div>
    );
  };

  // VISTA: COMERCIAL - Pipeline + Prospectos + KPIs del Equipo
  const PipelineComercialView = () => {
    const weightedPipeline = calcularWeightedPipeline(kanbanProspectos);
    const winRate = calcularWinRate(kanbanProspectos);
    const velocity = calcularPipelineVelocity(kanbanProspectos);
    const oportunidadesActivas = kanbanProspectos.filter(p => !['Propuesta Rechazada', 'Inicio de operación'].includes(p.status)).length;
    const presupuestoTotal = salesTeamData.reduce((s, m) => s + (m.presupuestoAnual2026 || 0), 0);
    const ventasReales = salesTeamData.reduce((s, m) => s + (m.ventasReales || 0), 0);

    // Métricas de Vero
    const presupuestoMesEquipo = salesTeamData.reduce((s, m) => s + (m.presupuestoMensual || 0), 0);
    const proyeccionCierre = kanbanProspectos
      .filter(p => ['Propuesta enviada', 'Negociación'].includes(p.status))
      .reduce((s, p) => s + ((p.propuesta?.ventaTotal || p.facturacionEstimada || 0) * (STAGE_PROBABILITY[p.status] || 0)), 0);
    const levantamientosActivos = kanbanProspectos.filter(p => p.status === 'Levantamiento');
    const propuestasEnviadas = kanbanProspectos.filter(p => p.status === 'Propuesta enviada');
    const montoPropuestas = propuestasEnviadas.reduce((s, p) => s + (p.propuesta?.ventaTotal || p.facturacionEstimada || 0), 0);
    const biodigestores = kanbanProspectos.filter(p => (p.servicios || []).includes('biodigestores'));
    const biodigestoresPropuesta = biodigestores.filter(p => ['Propuesta enviada', 'Negociación'].includes(p.status));
    const montoBiodigestores = biodigestores.reduce((s, p) => s + (p.propuesta?.ventaTotal || p.facturacionEstimada || 0), 0);

    // Tracking de Materiales (Cartón y Playo)
    const materialData = kanbanProspectos
      .filter(p => p.propuesta?.carton || p.propuesta?.playo)
      .map(p => ({
        empresa: p.empresa,
        ejecutivo: p.ejecutivo,
        status: p.status,
        carton: p.propuesta?.carton || 0,
        playo: p.propuesta?.playo || 0,
        total: (p.propuesta?.carton || 0) + (p.propuesta?.playo || 0),
      }));
    const totalCarton = materialData.reduce((s, m) => s + m.carton, 0);
    const totalPlayo = materialData.reduce((s, m) => s + m.playo, 0);
    const materialByStage = Object.entries(
      materialData.reduce((acc, m) => {
        const st = m.status || 'Sin etapa';
        acc[st] = acc[st] || { carton: 0, playo: 0 };
        acc[st].carton += m.carton;
        acc[st].playo += m.playo;
        return acc;
      }, {})
    ).map(([stage, vals]) => ({ stage: stage.length > 15 ? stage.slice(0, 14) + '…' : stage, ...vals }));

    // Droppable Column component
    const DroppableColumn = ({ stageId, children }) => {
      const { isOver, setNodeRef } = useDroppable({ id: stageId });
      return (
        <div
          ref={setNodeRef}
          className={`min-h-[200px] transition-colors rounded-lg ${isOver ? 'bg-[#00a8a8]/5 ring-2 ring-[#00a8a8]/30' : ''}`}
        >
          {children}
        </div>
      );
    };

    // Draggable Card component — color-coded by service type
    const DraggableCard = ({ prospecto }) => {
      const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: prospecto.id,
        data: { type: 'card', prospecto },
      });
      const valor = prospecto.propuesta?.ventaTotal || prospecto.facturacionEstimada || 0;
      const primaryService = (prospecto.servicios || [])[0] || 'rme';
      const svc = SERVICE_COLORS[primaryService] || SERVICE_COLORS.rme;
      const cardStyle = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        backgroundColor: svc.bg,
        borderLeft: `3px solid ${svc.border}`,
      };

      return (
        <div
          ref={setNodeRef}
          style={cardStyle}
          {...attributes}
          {...listeners}
          className="rounded-lg p-1.5 mb-1 cursor-grab active:cursor-grabbing hover:shadow-md transition-all group"
          onClick={(e) => {
            if (!isDragging) {
              e.stopPropagation();
              setSelectedProspecto(prospecto);
              setMostrarDetallesProspecto(true);
            }
          }}
        >
          {/* Row 1: Company + value + badge */}
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <h4 className="text-[12px] font-semibold text-[#1c2c4a] truncate leading-tight flex-1 min-w-0">{prospecto.empresa}</h4>
            <div className="flex items-center gap-1 flex-shrink-0">
              {valor > 0 && <span className="text-[10px] font-bold text-[#0D47A1]">${(valor / 1000000).toFixed(1)}M</span>}
              <span
                className="text-[8px] font-bold px-1 py-px rounded-full whitespace-nowrap"
                style={{ backgroundColor: `${svc.border}18`, color: svc.text }}
              >
                {svc.label}
              </span>
            </div>
          </div>
          {/* Row 2: Ejecutivo code + time indicator + city */}
          {(() => {
            const fechaRef = estimarFechaProspecto(prospecto);
            return (
              <div className="flex items-center justify-between text-[10px] text-[#9ca3af]">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium">{prospecto.ejecutivo}</span>
                  <span className="font-semibold px-1 py-px rounded text-[8px]" style={{ color: urgencyColor(fechaRef), backgroundColor: `${urgencyColor(fechaRef)}12` }}>
                    {timeAgo(fechaRef)}
                  </span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {(prospectoNotas[prospecto.id]?.length > 0) && <span className="flex items-center gap-0.5"><MessageSquare size={8} />{prospectoNotas[prospecto.id].length}</span>}
                  {(prospectoArchivos[prospecto.id]?.length > 0) && <span className="flex items-center gap-0.5"><Paperclip size={8} />{prospectoArchivos[prospecto.id].length}</span>}
                </div>
                {prospecto.ciudad && <span className="truncate max-w-[80px]">{prospecto.ciudad.split(',')[0]}</span>}
              </div>
            );
          })()}
          {/* Progress micro-bar */}
          {(() => {
            const campos = calcularCamposCompletos(prospecto);
            const completos = campos.filter(c => c.ok).length;
            const total = campos.length;
            const pct = (completos / total) * 100;
            const barColor = completos === total ? '#2E7D32' : pct >= 60 ? '#F57C00' : '#ef4444';
            return (
              <div className="mt-1">
                <div className="w-full h-[2px] bg-black/[0.04] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: barColor }}></div>
                </div>
              </div>
            );
          })()}
        </div>
      );
    };

    // Funnel data for @nivo/funnel
    const funnelData = KANBAN_STAGES.map(stage => {
      const items = kanbanProspectos.filter(p => p.status === stage.id);
      const valor = items.reduce((s, p) => s + (p.propuesta?.ventaTotal || p.facturacionEstimada || 0), 0);
      return {
        id: stage.id,
        value: items.length || 0,
        label: `${stage.label} (${items.length})`,
      };
    }).filter(d => d.value > 0);

    // Bar chart data for stage comparison
    const barData = KANBAN_STAGES.map(stage => {
      const items = kanbanProspectos.filter(p => p.status === stage.id);
      const valor = items.reduce((s, p) => s + (p.propuesta?.ventaTotal || p.facturacionEstimada || 0), 0);
      return {
        stage: stage.label,
        Cantidad: items.length,
        'Valor ($M)': parseFloat((valor / 1000000).toFixed(2)),
        color: stage.color,
      };
    });

    const activeCard = activeKanbanId ? kanbanProspectos.find(p => p.id === activeKanbanId) : null;

    return (
    <div className="p-4 md:p-6 lg:p-8 bg-[#faf7f2] min-h-screen">
      <div className="max-w-[1400px] mx-auto">

        {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#1c2c4a]">{userGreeting}, {currentUserName}</h1>
          <p className="text-sm text-[#6b7280] mt-0.5">Tu pipeline comercial al momento</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNuevoLead(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#1c2c4a] hover:bg-[#1c2c4a]/90 text-white rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-md"
          >
            <Plus size={16} />
            Nuevo Lead
          </button>
          <button
            onClick={() => { setKpiPanelArea('comercial'); setShowKpiPanel(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#00a8a8] hover:bg-[#008080] text-white rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-md"
          >
            <Target size={16} />
            KPIs del Equipo
          </button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {/* Card 1: Presupuesto Mes vs Proyección de Cierre */}
        <div className="rounded-xl border border-[#00a8a8]/10 card-modern p-5" style={{ backgroundColor: 'rgba(0,168,168,0.04)' }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[13px] font-medium text-[#6b7280] mb-1">Presupuesto Mes</div>
              <div className="text-2xl font-bold text-[#1c2c4a]">${(presupuestoMesEquipo / 1000000).toFixed(1)}M</div>
              <div className="text-xs text-[#6b7280] mt-1">
                Cierre: <span className="font-semibold text-[#00a8a8]">${(montoPropuestas / 1000000).toFixed(1)}M</span>
                {presupuestoMesEquipo > 0 && (
                  <span className={`ml-1.5 font-semibold ${(montoPropuestas / presupuestoMesEquipo) >= 1 ? 'text-[#2E7D32]' : 'text-[#F57C00]'}`}>
                    ({Math.round((montoPropuestas / presupuestoMesEquipo) * 100)}%)
                  </span>
                )}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#00a8a8]/10 flex items-center justify-center">
              <DollarSign className="text-[#00a8a8]" size={20} />
            </div>
          </div>
        </div>
        {/* Card 2: Levantamientos Activos */}
        <div className="bg-white rounded-xl border border-[#e5e7eb] card-modern p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[13px] font-medium text-[#6b7280] mb-1">Levantamientos Activos</div>
              <div className="text-2xl font-bold text-[#1c2c4a]">{levantamientosActivos.length}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#0D47A1]/10 flex items-center justify-center">
              <ClipboardList className="text-[#0D47A1]" size={20} />
            </div>
          </div>
        </div>
        {/* Card 3: Propuestas Enviadas */}
        <div className="rounded-xl border border-[#2E7D32]/10 card-modern p-5" style={{ backgroundColor: 'rgba(46,125,50,0.04)' }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[13px] font-medium text-[#6b7280] mb-1">Propuestas Enviadas</div>
              <div className="text-2xl font-bold text-[#1c2c4a]">{propuestasEnviadas.length}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#2E7D32]/10 flex items-center justify-center">
              <FileText className="text-[#2E7D32]" size={20} />
            </div>
          </div>
        </div>
        {/* Card 4: Cierre Biodigestores */}
        <div className="bg-white rounded-xl border border-[#e5e7eb] card-modern p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[13px] font-medium text-[#6b7280] mb-1">Cierre Biodigestores</div>
              <div className="text-2xl font-bold text-[#1c2c4a]">{biodigestores.length}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#F57C00]/10 flex items-center justify-center">
              <Recycle className="text-[#F57C00]" size={20} />
            </div>
          </div>
        </div>
      </div>

      <SectionHeader color="#00a8a8" icon={Users} label="Equipo" linkLabel="Ver Dashboard" onLinkClick={() => setCurrentView('dashboard')} />

      {/* Presupuesto por Ejecutivo (grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {salesTeamData.filter(m => m.codigo !== 'VA').sort((a, b) => b.presupuestoAnual2026 - a.presupuestoAnual2026).map(member => {
          const pct = member.cumplimientoPresupuesto || 0;
          const barColor = pct >= 80 ? '#2E7D32' : pct >= 40 ? '#F57C00' : '#ef4444';
          const memberProspectos = kanbanProspectos.filter(p => p.ejecutivo === member.codigo);
          return (
            <div key={member.codigo} onClick={() => { setHubEjecutivo(member);setCurrentView('hub-ejecutivo'); }}
              className="bg-white rounded-xl border border-[#e5e7eb] p-4 cursor-pointer hover:shadow-lg hover:border-[#00a8a8]/40 transition-all group relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#00a8a8] to-[#0D47A1] opacity-60 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center gap-3 mb-3">
                <ExecutiveAvatar codigo={member.codigo} name={member.name} size="lg" />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[#1c2c4a] truncate">{member.name.split(' ').slice(0, 2).join(' ')}</div>
                  <div className="text-[10px] text-[#6b7280]">{member.zona || member.role}</div>
                </div>
              </div>
              <div className="text-lg font-bold text-[#1c2c4a]">${(member.presupuestoMensual / 1000000).toFixed(1)}M<span className="text-xs font-normal text-[#6b7280] ml-0.5">/mes</span></div>
              <div className="flex items-center justify-between mt-1 mb-2">
                <span className="text-[10px] text-[#6b7280]">Anual: ${(member.presupuestoAnual2026 / 1000000).toFixed(1)}M</span>
                <span className="text-[10px] font-semibold" style={{ color: barColor }}>{pct}%</span>
              </div>
              <div className="w-full h-1.5 bg-[#f3f4f6] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }} />
              </div>
              <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-[#f3f4f6]">
                <span className="text-[10px] text-[#6b7280]">{memberProspectos.length} opps</span>
                <span className="text-[10px] text-[#6b7280]">·</span>
                <span className="text-[10px] text-[#6b7280]">${((memberProspectos.reduce((s, p) => s + (p.propuesta?.ventaTotal || p.facturacionEstimada || 0), 0)) / 1000000).toFixed(1)}M pipeline</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══════ TAB BAR ═══════ */}
      <div className="mt-5 flex items-center gap-1 bg-white rounded-xl border border-[#e5e7eb] p-1">
        {[
          { id: 'pipeline', label: 'Pipeline', icon: ClipboardList },
          { id: 'presupuesto', label: 'Presupuesto', icon: DollarSign },
          { id: 'rechazadas', label: 'Rechazadas', icon: RotateCcw, badge: kanbanProspectos.filter(p => p.status === 'Propuesta Rechazada').length },
        ].map(tab => (
          <button key={tab.id} onClick={() => setComercialTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center ${comercialTab === tab.id ? 'bg-[#1c2c4a] text-white shadow-sm' : 'text-[#6b7280] hover:bg-[#f3f4f6]'}`}>
            <tab.icon size={15} />
            {tab.label}
            {tab.badge > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${comercialTab === tab.id ? 'bg-white/20 text-white' : 'bg-[#F59E0B]/10 text-[#F59E0B]'}`}>{tab.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* ═══════ TAB: PRESUPUESTO ═══════ */}
      {comercialTab === 'presupuesto' && (<>
      {/* ═══════ PRESUPUESTO MENSUAL 2026 vs REAL ═══════ */}
      <div className="mt-6 bg-white rounded-xl border border-[#e5e7eb] p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[#1c2c4a] flex items-center gap-2">
            <DollarSign size={16} className="text-[#00a8a8]" />
            Presupuesto Mensual 2026 vs Real
          </h3>
          <div className="flex items-center gap-3 text-[10px] text-[#6b7280]">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#e5e7eb] inline-block"></span> Presupuesto</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#00a8a8] inline-block"></span> Real</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={presupuestoEvolution} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000000).toFixed(0)}M`} />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }}
              formatter={(value) => [`$${(value / 1000000).toFixed(1)}M`, '']}
              labelStyle={{ fontWeight: 600, color: '#1c2c4a' }}
            />
            <Bar dataKey="presupuesto" name="Presupuesto" fill="#e5e7eb" radius={[3, 3, 0, 0]} />
            <Bar dataKey="real" name="Real" fill="#00a8a8" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-3 pt-3 border-t border-[#e5e7eb] grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center">
            <div className="text-[10px] text-[#6b7280]">Presupuesto Anual</div>
            <div className="text-sm font-bold text-[#1c2c4a]">${(presupuestoTotal / 1000000).toFixed(0)}M</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-[#6b7280]">Ventas Reales</div>
            <div className="text-sm font-bold text-[#00a8a8]">${(ventasReales / 1000000).toFixed(1)}M</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-[#6b7280]">% Avance</div>
            <div className={`text-sm font-bold ${presupuestoTotal > 0 && (ventasReales / presupuestoTotal) >= 0.5 ? 'text-[#2E7D32]' : 'text-[#F57C00]'}`}>
              {presupuestoTotal > 0 ? Math.round(ventasReales / presupuestoTotal * 100) : 0}%
            </div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-[#6b7280]">Presupuesto Mes</div>
            <div className="text-sm font-bold text-[#1c2c4a]">${(presupuestoMesEquipo / 1000000).toFixed(1)}M</div>
          </div>
        </div>
      </div>

      {/* ═══════ VOLUMEN POR MATERIAL (CARTÓN / PLAYO) — Compacto ═══════ */}
      <div className="mt-4 bg-white rounded-xl border border-[#e5e7eb] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Package size={14} className="text-[#F59E0B]" />
          <h4 className="text-xs font-semibold text-[#1c2c4a] uppercase tracking-wide">Volumen por Material</h4>
          <span className="text-[10px] text-[#6b7280] ml-auto">{materialData.length} prospectos</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3 bg-[#F59E0B]/5 rounded-lg px-3 py-2.5 border border-[#F59E0B]/15">
            <div className="w-8 h-8 rounded-lg bg-[#F59E0B]/10 flex items-center justify-center flex-shrink-0">
              <Package className="text-[#F59E0B]" size={16} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-[#6b7280]">Cartón</div>
              <div className="text-base font-bold text-[#1c2c4a]">{totalCarton >= 1000 ? `${(totalCarton / 1000).toFixed(0)}k` : totalCarton.toLocaleString()} <span className="text-[10px] font-normal text-[#6b7280]">kg</span></div>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-[#3B82F6]/5 rounded-lg px-3 py-2.5 border border-[#3B82F6]/15">
            <div className="w-8 h-8 rounded-lg bg-[#3B82F6]/10 flex items-center justify-center flex-shrink-0">
              <Package className="text-[#3B82F6]" size={16} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-[#6b7280]">Playo</div>
              <div className="text-base font-bold text-[#1c2c4a]">{totalPlayo >= 1000 ? `${(totalPlayo / 1000).toFixed(0)}k` : totalPlayo.toLocaleString()} <span className="text-[10px] font-normal text-[#6b7280]">kg</span></div>
            </div>
          </div>
        </div>
      </div>
      </>)}

      {/* ═══════ TAB: PIPELINE ═══════ */}
      {comercialTab === 'pipeline' && (<>
      {/* Distribución de Pipeline por Ejecutivo — Barras apiladas por etapa */}
      <div className="mt-4 bg-white rounded-xl border border-[#e5e7eb] card-modern p-5">
        <h3 className="text-sm font-semibold text-[#1c2c4a] mb-3">Pipeline por Ejecutivo</h3>
        <div className="space-y-4">
          {salesTeamData.map(member => {
            const memberProspectos = kanbanProspectos.filter(p => p.ejecutivo === member.codigo);
            const memberPipeline = memberProspectos.reduce((s, p) => s + (p.propuesta?.ventaTotal || p.facturacionEstimada || 0), 0);
            const leads = memberProspectos.filter(p => ['Lead nuevo', 'Reunión agendada'].includes(p.status)).length;
            const prospectos = memberProspectos.filter(p => !['Lead nuevo', 'Reunión agendada', 'Propuesta Rechazada'].includes(p.status)).length;
            const porEtapa = KANBAN_STAGES.map(s => memberProspectos.filter(p => p.status === s.id).length);
            if (memberProspectos.length === 0) return null;
            return (
              <div key={member.codigo} onClick={() => { setHubEjecutivo(member);setCurrentView('hub-ejecutivo'); }} className="flex items-center gap-3 cursor-pointer hover:bg-[#f3f4f6] rounded-lg p-2 -mx-2 transition-colors">
                <ExecutiveAvatar codigo={member.codigo} name={member.name} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-[#1c2c4a]">{member.name.split(' ').slice(0, 2).join(' ')}</span>
                    <span className="text-sm font-bold text-[#0D47A1]">${(memberPipeline / 1000000).toFixed(1)}M</span>
                  </div>
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className="text-xs text-[#6b7280]"><span className="font-semibold text-[#6b7280]">{leads}</span> leads</span>
                    <span className="text-xs text-[#00a8a8]"><span className="font-semibold">{prospectos}</span> prospectos</span>
                    <span className="text-[10px] text-[#6b7280]">({memberProspectos.length} total)</span>
                  </div>
                  <div className="w-full h-3 bg-[#e5e7eb] rounded-full overflow-hidden flex">
                    {KANBAN_STAGES.map((stage, idx) => {
                      const pct = memberProspectos.length > 0 ? (porEtapa[idx] / memberProspectos.length * 100) : 0;
                      if (pct === 0) return null;
                      return (
                        <div
                          key={stage.id}
                          className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: stage.color }}
                          title={`${stage.label}: ${porEtapa[idx]}`}
                        ></div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          }).filter(Boolean)}
          {(() => {
            const totalLeads = kanbanProspectos.filter(p => ['Lead nuevo', 'Reunión agendada'].includes(p.status)).length;
            const totalProspectos = kanbanProspectos.filter(p => !['Lead nuevo', 'Reunión agendada', 'Propuesta Rechazada'].includes(p.status)).length;
            return (
              <div className="flex justify-between items-center text-xs pt-3 border-t border-[#e5e7eb]">
                <div className="flex items-center gap-4">
                  <span className="text-[#6b7280]">Total: <span className="font-bold text-[#1c2c4a]">{kanbanProspectos.length}</span></span>
                  <span className="text-[#6b7280]">Leads: <span className="font-bold text-[#6b7280]">{totalLeads}</span></span>
                  <span className="text-[#00a8a8]">Prospectos: <span className="font-bold">{totalProspectos}</span></span>
                  <span className="text-[#0D47A1] font-bold">${(kanbanProspectos.reduce((s, p) => s + (p.propuesta?.ventaTotal || p.facturacionEstimada || 0), 0) / 1000000).toFixed(1)}M</span>
                </div>
                <div className="flex gap-2">
                  {KANBAN_STAGES.map(s => (
                    <div key={s.id} className="flex items-center gap-1 text-[9px]">
                      <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: s.color }}></div>
                      {s.label}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      <SectionHeader color="#0D47A1" icon={ClipboardList} label="Pipeline Detallado" />

      {/* VIEW TOGGLE */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 bg-white rounded-lg border border-[#e5e7eb] p-1">
          {[
            { id: 'kanban', label: 'Kanban', icon: ClipboardList },
            { id: 'tabla', label: 'Tabla', icon: BarChart3 },
          ].map(view => (
            <button
              key={view.id}
              onClick={() => { setPipelineViewMode(view.id); if (view.id === 'kanban') setFilterEtapa('todos'); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                pipelineViewMode === view.id
                  ? 'bg-[#00a8a8] text-white shadow-sm'
                  : 'text-[#6b7280] hover:text-[#1c2c4a] hover:bg-[#f3f4f6]'
              }`}
            >
              <view.icon size={16} />
              {view.label}
            </button>
          ))}
        </div>

        {/* Service Type Summary — how many per service */}
        <div className="flex items-center gap-2 flex-wrap">
          {(() => {
            const counts = {};
            kanbanProspectos.forEach(p => {
              const svcId = (p.servicios || [])[0] || 'rme';
              counts[svcId] = (counts[svcId] || 0) + 1;
            });
            return Object.entries(counts)
              .sort((a, b) => b[1] - a[1])
              .map(([svcId, count]) => {
                const svc = SERVICE_COLORS[svcId] || SERVICE_COLORS.rme;
                return (
                  <div
                    key={svcId}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                    style={{ backgroundColor: svc.bg, color: svc.text, border: `1px solid ${svc.border}30` }}
                  >
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: svc.border }}></div>
                    {svc.label}
                    <span className="font-bold">{count}</span>
                  </div>
                );
              });
          })()}
        </div>
      </div>

      {/* Shared Filter Bar — visible in kanban and tabla */}
      {(() => {
        const activeFilters = [filterServicio, filterEjecutivo].filter(f => f !== 'todos').length
          + (pipelineViewMode === 'tabla' && filterEtapa !== 'todos' ? 1 : 0);
        const totalFiltered = kanbanProspectos
          .filter(p => p.status !== 'Propuesta Rechazada')
          .filter(p => filterServicio === 'todos' || (p.servicios || [])[0] === filterServicio)
          .filter(p => filterEjecutivo === 'todos' || p.ejecutivo === filterEjecutivo)
          .filter(p => pipelineViewMode !== 'tabla' || filterEtapa === 'todos' || p.status === filterEtapa)
          .length;

        return (
          <div className="flex items-center gap-3 flex-wrap mt-4">
            <div className="flex items-center gap-1.5 text-xs font-medium text-[#6b7280]">
              <Filter size={14} />
              Filtros
            </div>
            <select
              value={filterServicio}
              onChange={e => setFilterServicio(e.target.value)}
              className="text-xs border border-[#e5e7eb] rounded-lg px-3 py-1.5 bg-white text-[#1c2c4a] focus:outline-none focus:ring-2 focus:ring-[#00a8a8]/30 focus:border-[#00a8a8]"
            >
              <option value="todos">Todos los servicios</option>
              {SERVICIOS_INNOVATIVE.map(s => {
                const count = kanbanProspectos.filter(p => (p.servicios || [])[0] === s.id).length;
                if (count === 0) return null;
                return <option key={s.id} value={s.id}>{s.nombre} ({count})</option>;
              })}
            </select>
            <select
              value={filterEjecutivo}
              onChange={e => setFilterEjecutivo(e.target.value)}
              className="text-xs border border-[#e5e7eb] rounded-lg px-3 py-1.5 bg-white text-[#1c2c4a] focus:outline-none focus:ring-2 focus:ring-[#00a8a8]/30 focus:border-[#00a8a8]"
            >
              <option value="todos">Todos los ejecutivos</option>
              {salesTeamData.map(m => {
                const count = kanbanProspectos.filter(p => p.ejecutivo === m.codigo).length;
                if (count === 0) return null;
                return <option key={m.codigo} value={m.codigo}>{m.name.split(' ').slice(0, 2).join(' ')} ({count})</option>;
              })}
            </select>
            {pipelineViewMode === 'tabla' && (
              <select
                value={filterEtapa}
                onChange={e => setFilterEtapa(e.target.value)}
                className="text-xs border border-[#e5e7eb] rounded-lg px-3 py-1.5 bg-white text-[#1c2c4a] focus:outline-none focus:ring-2 focus:ring-[#00a8a8]/30 focus:border-[#00a8a8]"
              >
                <option value="todos">Todas las etapas</option>
                {KANBAN_STAGES.map(s => {
                  const count = kanbanProspectos.filter(p => p.status === s.id).length;
                  if (count === 0) return null;
                  return <option key={s.id} value={s.id}>{s.label} ({count})</option>;
                })}
              </select>
            )}
            {activeFilters > 0 && (
              <button
                onClick={() => { setFilterServicio('todos'); setFilterEjecutivo('todos'); setFilterEtapa('todos'); }}
                className="text-xs text-[#00a8a8] hover:text-[#008080] font-medium flex items-center gap-1"
              >
                <X size={12} />
                Limpiar ({activeFilters})
              </button>
            )}
            <span className="text-[11px] text-[#9ca3af] ml-auto">{totalFiltered} prospectos</span>
          </div>
        );
      })()}

      {/* KANBAN VIEW */}
      {pipelineViewMode === 'kanban' && (
        <div className="mt-4">
          {/* Area labels row */}
          <div className="grid grid-cols-6 gap-3 mb-1">
            <div className="col-span-2 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#00a8a8]"></div>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-[#00a8a8]">Comercial</span>
              <div className="flex-1 h-px bg-[#00a8a8]/20 ml-1"></div>
            </div>
            <div className="col-span-2 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#F57C00]"></div>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-[#F57C00]">Operaciones</span>
              <div className="flex-1 h-px bg-[#F57C00]/20 ml-1"></div>
            </div>
            <div className="col-span-2 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#2E7D32]"></div>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-[#2E7D32]">Cierre</span>
              <div className="flex-1 h-px bg-[#2E7D32]/20 ml-1"></div>
            </div>
          </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-6 gap-3">
              {KANBAN_STAGES.map(stage => {
                const stageItems = kanbanProspectos
                  .filter(p => p.status === stage.id)
                  .filter(p => filterServicio === 'todos' || (p.servicios || [])[0] === filterServicio)
                  .filter(p => filterEjecutivo === 'todos' || p.ejecutivo === filterEjecutivo);
                const stageValue = stageItems.reduce((s, p) => s + (p.propuesta?.ventaTotal || p.facturacionEstimada || 0), 0);
                const gate = STAGE_GATES[stage.id];

                return (
                  <div key={stage.id} className="flex flex-col">
                    {/* Column Header */}
                    <div className="rounded-t-lg p-3 mb-2" style={{ borderTop: `3px solid ${stage.color}` }}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-[#1c2c4a]">{stage.label}</h3>
                          <span className="text-xs bg-[#f3f4f6] text-[#6b7280] px-1.5 py-0.5 rounded-full font-medium">
                            {stageItems.length}
                          </span>
                        </div>
                        {gate && (
                          <div title={gate.requirement}>
                            <Lock size={12} className="text-[#6b7280]" />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-xs text-[#6b7280]">
                        <span>${(stageValue / 1000000).toFixed(1)}M</span>
                        <span className="font-medium" style={{ color: stage.color }}>{stage.prob}</span>
                      </div>
                    </div>

                    {/* Droppable Area */}
                    <DroppableColumn stageId={stage.id}>
                      <SortableContext items={stageItems.slice(0, 20).map(p => p.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-0">
                          {stageItems.slice(0, 20).map(prospecto => (
                            <DraggableCard key={prospecto.id} prospecto={prospecto} />
                          ))}
                        </div>
                      </SortableContext>
                      {stageItems.length > 20 && (
                        <button
                          onClick={() => { setPipelineViewMode('tabla'); }}
                          className="w-full mt-2 py-2 text-xs font-medium text-[#00a8a8] hover:text-[#008080] bg-[#00a8a8]/5 hover:bg-[#00a8a8]/10 rounded-lg transition-colors flex items-center justify-center gap-1"
                        >
                          Ver {stageItems.length - 20} más <ChevronDown size={12} />
                        </button>
                      )}
                      {stageItems.length === 0 && (
                        <div className="flex items-center justify-center h-20 border-2 border-dashed border-[#e5e7eb] rounded-lg text-xs text-[#6b7280]">
                          Arrastra aquí
                        </div>
                      )}
                    </DroppableColumn>
                  </div>
                );
              })}
            </div>

            {/* Drag Overlay */}
            <DragOverlay>
              {activeCard && (
                <div className="bg-white rounded-lg border-2 border-[#00a8a8] p-2 shadow-xl w-[180px] rotate-2">
                  <h4 className="text-xs font-semibold text-[#1c2c4a] truncate">{activeCard.empresa}</h4>
                  <div className="flex items-center justify-between text-[10px] text-[#6b7280] mt-0.5">
                    <span>{activeCard.ejecutivo}</span>
                    <span className="font-bold text-[#0D47A1]">${((activeCard.propuesta?.ventaTotal || activeCard.facturacionEstimada || 0) / 1000000).toFixed(1)}M</span>
                  </div>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </div>
      )}

      {/* FUNNEL VIEW */}
      {/* TABLE VIEW */}
      {pipelineViewMode === 'tabla' && (() => {
        const filteredProspectos = kanbanProspectos
          .filter(p => p.status !== 'Propuesta Rechazada')
          .filter(p => filterServicio === 'todos' || (p.servicios || [])[0] === filterServicio)
          .filter(p => filterEjecutivo === 'todos' || p.ejecutivo === filterEjecutivo)
          .filter(p => filterEtapa === 'todos' || p.status === filterEtapa)
          .sort((a, b) => {
            const stageOrder = KANBAN_STAGES.map(s => s.id);
            return stageOrder.indexOf(b.status) - stageOrder.indexOf(a.status);
          });

        return (
        <div className="mt-4 space-y-3">
          {/* Table — filters are now shared above */}
          <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#f3f4f6] border-b border-[#e5e7eb]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280]">Empresa</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-[#6b7280]">Servicio</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-[#6b7280]">Stage</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-[#6b7280]">Ejecutivo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280]">Contacto</th>
                </tr>
              </thead>
              <tbody>
                {filteredProspectos.map(p => {
                    const stage = KANBAN_STAGES.find(s => s.id === p.status);
                    const ejecutivo = salesTeamData.find(e => e.codigo === p.ejecutivo);
                    const primaryService = (p.servicios || [])[0] || 'rme';
                    const svc = SERVICE_COLORS[primaryService] || SERVICE_COLORS.rme;

                    return (
                      <tr key={p.id}
                        className="border-b border-[#e5e7eb] hover:brightness-95 cursor-pointer transition-colors"
                        style={{ backgroundColor: svc.bg }}
                        onClick={() => { setSelectedProspecto(p); setMostrarDetallesProspecto(true); }}>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-0.5 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: svc.border }}></div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-[#1c2c4a] truncate">{p.empresa}</div>
                              {p.planta && <div className="text-[11px] text-[#9ca3af] truncate">{p.planta}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                            style={{ backgroundColor: `${svc.border}18`, color: svc.text }}
                          >
                            {svc.label}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full"
                            style={{ backgroundColor: `${stage?.color}15`, color: stage?.color, border: `1px solid ${stage?.color}30` }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stage?.color }}></span>
                            {stage?.label || p.status}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-[#6b7280]">{ejecutivo?.name?.split(' ').slice(0, 2).join(' ') || p.ejecutivo}</td>
                        <td className="px-4 py-2.5">
                          <div className="text-sm text-[#1c2c4a]">{p.contacto?.nombre || '—'}</div>
                          {p.contacto?.puesto && <div className="text-[11px] text-[#9ca3af] truncate">{p.contacto.puesto}</div>}
                          <div className="flex items-center gap-3 mt-0.5">
                            {p.contacto?.correo && <span className="text-[11px] text-[#00a8a8] truncate">{p.contacto.correo}</span>}
                            {p.contacto?.telefono && <span className="text-[11px] text-[#6b7280]">{p.contacto.telefono}</span>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
              <tfoot className="bg-[#f3f4f6] border-t-2 border-[#e5e7eb]">
                <tr>
                  <td className="px-4 py-3 text-sm font-bold text-[#1c2c4a]" colSpan={5}>
                    Total: {filteredProspectos.length} oportunidades
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          </div>
        </div>
        );
      })()}

      </>)}

      {/* ═══════ TAB: RECHAZADAS ═══════ */}
      {comercialTab === 'rechazadas' && (() => {
        const allRejected = kanbanProspectos.filter(p => p.status === 'Propuesta Rechazada');
        if (allRejected.length === 0) return (
          <div className="mt-4 bg-white rounded-xl border border-[#e5e7eb] p-12 text-center">
            <CheckCircle className="mx-auto text-green-400 mb-3" size={40} />
            <h3 className="text-sm font-semibold text-[#1c2c4a] mb-1">Sin oportunidades rechazadas</h3>
            <p className="text-xs text-[#6b7280]">Todas las oportunidades estan activas en el pipeline</p>
          </div>
        );

        const byRecovery = { sin_seguimiento: [], en_seguimiento: [], re_contactada: [] };
        allRejected.forEach(p => {
          const seg = prospectoSeguimiento[p.id];
          const state = getRecoveryState(seg);
          if (byRecovery[state.id]) byRecovery[state.id].push(p);
        });
        const overdue = allRejected.filter(p => getSeguimientoUrgency(prospectoSeguimiento[p.id])?.overdue);
        const recoverable = allRejected.filter(p => classifyRechazo(p.motivoRechazo)?.recoverable);
        const totalValue = allRejected.reduce((s, p) => s + (p.propuesta?.ventaTotal || p.facturacionEstimada || 0), 0);
        const byCat = { pricing: [], proposal: [], operational: [] };
        allRejected.forEach(p => { const cat = classifyRechazo(p.motivoRechazo); if (byCat[cat.id]) byCat[cat.id].push(p); });

        return (
          <div className="mt-4 space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white rounded-xl border border-[#e5e7eb] p-4">
                <div className="text-[10px] text-[#6b7280] mb-1">Total Rechazadas</div>
                <div className="text-2xl font-bold text-[#1c2c4a]">{allRejected.length}</div>
                <div className="text-[10px] text-[#6b7280]">${(totalValue / 1000000).toFixed(1)}M en valor</div>
              </div>
              <div className="bg-white rounded-xl border border-[#e5e7eb] p-4">
                <div className="text-[10px] text-[#6b7280] mb-1">Recuperables</div>
                <div className="text-2xl font-bold text-green-600">{recoverable.length}</div>
                <div className="text-[10px] text-[#6b7280]">por precio o propuesta</div>
              </div>
              <div className="bg-white rounded-xl border border-[#e5e7eb] p-4">
                <div className="text-[10px] text-[#6b7280] mb-1">En Seguimiento</div>
                <div className="text-2xl font-bold text-[#F59E0B]">{byRecovery.en_seguimiento.length + byRecovery.re_contactada.length}</div>
                <div className="text-[10px] text-[#6b7280]">con fecha programada</div>
              </div>
              <div className="bg-white rounded-xl border border-[#e5e7eb] p-4">
                <div className="text-[10px] text-[#6b7280] mb-1">Vencidas</div>
                <div className="text-2xl font-bold text-red-500">{overdue.length}</div>
                <div className="text-[10px] text-[#6b7280]">requieren atencion</div>
              </div>
            </div>

            {/* Recovery funnel */}
            <div className="bg-white rounded-xl border border-[#e5e7eb] p-4">
              <h4 className="text-xs font-semibold text-[#1c2c4a] mb-3 flex items-center gap-2">
                <RotateCcw size={14} className="text-[#F59E0B]" /> Funnel de Recuperacion
              </h4>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(byRecovery).map(([stateId, items]) => {
                  const state = RECOVERY_STATES[stateId];
                  return (
                    <div key={stateId} className="rounded-xl p-4 border" style={{ backgroundColor: state.bg, borderColor: `${state.color}25` }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold" style={{ color: state.color }}>{state.label}</span>
                        <span className="text-xl font-bold" style={{ color: state.color }}>{items.length}</span>
                      </div>
                      <div className="w-full h-2 bg-white/60 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${allRejected.length ? (items.length / allRejected.length) * 100 : 0}%`, backgroundColor: state.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* By category + detailed list */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              {Object.entries(byCat).map(([catId, items]) => {
                const cat = RECHAZO_CATEGORIES[catId];
                if (items.length === 0) return null;
                return (
                  <div key={catId} className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
                    <div className="px-4 py-3 border-b border-[#e5e7eb] flex items-center justify-between" style={{ backgroundColor: `${cat.color}08` }}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span className="text-xs font-semibold" style={{ color: cat.color }}>{cat.label}</span>
                      </div>
                      <span className="text-xs font-bold" style={{ color: cat.color }}>{items.length}</span>
                    </div>
                    <div className="divide-y divide-[#f3f4f6]">
                      {items.map(p => {
                        const seg = prospectoSeguimiento[p.id];
                        const urgency = getSeguimientoUrgency(seg);
                        const recovery = getRecoveryState(seg);
                        return (
                          <div key={p.id} className="px-4 py-2.5 cursor-pointer hover:bg-[#f9fafb] transition-colors"
                            onClick={() => { setSelectedProspecto(p); setMostrarDetallesProspecto(true); }}>
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-[11px] font-semibold text-[#1c2c4a] truncate">{p.empresa}</span>
                              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: recovery.bg, color: recovery.color }}>{recovery.label}</span>
                            </div>
                            <div className="text-[10px] text-[#9ca3af] truncate mb-1">{p.motivoRechazo || 'Sin motivo'}</div>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-[#6b7280]">{p.ejecutivo} · ${((p.propuesta?.ventaTotal || p.facturacionEstimada || 0) / 1000000).toFixed(1)}M</span>
                              {urgency?.overdue && <span className="text-[9px] font-bold text-red-500"><AlertCircle size={8} className="inline" /> Vencido {urgency.days}d</span>}
                              {!seg?.fechaSeguimiento && cat.recoverable && (
                                <button onClick={(e) => { e.stopPropagation(); guardarSeguimiento(p.id, { fechaSeguimiento: new Date(Date.now() + cat.defaultFollowUpDays * 86400000).toISOString().split('T')[0] }); }}
                                  className="text-[9px] font-semibold text-[#00a8a8] hover:underline flex items-center gap-0.5">
                                  <Calendar size={8} /> Agendar
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      </div>{/* close max-w-[1400px] */}

      {/* Stage Gate Modal */}
      {showStageGateModal && pendingMove && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowStageGateModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 m-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <Lock className="text-orange-600" size={20} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#1c2c4a]">Candado de Calificación</h3>
                <p className="text-sm text-[#6b7280]">No se puede mover a "{KANBAN_STAGES.find(s => s.id === pendingMove.toStage)?.label}"</p>
              </div>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-orange-800 font-medium mb-2">
                {STAGE_GATES[pendingMove.toStage]?.requirement}
              </p>
              <p className="text-sm text-orange-700">
                {STAGE_GATES[pendingMove.toStage]?.message(pendingMove.prospecto)}
              </p>
            </div>

            <div className="bg-[#f3f4f6] rounded-lg p-3 mb-4">
              <div className="text-sm font-semibold text-[#1c2c4a]">{pendingMove.prospecto.empresa}</div>
              <div className="text-xs text-[#6b7280]">{pendingMove.prospecto.industria} • {pendingMove.prospecto.ejecutivo}</div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  // Force move (override gate)
                  setKanbanProspectos(prev =>
                    prev.map(p => p.id === pendingMove.prospecto.id ? { ...p, status: pendingMove.toStage } : p)
                  );
                  setShowStageGateModal(false);
                  setPendingMove(null);
                }}
                className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Unlock size={14} />
                Forzar Movimiento
              </button>
              <button
                onClick={() => { setShowStageGateModal(false); setPendingMove(null); }}
                className="flex-1 px-4 py-2 bg-[#f3f4f6] hover:bg-[#e5e7eb] text-[#1c2c4a] rounded-lg text-sm font-medium transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    );
  };






  const LevantamientosView = () => {
    // Estados para filtros
    const [mostrarFiltros, setMostrarFiltros] = useState(false);
    const [filtroTipo, setFiltroTipo] = useState('Todos');
    const [filtroStatus, setFiltroStatus] = useState('Todos');
    const [filtroEjecutivo, setFiltroEjecutivo] = useState('Todos');
    const [filtroCliente, setFiltroCliente] = useState('');
    const [filtroReporte, setFiltroReporte] = useState('Todos');

    // Funciones de filtrado
    const getFechaSemana = () => {
      const hoy = new Date('2025-11-11');
      const inicioSemana = new Date(hoy);
      inicioSemana.setDate(hoy.getDate() - hoy.getDay());
      return inicioSemana.toISOString().split('T')[0];
    };

    const getFechaMes = () => {
      const hoy = new Date('2025-11-11');
      return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`;
    };

    const esEstaSemana = (fecha) => {
      const fechaItem = new Date(fecha);
      const inicioSemana = new Date(getFechaSemana());
      const hoy = new Date('2025-11-11');
      return fechaItem >= inicioSemana && fechaItem <= hoy;
    };

    const esEsteMes = (fecha) => {
      const fechaItem = new Date(fecha);
      const inicioMes = new Date(getFechaMes());
      const hoy = new Date('2025-11-11');
      return fechaItem >= inicioMes && fechaItem <= hoy;
    };

    // Función para aplicar filtros
    const aplicarFiltros = (items) => {
      return items.filter(item => {
        // Filtro por tipo
        if (filtroTipo !== 'Todos' && item.tipo !== filtroTipo) return false;
        
        // Filtro por status
        if (filtroStatus !== 'Todos' && item.status !== filtroStatus) return false;
        
        // Filtro por ejecutivo
        if (filtroEjecutivo !== 'Todos' && item.ejecutivo !== filtroEjecutivo) return false;
        
        // Filtro por cliente (búsqueda)
        if (filtroCliente && !item.cliente.toLowerCase().includes(filtroCliente.toLowerCase())) return false;
        
        // Filtro por reporte
        if (filtroReporte === 'Con Reporte' && !item.tieneReporte) return false;
        if (filtroReporte === 'Sin Reporte' && item.tieneReporte) return false;
        
        return true;
      });
    };

    // Obtener ejecutivos únicos
    const ejecutivosUnicos = [...new Set(levantamientosActivos.map(l => l.ejecutivo))].sort();
    
    // Obtener estados únicos
    const estadosUnicos = [...new Set(levantamientosActivos.map(l => l.status))].sort();

    const levantamientosEstaSemana = aplicarFiltros(levantamientosActivos.filter(l => 
      esEstaSemana(l.fecha) && l.tipo === 'Levantamiento'
    ));
    
    const levantamientosEsteMes = aplicarFiltros(levantamientosActivos.filter(l => 
      esEsteMes(l.fecha) && l.tipo === 'Levantamiento'
    ));

    const completadosSinReporte = aplicarFiltros(levantamientosActivos.filter(l => 
      l.status === 'Completado' && !l.tieneReporte && l.tipo === 'Levantamiento'
    ));

    const levantamientosFiltrados = aplicarFiltros(levantamientosActivos);

    const totalLevantamientos = aplicarFiltros(levantamientosActivos.filter(l => l.tipo === 'Levantamiento')).length;
    const totalPropuestas = aplicarFiltros(levantamientosActivos.filter(l => l.tipo === 'Propuesta')).length;
    const totalValor = aplicarFiltros(levantamientosActivos).reduce((sum, l) => sum + l.valorEstimado, 0);

    // Función para limpiar filtros
    const limpiarFiltros = () => {
      setFiltroTipo('Todos');
      setFiltroStatus('Todos');
      setFiltroEjecutivo('Todos');
      setFiltroCliente('');
      setFiltroReporte('Todos');
    };

    // Contar filtros activos
    const filtrosActivos = [
      filtroTipo !== 'Todos',
      filtroStatus !== 'Todos',
      filtroEjecutivo !== 'Todos',
      filtroCliente !== '',
      filtroReporte !== 'Todos'
    ].filter(Boolean).length;

    const renderTable = (items, showReporte = false) => (
      <div className="bg-white rounded-xl card-modern overflow-hidden border border-[#e5e7eb]">
        <table className="w-full">
          <thead className="bg-[#f3f4f6] border-b border-[#e5e7eb]">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-[#1c2c4a]">Cliente</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-[#1c2c4a]">Ejecutivo</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-[#1c2c4a]">Fecha</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-[#1c2c4a]">Status</th>
              {showReporte && (
                <th className="px-6 py-4 text-left text-sm font-semibold text-[#1c2c4a]">Reporte</th>
              )}
              <th className="px-6 py-4 text-left text-sm font-semibold text-[#1c2c4a]">Volumen Est.</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-[#1c2c4a]">Valor Est.</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-[#1c2c4a]">Acción</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={showReporte ? 8 : 7} className="px-6 py-8 text-center text-[#6b7280]">
                  No hay registros en esta categoría
                </td>
              </tr>
            ) : (
              items.map(item => (
                <tr key={item.id} className="border-b border-[#e5e7eb] hover:bg-[#f3f4f6]">
                  <td className="px-6 py-4 text-sm font-semibold text-[#1c2c4a]">{item.cliente}</td>
                  <td className="px-6 py-4 text-sm text-[#6b7280]">{item.ejecutivo}</td>
                  <td className="px-6 py-4 text-sm font-medium text-[#1c2c4a]">{item.fecha}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      item.status === 'Completado' ? 'bg-green-50 text-green-700 border border-green-200' :
                      item.status === 'Enviada' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                      item.status === 'En revisión' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                      item.status === 'Agendado' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                      'bg-gray-50 text-gray-700 border border-gray-200'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  {showReporte && (
                    <td className="px-6 py-4 text-sm">
                      {item.tieneReporte ? (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                          ✓ Generado
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
                          Pendiente
                        </span>
                      )}
                    </td>
                  )}
                  <td className="px-6 py-4 text-sm font-semibold text-[#00a8a8]">{item.volumenEstimado}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-[#1c2c4a]">
                    ${(item.valorEstimado / 1000).toFixed(0)}k
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <button 
                      onClick={() => setSelectedLevantamiento(item)}
                      className="text-[#00a8a8] hover:text-[#008080] font-medium flex items-center gap-1 text-sm"
                    >
                      Ver <ChevronRight size={14} />
            </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );

    // Datos para charts operativos
    const levPorEjecutivo = ejecutivosUnicos.map(ej => ({
      ejecutivo: ej.split(' ')[0],
      completados: levantamientosActivos.filter(l => l.ejecutivo === ej && l.status === 'Completado').length,
      pendientes: levantamientosActivos.filter(l => l.ejecutivo === ej && l.status !== 'Completado').length,
    }));

    const levPorStatus = estadosUnicos.map(s => ({
      name: s,
      value: levantamientosActivos.filter(l => l.status === s).length,
    }));

    return (
      <div className="p-4 md:p-6 lg:p-8 bg-[#faf7f2] min-h-screen">
        <div className="max-w-[1400px] mx-auto">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-[#1c2c4a]">{userGreeting}, {currentUserName}</h1>
            <p className="text-sm text-[#6b7280] mt-0.5">Levantamientos, propuestas y documentación</p>
          </div>
          <button
            onClick={() => { setKpiPanelArea('operacion'); setShowKpiPanel(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#F57C00] hover:bg-[#E65100] text-white rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-md"
          >
            <Target size={16} />
            KPIs del Equipo
          </button>
        </div>

        {/* MÉTRICAS RESUMEN */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="rounded-xl border border-[#00a8a8]/10 card-modern p-5" style={{ backgroundColor: 'rgba(0,168,168,0.04)' }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[13px] font-medium text-[#6b7280] mb-1">Total Levantamientos</div>
                <div className="text-2xl font-bold text-[#1c2c4a]">{totalLevantamientos}</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#00a8a8]/10 flex items-center justify-center">
                <ClipboardList className="text-[#00a8a8]" size={20} />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-[#e5e7eb] card-modern p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[13px] font-medium text-[#6b7280] mb-1">Total Propuestas</div>
                <div className="text-2xl font-bold text-[#1c2c4a]">{totalPropuestas}</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#0D47A1]/10 flex items-center justify-center">
                <FileText className="text-[#0D47A1]" size={20} />
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-[#2E7D32]/10 card-modern p-5" style={{ backgroundColor: 'rgba(46,125,50,0.04)' }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[13px] font-medium text-[#6b7280] mb-1">Valor Total Estimado</div>
                <div className="text-2xl font-bold text-[#1c2c4a]">${(totalValor / 1000000).toFixed(1)}M</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#2E7D32]/10 flex items-center justify-center">
                <DollarSign className="text-[#2E7D32]" size={20} />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-[#e5e7eb] card-modern p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[13px] font-medium text-[#6b7280] mb-1">Sin Reporte</div>
                <div className="text-2xl font-bold text-[#1c2c4a]">{completadosSinReporte.length}</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#F57C00]/10 flex items-center justify-center">
                <AlertCircle className="text-[#F57C00]" size={20} />
              </div>
            </div>
          </div>
        </div>

        <SectionHeader color="#F57C00" icon={BarChart3} label="Métricas y Análisis" />

        {/* CHARTS ROW */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-[#e5e7eb] card-modern p-5">
            <h3 className="text-sm font-semibold text-[#1c2c4a] mb-4">Levantamientos por Ejecutivo</h3>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={levPorEjecutivo} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="ejecutivo" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#1c2c4a', border: '1px solid #00a8a8', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                  <Bar dataKey="completados" stackId="a" fill="#00a8a8" radius={[0, 0, 0, 0]} name="Completados" />
                  <Bar dataKey="pendientes" stackId="a" fill="#F57C00" radius={[4, 4, 0, 0]} name="Pendientes" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-[#e5e7eb] card-modern p-5">
            <h3 className="text-sm font-semibold text-[#1c2c4a] mb-4">Distribución por Status</h3>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={levPorStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={45} paddingAngle={3}>
                    {levPorStatus.map((entry, idx) => (
                      <Cell key={idx} fill={['#00a8a8', '#0D47A1', '#F57C00', '#2E7D32', '#7C3AED', '#ef4444'][idx % 6]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1c2c4a', border: '1px solid #00a8a8', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <SectionHeader color="#0D47A1" icon={ClipboardList} label="Registros Detallados" />

        {/* ACCIONES */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-3">
            <button 
              onClick={() => setMostrarFiltros(!mostrarFiltros)}
              className={`flex items-center gap-2 px-4 py-2 border border-[#e5e7eb] rounded-md hover:bg-white font-medium text-sm transition-all ${
                mostrarFiltros || filtrosActivos > 0
                  ? 'bg-[#00a8a8] text-white border-[#00a8a8] hover:bg-[#008080]'
                  : 'text-[#6b7280] hover:text-[#00a8a8]'
              }`}
            >
              <Filter size={16} />
              Filtrar
              {filtrosActivos > 0 && (
                <span className="bg-white text-[#00a8a8] text-xs font-bold px-2 py-0.5 rounded-full">
                  {filtrosActivos}
                </span>
              )}
            </button>
          </div>
          <button 
            onClick={() => setMostrarNuevoLevantamiento(true)}
            className="bg-[#00a8a8] hover:bg-[#1e4a37] text-white px-6 py-2 rounded-md font-medium text-sm shadow-sm hover:shadow-md flex items-center gap-2 transition-all"
          >
            <ClipboardList size={18} />
            Nuevo Levantamiento
          </button>
        </div>
        
        {/* PANEL DE FILTROS */}
        {mostrarFiltros && (
          <div className="mb-6 bg-white rounded-xl border border-[#e5e7eb] card-modern p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Filter className="text-[#00a8a8]" size={20} />
                <h3 className="text-lg font-semibold text-[#1c2c4a]">Filtros de Búsqueda</h3>
                {filtrosActivos > 0 && (
                  <span className="text-xs bg-[#00a8a8] text-white px-2 py-1 rounded-md font-medium">
                    {filtrosActivos} activo{filtrosActivos !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <button
                onClick={limpiarFiltros}
                className="text-sm text-[#6b7280] hover:text-[#00a8a8] font-medium flex items-center gap-1"
              >
                <RotateCcw size={14} />
                Limpiar filtros
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Filtro por Tipo */}
              <div>
                <label className="block text-xs font-medium text-[#6b7280] mb-2">Tipo</label>
                <select
                  value={filtroTipo}
                  onChange={(e) => setFiltroTipo(e.target.value)}
                  className="w-full px-3 py-2 border border-[#e5e7eb] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00a8a8] focus:border-transparent bg-white"
                >
                  <option value="Todos">Todos</option>
                  <option value="Levantamiento">Levantamiento</option>
                  <option value="Propuesta">Propuesta</option>
                </select>
              </div>

              {/* Filtro por Status */}
              <div>
                <label className="block text-xs font-medium text-[#6b7280] mb-2">Estado</label>
                <select
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-[#e5e7eb] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00a8a8] focus:border-transparent bg-white"
                >
                  <option value="Todos">Todos</option>
                  {estadosUnicos.map(estado => (
                    <option key={estado} value={estado}>{estado}</option>
                  ))}
                </select>
              </div>

              {/* Filtro por Ejecutivo */}
              <div>
                <label className="block text-xs font-medium text-[#6b7280] mb-2">Ejecutivo</label>
                <select
                  value={filtroEjecutivo}
                  onChange={(e) => setFiltroEjecutivo(e.target.value)}
                  className="w-full px-3 py-2 border border-[#e5e7eb] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00a8a8] focus:border-transparent bg-white"
                >
                  <option value="Todos">Todos</option>
                  {ejecutivosUnicos.map(ejecutivo => (
                    <option key={ejecutivo} value={ejecutivo}>{ejecutivo}</option>
                  ))}
                </select>
              </div>

              {/* Filtro por Cliente (búsqueda) */}
              <div>
                <label className="block text-xs font-medium text-[#6b7280] mb-2">Cliente</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#6b7280]" size={16} />
                  <input
                    type="text"
                    value={filtroCliente}
                    onChange={(e) => setFiltroCliente(e.target.value)}
                    placeholder="Buscar cliente..."
                    className="w-full pl-10 pr-3 py-2 border border-[#e5e7eb] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00a8a8] focus:border-transparent bg-white"
                  />
                </div>
              </div>

              {/* Filtro por Reporte */}
              <div>
                <label className="block text-xs font-medium text-[#6b7280] mb-2">Reporte</label>
                <select
                  value={filtroReporte}
                  onChange={(e) => setFiltroReporte(e.target.value)}
                  className="w-full px-3 py-2 border border-[#e5e7eb] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00a8a8] focus:border-transparent bg-white"
                >
                  <option value="Todos">Todos</option>
                  <option value="Con Reporte">Con Reporte</option>
                  <option value="Sin Reporte">Sin Reporte</option>
                </select>
              </div>
            </div>
          </div>
        )}
        
        {/* LEVANTAMIENTOS ESTA SEMANA */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Calendar className="text-[#00a8a8]" size={24} />
              <h2 className="text-xl font-semibold text-[#1c2c4a]">Levantamientos Esta Semana</h2>
              <span className="px-3 py-1 bg-[#00a8a8] text-white text-xs font-medium rounded-md">
                {levantamientosEstaSemana.length}
              </span>
            </div>
          </div>
          {renderTable(levantamientosEstaSemana)}
        </div>

        {/* LEVANTAMIENTOS ESTE MES */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Calendar className="text-[#00a8a8]" size={24} />
              <h2 className="text-xl font-semibold text-[#1c2c4a]">Levantamientos Este Mes</h2>
              <span className="px-3 py-1 bg-[#008080] text-white text-xs font-medium rounded-md">
                {levantamientosEsteMes.length}
              </span>
            </div>
          </div>
          {renderTable(levantamientosEsteMes)}
        </div>

        {/* COMPLETADOS SIN REPORTE */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-orange-500" size={24} />
              <h2 className="text-xl font-semibold text-[#1c2c4a]">Completados Sin Reporte</h2>
              <span className="px-3 py-1 bg-orange-500 text-white text-xs font-medium rounded-md">
                {completadosSinReporte.length}
              </span>
            </div>
          </div>
          {renderTable(completadosSinReporte, true)}
        </div>

        {/* TODOS LOS LEVANTAMIENTOS Y PROPUESTAS */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Eye className="text-[#00a8a8]" size={24} />
              <h2 className="text-xl font-semibold text-[#1c2c4a]">Vista Total - Todos los Registros</h2>
              <span className="px-3 py-1 bg-[#f3f4f6] text-[#6b7280] text-xs font-medium rounded-md border border-[#e5e7eb]">
                {levantamientosFiltrados.length} registro{levantamientosFiltrados.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <div className="bg-white rounded-xl card-modern overflow-hidden border border-[#e5e7eb]">
          <table className="w-full">
              <thead className="bg-[#f3f4f6] border-b border-[#e5e7eb]">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#1c2c4a]">Cliente</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#1c2c4a]">Tipo</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#1c2c4a]">Ejecutivo</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#1c2c4a]">Fecha</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#1c2c4a]">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#1c2c4a]">Volumen Est.</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#1c2c4a]">Valor Est.</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#1c2c4a]">Acción</th>
              </tr>
            </thead>
            <tbody>
              {levantamientosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-[#6b7280]">
                    No se encontraron registros con los filtros aplicados
                  </td>
                </tr>
              ) : (
                levantamientosFiltrados.map(item => (
                  <tr key={item.id} className="border-b border-[#e5e7eb] hover:bg-[#f3f4f6]">
                    <td className="px-6 py-4 text-sm font-semibold text-[#1c2c4a]">{item.cliente}</td>
                  <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      item.tipo === 'Levantamiento' 
                          ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                          : 'bg-purple-50 text-purple-700 border border-purple-200'
                    }`}>
                      {item.tipo}
                    </span>
                  </td>
                    <td className="px-6 py-4 text-sm text-[#6b7280]">{item.ejecutivo}</td>
                    <td className="px-6 py-4 text-sm font-medium text-[#1c2c4a]">{item.fecha}</td>
                  <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        item.status === 'Completado' ? 'bg-green-50 text-green-700 border border-green-200' :
                        item.status === 'Enviada' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        item.status === 'En revisión' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                        item.status === 'Agendado' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                        'bg-gray-50 text-gray-700 border border-gray-200'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                    <td className="px-6 py-4 text-sm font-semibold text-[#00a8a8]">{item.volumenEstimado}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-[#1c2c4a]">
                    ${(item.valorEstimado / 1000).toFixed(0)}k
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <button 
                      onClick={() => setSelectedLevantamiento(item)}
                        className="text-[#00a8a8] hover:text-[#008080] font-medium flex items-center gap-1 text-sm"
                    >
                        Ver <ChevronRight size={14} />
                    </button>
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>
        
        {/* SIGUIENTE PASO REQUERIDO */}
        <div className="bg-white border border-[#e5e7eb] rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle size={20} className="text-[#00a8a8]" />
            <h3 className="text-lg font-semibold text-[#1c2c4a]">Siguiente Paso Requerido</h3>
          </div>
          <div className="space-y-2">
            {levantamientosFiltrados.filter(l => l.siguientePaso).map(item => (
              <div key={item.id} className="flex items-center justify-between bg-[#f3f4f6] p-4 rounded-md border border-[#e5e7eb]">
                <div>
                  <span className="font-semibold text-[#1c2c4a]">{item.cliente}</span>
                  <span className="text-[#6b7280] mx-2">→</span>
                  <span className="text-sm text-[#6b7280]">{item.siguientePaso}</span>
                </div>
                <span className="text-xs font-medium text-[#6b7280]">{item.ejecutivo}</span>
              </div>
            ))}
        </div>
      </div>
      </div>
    </div>
  );
  };

  // ============================
  // TRAZABILIDAD GENERAL VIEW — Kanban solo lectura + indicadores de flujo
  // ============================
  const TrazabilidadGeneralView = () => {
    const hoy = new Date();

    // Calcular métricas por etapa
    const metricasPorEtapa = KANBAN_STAGES.map((stage, idx) => {
      const prospectos = kanbanProspectos.filter(p => p.status === stage.id);

      // Tiempo promedio en etapa (simulado desde fecha de creación + posición en pipeline)
      const diasPromedio = prospectos.length > 0
        ? prospectos.reduce((sum, p) => {
            if (!p.fecha) return sum + 0;
            const fechaCreacion = new Date(p.fecha);
            const dias = Math.max(1, Math.floor((hoy - fechaCreacion) / (1000 * 60 * 60 * 24)));
            return sum + dias;
          }, 0) / prospectos.length
        : 0;

      // Valor del pipeline en esta etapa
      const valorEtapa = prospectos.reduce((s, p) => s + (p.propuesta?.ventaTotal || p.facturacionEstimada || 0), 0);

      return {
        ...stage,
        count: prospectos.length,
        diasPromedio: Math.round(diasPromedio),
        valor: valorEtapa,
        prospectos,
      };
    });

    // Conversión entre etapas
    const conversiones = KANBAN_STAGES.slice(0, -1).map((stage, idx) => {
      const actual = metricasPorEtapa[idx].count;
      const siguiente = metricasPorEtapa[idx + 1].count;
      // Conversión basada en cuántos hay en la siguiente etapa vs esta
      const total = actual + siguiente;
      const pct = total > 0 ? Math.round((siguiente / Math.max(actual, siguiente)) * 100) : 0;
      return { from: stage.label, to: KANBAN_STAGES[idx + 1].label, pct };
    });

    // Cuellos de botella: etapas con más prospectos estancados (>30 días)
    const cuellos = metricasPorEtapa
      .filter(m => m.count > 0 && m.diasPromedio > 20)
      .sort((a, b) => b.diasPromedio - a.diasPromedio);

    // Prospectos estancados (>30 días sin moverse)
    const estancados = kanbanProspectos.filter(p => {
      if (!p.fecha) return false;
      const dias = Math.floor((hoy - new Date(p.fecha)) / (1000 * 60 * 60 * 24));
      return dias > 30 && !['Inicio de operación', 'Propuesta Rechazada'].includes(p.status);
    });

    // Total pipeline
    const totalPipeline = kanbanProspectos.reduce((s, p) => s + (p.propuesta?.ventaTotal || p.facturacionEstimada || 0), 0);
    const totalProspectos = kanbanProspectos.length;

    // Ejecutivo lookup
    const getEjecutivoNombre = (codigo) => {
      const m = salesTeamData.find(s => s.codigo === codigo);
      return m ? m.name.split(' ').slice(0, 2).join(' ') : codigo;
    };

    return (
      <div className="p-4 md:p-6 lg:p-8 bg-[#faf7f2] min-h-screen">
        <div className="max-w-[1400px] mx-auto">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-[#1c2c4a]">{userGreeting}, {currentUserName}</h1>
            <p className="text-sm text-[#6b7280] mt-0.5">Flujo, conversión y velocidad del pipeline</p>
          </div>
        </div>

        {/* INDICADORES CLAVE */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Prospectos Activos */}
          <div className="rounded-xl border border-[#00a8a8]/10 card-modern p-5" style={{ backgroundColor: 'rgba(0,168,168,0.04)' }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[13px] font-medium text-[#6b7280] mb-1">Prospectos Activos</div>
                <div className="text-2xl font-bold text-[#1c2c4a]">{totalProspectos}</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#00a8a8]/10 flex items-center justify-center">
                <Users className="text-[#00a8a8]" size={20} />
              </div>
            </div>
          </div>

          {/* Pipeline Total */}
          <div className="bg-white rounded-xl border border-[#e5e7eb] card-modern p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[13px] font-medium text-[#6b7280] mb-1">Pipeline Total</div>
                <div className="text-2xl font-bold text-[#1c2c4a]">${(totalPipeline / 1000000).toFixed(1)}M</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#0D47A1]/10 flex items-center justify-center">
                <DollarSign className="text-[#0D47A1]" size={20} />
              </div>
            </div>
          </div>

          {/* Tiempo Promedio del Ciclo */}
          <div className="rounded-xl border border-[#F57C00]/10 card-modern p-5" style={{ backgroundColor: 'rgba(245,124,0,0.04)' }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[13px] font-medium text-[#6b7280] mb-1">Tiempo Promedio</div>
                <div className="text-2xl font-bold text-[#1c2c4a]">
                  {metricasPorEtapa.length > 0 ? Math.round(metricasPorEtapa.reduce((s, m) => s + m.diasPromedio, 0) / metricasPorEtapa.filter(m => m.count > 0).length || 1) : 0} <span className="text-lg">días</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#F57C00]/10 flex items-center justify-center">
                <Calendar className="text-[#F57C00]" size={20} />
              </div>
            </div>
          </div>

          {/* Estancados */}
          <div className="bg-white rounded-xl border border-[#e5e7eb] card-modern p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[13px] font-medium text-[#6b7280] mb-1">Estancados (&gt;30 días)</div>
                <div className="text-2xl font-bold" style={{ color: estancados.length > 5 ? '#EF4444' : '#1c2c4a' }}>{estancados.length}</div>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: estancados.length > 5 ? '#EF444410' : '#2E7D3210' }}>
                <AlertCircle size={20} style={{ color: estancados.length > 5 ? '#EF4444' : '#2E7D32' }} />
              </div>
            </div>
          </div>
        </div>

        <SectionHeader color="#7C3AED" icon={TrendingUp} label="Análisis de Conversión" />

        {/* CONVERSIÓN ENTRE ETAPAS — Funnel horizontal */}
        <div className="bg-white rounded-xl border border-[#e5e7eb] card-modern p-5">
          <h3 className="text-sm font-semibold text-[#1c2c4a] mb-4">Flujo de Conversión entre Etapas</h3>
          <div className="flex items-center justify-between overflow-x-auto gap-1">
            {metricasPorEtapa.map((etapa, idx) => (
              <div key={etapa.id} className="flex items-center flex-shrink-0">
                {/* Etapa box */}
                <div className="flex flex-col items-center min-w-[100px]">
                  <div className="w-full rounded-lg border-2 p-3 text-center" style={{ borderColor: etapa.color, backgroundColor: `${etapa.color}10` }}>
                    <div className="text-lg font-bold" style={{ color: etapa.color }}>{etapa.count}</div>
                    <div className="text-[11px] font-medium text-[#1c2c4a]">{etapa.label}</div>
                  </div>
                  <div className="mt-1 text-[10px] text-[#6b7280]">
                    {etapa.diasPromedio > 0 ? `~${etapa.diasPromedio}d prom.` : '—'}
                  </div>
                  <div className="text-[10px] font-medium text-[#0D47A1]">
                    {etapa.valor > 0 ? `$${(etapa.valor / 1000000).toFixed(1)}M` : '—'}
                  </div>
                </div>
                {/* Arrow + conversion % */}
                {idx < metricasPorEtapa.length - 1 && (
                  <div className="flex flex-col items-center mx-2 flex-shrink-0">
                    <div className="text-[10px] font-bold" style={{ color: conversiones[idx]?.pct > 50 ? '#2E7D32' : conversiones[idx]?.pct > 25 ? '#F57C00' : '#EF4444' }}>
                      {conversiones[idx]?.pct || 0}%
                    </div>
                    <ArrowRight size={16} className="text-[#6b7280]/40" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* VELOCIDAD DEL PIPELINE — Full width */}
        <div className="mt-4 bg-white rounded-xl border border-[#e5e7eb] card-modern p-5">
          <h3 className="text-sm font-semibold text-[#1c2c4a] mb-1">Velocidad del Pipeline</h3>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={metricasPorEtapa.filter(m => m.count > 0)} margin={{ top: 10, right: 50, bottom: 10, left: 10 }}>
              <defs>
                {metricasPorEtapa.filter(m => m.count > 0).map((etapa, i) => (
                  <linearGradient key={etapa.id} id={`barGrad-${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={etapa.color} stopOpacity={0.9} />
                    <stop offset="100%" stopColor={etapa.color} stopOpacity={0.4} />
                  </linearGradient>
                ))}
                <filter id="lineGlow">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
                  <feFlood floodColor="#EF4444" floodOpacity="0.4" result="color" />
                  <feComposite in="color" in2="blur" operator="in" result="shadow" />
                  <feMerge>
                    <feMergeNode in="shadow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6b7280', fontWeight: 500 }} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#EF4444' }} tickLine={false} axisLine={false}
                label={{ value: 'Días promedio', angle: 90, position: 'insideRight', style: { fontSize: 10, fill: '#EF4444' } }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1c2c4a', border: '1px solid #00a8a8', borderRadius: '10px', color: '#fff', fontSize: '12px', boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }}
                formatter={(value, name) => [name === 'diasPromedio' ? `${value} días` : `${value} prospectos`, name === 'diasPromedio' ? 'Tiempo promedio' : 'Prospectos']}
                labelStyle={{ color: '#00a8a8', fontWeight: 600 }}
              />
              <ReferenceLine yAxisId="right" y={20} stroke="#F59E0B" strokeDasharray="6 3" strokeWidth={2}
                label={{ value: 'Umbral 20d', position: 'right', style: { fontSize: 9, fill: '#F59E0B', fontWeight: 600 } }} />
              <Bar yAxisId="left" dataKey="count" radius={[8, 8, 0, 0]} barSize={48}>
                {metricasPorEtapa.filter(m => m.count > 0).map((etapa, i) => (
                  <Cell key={etapa.id} fill={etapa.diasPromedio > 20 ? '#EF4444' : etapa.color} opacity={etapa.diasPromedio > 20 ? 1 : 0.85} />
                ))}
              </Bar>
              <Line yAxisId="right" type="monotone" dataKey="diasPromedio" stroke="#EF4444" strokeWidth={3}
                dot={{ r: 6, fill: '#EF4444', stroke: '#fff', strokeWidth: 2 }} filter="url(#lineGlow)" />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-5 mt-3 text-[11px] text-[#6b7280]">
            <span className="flex items-center gap-1.5"><div className="w-3.5 h-3.5 rounded bg-[#00a8a8]"></div> Prospectos por etapa</span>
            <span className="flex items-center gap-1.5"><div className="w-4 h-0.5 bg-[#EF4444] rounded"></div> Días promedio</span>
            <span className="flex items-center gap-1.5"><div className="w-4 h-0 border-t-2 border-dashed border-[#F59E0B]"></div> Umbral de alerta</span>
          </div>
        </div>

        {/* ALERTAS — Estilo notificaciones */}
        {estancados.length > 0 && (
          <div className="mt-3 bg-white rounded-xl border border-[#e5e7eb] card-modern px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="relative">
                  <Bell size={14} className="text-[#F57C00]" />
                  <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#EF4444] text-white text-[7px] font-bold flex items-center justify-center">{estancados.length}</div>
                </div>
                <span className="text-xs font-semibold text-[#1c2c4a] ml-1">Alertas</span>
              </div>
              <div className="h-4 w-px bg-[#e5e7eb] flex-shrink-0"></div>
              <div className="flex-1 overflow-x-auto scrollbar-hide">
                <div className="flex items-center gap-2">
                  {[...estancados].sort((a, b) => {
                    const dA = Math.floor((hoy - new Date(a.fecha)) / (1000 * 60 * 60 * 24));
                    const dB = Math.floor((hoy - new Date(b.fecha)) / (1000 * 60 * 60 * 24));
                    return dB - dA;
                  }).map(p => {
                    const dias = Math.floor((hoy - new Date(p.fecha)) / (1000 * 60 * 60 * 24));
                    const stage = KANBAN_STAGES.find(s => s.id === p.status);
                    const severidad = Math.min(dias / 30, 2.5);
                    const color = severidad >= 2 ? '#DC2626' : severidad >= 1.5 ? '#EF4444' : '#F59E0B';
                    return (
                      <div key={p.id} className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-colors hover:shadow-sm"
                        style={{ backgroundColor: `${color}08`, borderColor: `${color}25` }}>
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }}></div>
                        <span className="font-medium text-[#1c2c4a] whitespace-nowrap">{p.empresa}{p.planta ? ` - ${p.planta}` : ''}</span>
                        <span className="text-[#6b7280] whitespace-nowrap">{dias}d</span>
                        <span className="text-[#6b7280] whitespace-nowrap">· {stage?.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* KANBAN SOLO LECTURA */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#1c2c4a] flex items-center gap-2">
              <BarChart3 size={16} className="text-[#00a8a8]" />
              Pipeline General — Todas las Áreas
            </h3>
            <div className="flex items-center gap-4 text-[10px] text-[#6b7280]">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-1 rounded bg-[#00a8a8]"></div> COMERCIAL
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-1 rounded bg-[#F57C00]"></div> OPERACIONES
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-1 rounded bg-[#7C3AED]"></div> CIERRE
              </div>
            </div>
          </div>

          {/* Area separator row */}
          <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: `repeat(${KANBAN_STAGES.length}, minmax(0, 1fr))` }}>
            {KANBAN_STAGES.map((stage, idx) => {
              const area = idx <= 1 ? { label: 'COMERCIAL', color: '#00a8a8' } : idx <= 3 ? { label: 'OPERACIONES', color: '#F57C00' } : { label: 'CIERRE', color: '#7C3AED' };
              return (
                <div key={stage.id} className="text-center">
                  <div className="text-[9px] font-bold tracking-wider" style={{ color: area.color }}>{area.label}</div>
                  <div className="h-0.5 rounded-full mt-0.5" style={{ backgroundColor: area.color }}></div>
                </div>
              );
            })}
          </div>

          {/* Kanban columns */}
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${KANBAN_STAGES.length}, minmax(0, 1fr))` }}>
            {KANBAN_STAGES.map(stage => {
              const stageProspectos = kanbanProspectos.filter(p => p.status === stage.id);
              const valorEtapa = stageProspectos.reduce((s, p) => s + (p.propuesta?.ventaTotal || p.facturacionEstimada || 0), 0);
              return (
                <div key={stage.id} className="bg-[#f3f4f6]/70 rounded-lg p-2 min-h-[200px]">
                  {/* Column header */}
                  <div className="flex items-center justify-between mb-2 px-1">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }}></div>
                      <span className="text-[11px] font-semibold text-[#1c2c4a]">{stage.label}</span>
                    </div>
                    <span className="text-[10px] font-bold rounded-full px-1.5 py-0.5" style={{ backgroundColor: `${stage.color}15`, color: stage.color }}>
                      {stageProspectos.length}
                    </span>
                  </div>
                  {valorEtapa > 0 && (
                    <div className="text-[10px] text-[#0D47A1] font-medium px-1 mb-2">${(valorEtapa / 1000000).toFixed(1)}M</div>
                  )}

                  {/* Cards - read only */}
                  <div className="space-y-1.5">
                    {stageProspectos.slice(0, 8).map(p => {
                      const dias = p.fecha ? Math.floor((hoy - new Date(p.fecha)) / (1000 * 60 * 60 * 24)) : 0;
                      const esEstancado = dias > 30;
                      return (
                        <div
                          key={p.id}
                          className={`bg-white rounded-md p-2 border text-left ${esEstancado ? 'border-red-200 bg-red-50/30' : 'border-[#e5e7eb]'}`}
                        >
                          <div className="text-[11px] font-semibold text-[#1c2c4a] truncate">{p.empresa}</div>
                          {p.planta && <div className="text-[9px] text-[#6b7280] truncate">{p.planta}</div>}
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-[9px] text-[#6b7280]">{getEjecutivoNombre(p.ejecutivo)}</span>
                            {esEstancado && <span className="text-[8px] px-1 py-0.5 rounded bg-red-100 text-red-600 font-bold">{dias}d</span>}
                          </div>
                          {(p.propuesta?.ventaTotal || p.facturacionEstimada) ? (
                            <div className="text-[9px] font-medium text-[#0D47A1] mt-0.5">
                              ${((p.propuesta?.ventaTotal || p.facturacionEstimada) / 1000000).toFixed(1)}M
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                    {stageProspectos.length > 8 && (
                      <div className="text-[10px] text-center text-[#6b7280] py-1">+{stageProspectos.length - 8} más</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
      </div>
    );
  };

  const TrazabilidadView = () => {
    const [clienteSeleccionado, setClienteSeleccionado] = useState(clientesConReportes[0]?.id || null);
    const [datosEditables, setDatosEditables] = useState(
      clienteSeleccionado ? trazabilidadPorCliente[clienteSeleccionado] : datosTrazabilidad
    );
    const [categoriasAbiertas, setCategoriasAbiertas] = useState({
      reciclaje: true,
      composta: false,
      reuso: false,
      rellenoSanitario: false
    });
    const [mostrarDropdownReportes, setMostrarDropdownReportes] = useState(false);
    const [mostrarModalInfo, setMostrarModalInfo] = useState(false);
    const [selectedNodeSankey, setSelectedNodeSankey] = useState(null);
    const sankeyRef = useRef(null);

    // Obtener cliente actual
    const clienteActual = clientesConReportes.find(c => c.id === clienteSeleccionado);

    // Actualizar datos cuando cambia el cliente
    // Cerrar dropdown cuando cambia el cliente
    useEffect(() => {
      setMostrarDropdownReportes(false);
    }, [clienteSeleccionado]);

    // Cerrar dropdown al hacer clic fuera
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (mostrarDropdownReportes && !event.target.closest('.dropdown-reportes')) {
          setMostrarDropdownReportes(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [mostrarDropdownReportes]);

    useEffect(() => {
      if (clienteSeleccionado && trazabilidadPorCliente[clienteSeleccionado]) {
        setDatosEditables(JSON.parse(JSON.stringify(trazabilidadPorCliente[clienteSeleccionado])));
      } else {
        setDatosEditables(JSON.parse(JSON.stringify(datosTrazabilidad)));
      }
    }, [clienteSeleccionado]);

    // Generar datos Sankey para el cliente actual
    const datosSankey = clienteActual && datosEditables 
      ? generarDatosSankeyCliente(clienteActual, datosEditables)
      : null;

    // Calcular KPIs
    const calcularTotal = (categoria) => {
      return datosEditables[categoria].reduce((total, item) => {
        const suma = meses.reduce((sum, mes) => sum + (item[mes] || 0), 0);
        return total + suma;
      }, 0);
    };

    const toneladasCirculares = calcularTotal('reciclaje') + calcularTotal('composta') + calcularTotal('reuso');
    const rellenoSanitario = calcularTotal('rellenoSanitario');
    const totalGenerado = toneladasCirculares + rellenoSanitario;
    const porcentajeDesviacion = totalGenerado > 0 ? ((toneladasCirculares / totalGenerado) * 100).toFixed(1) : 0;

    const toggleCategoria = (categoria) => {
      setCategoriasAbiertas(prev => ({
        ...prev,
        [categoria]: !prev[categoria]
      }));
    };

    const actualizarValor = (categoria, indexMaterial, mes, valor) => {
      const nuevoValor = parseFloat(valor) || 0;
      setDatosEditables(prev => {
        const nuevaCategoria = [...prev[categoria]];
        nuevaCategoria[indexMaterial] = {
          ...nuevaCategoria[indexMaterial],
          [mes]: nuevoValor
        };
        return {
          ...prev,
          [categoria]: nuevaCategoria
        };
      });
    };

    const calcularTotalMaterial = (material) => {
      return meses.reduce((sum, mes) => sum + (material[mes] || 0), 0);
    };

    const guardarCambios = () => {
      // Aquí se guardarían los cambios en el backend
      if (clienteSeleccionado) {
        trazabilidadPorCliente[clienteSeleccionado] = datosEditables;
      }
      alert('Cambios guardados exitosamente');
    };

    const descargarReporte = (certificacion, formato) => {
      const cliente = clientesConReportes.find(c => c.id === clienteSeleccionado);
      const nombreCliente = cliente ? cliente.name : 'General';
      alert(`Descargando reporte ${certificacion} de ${nombreCliente} en formato ${formato.toUpperCase()}`);
      setMostrarDropdownReportes(false);
      // Aquí se implementaría la descarga real del reporte específico de la certificación
    };

    const categoriasConfig = [
      { key: 'reciclaje', label: 'RECICLAJE', color: 'bg-green-50 border-green-200' },
      { key: 'composta', label: 'COMPOSTA', color: 'bg-orange-50 border-orange-200' },
      { key: 'reuso', label: 'REUSO', color: 'bg-blue-50 border-blue-200' },
      { key: 'rellenoSanitario', label: 'RELLENO SANITARIO', color: 'bg-red-50 border-red-200' }
    ];

    // Impacto ambiental estimado
    const arbolesSalvados = Math.round(toneladasCirculares * 17);
    const co2Evitado = (toneladasCirculares * 2.5).toFixed(1);
    const aguaAhorrada = Math.round(toneladasCirculares * 26000);

    return (
      <div className="p-4 md:p-6 lg:p-8 bg-[#faf7f2] min-h-screen">
        <div className="max-w-[1400px] mx-auto">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-[#1c2c4a]">{userGreeting}, {currentUserName}</h1>
            <p className="text-sm text-[#6b7280] mt-0.5">Trazabilidad, subproductos y reporteo ambiental</p>
          </div>
          <button
            onClick={() => { setKpiPanelArea('subproductos'); setShowKpiPanel(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#2E7D32] hover:bg-[#1B5E20] text-white rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-md"
          >
            <Target size={16} />
            KPIs del Equipo
          </button>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-[#2E7D32]/10 card-modern p-5" style={{ backgroundColor: 'rgba(46,125,50,0.04)' }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[13px] font-medium text-[#6b7280] mb-1">Toneladas Circulares</div>
                <div className="text-2xl font-bold text-[#1c2c4a]">{toneladasCirculares.toFixed(1)}</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#2E7D32]/10 flex items-center justify-center">
                <Recycle className="text-[#2E7D32]" size={20} />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-[#e5e7eb] card-modern p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[13px] font-medium text-[#6b7280] mb-1">Tasa de Desviación</div>
                <div className="text-2xl font-bold text-[#1c2c4a]">{porcentajeDesviacion}%</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#00a8a8]/10 flex items-center justify-center">
                <TrendingUp className="text-[#00a8a8]" size={20} />
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-[#0D47A1]/10 card-modern p-5" style={{ backgroundColor: 'rgba(13,71,161,0.04)' }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[13px] font-medium text-[#6b7280] mb-1">Clientes Activos</div>
                <div className="text-2xl font-bold text-[#1c2c4a]">{clientesConReportes.length}</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#0D47A1]/10 flex items-center justify-center">
                <Building2 className="text-[#0D47A1]" size={20} />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-[#e5e7eb] card-modern p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[13px] font-medium text-[#6b7280] mb-1">CO2 Evitado</div>
                <div className="text-2xl font-bold text-[#1c2c4a]">{co2Evitado} <span className="text-lg">ton</span></div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#F57C00]/10 flex items-center justify-center">
                <Leaf className="text-[#F57C00]" size={20} />
              </div>
            </div>
          </div>
        </div>

        <SectionHeader color="#2E7D32" icon={Leaf} label="Trazabilidad por Cliente" />

        {/* BARRA SUPERIOR: CLIENTE Y ACCIONES */}
        <div className="bg-white rounded-xl p-5 border border-[#e5e7eb] shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4 flex-1 min-w-[300px]">
              <label className="text-sm font-medium text-[#1c2c4a] whitespace-nowrap">Cliente:</label>
              <select
                value={clienteSeleccionado || ''}
                onChange={(e) => setClienteSeleccionado(parseInt(e.target.value))}
                className="px-4 py-2 border border-[#e5e7eb] rounded-md text-sm font-medium text-[#1c2c4a] focus:outline-none focus:ring-2 focus:ring-[#00a8a8] focus:border-transparent flex-1 max-w-[300px]"
              >
                <option value="">Vista General</option>
                {clientesConReportes.map(cliente => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.logo} {cliente.name}
                  </option>
                ))}
              </select>
              {clienteActual && (
                <div className="flex items-center gap-2 text-sm text-[#6b7280]">
                  <span className="text-xl">{clienteActual.logo}</span>
                  <span>{clienteActual.contacto}</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setClienteSeleccionadoVista(clienteSeleccionado);
                  setVistaCliente(true);
                }}
                className="bg-[#0D47A1] hover:bg-[#0D47A1] text-white px-4 py-2 rounded-md font-medium text-sm shadow-sm hover:shadow-md flex items-center gap-2 transition-all"
                title="Ver como Cliente"
              >
                <Eye size={16} />
                Vista Cliente
              </button>
              
              {/* BOTÓN REPORTES CON DROPDOWN */}
              <div className="relative dropdown-reportes">
                <button
                  onClick={() => setMostrarDropdownReportes(!mostrarDropdownReportes)}
                  className="bg-[#00a8a8] hover:bg-[#008080] text-white px-4 py-2 rounded-md font-medium text-sm shadow-sm hover:shadow-md flex items-center gap-2 transition-all"
                  title="Descargar Reportes por Certificación"
                >
                  <FileText size={16} />
                  REPORTES
                  <ChevronDown size={14} className={mostrarDropdownReportes ? 'transform rotate-180' : ''} />
                </button>
                
                {/* DROPDOWN MENU */}
                {mostrarDropdownReportes && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-[#e5e7eb] z-50 overflow-hidden">
                    <div className="p-3 border-b border-[#e5e7eb] bg-[#f3f4f6]">
                      <h3 className="text-sm font-semibold text-[#1c2c4a]">Reportes por Certificación</h3>
                      <p className="text-xs text-[#6b7280] mt-1">Seleccione una certificación y formato</p>
                    </div>
                    {clienteActual && clienteActual.requisitosReporte && clienteActual.requisitosReporte.length > 0 ? (
                      <div className="max-h-96 overflow-y-auto">
                        {clienteActual.requisitosReporte.map((certificacion, idx) => (
                          <div key={idx} className="border-b border-[#e5e7eb] last:border-b-0">
                            <div className="px-4 py-3 bg-[#f3f4f6]">
                              <div className="flex items-center gap-2">
                                <FileText size={16} className="text-[#00a8a8]" />
                                <span className="text-sm font-semibold text-[#1c2c4a]">{certificacion}</span>
                              </div>
                            </div>
                            <div className="px-4 py-2 space-y-1">
                              <button
                                onClick={() => descargarReporte(certificacion, 'pdf')}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-[#f3f4f6] rounded-md flex items-center gap-2 text-[#6b7280] hover:text-[#1c2c4a] transition-colors"
                              >
                                <FileText size={14} className="text-red-600" />
                                <span>PDF</span>
                              </button>
                              <button
                                onClick={() => descargarReporte(certificacion, 'excel')}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-[#f3f4f6] rounded-md flex items-center gap-2 text-[#6b7280] hover:text-[#1c2c4a] transition-colors"
                              >
                                <Download size={14} className="text-green-600" />
                                <span>Excel</span>
                              </button>
                              <button
                                onClick={() => descargarReporte(certificacion, 'csv')}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-[#f3f4f6] rounded-md flex items-center gap-2 text-[#6b7280] hover:text-[#1c2c4a] transition-colors"
                              >
                                <Download size={14} className="text-blue-600" />
                                <span>CSV</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-sm text-[#6b7280]">
                        No hay certificaciones configuradas para este cliente
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* RESUMEN OPERATIVO DEL CLIENTE - VISTA SIMPLIFICADA */}
        {clienteActual && (
          <div className="mt-6 bg-white rounded-xl border border-[#e5e7eb] shadow-sm">
            <div className="p-4 flex items-center justify-between border-b border-[#e5e7eb]">
              <div className="flex items-center gap-3">
                <div className="text-3xl">{clienteActual.logo}</div>
                <div>
                  <h3 className="text-base font-semibold text-[#1c2c4a]">{clienteActual.name}</h3>
                  <p className="text-xs text-[#6b7280]">{clienteActual.sucursales} sucursales • {clienteActual.contacto}</p>
                </div>
              </div>
              <button
                onClick={() => setMostrarModalInfo(true)}
                className="text-xs text-[#00a8a8] hover:text-[#008080] font-medium flex items-center gap-1.5 px-3 py-1.5 hover:bg-[#f3f4f6] rounded-md"
              >
                <Eye size={14} />
                Ver Detalles
              </button>
            </div>
            
            <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-[#f3f4f6] rounded-lg border border-[#e5e7eb]">
                <div className="text-xs text-[#6b7280] mb-1">Promedio Mensual</div>
                <div className="text-lg font-semibold text-[#1c2c4a]">{clienteActual.promedioMensual}</div>
                <div className="text-xs text-[#6b7280]">ton/mes</div>
              </div>
              
              <div className="text-center p-3 bg-[#f3f4f6] rounded-lg border border-[#e5e7eb]">
                <div className="text-xs text-[#6b7280] mb-1">Tasa Valorización</div>
                <div className="text-lg font-semibold text-[#00a8a8]">{clienteActual.tasaValorizacion}%</div>
                <div className="text-xs text-[#6b7280]">desviación</div>
              </div>
              
              <div className="text-center p-3 bg-[#f3f4f6] rounded-lg border border-[#e5e7eb]">
                <div className="text-xs text-[#6b7280] mb-1">Recolección</div>
                <div className="text-sm font-semibold text-[#1c2c4a]">{clienteActual.frecuenciaRecoleccion}</div>
              </div>
              
              <div className="text-center p-3 bg-[#f3f4f6] rounded-lg border border-[#e5e7eb]">
                <div className="text-xs text-[#6b7280] mb-1">Operando desde</div>
                <div className="text-sm font-semibold text-[#1c2c4a]">
                  {Math.floor((new Date() - new Date(clienteActual.fechaInicioOperacion)) / (1000 * 60 * 60 * 24 * 30))} meses
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* KPIs - Más compactos */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white rounded-xl p-5 border border-[#e5e7eb] shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <Recycle className="text-[#00a8a8]" size={18} />
              <span className="text-xs text-[#6b7280]">Circulares</span>
            </div>
            <div className="text-2xl font-semibold text-[#1c2c4a]">{toneladasCirculares.toFixed(1)}</div>
            <div className="text-xs text-[#6b7280] mt-1">ton</div>
          </div>
          
          <div className="bg-white rounded-xl p-5 border border-[#e5e7eb] shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <Trash2 className="text-red-500" size={18} />
              <span className="text-xs text-[#6b7280]">Relleno</span>
            </div>
            <div className="text-2xl font-semibold text-[#1c2c4a]">{rellenoSanitario.toFixed(1)}</div>
            <div className="text-xs text-[#6b7280] mt-1">ton</div>
          </div>
          
          <div className="bg-white rounded-xl p-5 border border-[#e5e7eb] shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <BarChart3 className="text-blue-500" size={18} />
              <span className="text-xs text-[#6b7280]">Total</span>
            </div>
            <div className="text-2xl font-semibold text-[#1c2c4a]">{totalGenerado.toFixed(1)}</div>
            <div className="text-xs text-[#6b7280] mt-1">ton</div>
          </div>
          
          <div className="bg-white rounded-xl p-5 border border-[#e5e7eb] shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="text-[#00a8a8]" size={18} />
              <span className="text-xs text-[#6b7280]">Desviación</span>
            </div>
            <div className="text-2xl font-semibold text-[#1c2c4a]">{porcentajeDesviacion}%</div>
            <div className="text-xs text-[#6b7280] mt-1">del relleno</div>
          </div>
        </div>

        {/* DIAGRAMA SANKEY - FLUJO DE MATERIALES */}
        {clienteActual && !datosSankey && (
          <div className="mt-6 bg-white rounded-xl border border-[#e5e7eb] shadow-sm p-8 text-center">
            <Recycle className="mx-auto text-[#6b7280] mb-4" size={48} />
            <h3 className="text-lg font-semibold text-[#1c2c4a] mb-2">No hay datos de trazabilidad</h3>
            <p className="text-sm text-[#6b7280]">Agrega datos en la tabla de trazabilidad para visualizar el flujo de materiales.</p>
          </div>
        )}
        {clienteActual && datosSankey && (
          <div className="mt-6 bg-white rounded-xl border border-[#e5e7eb] card-modern p-5">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-semibold text-[#1c2c4a] mb-1">Flujo de Materiales</h3>
                <p className="text-xs text-[#6b7280]">Trazabilidad completa de {clienteActual.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <select 
                  value={selectedNodeSankey || ''} 
                  onChange={(e) => setSelectedNodeSankey(e.target.value || null)}
                  className="px-3 py-1.5 border border-[#e5e7eb] rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-[#00a8a8] focus:border-transparent"
                >
                  <option value="">Todos los nodos</option>
                  {datosSankey.nodes.map(node => (
                    <option key={node.id} value={node.id}>{node.id}</option>
                  ))}
                </select>
                {selectedNodeSankey && (
                  <button
                    onClick={() => setSelectedNodeSankey(null)}
                    className="p-1.5 hover:bg-[#f3f4f6] rounded-md"
                    title="Limpiar filtro"
                  >
                    <RotateCcw size={14} className="text-[#6b7280]" />
                  </button>
                )}
                <button
                  onClick={async () => {
                    if (!sankeyRef.current) return;
                    try {
                      const canvas = await html2canvas(sankeyRef.current, { scale: 2, backgroundColor: '#ffffff' });
                      const link = document.createElement('a');
                      link.download = `flujo-materiales-${clienteActual.name.toLowerCase().replace(/\s+/g, '-')}.png`;
                      link.href = canvas.toDataURL();
                      link.click();
                    } catch (error) {
                      console.error('Error exporting PNG:', error);
                    }
                  }}
                  className="px-3 py-1.5 bg-[#00a8a8] hover:bg-[#1e4a37] text-white rounded-md text-xs font-medium flex items-center gap-1.5"
                >
                  <FileImage size={14} />
                  PNG
                </button>
              </div>
            </div>

            <div ref={sankeyRef} className="h-[500px] bg-white rounded-xl border border-[#e5e7eb]">
              {(() => {
                // Filtrar datos si hay un nodo seleccionado
                let filteredNodes = datosSankey.nodes;
                let filteredLinks = datosSankey.links;
                
                if (selectedNodeSankey) {
                  const relevantNodeIds = new Set([selectedNodeSankey]);
                  const relevantLinks = datosSankey.links.filter(l => 
                    l.source === selectedNodeSankey || l.target === selectedNodeSankey
                  );
                  
                  relevantLinks.forEach(link => {
                    relevantNodeIds.add(link.source);
                    relevantNodeIds.add(link.target);
                  });
                  
                  filteredNodes = datosSankey.nodes.filter(n => relevantNodeIds.has(n.id));
                  filteredLinks = relevantLinks;
                }
                
                return (
                  <ResponsiveSankey
                    data={{
                      nodes: filteredNodes,
                      links: filteredLinks
                    }}
                    margin={{ top: 20, right: 200, bottom: 20, left: 200 }}
                    align="justify"
                    colors={(node) => {
                      const nodeData = filteredNodes.find(n => n.id === node.id);
                      return nodeData?.nodeColor || '#64748b';
                    }}
                    nodeOpacity={1}
                    nodeHoverOpacity={0.8}
                    nodeThickness={18}
                    nodeSpacing={10}
                    nodeBorderWidth={0}
                    linkOpacity={0.5}
                    linkHoverOpacity={0.8}
                    linkContract={0}
                    enableLinkGradient={true}
                    labelPosition="outside"
                    labelOrientation="horizontal"
                    labelPadding={20}
                    labelTextColor="#374151"
                    labelWrap={true}
                    animate={true}
                    motionConfig="gentle"
                    nodeTooltip={({ node }) => {
                      const nodeData = filteredNodes.find(n => n.id === node.id);
                      const nodeIdParts = node.id.split(' (');
                      const nombreDestino = nodeIdParts[0];
                      const registroAmbiental = nodeData?.registroAmbiental || (nodeIdParts[1] ? nodeIdParts[1].replace(')', '') : '');
                      return (
                        <div className="bg-[#1c2c4a] text-white p-2 rounded-md text-xs shadow-lg border border-[#00a8a8]">
                          <div className="font-semibold">{nombreDestino}</div>
                          {registroAmbiental && (
                            <div className="text-[#00a8a8] font-medium mt-1">Registro: {registroAmbiental}</div>
                          )}
                          {node.value && (
                            <div className="text-xs mt-1">
                              <div>Volumen total: {node.value.toFixed(1)} ton</div>
                            </div>
                          )}
                        </div>
                      );
                    }}
                    linkTooltip={({ link }) => {
                      const percentage = datosSankey.totalGenerado > 0 
                        ? ((link.value / datosSankey.totalGenerado) * 100).toFixed(1) 
                        : '0';
                      return (
                        <div className="bg-[#1c2c4a] text-white p-2 rounded-md text-xs shadow-lg border border-[#00a8a8]">
                          <div className="font-semibold">{link.source.id} → {link.target.id}</div>
                          <div className="mt-1">Volumen: {link.value.toFixed(1)} ton/mes</div>
                          <div>Porcentaje: {percentage}%</div>
                        </div>
                      );
                    }}
                    onClick={(data) => {
                      if (data.id) {
                        setSelectedNodeSankey(selectedNodeSankey === data.id ? null : data.id);
                      }
                    }}
                  />
                );
              })()}
            </div>
            
            {selectedNodeSankey && (
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-xs">
                  <Filter size={14} className="text-blue-600" />
                  <span className="font-medium text-blue-800">
                    Filtrando por: {selectedNodeSankey}
                  </span>
                  <button
                    onClick={() => setSelectedNodeSankey(null)}
                    className="ml-auto text-blue-600 hover:text-blue-800 text-xs font-medium"
                  >
                    Limpiar filtro
                  </button>
                </div>
              </div>
            )}

            {/* Métricas del Flujo */}
            <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-[#f3f4f6] rounded-lg p-4 border border-[#e5e7eb] text-center">
                <div className="text-xs text-[#6b7280] mb-1">Total Generado</div>
                <div className="text-lg font-semibold text-[#1c2c4a]">{datosSankey.totalGenerado.toFixed(1)}</div>
                <div className="text-xs text-[#6b7280]">ton/mes</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 border border-green-200 text-center">
                <div className="text-xs text-[#6b7280] mb-1">Composta</div>
                <div className="text-lg font-semibold text-[#00a8a8]">{datosSankey.totalComposta.toFixed(1)}</div>
                <div className="text-xs text-[#6b7280]">ton/mes</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 text-center">
                <div className="text-xs text-[#6b7280] mb-1">Reciclaje</div>
                <div className="text-lg font-semibold text-[#008080]">{datosSankey.totalReciclaje.toFixed(1)}</div>
                <div className="text-xs text-[#6b7280]">ton/mes</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 text-center">
                <div className="text-xs text-[#6b7280] mb-1">Reuso</div>
                <div className="text-lg font-semibold text-[#008080]">{datosSankey.totalReuso.toFixed(1)}</div>
                <div className="text-xs text-[#6b7280]">ton/mes</div>
              </div>
              <div className="bg-red-50 rounded-lg p-4 border border-red-200 text-center">
                <div className="text-xs text-[#6b7280] mb-1">Relleno</div>
                <div className="text-lg font-semibold text-[#DC2626]">{datosSankey.totalRelleno.toFixed(1)}</div>
                <div className="text-xs text-[#6b7280]">ton/mes</div>
              </div>
            </div>
          </div>
        )}

        {/* GRÁFICAS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-6">
          <div className="bg-white rounded-xl p-5 border border-[#e5e7eb] shadow-sm">
            <h3 className="text-base font-semibold text-[#1c2c4a] mb-4">
              Distribución por Destino
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={calcularDistribucionPorDestino(datosEditables)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" stroke="#6b7280" fontSize={12} />
                <YAxis dataKey="mes" type="category" width={50} stroke="#6b7280" fontSize={12} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="Reciclaje" fill="#00a8a8" radius={[0, 4, 4, 0]} />
                <Bar dataKey="Composta" fill="#FF8C00" radius={[0, 4, 4, 0]} />
                <Bar dataKey="Reuso" fill="#008080" radius={[0, 4, 4, 0]} />
                <Bar dataKey="Relleno sanitario" fill="#DC2626" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl p-5 border border-[#e5e7eb] shadow-sm">
            <h3 className="text-base font-semibold text-[#1c2c4a] mb-4">
              Evolución % Desviación
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={calcularEvolucionDesviacion(datosEditables)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="mes" stroke="#6b7280" fontSize={12} />
                <YAxis domain={[0, 100]} stroke="#6b7280" fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="desviacion" stroke="#00a8a8" strokeWidth={2} dot={{ fill: '#00a8a8', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* TABLA INTERACTIVA DE TRAZABILIDAD */}
        <div className="mt-6 bg-white rounded-xl border border-[#e5e7eb] shadow-sm">
          <div className="p-4 border-b border-[#e5e7eb] flex justify-between items-center">
            <h3 className="text-base font-semibold text-[#1c2c4a]">
              Datos de Trazabilidad
            </h3>
            <button
              onClick={guardarCambios}
              className="bg-[#00a8a8] hover:bg-[#1e4a37] text-white px-3 py-1.5 rounded-md font-medium text-xs shadow-sm hover:shadow-md flex items-center gap-1.5"
            >
              <Save size={14} />
              Guardar
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#f3f4f6] border-b border-[#e5e7eb]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#1c2c4a]">Material</th>
                  {meses.map(mes => (
                    <th key={mes} className="px-2 py-3 text-center text-xs font-semibold text-[#1c2c4a] min-w-[60px]">
                      {mes}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center text-xs font-semibold text-[#1c2c4a]">Total</th>
                </tr>
              </thead>
              <tbody>
                {categoriasConfig.map(categoriaConfig => {
                  const categoria = datosEditables[categoriaConfig.key];
                  const estaAbierta = categoriasAbiertas[categoriaConfig.key];
                  
                  return (
                    <React.Fragment key={categoriaConfig.key}>
                      {/* Fila de categoría */}
                      <tr className={`${categoriaConfig.color} border-b border-[#e5e7eb] cursor-pointer`}>
                        <td 
                          colSpan={13}
                          onClick={() => toggleCategoria(categoriaConfig.key)}
                          className="px-4 py-3"
                        >
                          <div className="flex items-center gap-2">
                            {estaAbierta ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            <span className="font-semibold text-sm text-[#1c2c4a]">{categoriaConfig.label}</span>
                          </div>
                        </td>
                      </tr>
                      
                      {/* Filas de materiales (si está abierta) */}
                      {estaAbierta && categoria.map((material, index) => {
                        const total = calcularTotalMaterial(material);
                        return (
                          <tr key={index} className="border-b border-[#e5e7eb] hover:bg-[#f3f4f6]">
                            <td className="px-4 py-2 text-xs font-medium text-[#1c2c4a]">
                              {material.material}
                            </td>
                            {meses.map(mes => (
                              <td key={mes} className="px-1 py-2 text-center">
                                <input
                                  type="number"
                                  value={material[mes] || ''}
                                  onChange={(e) => actualizarValor(categoriaConfig.key, index, mes, e.target.value)}
                                  className="w-full px-1.5 py-1 text-xs text-center border border-[#e5e7eb] rounded focus:outline-none focus:ring-1 focus:ring-[#00a8a8] focus:border-transparent"
                                  min="0"
                                  step="0.1"
                                />
                              </td>
                            ))}
                            <td className="px-4 py-2 text-center text-xs font-semibold text-[#1c2c4a]">
                              {total.toFixed(1)} t
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL DE INFORMACIÓN DETALLADA DEL CLIENTE */}
        {mostrarModalInfo && clienteActual && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setMostrarModalInfo(false)}>
            <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-lg border border-[#e5e7eb]" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-[#e5e7eb] flex items-center justify-between bg-[#00a8a8] text-white rounded-t-lg">
                <div className="flex items-center gap-3">
                  <div className="text-4xl">{clienteActual.logo}</div>
                  <div>
                    <h2 className="text-xl font-semibold">{clienteActual.name}</h2>
                    <p className="text-sm text-[#00b3b3]">{clienteActual.contacto} • {clienteActual.email}</p>
                  </div>
                </div>
                <button onClick={() => setMostrarModalInfo(false)} className="text-white hover:text-[#00b3b3]">
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-6">
                {/* INFORMACIÓN OPERATIVA */}
                <div className="mb-6">
                  <h3 className="text-base font-semibold text-[#1c2c4a] mb-4 flex items-center gap-2">
                    <Calendar size={18} />
                    Información Operativa
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-[#f3f4f6] rounded-lg p-4 border border-[#e5e7eb]">
                      <div className="text-xs text-[#6b7280] font-medium mb-1">Fecha de Inicio</div>
                      <div className="text-sm font-semibold text-[#1c2c4a]">{clienteActual.fechaInicioOperacion}</div>
                      <div className="text-xs text-[#6b7280] mt-1">
                        {Math.floor((new Date() - new Date(clienteActual.fechaInicioOperacion)) / (1000 * 60 * 60 * 24 * 30))} meses operando
                      </div>
                    </div>
                    
                    <div className="bg-[#f3f4f6] rounded-lg p-4 border border-[#e5e7eb]">
                      <div className="text-xs text-[#6b7280] font-medium mb-1">Promedio Mensual</div>
                      <div className="text-sm font-semibold text-[#1c2c4a]">{clienteActual.promedioMensual} ton/mes</div>
                      <div className="text-xs text-[#6b7280] mt-1">Volumen histórico</div>
                    </div>
                    
                    <div className="bg-[#f3f4f6] rounded-lg p-4 border border-[#e5e7eb]">
                      <div className="text-xs text-[#6b7280] font-medium mb-1">Frecuencia</div>
                      <div className="text-sm font-semibold text-[#1c2c4a]">{clienteActual.frecuenciaRecoleccion}</div>
                    </div>
                    
                    <div className="bg-[#f3f4f6] rounded-lg p-4 border border-[#e5e7eb]">
                      <div className="text-xs text-[#6b7280] font-medium mb-1">Tasa Valorización</div>
                      <div className="text-sm font-semibold text-[#00a8a8]">{clienteActual.tasaValorizacion}%</div>
                    </div>
                    
                    <div className="bg-[#f3f4f6] rounded-lg p-4 border border-[#e5e7eb]">
                      <div className="text-xs text-[#6b7280] font-medium mb-1">Sucursales</div>
                      <div className="text-sm font-semibold text-[#1c2c4a]">{clienteActual.sucursales}</div>
                    </div>
                    
                    <div className="bg-[#f3f4f6] rounded-lg p-4 border border-[#e5e7eb]">
                      <div className="text-xs text-[#6b7280] font-medium mb-1">RME Gestionado</div>
                      <div className="text-sm font-semibold text-[#1c2c4a]">{clienteActual.rmeGestionado} ton/mes</div>
                    </div>
                  </div>
                </div>

                {/* TIPOS DE RESIDUOS */}
                <div className="mb-6">
                  <h3 className="text-base font-semibold text-[#1c2c4a] mb-3 flex items-center gap-2">
                    <Package size={18} />
                    Tipos de Residuos Gestionados
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {clienteActual.tiposResiduos.map((tipo, idx) => (
                      <span key={idx} className="px-3 py-1.5 bg-[#f3f4f6] border border-[#e5e7eb] rounded-md text-xs font-medium text-[#1c2c4a]">
                        {tipo}
                      </span>
                    ))}
                  </div>
                </div>

                {/* DESTINOS FINALES */}
                <div>
                  <h3 className="text-base font-semibold text-[#1c2c4a] mb-3 flex items-center gap-2">
                    <MapPin size={18} />
                    Destinos Finales
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="w-3 h-3 rounded-full bg-[#00a8a8] mt-0.5"></div>
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-[#1c2c4a] mb-0.5">Reciclaje</div>
                        <div className="text-xs text-[#6b7280]">{clienteActual.destinosFinales.reciclaje}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="w-3 h-3 rounded-full bg-[#FF8C00] mt-0.5"></div>
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-[#1c2c4a] mb-0.5">Composta</div>
                        <div className="text-xs text-[#6b7280]">{clienteActual.destinosFinales.composta}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="w-3 h-3 rounded-full bg-[#008080] mt-0.5"></div>
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-[#1c2c4a] mb-0.5">Reuso</div>
                        <div className="text-xs text-[#6b7280]">{clienteActual.destinosFinales.reuso}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="w-3 h-3 rounded-full bg-[#DC2626] mt-0.5"></div>
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-[#1c2c4a] mb-0.5">Relleno Sanitario</div>
                        <div className="text-xs text-[#6b7280]">{clienteActual.destinosFinales.rellenoSanitario}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SERVICIOS CONTRATADOS */}
                <div className="mt-6 pt-6 border-t border-[#e5e7eb]">
                  <h3 className="text-base font-semibold text-[#1c2c4a] mb-3 flex items-center gap-2">
                    <CheckSquare size={18} />
                    Servicios Contratados
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {clienteActual.serviciosContratados.map((servicio, idx) => (
                      <span key={idx} className="px-3 py-1.5 bg-[#00a8a8] text-white rounded-md text-xs font-medium">
                        {servicio}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    );
  };

  // VISTA: ADMINISTRACIÓN
  const AdminView = () => (
    <div className="p-6 bg-[#faf7f2] min-h-screen">


      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Usuarios del Sistema */}
        <div className="bg-white rounded-xl border border-[#e5e7eb] card-modern p-5">
          <h3 className="text-base font-semibold text-[#1c2c4a] mb-4 flex items-center gap-2">
            <Users size={18} className="text-[#00a8a8]" />
            Usuarios del Sistema
          </h3>
          <div className="space-y-3">
            {salesTeamData.map(member => (
              <div key={member.id} className="flex items-center justify-between p-3 bg-[#f3f4f6] rounded-lg border border-[#e5e7eb]">
                <div className="flex items-center gap-3">
                  <ExecutiveAvatar codigo={member.codigo} name={member.name} size="md" />
                  <div>
                    <div className="text-sm font-semibold text-[#1c2c4a]">{member.name}</div>
                    <div className="text-xs text-[#6b7280]">{member.role} • {member.zona}</div>
                  </div>
                </div>
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-50 text-green-700 border border-green-200">
                  Activo
                </span>
              </div>
            ))}
          </div>
          <button className="mt-4 w-full py-2.5 border-2 border-dashed border-[#e5e7eb] rounded-lg text-sm font-medium text-[#6b7280] hover:text-[#00a8a8] hover:border-[#00a8a8] transition-colors flex items-center justify-center gap-2">
            <Users size={16} />
            Agregar Usuario
          </button>
        </div>

        {/* Configuración General */}
        <div className="space-y-6">
          {/* Servicios */}
          <div className="bg-white rounded-xl border border-[#e5e7eb] card-modern p-5">
            <h3 className="text-base font-semibold text-[#1c2c4a] mb-4 flex items-center gap-2">
              <Settings size={18} className="text-[#00a8a8]" />
              Servicios Innovative
            </h3>
            <div className="flex flex-wrap gap-2">
              {SERVICIOS_INNOVATIVE.map((servicio, idx) => (
                <span key={idx} className="px-3 py-1.5 bg-[#00a8a8]/10 text-[#00a8a8] rounded-full text-xs font-medium border border-[#00a8a8]/20">
                  {servicio}
                </span>
              ))}
            </div>
          </div>

          {/* Metas KPI */}
          <div className="bg-white rounded-xl border border-[#e5e7eb] card-modern p-5">
            <h3 className="text-base font-semibold text-[#1c2c4a] mb-4 flex items-center gap-2">
              <Target size={18} className="text-[#00a8a8]" />
              Metas de KPIs
            </h3>
            <div className="space-y-3">
              {Object.entries(KPI_METAS).map(([key, kpi]) => (
                <div key={key} className="flex items-center justify-between p-3 bg-[#f3f4f6] rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-[#1c2c4a]">{kpi.label}</div>
                    <div className="text-xs text-[#6b7280]">{kpi.frecuencia}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-[#00a8a8]">{kpi.meta > 0 ? kpi.meta : 'Track'}</span>
                    {kpi.meta > 0 && <span className="text-xs text-[#6b7280]">/{kpi.frecuencia === 'mensual' ? 'mes' : 'sem'}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Info del Sistema */}
          <div className="bg-white rounded-xl border border-[#e5e7eb] card-modern p-5">
            <h3 className="text-base font-semibold text-[#1c2c4a] mb-4 flex items-center gap-2">
              <AlertCircle size={18} className="text-[#00a8a8]" />
              Sistema
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between p-2 bg-[#f3f4f6] rounded">
                <span className="text-[#6b7280]">Versión</span>
                <span className="font-medium text-[#1c2c4a]">2.0.0 — Hub Digital</span>
              </div>
              <div className="flex justify-between p-2 bg-[#f3f4f6] rounded">
                <span className="text-[#6b7280]">Prospectos</span>
                <span className="font-medium text-[#1c2c4a]">{topProspectos.length} registros</span>
              </div>
              <div className="flex justify-between p-2 bg-[#f3f4f6] rounded">
                <span className="text-[#6b7280]">Ejecutivos</span>
                <span className="font-medium text-[#1c2c4a]">{salesTeamData.length} activos</span>
              </div>
              <div className="flex justify-between p-2 bg-[#f3f4f6] rounded">
                <span className="text-[#6b7280]">Base de Datos</span>
                <span className="font-medium text-[#2E7D32]">Neon PostgreSQL</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Modal Detalle Colaborador
  const TeamMemberModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedTeamMember(null)}>
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-lg border border-[#e5e7eb]" onClick={e => e.stopPropagation()}>
        <div className="bg-[#00a8a8] p-6 text-white rounded-t-lg">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <ExecutiveAvatar codigo={selectedTeamMember.codigo} name={selectedTeamMember.name} size="2xl" className="border-2 border-white/30" />
              <div>
                <h2 className="text-2xl font-semibold">{selectedTeamMember.name}</h2>
                <p className="text-[#00b3b3] font-medium text-sm mt-1">{selectedTeamMember.role}</p>
              </div>
            </div>
            <button onClick={() => setSelectedTeamMember(null)} className="text-white hover:text-[#00b3b3]">
              <X size={24} />
            </button>
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-[#f3f4f6] rounded-lg p-5 border border-[#e5e7eb] text-center">
              <div className="text-sm text-[#6b7280] font-medium mb-2">Eficiencia Global</div>
              <div className="text-3xl font-semibold text-[#1c2c4a]">{selectedTeamMember.eficienciaGlobal}%</div>
            </div>
            <div className="bg-[#f3f4f6] rounded-lg p-5 border border-[#e5e7eb] text-center">
              <div className="text-sm text-[#6b7280] font-medium mb-2">Tasa Conversión</div>
              <div className="text-3xl font-semibold text-[#1c2c4a]">{selectedTeamMember.tasaConversion}%</div>
            </div>
            <div className="bg-[#f3f4f6] rounded-lg p-5 border border-[#e5e7eb] text-center">
              <div className="text-sm text-[#6b7280] font-medium mb-2">Cumplimiento Ppto.</div>
              <div className="text-2xl font-semibold text-[#1c2c4a]">{selectedTeamMember.cumplimientoPresupuesto}%</div>
            </div>
          </div>
          
          <div className="bg-[#f3f4f6] border border-[#e5e7eb] rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-[#1c2c4a] mb-4 flex items-center gap-2">
              <TrendingUp size={20} />
              Pipeline Detallado
            </h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-4 text-center border border-[#e5e7eb]">
                <div className="text-2xl font-semibold text-[#1c2c4a]">{selectedTeamMember.leads}</div>
                <div className="text-xs text-[#6b7280] font-medium mt-1">Leads Activos</div>
              </div>
              <div className="bg-white rounded-lg p-4 text-center border border-[#e5e7eb]">
                <div className="text-2xl font-semibold text-[#1c2c4a]">{selectedTeamMember.levantamientos}</div>
                <div className="text-xs text-[#6b7280] font-medium mt-1">Levantamientos</div>
              </div>
              <div className="bg-white rounded-lg p-4 text-center border border-[#e5e7eb]">
                <div className="text-2xl font-semibold text-[#1c2c4a]">{selectedTeamMember.propuestasEnviadas}</div>
                <div className="text-xs text-[#6b7280] font-medium mt-1">Propuestas</div>
              </div>
              <div className="bg-white rounded-lg p-4 text-center border border-[#e5e7eb]">
                <div className="text-2xl font-semibold text-[#00a8a8]">{selectedTeamMember.cierres}</div>
                <div className="text-xs text-[#6b7280] font-medium mt-1">Cierres</div>
              </div>
            </div>
          </div>
          
          <div className="bg-[#f3f4f6] border border-[#e5e7eb] rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-[#1c2c4a] mb-4 flex items-center gap-2">
              <DollarSign size={20} />
              Análisis Presupuestal
            </h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-sm text-[#6b7280] font-medium mb-2">Presupuesto Mensual</div>
                <div className="text-2xl font-semibold text-[#1c2c4a]">
                  ${(selectedTeamMember.presupuestoMensual / 1000).toFixed(0)}k
                </div>
              </div>
              <div>
                <div className="text-sm text-[#6b7280] font-medium mb-2">Ventas Reales</div>
                <div className="text-2xl font-semibold text-[#1c2c4a]">
                  ${(selectedTeamMember.ventasReales / 1000).toFixed(0)}k
                </div>
              </div>
            </div>
            <div className="mt-4 p-4 bg-white rounded-lg border border-[#e5e7eb]">
              <div className="flex justify-between items-center">
                <span className="font-medium text-[#1c2c4a]">Cumplimiento:</span>
                <span className={`text-xl font-semibold ${selectedTeamMember.cumplimientoPresupuesto >= 100 ? 'text-[#00a8a8]' : 'text-orange-600'}`}>
                  {selectedTeamMember.cumplimientoPresupuesto}%
                </span>
              </div>
            </div>
          </div>
          
          <div className="bg-[#f3f4f6] rounded-lg p-6 border border-[#e5e7eb]">
            <h3 className="text-lg font-semibold text-[#1c2c4a] mb-4 flex items-center gap-2">
              <Target size={20} />
              KPIs de Desempeño
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-4 text-center border border-[#e5e7eb]">
                <div className="text-xs text-[#6b7280] font-medium mb-2">Tiempo Respuesta</div>
                <div className="text-xl font-semibold text-[#1c2c4a]">{selectedTeamMember.tiempoRespuesta}</div>
              </div>
              <div className="bg-white rounded-lg p-4 text-center border border-[#e5e7eb]">
                <div className="text-xs text-[#6b7280] font-medium mb-2">Satisfacción Cliente</div>
                <div className="text-xl font-semibold text-[#1c2c4a]">{selectedTeamMember.satisfaccionCliente}/5.0</div>
              </div>
              <div className="bg-white rounded-lg p-4 text-center border border-[#e5e7eb]">
                <div className="text-xs text-[#6b7280] font-medium mb-2">Actividades/Semana</div>
                <div className="text-xl font-semibold text-[#1c2c4a]">{selectedTeamMember.activitiesSemanal}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      <style>{`* { font-family: 'Inter', sans-serif; }`}</style>
      
      {currentView === 'login' ? (
        loginScreenJSX
      ) : (
        <div className="flex h-screen overflow-hidden bg-[#f5f5f5]">
          <Sidebar />
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            {currentView === 'dashboard' && <DashboardView />}
            {currentView === 'hub-ejecutivo' && <EjecutivoHubView />}
            {currentView === 'comercial' && <PipelineComercialView />}
            {currentView === 'operacion' && <LevantamientosView />}
            {currentView === 'trazabilidad' && <TrazabilidadGeneralView />}
            {currentView === 'subproductos' && <TrazabilidadView />}
            {currentView === 'admin' && <AdminView />}
          </div>
        </div>
      )}
      
      {selectedTeamMember && <TeamMemberModal />}

      {/* KPI PANEL - Modal compartido para juntas semanales */}
      {showKpiPanel && kpiPanelArea && (() => {
        const areaConfig = {
          comercial: { label: 'Comercial', color: '#00a8a8', icon: TrendingUp },
          operacion: { label: 'Operación', color: '#F57C00', icon: Truck },
          trazabilidad: { label: 'Trazabilidad', color: '#7C3AED', icon: BarChart3 },
          subproductos: { label: 'Subproductos', color: '#2E7D32', icon: Recycle },
        };
        const config = areaConfig[kpiPanelArea];
        const kpiKeys = Object.keys(KPI_METAS);

        return (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowKpiPanel(false)}>
            <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-[#e5e7eb] px-6 py-4 rounded-t-xl z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${config.color}15` }}>
                      <config.icon size={20} style={{ color: config.color }} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-[#1c2c4a]">KPIs del Equipo — {config.label}</h2>
                      <p className="text-sm text-[#6b7280]">Panel de seguimiento para juntas semanales</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-xs text-[#6b7280] bg-[#f3f4f6] px-3 py-1.5 rounded-full font-medium">
                      {salesTeamData.length} ejecutivos
                    </div>
                    <button
                      onClick={() => setShowKpiPanel(false)}
                      className="w-8 h-8 rounded-full hover:bg-[#f3f4f6] flex items-center justify-center text-[#6b7280] hover:text-[#1c2c4a] transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Resumen Rápido — KPIs + Velocity + Win Rate */}
              <div className="px-6 py-4 bg-[#faf7f2] border-b border-[#e5e7eb]">
                <div className="grid grid-cols-4 lg:grid-cols-7 gap-3">
                  {kpiKeys.map(kpiKey => {
                    const kpi = KPI_METAS[kpiKey];
                    const totalReal = salesTeamData.reduce((sum, m) => {
                      const ultimaSemana = m.kpisSemanales?.[m.kpisSemanales.length - 1];
                      return sum + (ultimaSemana?.[kpiKey] || 0);
                    }, 0);
                    const totalMeta = kpi.meta > 0 ? kpi.meta * salesTeamData.length : 0;
                    const pct = totalMeta > 0 ? (totalReal / totalMeta) * 100 : 0;
                    return (
                      <div key={kpiKey} className="bg-white rounded-lg border border-[#e5e7eb] p-3 text-center">
                        <div className="text-[11px] text-[#6b7280] mb-1">{kpi.label}</div>
                        <div className="text-xl font-bold text-[#1c2c4a]">{totalReal}</div>
                        {totalMeta > 0 && (
                          <>
                            <div className="w-full h-1.5 bg-[#e5e7eb] rounded-full overflow-hidden mt-1.5 relative">
                              <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: getBarColor(pct) }} />
                            </div>
                            <div className={`text-[11px] font-semibold mt-1`} style={{ color: getBarColor(pct) }}>
                              {pct.toFixed(0)}% de meta
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                  {/* Pipeline Velocity */}
                  <div className="bg-white rounded-lg border border-[#e5e7eb] p-3 text-center">
                    <div className="text-[11px] text-[#6b7280] mb-1">Velocidad Pipeline</div>
                    <div className="text-xl font-bold text-[#0D47A1]">${(calcularPipelineVelocity(kanbanProspectos) / 1000).toFixed(0)}K</div>
                    <div className="text-[11px] text-[#6b7280] mt-1">MXN/dia</div>
                  </div>
                  {/* Win Rate */}
                  <div className="bg-white rounded-lg border border-[#e5e7eb] p-3 text-center">
                    <div className="text-[11px] text-[#6b7280] mb-1">Win Rate</div>
                    <div className="text-xl font-bold" style={{ color: calcularWinRate(kanbanProspectos) >= 30 ? '#2E7D32' : '#F57C00' }}>{calcularWinRate(kanbanProspectos).toFixed(0)}%</div>
                    <div className="text-[11px] text-[#6b7280] mt-1">ganadas/total</div>
                  </div>
                </div>
              </div>

              {/* Tabla de KPIs por Ejecutivo — Ranked Leaderboard */}
              <div className="px-6 py-4">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-[#e5e7eb]">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wider w-[200px]">Ejecutivo</th>
                        {kpiKeys.map(kpiKey => (
                          <th key={kpiKey} className="px-2 py-3 text-center text-xs font-semibold text-[#6b7280] uppercase tracking-wider">
                            {KPI_METAS[kpiKey].label}
                            {KPI_METAS[kpiKey].meta > 0 && (
                              <div className="text-[10px] font-normal text-[#9ca3af] mt-0.5">Meta: {KPI_METAS[kpiKey].meta}/{KPI_METAS[kpiKey].frecuencia === 'mensual' ? 'mes' : 'sem'}</div>
                            )}
                          </th>
                        ))}
                        <th className="px-2 py-3 text-center text-xs font-semibold text-[#6b7280] uppercase tracking-wider">Tendencia</th>
                        <th className="px-2 py-3 text-center text-xs font-semibold text-[#6b7280] uppercase tracking-wider">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesTeamData
                        .map(member => ({
                          ...member,
                          _ultimaSemana: member.kpisSemanales?.[member.kpisSemanales.length - 1],
                          _penultimaSemana: member.kpisSemanales?.[member.kpisSemanales.length - 2],
                          _score: calcularScorePonderado(member.kpisSemanales?.[member.kpisSemanales.length - 1]),
                        }))
                        .sort((a, b) => b._score - a._score)
                        .map((member, rankIdx) => {
                        const ultimaSemana = member._ultimaSemana;
                        const penultimaSemana = member._penultimaSemana;
                        const score = member._score;
                        const scoreColor = score > 0 ? getScoreColor(score) : null;
                        const rank = rankIdx + 1;

                        return (
                          <React.Fragment key={member.id}>
                          <tr className="border-b border-[#e5e7eb] hover:bg-[#f3f4f6]/50 transition-colors cursor-pointer" onClick={() => setKpiSelectedEjecutivo(kpiSelectedEjecutivo?.id === member.id ? null : member)}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                {/* Rank badge */}
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                                  rank === 1 ? 'bg-amber-400 text-white' :
                                  rank === 2 ? 'bg-gray-300 text-white' :
                                  rank === 3 ? 'bg-amber-600 text-white' :
                                  'bg-[#f3f4f6] text-[#9ca3af]'
                                }`}>
                                  {rank}
                                </div>
                                <ExecutiveAvatar codigo={member.codigo} name={member.name} size="sm" />
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold text-[#1c2c4a] flex items-center gap-1.5 truncate">{member.name.split(' ').slice(0, 2).join(' ')}
                                    <ChevronRight size={12} className={`text-[#6b7280] transition-transform flex-shrink-0 ${kpiSelectedEjecutivo?.id === member.id ? 'rotate-90' : ''}`} />
                                  </div>
                                  <div className="text-[11px] text-[#9ca3af]">{member.zona}</div>
                                </div>
                              </div>
                            </td>
                            {kpiKeys.map(kpiKey => {
                              const real = ultimaSemana?.[kpiKey] || 0;
                              const prevReal = penultimaSemana?.[kpiKey] || 0;
                              const meta = KPI_METAS[kpiKey].meta;
                              const pct = meta > 0 ? (real / meta) * 100 : 0;
                              const diff = real - prevReal;
                              const pace = calcularPace(real, meta, KPI_METAS[kpiKey].frecuencia);

                              return (
                                <td key={kpiKey} className="px-2 py-3 text-center">
                                  <div className="flex flex-col items-center gap-0.5">
                                    <span className={`text-sm font-bold ${
                                      meta === 0 ? 'text-[#1c2c4a]' : ''
                                    }`} style={meta > 0 ? { color: getBarColor(pct) } : undefined}>
                                      {real}{meta > 0 ? `/${meta}` : ''}
                                    </span>
                                    {/* Bullet-chart progress bar */}
                                    {meta > 0 && (
                                      <div className="w-20 h-2 bg-[#e5e7eb] rounded-full overflow-hidden relative">
                                        <div
                                          className="h-full rounded-full transition-all"
                                          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: getBarColor(pct) }}
                                        />
                                        {/* 100% target marker */}
                                        <div className="absolute top-0 h-full w-0.5 bg-[#1c2c4a]/30 rounded" style={{ left: '100%', transform: 'translateX(-1px)' }} />
                                      </div>
                                    )}
                                    {/* Pace indicator + diff */}
                                    <div className="flex items-center gap-1.5">
                                      {pace !== null && (
                                        <span className={`text-[10px] font-medium ${pace >= 0 ? 'text-[#2E7D32]' : 'text-[#EF4444]'}`}>
                                          {pace >= 0 ? 'adelante' : 'atras'}
                                        </span>
                                      )}
                                      {diff !== 0 && penultimaSemana && (
                                        <span className={`text-[10px] font-semibold ${diff > 0 ? 'text-[#2E7D32]' : 'text-[#EF4444]'}`}>
                                          {diff > 0 ? '+' : ''}{diff}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              );
                            })}
                            {/* SVG Sparkline trend */}
                            <td className="px-2 py-3">
                              <div className="flex justify-center">
                                <Sparkline
                                  data={(member.kpisSemanales || []).slice(-8).map(s => (s.leadsNuevos || 0) + (s.reunionesAgendadas || 0) + (s.levantamientos || 0))}
                                  width={80}
                                  height={28}
                                  color={config.color}
                                />
                              </div>
                            </td>
                            {/* Weighted Score with 4-tier colors */}
                            <td className="px-2 py-3 text-center">
                              {score > 0 ? (
                                <div className="flex flex-col items-center gap-1">
                                  <div
                                    className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-bold"
                                    style={{ backgroundColor: scoreColor.bgLight, color: scoreColor.text }}
                                  >
                                    {score.toFixed(0)}%
                                  </div>
                                  <span className="text-[9px] font-medium" style={{ color: scoreColor.text }}>{scoreColor.label}</span>
                                </div>
                              ) : (
                                <span className="text-xs text-[#9ca3af]">—</span>
                              )}
                            </td>
                          </tr>
                          {/* Expandible: Leads y Prospectos del Ejecutivo */}
                          {kpiSelectedEjecutivo?.id === member.id && (() => {
                            const memberProspectos = kanbanProspectos.filter(p => p.ejecutivo === member.codigo);
                            const memberLeads = memberProspectos.filter(p => ['Lead nuevo', 'Reunión agendada'].includes(p.status));
                            const memberProsp = memberProspectos.filter(p => !['Lead nuevo', 'Reunión agendada', 'Propuesta Rechazada'].includes(p.status));
                            const memberRechazadas = memberProspectos.filter(p => p.status === 'Propuesta Rechazada');
                            return (
                              <tr>
                                <td colSpan={kpiKeys.length + 3} className="p-0">
                                  <div className="bg-[#faf7f2] border-b border-[#e5e7eb] px-6 py-4" onClick={e => e.stopPropagation()}>
                                    {/* Summary pills */}
                                    <div className="flex items-center gap-3 mb-4">
                                      <div className="flex items-center gap-2 bg-[#6b7280]/10 px-3 py-1.5 rounded-full">
                                        <div className="w-2 h-2 rounded-full bg-[#6b7280]"></div>
                                        <span className="text-xs font-semibold text-[#6b7280]">{memberLeads.length} Leads</span>
                                      </div>
                                      <div className="flex items-center gap-2 bg-[#00a8a8]/10 px-3 py-1.5 rounded-full">
                                        <div className="w-2 h-2 rounded-full bg-[#00a8a8]"></div>
                                        <span className="text-xs font-semibold text-[#00a8a8]">{memberProsp.length} Prospectos</span>
                                      </div>
                                      {memberRechazadas.length > 0 && (
                                        <div className="flex items-center gap-2 bg-red-500/10 px-3 py-1.5 rounded-full">
                                          <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                          <span className="text-xs font-semibold text-red-500">{memberRechazadas.length} Rechazadas</span>
                                        </div>
                                      )}
                                      <div className="ml-auto text-xs font-bold text-[#0D47A1]">
                                        Pipeline: ${(memberProspectos.reduce((s, p) => s + (p.propuesta?.ventaTotal || p.facturacionEstimada || 0), 0) / 1000000).toFixed(1)}M
                                      </div>
                                    </div>

                                    {/* Leads */}
                                    {memberLeads.length > 0 && (
                                      <div className="mb-4">
                                        <h4 className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-2">Leads ({memberLeads.length})</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                          {memberLeads.map(lead => {
                                            const stage = KANBAN_STAGES.find(s => s.id === lead.status);
                                            const comentarios = ejecutivoComentarios[lead.id] || [];
                                            return (
                                              <div key={lead.id} className="bg-white rounded-lg border border-[#e5e7eb] p-3">
                                                <div className="flex items-start justify-between mb-1">
                                                  <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-semibold text-[#1c2c4a] truncate">{lead.empresa}</div>
                                                    <div className="text-xs text-[#6b7280]">{lead.industria} {lead.ciudad ? `• ${lead.ciudad.split(',')[0]}` : ''}</div>
                                                  </div>
                                                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ml-2" style={{ backgroundColor: `${stage?.color}15`, color: stage?.color }}>{stage?.label}</span>
                                                </div>
                                                {/* Comentarios */}
                                                {comentarios.length > 0 && (
                                                  <div className="mt-2 space-y-1">
                                                    {comentarios.slice(-2).map((c, i) => (
                                                      <div key={i} className="text-[11px] text-[#6b7280] bg-[#f3f4f6] rounded px-2 py-1 italic">"{c.text}" <span className="text-[10px] text-[#6b7280]/60">— {c.date}</span></div>
                                                    ))}
                                                  </div>
                                                )}
                                                {/* Add comment */}
                                                <div className="mt-2 flex gap-1.5">
                                                  <input
                                                    type="text"
                                                    placeholder="Agregar nota..."
                                                    className="flex-1 text-xs border border-[#e5e7eb] rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#00a8a8] bg-white"
                                                    onClick={e => e.stopPropagation()}
                                                    onKeyDown={e => {
                                                      if (e.key === 'Enter' && e.target.value.trim()) {
                                                        const txt = e.target.value.trim();
                                                        setEjecutivoComentarios(prev => ({
                                                          ...prev,
                                                          [lead.id]: [...(prev[lead.id] || []), { text: txt, date: new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) }]
                                                        }));
                                                        e.target.value = '';
                                                      }
                                                    }}
                                                  />
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}

                                    {/* Prospectos */}
                                    {memberProsp.length > 0 && (
                                      <div className="mb-4">
                                        <h4 className="text-xs font-semibold text-[#00a8a8] uppercase tracking-wider mb-2">Prospectos ({memberProsp.length})</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                          {memberProsp.map(prosp => {
                                            const stage = KANBAN_STAGES.find(s => s.id === prosp.status);
                                            const valor = prosp.propuesta?.ventaTotal || prosp.facturacionEstimada || 0;
                                            const comentarios = ejecutivoComentarios[prosp.id] || [];
                                            return (
                                              <div key={prosp.id} className="bg-white rounded-lg border border-[#e5e7eb] p-3">
                                                <div className="flex items-start justify-between mb-1">
                                                  <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-semibold text-[#1c2c4a] truncate">{prosp.empresa}</div>
                                                    <div className="text-xs text-[#6b7280]">
                                                      {prosp.industria} {prosp.ciudad ? `• ${prosp.ciudad.split(',')[0]}` : ''}
                                                      {valor > 0 && <span className="font-bold text-[#0D47A1] ml-2">${(valor / 1000000).toFixed(2)}M</span>}
                                                    </div>
                                                  </div>
                                                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ml-2" style={{ backgroundColor: `${stage?.color}15`, color: stage?.color }}>{stage?.label}</span>
                                                </div>
                                                {/* Servicios */}
                                                {prosp.servicios && prosp.servicios.length > 0 && (
                                                  <div className="flex flex-wrap gap-1 mt-1">
                                                    {prosp.servicios.slice(0, 3).map(s => (
                                                      <span key={s} className="text-[9px] bg-[#f3f4f6] text-[#6b7280] px-1.5 py-0.5 rounded">{SERVICIOS_INNOVATIVE.find(si => si.id === s)?.nombre || s}</span>
                                                    ))}
                                                    {prosp.servicios.length > 3 && <span className="text-[9px] text-[#6b7280]">+{prosp.servicios.length - 3}</span>}
                                                  </div>
                                                )}
                                                {/* Comentarios */}
                                                {comentarios.length > 0 && (
                                                  <div className="mt-2 space-y-1">
                                                    {comentarios.slice(-2).map((c, i) => (
                                                      <div key={i} className="text-[11px] text-[#6b7280] bg-[#f3f4f6] rounded px-2 py-1 italic">"{c.text}" <span className="text-[10px] text-[#6b7280]/60">— {c.date}</span></div>
                                                    ))}
                                                  </div>
                                                )}
                                                {/* Add comment */}
                                                <div className="mt-2 flex gap-1.5">
                                                  <input
                                                    type="text"
                                                    placeholder="Agregar nota..."
                                                    className="flex-1 text-xs border border-[#e5e7eb] rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#00a8a8] bg-white"
                                                    onClick={e => e.stopPropagation()}
                                                    onKeyDown={e => {
                                                      if (e.key === 'Enter' && e.target.value.trim()) {
                                                        const txt = e.target.value.trim();
                                                        setEjecutivoComentarios(prev => ({
                                                          ...prev,
                                                          [prosp.id]: [...(prev[prosp.id] || []), { text: txt, date: new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) }]
                                                        }));
                                                        e.target.value = '';
                                                      }
                                                    }}
                                                  />
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}

                                    {/* Rechazadas (collapsed) */}
                                    {memberRechazadas.length > 0 && (
                                      <div>
                                        <h4 className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-2">Rechazadas ({memberRechazadas.length})</h4>
                                        <div className="flex flex-wrap gap-2">
                                          {memberRechazadas.map(r => (
                                            <div key={r.id} className="bg-white rounded-md border border-red-200 px-3 py-2 text-xs">
                                              <span className="font-medium text-[#1c2c4a]">{r.empresa}</span>
                                              <span className="text-[#6b7280] ml-1">— {r.motivoRechazo || 'Sin motivo'}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })()}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer - Resumen Junta with score distribution */}
              <div className="px-6 py-4 bg-[#f3f4f6] border-t border-[#e5e7eb] rounded-b-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    {(() => {
                      const scores = salesTeamData.map(m => calcularScorePonderado(m.kpisSemanales?.[m.kpisSemanales.length - 1])).filter(s => s > 0);
                      const destacados = scores.filter(s => s >= 110).length;
                      const enMeta = scores.filter(s => s >= 90 && s < 110).length;
                      const enRiesgo = scores.filter(s => s >= 70 && s < 90).length;
                      const fueraDeMeta = scores.filter(s => s < 70).length;
                      const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
                      return (
                        <>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-[#1c2c4a]">Score promedio: <span className="font-bold" style={{ color: getScoreColor(avgScore).text }}>{avgScore.toFixed(0)}%</span></span>
                          </div>
                          <div className="flex items-center gap-2">
                            {destacados > 0 && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(27,94,32,0.10)', color: '#1B5E20' }}>{destacados} Destacado{destacados > 1 ? 's' : ''}</span>}
                            {enMeta > 0 && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(46,125,50,0.10)', color: '#2E7D32' }}>{enMeta} En Meta</span>}
                            {enRiesgo > 0 && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(245,124,0,0.10)', color: '#F57C00' }}>{enRiesgo} En Riesgo</span>}
                            {fueraDeMeta > 0 && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(239,68,68,0.10)', color: '#EF4444' }}>{fueraDeMeta} Fuera</span>}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  <button
                    onClick={() => setShowKpiPanel(false)}
                    className="px-4 py-2 bg-white border border-[#e5e7eb] rounded-lg text-sm font-medium text-[#6b7280] hover:text-[#1c2c4a] hover:bg-[#f3f4f6] transition-colors"
                  >
                    Cerrar Panel
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL DE LEVANTAMIENTO */}
      {mostrarLevantamiento && selectedLevantamiento && (() => {
        const levantamientoDetalle = levantamientosDetallados.find(d => d.id === selectedLevantamiento.id) || selectedLevantamiento;
        const info = levantamientoDetalle.informacionGeneral || {};
        const tiposResiduos = levantamientoDetalle.tiposResiduos || [];
        const generacion = levantamientoDetalle.generacion || {};
        const serviciosActuales = levantamientoDetalle.serviciosActuales || {};
        const infraestructura = levantamientoDetalle.infraestructura || {};
        const necesidades = levantamientoDetalle.necesidades || {};
        const observaciones = levantamientoDetalle.observaciones || '';

        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setMostrarLevantamiento(false)}>
            <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-lg border border-[#e5e7eb]" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-[#e5e7eb] flex items-center justify-between bg-[#00a8a8] text-white rounded-t-lg">
                <div>
                  <h2 className="text-xl font-semibold">Resultados del Levantamiento</h2>
                  <p className="text-sm text-white/90 mt-1">{selectedLevantamiento.cliente}</p>
                </div>
                <button onClick={() => setMostrarLevantamiento(false)} className="text-white hover:text-white/80">
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                {/* INFORMACIÓN GENERAL */}
                <div className="bg-[#f3f4f6] rounded-lg p-5 border border-[#e5e7eb]">
                  <h3 className="text-lg font-semibold text-[#1c2c4a] mb-4 flex items-center gap-2">
                    <Building2 size={20} />
                    Información General
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-[#6b7280] font-medium mb-1">Cliente</label>
                      <div className="text-sm font-semibold text-[#1c2c4a]">{selectedLevantamiento.cliente}</div>
                    </div>
                    <div>
                      <label className="block text-xs text-[#6b7280] font-medium mb-1">Razón Social</label>
                      <div className="text-sm text-[#1c2c4a]">{info.razonSocial || 'N/A'}</div>
                    </div>
                    <div>
                      <label className="block text-xs text-[#6b7280] font-medium mb-1">RFC</label>
                      <div className="text-sm text-[#1c2c4a]">{info.rfc || 'N/A'}</div>
                    </div>
                    <div>
                      <label className="block text-xs text-[#6b7280] font-medium mb-1">Contacto Principal</label>
                      <div className="text-sm text-[#1c2c4a]">{info.contacto || selectedLevantamiento.ejecutivo}</div>
                    </div>
                    <div>
                      <label className="block text-xs text-[#6b7280] font-medium mb-1">Teléfono</label>
                      <div className="text-sm text-[#1c2c4a]">{info.telefono || 'N/A'}</div>
                    </div>
                    <div>
                      <label className="block text-xs text-[#6b7280] font-medium mb-1">Email</label>
                      <div className="text-sm text-[#1c2c4a]">{info.email || 'N/A'}</div>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-[#6b7280] font-medium mb-1">Dirección</label>
                      <div className="text-sm text-[#1c2c4a]">{info.direccion || 'N/A'}</div>
                    </div>
                    <div>
                      <label className="block text-xs text-[#6b7280] font-medium mb-1">Superficie</label>
                      <div className="text-sm text-[#1c2c4a]">{info.superficie || 'N/A'}</div>
                    </div>
                    <div>
                      <label className="block text-xs text-[#6b7280] font-medium mb-1">Número de Empleados</label>
                      <div className="text-sm text-[#1c2c4a]">{info.numeroEmpleados || 'N/A'}</div>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-[#6b7280] font-medium mb-1">Horario de Operación</label>
                      <div className="text-sm text-[#1c2c4a]">{info.horarioOperacion || 'N/A'}</div>
                    </div>
                    {info.requisitosReporte && info.requisitosReporte.length > 0 && (
                      <div className="col-span-2">
                        <label className="block text-xs text-[#6b7280] font-medium mb-2">Requisitos de Reporte / Estándares</label>
                        <div className="flex flex-wrap gap-2">
                          {info.requisitosReporte.map((requisito, idx) => (
                            <span key={idx} className="px-3 py-1.5 bg-[#0D47A1] text-white text-xs font-medium rounded-md border border-[#0D47A1]">
                              {requisito}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-[#6b7280] mt-2 italic">
                          Estos estándares serán considerados en la generación de reportes personalizados para el cliente
                        </p>
                      </div>
                    )}
                    <div>
                      <label className="block text-xs text-[#6b7280] font-medium mb-1">Ejecutivo</label>
                      <div className="text-sm font-semibold text-[#1c2c4a]">{selectedLevantamiento.ejecutivo}</div>
                    </div>
                    <div>
                      <label className="block text-xs text-[#6b7280] font-medium mb-1">Fecha</label>
                      <div className="text-sm font-semibold text-[#1c2c4a]">{selectedLevantamiento.fecha}</div>
                    </div>
                    <div>
                      <label className="block text-xs text-[#6b7280] font-medium mb-1">Volumen Estimado</label>
                      <div className="text-sm font-semibold text-[#0D47A1]">{selectedLevantamiento.volumenEstimado}</div>
                    </div>
                    <div>
                      <label className="block text-xs text-[#6b7280] font-medium mb-1">Valor Estimado</label>
                      <div className="text-sm font-semibold text-[#1c2c4a]">
                        ${(selectedLevantamiento.valorEstimado / 1000).toFixed(0)}k
                      </div>
                    </div>
                  </div>
                </div>

                {/* TIPOS DE RESIDUOS */}
                {tiposResiduos.length > 0 && (
                  <div className="bg-white rounded-lg p-5 border border-[#e5e7eb]">
                    <h3 className="text-lg font-semibold text-[#1c2c4a] mb-4 flex items-center gap-2">
                      <Recycle size={20} />
                      Tipos de Residuos
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-[#f3f4f6] border-b border-[#e5e7eb]">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-[#6b7280]">Tipo</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-[#6b7280]">Cantidad</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-[#6b7280]">Porcentaje</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-[#6b7280]">Destino Actual</th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-[#6b7280]">Costo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tiposResiduos.map((residuo, idx) => (
                            <tr key={idx} className="border-b border-[#e5e7eb]">
                              <td className="px-4 py-3 text-sm font-semibold text-[#1c2c4a]">{residuo.tipo}</td>
                              <td className="px-4 py-3 text-sm text-[#1c2c4a]">{residuo.cantidad}</td>
                              <td className="px-4 py-3 text-sm text-[#6b7280]">{residuo.porcentaje}%</td>
                              <td className="px-4 py-3 text-sm text-[#6b7280]">{residuo.destino}</td>
                              <td className="px-4 py-3 text-sm text-right font-semibold text-[#1c2c4a]">${residuo.costo?.toLocaleString() || '0'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* PATRONES DE GENERACIÓN */}
                {(generacion.frecuencia || generacion.volumenMensual) && (
                  <div className="bg-white rounded-lg p-5 border border-[#e5e7eb]">
                    <h3 className="text-lg font-semibold text-[#1c2c4a] mb-4 flex items-center gap-2">
                      <TrendingUp size={20} />
                      Patrones de Generación
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-[#6b7280] font-medium mb-1">Frecuencia de Generación</label>
                        <div className="text-sm text-[#1c2c4a]">{generacion.frecuencia || 'N/A'}</div>
                      </div>
                      <div>
                        <label className="block text-xs text-[#6b7280] font-medium mb-1">Días por Semana</label>
                        <div className="text-sm text-[#1c2c4a]">{generacion.diasSemana || 'N/A'}</div>
                      </div>
                      <div>
                        <label className="block text-xs text-[#6b7280] font-medium mb-1">Volumen Diario</label>
                        <div className="text-sm text-[#1c2c4a]">{generacion.volumenDiario || 'N/A'}</div>
                      </div>
                      <div>
                        <label className="block text-xs text-[#6b7280] font-medium mb-1">Volumen Semanal</label>
                        <div className="text-sm text-[#1c2c4a]">{generacion.volumenSemanal || 'N/A'}</div>
                      </div>
                      <div>
                        <label className="block text-xs text-[#6b7280] font-medium mb-1">Volumen Mensual</label>
                        <div className="text-sm font-semibold text-[#0D47A1]">{generacion.volumenMensual || 'N/A'}</div>
                      </div>
                      <div>
                        <label className="block text-xs text-[#6b7280] font-medium mb-1">Horarios de Recolección</label>
                        <div className="text-sm text-[#1c2c4a]">
                          {generacion.horariosRecoleccion ? generacion.horariosRecoleccion.join(', ') : 'N/A'}
                        </div>
                      </div>
                      {generacion.variacionesEstacionales && (
                        <div className="col-span-2">
                          <label className="block text-xs text-[#6b7280] font-medium mb-1">Variaciones Estacionales</label>
                          <div className="text-sm text-[#1c2c4a]">{generacion.variacionesEstacionales}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* SERVICIOS ACTUALES */}
                {(serviciosActuales.proveedor || serviciosActuales.costoMensual) && (
                  <div className="bg-white rounded-lg p-5 border border-[#e5e7eb]">
                    <h3 className="text-lg font-semibold text-[#1c2c4a] mb-4 flex items-center gap-2">
                      <FileText size={20} />
                      Servicios Actuales
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-[#6b7280] font-medium mb-1">Proveedor Actual</label>
                        <div className="text-sm text-[#1c2c4a]">{serviciosActuales.proveedor || 'N/A'}</div>
                      </div>
                      <div>
                        <label className="block text-xs text-[#6b7280] font-medium mb-1">Costo Mensual Actual</label>
                        <div className="text-sm font-semibold text-[#1c2c4a]">
                          ${serviciosActuales.costoMensual ? serviciosActuales.costoMensual.toLocaleString() : 'N/A'}
                        </div>
                      </div>
                      {serviciosActuales.fechaVencimiento && (
                        <div>
                          <label className="block text-xs text-[#6b7280] font-medium mb-1">Fecha Vencimiento Contrato</label>
                          <div className="text-sm text-[#1c2c4a]">{serviciosActuales.fechaVencimiento}</div>
                        </div>
                      )}
                      {serviciosActuales.satisfaccion !== undefined && (
                        <div>
                          <label className="block text-xs text-[#6b7280] font-medium mb-1">Nivel de Satisfacción</label>
                          <div className="text-sm text-[#1c2c4a]">{serviciosActuales.satisfaccion}/10</div>
                        </div>
                      )}
                      {serviciosActuales.razonCambio && (
                        <div className="col-span-2">
                          <label className="block text-xs text-[#6b7280] font-medium mb-1">Razón de Cambio</label>
                          <div className="text-sm text-[#1c2c4a]">{serviciosActuales.razonCambio}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* INFRAESTRUCTURA */}
                {(infraestructura.areaAlmacenamiento || infraestructura.numeroContenedores) && (
                  <div className="bg-white rounded-lg p-5 border border-[#e5e7eb]">
                    <h3 className="text-lg font-semibold text-[#1c2c4a] mb-4 flex items-center gap-2">
                      <Building2 size={20} />
                      Infraestructura
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-[#6b7280] font-medium mb-1">Área de Almacenamiento</label>
                        <div className="text-sm text-[#1c2c4a]">{infraestructura.areaAlmacenamiento || 'N/A'}</div>
                      </div>
                      <div>
                        <label className="block text-xs text-[#6b7280] font-medium mb-1">Número de Contenedores</label>
                        <div className="text-sm text-[#1c2c4a]">{infraestructura.numeroContenedores || 'N/A'}</div>
                      </div>
                      <div>
                        <label className="block text-xs text-[#6b7280] font-medium mb-1">Tipo de Almacenamiento</label>
                        <div className="text-sm text-[#1c2c4a]">{infraestructura.tipoAlmacenamiento || 'N/A'}</div>
                      </div>
                      <div>
                        <label className="block text-xs text-[#6b7280] font-medium mb-1">Acceso para Vehículos</label>
                        <div className="text-sm text-[#1c2c4a]">{infraestructura.accesoVehiculos || 'N/A'}</div>
                      </div>
                      {infraestructura.restriccionesHorario && (
                        <div className="col-span-2">
                          <label className="block text-xs text-[#6b7280] font-medium mb-1">Restricciones de Horario</label>
                          <div className="text-sm text-[#1c2c4a]">{infraestructura.restriccionesHorario}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* NECESIDADES Y OBJETIVOS */}
                {(necesidades.serviciosRequeridos || necesidades.presupuestoDisponible) && (
                  <div className="bg-white rounded-lg p-5 border border-[#e5e7eb]">
                    <h3 className="text-lg font-semibold text-[#1c2c4a] mb-4 flex items-center gap-2">
                      <Target size={20} />
                      Necesidades y Objetivos
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      {necesidades.serviciosRequeridos && (
                        <div className="col-span-2">
                          <label className="block text-xs text-[#6b7280] font-medium mb-2">Servicios Requeridos</label>
                          <div className="flex flex-wrap gap-2">
                            {necesidades.serviciosRequeridos.map((servicio, idx) => (
                              <span key={idx} className="px-3 py-1 bg-[#00a8a8] text-white text-xs rounded-md">
                                {servicio}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {necesidades.presupuestoDisponible && (
                        <div>
                          <label className="block text-xs text-[#6b7280] font-medium mb-1">Presupuesto Disponible (mensual)</label>
                          <div className="text-sm font-semibold text-[#1c2c4a]">
                            ${necesidades.presupuestoDisponible.toLocaleString()}
                          </div>
                        </div>
                      )}
                      {necesidades.urgencia && (
                        <div>
                          <label className="block text-xs text-[#6b7280] font-medium mb-1">Urgencia</label>
                          <div className="text-sm text-[#1c2c4a]">{necesidades.urgencia}</div>
                        </div>
                      )}
                      {necesidades.objetivosAmbientales && (
                        <div className="col-span-2">
                          <label className="block text-xs text-[#6b7280] font-medium mb-1">Objetivos Ambientales</label>
                          <div className="text-sm text-[#1c2c4a]">{necesidades.objetivosAmbientales}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* OBSERVACIONES */}
                {observaciones && (
                  <div className="bg-blue-50 rounded-lg p-5 border border-blue-200">
                    <h3 className="text-lg font-semibold text-[#1c2c4a] mb-2 flex items-center gap-2">
                      <FileText size={20} />
                      Observaciones
                    </h3>
                    <div className="text-sm text-[#1c2c4a] whitespace-pre-line">{observaciones}</div>
                  </div>
                )}

                {/* SIGUIENTE PASO */}
                {selectedLevantamiento.siguientePaso && (
                  <div className="bg-[#f3f4f6] rounded-lg p-4 border border-[#e5e7eb]">
                    <div className="text-xs text-[#6b7280] font-medium mb-2">Siguiente Paso</div>
                    <div className="text-sm font-semibold text-[#1c2c4a]">{selectedLevantamiento.siguientePaso}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
      
      {/* MODAL DE DETALLES DEL PROSPECTO */}
      {/* MODAL: NUEVO LEAD */}
      {showNuevoLead && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowNuevoLead(false)}>
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-[#e5e7eb] flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-[#1c2c4a]">Nuevo Lead</h3>
                <p className="text-sm text-[#6b7280] mt-1">Ingresa la información inicial del lead</p>
              </div>
              <button onClick={() => setShowNuevoLead(false)} className="text-[#6b7280] hover:text-[#1c2c4a]">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* SECCIÓN 1: EMPRESA */}
              <div>
                <h4 className="text-sm font-semibold text-[#1c2c4a] mb-3 flex items-center gap-2">
                  <Building2 size={16} className="text-[#00a8a8]" />
                  Empresa
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-[#6b7280] mb-1 block">Empresa *</label>
                    <input type="text" value={nuevoLeadForm.empresa} onChange={e => setNuevoLeadForm(prev => ({...prev, empresa: e.target.value}))}
                      className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00a8a8]/50 focus:border-[#00a8a8]"
                      placeholder="Nombre de la empresa" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#6b7280] mb-1 block">Ciudad *</label>
                    <input type="text" value={nuevoLeadForm.ciudad} onChange={e => setNuevoLeadForm(prev => ({...prev, ciudad: e.target.value}))}
                      className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00a8a8]/50 focus:border-[#00a8a8]"
                      placeholder="Ciudad / Estado" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#6b7280] mb-1 block">Planta</label>
                    <input type="text" value={nuevoLeadForm.planta} onChange={e => setNuevoLeadForm(prev => ({...prev, planta: e.target.value}))}
                      className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00a8a8]/50 focus:border-[#00a8a8]"
                      placeholder="Nombre de planta (opcional)" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-[#6b7280] mb-1 block">Industria</label>
                    <input type="text" value={nuevoLeadForm.industria} onChange={e => setNuevoLeadForm(prev => ({...prev, industria: e.target.value}))}
                      className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00a8a8]/50 focus:border-[#00a8a8]"
                      placeholder="Ej: Automotriz, Retail, Alimenticia..." />
                  </div>
                </div>
              </div>

              {/* SECCIÓN 2: CONTACTO */}
              <div>
                <h4 className="text-sm font-semibold text-[#1c2c4a] mb-3 flex items-center gap-2">
                  <Users size={16} className="text-[#0D47A1]" />
                  Contacto
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-[#6b7280] mb-1 block">Nombre *</label>
                    <input type="text" value={nuevoLeadForm.contactoNombre} onChange={e => setNuevoLeadForm(prev => ({...prev, contactoNombre: e.target.value}))}
                      className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00a8a8]/50 focus:border-[#00a8a8]"
                      placeholder="Nombre completo" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#6b7280] mb-1 block">Puesto</label>
                    <input type="text" value={nuevoLeadForm.contactoPuesto} onChange={e => setNuevoLeadForm(prev => ({...prev, contactoPuesto: e.target.value}))}
                      className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00a8a8]/50 focus:border-[#00a8a8]"
                      placeholder="Puesto / Cargo" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#6b7280] mb-1 block">Correo</label>
                    <input type="email" value={nuevoLeadForm.contactoCorreo} onChange={e => setNuevoLeadForm(prev => ({...prev, contactoCorreo: e.target.value}))}
                      className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00a8a8]/50 focus:border-[#00a8a8]"
                      placeholder="correo@empresa.com" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#6b7280] mb-1 block">Teléfono</label>
                    <input type="tel" value={nuevoLeadForm.contactoTelefono} onChange={e => setNuevoLeadForm(prev => ({...prev, contactoTelefono: e.target.value}))}
                      className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00a8a8]/50 focus:border-[#00a8a8]"
                      placeholder="55 1234 5678" />
                  </div>
                </div>
              </div>

              {/* SECCIÓN 3: SERVICIOS */}
              <div>
                <h4 className="text-sm font-semibold text-[#1c2c4a] mb-3 flex items-center gap-2">
                  <Package size={16} className="text-[#2E7D32]" />
                  Servicios de Interés
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {SERVICIOS_INNOVATIVE.map(servicio => (
                    <label key={servicio.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-[#f3f4f6] cursor-pointer transition-colors">
                      <input type="checkbox" checked={nuevoLeadForm.servicios.includes(servicio.id)}
                        onChange={e => {
                          setNuevoLeadForm(prev => ({
                            ...prev,
                            servicios: e.target.checked
                              ? [...prev.servicios, servicio.id]
                              : prev.servicios.filter(s => s !== servicio.id)
                          }));
                        }}
                        className="w-4 h-4 text-[#00a8a8] border-[#e5e7eb] rounded focus:ring-[#00a8a8]" />
                      <div>
                        <div className="text-sm font-medium text-[#1c2c4a]">{servicio.nombre}</div>
                        <div className="text-[10px] text-[#6b7280]">{servicio.descripcion}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* SECCIÓN 4: INFO PARA OPERACIONES */}
              <div>
                <h4 className="text-sm font-semibold text-[#1c2c4a] mb-3 flex items-center gap-2">
                  <Truck size={16} className="text-[#F57C00]" />
                  Información para Operaciones
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-[#6b7280] mb-1 block">Tipos de residuos</label>
                    <textarea value={nuevoLeadForm.tiposResiduos} onChange={e => setNuevoLeadForm(prev => ({...prev, tiposResiduos: e.target.value}))}
                      className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00a8a8]/50 focus:border-[#00a8a8] resize-none"
                      rows={2} placeholder="Ej: Cartón, playo, orgánicos, lodos, RP..." />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-[#6b7280] mb-1 block">Volumen estimado (ton/mes)</label>
                      <input type="number" value={nuevoLeadForm.volumenEstimado} onChange={e => setNuevoLeadForm(prev => ({...prev, volumenEstimado: e.target.value}))}
                        className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00a8a8]/50 focus:border-[#00a8a8]"
                        placeholder="Toneladas por mes" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[#6b7280] mb-1 block">Facturación estimada (MXN)</label>
                      <input type="number" value={nuevoLeadForm.facturacionEstimada} onChange={e => setNuevoLeadForm(prev => ({...prev, facturacionEstimada: e.target.value}))}
                        className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00a8a8]/50 focus:border-[#00a8a8]"
                        placeholder="Facturación mensual estimada" />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECCIÓN 5: COMENTARIOS */}
              <div>
                <label className="text-xs font-medium text-[#6b7280] mb-1 block">Comentarios generales</label>
                <textarea value={nuevoLeadForm.comentarios} onChange={e => setNuevoLeadForm(prev => ({...prev, comentarios: e.target.value}))}
                  className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00a8a8]/50 focus:border-[#00a8a8] resize-none"
                  rows={2} placeholder="Notas iniciales, contexto, cómo se consiguió el lead..." />
              </div>
            </div>

            {/* FOOTER */}
            <div className="p-6 border-t border-[#e5e7eb] flex items-center justify-between">
              <p className="text-xs text-[#6b7280]">* Campos obligatorios para crear el lead</p>
              <div className="flex gap-3">
                <button onClick={() => setShowNuevoLead(false)}
                  className="px-4 py-2 text-sm font-medium text-[#6b7280] hover:text-[#1c2c4a] transition-colors">
                  Cancelar
                </button>
                <button onClick={handleCrearLead}
                  disabled={!nuevoLeadForm.empresa.trim() || !nuevoLeadForm.contactoNombre.trim() || !nuevoLeadForm.ciudad.trim()}
                  className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
                    nuevoLeadForm.empresa.trim() && nuevoLeadForm.contactoNombre.trim() && nuevoLeadForm.ciudad.trim()
                      ? 'bg-[#1c2c4a] hover:bg-[#1c2c4a]/90 text-white shadow-sm'
                      : 'bg-[#e5e7eb] text-[#6b7280] cursor-not-allowed'
                  }`}>
                  Crear Lead
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {mostrarDetallesProspecto && selectedProspecto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setMostrarDetallesProspecto(false)}>
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-lg border border-[#e5e7eb]" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-[#e5e7eb] flex items-center justify-between bg-[#00a8a8] text-white rounded-t-lg">
              <div>
                <h2 className="text-xl font-semibold">{selectedProspecto.empresa}</h2>
                <p className="text-sm text-white/90 mt-1">{selectedProspecto.industria}</p>
              </div>
              <button onClick={() => { setMostrarDetallesProspecto(false); setDetallesProspectoTab('info'); }} className="text-white hover:text-white/80">
                <X size={24} />
              </button>
            </div>

            {/* CRM Tabs */}
            <div className="flex gap-1 px-6 py-3 bg-[#f9fafb] border-b border-[#e5e7eb] overflow-x-auto">
              {[
                { id: 'info', label: 'Info', icon: ClipboardList },
                { id: 'timeline', label: 'Timeline', icon: Clock },
                { id: 'notas', label: 'Notas', icon: MessageSquare },
                { id: 'reuniones', label: 'Reuniones', icon: Users },
                { id: 'docs', label: 'Docs', icon: FileText },
                { id: 'propuestas', label: 'Propuestas', icon: Send },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setDetallesProspectoTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                    detallesProspectoTab === tab.id
                      ? 'bg-[#00a8a8] text-white'
                      : 'bg-white text-[#6b7280] hover:bg-[#e5e7eb] border border-[#e5e7eb]'
                  }`}
                >
                  <tab.icon size={14} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* CRM Components */}
            {detallesProspectoTab === 'timeline' && (
              <div className="p-6">
                <ProspectTimeline prospectId={findRealProspectId(selectedProspecto)} />
              </div>
            )}
            {detallesProspectoTab === 'notas' && (
              <div className="p-6">
                <ProspectNotes prospectId={findRealProspectId(selectedProspecto)} />
              </div>
            )}
            {detallesProspectoTab === 'reuniones' && (
              <div className="p-6">
                <ProspectMeetings prospectId={findRealProspectId(selectedProspecto)} />
              </div>
            )}
            {detallesProspectoTab === 'docs' && (
              <div className="p-6">
                <ProspectDocuments prospectId={findRealProspectId(selectedProspecto)} />
              </div>
            )}
            {detallesProspectoTab === 'propuestas' && (
              <div className="p-6">
                <ProspectProposals prospectId={findRealProspectId(selectedProspecto)} />
              </div>
            )}

            {detallesProspectoTab === 'info' && (
            <div className="p-6">
              {/* INFORMACIÓN BÁSICA */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-[#f3f4f6] rounded-lg p-4 border border-[#e5e7eb]">
                  <div className="text-xs text-[#6b7280] font-medium mb-1">Ejecutivo</div>
                  <div className="text-lg font-bold text-[#1c2c4a]">{selectedProspecto.ejecutivo}</div>
                </div>
                <div className="bg-[#f3f4f6] rounded-lg p-4 border border-[#e5e7eb]">
                  <div className="text-xs text-[#6b7280] font-medium mb-1">Status</div>
                  <div className="text-lg font-bold text-[#1c2c4a]">{selectedProspecto.status}</div>
                </div>
                <div className="bg-[#f3f4f6] rounded-lg p-4 border border-[#e5e7eb]">
                  <div className="text-xs text-[#6b7280] font-medium mb-1">Volumen Estimado</div>
                  <div className="text-lg font-bold text-[#1c2c4a]">{selectedProspecto.volumenEstimado}</div>
                </div>
                <div className="bg-[#f3f4f6] rounded-lg p-4 border border-[#e5e7eb]">
                  <div className="text-xs text-[#6b7280] font-medium mb-1">Valor Estimado</div>
                  <div className="text-lg font-bold text-[#0D47A1]">
                    ${((selectedProspecto.propuesta?.ventaTotal || selectedProspecto.facturacionEstimada || 0) / 1000000).toFixed(1)}M
                  </div>
                </div>
              </div>

              {/* INFORMACIÓN ESTRATÉGICA */}
              <div className="space-y-4 mb-6">
                <div>
                  <div className="text-xs text-[#6b7280] font-medium mb-1">Comentarios</div>
                  <div className="text-sm font-semibold text-[#1c2c4a] bg-blue-50 border border-blue-200 rounded-lg p-3">
                    {(selectedProspecto.comentarios || "Pendiente")}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-[#6b7280] font-medium mb-1">Status</div>
                    <div className="text-sm font-semibold text-[#1c2c4a]">{selectedProspecto.status}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[#6b7280] font-medium mb-1">Nivel</div>
                    <div className={`text-sm font-semibold ${
                      selectedProspecto.status === 'Lead nuevo' || selectedProspecto.status === 'Inicio de operación' ? 'text-[#00a8a8]' : selectedProspecto.status === 'Propuesta enviada' ? 'text-[#0D47A1]' : 'text-orange-600'
                    }`}>
                      {selectedProspecto.status}
                    </div>
                  </div>
                </div>
                
                <div>
                  <div className="text-xs text-[#6b7280] font-medium mb-1">Servicios</div>
                  <div className="text-sm text-[#1c2c4a]">{(selectedProspecto.servicios || []).map(s => SERVICIOS_INNOVATIVE.find(si => si.id === s)?.nombre || s).join(", ") || "Sin servicios"}</div>
                </div>
              </div>

              {/* INFORMACIÓN DE CONTACTO */}
              <div className="border-t border-[#e5e7eb] pt-4 mb-6">
                <h3 className="text-sm font-semibold text-[#1c2c4a] mb-3">Información de Contacto</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-[#6b7280]">
                    <MapPin size={14} />
                    <span>{selectedProspecto.ciudad}</span>
                  </div>
                  <div className="text-sm text-[#6b7280]">
                    <span className="font-medium">Contacto:</span> {selectedProspecto.contacto?.nombre ? `${selectedProspecto.contacto.nombre} - ${selectedProspecto.contacto.puesto || ""}` : "Sin contacto"}
                  </div>
                </div>
              </div>
              
              {/* CHECKLIST PARA OPERACIONES */}
              {(selectedProspecto.status === 'Lead nuevo' || selectedProspecto.status === 'Reunión agendada') && (() => {
                const campos = calcularCamposCompletos(selectedProspecto);
                const completos = campos.filter(c => c.ok).length;
                const total = campos.length;
                const listoParaOps = completos === total;
                return (
                  <div className="border-t border-[#e5e7eb] pt-4 mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-[#1c2c4a]">Checklist para Operaciones</h3>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${listoParaOps ? 'bg-[#2E7D32]/10 text-[#2E7D32]' : 'bg-[#F57C00]/10 text-[#F57C00]'}`}>
                        {completos}/{total} campos
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {campos.map((campo, i) => (
                        <div key={i} className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded-md ${campo.ok ? 'bg-[#2E7D32]/5 text-[#2E7D32]' : 'bg-red-50 text-red-500'}`}>
                          {campo.ok ? <CheckSquare size={12} /> : <AlertCircle size={12} />}
                          <span className="font-medium">{campo.label}</span>
                        </div>
                      ))}
                    </div>
                    <div className="w-full h-2 bg-[#e5e7eb] rounded-full overflow-hidden mb-4">
                      <div className="h-full rounded-full transition-all" style={{ width: `${(completos/total)*100}%`, backgroundColor: listoParaOps ? '#2E7D32' : '#F57C00' }}></div>
                    </div>
                    {listoParaOps ? (
                      <button onClick={() => enviarAOperaciones(selectedProspecto)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#2E7D32] hover:bg-[#2E7D32]/90 text-white rounded-lg text-sm font-semibold transition-all shadow-sm">
                        <Send size={16} />
                        Enviar a Operaciones
                      </button>
                    ) : (
                      <button disabled className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#e5e7eb] text-[#6b7280] rounded-lg text-sm font-medium cursor-not-allowed">
                        <Lock size={16} />
                        Faltan {total - completos} campos para enviar a Operaciones
                      </button>
                    )}
                  </div>
                );
              })()}

              {/* BOTONES DE ACCIÓN */}
              <div className="flex gap-3 pt-4 border-t border-[#e5e7eb]">
                {(selectedProspecto.status === 'Levantamiento' || selectedProspecto.status === 'Propuesta enviada' || selectedProspecto.status === 'Inicio de operación') && (
                  <button
                    onClick={() => {
                      const levantamiento = levantamientosActivos.find(l => l.id === null);
                      if (levantamiento) {
                        setSelectedLevantamiento(levantamiento);
                        setMostrarLevantamiento(true);
                        setMostrarDetallesProspecto(false);
                      }
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#f3f4f6] hover:bg-[#e5e7eb] text-[#1c2c4a] rounded-md text-sm font-medium transition-all border border-[#e5e7eb]"
                  >
                    <Eye size={16} />
                    Ver Levantamiento
                  </button>
                )}
                {(selectedProspecto.status === 'Propuesta enviada' || selectedProspecto.status === 'Inicio de operación' || selectedProspecto.status === 'Propuesta Rechazada') && (
                  <button
                    onClick={() => {
                      setMostrarPropuesta(true);
                      setMostrarDetallesProspecto(false);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#0D47A1] hover:bg-[#0D47A1] text-white rounded-md text-sm font-medium transition-all"
                  >
                    <FileText size={16} />
                    Ver Propuesta
                  </button>
                )}
              </div>
            </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE LEADS */}
      {mostrarLeads && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setMostrarLeads(false)}>
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-lg border border-[#e5e7eb]" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-[#e5e7eb] flex items-center justify-between bg-[#0D47A1] text-white rounded-t-lg">
              <div>
                <h2 className="text-xl font-semibold">Leads Activos</h2>
                <p className="text-sm text-white/90 mt-1">Total: {leadsData.length} leads</p>
              </div>
              <button onClick={() => setMostrarLeads(false)} className="text-white hover:text-white/80">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6">
              {/* RESUMEN */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-[#f3f4f6] rounded-lg p-4 border border-[#e5e7eb]">
                  <div className="text-xs text-[#6b7280] mb-1">Total Leads</div>
                  <div className="text-2xl font-bold text-[#1c2c4a]">{leadsData.length}</div>
                </div>
                <div className="bg-[#f3f4f6] rounded-lg p-4 border border-[#e5e7eb]">
                  <div className="text-xs text-[#6b7280] mb-1">Valor Total</div>
                  <div className="text-2xl font-bold text-[#0D47A1]">
                    ${(leadsData.reduce((sum, l) => sum + l.valor, 0) / 1000000).toFixed(1)}M
                  </div>
                </div>
                <div className="bg-[#f3f4f6] rounded-lg p-4 border border-[#e5e7eb]">
                  <div className="text-xs text-[#6b7280] mb-1">Valor Promedio</div>
                  <div className="text-2xl font-bold text-[#1c2c4a]">
                    ${(leadsData.reduce((sum, l) => sum + l.valor, 0) / leadsData.length / 1000).toFixed(0)}K
                  </div>
                </div>
                <div className="bg-[#f3f4f6] rounded-lg p-4 border border-[#e5e7eb]">
                  <div className="text-xs text-[#6b7280] mb-1">Origen Principal</div>
                  <div className="text-2xl font-bold text-[#1c2c4a]">
                    {(() => {
                      const origenes = leadsData.reduce((acc, l) => {
                        acc[l.origen] = (acc[l.origen] || 0) + 1;
                        return acc;
                      }, {});
                      return Object.keys(origenes).reduce((a, b) => origenes[a] > origenes[b] ? a : b);
                    })()}
                  </div>
                </div>
              </div>

              {/* TABLA DE LEADS */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#e5e7eb] bg-[#f3f4f6]">
                      <th className="text-left p-3 text-xs font-semibold text-[#6b7280]">#</th>
                      <th className="text-left p-3 text-xs font-semibold text-[#6b7280]">Empresa</th>
                      <th className="text-left p-3 text-xs font-semibold text-[#6b7280]">Contacto</th>
                      <th className="text-left p-3 text-xs font-semibold text-[#6b7280]">Industria</th>
                      <th className="text-left p-3 text-xs font-semibold text-[#6b7280]">Ubicación</th>
                      <th className="text-left p-3 text-xs font-semibold text-[#6b7280]">Origen</th>
                      <th className="text-left p-3 text-xs font-semibold text-[#6b7280]">Fecha</th>
                      <th className="text-right p-3 text-xs font-semibold text-[#6b7280]">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leadsData.map((lead, index) => (
                      <tr key={lead.id} className="border-b border-[#e5e7eb] hover:bg-[#f3f4f6] transition-colors">
                        <td className="p-3 text-sm text-[#6b7280]">{index + 1}</td>
                        <td className="p-3 text-sm font-semibold text-[#1c2c4a]">{lead.empresa}</td>
                        <td className="p-3 text-sm text-[#6b7280]">{lead.contacto}</td>
                        <td className="p-3 text-sm text-[#6b7280]">{lead.industria}</td>
                        <td className="p-3 text-sm text-[#6b7280]">{lead.ubicacion}</td>
                        <td className="p-3">
                          <span className={`text-xs px-2 py-1 rounded ${
                            lead.origen === 'Referido' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                            lead.origen === 'Web' ? 'bg-green-50 text-green-700 border border-green-200' :
                            lead.origen === 'LinkedIn' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                            'bg-orange-50 text-orange-700 border border-orange-200'
                          }`}>
                            {lead.origen}
                          </span>
                        </td>
                        <td className="p-3 text-sm text-[#6b7280]">{lead.fecha}</td>
                        <td className="p-3 text-sm font-semibold text-[#0D47A1] text-right">
                          ${(lead.valor / 1000).toFixed(0)}K
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* BOTÓN DE EXPORTAR */}
              <div className="mt-6 flex justify-end">
                <button className="flex items-center gap-2 px-4 py-2 bg-[#0D47A1] hover:bg-[#0D47A1] text-white rounded-md text-sm font-medium transition-all">
                  <Download size={16} />
                  Exportar CSV
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE LEVANTAMIENTOS */}
      {mostrarLevantamientos && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setMostrarLevantamientos(false)}>
          <div className="bg-white rounded-lg max-w-7xl w-full max-h-[90vh] overflow-y-auto shadow-lg border border-[#e5e7eb]" onClick={e => e.stopPropagation()}>
            {!selectedLevantamientoDetalle ? (
              <>
                <div className="p-6 border-b border-[#e5e7eb] flex items-center justify-between bg-[#00a8a8] text-white rounded-t-lg">
                  <div>
                    <h2 className="text-xl font-semibold">Levantamientos Activos</h2>
                    <p className="text-sm text-white/90 mt-1">Total: {levantamientosActivos.filter(l => l.tipo === 'Levantamiento').length} levantamientos</p>
                  </div>
                  <button onClick={() => setMostrarLevantamientos(false)} className="text-white hover:text-white/80">
                    <X size={24} />
                  </button>
                </div>
                
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {levantamientosActivos.filter(l => l.tipo === 'Levantamiento').map(levantamiento => {
                      const detalle = levantamientosDetallados.find(d => d.id === levantamiento.id);
                      return (
                        <div
                          key={levantamiento.id}
                          onClick={() => setSelectedLevantamientoDetalle(detalle || levantamiento)}
                          className="bg-white border border-[#e5e7eb] rounded-lg p-4 hover:shadow-md transition-all cursor-pointer"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h3 className="font-semibold text-[#1c2c4a] mb-1">{levantamiento.cliente}</h3>
                              <p className="text-xs text-[#6b7280]">{levantamiento.ejecutivo}</p>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded ${
                              levantamiento.status === 'Completado' ? 'bg-green-50 text-green-700 border border-green-200' :
                              levantamiento.status === 'En proceso' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                              'bg-yellow-50 text-yellow-700 border border-yellow-200'
                            }`}>
                              {levantamiento.status}
                            </span>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-[#6b7280]">Volumen:</span>
                              <span className="font-semibold text-[#1c2c4a]">{levantamiento.volumenEstimado}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#6b7280]">Valor:</span>
                              <span className="font-semibold text-[#0D47A1]">
                                ${(levantamiento.valorEstimado / 1000000).toFixed(1)}M
                              </span>
                            </div>
                            <div className="pt-2 border-t border-[#e5e7eb]">
                              <span className="text-xs text-[#6b7280]">{levantamiento.siguientePaso}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="p-6 border-b border-[#e5e7eb] flex items-center justify-between bg-[#00a8a8] text-white rounded-t-lg">
                  <div>
                    <h2 className="text-xl font-semibold">Formulario de Levantamiento</h2>
                    <p className="text-sm text-white/90 mt-1">{selectedLevantamientoDetalle.cliente}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setSelectedLevantamientoDetalle(null)} className="text-white hover:text-white/80 px-3 py-1 text-sm">
                      ← Volver
                    </button>
                    <button onClick={() => setMostrarLevantamientos(false)} className="text-white hover:text-white/80">
                      <X size={24} />
                    </button>
                  </div>
                </div>
                
                <div className="p-6 space-y-6">
                  {/* INFORMACIÓN GENERAL */}
                  {selectedLevantamientoDetalle.informacionGeneral && (
                    <div className="bg-[#f3f4f6] rounded-lg p-5 border border-[#e5e7eb]">
                      <h3 className="text-lg font-semibold text-[#1c2c4a] mb-4 flex items-center gap-2">
                        <Building2 size={20} />
                        Información General
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-[#6b7280] mb-1">Razón Social</div>
                          <div className="text-sm font-semibold text-[#1c2c4a]">{selectedLevantamientoDetalle.informacionGeneral.razonSocial}</div>
                        </div>
                        <div>
                          <div className="text-xs text-[#6b7280] mb-1">RFC</div>
                          <div className="text-sm font-semibold text-[#1c2c4a]">{selectedLevantamientoDetalle.informacionGeneral.rfc}</div>
                        </div>
                        <div className="col-span-2">
                          <div className="text-xs text-[#6b7280] mb-1">Dirección</div>
                          <div className="text-sm text-[#1c2c4a]">{selectedLevantamientoDetalle.informacionGeneral.direccion}</div>
                        </div>
                        <div>
                          <div className="text-xs text-[#6b7280] mb-1">Contacto</div>
                          <div className="text-sm font-semibold text-[#1c2c4a]">{selectedLevantamientoDetalle.informacionGeneral.contacto}</div>
                        </div>
                        <div>
                          <div className="text-xs text-[#6b7280] mb-1">Teléfono</div>
                          <div className="text-sm text-[#1c2c4a]">{selectedLevantamientoDetalle.informacionGeneral.telefono}</div>
                        </div>
                        <div>
                          <div className="text-xs text-[#6b7280] mb-1">Email</div>
                          <div className="text-sm text-[#1c2c4a]">{selectedLevantamientoDetalle.informacionGeneral.email}</div>
                        </div>
                        <div>
                          <div className="text-xs text-[#6b7280] mb-1">Superficie</div>
                          <div className="text-sm font-semibold text-[#1c2c4a]">{selectedLevantamientoDetalle.informacionGeneral.superficie}</div>
                        </div>
                        <div>
                          <div className="text-xs text-[#6b7280] mb-1">Número de Empleados</div>
                          <div className="text-sm font-semibold text-[#1c2c4a]">{selectedLevantamientoDetalle.informacionGeneral.numeroEmpleados}</div>
                        </div>
                        <div>
                          <div className="text-xs text-[#6b7280] mb-1">Horario de Operación</div>
                          <div className="text-sm text-[#1c2c4a]">{selectedLevantamientoDetalle.informacionGeneral.horarioOperacion}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TIPOS DE RESIDUOS */}
                  {selectedLevantamientoDetalle.tiposResiduos && (
                    <div className="bg-white rounded-lg p-5 border border-[#e5e7eb]">
                      <h3 className="text-lg font-semibold text-[#1c2c4a] mb-4 flex items-center gap-2">
                        <Recycle size={20} />
                        Tipos de Residuos y Generación
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-[#e5e7eb] bg-[#f3f4f6]">
                              <th className="text-left p-3 text-xs font-semibold text-[#6b7280]">Tipo de Residuo</th>
                              <th className="text-right p-3 text-xs font-semibold text-[#6b7280]">Cantidad</th>
                              <th className="text-right p-3 text-xs font-semibold text-[#6b7280]">%</th>
                              <th className="text-left p-3 text-xs font-semibold text-[#6b7280]">Destino Actual</th>
                              <th className="text-right p-3 text-xs font-semibold text-[#6b7280]">Costo Mensual</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedLevantamientoDetalle.tiposResiduos.map((residuo, index) => (
                              <tr key={index} className="border-b border-[#e5e7eb]">
                                <td className="p-3 text-sm font-semibold text-[#1c2c4a]">{residuo.tipo}</td>
                                <td className="p-3 text-sm text-[#1c2c4a] text-right">{residuo.cantidad}</td>
                                <td className="p-3 text-sm text-[#1c2c4a] text-right">{residuo.porcentaje}%</td>
                                <td className="p-3 text-sm text-[#6b7280]">{residuo.destino}</td>
                                <td className="p-3 text-sm font-semibold text-[#0D47A1] text-right">
                                  ${residuo.costo.toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* GENERACIÓN */}
                  {selectedLevantamientoDetalle.generacion && (
                    <div className="bg-white rounded-lg p-5 border border-[#e5e7eb]">
                      <h3 className="text-lg font-semibold text-[#1c2c4a] mb-4 flex items-center gap-2">
                        <TrendingUp size={20} />
                        Patrones de Generación
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                          <div className="text-xs text-[#6b7280] mb-1">Frecuencia</div>
                          <div className="text-sm font-semibold text-[#1c2c4a]">{selectedLevantamientoDetalle.generacion.frecuencia}</div>
                        </div>
                        <div>
                          <div className="text-xs text-[#6b7280] mb-1">Días por Semana</div>
                          <div className="text-sm font-semibold text-[#1c2c4a]">{selectedLevantamientoDetalle.generacion.diasSemana}</div>
                        </div>
                        <div>
                          <div className="text-xs text-[#6b7280] mb-1">Volumen Diario</div>
                          <div className="text-sm font-semibold text-[#1c2c4a]">{selectedLevantamientoDetalle.generacion.volumenDiario}</div>
                        </div>
                        <div>
                          <div className="text-xs text-[#6b7280] mb-1">Volumen Semanal</div>
                          <div className="text-sm font-semibold text-[#1c2c4a]">{selectedLevantamientoDetalle.generacion.volumenSemanal}</div>
                        </div>
                        <div>
                          <div className="text-xs text-[#6b7280] mb-1">Volumen Mensual</div>
                          <div className="text-sm font-semibold text-[#0D47A1]">{selectedLevantamientoDetalle.generacion.volumenMensual}</div>
                        </div>
                        <div>
                          <div className="text-xs text-[#6b7280] mb-1">Variaciones Estacionales</div>
                          <div className="text-sm text-[#1c2c4a]">{selectedLevantamientoDetalle.generacion.variacionesEstacionales}</div>
                        </div>
                        <div className="col-span-2 md:col-span-3">
                          <div className="text-xs text-[#6b7280] mb-1">Horarios de Recolección Preferidos</div>
                          <div className="flex gap-2 flex-wrap">
                            {selectedLevantamientoDetalle.generacion.horariosRecoleccion.map((horario, index) => (
                              <span key={index} className="text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded border border-blue-200">
                                {horario}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SERVICIOS ACTUALES */}
                  {selectedLevantamientoDetalle.serviciosActuales && (
                    <div className="bg-white rounded-lg p-5 border border-[#e5e7eb]">
                      <h3 className="text-lg font-semibold text-[#1c2c4a] mb-4 flex items-center gap-2">
                        <FileText size={20} />
                        Servicios Actuales
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-[#6b7280] mb-1">Proveedor Actual</div>
                          <div className="text-sm font-semibold text-[#1c2c4a]">{selectedLevantamientoDetalle.serviciosActuales.proveedor}</div>
                        </div>
                        <div>
                          <div className="text-xs text-[#6b7280] mb-1">Contrato Vigente</div>
                          <div className="text-sm font-semibold text-[#1c2c4a]">
                            {selectedLevantamientoDetalle.serviciosActuales.contratoVigente ? 'Sí' : 'No'}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-[#6b7280] mb-1">Fecha Inicio</div>
                          <div className="text-sm text-[#1c2c4a]">{selectedLevantamientoDetalle.serviciosActuales.fechaInicio}</div>
                        </div>
                        <div>
                          <div className="text-xs text-[#6b7280] mb-1">Fecha Vencimiento</div>
                          <div className="text-sm text-[#1c2c4a]">{selectedLevantamientoDetalle.serviciosActuales.fechaVencimiento}</div>
                        </div>
                        <div>
                          <div className="text-xs text-[#6b7280] mb-1">Costo Mensual</div>
                          <div className="text-sm font-semibold text-[#0D47A1]">
                            ${selectedLevantamientoDetalle.serviciosActuales.costoMensual.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-[#6b7280] mb-1">Frecuencia de Recolección</div>
                          <div className="text-sm text-[#1c2c4a]">{selectedLevantamientoDetalle.serviciosActuales.frecuenciaRecoleccion}</div>
                        </div>
                        <div>
                          <div className="text-xs text-[#6b7280] mb-1">Tipo de Servicio</div>
                          <div className="text-sm text-[#1c2c4a]">{selectedLevantamientoDetalle.serviciosActuales.tipoServicio}</div>
                        </div>
                        <div>
                          <div className="text-xs text-[#6b7280] mb-1">Nivel de Satisfacción</div>
                          <div className="text-sm font-semibold text-[#1c2c4a]">
                            {selectedLevantamientoDetalle.serviciosActuales.nivelSatisfaccion}/10
                          </div>
                        </div>
                        <div className="col-span-2 grid grid-cols-3 gap-2 pt-2 border-t border-[#e5e7eb]">
                          <div className="text-xs text-[#6b7280]">
                            Separación: {selectedLevantamientoDetalle.serviciosActuales.incluyeSeparacion ? '✓' : '✗'}
                          </div>
                          <div className="text-xs text-[#6b7280]">
                            Valorización: {selectedLevantamientoDetalle.serviciosActuales.incluyeValorizacion ? '✓' : '✗'}
                          </div>
                          <div className="text-xs text-[#6b7280]">
                            Reporteo: {selectedLevantamientoDetalle.serviciosActuales.incluyeReporteo ? '✓' : '✗'}
                          </div>
                        </div>
                        <div className="col-span-2">
                          <div className="text-xs text-[#6b7280] mb-1">Razón de Cambio</div>
                          <div className="text-sm text-[#1c2c4a]">{selectedLevantamientoDetalle.serviciosActuales.razonCambio}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* INFRAESTRUCTURA */}
                  {selectedLevantamientoDetalle.infraestructura && (
                    <div className="bg-white rounded-lg p-5 border border-[#e5e7eb]">
                      <h3 className="text-lg font-semibold text-[#1c2c4a] mb-4 flex items-center gap-2">
                        <Building2 size={20} />
                        Infraestructura
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-[#6b7280] mb-1">Área de Almacenamiento</div>
                          <div className="text-sm font-semibold text-[#1c2c4a]">
                            {selectedLevantamientoDetalle.infraestructura.tieneAreaAlmacenamiento ? 'Sí' : 'No'} - {selectedLevantamientoDetalle.infraestructura.areaAlmacenamiento}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-[#6b7280] mb-1">Tipo de Almacenamiento</div>
                          <div className="text-sm text-[#1c2c4a]">{selectedLevantamientoDetalle.infraestructura.tipoAlmacenamiento}</div>
                        </div>
                        <div>
                          <div className="text-xs text-[#6b7280] mb-1">Número de Contenedores</div>
                          <div className="text-sm font-semibold text-[#1c2c4a]">{selectedLevantamientoDetalle.infraestructura.numeroContenedores}</div>
                        </div>
                        <div>
                          <div className="text-xs text-[#6b7280] mb-1">Compactadora</div>
                          <div className="text-sm text-[#1c2c4a]">
                            {selectedLevantamientoDetalle.infraestructura.tieneCompactadora ? 'Sí' : 'No'}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-[#6b7280] mb-1">Bodega</div>
                          <div className="text-sm text-[#1c2c4a]">
                            {selectedLevantamientoDetalle.infraestructura.tieneBodega ? 'Sí' : 'No'}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-[#6b7280] mb-1">Acceso para Vehículos</div>
                          <div className="text-sm text-[#1c2c4a]">{selectedLevantamientoDetalle.infraestructura.accesoVehiculos}</div>
                        </div>
                        <div className="col-span-2">
                          <div className="text-xs text-[#6b7280] mb-1">Restricciones de Horario</div>
                          <div className="text-sm text-[#1c2c4a]">{selectedLevantamientoDetalle.infraestructura.restriccionesHorario}</div>
                        </div>
                        <div className="col-span-2">
                          <div className="text-xs text-[#6b7280] mb-1">Espacio Disponible</div>
                          <div className="text-sm text-[#1c2c4a]">{selectedLevantamientoDetalle.infraestructura.espacioDisponible}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* NECESIDADES */}
                  {selectedLevantamientoDetalle.necesidades && (
                    <div className="bg-white rounded-lg p-5 border border-[#e5e7eb]">
                      <h3 className="text-lg font-semibold text-[#1c2c4a] mb-4 flex items-center gap-2">
                        <Target size={20} />
                        Necesidades y Objetivos
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 grid grid-cols-4 gap-2">
                          <div className="text-xs text-[#6b7280]">
                            Separación: {selectedLevantamientoDetalle.necesidades.separacionResiduos ? '✓' : '✗'}
                          </div>
                          <div className="text-xs text-[#6b7280]">
                            Valorización: {selectedLevantamientoDetalle.necesidades.valorizacionResiduos ? '✓' : '✗'}
                          </div>
                          <div className="text-xs text-[#6b7280]">
                            Trazabilidad: {selectedLevantamientoDetalle.necesidades.trazabilidad ? '✓' : '✗'}
                          </div>
                          <div className="text-xs text-[#6b7280]">
                            Reporteo: {selectedLevantamientoDetalle.necesidades.reporteoMensual ? '✓' : '✗'}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-[#6b7280] mb-1">Certificaciones Requeridas</div>
                          <div className="flex gap-2 flex-wrap">
                            {selectedLevantamientoDetalle.necesidades.certificaciones.map((cert, index) => (
                              <span key={index} className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded border border-green-200">
                                {cert}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-[#6b7280] mb-1">Presupuesto Disponible</div>
                          <div className="text-sm font-semibold text-[#0D47A1]">
                            ${selectedLevantamientoDetalle.necesidades.presupuestoDisponible.toLocaleString()}/mes
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-[#6b7280] mb-1">Urgencia</div>
                          <div className={`text-sm font-semibold ${
                            selectedLevantamientoDetalle.necesidades.urgencia === 'Alta' ? 'text-red-600' :
                            selectedLevantamientoDetalle.necesidades.urgencia === 'Media' ? 'text-orange-600' : 'text-green-600'
                          }`}>
                            {selectedLevantamientoDetalle.necesidades.urgencia}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-[#6b7280] mb-1">Decision Maker</div>
                          <div className="text-sm font-semibold text-[#1c2c4a]">{selectedLevantamientoDetalle.necesidades.decisionMaker}</div>
                        </div>
                        <div className="col-span-2">
                          <div className="text-xs text-[#6b7280] mb-1">Objetivos Ambientales</div>
                          <div className="text-sm text-[#1c2c4a]">{selectedLevantamientoDetalle.necesidades.objetivosAmbientales}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* OBSERVACIONES */}
                  {selectedLevantamientoDetalle.observaciones && (
                    <div className="bg-blue-50 rounded-lg p-5 border border-blue-200">
                      <h3 className="text-lg font-semibold text-[#1c2c4a] mb-2 flex items-center gap-2">
                        <FileText size={20} />
                        Observaciones
                      </h3>
                      <p className="text-sm text-[#1c2c4a] leading-relaxed">{selectedLevantamientoDetalle.observaciones}</p>
                    </div>
                  )}

                  {/* BOTONES DE ACCIÓN */}
                  <div className="flex gap-3 pt-4 border-t border-[#e5e7eb]">
                    <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#0D47A1] hover:bg-[#0D47A1] text-white rounded-md text-sm font-medium transition-all">
                      <Download size={16} />
                      Descargar PDF
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#00a8a8] hover:bg-[#008080] text-white rounded-md text-sm font-medium transition-all">
                      <FileText size={16} />
                      Generar Propuesta
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE NUEVO LEVANTAMIENTO */}
      {mostrarNuevoLevantamiento && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setMostrarNuevoLevantamiento(false)}>
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-lg border border-[#e5e7eb]" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-[#e5e7eb] flex items-center justify-between bg-[#00a8a8] text-white rounded-t-lg">
              <div>
                <h2 className="text-xl font-semibold">Nuevo Levantamiento</h2>
                <p className="text-sm text-white/90 mt-1">Complete el formulario para crear un nuevo levantamiento</p>
              </div>
              <button onClick={() => setMostrarNuevoLevantamiento(false)} className="text-white hover:text-white/80">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6">
              <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); alert('Levantamiento guardado exitosamente'); setMostrarNuevoLevantamiento(false); }}>
                {/* INFORMACIÓN GENERAL */}
                <div className="bg-[#f3f4f6] rounded-lg p-5 border border-[#e5e7eb]">
                  <h3 className="text-lg font-semibold text-[#1c2c4a] mb-4 flex items-center gap-2">
                    <Building2 size={20} />
                    Información General
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-[#6b7280] font-medium mb-1">Cliente *</label>
                      <input type="text" className="w-full px-3 py-2 border border-[#e5e7eb] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00a8a8]" placeholder="Nombre del cliente" required />
                    </div>
                    <div>
                      <label className="block text-xs text-[#6b7280] font-medium mb-1">Razón Social</label>
                      <input type="text" className="w-full px-3 py-2 border border-[#e5e7eb] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00a8a8]" placeholder="Razón social" />
                    </div>
                    <div>
                      <label className="block text-xs text-[#6b7280] font-medium mb-1">RFC</label>
                      <input type="text" className="w-full px-3 py-2 border border-[#e5e7eb] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00a8a8]" placeholder="RFC" />
                    </div>
                    <div>
                      <label className="block text-xs text-[#6b7280] font-medium mb-1">Contacto Principal *</label>
                      <input type="text" className="w-full px-3 py-2 border border-[#e5e7eb] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00a8a8]" placeholder="Nombre y cargo" required />
                    </div>
                    <div>
                      <label className="block text-xs text-[#6b7280] font-medium mb-1">Teléfono</label>
                      <input type="tel" className="w-full px-3 py-2 border border-[#e5e7eb] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00a8a8]" placeholder="Teléfono" />
                    </div>
                    <div>
                      <label className="block text-xs text-[#6b7280] font-medium mb-1">Email *</label>
                      <input type="email" className="w-full px-3 py-2 border border-[#e5e7eb] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00a8a8]" placeholder="email@ejemplo.com" required />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-[#6b7280] font-medium mb-1">Dirección</label>
                      <input type="text" className="w-full px-3 py-2 border border-[#e5e7eb] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00a8a8]" placeholder="Dirección completa" />
                    </div>
                    <div>
                      <label className="block text-xs text-[#6b7280] font-medium mb-1">Superficie (m²)</label>
                      <input type="number" className="w-full px-3 py-2 border border-[#e5e7eb] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00a8a8]" placeholder="Superficie" />
                    </div>
                    <div>
                      <label className="block text-xs text-[#6b7280] font-medium mb-1">Número de Empleados</label>
                      <input type="number" className="w-full px-3 py-2 border border-[#e5e7eb] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00a8a8]" placeholder="Número de empleados" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-[#6b7280] font-medium mb-2">Requisitos de Reporte / Estándares</label>
                      <p className="text-xs text-[#6b7280] mb-2 italic">Seleccione los estándares que el cliente debe cumplir en sus reportes</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {['NIS', 'GRI', 'SASB', 'ESR', 'ISO 14001', 'CDP', 'TCFD', 'SBTi'].map(estandar => (
                          <label key={estandar} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-[#f3f4f6] p-2 rounded-md">
                            <input type="checkbox" className="rounded border-[#e5e7eb] text-[#00a8a8] focus:ring-[#00a8a8]" />
                            <span className="text-[#1c2c4a]">{estandar}</span>
                          </label>
                        ))}
                      </div>
                      <div className="mt-2">
                        <input type="text" className="w-full px-3 py-2 border border-[#e5e7eb] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00a8a8]" placeholder="Otros estándares (separados por comas)" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* TIPOS DE RESIDUOS */}
                <div className="bg-white rounded-lg p-5 border border-[#e5e7eb]">
                  <h3 className="text-lg font-semibold text-[#1c2c4a] mb-4 flex items-center gap-2">
                    <Recycle size={20} />
                    Tipos de Residuos
                  </h3>
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs text-[#6b7280] font-medium mb-1">Tipo de Residuo</label>
                        <select className="w-full px-3 py-2 border border-[#e5e7eb] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00a8a8]">
                          <option>Orgánicos</option>
                          <option>Cartón</option>
                          <option>Plástico</option>
                          <option>Vidrio</option>
                          <option>Otros</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-[#6b7280] font-medium mb-1">Cantidad Estimada (ton/mes)</label>
                        <input type="number" step="0.1" className="w-full px-3 py-2 border border-[#e5e7eb] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00a8a8]" placeholder="0.0" />
                      </div>
                      <div>
                        <label className="block text-xs text-[#6b7280] font-medium mb-1">Destino Actual</label>
                        <input type="text" className="w-full px-3 py-2 border border-[#e5e7eb] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00a8a8]" placeholder="Relleno sanitario" />
                      </div>
                    </div>
                    <button type="button" className="text-sm text-[#00a8a8] hover:text-[#008080] font-medium flex items-center gap-1">
                      + Agregar otro tipo de residuo
                    </button>
                  </div>
                </div>

                {/* GENERACIÓN */}
                <div className="bg-white rounded-lg p-5 border border-[#e5e7eb]">
                  <h3 className="text-lg font-semibold text-[#1c2c4a] mb-4 flex items-center gap-2">
                    <TrendingUp size={20} />
                    Patrones de Generación
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-[#6b7280] font-medium mb-1">Frecuencia de Generación</label>
                      <select className="w-full px-3 py-2 border border-[#e5e7eb] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00a8a8]">
                        <option>Diaria</option>
                        <option>Semanal</option>
                        <option>Quincenal</option>
                        <option>Mensual</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-[#6b7280] font-medium mb-1">Días por Semana</label>
                      <input type="number" min="1" max="7" className="w-full px-3 py-2 border border-[#e5e7eb] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00a8a8]" placeholder="7" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-[#6b7280] font-medium mb-1">
                        Volumen Mensual Estimado (ton) *
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        id="volumenEstimado"
                        className="w-full px-3 py-2 border border-[#e5e7eb] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00a8a8]"
                        placeholder="Ingrese el volumen en toneladas"
                        required
                        onInput={(e) => {
                          const valor = parseFloat(e.target.value);
                          const advertencia = document.getElementById('advertenciaViabilidad');
                          if (valor && valor < 10) {
                            advertencia.classList.remove('hidden');
                          } else {
                            advertencia.classList.add('hidden');
                          }
                        }}
                      />
                      <div id="advertenciaViabilidad" className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-md hidden">
                        <div className="flex items-center gap-2 text-orange-700 text-xs">
                          <AlertCircle size={14} className="flex-shrink-0" />
                          <span className="font-medium">
                            Volumen por debajo del mínimo de viabilidad (10 ton/mes)
                          </span>
                        </div>
                        <p className="text-xs text-orange-600 mt-1 ml-5">
                          Según el procedimiento IME-COM-PRO-001, el criterio de viabilidad
                          es mínimo 10 toneladas de cartón o equivalente por mes. Se puede continuar
                          con el registro pero se marcará como "Baja viabilidad".
                        </p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-[#6b7280] font-medium mb-1">Horarios Preferidos de Recolección</label>
                      <input type="text" className="w-full px-3 py-2 border border-[#e5e7eb] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00a8a8]" placeholder="Ej: 6:00 AM, 2:00 PM" />
                    </div>
                  </div>
                </div>

                {/* SERVICIOS ACTUALES */}
                <div className="bg-white rounded-lg p-5 border border-[#e5e7eb]">
                  <h3 className="text-lg font-semibold text-[#1c2c4a] mb-4 flex items-center gap-2">
                    <FileText size={20} />
                    Servicios Actuales
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-[#6b7280] font-medium mb-1">Proveedor Actual</label>
                      <input type="text" className="w-full px-3 py-2 border border-[#e5e7eb] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00a8a8]" placeholder="Nombre del proveedor" />
                    </div>
                    <div>
                      <label className="block text-xs text-[#6b7280] font-medium mb-1">Costo Mensual Actual</label>
                      <input type="number" className="w-full px-3 py-2 border border-[#e5e7eb] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00a8a8]" placeholder="$0" />
                    </div>
                    <div>
                      <label className="block text-xs text-[#6b7280] font-medium mb-1">Fecha Vencimiento Contrato</label>
                      <input type="date" className="w-full px-3 py-2 border border-[#e5e7eb] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00a8a8]" />
                    </div>
                    <div>
                      <label className="block text-xs text-[#6b7280] font-medium mb-1">Nivel de Satisfacción (1-10)</label>
                      <input type="number" min="1" max="10" className="w-full px-3 py-2 border border-[#e5e7eb] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00a8a8]" placeholder="5" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-[#6b7280] font-medium mb-1">Razón de Cambio</label>
                      <textarea rows="2" className="w-full px-3 py-2 border border-[#e5e7eb] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00a8a8]" placeholder="¿Por qué está buscando cambiar de proveedor?"></textarea>
                    </div>
                  </div>
                </div>

                {/* INFRAESTRUCTURA */}
                <div className="bg-white rounded-lg p-5 border border-[#e5e7eb]">
                  <h3 className="text-lg font-semibold text-[#1c2c4a] mb-4 flex items-center gap-2">
                    <Building2 size={20} />
                    Infraestructura
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-[#6b7280] font-medium mb-1">Área de Almacenamiento (m²)</label>
                      <input type="number" className="w-full px-3 py-2 border border-[#e5e7eb] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00a8a8]" placeholder="0" />
                    </div>
                    <div>
                      <label className="block text-xs text-[#6b7280] font-medium mb-1">Número de Contenedores</label>
                      <input type="number" className="w-full px-3 py-2 border border-[#e5e7eb] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00a8a8]" placeholder="0" />
                    </div>
                    <div>
                      <label className="block text-xs text-[#6b7280] font-medium mb-1">Tipo de Almacenamiento</label>
                      <input type="text" className="w-full px-3 py-2 border border-[#e5e7eb] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00a8a8]" placeholder="Ej: Contenedores de 1.1 m³" />
                    </div>
                    <div>
                      <label className="block text-xs text-[#6b7280] font-medium mb-1">Acceso para Vehículos</label>
                      <select className="w-full px-3 py-2 border border-[#e5e7eb] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00a8a8]">
                        <option>Fácil</option>
                        <option>Moderado</option>
                        <option>Difícil</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-[#6b7280] font-medium mb-1">Restricciones de Horario</label>
                      <textarea rows="2" className="w-full px-3 py-2 border border-[#e5e7eb] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00a8a8]" placeholder="Ej: Recolección solo entre 6:00 AM - 8:00 PM"></textarea>
                    </div>
                  </div>
                </div>

                {/* NECESIDADES */}
                <div className="bg-white rounded-lg p-5 border border-[#e5e7eb]">
                  <h3 className="text-lg font-semibold text-[#1c2c4a] mb-4 flex items-center gap-2">
                    <Target size={20} />
                    Necesidades y Objetivos
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-xs text-[#6b7280] font-medium mb-2">Servicios Requeridos</label>
                      <div className="grid grid-cols-4 gap-2">
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" className="rounded border-[#e5e7eb]" />
                          <span>Separación</span>
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" className="rounded border-[#e5e7eb]" />
                          <span>Valorización</span>
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" className="rounded border-[#e5e7eb]" />
                          <span>Trazabilidad</span>
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" className="rounded border-[#e5e7eb]" />
                          <span>Reporteo</span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-[#6b7280] font-medium mb-1">Presupuesto Disponible (mensual)</label>
                      <input type="number" className="w-full px-3 py-2 border border-[#e5e7eb] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00a8a8]" placeholder="$0" />
                    </div>
                    <div>
                      <label className="block text-xs text-[#6b7280] font-medium mb-1">Urgencia</label>
                      <select className="w-full px-3 py-2 border border-[#e5e7eb] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00a8a8]">
                        <option>Baja</option>
                        <option>Media</option>
                        <option>Alta</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-[#6b7280] font-medium mb-1">Objetivos Ambientales</label>
                      <textarea rows="2" className="w-full px-3 py-2 border border-[#e5e7eb] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00a8a8]" placeholder="Ej: Reducir envío a relleno sanitario en 60%"></textarea>
                    </div>
                  </div>
                </div>

                {/* OBSERVACIONES */}
                <div className="bg-blue-50 rounded-lg p-5 border border-blue-200">
                  <h3 className="text-lg font-semibold text-[#1c2c4a] mb-2 flex items-center gap-2">
                    <FileText size={20} />
                    Observaciones
                  </h3>
                  <textarea rows="4" className="w-full px-3 py-2 border border-blue-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00a8a8]" placeholder="Notas adicionales sobre el levantamiento..."></textarea>
                </div>

                {/* BOTONES */}
                <div className="flex gap-3 pt-4 border-t border-[#e5e7eb]">
                  <button 
                    type="button"
                    onClick={() => setMostrarNuevoLevantamiento(false)}
                    className="flex-1 px-4 py-2 border border-[#e5e7eb] hover:bg-[#f3f4f6] text-[#1c2c4a] rounded-md text-sm font-medium transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-4 py-2 bg-[#00a8a8] hover:bg-[#008080] text-white rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2"
                  >
                    <Save size={16} />
                    Guardar Levantamiento
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE PROPUESTA */}
      {mostrarPropuesta && selectedProspecto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setMostrarPropuesta(false)}>
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-lg border border-[#e5e7eb]" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-[#e5e7eb] flex items-center justify-between bg-[#0D47A1] text-white rounded-t-lg">
              <div>
                <h2 className="text-xl font-semibold">Propuesta Comercial</h2>
                <p className="text-sm text-white/80 mt-1">{selectedProspecto.empresa}</p>
              </div>
              <button onClick={() => setMostrarPropuesta(false)} className="text-white hover:text-white/80">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-[#f3f4f6] rounded-lg p-4 border border-[#e5e7eb]">
                  <div className="text-xs text-[#6b7280] font-medium mb-1">Valor de Propuesta</div>
                  <div className="text-lg font-bold text-[#0D47A1]">
                    ${((selectedProspecto.propuesta?.ventaTotal || selectedProspecto.facturacionEstimada || 0) / 1000000).toFixed(1)}M
                  </div>
                </div>
                <div className="bg-[#f3f4f6] rounded-lg p-4 border border-[#e5e7eb]">
                  <div className="text-xs text-[#6b7280] font-medium mb-1">Volumen Mensual</div>
                  <div className="text-lg font-bold text-[#1c2c4a]">{selectedProspecto.volumenEstimado}</div>
                </div>
                <div className="bg-[#f3f4f6] rounded-lg p-4 border border-[#e5e7eb]">
                  <div className="text-xs text-[#6b7280] font-medium mb-1">Status</div>
                  <div className="text-lg font-bold text-[#1c2c4a]">{selectedProspecto.status}</div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-[#1c2c4a] mb-2">Servicios Propuestos</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white border border-[#e5e7eb] rounded-lg p-3 text-sm">Recolección</div>
                    <div className="bg-white border border-[#e5e7eb] rounded-lg p-3 text-sm">Transporte</div>
                    <div className="bg-white border border-[#e5e7eb] rounded-lg p-3 text-sm">Valorización</div>
                    <div className="bg-white border border-[#e5e7eb] rounded-lg p-3 text-sm">Reporteo Mensual</div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-semibold text-[#1c2c4a] mb-2">Comentarios</h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="text-sm font-medium text-[#1c2c4a]">{(selectedProspecto.comentarios || "Pendiente")}</div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-semibold text-[#1c2c4a] mb-2">Información Estratégica</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-[#6b7280] mb-1">Status</div>
                      <div className="text-sm font-semibold text-[#1c2c4a]">{selectedProspecto.status}</div>
                    </div>
                    <div>
                      <div className="text-xs text-[#6b7280] mb-1">Status Actual</div>
                      <div className={`text-sm font-semibold ${
                        selectedProspecto.status === 'Lead nuevo' || selectedProspecto.status === 'Inicio de operación' ? 'text-[#00a8a8]' : selectedProspecto.status === 'Propuesta enviada' ? 'text-[#0D47A1]' : 'text-orange-600'
                      }`}>
                        {selectedProspecto.status}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex gap-3">
                <button className="flex-1 bg-[#0D47A1] hover:bg-[#0D47A1] text-white py-2 rounded-md font-medium text-sm flex items-center justify-center gap-2">
                  <Download size={16} />
                  Descargar Propuesta PDF
                </button>
                <button className="flex-1 border border-[#0D47A1] text-[#0D47A1] hover:bg-[#f3f4f6] py-2 rounded-md font-medium text-sm">
                  Enviar por Email
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VISTA CLIENTE - MODAL */}
      {vistaCliente && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setVistaCliente(false)}>
          <div className="bg-white rounded-lg max-w-7xl w-full max-h-[95vh] overflow-y-auto shadow-2xl border border-[#e5e7eb]" onClick={e => e.stopPropagation()}>
            {/* HEADER CLIENTE */}
            <div className="sticky top-0 bg-[#0D47A1] text-white p-6 rounded-t-lg z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 rounded-lg p-3">
                    <Recycle size={32} className="text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">Dashboard de Trazabilidad</h1>
                    <p className="text-sm text-white/90 mt-1">
                      {(() => {
                        const clienteVista = clienteSeleccionadoVista ? clientesConReportes.find(c => c.id === clienteSeleccionadoVista) : null;
                        return clienteVista 
                          ? `${clienteVista.name} - Portal del Cliente`
                          : 'Vista General - Portal del Cliente';
                      })()}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setVistaCliente(false)}
                  className="text-white hover:text-white/80 bg-white/10 hover:bg-white/20 rounded-lg p-2 transition-all"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* CONTENIDO CLIENTE */}
            <div className="p-8 bg-[#f3f4f6]">
              {(() => {
                const clienteVista = clienteSeleccionadoVista ? clientesConReportes.find(c => c.id === clienteSeleccionadoVista) : null;
                const datosCliente = clienteSeleccionadoVista && trazabilidadPorCliente[clienteSeleccionadoVista] 
                  ? trazabilidadPorCliente[clienteSeleccionadoVista] 
                  : datosTrazabilidad;
                
                // Calcular KPIs
                const calcularTotal = (categoria) => {
                  return datosCliente[categoria].reduce((total, item) => {
                    const suma = meses.reduce((sum, mes) => sum + (item[mes] || 0), 0);
                    return total + suma;
                  }, 0);
                };

                const toneladasCirculares = calcularTotal('reciclaje') + calcularTotal('composta') + calcularTotal('reuso');
                const rellenoSanitario = calcularTotal('rellenoSanitario');
                const totalGenerado = toneladasCirculares + rellenoSanitario;
                const porcentajeDesviacion = totalGenerado > 0 ? ((toneladasCirculares / totalGenerado) * 100).toFixed(1) : 0;
                const datosSankeyCliente = clienteVista && datosCliente 
                  ? generarDatosSankeyCliente(clienteVista, datosCliente)
                  : null;

                return (
                  <>
                    {/* REQUISITOS DE REPORTE */}
                    {clienteVista && clienteVista.requisitosReporte && clienteVista.requisitosReporte.length > 0 && (
                      <div className="bg-white rounded-xl p-6 border border-[#e5e7eb] shadow-sm mb-6">
                        <div className="flex items-center gap-2 mb-4">
                          <FileText className="text-[#0D47A1]" size={20} />
                          <h3 className="text-lg font-semibold text-[#1c2c4a]">Estándares de Reporte Aplicados</h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {clienteVista.requisitosReporte.map((requisito, idx) => (
                            <span key={idx} className="px-3 py-1.5 bg-[#0D47A1] text-white text-xs font-medium rounded-md border border-[#0D47A1]">
                              {requisito}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-[#6b7280] mt-3 italic">
                          Los reportes generados cumplen con estos estándares para garantizar la transparencia y cumplimiento normativo
                        </p>
                      </div>
                    )}
                    
                    {/* KPIs PRINCIPALES */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                      <div className="bg-white rounded-xl p-6 border border-[#e5e7eb] shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <div className="bg-green-50 rounded-lg p-3">
                            <Recycle className="text-[#00a8a8]" size={24} />
                          </div>
                          <span className="text-xs text-[#6b7280] font-medium">Desviación</span>
                        </div>
                        <div className="text-3xl font-bold text-[#1c2c4a] mb-1">{porcentajeDesviacion}%</div>
                        <div className="text-sm text-[#6b7280]">Del total generado</div>
                      </div>

                      <div className="bg-white rounded-xl p-6 border border-[#e5e7eb] shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <div className="bg-blue-50 rounded-lg p-3">
                            <Leaf className="text-[#0D47A1]" size={24} />
                          </div>
                          <span className="text-xs text-[#6b7280] font-medium">Economía Circular</span>
                        </div>
                        <div className="text-3xl font-bold text-[#1c2c4a] mb-1">{toneladasCirculares.toLocaleString()}</div>
                        <div className="text-sm text-[#6b7280]">Toneladas valorizadas</div>
                      </div>

                      <div className="bg-white rounded-xl p-6 border border-[#e5e7eb] shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <div className="bg-orange-50 rounded-lg p-3">
                            <Trash2 className="text-orange-600" size={24} />
                          </div>
                          <span className="text-xs text-[#6b7280] font-medium">Relleno Sanitario</span>
                        </div>
                        <div className="text-3xl font-bold text-[#1c2c4a] mb-1">{rellenoSanitario.toLocaleString()}</div>
                        <div className="text-sm text-[#6b7280]">Toneladas enviadas</div>
                      </div>

                      <div className="bg-white rounded-xl p-6 border border-[#e5e7eb] shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <div className="bg-purple-50 rounded-lg p-3">
                            <BarChart3 className="text-purple-600" size={24} />
                          </div>
                          <span className="text-xs text-[#6b7280] font-medium">Total Generado</span>
                        </div>
                        <div className="text-3xl font-bold text-[#1c2c4a] mb-1">{totalGenerado.toLocaleString()}</div>
                        <div className="text-sm text-[#6b7280]">Toneladas totales</div>
                      </div>
                    </div>

                    {/* DIAGRAMA SANKEY */}
                    {datosSankeyCliente ? (
                      <div className="bg-white rounded-xl p-6 border border-[#e5e7eb] shadow-sm mb-8">
                        <div className="flex items-center justify-between mb-6">
                          <div>
                            <h2 className="text-xl font-semibold text-[#1c2c4a] mb-1">Flujo de Materiales</h2>
                            <p className="text-sm text-[#6b7280]">Trazabilidad completa de residuos</p>
                          </div>
                          <button
                            onClick={async () => {
                              const ref = document.querySelector('[data-sankey-cliente]');
                              if (ref) {
                                try {
                                  const canvas = await html2canvas(ref, {
                                    scale: 2,
                                    backgroundColor: '#ffffff',
                                    useCORS: true,
                                  });
                                  const link = document.createElement('a');
                                  link.download = `flujo-materiales-${clienteVista?.name || 'general'}.png`;
                                  link.href = canvas.toDataURL();
                                  link.click();
                                } catch (error) {
                                  console.error('Error exporting PNG:', error);
                                }
                              }
                            }}
                            className="bg-[#0D47A1] hover:bg-[#0D47A1] text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all"
                          >
                            <Download size={16} />
                            Descargar
                          </button>
                        </div>
                        <div data-sankey-cliente className="h-[500px] bg-white rounded-xl border border-[#e5e7eb]">
                          <ResponsiveSankey
                            data={datosSankeyCliente}
                            margin={{ top: 20, right: 200, bottom: 20, left: 200 }}
                            align="justify"
                            colors={(node) => node.nodeColor || '#64748b'}
                            nodeOpacity={1}
                            nodeHoverOpacity={0.8}
                            nodeThickness={18}
                            nodeSpacing={10}
                            nodeBorderWidth={0}
                            linkOpacity={0.5}
                            linkHoverOpacity={0.8}
                            linkContract={0}
                            enableLinkGradient={true}
                            labelPosition="outside"
                            labelOrientation="horizontal"
                            labelPadding={20}
                            labelTextColor="#374151"
                            labelWrap={true}
                            animate={true}
                            motionConfig="gentle"
                            nodeTooltip={({ node }) => {
                              const nodeData = datosSankeyCliente.nodes.find(n => n.id === node.id);
                              const nodeIdParts = node.id.split(' (');
                              const nombreDestino = nodeIdParts[0];
                              const registroAmbiental = nodeData?.registroAmbiental || (nodeIdParts[1] ? nodeIdParts[1].replace(')', '') : '');
                              return (
                                <div className="bg-[#1c2c4a] text-white p-3 rounded-lg shadow-xl border border-[#00a8a8]">
                                  <div className="font-semibold text-sm">{nombreDestino}</div>
                                  {registroAmbiental && (
                                    <div className="text-[#00a8a8] font-medium text-xs mt-1">Registro: {registroAmbiental}</div>
                                  )}
                                  {node.value && (
                                    <div className="text-xs mt-1">
                                      <div>Volumen total: {node.value.toFixed(1)} ton</div>
                                    </div>
                                  )}
                                </div>
                              );
                            }}
                            linkTooltip={({ link }) => {
                              const percentage = ((link.value / totalGenerado) * 100).toFixed(1);
                              return (
                                <div className="bg-[#1c2c4a] text-white p-3 rounded-lg shadow-xl border border-[#00a8a8]">
                                  <div className="font-semibold text-sm">{link.source.id} → {link.target.id}</div>
                                  <div className="text-xs mt-1">
                                    <div>Volumen: {link.value} ton</div>
                                    <div>Porcentaje: {percentage}% del total</div>
                                  </div>
                                </div>
                              );
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white rounded-xl p-8 border border-[#e5e7eb] shadow-sm mb-8 text-center">
                        <Recycle className="text-[#6b7280] mx-auto mb-4" size={48} />
                        <h3 className="text-lg font-semibold text-[#1c2c4a] mb-2">No hay datos de trazabilidad</h3>
                        <p className="text-sm text-[#6b7280]">Los datos de trazabilidad estarán disponibles próximamente.</p>
                      </div>
                    )}

                    {/* GRÁFICAS DE DISTRIBUCIÓN */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                      <div className="bg-white rounded-xl p-6 border border-[#e5e7eb] shadow-sm">
                        <h3 className="text-lg font-semibold text-[#1c2c4a] mb-4">Distribución por Destino</h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={calcularDistribucionPorDestino(datosCliente)}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="mes" stroke="#6b7280" fontSize={12} />
                            <YAxis stroke="#6b7280" fontSize={12} />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: '#1c2c4a', 
                                border: '1px solid #00a8a8', 
                                borderRadius: '8px',
                                color: '#fff'
                              }} 
                            />
                            <Legend />
                            <Bar dataKey="Reciclaje" fill="#00a8a8" />
                            <Bar dataKey="Composta" fill="#FF9800" />
                            <Bar dataKey="Reuso" fill="#2196F3" />
                            <Bar dataKey="Relleno Sanitario" fill="#F44336" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="bg-white rounded-xl p-6 border border-[#e5e7eb] shadow-sm">
                        <h3 className="text-lg font-semibold text-[#1c2c4a] mb-4">Evolución de Desviación</h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={calcularEvolucionDesviacion(datosCliente)}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="mes" stroke="#6b7280" fontSize={12} />
                            <YAxis stroke="#6b7280" fontSize={12} />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: '#1c2c4a', 
                                border: '1px solid #00a8a8', 
                                borderRadius: '8px',
                                color: '#fff'
                              }} 
                            />
                            <Legend />
                            <Line type="monotone" dataKey="Desviación" stroke="#00a8a8" strokeWidth={3} dot={{ fill: '#00a8a8', r: 4 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* RESUMEN MENSUAL */}
                    <div className="bg-white rounded-xl p-6 border border-[#e5e7eb] shadow-sm mb-8">
                      <h3 className="text-lg font-semibold text-[#1c2c4a] mb-4">Resumen Mensual</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-[#e5e7eb] bg-[#f3f4f6]">
                              <th className="text-left p-3 text-xs font-semibold text-[#6b7280]">Mes</th>
                              <th className="text-right p-3 text-xs font-semibold text-[#6b7280]">Reciclaje</th>
                              <th className="text-right p-3 text-xs font-semibold text-[#6b7280]">Composta</th>
                              <th className="text-right p-3 text-xs font-semibold text-[#6b7280]">Reuso</th>
                              <th className="text-right p-3 text-xs font-semibold text-[#6b7280]">Relleno</th>
                              <th className="text-right p-3 text-xs font-semibold text-[#6b7280]">Total</th>
                              <th className="text-right p-3 text-xs font-semibold text-[#6b7280]">Desviación</th>
                            </tr>
                          </thead>
                          <tbody>
                            {['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago'].map(mes => {
                              const reciclaje = datosCliente.reciclaje.reduce((sum, item) => sum + (item[mes] || 0), 0);
                              const composta = datosCliente.composta.reduce((sum, item) => sum + (item[mes] || 0), 0);
                              const reuso = datosCliente.reuso.reduce((sum, item) => sum + (item[mes] || 0), 0);
                              const relleno = datosCliente.rellenoSanitario.reduce((sum, item) => sum + (item[mes] || 0), 0);
                              const total = reciclaje + composta + reuso + relleno;
                              const desviacion = total > 0 ? (((reciclaje + composta + reuso) / total) * 100).toFixed(1) : 0;
                              
                              return (
                                <tr key={mes} className="border-b border-[#e5e7eb] hover:bg-[#f3f4f6]">
                                  <td className="p-3 text-sm font-semibold text-[#1c2c4a]">{mes}</td>
                                  <td className="p-3 text-sm text-[#1c2c4a] text-right">{reciclaje.toLocaleString()}</td>
                                  <td className="p-3 text-sm text-[#1c2c4a] text-right">{composta.toLocaleString()}</td>
                                  <td className="p-3 text-sm text-[#1c2c4a] text-right">{reuso.toLocaleString()}</td>
                                  <td className="p-3 text-sm text-[#1c2c4a] text-right">{relleno.toLocaleString()}</td>
                                  <td className="p-3 text-sm font-semibold text-[#1c2c4a] text-right">{total.toLocaleString()}</td>
                                  <td className="p-3 text-sm font-semibold text-[#00a8a8] text-right">{desviacion}%</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* BOTONES DE ACCIÓN CLIENTE */}
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => {
                          alert('Descargando reporte completo en PDF...');
                        }}
                        className="bg-[#0D47A1] hover:bg-[#0D47A1] text-white px-6 py-3 rounded-md font-medium text-sm flex items-center gap-2 transition-all shadow-sm hover:shadow-md"
                      >
                        <Download size={18} />
                        Descargar Reporte Completo
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE MOTIVO DE RECHAZO */}
      {mostrarModalRechazo && prospectoParaRechazar && (
        <ModalMotivoRechazo
          prospecto={prospectoParaRechazar}
          onClose={() => {
            setMostrarModalRechazo(false);
            setProspectoParaRechazar(null);
            setMotivoRechazoSeleccionado('');
            setDetalleRechazo('');
          }}
          onSave={(datosRechazo) => {
            // En una aplicación real, aquí se actualizaría el estado del prospecto
            console.log('Datos de rechazo guardados:', datosRechazo);
            alert(`Motivo de rechazo registrado exitosamente para ${prospectoParaRechazar.empresa}`);
            setMostrarModalRechazo(false);
            setProspectoParaRechazar(null);
            setMotivoRechazoSeleccionado('');
            setDetalleRechazo('');
          }}
        />
      )}
    </>
  );
};

// Auth wrapper component
function AuthenticatedApp() {
  const { user, isLoading, authReady } = useAuth();

  // Show loading screen while checking auth
  if (!authReady || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#1B5E20] via-[#2E7D32] to-[#388E3C]">
        <div className="text-center">
          <img src="/IGMexico-Blanco.png" alt="Innovative Group" className="mx-auto mb-4 w-48 animate-pulse" />
          <p className="text-white/80 text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!user) {
    return <LoginPage />;
  }

  // Show main app if authenticated
  return <InnovativeDemo />;
}

// Main App with all providers
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthenticatedApp />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;