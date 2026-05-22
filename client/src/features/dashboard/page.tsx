import { useMemo } from "react";
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

// ─── Design tokens ───
const C = {
  ink: "#1a1a2e",
  ink2: "#4a4a5a",
  muted: "#8a8a9a",
  border: "#e8e6e1",
  surface: "#ffffff",
  bg: "#f5f3ee",
  accent: "#0067B0",     // Innovative primary blue
  positive: "#1a7a3a",
  warning: "#c47a00",
  negative: "#c43a3a",
} as const;

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

  // ─── Loading ───
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-5 h-5 border-2 border-[#e8e6e1] border-t-[#0067B0] rounded-full animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-sm" style={{ color: C.ink2 }}>No se pudo cargar el dashboard.</p>
        <button
          onClick={() => window.location.reload()}
          className="px-5 py-2 text-xs font-medium text-white rounded-lg transition-all hover:opacity-90"
          style={{ backgroundColor: C.accent }}
        >
          Reintentar
        </button>
      </div>
    );
  }

  // ─── Calculations ───
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

  const pipelineCoverage = presupuestoAnual > 0 ? (pipelinePonderado / presupuestoAnual).toFixed(1) : "0";

  // Stage data
  const stageData = KANBAN_STAGES.map((stage) => {
    const inStage = kanbanProspectos.filter((p) => p.status === stage.id);
    return {
      ...stage,
      count: inStage.length,
      valor: inStage.reduce((s, p) => s + (p.propuesta?.ventaTotal || p.facturacionEstimada || 0), 0),
    };
  });
  const totalPipelineValor = stageData.reduce((s, st) => s + st.valor, 0);

  // Top deals
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

  // Alerts
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
  const alertCount = overdueFollowUps.length + staleProspects.length;

  // Chart data
  const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const chartData = presupuestoEvolution.map((row, i) => ({
    mes: monthNames[i],
    Presupuesto: row.presupuesto,
    Cotización: row.cotizacion,
    "Venta Real": row.real,
  }));

  // Executive summary sentence
  const summaryParts: string[] = [];
  if (cumplimiento > 0) {
    summaryParts.push(
      cumplimiento >= 80
        ? `Vas al ${cumplimiento}% del presupuesto anual — buen ritmo`
        : cumplimiento >= 40
          ? `Llevas ${cumplimiento}% del presupuesto anual`
          : `Atención: solo ${cumplimiento}% del presupuesto anual cubierto`,
    );
  }
  if (Number(pipelineCoverage) > 0) {
    summaryParts.push(`el pipeline cubre ${pipelineCoverage}x`);
  }
  if (alertCount > 0) {
    summaryParts.push(`${alertCount} tema${alertCount > 1 ? "s" : ""} requiere${alertCount === 1 ? "" : "n"} atención`);
  }
  const summaryText = summaryParts.length > 0 ? summaryParts.join(". ") + "." : "";

  // ─── Render ───
  return (
    <div className="min-h-full" style={{ backgroundColor: C.bg }}>
      <div className="max-w-[1360px] mx-auto px-6 py-8 space-y-8">

        {/* ━━━ HEADER ━━━ */}
        <header>
          <div className="flex items-end justify-between mb-1">
            <div>
              <p className="text-[12px] font-medium tracking-widest uppercase" style={{ color: C.muted }}>
                {new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
              <h1 className="text-[26px] font-semibold mt-1 tracking-tight" style={{ color: C.ink }}>
                {userGreeting}, {currentUserName}
              </h1>
            </div>
            <button
              onClick={() => navigate("/comercial")}
              className="text-[12px] font-medium px-4 py-2 rounded-lg transition-all hover:bg-white/60"
              style={{ color: C.accent }}
            >
              Ir a Comercial →
            </button>
          </div>

          {/* Executive summary */}
          {summaryText && (
            <p className="text-[14px] mt-3 leading-relaxed" style={{ color: C.ink2 }}>
              {summaryText}
            </p>
          )}
        </header>

        {/* ━━━ KPI STRIP ━━━ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Presupuesto Anual */}
          <Card>
            <Label>Presupuesto anual</Label>
            <BigNumber>{fmtM(presupuestoAnual, 0)}</BigNumber>
            <div className="mt-4">
              <div className="flex items-center justify-between text-[11px] mb-2">
                <span style={{ color: C.muted }}>Avance</span>
                <span className="font-semibold" style={{ color: statusColor(cumplimiento) }}>{cumplimiento}%</span>
              </div>
              <ProgressBar value={cumplimiento} color={statusColor(cumplimiento)} />
            </div>
            <Divider />
            <Row label="Venta real" value={fmtM(ventaRealAnual, 1)} />
            <Row label="Cotizado" value={fmtM(cotizacionAnual, 1)} />
          </Card>

          {/* Pipeline */}
          <Card>
            <Label>Pipeline ponderado</Label>
            <BigNumber color={C.accent}>{fmtM(pipelinePonderado, 1)}</BigNumber>
            <Divider />
            <Row label="Cobertura vs presupuesto" value={`${pipelineCoverage}x`} bold />
            <Row label="Oportunidades activas" value={String(activos.length)} />
            <Row label="Cotización total" value={fmtM(cotizacionAnual, 1)} />
          </Card>

          {/* Tasa de cierre */}
          <Card>
            <Label>Tasa de cierre</Label>
            <BigNumber color={statusColor(winRate)}>{winRate.toFixed(0)}%</BigNumber>
            <Divider />
            <div className="flex items-center gap-6 mt-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: C.positive }} />
                <span className="text-[12px] font-semibold" style={{ color: C.ink }}>{ganadas.length}</span>
                <span className="text-[11px]" style={{ color: C.muted }}>ganadas</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: C.negative }} />
                <span className="text-[12px] font-semibold" style={{ color: C.ink }}>{perdidas.length}</span>
                <span className="text-[11px]" style={{ color: C.muted }}>perdidas</span>
              </div>
            </div>
          </Card>

          {/* Mes actual — dark card */}
          <div
            className="rounded-2xl p-6 flex flex-col justify-between"
            style={{
              background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
              boxShadow: "0 2px 8px rgba(26,26,46,0.15)",
            }}
          >
            <div>
              <p className="text-[11px] font-medium tracking-widest uppercase text-white/40">
                {monthNames[currentMonthIdx]} {new Date().getFullYear()}
              </p>
              <p className="text-[28px] font-semibold text-white mt-2 tracking-tight leading-none">
                {fmtM(mesBudget, 0)}
              </p>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between text-[11px] mb-2">
                <span className="text-white/40">Avance</span>
                <span className="font-semibold text-white">{mesCumplimiento}%</span>
              </div>
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(mesCumplimiento, 100)}%`,
                    backgroundColor: mesCumplimiento >= 80 ? "#4ade80" : mesCumplimiento >= 50 ? "#fbbf24" : "#f87171",
                  }}
                />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-white/8 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-white/40">Cotizado</span>
                <span className="text-white font-medium">{fmtM(mesCotizacion, 1)}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-white/40">Facturado</span>
                <span className="font-medium" style={{ color: "#4ade80" }}>{fmtM(mesReal, 1)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ━━━ CHART + TOP DEALS ━━━ */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Monthly Chart */}
          <Card className="lg:col-span-3">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[14px] font-semibold" style={{ color: C.ink }}>Evolución mensual</h3>
              <div className="flex items-center gap-5 text-[11px]" style={{ color: C.muted }}>
                <Legend color={C.ink} label="Presupuesto" />
                <Legend color={C.accent} label="Cotización" />
                <Legend color={C.positive} label="Venta Real" />
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} barGap={2} barCategoryGap="20%" margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid stroke={C.border} strokeDasharray="0" vertical={false} />
                <XAxis
                  dataKey="mes"
                  tick={{ fontSize: 11, fill: C.muted }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: C.muted }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => fmtM(v, 0)}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 10,
                    border: `1px solid ${C.border}`,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
                    padding: "10px 14px",
                  }}
                  formatter={(value: number) => [fmtCurrency(value)]}
                  labelStyle={{ fontWeight: 600, color: C.ink, marginBottom: 4 }}
                  cursor={{ fill: "rgba(0,0,0,0.02)" }}
                />
                <Bar dataKey="Presupuesto" fill={C.ink} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Cotización" fill={C.accent} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Venta Real" fill={C.positive} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Top Deals */}
          <Card className="lg:col-span-2">
            <h3 className="text-[14px] font-semibold mb-5" style={{ color: C.ink }}>Top oportunidades</h3>
            <div className="space-y-0.5">
              {topDeals.length > 0 ? (
                topDeals.map((deal, idx) => {
                  const valor = deal.propuesta?.ventaTotal || deal.facturacionEstimada || 0;
                  const stage = KANBAN_STAGES.find((s) => s.id === deal.status);
                  return (
                    <div
                      key={deal.id}
                      className="flex items-center gap-3 py-3 px-3 rounded-xl cursor-pointer transition-all hover:bg-[#f5f3ee]"
                      onClick={() => navigate("/comercial")}
                    >
                      <span
                        className="text-[12px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${C.accent}0c`, color: C.accent }}
                      >
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium truncate" style={{ color: C.ink }}>{deal.empresa}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className="text-[10px] font-medium px-2 py-0.5 rounded-md"
                            style={{ backgroundColor: `${stage?.color}10`, color: stage?.color }}
                          >
                            {stage?.label}
                          </span>
                          {deal.ejecutivo && (
                            <span className="text-[10px]" style={{ color: C.muted }}>{deal.ejecutivo}</span>
                          )}
                        </div>
                      </div>
                      <span className="text-[13px] font-semibold shrink-0" style={{ color: C.ink }}>
                        {fmtM(valor, 1)}
                      </span>
                    </div>
                  );
                })
              ) : (
                <p className="text-[12px] text-center py-10" style={{ color: C.muted }}>Sin oportunidades</p>
              )}
            </div>
          </Card>
        </div>

        {/* ━━━ FUNNEL + TEAM + ALERTS ━━━ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Pipeline Funnel */}
          <Card>
            <h3 className="text-[14px] font-semibold mb-5" style={{ color: C.ink }}>Pipeline por etapa</h3>
            <div className="space-y-4">
              {stageData.map((stage, idx) => {
                const pct = totalPipelineValor > 0 ? (stage.valor / totalPipelineValor) * 100 : 0;
                // Funnel: wider at top, narrower at bottom
                const funnelWidth = 100 - idx * 6;
                return (
                  <div key={stage.id} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-sm shrink-0"
                            style={{ backgroundColor: stage.color }}
                          />
                          <span className="text-[12px] font-medium" style={{ color: C.ink2 }}>{stage.label}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] tabular-nums" style={{ color: C.muted }}>{stage.count}</span>
                          <span className="text-[12px] font-semibold tabular-nums" style={{ color: C.ink }}>
                            {fmtM(stage.valor, 1)}
                          </span>
                        </div>
                      </div>
                      <div className="relative h-2 rounded-full overflow-hidden" style={{ backgroundColor: `${stage.color}0c`, width: `${funnelWidth}%` }}>
                        <div
                          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                          style={{ width: `${Math.max(pct * (100 / funnelWidth) * (totalPipelineValor > 0 ? 1 : 0), 0)}%`, backgroundColor: stage.color }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <Divider />
            <div className="flex items-center justify-between">
              <span className="text-[11px]" style={{ color: C.muted }}>{activos.length} oportunidades</span>
              <span className="text-[12px] font-semibold" style={{ color: C.accent }}>
                {fmtM(pipelinePonderado, 1)} ponderado
              </span>
            </div>
          </Card>

          {/* Team */}
          <Card>
            <h3 className="text-[14px] font-semibold mb-5" style={{ color: C.ink }}>Equipo</h3>
            <div className="space-y-4">
              {teamPerformance.map((m) => {
                const pct = m.cumplimientoPresupuesto;
                return (
                  <div key={m.id} className="flex items-center gap-3">
                    <ExecutiveAvatar codigo={m.codigo} name={m.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[12px] font-medium truncate" style={{ color: C.ink }}>
                          {m.name.split(" ").slice(0, 2).join(" ")}
                        </span>
                        <span className="text-[12px] font-semibold tabular-nums" style={{ color: statusColor(pct) }}>
                          {pct}%
                        </span>
                      </div>
                      <ProgressBar value={pct} color={statusColor(pct)} height={4} />
                      <div className="flex items-center gap-4 mt-1.5 text-[10px]" style={{ color: C.muted }}>
                        <span>{m.activeCount} activas</span>
                        <span>{m.wonCount} cerradas</span>
                        <span className="ml-auto tabular-nums">{fmtM(m.monthlyBudget, 1)}/mes</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {teamPerformance.length === 0 && (
                <p className="text-[12px] text-center py-8" style={{ color: C.muted }}>Sin datos de equipo</p>
              )}
            </div>
          </Card>

          {/* Alerts */}
          <Card>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[14px] font-semibold" style={{ color: C.ink }}>Atención</h3>
              {alertCount > 0 && (
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: C.negative }}
                >
                  {alertCount}
                </span>
              )}
            </div>

            {alertCount === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-[18px] mb-3"
                  style={{ backgroundColor: `${C.positive}10`, color: C.positive }}
                >
                  ✓
                </div>
                <p className="text-[13px] font-medium" style={{ color: C.ink2 }}>Todo al día</p>
                <p className="text-[11px] mt-1" style={{ color: C.muted }}>Sin alertas pendientes</p>
              </div>
            ) : (
              <div className="space-y-5">
                {overdueFollowUps.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: C.negative }} />
                      <span className="text-[11px] font-semibold" style={{ color: C.negative }}>
                        {overdueFollowUps.length} seguimiento{overdueFollowUps.length > 1 ? "s" : ""} vencido{overdueFollowUps.length > 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {overdueFollowUps.slice(0, 4).map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between py-2 px-3 rounded-lg"
                          style={{ backgroundColor: "#fef2f2" }}
                        >
                          <span className="text-[11px] font-medium truncate" style={{ color: C.ink }}>{p.empresa}</span>
                          <span className="text-[10px] shrink-0 ml-3 tabular-nums" style={{ color: C.negative }}>
                            {p.fechaSeguimiento?.split("-").reverse().slice(0, 2).join("/")}
                          </span>
                        </div>
                      ))}
                      {overdueFollowUps.length > 4 && (
                        <p className="text-[10px] pl-3" style={{ color: C.muted }}>+{overdueFollowUps.length - 4} más</p>
                      )}
                    </div>
                  </div>
                )}

                {staleProspects.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: C.warning }} />
                      <span className="text-[11px] font-semibold" style={{ color: C.warning }}>
                        {staleProspects.length} sin actividad (+14 días)
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {staleProspects.slice(0, 4).map((p) => {
                        const days = Math.floor(
                          (now.getTime() - new Date(p.updatedAt!).getTime()) / (1000 * 60 * 60 * 24),
                        );
                        return (
                          <div
                            key={p.id}
                            className="flex items-center justify-between py-2 px-3 rounded-lg"
                            style={{ backgroundColor: "#fffbeb" }}
                          >
                            <span className="text-[11px] font-medium truncate" style={{ color: C.ink }}>{p.empresa}</span>
                            <span className="text-[10px] shrink-0 ml-3 tabular-nums" style={{ color: C.warning }}>{days}d</span>
                          </div>
                        );
                      })}
                      {staleProspects.length > 4 && (
                        <p className="text-[10px] pl-3" style={{ color: C.muted }}>+{staleProspects.length - 4} más</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── Primitives ───

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl p-6 ${className}`}
      style={{
        backgroundColor: C.surface,
        boxShadow: "0 1px 2px rgba(0,0,0,0.03), 0 0 0 1px rgba(0,0,0,0.02)",
      }}
    >
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-medium tracking-widest uppercase" style={{ color: C.muted }}>
      {children}
    </p>
  );
}

function BigNumber({ children, color = C.ink }: { children: React.ReactNode; color?: string }) {
  return (
    <p className="text-[30px] font-semibold mt-2 leading-none tracking-tight" style={{ color }}>
      {children}
    </p>
  );
}

function Divider() {
  return <div className="my-4 h-px" style={{ backgroundColor: C.border }} />;
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-[11px]" style={{ color: C.muted }}>{label}</span>
      <span
        className={`text-[12px] tabular-nums ${bold ? "font-semibold" : "font-medium"}`}
        style={{ color: bold ? C.accent : C.ink }}
      >
        {value}
      </span>
    </div>
  );
}

function ProgressBar({ value, color, height = 5 }: { value: number; color: string; height?: number }) {
  return (
    <div className="rounded-full overflow-hidden" style={{ height, backgroundColor: `${color}12` }}>
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{ width: `${Math.min(value, 100)}%`, backgroundColor: color }}
      />
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function statusColor(v: number): string {
  return v >= 80 ? C.positive : v >= 50 ? C.warning : C.negative;
}
