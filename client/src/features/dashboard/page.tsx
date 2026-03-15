import { DollarSign, TrendingUp, Target, Users, ClipboardList, FileText, BarChart3 } from 'lucide-react';
import { useLocation } from 'wouter';
import { useComercialData } from '@/features/comercial/hooks/useComercialData';
import {
  KANBAN_STAGES,
  SectionHeader,
  ExecutiveAvatar,
  calcularWeightedPipeline,
  calcularWinRate,
} from '@/lib/comercial-constants';

export default function DashboardPage() {
  const [, navigate] = useLocation();
  const {
    kanbanProspectos,
    salesTeamData,
    currentUserName,
    userGreeting,
    isLoading,
  } = useComercialData();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00a8a8]" />
      </div>
    );
  }

  const leadsActivos = kanbanProspectos.filter(p => !['cierre_perdido', 'cierre_ganado'].includes(p.status));
  const propuestasEnviadas = kanbanProspectos.filter(p => p.status === 'propuesta');
  const ganadas = kanbanProspectos.filter(p => p.status === 'cierre_ganado');
  const rechazadas = kanbanProspectos.filter(p => p.status === 'cierre_perdido');
  const pipelinePonderado = calcularWeightedPipeline(kanbanProspectos);
  const winRate = calcularWinRate(kanbanProspectos);
  const presupuestoTotal = salesTeamData.reduce((s, m) => s + m.presupuestoAnual2026, 0);
  const presupuestoMes = salesTeamData.reduce((s, m) => s + (m.presupuestoMensual || 0), 0);
  const ventasTotal = salesTeamData.reduce((s, m) => s + m.ventasReales, 0);
  const cumplimiento = presupuestoTotal > 0 ? Math.round((ventasTotal / presupuestoTotal) * 100) : 0;

  const stageData = KANBAN_STAGES.map(stage => ({
    ...stage,
    count: kanbanProspectos.filter(p => p.status === stage.id).length,
    valor: kanbanProspectos.filter(p => p.status === stage.id).reduce((s, p) => s + (p.propuesta?.ventaTotal || p.facturacionEstimada || 0), 0),
  }));

  const topDeals = [...kanbanProspectos]
    .filter(p => !['cierre_perdido'].includes(p.status))
    .sort((a, b) => (b.propuesta?.ventaTotal || b.facturacionEstimada || 0) - (a.propuesta?.ventaTotal || a.facturacionEstimada || 0))
    .slice(0, 5);

  return (
    <div className="bg-[#faf7f2] min-h-full">
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

        {/* KPI CARDS — same style as comercial page */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Presupuesto Anual */}
          <div className="rounded-xl border border-[#00a8a8]/10 card-modern p-5" style={{ backgroundColor: 'rgba(0,168,168,0.04)' }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[13px] font-medium text-[#6b7280] mb-1">Presupuesto Anual</div>
                <div className="text-2xl font-bold text-[#1c2c4a]">${(presupuestoTotal / 1000000).toFixed(0)}M</div>
                <div className="text-xs text-[#6b7280] mt-1">
                  Venta real: <span className="font-semibold text-[#00a8a8]">${(ventasTotal / 1000000).toFixed(1)}M</span>
                  <span className={`ml-1.5 font-semibold ${cumplimiento >= 80 ? 'text-[#2E7D32]' : cumplimiento >= 40 ? 'text-[#F57C00]' : 'text-[#ef4444]'}`}>
                    ({cumplimiento}%)
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#00a8a8]/10 flex items-center justify-center">
                <DollarSign className="text-[#00a8a8]" size={20} />
              </div>
            </div>
          </div>
          {/* Card 2: Oportunidades */}
          <div className="bg-white rounded-xl border border-[#e5e7eb] card-modern p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[13px] font-medium text-[#6b7280] mb-1">Oportunidades Activas</div>
                <div className="text-2xl font-bold text-[#1c2c4a]">{leadsActivos.length}</div>
                <div className="text-xs text-[#6b7280] mt-1">{rechazadas.length} rechazadas</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#0D47A1]/10 flex items-center justify-center">
                <Target className="text-[#0D47A1]" size={20} />
              </div>
            </div>
          </div>
          {/* Card 3: Tasa de Cierre */}
          <div className="rounded-xl border border-[#2E7D32]/10 card-modern p-5" style={{ backgroundColor: 'rgba(46,125,50,0.04)' }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[13px] font-medium text-[#6b7280] mb-1">Tasa de Cierre</div>
                <div className="text-2xl font-bold text-[#1c2c4a]">{winRate.toFixed(0)}%</div>
                <div className="text-xs text-[#2E7D32] mt-1">{ganadas.length} ganadas</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#2E7D32]/10 flex items-center justify-center">
                <TrendingUp className="text-[#2E7D32]" size={20} />
              </div>
            </div>
          </div>
          {/* Card 4: Propuestas */}
          <div className="bg-white rounded-xl border border-[#e5e7eb] card-modern p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[13px] font-medium text-[#6b7280] mb-1">Propuestas Pendientes</div>
                <div className="text-2xl font-bold text-[#1c2c4a]">{propuestasEnviadas.length}</div>
                <div className="text-xs text-[#00a8a8] mt-1">${(propuestasEnviadas.reduce((s, p) => s + (p.propuesta?.ventaTotal || 0), 0) / 1000000).toFixed(1)}M</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#F57C00]/10 flex items-center justify-center">
                <FileText className="text-[#F57C00]" size={20} />
              </div>
            </div>
          </div>
        </div>

        {/* EQUIPO */}
        <SectionHeader color="#00a8a8" icon={Users} label="Equipo" linkLabel="Ver Pipeline" onLinkClick={() => navigate('/comercial')} />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {salesTeamData.filter(m => m.codigo !== 'VA').sort((a, b) => b.presupuestoAnual2026 - a.presupuestoAnual2026).map(member => {
            const pct = member.cumplimientoPresupuesto || 0;
            const barColor = pct >= 80 ? '#2E7D32' : pct >= 40 ? '#F57C00' : '#ef4444';
            const memberProspectos = kanbanProspectos.filter(p => p.ejecutivo === member.codigo);
            return (
              <div key={member.codigo} onClick={() => navigate('/comercial')}
                className="bg-white rounded-xl border border-[#e5e7eb] p-4 cursor-pointer hover:shadow-lg hover:border-[#00a8a8]/40 transition-all group relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#00a8a8] to-[#0D47A1] opacity-60 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center gap-3 mb-3">
                  <ExecutiveAvatar codigo={member.codigo} name={member.name} size="md" />
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
              </div>
            );
          })}
        </div>

        {/* Pipeline + Top Deals */}
        <SectionHeader color="#0D47A1" icon={BarChart3} label="Resumen Pipeline" linkLabel="Ver Detalle" onLinkClick={() => navigate('/comercial')} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Pipeline por Stage */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-[#e5e7eb] card-modern p-5">
            <h3 className="text-sm font-semibold text-[#1c2c4a] mb-3">Presupuesto por Etapa</h3>
            <div className="space-y-1.5">
              {stageData.map(stage => {
                const maxCount = Math.max(...stageData.map(s => s.count), 1);
                const pct = (stage.count / maxCount) * 100;
                return (
                  <div key={stage.id} className="flex items-center gap-2">
                    <div className="w-24 text-[11px] font-medium text-[#6b7280] text-right truncate">{stage.label}</div>
                    <div className="flex-1 bg-[#f3f4f6] rounded-full h-5 overflow-hidden">
                      <div className="h-full rounded-full flex items-center justify-end pr-2 transition-all"
                        style={{ width: `${Math.max(pct, 8)}%`, backgroundColor: stage.color }}>
                        <span className="text-[10px] font-bold text-white">{stage.count}</span>
                      </div>
                    </div>
                    <div className="w-14 text-right text-[11px] font-semibold text-[#1c2c4a]">
                      ${(stage.valor / 1000000).toFixed(1)}M
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 pt-2 border-t border-[#e5e7eb] flex items-center justify-between text-[11px] text-[#6b7280]">
              <span>Total: {kanbanProspectos.length} oportunidades</span>
              <span>Ponderado: <span className="font-semibold text-[#00a8a8]">${(pipelinePonderado / 1000000).toFixed(1)}M</span></span>
            </div>
          </div>

          {/* Top Deals */}
          <div className="bg-white rounded-xl border border-[#e5e7eb] card-modern p-5">
            <h3 className="text-sm font-semibold text-[#1c2c4a] mb-3">Top Oportunidades</h3>
            <div className="space-y-2">
              {topDeals.length > 0 ? topDeals.map((deal, idx) => {
                const valor = deal.propuesta?.ventaTotal || deal.facturacionEstimada || 0;
                const stage = KANBAN_STAGES.find(s => s.id === deal.status);
                return (
                  <div key={deal.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-[#f3f4f6] transition-colors">
                    <div className="w-5 h-5 rounded-full bg-[#f3f4f6] flex items-center justify-center text-[10px] font-bold text-[#6b7280]">{idx + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-[#1c2c4a] truncate">{deal.empresa}</div>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${stage?.color}15`, color: stage?.color }}>{stage?.label}</span>
                    </div>
                    <div className="text-xs font-bold text-[#0D47A1]">${(valor / 1000000).toFixed(1)}M</div>
                  </div>
                );
              }) : (
                <div className="text-xs text-[#9ca3af] text-center py-8">Sin oportunidades aún</div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
