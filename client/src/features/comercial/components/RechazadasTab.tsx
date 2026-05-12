import type { KanbanProspecto, SeguimientoData } from "@shared/types/comercial";
import { AlertCircle, Calendar, CheckCircle } from "lucide-react";
import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useToast } from "@/components/ui/use-toast";
import {
  classifyRechazo,
  getRecoveryState,
  getSeguimientoUrgency,
  RECHAZO_CATEGORIES,
} from "@/lib/comercial-constants";
import { fmtM } from "@/lib/utils";
import { useComercialData } from "../hooks/useComercialData";
import { ProspectoDrawer } from "./ProspectoDrawer";

interface Props {
  onSelectProspecto?: (p: KanbanProspecto) => void;
}

export function RechazadasTab({ onSelectProspecto }: Props) {
  const { kanbanProspectos, updateProspectMutation } = useComercialData();
  const { toast } = useToast();
  // Store id only so the drawer always renders against live data after mutations.
  const [selectedProspectoId, setSelectedProspectoId] = useState<number | null>(null);
  const selectedProspecto = selectedProspectoId
    ? (kanbanProspectos.find((p) => p.id === selectedProspectoId) ?? null)
    : null;

  const handleSelect = (p: KanbanProspecto) => {
    if (onSelectProspecto) onSelectProspecto(p);
    else setSelectedProspectoId(p.id);
  };

  const guardarSeguimiento = async (prospectoId: number, data: Partial<SeguimientoData>) => {
    const updates: Record<string, string | null> = {};
    if (data.fechaSeguimiento !== undefined) updates.nextFollowUpAt = data.fechaSeguimiento || null;
    if (Object.keys(updates).length > 0) {
      try {
        await updateProspectMutation.mutateAsync({ id: prospectoId, ...updates });
        toast({ title: "Seguimiento guardado" });
      } catch {
        toast({ title: "Error al guardar seguimiento", variant: "destructive" });
      }
    }
  };

  const allRejected = kanbanProspectos.filter((p) => p.status === "cierre_perdido");

  if (allRejected.length === 0) {
    return (
      <div className="mt-4 bg-white rounded-xl border border-[#e5e7eb] p-12 text-center">
        <CheckCircle className="mx-auto text-green-400 mb-3" size={40} />
        <h3 className="text-sm font-semibold text-[#1c2c4a] mb-1">Sin oportunidades rechazadas</h3>
        <p className="text-xs text-[#6b7280]">Todas las oportunidades estan activas en el presupuesto</p>
      </div>
    );
  }

  const totalValue = allRejected.reduce((s, p) => s + (p.propuesta?.ventaTotal || p.facturacionEstimada || 0), 0);

  const byCat: Record<string, KanbanProspecto[]> = { pricing: [], proposal: [], operational: [] };
  allRejected.forEach((p) => {
    const cat = classifyRechazo(p.motivoRechazo, p.motivoRechazoCategory);
    if (byCat[cat.id]) byCat[cat.id].push(p);
  });

  const pieData = Object.entries(byCat)
    .filter(([, items]) => items.length > 0)
    .map(([catId, items]) => ({
      name: RECHAZO_CATEGORIES[catId].label,
      value: items.length,
      color: RECHAZO_CATEGORIES[catId].color,
    }));

  return (
    <div className="mt-4 space-y-4">
      {/* Total Rechazadas card + Pie Chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-[#e5e7eb] p-5">
          <div className="text-[10px] text-[#6b7280] mb-1">Total Rechazadas</div>
          <div className="text-3xl font-bold text-[#1c2c4a]">{allRejected.length}</div>
          <div className="text-xs text-[#6b7280] mt-1">{fmtM(totalValue)} en valor perdido</div>
          <div className="mt-4 flex items-center gap-3">
            {pieData.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-[10px] text-[#6b7280]">
                  {d.name}: <strong className="text-[#1c2c4a]">{d.value}</strong>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#e5e7eb] p-4 flex items-center justify-center">
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb" }}
                  formatter={(value: number, name: string) => [`${value} rechazadas`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-[#9ca3af]">Sin datos</p>
          )}
        </div>
      </div>

      {/* By category */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {Object.entries(byCat).map(([catId, items]) => {
          const cat = RECHAZO_CATEGORIES[catId];
          if (items.length === 0) return null;
          return (
            <div key={catId} className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
              <div
                className="px-4 py-3 border-b border-[#e5e7eb] flex items-center justify-between"
                style={{ backgroundColor: `${cat.color}08` }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="text-xs font-semibold" style={{ color: cat.color }}>
                    {cat.label}
                  </span>
                </div>
                <span className="text-xs font-bold" style={{ color: cat.color }}>
                  {items.length}
                </span>
              </div>
              <div className="divide-y divide-[#f3f4f6]">
                {items.map((p) => {
                  const seg = {
                    fechaSeguimiento: p.fechaSeguimiento,
                    accion: p.followUpAction,
                    recoveryStatus: p.recoveryStatus,
                    fechaVencimientoContrato: p.fechaVencimientoContrato,
                  };
                  const urgency = getSeguimientoUrgency(seg);
                  const recovery = getRecoveryState(seg);
                  return (
                    <div
                      key={p.id}
                      className="px-4 py-2.5 cursor-pointer hover:bg-[#f9fafb] transition-colors"
                      onClick={() => handleSelect(p)}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[11px] font-semibold text-[#1c2c4a] truncate">{p.empresa}</span>
                        <span
                          className="text-[9px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: recovery.bg, color: recovery.color }}
                        >
                          {recovery.label}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#9ca3af] truncate mb-1">{p.motivoRechazo || "Sin motivo"}</div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[#6b7280]">
                          {p.ejecutivo} · {fmtM(p.propuesta?.ventaTotal || p.facturacionEstimada || 0)}
                        </span>
                        {urgency?.overdue && (
                          <span className="text-[9px] font-bold text-red-500">
                            <AlertCircle size={8} className="inline" /> Vencido {urgency.days}d
                          </span>
                        )}
                        {!seg?.fechaSeguimiento && cat.recoverable && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              guardarSeguimiento(p.id, {
                                fechaSeguimiento: new Date(Date.now() + cat.defaultFollowUpDays * 86400000)
                                  .toISOString()
                                  .split("T")[0],
                              });
                            }}
                            className="text-[9px] font-semibold text-[#00a8a8] hover:underline flex items-center gap-0.5"
                          >
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
        <ProspectoDrawer prospecto={selectedProspecto} onClose={() => setSelectedProspectoId(null)} />
      )}
    </div>
  );
}
