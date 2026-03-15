import { Users, TrendingUp, Target, Clock, Award, FileText, BarChart3 } from 'lucide-react';
import {
  KANBAN_STAGES,
  STAGE_PROBABILITY,
  KPI_METAS,
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

  // Per-executive KPIs (3 KPIs: Leads Nuevos, Reuniones, Levantamientos)
  const ejecutivosKPIs = salesTeamData
    .filter(m => m.codigo !== 'VA' && m.presupuestoAnual2026 > 0)
    .map(member => {
      const memberProspectos = kanbanProspectos.filter(p => p.ejecutivo === member.codigo);
      const memberLeads = memberProspectos.filter(p => p.status === 'contacto_inicial');
      const memberReuniones = memberProspectos.filter(p => p.status === 'presentacion');
      const memberLevantamientos = memberProspectos.filter(p => p.status === 'levantamiento');
      const memberPropuestas = memberProspectos.filter(p => p.status === 'propuesta' || p.status === 'negociacion');
      const memberGanados = memberProspectos.filter(p => p.status === 'cierre_ganado');

      return {
        ...member,
        leadsNuevos: memberLeads.length,
        reuniones: memberReuniones.length,
        levantamientos: memberLevantamientos.length,
        propuestas: memberPropuestas.length,
        ganados: memberGanados.length,
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

      {/* Section 2: KPIs Semanales por Ejecutivo */}
      <div>
        <h3 className="text-xs font-bold text-[#1c2c4a] uppercase tracking-wider mb-3 flex items-center gap-2">
          <Users size={14} className="text-[#00a8a8]" /> KPIs Semanales por Ejecutivo
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {ejecutivosKPIs.map(ej => {
            const kpis = [
              { label: 'Leads Nuevos', value: ej.leadsNuevos, meta: KPI_METAS.leadsNuevos.meta, freq: KPI_METAS.leadsNuevos.frecuencia },
              { label: 'Reuniones Agendadas', value: ej.reuniones, meta: KPI_METAS.reunionesAgendadas.meta, freq: KPI_METAS.reunionesAgendadas.frecuencia },
              { label: 'Levantamientos', value: ej.levantamientos, meta: KPI_METAS.levantamientos.meta, freq: KPI_METAS.levantamientos.frecuencia },
            ];

            return (
              <div key={ej.codigo} className="bg-white rounded-xl border border-[#e5e7eb] p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[#f3f4f6]">
                  <ExecutiveAvatar codigo={ej.codigo} name={ej.name} size="lg" />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#1c2c4a] truncate">{ej.name.split(' ').slice(0, 2).join(' ')}</div>
                    <div className="text-[10px] text-[#6b7280]">{ej.totalProspectos} oportunidades activas</div>
                  </div>
                </div>

                <div className="space-y-3">
                  {kpis.map(kpi => {
                    const pct = kpi.meta > 0 ? Math.round((kpi.value / kpi.meta) * 100) : 0;
                    const color = pct >= 80 ? '#2E7D32' : pct >= 40 ? '#F57C00' : '#EF4444';
                    return (
                      <div key={kpi.label}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] text-[#6b7280]">{kpi.label}</span>
                          <span className="text-sm font-bold" style={{ color }}>
                            {kpi.value}<span className="text-[10px] font-normal text-[#9ca3af]">/{kpi.meta} {kpi.freq === 'mensual' ? 'mes' : 'sem'}</span>
                          </span>
                        </div>
                        <div className="h-2 bg-[#f3f4f6] rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Quick stats footer */}
                <div className="mt-3 pt-3 border-t border-[#f3f4f6] flex items-center justify-between text-[10px] text-[#6b7280]">
                  <span>{ej.propuestas} propuestas</span>
                  <span className="font-semibold text-[#2E7D32]">{ej.ganados} ganados</span>
                </div>
              </div>
            );
          })}
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
