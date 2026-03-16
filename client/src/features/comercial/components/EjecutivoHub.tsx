import { useState, useCallback } from 'react';
import { ArrowLeft, Plus, Lock, ChevronDown, ChevronUp, X, AlertCircle, Calendar, Bell, DollarSign, Edit3, Save, Target, Check } from 'lucide-react';
import { DndContext, closestCenter, DragOverlay, useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import {
  HUB_KANBAN_STAGES,
  STAGE_GATES,
  ExecutiveAvatar,
  getSeguimientoUrgency,
  classifyRechazo,
} from '@/lib/comercial-constants';
import { useComercialData } from '../hooks/useComercialData';
import { useToast } from '@/components/ui/use-toast';
import { HubKanbanCard } from './HubKanbanCard';
import { StageGateModal } from './StageGateModal';
import { ProspectoDrawer } from './ProspectoDrawer';
import { apiRequest, queryClient } from '@/lib/queryClient';

function HubDroppableColumn({ stageId, children }: { stageId: string; children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({ id: `hub-${stageId}`, data: { stageId } });
  return (
    <div ref={setNodeRef} className={`min-h-[120px] transition-colors rounded-lg flex-1 ${isOver ? 'bg-[#00a8a8]/5 ring-2 ring-[#00a8a8]/30' : ''}`}>
      {children}
    </div>
  );
}

interface Props {
  member: any;
  onBack: () => void;
  onShowNuevoLead?: (ejecutivo?: string) => void;
}

export function EjecutivoHub({ member, onBack, onShowNuevoLead }: Props) {
  const {
    kanbanProspectos,
    sensors,
    updateProspectMutation,
    ventasRealesEditadas,
    setVentasRealesEditadas,
  } = useComercialData();
  const { toast } = useToast();

  const memberProspectos = kanbanProspectos.filter(p => p.ejecutivo === member.codigo);
  const memberLeads = memberProspectos.filter(p => ['contacto_inicial', 'presentacion'].includes(p.status));
  const memberProspectosActivos = memberProspectos.filter(p => !['contacto_inicial', 'presentacion', 'cierre_perdido'].includes(p.status));
  const memberRechazados = memberProspectos.filter(p => p.status === 'cierre_perdido');
  const memberGanados = memberProspectos.filter(p => p.status === 'cierre_ganado');
  const memberPropuestas = memberProspectos.filter(p => ['propuesta', 'negociacion'].includes(p.status));
  const totalPipeline = memberProspectos.filter(p => p.status !== 'cierre_perdido').reduce((s, p) => s + (p.propuesta?.ventaTotal || p.facturacionEstimada || 0), 0);

  // State
  const [selectedProspecto, setSelectedProspecto] = useState<any>(null);
  const [hubActiveKanbanId, setHubActiveKanbanId] = useState<number | null>(null);
  const [showRechazadasModal, setShowRechazadasModal] = useState(false);
  const [showVentasRealesModal, setShowVentasRealesModal] = useState(false);
  const [ventaRealMonto, setVentaRealMonto] = useState('');
  const [ventaRealMes, setVentaRealMes] = useState(new Date().getMonth() + 1);
  const [ventaRealAño, setVentaRealAño] = useState(new Date().getFullYear());
  const [expandedColumns, setExpandedColumns] = useState<Record<string, boolean>>({});
  const [showStageGateModal, setShowStageGateModal] = useState(false);
  const [pendingMove, setPendingMove] = useState<any>(null);

  // DnD handlers
  const hubHandleDragStart = useCallback((event: any) => {
    setHubActiveKanbanId(event.active.id);
  }, []);

  const hubHandleDragEnd = useCallback((event: any) => {
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
    const validStages = HUB_KANBAN_STAGES.map(s => s.id);
    if (!validStages.includes(targetStage)) return;
    const gate = STAGE_GATES[targetStage];
    if (gate && !gate.validate(prospecto)) {
      setShowStageGateModal(true);
      setPendingMove({ prospecto, fromStage: prospecto.status, toStage: targetStage });
      return;
    }
    updateProspectMutation.mutate({ id: prospecto.id, stage: targetStage });
    setSelectedProspecto((prev: any) => prev && prev.id === prospecto.id ? { ...prev, status: targetStage } : prev);
  }, [memberProspectos, updateProspectMutation]);

  const hubActiveCard = hubActiveKanbanId ? memberProspectos.find(p => p.id === hubActiveKanbanId) : null;

  return (
    <div className="bg-[#faf7f2] min-h-full">
      <div className="max-w-[1400px] mx-auto">

        {/* BACK + HEADER */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onBack}
            className="flex items-center justify-center w-9 h-9 rounded-lg bg-white border border-[#e5e7eb] hover:bg-[#f3f4f6] transition-colors">
            <ArrowLeft size={18} className="text-[#6b7280]" />
          </button>
          <ExecutiveAvatar codigo={member.codigo} name={member.name} size="xl" />
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-[#1c2c4a]">{member.name}</h1>
            <p className="text-sm text-[#6b7280]">{member.role}{member.zona ? ` — ${member.zona}` : ''}</p>
          </div>
          <div className="text-right hidden md:block">
            <div className="text-sm text-[#6b7280]">Presupuesto Anual</div>
            <div className="text-xl font-bold text-[#0D47A1]">${(member.presupuestoAnual2026 / 1000000).toFixed(1)}M</div>
            <div className="text-xs text-[#9ca3af]">${(member.presupuestoMensual / 1000000).toFixed(2)}M / mes</div>
          </div>
          {onShowNuevoLead && (
            <button onClick={() => onShowNuevoLead(member.codigo)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#1c2c4a] hover:bg-[#1c2c4a]/90 text-white rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-md">
              <Plus size={16} /> Nuevo Lead
            </button>
          )}
        </div>

        {/* KPI ROW */}
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
            const vencidos = memberRechazados.filter(p => getSeguimientoUrgency({ fechaSeguimiento: p.fechaSeguimiento, accion: p.followUpAction, recoveryStatus: p.recoveryStatus, fechaVencimientoContrato: p.fechaVencimientoContrato })?.overdue).length;
            const conSeg = memberRechazados.filter(p => p.fechaSeguimiento).length;
            return (
              <button onClick={() => setShowRechazadasModal(true)}
                className={`bg-white rounded-xl border p-3 text-center hover:shadow-md transition-all ${vencidos > 0 ? 'border-red-300' : 'border-[#e5e7eb]'}`}>
                <div className="flex items-center justify-center gap-1">
                  <div className="text-2xl font-bold" style={{ color: vencidos > 0 ? '#EF4444' : '#F59E0B' }}>{memberRechazados.length}</div>
                  {vencidos > 0 && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                </div>
                <div className="text-xs text-[#6b7280] mt-0.5">Rechazadas</div>
                <div className="text-[9px] text-[#9ca3af] mt-0.5">{conSeg} con seguimiento</div>
              </button>
            );
          })()}
          {member.presupuestoAnual2026 > 0 && (
            <button onClick={() => setShowVentasRealesModal(true)}
              className="bg-white rounded-xl border border-[#e5e7eb] p-3 text-center hover:shadow-md hover:border-[#00a8a8]/50 transition-all cursor-pointer">
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
              <div className="mt-3 bg-[#0067B0] hover:bg-[#005a9e] text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm">
                <Edit3 size={15} /> Editar venta real
              </div>
            </button>
          )}
        </div>

        {/* PIPELINE — Kanban personal */}
        <div className="space-y-4">
          {/* Quick summary */}
          <div className="flex items-center gap-4 text-xs">
            <span className="text-[#6b7280]"><strong className="text-[#1c2c4a]">{memberProspectos.filter(p => p.status !== 'cierre_perdido').length}</strong> prospectos</span>
            <span className="text-[#6b7280]"><strong className="text-[#0D47A1]">${(totalPipeline / 1000000).toFixed(1)}M</strong> presupuesto</span>
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
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={hubHandleDragStart} onDragEnd={hubHandleDragEnd}>
            <div className="grid grid-cols-6 gap-2">
              {HUB_KANBAN_STAGES.map(stage => {
                const stageItems = memberProspectos.filter(p => p.status === stage.id);
                const stageValue = stageItems.reduce((s, p) => s + (p.propuesta?.ventaTotal || p.facturacionEstimada || 0), 0);
                const gate = STAGE_GATES[stage.id];

                return (
                  <div key={stage.id} className="flex flex-col">
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
                    <HubDroppableColumn stageId={stage.id}>
                      <SortableContext items={stageItems.map(p => p.id)} strategy={verticalListSortingStrategy}>
                        {(() => {
                          const MAX_VISIBLE = 3;
                          const isExpanded = expandedColumns[stage.id];
                          const visibleItems = isExpanded ? stageItems : stageItems.slice(0, MAX_VISIBLE);
                          const hiddenCount = stageItems.length - MAX_VISIBLE;
                          return (
                            <div className="space-y-0">
                              {visibleItems.map(prospecto => (
                                <HubKanbanCard key={prospecto.id} prospecto={prospecto} onSelect={setSelectedProspecto} />
                              ))}
                              {hiddenCount > 0 && (
                                <button onClick={(e) => { e.stopPropagation(); setExpandedColumns(prev => ({ ...prev, [stage.id]: !isExpanded })); }}
                                  className="w-full py-1.5 text-[10px] font-medium text-[#0D47A1] hover:bg-[#0D47A1]/5 rounded-lg transition-colors flex items-center justify-center gap-1">
                                  {isExpanded ? <>Ver menos <ChevronUp size={12} /></> : <>+{hiddenCount} más <ChevronDown size={12} /></>}
                                </button>
                              )}
                            </div>
                          );
                        })()}
                      </SortableContext>
                      {stageItems.length === 0 && (
                        <div className="flex items-center justify-center h-16 border-2 border-dashed border-[#e5e7eb] rounded-lg text-[10px] text-[#9ca3af]">
                          Arrastra aquí
                        </div>
                      )}
                    </HubDroppableColumn>
                  </div>
                );
              })}
            </div>
            <DragOverlay>
              {hubActiveCard && (
                <div className="bg-white rounded-lg border-2 border-[#00a8a8] p-2 shadow-xl w-[160px] rotate-2">
                  <h4 className="text-xs font-semibold text-[#1c2c4a] truncate">{hubActiveCard.empresa}</h4>
                  <div className="text-[10px] text-[#6b7280] mt-0.5">{hubActiveCard.ciudad?.split(',')[0]}</div>
                </div>
              )}
            </DragOverlay>
          </DndContext>

          {/* Empty state */}
          {memberProspectos.length === 0 && (
            <div className="bg-white rounded-xl border border-[#e5e7eb] p-8 text-center">
              <Target size={32} className="text-[#d1d5db] mx-auto mb-2" />
              <p className="text-sm text-[#6b7280]">Este ejecutivo aún no tiene prospectos asignados.</p>
            </div>
          )}
        </div>

        {/* RECHAZADAS MODAL */}
        {showRechazadasModal && memberRechazados.length > 0 && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowRechazadasModal(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-[#e5e7eb]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F59E0B]/10 flex items-center justify-center">
                    <AlertCircle size={20} className="text-[#F59E0B]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[#1c2c4a]">Oportunidades Rechazadas</h2>
                    <p className="text-xs text-[#6b7280]">{memberRechazados.filter(p => p.fechaSeguimiento).length}/{memberRechazados.length} con seguimiento</p>
                  </div>
                </div>
                <button onClick={() => setShowRechazadasModal(false)} className="p-2 hover:bg-[#f3f4f6] rounded-lg transition-colors">
                  <X size={20} className="text-[#6b7280]" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto max-h-[calc(80vh-80px)]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {memberRechazados.map(p => {
                    const cat = classifyRechazo(p.motivoRechazo);
                    const seg = { fechaSeguimiento: p.fechaSeguimiento, accion: p.followUpAction, recoveryStatus: p.recoveryStatus, fechaVencimientoContrato: p.fechaVencimientoContrato };
                    const urgency = getSeguimientoUrgency(seg);
                    return (
                      <div key={p.id}
                        className="rounded-xl p-3 cursor-pointer hover:shadow-lg transition-all border"
                        style={{ backgroundColor: cat?.bgColor || '#f3f4f6', borderColor: `${cat?.color}30` || '#e5e7eb', borderLeft: `4px solid ${cat?.color || '#6b7280'}` }}
                        onClick={() => { setShowRechazadasModal(false); setSelectedProspecto(p); }}>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h4 className="text-sm font-semibold text-[#1c2c4a] truncate flex-1">{p.empresa}</h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ backgroundColor: `${cat?.color}18`, color: cat?.color }}>{cat?.label}</span>
                        </div>
                        <div className="text-xs text-[#6b7280] mb-2">{p.motivoRechazo || 'Sin motivo'}</div>
                        <div className="flex items-center justify-between">
                          {seg?.fechaSeguimiento ? (
                            <span className="text-[10px] font-semibold px-2 py-1 rounded-full flex items-center gap-1" style={{ backgroundColor: urgency?.bg, color: urgency?.color }}>
                              <Calendar size={10} />
                              {urgency?.overdue ? `Vencido ${urgency.days}d` : urgency?.label}
                            </span>
                          ) : (
                            <span className="text-[10px] text-[#F59E0B] font-medium flex items-center gap-1 opacity-70">
                              <Bell size={10} /> Sin seguimiento
                            </span>
                          )}
                          {cat?.recoverable && <span className="text-[10px] text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded">Recuperable</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VENTAS REALES MODAL */}
        {showVentasRealesModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowVentasRealesModal(false); setVentaRealMonto(''); }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-[#e5e7eb]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#00a8a8]/10 flex items-center justify-center">
                    <DollarSign size={20} className="text-[#00a8a8]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[#1c2c4a]">Registrar Venta Real</h2>
                    <p className="text-xs text-[#6b7280]">{member.name}</p>
                  </div>
                </div>
                <button onClick={() => { setShowVentasRealesModal(false); setVentaRealMonto(''); }} className="p-2 hover:bg-[#f3f4f6] rounded-lg transition-colors">
                  <X size={20} className="text-[#6b7280]" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div className="bg-[#f9fafb] rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-[#6b7280]">Presupuesto mensual</div>
                    <div className="text-lg font-bold text-[#1c2c4a]">${(member.presupuestoMensual / 1000000).toFixed(2)}M</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-[#6b7280]">Venta registrada</div>
                    <div className="text-lg font-bold text-[#00a8a8]">${(member.ventasReales / 1000000).toFixed(2)}M</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#6b7280] mb-1">Mes</label>
                    <select value={ventaRealMes} onChange={(e) => setVentaRealMes(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00a8a8]/30 focus:border-[#00a8a8]">
                      {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((m, i) => (
                        <option key={i} value={i + 1}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#6b7280] mb-1">Año</label>
                    <select value={ventaRealAño} onChange={(e) => setVentaRealAño(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00a8a8]/30 focus:border-[#00a8a8]">
                      {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6b7280] mb-1">
                    Venta Real {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][ventaRealMes - 1]} {ventaRealAño} (MXN)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]">$</span>
                    <input type="number" value={ventaRealMonto} onChange={(e) => setVentaRealMonto(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-7 pr-3 py-3 border border-[#e5e7eb] rounded-lg text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-[#00a8a8]/30 focus:border-[#00a8a8]" />
                  </div>
                  <p className="text-[10px] text-[#9ca3af] mt-1">El porcentaje de cumplimiento se recalculará automáticamente</p>
                </div>
              </div>
              <div className="p-4 border-t border-[#e5e7eb] flex gap-3">
                <button onClick={() => { setShowVentasRealesModal(false); setVentaRealMonto(''); }}
                  className="flex-1 px-4 py-2.5 bg-[#f3f4f6] hover:bg-[#e5e7eb] text-[#1c2c4a] rounded-lg text-sm font-medium transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    if (!ventaRealMonto) return;
                    try {
                      await apiRequest('POST', '/api/comercial/ventas-reales', {
                        userId: member.dbUserId, mes: ventaRealMes, año: ventaRealAño, monto: Number(ventaRealMonto)
                      });
                      const editKey = `${member.id}-${ventaRealMes}-${ventaRealAño}`;
                      setVentasRealesEditadas((prev: any) => ({ ...prev, [editKey]: Number(ventaRealMonto) }));
                      await queryClient.invalidateQueries({ queryKey: ['/api/comercial/ventas-reales'] });
                      await queryClient.invalidateQueries({ queryKey: ['/api/comercial/team'] });
                      setShowVentasRealesModal(false);
                      setVentaRealMonto('');
                      toast({ title: `Venta real guardada: $${Number(ventaRealMonto).toLocaleString()}` });
                    } catch (err) {
                      toast({ title: 'Error al guardar venta real', variant: 'destructive' });
                    }
                  }}
                  disabled={!ventaRealMonto}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    ventaRealMonto ? 'bg-[#00a8a8] hover:bg-[#008080] text-white' : 'bg-[#e5e7eb] text-[#9ca3af] cursor-not-allowed'
                  }`}>
                  <Save size={16} /> Guardar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stage Gate Modal */}
        {showStageGateModal && pendingMove && (
          <StageGateModal
            pendingMove={pendingMove}
            isHub
            onForce={() => {
              updateProspectMutation.mutate({ id: pendingMove.prospecto.id, stage: pendingMove.toStage });
              setShowStageGateModal(false);
              setPendingMove(null);
            }}
            onCancel={() => { setShowStageGateModal(false); setPendingMove(null); }}
          />
        )}

        {/* Prospect Drawer */}
        {selectedProspecto && (
          <ProspectoDrawer prospecto={selectedProspecto} onClose={() => setSelectedProspecto(null)} />
        )}

      </div>
    </div>
  );
}
