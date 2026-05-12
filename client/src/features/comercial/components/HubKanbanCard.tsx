import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CampoCompleto, KanbanProspecto } from "@shared/types/comercial";
import { MessageSquare, Paperclip } from "lucide-react";
import {
  calcularCamposCompletos,
  estimarFechaProspecto,
  SERVICE_COLORS,
  urgencyColor,
} from "@/lib/comercial-constants";
import { fmtM } from "@/lib/utils";

interface Props {
  prospecto: KanbanProspecto;
  onSelect: (p: KanbanProspecto) => void;
  notesCount?: number;
  filesCount?: number;
}

export function HubKanbanCard({ prospecto, onSelect, notesCount = 0, filesCount = 0 }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: prospecto.id,
    data: { type: "card", prospecto },
  });

  const valor = prospecto.propuesta?.ventaTotal || prospecto.facturacionEstimada || 0;
  const primaryService = (prospecto.servicios || [])[0] || "rme";
  const svc = SERVICE_COLORS[primaryService] || SERVICE_COLORS.rme;
  const fechaRef = estimarFechaProspecto(prospecto);
  const diasDesdeContacto = fechaRef
    ? Math.floor((Date.now() - new Date(fechaRef).getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const fechaCorta = fechaRef
    ? new Date(`${fechaRef}T12:00:00`).toLocaleDateString("es-MX", { day: "numeric", month: "short" })
    : null;
  const campos = calcularCamposCompletos(prospecto);
  const completos = campos.filter((c: CampoCompleto) => c.ok).length;
  const total = campos.length;
  const pct = (completos / total) * 100;
  const barColor = completos === total ? "#2E7D32" : pct >= 60 ? "#F57C00" : "#ef4444";

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        backgroundColor: svc.bg,
        borderLeft: `3px solid ${svc.border}`,
      }}
      {...attributes}
      {...listeners}
      className="rounded-lg p-1.5 mb-1 cursor-grab active:cursor-grabbing hover:shadow-md transition-all"
      onClick={(e) => {
        if (!isDragging) {
          e.stopPropagation();
          onSelect(prospecto);
        }
      }}
    >
      <div className="flex items-center justify-between gap-1 mb-0.5">
        <h4 className="text-[12px] font-semibold text-[#1c2c4a] truncate leading-tight flex-1 min-w-0">
          {prospecto.empresa}
        </h4>
        <span
          className="text-[8px] font-bold px-1 py-px rounded-full whitespace-nowrap flex-shrink-0"
          style={{ backgroundColor: `${svc.border}18`, color: svc.text }}
        >
          {svc.label}
        </span>
      </div>
      <div className="flex items-center justify-between text-[10px] text-[#9ca3af]">
        <div className="flex items-center gap-1">
          {prospecto.ciudad && <span className="truncate max-w-[50px]">{prospecto.ciudad.split(",")[0]}</span>}
          {fechaCorta && (
            <span
              className="px-1 py-px rounded text-[8px]"
              style={{ color: urgencyColor(fechaRef), backgroundColor: `${urgencyColor(fechaRef)}12` }}
            >
              <span className="text-[#9ca3af] font-normal">1er contacto:</span>{" "}
              <span className="font-semibold">
                {fechaCorta} · {diasDesdeContacto}d
              </span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {notesCount > 0 && (
            <span className="flex items-center gap-0.5 text-[#9ca3af]">
              <MessageSquare size={8} />
              {notesCount}
            </span>
          )}
          {filesCount > 0 && (
            <span className="flex items-center gap-0.5 text-[#9ca3af]">
              <Paperclip size={8} />
              {filesCount}
            </span>
          )}
        </div>
        {valor > 0 && <span className="font-bold text-[#0D47A1]">{fmtM(valor)}</span>}
      </div>
      <div className="mt-1">
        <div className="w-full h-[2px] bg-black/[0.04] rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: barColor }} />
        </div>
      </div>
    </div>
  );
}
