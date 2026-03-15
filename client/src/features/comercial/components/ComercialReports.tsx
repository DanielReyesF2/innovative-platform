import { Users, TrendingUp, Target, Clock, Award, FileText, BarChart3 } from 'lucide-react';
import {
  KANBAN_STAGES,
  STAGE_PROBABILITY,
  SERVICIOS_INNOVATIVE,
  SERVICE_COLORS,
  ExecutiveAvatar,
  calcularWinRate,
  calcularPipelineVelocity,
} from '@/lib/comercial-constants';

interface ComercialReportsProps {
  kanbanProspectos: any[];
  salesTeamData: any[];
}

export function ComercialReports({ kanbanProspectos, salesTeamData }: ComercialReportsProps) {
  const activos = kanbanProspectos.filter(p => p.status !== 'cierre_perdido');
  const ganados = kanbanProspectos.filter(p => p.status === 'cierre_ganado');
  const perdidos = kanbanProspectos.filter(p => p.status === 'cierre_perdido');
  const propuestas = kanbanProspectos.filter(p => p.status === 'propuesta' || p.status === 'negociacion');
  const reuniones = kanbanProspectos.filter(p => p.status === 'presentacion');
  const leadsNuevos = kanbanProspectos.filter(p => p.status === 'contacto_inicial');
  const winRate = calcularWinRate(kanbanProspectos);
  const velocity = calcularPipelineVelocity(kanbanProspectos);

  // Per-executive KPIs
  const ejecutivosKPIs = salesTeamData
    .filter(m => m.codigo !== 'VA' && m.presupuestoAnual2026 > 0)
    .map(member => {
      const memberProspectos = kanbanProspectos.filter(p => p.ejecutivo === member.codigo);
      const memberGanados = memberProspectos.filter(p => p.status === 'cierre_ganado');
      const memberPerdidos = memberProspectos.filter(p => p.status === 'cierre_perdido');
      const memberPropuestas = memberProspectos.filter(p => p.status === 'propuesta' || p.status === 'negociacion');
      const memberLeads = memberProspectos.filter(p => p.status === 'contacto_inicial');
      const cierreReal = memberGanados.reduce((s, p) => s + (p.propuesta?.ventaTotal || p.facturacionEstimada || 0), 0);
      const totalDecided = memberGanados.length + memberPerdidos.length;
      const memberWinRate = totalDecided > 0 ? Math.round((memberGanados.length / totalDecided) * 100) : 0;
      const pctCumpl = member.presupuestoMensual > 0 ? Math.round((cierreReal / member.presupuestoMensual) * 100) : 0;

      return {
        ...member,
        leads: memberLeads.length,
        propuestas: memberPropuestas.length,
        ganados: memberGanados.length,
        cierreReal,
        pctCumpl,
        winRate: memberWinRate,
        totalProspectos: memberProspectos.filter(p => p.status !== 'cierre_perdido').length,
      };
    })
    .sort((a, b) => b.presupuestoAnual2026 - a.presupuestoAnual2026);

  // Pipeline by stage
  const byStage = KANBAN_STAGES.map(stage => ({
    ...stage,
    count: kanbanProspectos.filter(p => p.status === stage.id).length,
    value: kanbanProspectos.filter(p => p.status === stage.id).reduce((s, p) => s + (p.propuesta?.ventaTotal || p.facturacionEstimada || 0), 0),
  }));

  // By service
  const serviceMap: Record<string, number> = {};
  activos.forEach(p => {
    (p.servicios || []).forEach((svc: string) => {
      serviceMap[svc] = (serviceMap[svc] || 0) + 1;
    });
  });
  const byService = Object.entries(serviceMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const totalGanadoValor = ganados.reduce((s, p) => s + (p.propuesta?.ventaTotal || p.facturacionEstimada || 0), 0);

  return (
    <div className="space-y-5">
      {/* Section 1: Scorecard del Equipo */}
      <div>
        <h3 className="text-xs font-bold text-[#1c2c4a] uppercase tracking-wider mb-3 flex items-center gap-2">
          <Target size={14} className="text-[#00a8a8]" /> Scorecard del Equipo
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <ScoreCard label="Leads Nuevos" value={leadsNuevos.length} sub="en pipeline" icon={Users} color="#6b7280" />
          <ScoreCard label="Reuniones" value={reuniones.length} sub="agendadas" icon={Clock} color="#0D47A1" />
          <ScoreCard label="Propuestas" value={propuestas.length} sub="enviadas/negociación" icon={FileText} color="#00a8a8" />
          <ScoreCard label="Cuentas Ganadas" value={ganados.length} sub={`$${(totalGanadoValor / 1000000).toFixed(1)}M`} icon={Award} color="#2E7D32" />
          <ScoreCard label="Win Rate" value={`${winRate.toFixed(0)}%`} sub={`${ganados.length}W / ${perdidos.length}L`} icon={TrendingUp} color="#7C3AED" />
          <ScoreCard label="Velocidad" value={`$${(velocity / 1000).toFixed(0)}K`} sub="pipeline/día" icon={BarChart3} color="#F57C00" />
        </div>
      </div>

      {/* Section 2: Cumplimiento por Ejecutivo */}
      <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#e5e7eb] flex items-center gap-2">
          <Users size={14} className="text-[#00a8a8]" />
          <h4 className="text-xs font-bold text-[#1c2c4a] uppercase tracking-wider">Cumplimiento por Ejecutivo</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e5e7eb] bg-[#f9fafb]">
                <th className="text-left py-2.5 px-3 text-[10px] font-semibold text-[#6b7280] uppercase">Ejecutivo</th>
                <th className="text-right py-2.5 px-3 text-[10px] font-semibold text-[#6b7280] uppercase">Presupuesto</th>
                <th className="text-right py-2.5 px-3 text-[10px] font-semibold text-[#6b7280] uppercase">Cierre Real</th>
                <th className="text-center py-2.5 px-3 text-[10px] font-semibold text-[#6b7280] uppercase w-32">% Cumpl.</th>
                <th className="text-center py-2.5 px-3 text-[10px] font-semibold text-[#6b7280] uppercase">Leads</th>
                <th className="text-center py-2.5 px-3 text-[10px] font-semibold text-[#6b7280] uppercase">Propuestas</th>
                <th className="text-center py-2.5 px-3 text-[10px] font-semibold text-[#6b7280] uppercase">Ganados</th>
                <th className="text-center py-2.5 px-3 text-[10px] font-semibold text-[#6b7280] uppercase">Win Rate</th>
              </tr>
            </thead>
            <tbody>
              {ejecutivosKPIs.map(ej => {
                const barColor = ej.pctCumpl >= 80 ? '#2E7D32' : ej.pctCumpl >= 40 ? '#F57C00' : '#EF4444';
                return (
                  <tr key={ej.codigo} className="border-b border-[#f3f4f6] hover:bg-[#f9fafb] transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <ExecutiveAvatar codigo={ej.codigo} name={ej.name} size="sm" />
                        <span className="text-sm font-medium text-[#1c2c4a]">{ej.name.split(' ').slice(0, 2).join(' ')}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right text-sm text-[#6b7280]">${(ej.presupuestoMensual / 1000000).toFixed(1)}M</td>
                    <td className="py-2.5 px-3 text-right text-sm font-semibold text-[#00a8a8]">${(ej.cierreReal / 1000000).toFixed(1)}M</td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-[#f3f4f6] rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(ej.pctCumpl, 100)}%`, backgroundColor: barColor }} />
                        </div>
                        <span className="text-xs font-bold w-10 text-right" style={{ color: barColor }}>{ej.pctCumpl}%</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center text-sm text-[#1c2c4a]">{ej.leads}</td>
                    <td className="py-2.5 px-3 text-center text-sm text-[#1c2c4a]">{ej.propuestas}</td>
                    <td className="py-2.5 px-3 text-center text-sm font-semibold text-[#2E7D32]">{ej.ganados}</td>
                    <td className="py-2.5 px-3 text-center text-sm text-[#7C3AED] font-medium">{ej.winRate}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 3: Distribución de Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* By Stage */}
        <div className="bg-white rounded-xl border border-[#e5e7eb] p-4">
          <h4 className="text-xs font-bold text-[#1c2c4a] uppercase tracking-wider mb-3 flex items-center gap-2">
            <BarChart3 size={14} className="text-[#0D47A1]" /> Por Etapa
          </h4>
          <div className="space-y-2.5">
            {byStage.map(stage => {
              const maxCount = Math.max(...byStage.map(s => s.count), 1);
              return (
                <div key={stage.id} className="flex items-center gap-3">
                  <span className="text-[11px] text-[#6b7280] w-28 truncate">{stage.label}</span>
                  <div className="flex-1 h-5 bg-[#f3f4f6] rounded-full overflow-hidden relative">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${(stage.count / maxCount) * 100}%`, backgroundColor: stage.color }}
                    />
                    {stage.count > 0 && (
                      <span className="absolute inset-y-0 flex items-center text-[10px] font-bold px-2" style={{ color: stage.count / maxCount > 0.3 ? '#fff' : stage.color }}>
                        {stage.count}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-[#6b7280] w-16 text-right">${(stage.value / 1000000).toFixed(1)}M</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* By Service */}
        <div className="bg-white rounded-xl border border-[#e5e7eb] p-4">
          <h4 className="text-xs font-bold text-[#1c2c4a] uppercase tracking-wider mb-3 flex items-center gap-2">
            <Target size={14} className="text-[#F57C00]" /> Por Servicio
          </h4>
          {byService.length === 0 ? (
            <p className="text-xs text-[#9ca3af] text-center py-6">Sin servicios asignados aún</p>
          ) : (
            <div className="space-y-2.5">
              {byService.map(([svcId, count]) => {
                const svc = SERVICIOS_INNOVATIVE.find(s => s.id === svcId);
                const colors = SERVICE_COLORS[svcId];
                const maxCount = Math.max(...byService.map(([, c]) => c), 1);
                return (
                  <div key={svcId} className="flex items-center gap-3">
                    <span className="text-[11px] text-[#6b7280] w-28 truncate">{svc?.nombre || svcId}</span>
                    <div className="flex-1 h-5 bg-[#f3f4f6] rounded-full overflow-hidden relative">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${(count / maxCount) * 100}%`, backgroundColor: colors?.border || '#00a8a8' }}
                      />
                      {count > 0 && (
                        <span className="absolute inset-y-0 flex items-center text-[10px] font-bold px-2" style={{ color: count / maxCount > 0.3 ? '#fff' : (colors?.border || '#00a8a8') }}>
                          {count}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ScoreCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub: string; icon: any; color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-[#e5e7eb] p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-medium text-[#6b7280] uppercase">{label}</span>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
          <Icon size={14} style={{ color }} />
        </div>
      </div>
      <div className="text-xl font-bold text-[#1c2c4a]">{value}</div>
      <div className="text-[10px] text-[#9ca3af] mt-0.5">{sub}</div>
    </div>
  );
}
