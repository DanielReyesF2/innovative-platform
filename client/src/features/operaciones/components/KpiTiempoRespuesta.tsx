import { ChevronLeft, ChevronRight, Clock, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExecutiveAvatar } from "@/lib/comercial-constants";
import { useKpiTiempoRespuesta } from "../api";

function toMonthString(year: number, month1to12: number): string {
  return `${year}-${String(month1to12).padStart(2, "0")}`;
}

function currentMonthString(): string {
  const now = new Date();
  return toMonthString(now.getUTCFullYear(), now.getUTCMonth() + 1);
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return toMonthString(d.getUTCFullYear(), d.getUTCMonth() + 1);
}

const MONTH_LABELS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `${MONTH_LABELS[m - 1]} ${y}`;
}

function calificacionBadge(calificacion: number | null): { label: string; cls: string } {
  if (calificacion === null) return { label: "—", cls: "bg-gray-100 text-gray-600" };
  if (calificacion === 10) return { label: "10 · Excelente", cls: "bg-[#2E7D32]/10 text-[#2E7D32]" };
  if (calificacion === 8) return { label: "8 · Bien", cls: "bg-[#F57C00]/10 text-[#F57C00]" };
  if (calificacion === 6) return { label: "6 · Regular", cls: "bg-amber-100 text-amber-800" };
  return { label: "0 · Fuera", cls: "bg-[#C62828]/10 text-[#C62828]" };
}

function formatHoras(horas: number | null): string {
  if (horas === null) return "—";
  if (horas < 1) return `${Math.round(horas * 60)} min`;
  if (horas < 48) return `${horas.toFixed(1)} h`;
  return `${(horas / 24).toFixed(1)} días`;
}

export function KpiTiempoRespuesta() {
  const [month, setMonth] = useState<string>(currentMonthString());
  const { data, isLoading } = useKpiTiempoRespuesta(month);

  const isCurrentMonth = month === currentMonthString();

  const sortedRows = useMemo(() => {
    const rows = data?.rows ?? [];
    return [...rows].sort((a, b) => {
      // Sort: highest calificacion first, then most completados
      if ((b.calificacion ?? -1) !== (a.calificacion ?? -1)) {
        return (b.calificacion ?? -1) - (a.calificacion ?? -1);
      }
      return b.completadosEnMes - a.completadosEnMes;
    });
  }, [data]);

  const totalCompletados = sortedRows.reduce((acc, r) => acc + r.completadosEnMes, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-[#0067B0]" />
            Tiempo de Respuesta por Gerente
          </CardTitle>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMonth((m) => shiftMonth(m, -1))}
              className="p-1.5 rounded-md hover:bg-[#f3f4f6] transition-colors"
              aria-label="Mes anterior"
            >
              <ChevronLeft className="h-4 w-4 text-[#1c2c4a]" />
            </button>
            <span className="text-sm font-semibold text-[#1c2c4a] min-w-[140px] text-center">
              {monthLabel(month)}
            </span>
            <button
              onClick={() => setMonth((m) => shiftMonth(m, 1))}
              disabled={isCurrentMonth}
              className="p-1.5 rounded-md hover:bg-[#f3f4f6] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Mes siguiente"
            >
              <ChevronRight className="h-4 w-4 text-[#1c2c4a]" />
            </button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Timer arranca al iniciar visita en sitio y termina al completar el levantamiento. Buckets: &lt;24h=10 · 24-48h=8 · 48-72h=6 · &gt;72h=0.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Cargando...</div>
        ) : sortedRows.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No hay gerentes de operaciones registrados.
          </div>
        ) : totalCompletados === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No hay levantamientos completados en {monthLabel(month)}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">#</th>
                  <th className="py-2 pr-4 font-medium">Gerente</th>
                  <th className="py-2 pr-4 font-medium text-center">Completados</th>
                  <th className="py-2 pr-4 font-medium text-center">Tiempo promedio</th>
                  <th className="py-2 font-medium text-center">Calificación</th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row, idx) => {
                  const badge = calificacionBadge(row.calificacion);
                  const isTop = idx === 0 && row.calificacion === 10;
                  return (
                    <tr key={row.userId} className="border-b last:border-0">
                      <td className="py-3 pr-4 text-muted-foreground">
                        {isTop ? (
                          <Trophy className="h-4 w-4 text-[#F59E0B]" />
                        ) : (
                          <span className="text-xs">{idx + 1}</span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <ExecutiveAvatar codigo={row.codigo || "??"} name={row.userName} size="sm" />
                          <span className="font-medium text-[#1c2c4a]">{row.userName}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-center font-semibold text-[#1c2c4a]">
                        {row.completadosEnMes}
                      </td>
                      <td className="py-3 pr-4 text-center text-[#1c2c4a]">
                        {formatHoras(row.tiempoPromedioHoras)}
                      </td>
                      <td className="py-3 text-center">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="mt-4 text-xs text-muted-foreground">
              Total completados en {monthLabel(month)}: <span className="font-semibold text-[#1c2c4a]">{totalCompletados}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
