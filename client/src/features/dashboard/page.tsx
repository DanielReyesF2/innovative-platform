import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useLocation } from "wouter";
import { useComercialData } from "@/features/comercial/hooks/useComercialData";
import {
  calcularWeightedPipeline,
  calcularWinRate,
  ExecutiveAvatar,
  KANBAN_STAGES,
} from "@/lib/comercial-constants";
import { fmtCurrency, fmtM } from "@/lib/utils";

export default function DashboardPage() {
  const [, navigate] = useLocation();
  const {
    kanbanProspectos,
    salesTeamData,
    presupuestoEvolution,
    currentUserName,
    userGreeting,
    isLoading,
    isError,
  } = useComercialData();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00a8a8]" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <h2 className="text-lg font-semibold text-[#1c2c4a]">Error al cargar el dashboard</h2>
        <p className="text-sm text-[#6b7280]">Intenta recargar la página.</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-4 py-2 text-sm font-medium text-white bg-[#00a8a8] rounded-lg hover:bg-[#008f8f]"
        >
          Recargar
        </button>
      </div>
    );
  }

  // ═══════ CALCULATIONS ═══════
  const activos = kanbanProspectos.filter((p) => !["cierre_perdido", "cierre_ganado"].includes(p.status));
  const ganadas = kanbanProspectos.filter((p) => p.status === "cierre_ganado");
  const perdidas = kanbanProspectos.filter((p) => p.status === "cierre_perdido");
  const winRate = calcularWinRate(kanbanProspectos);
  const pipelinePonderado = calcularWeightedPipeline(kanbanProspectos);

  const presupuestoAnual = salesTeamData.reduce((s, m) => s + m.presupuestoAnual2026, 0);
  const ventaRealAnual = presupuestoEvolution.reduce((s, r) => s + (r.real || 0), 0);
  const cotizacionAnual = presupuestoEvolution.reduce((s, r) => s + (r.cotizacion || 0), 0);
  const cumplimiento = presupuestoAnual > 0 ? Math.round((ventaRealAnual / presupuestoAnual) * 100) : 0;

  const currentMonthIdx = new Date().getMonth();
  const mesBudget = presupuestoEvolution[currentMonthIdx]?.presupuesto ?? 0;
  const mesReal = presupuestoEvolution[currentMonthIdx]?.real ?? 0;
  const mesCotizacion = presupuestoEvolution[currentMonthIdx]?.cotizacion ?? 0;
  const mesCumplimiento = mesBudget > 0 ? Math.round((mesReal / mesBudget) * 100) : 0;

  // Stage data for funnel
  const stageData = KANBAN_STAGES.map((stage) => {
    const inStage = kanbanProspectos.filter((p) => p.status === stage.id);
    return {
      ...stage,
      count: inStage.length,
      valor: inStage.reduce((s, p) => s + (p.propuesta?.ventaTotal || p.facturacionEstimada || 0), 0),
    };
  });

  // Top 5 deals
  const topDeals = [...kanbanProspectos]
    .filter((p) => !["cierre_perdido"].includes(p.status))
    .sort(
      (a, b) =>
        (b.propuesta?.ventaTotal || b.facturacionEstimada || 0) -
        (a.propuesta?.ventaTotal || a.facturacionEstimada || 0),
    )
    .slice(0, 5);

  // Team performance
  const currentPeriod = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const teamPerformance = salesTeamData
    .filter((m) => m.presupuestoAnual2026 > 0)
    .map((m) => {
      const budget = m.presupuestosMensuales?.[currentPeriod] || 0;
      const prospectsForMember = kanbanProspectos.filter((p) => p.assignedToId === m.dbUserId);
      const activeCount = prospectsForMember.filter(
        (p) => !["cierre_perdido", "cierre_ganado"].includes(p.status),
      ).length;
      const wonCount = prospectsForMember.filter((p) => p.status === "cierre_ganado").length;
      return { ...m, monthlyBudget: budget, activeCount, wonCount };
    })
    .sort((a, b) => b.cumplimientoPresupuesto - a.cumplimientoPresupuesto);

  // Alerts: overdue follow-ups + stale prospects (no activity in 14+ days)
  const now = new Date();
  const overdueFollowUps = kanbanProspectos.filter((p) => {
    if (["cierre_perdido", "cierre_ganado"].includes(p.status)) return false;
    if (!p.fechaSeguimiento) return false;
    return new Date(p.fechaSeguimiento) < now;
  });
  const staleProspects = activos.filter((p) => {
    if (!p.updatedAt) return false;
    const daysSince = (now.getTime() - new Date(p.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince > 14;
  });

  // Chart data for monthly trend
  const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const chartData = presupuestoEvolution.map((row, i) => ({
    mes: monthNames[i],
    Presupuesto: row.presupuesto,
    Cotización: row.cotizacion,
    "Venta Real": row.real,
  }));

  const pctColor = (v: number) => (v >= 80 ? "#2E7D32" : v >= 50 ? "#F57C00" : "#DC2626");

  // ═══════ RENDER ═══════
  return (
    <div className="min-h-full" style={{ backgroundColor: "#faf7f2" }}>
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* ─── HEADER ─── */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[13px] text-[#9ca3af] font-medium tracking-wide uppercase">
              {new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <h1 className="text-2xl font-bold text-[#1c2c4a] mt-1">
              {userGreeting}, {currentUserName}
            </h1>
          </div>
          <button
            onClick={() => navigate("/comercial")}
            className="text-xs font-medium text-[#00a8a8] hover:text-[#008080] transition-colors"
          >
            Ir a Comercial →
          </button>
        </div>

        {/* ─── KPI CARDS ROW ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Presupuesto Anual */}
          <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <p className="text-[11px] font-medium text-[#9ca3af] uppercase tracking-wider">Presupuesto Anual</p>
            <p className="text-[28px] font-bold text-[#1c2c4a] mt-2 leading-none">{fmtM(presupuestoAnual, 0)}</p>
            <div className="mt-3">
              <div className="flex items-center justify-between text-[11px] mb-1.5">
                <span className="text-[#6b7280]">Cumplimiento</span>
                <span className="font-bold" style={{ color: pctColor(cumplimiento) }}>{cumplimiento}%</span>
              </div>
              <div className="h-1.5 bg-[#f3f4f6] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(cumplimiento, 100)}%`, backgroundColor: pctColor(cumplimiento) }}
                />
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-[#f3f4f6] flex items-center justify-between text-[11px]">
              <span className="text-[#9ca3af]">Venta real</span>
              <span className="font-semibold text-[#1c2c4a]">{fmtM(ventaRealAnual, 1)}</span>
            </div>
          </div>

          {/* Pipeline Activo */}
          <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <p className="text-[11px] font-medium text-[#9ca3af] uppercase tracking-wider">Pipeline Ponderado</p>
            <p className="text-[28px] font-bold text-[#0D47A1] mt-2 leading-none">{fmtM(pipelinePonderado, 1)}</p>
            <div className="mt-3 pt-3 border-t border-[#f3f4f6] space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#9ca3af]">Cotización total</span>
                <span className="font-semibold text-[#1c2c4a]">{fmtM(cotizacionAnual, 1)}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#9ca3af]">Oportunidades</span>
                <span className="font-semibold text-[#1c2c4a]">{activos.length}</span>
              </div>
            </div>
          </div>

          {/* Win Rate */}
          <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <p className="text-[11px] font-medium text-[#9ca3af] uppercase tracking-wider">Tasa de Cierre</p>
            <p className="text-[28px] font-bold mt-2 leading-none" style={{ color: pctColor(winRate) }}>
              {winRate.toFixed(0)}%
            </p>
            <div className="mt-3 pt-3 border-t border-[#f3f4f6] space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32]" />
                  <span className="text-[#9ca3af]">Ganadas</span>
                </div>
                <span className="font-semibold text-[#2E7D32]">{ganadas.length}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]" />
                  <span className="text-[#9ca3af]">Perdidas</span>
                </div>
                <span className="font-semibold text-[#DC2626]">{perdidas.length}</span>
              </div>
            </div>
          </div>

          {/* Mes Actual */}
          <div className="bg-gradient-to-br from-[#1c2c4a] to-[#0D47A1] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] text-white">
            <p className="text-[11px] font-medium text-white/50 uppercase tracking-wider">
              {monthNames[currentMonthIdx]} {new Date().getFullYear()}
            </p>
            <p className="text-[28px] font-bold mt-2 leading-none">{fmtM(mesBudget, 0)}</p>
            <div className="mt-3">
              <div className="flex items-center justify-between text-[11px] mb-1.5">
                <span className="text-white/50">Cumplimiento</span>
                <span className="font-bold text-white">{mesCumplimiento}%</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#00a8a8] transition-all duration-700"
                  style={{ width: `${Math.min(mesCumplimiento, 100)}%` }}
                />
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-white/10 space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-white/40">Cotizado</span>
                <span className="font-semibold">{fmtM(mesCotizacion, 1)}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-white/40">Facturado</span>
                <span className="font-semibold text-[#00a8a8]">{fmtM(mesReal, 1)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── MONTHLY TREND + TOP DEALS ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Monthly Chart */}
          <div className="lg:col-span-3 bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[13px] font-semibold text-[#1c2c4a]">Evolución Mensual</h3>
              <div className="flex items-center gap-4 text-[10px] text-[#9ca3af]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-sm bg-[#1B5E20]" /> Presupuesto
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-sm bg-[#0D47A1]" /> Cotización
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-sm bg-[#00a8a8]" /> Venta Real
                </span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barGap={1} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => fmtM(v, 0)} />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 12, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                  formatter={(value: number) => [fmtM(value, 1)]}
                  labelStyle={{ fontWeight: 600, color: "#1c2c4a" }}
                />
                <Bar dataKey="Presupuesto" fill="#1B5E20" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Cotización" fill="#0D47A1" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Venta Real" fill="#00a8a8" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top 5 Deals */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <h3 className="text-[13px] font-semibold text-[#1c2c4a] mb-4">Top Oportunidades</h3>
            <div className="space-y-1">
              {topDeals.length > 0 ? (
                topDeals.map((deal, idx) => {
                  const valor = deal.propuesta?.ventaTotal || deal.facturacionEstimada || 0;
                  const stage = KANBAN_STAGES.find((s) => s.id === deal.status);
                  return (
                    <div
                      key={deal.id}
                      className="flex items-center gap-3 py-2.5 px-2 rounded-xl hover:bg-[#faf7f2] transition-colors cursor-pointer"
                      onClick={() => navigate("/comercial")}
                    >
                      <span className="text-[11px] font-bold text-[#9ca3af] w-4">{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-[#1c2c4a] truncate">{deal.empresa}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide"
                            style={{ backgroundColor: `${stage?.color}12`, color: stage?.color }}
                          >
                            {stage?.label}
                          </span>
                          {deal.ejecutivo && (
                            <span className="text-[10px] text-[#9ca3af]">{deal.ejecutivo}</span>
                          )}
                        </div>
                      </div>
                      <span className="text-[13px] font-bold text-[#0D47A1]">{fmtM(valor, 1)}</span>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-[#9ca3af] text-center py-8">Sin oportunidades</p>
              )}
            </div>
          </div>
        </div>

        {/* ─── PIPELINE + TEAM + ALERTS ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Pipeline Funnel */}
          <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <h3 className="text-[13px] font-semibold text-[#1c2c4a] mb-4">Pipeline por Etapa</h3>
            <div className="space-y-2">
              {stageData.map((stage) => {
                const maxVal = Math.max(...stageData.map((s) => s.valor), 1);
                const pct = (stage.valor / maxVal) * 100;
                return (
                  <div key={stage.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-medium text-[#6b7280]">{stage.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[#9ca3af]">{stage.count}</span>
                        <span className="text-[11px] font-semibold text-[#1c2c4a]">{fmtM(stage.valor, 1)}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-[#f3f4f6] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(pct, 3)}%`, backgroundColor: stage.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-3 border-t border-[#f3f4f6] flex items-center justify-between text-[11px]">
              <span className="text-[#9ca3af]">{activos.length} oportunidades activas</span>
              <span className="font-bold text-[#00a8a8]">{fmtM(pipelinePonderado, 1)} ponderado</span>
            </div>
          </div>

          {/* Team Performance */}
          <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <h3 className="text-[13px] font-semibold text-[#1c2c4a] mb-4">Equipo</h3>
            <div className="space-y-3">
              {teamPerformance.map((m) => {
                const pct = m.cumplimientoPresupuesto;
                return (
                  <div key={m.id} className="flex items-center gap-3">
                    <ExecutiveAvatar codigo={m.codigo} name={m.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[12px] font-medium text-[#1c2c4a] truncate">
                          {m.name.split(" ").slice(0, 2).join(" ")}
                        </span>
                        <span className="text-[11px] font-bold" style={{ color: pctColor(pct) }}>
                          {pct}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-[#f3f4f6] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: pctColor(pct) }}
                        />
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-[#9ca3af]">
                        <span>{m.activeCount} activas</span>
                        <span>{m.wonCount} ganadas</span>
                        <span className="ml-auto">{fmtM(m.monthlyBudget, 1)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {teamPerformance.length === 0 && (
                <p className="text-xs text-[#9ca3af] text-center py-6">Sin datos de equipo</p>
              )}
            </div>
          </div>

          {/* Alerts */}
          <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <h3 className="text-[13px] font-semibold text-[#1c2c4a] mb-4">Atención</h3>
            {overdueFollowUps.length === 0 && staleProspects.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-2xl mb-2">✓</p>
                <p className="text-[12px] text-[#9ca3af]">Todo al día</p>
              </div>
            ) : (
              <div className="space-y-4">
                {overdueFollowUps.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]" />
                      <span className="text-[11px] font-semibold text-[#DC2626]">
                        {overdueFollowUps.length} seguimiento{overdueFollowUps.length > 1 ? "s" : ""} vencido{overdueFollowUps.length > 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {overdueFollowUps.slice(0, 4).map((p) => (
                        <div key={p.id} className="flex items-center justify-between py-1 px-2 rounded-lg bg-[#FEF2F2]">
                          <span className="text-[11px] font-medium text-[#1c2c4a] truncate">{p.empresa}</span>
                          <span className="text-[10px] text-[#DC2626] shrink-0 ml-2">
                            {p.fechaSeguimiento?.split("-").reverse().slice(0, 2).join("/")}
                          </span>
                        </div>
                      ))}
                      {overdueFollowUps.length > 4 && (
                        <p className="text-[10px] text-[#9ca3af] pl-2">+{overdueFollowUps.length - 4} más</p>
                      )}
                    </div>
                  </div>
                )}

                {staleProspects.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#F57C00]" />
                      <span className="text-[11px] font-semibold text-[#F57C00]">
                        {staleProspects.length} sin actividad (+14 días)
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {staleProspects.slice(0, 4).map((p) => {
                        const days = Math.floor(
                          (now.getTime() - new Date(p.updatedAt!).getTime()) / (1000 * 60 * 60 * 24),
                        );
                        return (
                          <div key={p.id} className="flex items-center justify-between py-1 px-2 rounded-lg bg-[#FFF7ED]">
                            <span className="text-[11px] font-medium text-[#1c2c4a] truncate">{p.empresa}</span>
                            <span className="text-[10px] text-[#F57C00] shrink-0 ml-2">{days}d</span>
                          </div>
                        );
                      })}
                      {staleProspects.length > 4 && (
                        <p className="text-[10px] text-[#9ca3af] pl-2">+{staleProspects.length - 4} más</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
