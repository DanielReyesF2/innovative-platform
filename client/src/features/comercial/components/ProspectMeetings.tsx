import type { ProspectMeeting } from "@shared/schema/comercial";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, CheckCircle, Clock, MapPin, Plus, Trash2, Users, Video, XCircle } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import {
  useCancelMeeting,
  useCompleteMeeting,
  useCreateMeeting,
  useDeleteMeeting,
  useProspectMeetings,
  useUpdateMeeting,
} from "../api";
import { InlineSelect, InlineText } from "./InlineEdit";

interface ProspectMeetingsProps {
  prospectId: number;
}

const statusColors: Record<string, string> = {
  programada: "bg-blue-100 text-blue-700",
  completada: "bg-green-100 text-green-700",
  cancelada: "bg-red-100 text-red-700",
  reprogramada: "bg-orange-100 text-orange-700",
};

const statusLabels: Record<string, string> = {
  programada: "Programada",
  completada: "Completada",
  cancelada: "Cancelada",
  reprogramada: "Reprogramada",
};

const DURATION_OPTIONS = [
  { value: "30", label: "30 min" },
  { value: "60", label: "1 hora" },
  { value: "90", label: "1.5 horas" },
  { value: "120", label: "2 horas" },
];

const MEETING_TYPE_OPTIONS = [
  { value: "virtual", label: "Virtual" },
  { value: "presencial", label: "Presencial" },
];

// Asistentes estructurados por el spec de Vero: prospecto + Innovative, cada
// uno con nombre y cargo. Se serializa como JSONB sobre el campo `attendees`.
interface AttendeeEntry {
  side: "prospect" | "innovative";
  name: string;
  role: string;
}

// Los datos existentes pueden llegar como:
//   - AttendeeEntry[] (nuevo formato)
//   - string[] (legacy: nombres libres sin cargo ni lado)
//   - null / undefined
// Esta función normaliza a AttendeeEntry[] tratando los legacy como lado
// 'innovative' (el que más probablemente usó el ejecutivo).
function normalizeAttendees(raw: unknown): AttendeeEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item === "string") {
        return { side: "innovative" as const, name: item, role: "" };
      }
      if (item && typeof item === "object" && "name" in item) {
        const obj = item as Record<string, unknown>;
        const side = obj.side === "prospect" ? "prospect" : "innovative";
        return {
          side: side as "prospect" | "innovative",
          name: String(obj.name ?? ""),
          role: String(obj.role ?? ""),
        };
      }
      return null;
    })
    .filter((x): x is AttendeeEntry => x !== null);
}

