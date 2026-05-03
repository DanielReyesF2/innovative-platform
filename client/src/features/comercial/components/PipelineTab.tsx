import { useState } from 'react';
import { Filter, X } from 'lucide-react';
import {
  KANBAN_STAGES,
  SERVICE_COLORS,
  SERVICIOS_INNOVATIVE,
  ExecutiveAvatar,
} from '@/lib/comercial-constants';
import { useComercialData } from '../hooks/useComercialData';
import { ProspectoDrawer } from './ProspectoDrawer';
import type { KanbanProspecto, TeamMember } from '@shared/types/comercial';

interface Props {
  onViewHub: (member: TeamMember) => void;
}

export function PipelineTab({ onViewHub }: Props) {
  const {
    kanbanProspectos,
    salesTeamData,
  } = useComercialData();

  // Filter state
  const [filterServicio, setFilterServicio] = useState('todos');
  const [filterEjecutivo, setFilterEjecutivo] = useState('todos');
  const [filterEtapa, setFilterEtapa] = useState('todos');

  // Prospect drawer — store id only so the drawer always reads live data from
  // kanbanProspectos. Fixes the "hay que salir para avanzar" UX bug where the
  // snapshot kept showing the old stage after advancing.
  const [selectedProspectoId, setSelectedProspectoId] = useState<number | null>(null);
  const selectedProspecto = selectedProspectoId
    ? kanbanProspectos.find((p) => p.id === selectedProspectoId) ?? null
    : null;

  return (
    <>

      {/* Service Summary */}
      <div className="flex items-center justify-end gap-2 flex-wrap">
        {(() => {
          const counts: Record<string, number> = {};
          kanbanProspectos.forEach(p => { const svcId = (p.servicios || [])[0] || 'rme'; counts[svcId] = (counts[svcId] || 0) + 1; });
          return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([svcId, count]) => {
            const svc = SERVICE_COLORS[svcId] || SERVICE_COLORS.rme;
            return (
              <div key={svcId} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                style={{ backgroundColor: svc.bg, color: svc.text, border: `1px solid ${svc.border}30` }}>
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: svc.border }} />
                {svc.label} <span className="font-bold">{count}</span>
              </div>
            );
          });
        })()}
      </div>

      {/* Filter Bar */}
      {(() => {
        const activeFilters = [filterServicio, filterEjecutivo, filterEtapa].filter(f => f !== 'todos').length;
        const totalFiltered = kanbanProspectos
          .filter(p => p.status !== 'cierre_perdido')
          .filter(p => filterServicio === 'todos' || (p.servicios || [])[0] === filterServicio)
          .filter(p => filterEjecutivo === 'todos' || p.ejecutivo === filterEjecutivo)
          .filter(p => filterEtapa === 'todos' || p.status === filterEtapa)
          .length;

        return (
          <div className="flex items-center gap-3 flex-wrap mt-4">
            <div className="flex items-center gap-1.5 text-xs font-medium text-[#6b7280]">
              <Filter size={14} /> Filtros
            </div>
            <select value={filterServicio} onChange={e => setFilterServicio(e.target.value)}
              className="text-xs border border-[#e5e7eb] rounded-lg px-3 py-1.5 bg-white text-[#1c2c4a] focus:outline-none focus:ring-2 focus:ring-[#00a8a8]/30 focus:border-[#00a8a8]">
              <option value="todos">Todos los servicios</option>
              {SERVICIOS_INNOVATIVE.map(s => {
                const count = kanbanProspectos.filter(p => (p.servicios || [])[0] === s.id).length;
                if (count === 0) return null;
                return <option key={s.id} value={s.id}>{s.nombre} ({count})</option>;
              })}
            </select>
            <select value={filterEjecutivo} onChange={e => setFilterEjecutivo(e.target.value)}
              className="text-xs border border-[#e5e7eb] rounded-lg px-3 py-1.5 bg-white text-[#1c2c4a] focus:outline-none focus:ring-2 focus:ring-[#00a8a8]/30 focus:border-[#00a8a8]">
              <option value="todos">Todos los ejecutivos</option>
              {salesTeamData.map(m => {
                const count = kanbanProspectos.filter(p => p.ejecutivo === m.codigo).length;
                if (count === 0) return null;
                return <option key={m.codigo} value={m.codigo}>{m.name.split(' ').slice(0, 2).join(' ')} ({count})</option>;
              })}
            </select>
            <select value={filterEtapa} onChange={e => setFilterEtapa(e.target.value)}
              className="text-xs border border-[#e5e7eb] rounded-lg px-3 py-1.5 bg-white text-[#1c2c4a] focus:outline-none focus:ring-2 focus:ring-[#00a8a8]/30 focus:border-[#00a8a8]">
              <option value="todos">Todas las etapas</option>
              {KANBAN_STAGES.map(s => {
                const count = kanbanProspectos.filter(p => p.status === s.id).length;
                if (count === 0) return null;
                return <option key={s.id} value={s.id}>{s.label} ({count})</option>;
              })}
            </select>
            {activeFilters > 0 && (
              <button onClick={() => { setFilterServicio('todos'); setFilterEjecutivo('todos'); setFilterEtapa('todos'); }}
                className="text-xs text-[#00a8a8] hover:text-[#008080] font-medium flex items-center gap-1">
                <X size={12} /> Limpiar ({activeFilters})
              </button>
            )}
            <span className="text-[11px] text-[#9ca3af] ml-auto">{totalFiltered} prospectos</span>
          </div>
        );
      })()}

      {/* TABLE VIEW */}
      {(() => {
        const filteredProspectos = kanbanProspectos
          .filter(p => p.status !== 'cierre_perdido')
          .filter(p => filterServicio === 'todos' || (p.servicios || [])[0] === filterServicio)
          .filter(p => filterEjecutivo === 'todos' || p.ejecutivo === filterEjecutivo)
          .filter(p => filterEtapa === 'todos' || p.status === filterEtapa)
          .sort((a, b) => {
            const stageOrder: string[] = KANBAN_STAGES.map(s => s.id);
            return stageOrder.indexOf(b.status) - stageOrder.indexOf(a.status);
          });

        return (
          <div className="mt-4 space-y-3">
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
                        <tr key={p.id} className="border-b border-[#e5e7eb] hover:brightness-95 cursor-pointer transition-colors"
                          style={{ backgroundColor: svc.bg }} onClick={() => setSelectedProspectoId(p.id)}>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-0.5 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: svc.border }} />
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-[#1c2c4a] truncate">{p.empresa}</div>
                                {p.planta && <div className="text-[11px] text-[#9ca3af] truncate">{p.planta}</div>}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                              style={{ backgroundColor: `${svc.border}18`, color: svc.text }}>{svc.label}</span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full"
                              style={{ backgroundColor: `${stage?.color}15`, color: stage?.color, border: `1px solid ${stage?.color}30` }}>
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stage?.color }} />
                              {stage?.label || p.status}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <ExecutiveAvatar codigo={p.ejecutivo} name={ejecutivo?.name || p.ejecutivo} size="xs" />
                              <span className="text-xs text-[#6b7280]">{ejecutivo?.name?.split(' ').slice(0, 2).join(' ') || p.ejecutivo}</span>
                            </div>
                          </td>
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

      {selectedProspecto && (
        <ProspectoDrawer prospecto={selectedProspecto} onClose={() => setSelectedProspectoId(null)} />
      )}
    </>
  );
}
