import React, { useState, createRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  X, ChevronRight, Edit3, Trash2, Users, Package, ClipboardList, Clock,
  MessageSquare, FileText, Send, Phone, Mail, Copy, Check, XCircle,
  AlertCircle, Bell, CheckCircle, RotateCcw, PhoneCall, CalendarClock,
  Upload, Paperclip, Image, BarChart3, Lock, Sparkles, Leaf, Target,
} from 'lucide-react';
import { ProspectTimeline } from './ProspectTimeline';
import { ProspectNotes } from './ProspectNotes';
import { ProspectMeetings } from './ProspectMeetings';
import { ProspectDocuments } from './ProspectDocuments';
import { ProspectProposals } from './ProspectProposals';
import { ProspectEditDialog } from './ProspectEditDialog';
import { ProspectLevantamiento } from './ProspectLevantamiento';
import { ModalMotivoRechazo } from './ModalMotivoRechazo';
import { StageGateModal } from './StageGateModal';
import { fmtK } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import {
  KANBAN_STAGES, SERVICIOS_INNOVATIVE, SERVICE_COLORS, STAGE_GATES,
  classifyRechazo, getSeguimientoUrgency, getRecoveryState, RECHAZO_CATEGORIES,
  timeAgo, isTabLocked, tabUnlockLabel,
} from '@/lib/comercial-constants';
import { useRejectProspect } from '../api';
import { QualifyLeadDialog } from './QualifyLeadDialog';
import { useComercialData } from '../hooks/useComercialData';

interface Props {
  prospecto: any;
  onClose: () => void;
  onEdit?: (p: any) => void;
}

