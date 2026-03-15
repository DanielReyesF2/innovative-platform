import { useState } from 'react';
import { RotateCcw, CheckCircle, AlertCircle, Calendar } from 'lucide-react';
import {
  RECOVERY_STATES,
  RECHAZO_CATEGORIES,
  getRecoveryState,
  getSeguimientoUrgency,
  classifyRechazo,
} from '@/lib/comercial-constants';
import { useComercialData } from '../hooks/useComercialData';
import { ProspectoDrawer } from './ProspectoDrawer';

interface Props {
  onSelectProspecto?: (p: any) => void;
}

export function RechazadasTab({ onSelectProspecto }: Props) {
  const { kanbanProspectos, updateProspectMutation } = useComercialData();
  const [selectedProspecto, setSelectedProspecto] = useState<any>(null);

  const handleSelect = (p: any) => {
    if (onSelectProspecto) onSelectProspecto(p);
    else setSelectedProspecto(p);
  };

  const guardarSeguimiento = (prospectoId: number, data: any) => {
    const updates: any = {};
    if (data.fechaSeguimiento !== undefined) updates.nextFollowUpAt = data.fechaSeguimiento || null;
    if (Object.keys(updates).length > 0) {
      updateProspectMutation.mutate({ id: prospectoId, ...updates });
    }
  };

  const allRejected = kanbanProspectos.filter(p => p.status === 'cierre_perdido');

  if (allRejected.length === 0) {
    return (
      <div className="mt-4 bg-white rounded-xl border border-[#e5e7eb] p-12 text-center">
        <CheckCircle className="mx-auto text-green-400 mb-3" size={40} />
        <h3 className="text-sm font-semibold text-[#1c2c4a] mb-1">Sin oportunidades rechazadas</h3>
        <p className="text-xs text-[#6b7280]">Todas las oportunidades estan activas en el presupuesto</p>
      </div>
    );
  }

  const byRecovery: Record<string, any[]> = { sin_seguimiento: [], en_seguimiento: [], re_contactada: [] };
  allRejected.forEach(p => {
    const seg = { fechaSeguimiento: p.fechaSeguimiento, accion: p.followUpAction, recoveryStatus: p.recoveryStatus, fechaVencimientoContrato: p.fechaVencimientoContrato };
    const state = getRecoveryState(seg);
    if (byRecovery[state.id]) byRecovery[state.id].push(p);
  });

  const overdue = allRejected.filter(p => getSeguimientoUrgency({ fechaSeguimiento: p.fechaSeguimiento, accion: p.followUpAction, recoveryStatus: p.recoveryStatus, fechaVencimientoContrato: p.fechaVencimientoContrato })?.overdue);
  const recoverable = allRejected.filter(p => classifyRechazo(p.motivoRechazo)?.recoverable);
  const totalValue = allRejected.reduce((s, p) => s + (p.propuesta?.ventaTotal || p.facturacionEstimada || 0), 0);

  const byCat: Record<string, any[]> = { pricing: [], proposal: [], operational: [] };
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

      {/* By category */}
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
                  const seg = { fechaSeguimiento: p.fechaSeguimiento, accion: p.followUpAction, recoveryStatus: p.recoveryStatus, fechaVencimientoContrato: p.fechaVencimientoContrato };
                  const urgency = getSeguimientoUrgency(seg);
                  const recovery = getRecoveryState(seg);
                  return (
                    <div key={p.id} className="px-4 py-2.5 cursor-pointer hover:bg-[#f9fafb] transition-colors"
                      onClick={() => handleSelect(p)}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[11px] font-semibold text-[#1c2c4a] truncate">{p.empresa}</span>
                        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: recovery.bg, color: recovery.color }}>{recovery.label}</span>
                      </div>
                      <div className="text-[10px] text-[#9ca3af] truncate mb-1">{p.motivoRechazo || 'Sin motivo'}</div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[#6b7280]">{p.ejecutivo} · ${((p.propuesta?.ventaTotal || p.facturacionEstimada || 0) / 1000000).toFixed(1)}M</span>
                        {urgency?.overdue && <span className="text-[9px] font-bold text-red-500"><AlertCircle size={8} className="inline" /> Vencido {urgency.days}d</span>}
                        {!seg?.fechaSeguimiento && cat.recoverable && (
                          <button onClick={(e) => {
                            e.stopPropagation();
                            guardarSeguimiento(p.id, { fechaSeguimiento: new Date(Date.now() + cat.defaultFollowUpDays * 86400000).toISOString().split('T')[0] });
                          }} className="text-[9px] font-semibold text-[#00a8a8] hover:underline flex items-center gap-0.5">
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

      {/* Prospect drawer (internal fallback) */}
      {selectedProspecto && !onSelectProspecto && (
        <ProspectoDrawer prospecto={selectedProspecto} onClose={() => setSelectedProspecto(null)} />
      )}
    </div>
  );
}