function AttendeesEditor({
  attendees,
  onSave,
}: {
  attendees: unknown;
  onSave: (next: AttendeeEntry[]) => Promise<void>;
}) {
  const list = normalizeAttendees(attendees);

  const commit = async (next: AttendeeEntry[]) => {
    try {
      await onSave(next);
    } catch {
      // El toast ya lo maneja saveField
    }
  };

  const addEntry = (side: "prospect" | "innovative") => {
    commit([...list, { side, name: "", role: "" }]);
  };

  const updateEntry = (index: number, patch: Partial<AttendeeEntry>) => {
    const next = list.map((e, i) => (i === index ? { ...e, ...patch } : e));
    commit(next);
  };

  const removeEntry = (index: number) => {
    commit(list.filter((_, i) => i !== index));
  };

  const renderSide = (side: "prospect" | "innovative", label: string, color: string) => {
    const entries = list.map((e, i) => ({ entry: e, index: i })).filter(({ entry }) => entry.side === side);

    return (
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color }}>
            {label}
          </span>
          <button
            type="button"
            onClick={() => addEntry(side)}
            className="text-[10px] font-medium px-1.5 py-0.5 rounded hover:bg-[#f3f4f6]"
            style={{ color }}
          >
            + agregar
          </button>
        </div>
        {entries.length === 0 ? (
          <p className="text-[11px] italic text-[#9ca3af]">Sin asistentes</p>
        ) : (
          <div className="space-y-1">
            {entries.map(({ entry, index }) => (
              <div key={index} className="group grid grid-cols-[1fr_1fr_24px] gap-1.5 items-center">
                <Input
                  value={entry.name}
                  onChange={(e) => updateEntry(index, { name: e.target.value })}
                  placeholder="Nombre"
                  className="h-8 text-xs"
                />
                <Input
                  value={entry.role}
                  onChange={(e) => updateEntry(index, { role: e.target.value })}
                  placeholder="Cargo"
                  className="h-8 text-xs"
                />
                <button
                  type="button"
                  onClick={() => removeEntry(index)}
                  className="opacity-0 group-hover:opacity-100 text-[#9ca3af] hover:text-red-500 transition-all"
                  title="Quitar"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {renderSide("prospect", "Del prospecto", "#0D47A1")}
      {renderSide("innovative", "De Innovative", "#0067B0")}
    </div>
  );
}

// Convert ISO timestamp to the <input type="datetime-local"> format (local time, no tz).
function toDatetimeLocalValue(iso: string | Date | null | undefined): string {
  if (!iso) return "";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ProspectMeetings({ prospectId }: ProspectMeetingsProps) {
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newScheduledAt, setNewScheduledAt] = useState("");
  const [newDuration, setNewDuration] = useState(60);
  const [completingId, setCompletingId] = useState<number | null>(null);
  const [outcome, setOutcome] = useState("");

  const { data: meetings = [], isLoading } = useProspectMeetings(prospectId);
  const createMeeting = useCreateMeeting();
  const updateMeeting = useUpdateMeeting();
  const completeMeeting = useCompleteMeeting();
  const cancelMeeting = useCancelMeeting();
  const deleteMeeting = useDeleteMeeting();

  const resetCreate = () => {
    setCreating(false);
    setNewTitle("");
    setNewScheduledAt("");
    setNewDuration(60);
  };

  const handleCreate = async () => {
    if (!(newTitle.trim() && newScheduledAt)) {
      toast({ title: "Título y fecha son requeridos", variant: "destructive" });
      return;
    }
    try {
      await createMeeting.mutateAsync({
        prospectId,
        title: newTitle.trim(),
        scheduledAt: new Date(newScheduledAt).toISOString(),
        duration: newDuration,
      });
      resetCreate();
    } catch {
      toast({ title: "No se pudo programar la reunión", variant: "destructive" });
    }
  };

  const handleComplete = async (meetingId: number) => {
    if (!outcome.trim()) {
      toast({ title: "Agrega un resultado para cerrar la reunión", variant: "destructive" });
      return;
    }
    try {
      await completeMeeting.mutateAsync({ prospectId, meetingId, outcome: outcome.trim() });
      setCompletingId(null);
      setOutcome("");
    } catch {
      toast({ title: "No se pudo completar la reunión", variant: "destructive" });
    }
  };

  const handleCancel = async (meetingId: number) => {
    try {
      await cancelMeeting.mutateAsync({ prospectId, meetingId });
    } catch {
      toast({ title: "No se pudo cancelar la reunión", variant: "destructive" });
    }
  };

  const handleDelete = async (meetingId: number) => {
    try {
      await deleteMeeting.mutateAsync({ prospectId, meetingId });
    } catch {
      toast({ title: "No se pudo eliminar la reunión", variant: "destructive" });
    }
  };

  // Field-save helper used by all the inline components on a given meeting.
  const saveField = async (meetingId: number, patch: Record<string, unknown>) => {
    try {
      await updateMeeting.mutateAsync({ prospectId, meetingId, ...patch });
    } catch (e) {
      toast({ title: "Error al guardar", variant: "destructive" });
      throw e;
    }
  };

  const upcoming = meetings.filter((m: ProspectMeeting) => m.status === "programada" || m.status === "reprogramada");
  const past = meetings.filter((m: ProspectMeeting) => m.status === "completada" || m.status === "cancelada");

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <h4 className="font-medium">Reuniones</h4>
        <p className="text-xs text-muted-foreground mt-0.5">
          Clic en cualquier campo de una reunión para editarlo. Enter guarda, Esc cancela.
        </p>
      </div>

      {/* Inline create */}
      {!creating ? (
        <Button size="sm" onClick={() => setCreating(true)} className="mb-4 self-start">
          <Plus className="h-4 w-4 mr-1" /> Programar reunión
        </Button>
      ) : (
        <div className="mb-4 bg-white border rounded-lg p-3 space-y-2">
          <Input
            placeholder="Título de la reunión"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            autoFocus
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="text-[11px] text-muted-foreground">Fecha y hora</label>
              <Input type="datetime-local" value={newScheduledAt} onChange={(e) => setNewScheduledAt(e.target.value)} />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground">Duración</label>
              <select
                value={String(newDuration)}
                onChange={(e) => setNewDuration(Number(e.target.value))}
                className="mt-0 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {DURATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={resetCreate}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleCreate} disabled={createMeeting.isPending}>
              {createMeeting.isPending ? "Guardando..." : "Programar"}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Una vez creada, podrás editar todos los campos con clic sobre ellos (ubicación, link, descripción, etc).
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </div>
      ) : meetings.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p>Sin reuniones — agrega la primera arriba</p>
        </div>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-muted-foreground mb-3">Próximas</h5>
              <div className="space-y-3">
                {upcoming.map((m: ProspectMeeting) => (
                  <div key={m.id} className="group bg-card border rounded-lg p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <InlineText
                            value={m.title}
                            onSave={(v) => saveField(m.id, { title: v })}
                            emptyLabel="Agregar título"
                            displayClassName="font-medium text-[#1c2c4a]"
                            className="min-w-[240px]"
                          />
                          <Badge className={statusColors[m.status ?? ""]}>{statusLabels[m.status ?? ""]}</Badge>
                        </div>

                        <div className="mt-3 space-y-1.5 text-sm">
                          <InlineDatetime
                            value={m.scheduledAt}
                            onSave={(v) => saveField(m.id, { scheduledAt: v })}
                            icon={<Calendar className="h-4 w-4" />}
                          />
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-[#9ca3af]" />
                            <span className="text-[#6b7280]">Duración</span>
                            <InlineSelect
                              value={String(m.duration ?? 60)}
                              options={DURATION_OPTIONS}
                              onSave={(v) => saveField(m.id, { duration: Number(v) })}
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Video className="h-4 w-4 text-[#9ca3af]" />
                            <span className="text-[#6b7280]">Tipo</span>
                            <InlineSelect
                              value={(m.meetingType as string | undefined) ?? undefined}
                              options={MEETING_TYPE_OPTIONS}
                              onSave={(v) => saveField(m.id, { meetingType: v })}
                              emptyLabel="Virtual / presencial"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-[#9ca3af]" />
                            <span className="text-[#6b7280]">Ubicación</span>
                            <InlineText
                              value={m.location || ""}
                              onSave={(v) => saveField(m.id, { location: v || null })}
                              emptyLabel="Agregar ubicación"
                              placeholder="Ej: Oficinas del cliente"
                              className="min-w-[200px]"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Video className="h-4 w-4 text-[#9ca3af]" />
                            <span className="text-[#6b7280]">Link</span>
                            <InlineText
                              value={m.meetingUrl || ""}
                              onSave={(v) => saveField(m.id, { meetingUrl: v || null })}
                              emptyLabel="Agregar link"
                              placeholder="https://meet.google.com/..."
                              className="min-w-[240px]"
                            />
                            {m.meetingUrl && (
                              <a
                                href={m.meetingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] text-[#0067B0] hover:underline ml-1"
                              >
                                Unirse
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Objetivo de la reunión (spec Vero) */}
                        <div className="mt-3">
                          <div className="text-[11px] font-semibold uppercase tracking-widest text-[#9ca3af] mb-1">
                            Objetivo
                          </div>
                          <InlineText
                            value={(m as unknown as { objective?: string }).objective || ""}
                            onSave={(v) => saveField(m.id, { objective: v || null })}
                            emptyLabel="Dimensionar oportunidad, validar levantamiento..."
                            placeholder="Objetivo de esta reunión"
                            multiline
                            className="w-full"
                          />
                        </div>

                        {/* Asistentes (prospecto + Innovative, nombre + cargo) */}
                        <div className="mt-3">
                          <div className="text-[11px] font-semibold uppercase tracking-widest text-[#9ca3af] mb-2 flex items-center gap-1">
                            <Users className="h-3 w-3" /> Asistentes
                          </div>
                          <AttendeesEditor
                            attendees={m.attendees}
                            onSave={(next) => saveField(m.id, { attendees: next })}
                          />
                        </div>

                        {/* Descripción / agenda (opcional, texto libre) */}
                        <div className="mt-3">
                          <div className="text-[11px] font-semibold uppercase tracking-widest text-[#9ca3af] mb-1">
                            Notas / agenda
                          </div>
                          <InlineText
                            value={m.description || ""}
                            onSave={(v) => saveField(m.id, { description: v || null })}
                            emptyLabel="Agregar agenda o detalles previos"
                            placeholder="Agenda o detalles..."
                            multiline
                            displayClassName="text-[13px] text-[#6b7280]"
                            className="w-full"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDelete(m.id)}
                        className="opacity-0 group-hover:opacity-100 text-[#9ca3af] hover:text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-all flex-shrink-0"
                        title="Eliminar reunión"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Action row: complete / cancel */}
                    <div className="flex gap-2 mt-3 pt-3 border-t border-[#f3f4f6]">
                      {completingId === m.id ? (
                        <div className="flex-1 flex flex-col gap-2">
                          <Textarea
                            value={outcome}
                            onChange={(e) => setOutcome(e.target.value)}
                            placeholder="Describe el resultado de la reunión..."
                            rows={2}
                            autoFocus
                          />
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setCompletingId(null);
                                setOutcome("");
                              }}
                            >
                              Cancelar
                            </Button>
                            <Button size="sm" onClick={() => handleComplete(m.id)} disabled={completeMeeting.isPending}>
                              {completeMeeting.isPending ? "Guardando..." : "Marcar completada"}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setCompletingId(m.id);
                              setOutcome("");
                            }}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" /> Completar
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleCancel(m.id)}>
                            <XCircle className="h-4 w-4 mr-1" /> Cancelar
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-muted-foreground mb-3">Historial</h5>
              <div className="space-y-3">
                {past.map((m: ProspectMeeting) => (
                  <div key={m.id} className="group bg-card border rounded-lg p-4 opacity-80">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{m.title}</p>
                        <Badge className={statusColors[m.status ?? ""]}>{statusLabels[m.status ?? ""]}</Badge>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDelete(m.id)}
                        className="opacity-0 group-hover:opacity-100 text-[#9ca3af] hover:text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-all"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {m.scheduledAt ? format(new Date(m.scheduledAt), "PPp", { locale: es }) : ""}
                    </p>
                    {m.outcome && (
                      <p className="text-sm mt-2 bg-muted p-2 rounded">
                        <strong>Resultado:</strong> {m.outcome}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Inline datetime helper — click to edit, saves on blur / Enter.
function InlineDatetime({
  value,
  onSave,
  icon,
}: {
  value: Date | string | null;
  onSave: (iso: string) => Promise<void>;
  icon?: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(toDatetimeLocalValue(value));
  const [saving, setSaving] = useState(false);

  const formatted = value
    ? format(typeof value === "string" ? parseISO(value) : value, "PPp", { locale: es })
    : "Sin fecha";

  const save = async () => {
    if (!draft) {
      setEditing(false);
      return;
    }
    const iso = new Date(draft).toISOString();
    if (iso === (value ? new Date(value).toISOString() : "")) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(iso);
    } catch {
      setDraft(toDatetimeLocalValue(value));
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        {icon}
        <Input
          type="datetime-local"
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              save();
            }
            if (e.key === "Escape") {
              setDraft(toDatetimeLocalValue(value));
              setEditing(false);
            }
          }}
          className="h-8 w-auto text-sm border-[#0067B0]"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(toDatetimeLocalValue(value));
        setEditing(true);
      }}
      className="group inline-flex items-center gap-2 rounded px-1 py-0.5 -mx-1 text-[#6b7280] hover:bg-[#f3f4f6] transition-colors"
    >
      {icon}
      <span>{formatted}</span>
      {saving && <span className="text-[10px] text-[#9ca3af]">guardando...</span>}
    </button>
  );
}