export function ProspectoDrawer({ prospecto, onClose, onEdit }: Props) {
  const { toast } = useToast();
  const {
    authUser,
    updateProspectMutation,
    deleteProspectMutation,
    createNoteMutation,
    deleteNoteMutation,
    createDocumentMutation,
    deleteDocumentMutation,
  } = useComercialData();
  const [drawerTab, setDrawerTab] = useState('info');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [prospectoNuevaNota, setProspectoNuevaNota] = useState('');
  const [showQualifyDialog, setShowQualifyDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showRechazoModal, setShowRechazoModal] = useState(false);
  const [pendingStageGate, setPendingStageGate] = useState<{ prospecto: any; fromStage: string; toStage: string } | null>(null);
  const rejectProspect = useRejectProspect();

  if (!prospecto) return null;
  const p = prospecto;
  const realProspectId = p.id;

  const { data: apiNotas = [] } = useQuery<any[]>({
    queryKey: [`/api/comercial/prospects/${realProspectId}/notes`],
    enabled: !!realProspectId,
    staleTime: 10 * 1000,
  });
  const { data: apiDocumentos = [] } = useQuery<any[]>({
    queryKey: [`/api/comercial/prospects/${realProspectId}/documents`],
    enabled: !!realProspectId,
    staleTime: 10 * 1000,
  });

  const stageInfo = KANBAN_STAGES.find(s => s.id === p.status);
  const dias = p.fecha ? Math.floor((new Date().getTime() - new Date(p.fecha).getTime()) / (1000 * 60 * 60 * 24)) : null;
  const valor = p.propuesta?.ventaTotal || p.facturacionEstimada || 0;
  const sc = p.servicios?.map((s: string) => {
    const svc = SERVICIOS_INNOVATIVE.find(si => si.id === s);
    const col = SERVICE_COLORS[s] || { bg: '#f3f4f6', text: '#6b7280', label: s, border: '#6b7280' };
    return { ...col, nombre: svc?.nombre || s, id: s };
  }) || [];

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const changeProspectoStage = (prospectoId: number, newStage: string) => {
    updateProspectMutation.mutate({ id: prospectoId, stage: newStage });
  };

  const guardarSeguimiento = (prospectoId: number, data: any) => {
    const updates: any = {};
    if (data.fechaSeguimiento !== undefined) updates.nextFollowUpAt = data.fechaSeguimiento || null;
    if (data.accion !== undefined) updates.followUpAction = data.accion || null;
    if (data.recoveryStatus !== undefined) updates.recoveryStatus = data.recoveryStatus || null;
    if (data.fechaVencimientoContrato !== undefined) updates.fechaVencimientoContrato = data.fechaVencimientoContrato || null;
    if (Object.keys(updates).length > 0) {
      updateProspectMutation.mutate({ id: prospectoId, ...updates });
    }
  };

  const agregarNota = () => {
    if (!prospectoNuevaNota.trim()) return;
    createNoteMutation.mutate({ prospectId: realProspectId, content: prospectoNuevaNota.trim() });
    setProspectoNuevaNota('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    files.forEach(f => {
      createDocumentMutation.mutate({
        prospectId: realProspectId,
        name: f.name,
        type: 'otro',
        url: `local://${f.name}`,
        fileSize: f.size,
        mimeType: f.type,
        uploadedById: authUser?.id,
      });
    });
    e.target.value = '';
  };

  const getFileIcon = (type: string | undefined) => {
    if (type?.includes('pdf')) return <FileText size={16} className="text-red-500" />;
    if (type?.includes('image')) return <Image size={16} className="text-blue-500" />;
    if (type?.includes('sheet') || type?.includes('excel') || type?.includes('csv')) return <BarChart3 size={16} className="text-green-600" />;
    return <Paperclip size={16} className="text-gray-400" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const CRM_TABS = [
    { id: 'info', label: 'Info', icon: ClipboardList },
    { id: 'timeline', label: 'Timeline', icon: Clock },
    { id: 'notas', label: 'Notas', icon: MessageSquare },
    { id: 'reuniones', label: 'Reuniones', icon: Users },
    { id: 'levantamiento', label: 'Levantamiento', icon: Target },
    { id: 'docs', label: 'Docs', icon: FileText },
    { id: 'propuestas', label: 'Propuestas', icon: Send },
  ];

  const drawerFileRef = createRef<HTMLInputElement>();

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
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
            <div className="flex items-center gap-1.5">
              {/* Avanzar Etapa */}
              {(() => {
                const stageIds = KANBAN_STAGES.map(s => s.id);
                const currentIdx = stageIds.indexOf(p.status);
                const nextStage = currentIdx >= 0 && currentIdx < stageIds.length - 1 ? KANBAN_STAGES[currentIdx + 1] : null;
                if (!nextStage) return null;
                return (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // From contacto_inicial → open qualify dialog instead of advancing directly
                      if (p.status === 'contacto_inicial') {
                        setShowQualifyDialog(true);
                        return;
                      }
                      const gate = STAGE_GATES[nextStage.id];
                      if (gate && !gate.validate(p)) {
                        setPendingStageGate({ prospecto: p, fromStage: p.status, toStage: nextStage.id });
                        return;
                      }
                      changeProspectoStage(p.id, nextStage.id);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-[#00a8a8] hover:bg-[#008b8b] text-white rounded-lg text-xs font-medium transition-all"
                  >
                    <ChevronRight size={14} /> {p.status === 'contacto_inicial' ? 'Calificar' : `Avanzar a ${nextStage.label}`}
                  </button>
                );
              })()}
              {/* Rechazar */}
              {p.status !== 'cierre_perdido' && p.status !== 'cierre_ganado' && (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowRechazoModal(true); }}
                  className="flex items-center gap-1 px-2 py-1.5 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 rounded-lg text-xs font-medium transition-all"
                >
                  <XCircle size={14} /> Rechazar
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); setShowEditDialog(true); }}
                className="p-1.5 text-[#999] hover:text-[#00a8a8] hover:bg-[#00a8a8]/10 rounded-lg transition-all"
                title="Editar prospecto"
              >
                <Edit3 size={16} />
              </button>
              {(authUser?.role === 'admin' || authUser?.role === 'comercial' || authUser?.role === 'director') && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`¿Eliminar prospecto "${p.empresa}"? Esta acción no se puede deshacer.`)) {
                      deleteProspectMutation.mutate(p.id);
                      onClose();
                    }
                  }}
                  className="p-1.5 text-[#999] hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  title="Eliminar prospecto"
                >
                  <Trash2 size={16} />
                </button>
              )}
              <button onClick={onClose} className="text-[#999] hover:text-[#333] p-1 transition-colors">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="flex items-center gap-0.5 mt-4 -mx-6 px-6">
            {KANBAN_STAGES.map((stage, idx) => {
              const currentIdx = KANBAN_STAGES.findIndex(s => s.id === p.status);
              const isPast = idx < currentIdx;
              const isCurrent = idx === currentIdx;
              return (
                <div key={stage.id} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full h-1.5 rounded-full transition-all"
                    style={{
                      backgroundColor: isPast || isCurrent ? stage.color : '#e5e7eb',
                      opacity: isPast ? 0.5 : 1,
                    }}
                  />
                  <span className={`text-[9px] font-medium truncate max-w-full ${isCurrent ? 'text-[#1a1a1a]' : 'text-[#bbb]'}`}>
                    {stage.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-3 border-b border-[#f0f0f0] -mx-6 px-6">
            {CRM_TABS.map(tab => {
              const locked = isTabLocked(tab.id, p.status);
              return (
                <button
                  key={tab.id}
                  onClick={() => setDrawerTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-all relative ${
                    locked ? 'text-[#999]/40 cursor-default' :
                    drawerTab === tab.id ? 'text-[#1a1a1a]' : 'text-[#999] hover:text-[#666]'
                  }`}
                >
                  {locked ? <Lock size={12} className="text-[#ccc]" /> : <tab.icon size={15} />}
                  {tab.label}
                  {!locked && drawerTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1a1a1a] rounded-full" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Locked tab placeholder */}
          {isTabLocked(drawerTab, p.status) && (
            <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
              <div className="w-14 h-14 rounded-full bg-[#f3f4f6] flex items-center justify-center mb-4">
                <Lock size={24} className="text-[#ccc]" />
              </div>
              <p className="text-sm font-medium text-[#999]">
                Esta seccion se activa en la etapa <span className="font-semibold text-[#666]">{tabUnlockLabel(drawerTab)}</span>
              </p>
              <p className="text-xs text-[#bbb] mt-1">Avanza el prospecto para desbloquear</p>
            </div>
          )}

          {!isTabLocked(drawerTab, p.status) && drawerTab === 'timeline' && <div className="p-5"><ProspectTimeline prospectId={realProspectId} /></div>}
          {!isTabLocked(drawerTab, p.status) && drawerTab === 'notas' && <div className="p-5"><ProspectNotes prospectId={realProspectId} /></div>}
          {!isTabLocked(drawerTab, p.status) && drawerTab === 'reuniones' && <div className="p-5"><ProspectMeetings prospectId={realProspectId} /></div>}
          {!isTabLocked(drawerTab, p.status) && drawerTab === 'levantamiento' && <div className="p-5"><ProspectLevantamiento prospectId={realProspectId} /></div>}
          {!isTabLocked(drawerTab, p.status) && drawerTab === 'docs' && <div className="p-5"><ProspectDocuments prospectId={realProspectId} /></div>}
          {!isTabLocked(drawerTab, p.status) && drawerTab === 'propuestas' && <div className="p-5"><ProspectProposals prospectId={realProspectId} /></div>}

          {drawerTab === 'info' && (
            <>
              {/* Qualify Lead Banner */}
              {p.status === 'contacto_inicial' && (
                <div className="mx-5 mt-4 rounded-xl border-2 border-[#00a8a8]/30 bg-gradient-to-r from-[#00a8a8]/5 to-[#0D47A1]/5 overflow-hidden">
                  <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#00a8a8]/10 flex items-center justify-center">
                        <Sparkles size={18} className="text-[#00a8a8]" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-[#1c2c4a]">Calificar Lead</div>
                        <div className="text-xs text-[#6b7280]">Agrega datos de negocio y residuos para avanzar</div>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowQualifyDialog(true)}
                      className="px-4 py-2 bg-[#00a8a8] hover:bg-[#008b8b] text-white rounded-lg text-sm font-semibold transition-all shadow-sm"
                    >
                      Calificar
                    </button>
                  </div>
                </div>
              )}

              {/* Rejection banner */}
              {p.status === 'cierre_perdido' && (() => {
                const cat = classifyRechazo(p.motivoRechazo);
                const seg = { fechaSeguimiento: p.fechaSeguimiento, accion: p.followUpAction, recoveryStatus: p.recoveryStatus, fechaVencimientoContrato: p.fechaVencimientoContrato };
                const urgency = getSeguimientoUrgency(seg);
                return (
                  <div className="mx-5 mt-4 rounded-xl border-2 overflow-hidden" style={{ borderColor: cat?.color || '#EF4444' }}>
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
                      {cat?.recoverable && <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-1 rounded-full flex-shrink-0">Recuperable</span>}
                    </div>
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
                      <div>
                        <label className="block text-[11px] font-semibold text-[#1c2c4a] mb-1 flex items-center gap-1">
                          <CalendarClock size={12} className="text-[#00a8a8]" /> Vencimiento de contrato actual
                        </label>
                        <input type="date" value={seg?.fechaVencimientoContrato || ''}
                          onChange={(e) => guardarSeguimiento(p.id, { fechaVencimientoContrato: e.target.value })}
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
                      {/* Recovery state */}
                      {(() => {
                        const recovery = getRecoveryState(seg);
                        return (
                          <div className="space-y-2 pt-1 border-t border-[#f3f4f6]">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-[#6b7280]">Estado:</span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: recovery.bg, color: recovery.color }}>{recovery.label}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {recovery.id !== 're_contactada' && (
                                <button onClick={() => guardarSeguimiento(p.id, { recoveryStatus: 're_contactada' })}
                                  className="px-3 py-2 rounded-lg bg-[#3B82F6]/10 text-[#3B82F6] text-xs font-semibold hover:bg-[#3B82F6]/20 transition-colors flex items-center justify-center gap-1.5 border border-[#3B82F6]/20">
                                  <PhoneCall size={12} /> Marcar Re-contactada
                                </button>
                              )}
                              <button onClick={() => { changeProspectoStage(p.id, 'contacto_inicial'); guardarSeguimiento(p.id, { recoveryStatus: null, fechaSeguimiento: null }); }}
                                className="px-3 py-2 rounded-lg bg-[#00a8a8] text-white text-xs font-semibold hover:bg-[#008080] transition-colors flex items-center justify-center gap-1.5">
                                <RotateCcw size={12} /> Reactivar en Presupuesto
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
                    <div className="text-xl font-bold text-[#0D47A1]">{valor > 0 ? fmtK(valor) : '—'}</div>
                  </div>
                  <div className="flex-1 bg-[#f3f4f6] rounded-xl p-3 text-center">
                    <div className="text-xs text-[#6b7280] mb-0.5">Días en seguimiento</div>
                    <div className="text-xl font-bold text-[#1c2c4a]">{dias !== null ? dias : '—'}</div>
                  </div>
                </div>

                {/* Contact */}
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
                      <div className="flex flex-wrap gap-2">
                        {p.contacto.telefono && (
                          <a href={`tel:${p.contacto.telefono}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 transition-colors">
                            <Phone size={12} /> Llamar
                          </a>
                        )}
                        {p.contacto.telefono && (
                          <a href={`https://wa.me/52${p.contacto.telefono.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-white text-xs font-semibold hover:opacity-90 transition-colors shadow-sm" style={{ backgroundColor: '#25D366' }}>
                            <MessageSquare size={14} /> WhatsApp
                          </a>
                        )}
                        {p.contacto.correo && (
                          <a href={`mailto:${p.contacto.correo}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors">
                            <Mail size={12} /> Email
                          </a>
                        )}
                      </div>
                      {p.contacto.correo && (
                        <div className="flex items-center justify-between group">
                          <div className="flex items-center gap-2 text-sm text-[#6b7280]"><Mail size={13} className="text-[#9ca3af]" /><span>{p.contacto.correo}</span></div>
                          <button onClick={() => copyToClipboard(p.contacto.correo, 'correo')} className="opacity-0 group-hover:opacity-100 text-[#9ca3af] hover:text-[#00a8a8] transition-all p-1">
                            {copiedField === 'correo' ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
                          </button>
                        </div>
                      )}
                      {p.contacto.telefono && (
                        <div className="flex items-center justify-between group">
                          <div className="flex items-center gap-2 text-sm text-[#6b7280]"><Phone size={13} className="text-[#9ca3af]" /><span>{p.contacto.telefono}</span></div>
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
                      {sc.map((s: any) => (
                        <span key={s.id} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ backgroundColor: s.bg, color: s.text, border: `1px solid ${s.border || s.text}20` }}>
                          {s.nombre}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Qualification Waste Data */}
                {p.levantamientoData?.qualificationWaste && (() => {
                  const qw = p.levantamientoData.qualificationWaste;
                  return (
                    <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
                      <div className="px-4 py-3 bg-[#f0fdf4] border-b border-[#e5e7eb]">
                        <h3 className="text-sm font-semibold text-[#1c2c4a] flex items-center gap-2"><Leaf size={14} className="text-[#22C55E]" /> Residuos (Calificacion)</h3>
                      </div>
                      <div className="p-4 space-y-3">
                        {qw.wasteTypes?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {qw.wasteTypes.map((wt: string) => (
                              <span key={wt} className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                                {wt}
                              </span>
                            ))}
                          </div>
                        )}
                        {qw.estimatedVolume && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-[#6b7280]">Volumen estimado</span>
                            <span className="font-medium text-[#1c2c4a]">{qw.estimatedVolume}</span>
                          </div>
                        )}
                        {qw.hasCurrentProvider && qw.currentProviderName && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-[#6b7280]">Proveedor actual</span>
                            <span className="font-medium text-[#1c2c4a]">{qw.currentProviderName}</span>
                          </div>
                        )}
                        {qw.reasonForChange && (
                          <div className="text-sm">
                            <span className="text-[#6b7280]">Razon de cambio: </span>
                            <span className="text-[#1c2c4a]">{qw.reasonForChange}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Details */}
                {(p.volumenEstimado || p.propuesta?.ventaTotal || p.motivoRechazo || p.fecha || p.potential || p.probability || p.priority || p.nextStep) && (
                  <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
                    <div className="px-4 py-3 bg-[#f9fafb] border-b border-[#e5e7eb]">
                      <h3 className="text-sm font-semibold text-[#1c2c4a] flex items-center gap-2"><ClipboardList size={14} /> Detalles</h3>
                    </div>
                    <div className="p-4 space-y-2.5">
                      {p.potential && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-[#6b7280]">Potencial</span>
                          <span className={`font-medium px-2 py-0.5 rounded-full text-xs ${
                            p.potential === 'Muy Alto' ? 'bg-green-100 text-green-700' :
                            p.potential === 'Alto' ? 'bg-blue-100 text-blue-700' :
                            p.potential === 'Medio' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>{p.potential}</span>
                        </div>
                      )}
                      {p.probability != null && p.probability > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-[#6b7280]">Probabilidad</span>
                          <span className="font-medium text-[#1c2c4a]">{p.probability}%</span>
                        </div>
                      )}
                      {p.priority && p.priority !== 'media' && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-[#6b7280]">Prioridad</span>
                          <span className={`font-medium px-2 py-0.5 rounded-full text-xs ${
                            p.priority === 'muy_alta' ? 'bg-red-100 text-red-700' :
                            p.priority === 'alta' ? 'bg-orange-100 text-orange-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>{p.priority === 'muy_alta' ? 'Muy Alta' : p.priority === 'alta' ? 'Alta' : p.priority === 'baja' ? 'Baja' : 'Media'}</span>
                        </div>
                      )}
                      {p.volumenEstimado && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-[#6b7280]">Volumen estimado</span>
                          <span className="font-medium text-[#1c2c4a]">{p.volumenEstimado}</span>
                        </div>
                      )}
                      {p.serviceVolumes && Object.keys(p.serviceVolumes).length > 0 && (
                        <div className="text-sm space-y-1 pl-2 border-l-2 border-[#e5e7eb]">
                          {Object.entries(p.serviceVolumes as Record<string, string>).map(([svcId, vol]) => {
                            const svc = SERVICIOS_INNOVATIVE.find(s => s.id === svcId);
                            return vol ? (
                              <div key={svcId} className="flex items-center justify-between">
                                <span className="text-[#6b7280] text-xs">{svc?.nombre || svcId}</span>
                                <span className="text-xs font-medium text-[#1c2c4a]">{vol}</span>
                              </div>
                            ) : null;
                          })}
                        </div>
                      )}
                      {p.propuesta?.ventaTotal && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-[#6b7280]">Venta total (contrato)</span>
                          <span className="font-bold text-[#0D47A1]">{fmtK(p.propuesta.ventaTotal)}</span>
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
                      {p.nextStep && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-[#6b7280]">Siguiente paso</span>
                          <span className="font-medium text-[#1c2c4a] truncate max-w-[250px]">{p.nextStep}</span>
                        </div>
                      )}
                      {p.reason && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-[#6b7280]">Razon de interes</span>
                          <span className="font-medium text-[#1c2c4a] truncate max-w-[250px]">{p.reason}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Notes inline */}
                <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
                  <div className="px-4 py-3 bg-[#f9fafb] border-b border-[#e5e7eb]">
                    <h3 className="text-sm font-semibold text-[#1c2c4a] flex items-center gap-2">
                      <MessageSquare size={14} /> Notas
                      {(apiNotas as any[]).length > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#e5e7eb] text-[#6b7280]">{(apiNotas as any[]).length}</span>}
                    </h3>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex gap-2">
                      <textarea
                        value={prospectoNuevaNota}
                        onChange={(e) => setProspectoNuevaNota(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); agregarNota(); } }}
                        placeholder="Escribe una nota... (Enter para guardar)"
                        className="flex-1 border border-[#e5e7eb] rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#00a8a8]/30 focus:border-[#00a8a8]"
                        rows={1}
                      />
                      <button onClick={agregarNota} disabled={!prospectoNuevaNota.trim()}
                        className="self-end px-3 py-2 bg-[#00a8a8] hover:bg-[#008080] disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-colors">
                        <Send size={14} />
                      </button>
                    </div>
                    {(apiNotas as any[]).length > 0 ? (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {[...(apiNotas as any[])].reverse().map((nota: any) => (
                          <div key={nota.id} className="bg-[#f9fafb] rounded-lg p-3 group">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm text-[#1c2c4a] flex-1 whitespace-pre-wrap">{nota.content}</p>
                              <button onClick={() => deleteNoteMutation.mutate({ prospectId: realProspectId, noteId: nota.id })}
                                className="opacity-0 group-hover:opacity-100 text-[#6b7280] hover:text-red-500 transition-all flex-shrink-0 mt-0.5">
                                <Trash2 size={12} />
                              </button>
                            </div>
                            <div className="flex items-center gap-1 mt-1.5 text-[10px] text-[#9ca3af]">
                              <Clock size={9} /> {timeAgo(nota.createdAt) || 'ahora'}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[#9ca3af] text-center py-2">Agrega una nota...</p>
                    )}
                  </div>
                </div>

                {/* Files inline */}
                <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
                  <div className="px-4 py-3 bg-[#f9fafb] border-b border-[#e5e7eb]">
                    <h3 className="text-sm font-semibold text-[#1c2c4a] flex items-center gap-2">
                      <Paperclip size={14} /> Archivos
                      {(apiDocumentos as any[]).length > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#e5e7eb] text-[#6b7280]">{(apiDocumentos as any[]).length}</span>}
                    </h3>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="border border-dashed border-[#d1d5db] hover:border-[#00a8a8] rounded-lg p-3 text-center transition-colors cursor-pointer"
                      onClick={() => drawerFileRef.current?.click()}>
                      <input type="file" ref={drawerFileRef} className="hidden" multiple
                        accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.xlsx,.xls,.csv,.doc,.docx"
                        onChange={handleFileUpload} />
                      <Upload size={16} className="text-[#d1d5db] mx-auto mb-1" />
                      <p className="text-xs text-[#6b7280]">Click para subir archivos</p>
                    </div>
                    {(apiDocumentos as any[]).length > 0 ? (
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {[...(apiDocumentos as any[])].reverse().map((archivo: any) => (
                          <div key={archivo.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-[#f9fafb] group transition-colors">
                            <div className="w-7 h-7 rounded-md bg-[#f3f4f6] flex items-center justify-center flex-shrink-0">
                              {getFileIcon(archivo.mimeType)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium text-[#1c2c4a] truncate">{archivo.name}</div>
                              <div className="text-[10px] text-[#9ca3af]">{formatFileSize(archivo.fileSize)} · {timeAgo(archivo.createdAt)}</div>
                            </div>
                            <button onClick={() => deleteDocumentMutation.mutate({ prospectId: realProspectId, docId: archivo.id })}
                              className="opacity-0 group-hover:opacity-100 text-[#6b7280] hover:text-red-500 transition-all">
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
              </div>
            </>
          )}
        </div>

        {/* Qualify Lead Dialog */}
        {showQualifyDialog && (
          <QualifyLeadDialog
            prospect={p}
            onClose={() => setShowQualifyDialog(false)}
            onQualified={() => { setShowQualifyDialog(false); onClose(); }}
          />
        )}

        {/* Edit Dialog */}
        {showEditDialog && (
          <ProspectEditDialog
            prospect={p}
            onClose={() => setShowEditDialog(false)}
            onSaved={() => setShowEditDialog(false)}
          />
        )}

        {/* Stage Gate Modal */}
        {pendingStageGate && (
          <StageGateModal
            pendingMove={pendingStageGate}
            onForce={() => {
              changeProspectoStage(pendingStageGate.prospecto.id, pendingStageGate.toStage);
              setPendingStageGate(null);
            }}
            onCancel={() => setPendingStageGate(null)}
          />
        )}

        {/* Rechazo Modal */}
        {showRechazoModal && (
          <ModalMotivoRechazo
            prospecto={p}
            onClose={() => setShowRechazoModal(false)}
            onSave={async (data) => {
              try {
                await rejectProspect.mutateAsync({
                  id: p.id,
                  rejectionReasonId: data.motivoRechazo,
                  rejectionDetail: data.motivoRechazoDetalle,
                });
                setShowRechazoModal(false);
                onClose();
              } catch (err) {
                console.error('[comercial] Error al rechazar prospecto:', err);
                toast({ title: "Error al guardar el rechazo", description: "Intenta de nuevo", variant: "destructive" });
              }
            }}
          />
        )}
      </div>
    </div>
  );
}
