import { DollarSign, TrendingUp } from 'lucide-react';
import { useLocation } from 'wouter';
import { useComercialData } from '@/features/comercial/hooks/useComercialData';
import {
  KANBAN_STAGES,
  SectionHeader,
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
  const ventasTotal = salesTeamData.reduce((s, m) => s + m.ventasReales, 0);

  const stageData = KANBAN_STAGES.map(stage => ({
    ...stage,
    count: kanbanProspectos.filter(p => p.status === stage.id).length,
    valor: kanbanProspectos.filter(p => p.status === stage.id).reduce((s, p) => s + (p.propuesta?.ventaTotal || p.facturacionEstimada || 0), 0),
  }));

  const topDeals = [...kanbanProspectos]
    .filter(p => !['cierre_perdido'].includes(p.status))
    .sort((a, b) => (b.propuesta?.ventaTotal || b.facturacionEstimada || 0) - (a.propuesta?.ventaTotal || a.facturacionEstimada || 0))
    .slice(0, 3);

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

        {/* MEGA-KPI: Presupuesto Anual */}
        <div className="bg-gradient-to-br from-[#1c2c4a] to-[#0D47A1] rounded-xl p-5 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-white/70">Presupuesto Anual</span>
            <DollarSign size={18} className="text-white/40" />
          </div>
          <div className="text-2xl font-bold">${(presupuestoTotal / 1000000).toFixed(0)}M</div>
          <div className="text-xs text-white/60 mt-1">
            Venta real: ${(ventasTotal / 1000000).toFixed(1)}M · {presupuestoTotal > 0 ? Math.round((ventasTotal / presupuestoTotal) * 100) : 0}% cumplimiento
          </div>
        </div>

        {/* SECTION: COMERCIAL */}
        <SectionHeader color="#00a8a8" icon={TrendingUp} label="Comercial" linkLabel="Ver Presupuesto" onLinkClick={() => navigate('/comercial')} />

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-[#e5e7eb] p-4">
            <div className="text-xs text-[#6b7280] mb-1">Oportunidades</div>
            <div className="text-xl font-bold text-[#1c2c4a]">{leadsActivos.length}</div>
            <div className="text-[10px] text-[#6b7280]">{rechazadas.length} rechazadas</div>
          </div>
          <div className="bg-white rounded-xl border border-[#e5e7eb] p-4">
            <div className="text-xs text-[#6b7280] mb-1">Tasa de Cierre</div>
            <div className="text-xl font-bold text-[#1c2c4a]">{winRate.toFixed(0)}%</div>
            <div className="text-[10px] text-[#2E7D32]">{ganadas.length} ganadas</div>
          </div>
          <div className="bg-white rounded-xl border border-[#e5e7eb] p-4">
            <div className="text-xs text-[#6b7280] mb-1">Propuestas Pendientes</div>
            <div className="text-xl font-bold text-[#1c2c4a]">{propuestasEnviadas.length}</div>
            <div className="text-[10px] text-[#00a8a8]">
              ${(propuestasEnviadas.reduce((s, p) => s + (p.propuesta?.ventaTotal || 0), 0) / 1000000).toFixed(1)}M
            </div>
          </div>
        </div>

        {/* Pipeline + Top Deals */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
          {/* Pipeline por Stage */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-[#e5e7eb] p-4">
            <h3 className="text-sm font-semibold text-[#1c2c4a] mb-3">Presupuesto por Etapa</h3>
            <div className="space-y-1.5">
              {stageData.map(stage => {
                const maxCount = Math.max(...stageData.map(s => s.count), 1);
                const pct = (stage.count / maxCount) * 100;
                return (
                  <div key={stage.id} className="flex items-center gap-2">
                    <div className="w-20 text-[11px] font-medium text-[#6b7280] text-right truncate">{stage.label}</div>
                    <div className="flex-1 bg-[#f3f4f6] rounded-full h-5 overflow-hidden">
                      <div
                        className="h-full rounded-full flex items-center justify-end pr-2 transition-all"
                        style={{ width: `${Math.max(pct, 8)}%`, backgroundColor: stage.color }}
                      >
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

          {/* Top 3 Deals */}
          <div className="bg-white rounded-xl border border-[#e5e7eb] p-4">
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
