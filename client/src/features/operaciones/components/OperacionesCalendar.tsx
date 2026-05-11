import { useState } from "react";
import {
  ChevronLeft, ChevronRight, CalendarDays, MapPin, Clock,
} from "lucide-react";

interface CalendarSurvey {
  id: number;
  clientName: string;
  status: string;
  scheduledDate: string | null;
  address?: string;
  assignedOperationsId?: number | null;
}

interface Props {
  surveys: CalendarSurvey[];
  opsTeam: { id: number; name: string; codigo: string | null }[];
  onSurveyClick?: (surveyId: number) => void;
}

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const DAY_HEADERS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  pendiente_operaciones: { bg: "bg-amber-50", text: "text-amber-800", dot: "#F59E0B" },
  agendado:              { bg: "bg-blue-50", text: "text-blue-800", dot: "#3B82F6" },
  en_sitio:              { bg: "bg-orange-50", text: "text-orange-800", dot: "#F97316" },
  completado:            { bg: "bg-green-50", text: "text-green-800", dot: "#22C55E" },
  rechazado:             { bg: "bg-red-50", text: "text-red-800", dot: "#EF4444" },
  cancelado:             { bg: "bg-gray-50", text: "text-gray-500", dot: "#9CA3AF" },
};

const STATUS_LABELS: Record<string, string> = {
  pendiente_operaciones: "Pendiente",
  agendado: "Agendado",
  en_sitio: "En Sitio",
  completado: "Completado",
  rechazado: "Rechazado",
  cancelado: "Cancelado",
};

function getCalendarDays(year: number, month: number): { date: Date; isCurrentMonth: boolean }[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const startDate = new Date(firstDay);
  const dayOfWeek = startDate.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  startDate.setDate(startDate.getDate() + diff);

  const days: { date: Date; isCurrentMonth: boolean }[] = [];
  const current = new Date(startDate);

  while (days.length < 42) {
    days.push({
      date: new Date(current),
      isCurrentMonth: current.getMonth() === month,
    });
    current.setDate(current.getDate() + 1);
    if (current > lastDay && current.getDay() === 1 && days.length >= 28) break;
  }

  return days;
}

export function OperacionesCalendar({ surveys, opsTeam, onSurveyClick }: Props) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const calendarDays = getCalendarDays(viewYear, viewMonth);
  const todayStr = now.toISOString().split("T")[0];

  // Index surveys by scheduledDate
  const surveysByDate = new Map<string, CalendarSurvey[]>();
  surveys.forEach((s) => {
    if (!s.scheduledDate) return;
    const dateKey = s.scheduledDate.split("T")[0];
    const list = surveysByDate.get(dateKey) || [];
    list.push(s);
    surveysByDate.set(dateKey, list);
  });

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  // Counts for legend
  const scheduledCount = surveys.filter((s) => s.status === "agendado").length;
  const inSiteCount = surveys.filter((s) => s.status === "en_sitio").length;
  const completedCount = surveys.filter((s) => s.status === "completado").length;

  return (
    <div className="bg-white rounded-xl border border-[#e5e7eb] p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <CalendarDays className="text-[#00a8a8]" size={20} />
          <h3 className="text-sm font-semibold text-[#1c2c4a]">
            Calendario de Levantamientos
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-1.5 hover:bg-[#f3f4f6] rounded-lg transition-colors">
            <ChevronLeft size={18} className="text-[#6b7280]" />
          </button>
          <span className="text-sm font-semibold text-[#1c2c4a] min-w-[140px] text-center">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>
          <button onClick={nextMonth} className="p-1.5 hover:bg-[#f3f4f6] rounded-lg transition-colors">
            <ChevronRight size={18} className="text-[#6b7280]" />
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-px mb-1">
        {DAY_HEADERS.map((d) => (
          <div key={d} className="text-center text-[10px] font-semibold text-[#6b7280] uppercase py-1.5">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-[#e5e7eb] rounded-lg overflow-hidden">
        {calendarDays.map(({ date, isCurrentMonth }, i) => {
          const dateStr = date.toISOString().split("T")[0];
          const isToday = dateStr === todayStr;
          const items = surveysByDate.get(dateStr) || [];

          return (
            <div
              key={i}
              className={`
                min-h-[80px] p-1.5 bg-white relative transition-all
                ${!isCurrentMonth ? "opacity-30" : ""}
                ${isToday ? "ring-2 ring-inset ring-[#00a8a8]" : ""}
              `}
            >
              <div className={`text-xs font-medium ${isToday ? "text-[#00a8a8] font-bold" : "text-[#6b7280]"}`}>
                {date.getDate()}
              </div>

              {isCurrentMonth && items.length > 0 && (
                <div className="mt-0.5 space-y-0.5">
                  {items.slice(0, 3).map((s) => {
                    const colors = STATUS_COLORS[s.status] || STATUS_COLORS.agendado;
                    const operator = s.assignedOperationsId
                      ? opsTeam.find((m) => m.id === s.assignedOperationsId)
                      : null;

                    return (
                      <div
                        key={s.id}
                        onClick={() => onSurveyClick?.(s.id)}
                        className={`${colors.bg} ${colors.text} text-[8px] font-medium rounded px-1 py-0.5 truncate cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-0.5`}
                        title={`${s.clientName} — ${STATUS_LABELS[s.status] || s.status}${operator ? ` · ${operator.name}` : ""}`}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: colors.dot }}
                        />
                        {s.clientName.length > 14 ? s.clientName.substring(0, 14) + "…" : s.clientName}
                      </div>
                    );
                  })}
                  {items.length > 3 && (
                    <div className="text-[7px] text-[#0067B0] font-semibold px-1 cursor-pointer hover:underline">
                      +{items.length - 3} más
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center gap-4 text-[10px] text-[#6b7280] flex-wrap">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS.agendado.dot }} />
          Agendado ({scheduledCount})
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS.en_sitio.dot }} />
          En Sitio ({inSiteCount})
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS.completado.dot }} />
          Completado ({completedCount})
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS.pendiente_operaciones.dot }} />
          Pendiente
        </span>
        <span className="ml-auto">Click en un levantamiento para ver detalles</span>
      </div>
    </div>
  );
}
