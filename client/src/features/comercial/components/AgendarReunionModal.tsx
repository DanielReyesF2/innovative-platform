import { STAGE } from "@shared/schema/comercial-stages";
import type { KanbanProspecto } from "@shared/types/comercial";
import { Calendar as CalendarIcon, ChevronRight, Target, Trash2, Users, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { KANBAN_STAGES } from "@/lib/comercial-constants";
import { useCreateMeeting, useUpdateProspect } from "../api";

// Al avanzar de Prospecto → Reunión, Vero pide que se capturen todos los
// campos obligatorios de la etapa Reunión: fecha, hora, tipo, objetivo,
// asistentes (prospecto + Innovative con cargo). Esto reemplaza el
// StageGateModal genérico para esta transición porque los inputs
// estructurados no caben en un gate de inputs sueltos.

interface AttendeeEntry {
  side: "prospect" | "innovative";
  name: string;
  role: string;
}

interface Props {
  prospecto: KanbanProspecto;
  onClose: () => void;
  onAdvanced?: () => void;
}

export function AgendarReunionModal({ prospecto, onClose, onAdvanced }: Props) {
  const { toast } = useToast();
  const createMeeting = useCreateMeeting();
  const updateProspect = useUpdateProspect();

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(60);
  const [meetingType, setMeetingType] = useState<"virtual" | "presencial" | "">("");
  const [objective, setObjective] = useState("");
  const [attendees, setAttendees] = useState<AttendeeEntry[]>([
    { side: "prospect", name: "", role: "" },
    { side: "innovative", name: "", role: "" },
  ]);

  const prospectAttendees = attendees.filter((a) => a.side === "prospect");
  const innovativeAttendees = attendees.filter((a) => a.side === "innovative");

  const addAttendee = (side: "prospect" | "innovative") => {
    setAttendees((prev) => [...prev, { side, name: "", role: "" }]);
  };

  const updateAttendee = (originalIndex: number, patch: Partial<AttendeeEntry>) => {
    setAttendees((prev) => prev.map((a, i) => (i === originalIndex ? { ...a, ...patch } : a)));
  };

  const removeAttendee = (originalIndex: number) => {
    setAttendees((prev) => prev.filter((_, i) => i !== originalIndex));
  };

  const missing: string[] = [];
  if (!date) missing.push("fecha");
  if (!time) missing.push("hora");
  if (!meetingType) missing.push("tipo");
  if (!objective.trim()) missing.push("objetivo");
  const validAttendeesProspect = prospectAttendees.some((a) => a.name.trim());
  const validAttendeesInnovative = innovativeAttendees.some((a) => a.name.trim());
  if (!validAttendeesProspect) missing.push("al menos un asistente del prospecto");
  if (!validAttendeesInnovative) missing.push("al menos un asistente de Innovative");
  const canSubmit = missing.length === 0;

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast({ title: `Faltan: ${missing.join(", ")}`, variant: "destructive" });
      return;
    }
    try {
      const scheduledAt = new Date(`${date}T${time}:00`).toISOString();
      // Solo mandamos asistentes con nombre (los vacíos se descartan).
      const cleanAttendees = attendees
        .filter((a) => a.name.trim())
        .map((a) => ({ side: a.side, name: a.name.trim(), role: a.role.trim() }));

      // Paso 1: crear la reunión
      await createMeeting.mutateAsync({
        prospectId: prospecto.id,
        title: objective.trim().slice(0, 80) || "Reunión",
        scheduledAt,
        duration,
        meetingType,
        objective: objective.trim(),
        attendees: cleanAttendees,
      });

      // Paso 2: avanzar al prospecto a Reunión (DB: levantamiento) +
      // setear meetingDate para el gate de salida.
      await updateProspect.mutateAsync({
        id: prospecto.id,
        stage: STAGE.LEVANTAMIENTO,
        meetingDate: date,
      });

      toast({ title: "Reunión agendada" });
      onAdvanced?.();
    } catch {
      toast({ title: "Error al agendar la reunión", variant: "destructive" });
    }
  };

  const fromLabel = KANBAN_STAGES.find((s) => s.id === prospecto.status)?.label || "Prospecto";
  const toLabel = KANBAN_STAGES.find((s) => s.id === STAGE.LEVANTAMIENTO)?.label || "Reunión";

  const renderAttendeeList = (side: "prospect" | "innovative", label: string, color: string) => {
    const entries = attendees.map((a, i) => ({ entry: a, index: i })).filter(({ entry }) => entry.side === side);
    return (
      <div>
        <div className="flex items-center justify-between mb-1">
          <Label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color }}>
            {label}
          </Label>
          <button
            type="button"
            onClick={() => addAttendee(side)}
            className="text-[10px] font-medium px-1.5 py-0.5 rounded hover:bg-[#f3f4f6]"
            style={{ color }}
          >
            + agregar
          </button>
        </div>
        <div className="space-y-1.5">
          {entries.map(({ entry, index }) => (
            <div key={index} className="group grid grid-cols-[1fr_1fr_24px] gap-1.5 items-center">
              <Input
                value={entry.name}
                onChange={(e) => updateAttendee(index, { name: e.target.value })}
                placeholder="Nombre"
                className="h-9 text-sm"
              />
              <Input
                value={entry.role}
                onChange={(e) => updateAttendee(index, { role: e.target.value })}
                placeholder="Cargo"
                className="h-9 text-sm"
              />
              <button
                type="button"
                onClick={() => removeAttendee(index)}
                className="opacity-0 group-hover:opacity-100 text-[#9ca3af] hover:text-red-500 transition-all"
                title="Quitar"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-lg bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-[#F57C00]" />
            <h2 className="text-lg font-bold">Agendar Reunión</h2>
          </div>
          <button onClick={onClose} className="text-[#6b7280] hover:text-[#1c2c4a]">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Context */}
        <div className="px-6 pt-4">
          <div className="rounded-lg bg-[#f9fafb] px-3 py-2">
            <div className="text-sm font-semibold text-[#1c2c4a]">{prospecto.empresa}</div>
            <div className="text-xs text-[#6b7280]">
              {prospecto.ciudad} · {prospecto.industria}
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm mt-3">
            <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">{fromLabel}</span>
            <ChevronRight className="h-4 w-4 text-[#6b7280]" />
            <span className="rounded bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">{toLabel}</span>
          </div>
        </div>

        {/* Fields */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Fecha + hora + duración */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label>Fecha *</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Hora *</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Duración</Label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value={30}>30 min</option>
                <option value={60}>1 hora</option>
                <option value={90}>1.5 horas</option>
                <option value={120}>2 horas</option>
              </select>
            </div>
          </div>

          {/* Tipo */}
          <div>
            <Label>Tipo *</Label>
            <div className="mt-1 flex gap-2">
              {(["virtual", "presencial"] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setMeetingType(opt)}
                  className={`flex-1 rounded-md px-4 py-2 text-sm font-medium border transition-colors ${
                    meetingType === opt
                      ? "bg-[#00a8a8] text-white border-[#00a8a8]"
                      : "bg-white text-[#6b7280] border-[#e5e7eb] hover:bg-[#f3f4f6]"
                  }`}
                >
                  {opt === "virtual" ? "Virtual" : "Presencial"}
                </button>
              ))}
            </div>
          </div>

          {/* Objetivo */}
          <div>
            <Label>
              <Target className="inline h-3.5 w-3.5 mr-1" />
              Objetivo de la reunión *
            </Label>
            <Textarea
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="Ej: Dimensionar oportunidad, validar levantamiento, presentar Innovative..."
              rows={2}
              className="mt-1"
            />
          </div>

          {/* Asistentes */}
          <div>
            <Label>
              <Users className="inline h-3.5 w-3.5 mr-1" />
              Asistentes *
            </Label>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Al menos un asistente por lado. Nombre y cargo ayudan a preparar la reunión.
            </p>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {renderAttendeeList("prospect", "Del prospecto", "#0D47A1")}
              {renderAttendeeList("innovative", "De Innovative", "#00a8a8")}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-6 py-3">
          <div className="text-[11px] text-muted-foreground">
            * Requerido. Notas y próximo paso se llenan después de la reunión.
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || createMeeting.isPending || updateProspect.isPending}
              className="bg-[#00a8a8] hover:bg-[#008b8b]"
            >
              {createMeeting.isPending || updateProspect.isPending ? "Agendando..." : "Agendar y avanzar"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
