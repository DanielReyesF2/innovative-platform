import type { KanbanProspecto, TeamMember } from "@shared/types/comercial";
import { Users } from "lucide-react";
import { ExecutiveAvatar, KPI_METAS } from "@/lib/comercial-constants";

interface ComercialReportsProps {
  kanbanProspectos: KanbanProspecto[];
  salesTeamData: TeamMember[];
}

export function ComercialReports({ kanbanProspectos, salesTeamData }: ComercialReportsProps) {
  // Per-executive KPIs (6 KPIs mensuales)
  const ejecutivosKPIs = salesTeamData
    .filter((m) => m.codigo !== "VA" && m.presupuestoAnual2026 > 0)
    .map((member) => {
      const memberProspectos = kanbanProspectos.filter((p) => p.ejecutivo === member.codigo);
      const memberLeads = memberProspectos.filter((p) => p.status === "contacto_inicial");
      const memberReuniones = memberProspectos.filter((p) => p.status === "presentacion");
      const memberLevantamientos = memberProspectos.filter((p) => p.status === "levantamiento");
      const memberPropuestas = memberProspectos.filter((p) => p.status === "propuesta" || p.status === "negociacion");
      const memberGanados = memberProspectos.filter((p) => p.status === "cierre_ganado");
      const memberRechazados = memberProspectos.filter((p) => p.status === "cierre_perdido");

      return {
        ...member,
        leadsNuevos: memberLeads.length,
        reuniones: memberReuniones.length,
        levantamientos: memberLevantamientos.length,
        propuestas: memberPropuestas.length,
        rechazados: memberRechazados.length,
        ganados: memberGanados.length,
        totalProspectos: memberProspectos.filter((p) => p.status !== "cierre_perdido").length,
      };
    })
    .sort((a, b) => b.presupuestoAnual2026 - a.presupuestoAnual2026);

  return (
    <div className="space-y-5">
      {/* Section 1: KPIs Semanales por Ejecutivo */}
      <div>
        <h3 className="text-xs font-bold text-[#1c2c4a] uppercase tracking-wider mb-3 flex items-center gap-2">
          <Users size={14} className="text-[#0067B0]" /> KPIs Mensuales por Ejecutivo
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {ejecutivosKPIs.map((ej) => {
            const kpis = [
              { label: "Leads Nuevos", value: ej.leadsNuevos, meta: KPI_METAS.leadsNuevos.meta },
              { label: "Reuniones Agendadas", value: ej.reuniones, meta: KPI_METAS.reunionesAgendadas.meta },
              { label: "Levantamientos", value: ej.levantamientos, meta: KPI_METAS.levantamientos.meta },
              { label: "Propuestas Presentadas", value: ej.propuestas, meta: KPI_METAS.propuestasEnviadas.meta },
              {
                label: "Propuestas Rechazadas",
                value: ej.rechazados,
                meta: KPI_METAS.propuestasRechazadas.meta,
                inverted: true,
              },
              { label: "Propuestas Ganadas", value: ej.ganados, meta: KPI_METAS.propuestasGanadas.meta },
            ];

            return (
              <div
                key={ej.codigo}
                className="bg-white rounded-xl border border-[#e5e7eb] p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[#f3f4f6]">
                  <ExecutiveAvatar codigo={ej.codigo} name={ej.name} size="lg" />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#1c2c4a] truncate">
                      {ej.name.split(" ").slice(0, 2).join(" ")}
                    </div>
                    <div className="text-[10px] text-[#6b7280]">{ej.totalProspectos} oportunidades activas</div>
                  </div>
                </div>

                <div className="space-y-3">
                  {kpis.map((kpi: { label: string; value: number; meta: number; inverted?: boolean }) => {
                    const isInverted = kpi.inverted;
                    // For inverted KPIs (rechazadas), 0 is best. For normal KPIs, higher is better
                    const pct = kpi.meta > 0 ? Math.round((kpi.value / kpi.meta) * 100) : kpi.value > 0 ? 100 : 0;
                    const color = isInverted
                      ? kpi.value === 0
                        ? "#2E7D32"
                        : kpi.value <= 1
                          ? "#F57C00"
                          : "#EF4444"
                      : pct >= 80
                        ? "#2E7D32"
                        : pct >= 40
                          ? "#F57C00"
                          : "#EF4444";
                    return (
                      <div key={kpi.label}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] text-[#6b7280]">{kpi.label}</span>
                          <span className="text-sm font-bold" style={{ color }}>
                            {kpi.value}
                            {kpi.meta > 0 && (
                              <span className="text-[10px] font-normal text-[#9ca3af]">/{kpi.meta} mes</span>
                            )}
                          </span>
                        </div>
                        <div className="h-2 bg-[#f3f4f6] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
