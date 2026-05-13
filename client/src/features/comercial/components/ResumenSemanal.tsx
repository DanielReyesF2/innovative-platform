import type { User } from "@shared/schema/common";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Plus,
  Save,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import {
  useCommitments,
  useCommitmentsRange,
  useCreateCommitment,
  useDeleteCommitment,
  useSaveWeeklyReport,
  useSendWeeklyReport,
  useUpdateCommitment,
  useUpdateCommitmentStatus,
  useWeeklyReport,
  useWeeklyReportsRange,
} from "../api";

// ─── Helpers ───

function _getMonday(d: Date): string {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return date.toISOString().split("T")[0];
}

function formatDateShort(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  return new Date(`${dateStr}T12:00:00`).toLocaleString("es-MX", {
    day: "numeric",
    month: "short",
  });
}

function getCalendarDays(year: number, month: number): { date: Date; isCurrentMonth: boolean }[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Start from Monday of the week containing the 1st
  const startDate = new Date(firstDay);
  const dayOfWeek = startDate.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  startDate.setDate(startDate.getDate() + diff);

  const days: { date: Date; isCurrentMonth: boolean }[] = [];
  const current = new Date(startDate);

  // Generate 6 weeks max
  while (days.length < 42) {
    days.push({
      date: new Date(current),
      isCurrentMonth: current.getMonth() === month,
    });
    current.setDate(current.getDate() + 1);
    // Stop after we pass the last day and complete the week
    if (current > lastDay && current.getDay() === 1 && days.length >= 28) break;
  }

  return days;
}

const MONTH_NAMES = [
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

const DAY_HEADERS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

// ─── Main Component ───

export function ResumenSemanal() {
  const { toast } = useToast();
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);

  // Range for the current month view
  const rangeFrom = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(viewYear, viewMonth + 1, 0).getDate();
  const rangeTo = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const { data: monthReports = [] } = useWeeklyReportsRange(rangeFrom, rangeTo);
  const reportsMap = new Map(monthReports.map((r) => [r.weekStart, r]));

  // Commitments in range for calendar cards
  const { data: rangeCommitments = [] } = useCommitmentsRange(rangeFrom, rangeTo);
  const commitmentsByDate = new Map<string, typeof rangeCommitments>();
  rangeCommitments.forEach((c) => {
    const dateKey = c.dueDate || c.weekStart;
    if (!dateKey) return;
    const list = commitmentsByDate.get(dateKey) || [];
    list.push(c);
    commitmentsByDate.set(dateKey, list);
  });

  const calendarDays = getCalendarDays(viewYear, viewMonth);
  const todayStr = now.toISOString().split("T")[0];

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else setViewMonth((m) => m + 1);
  };

  return (
    <div className="mt-5 space-y-4">
      {/* Calendar */}
      <div className="bg-white rounded-xl border border-[#e5e7eb] p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <CalendarDays className="text-[#00a8a8]" size={20} />
            <h3 className="text-sm font-semibold text-[#1c2c4a]">Resumen Semanal — Vista Calendario</h3>
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
            const isMonday = date.getDay() === 1;
            const isToday = dateStr === todayStr;
            const mondayStr = isMonday ? dateStr : null;
            const report = mondayStr ? reportsMap.get(mondayStr) : null;

            return (
              <div
                key={i}
                onClick={isMonday && isCurrentMonth ? () => setSelectedWeek(mondayStr) : undefined}
                className={`
                  min-h-[70px] p-1.5 bg-white relative transition-all
                  ${!isCurrentMonth ? "opacity-30" : ""}
                  ${isToday ? "ring-2 ring-inset ring-[#00a8a8]" : ""}
                  ${isMonday && isCurrentMonth ? "cursor-pointer hover:bg-[#f0fdf4] group" : ""}
                `}
              >
                <div className={`text-xs font-medium ${isToday ? "text-[#00a8a8] font-bold" : "text-[#6b7280]"}`}>
                  {date.getDate()}
                </div>
                {isMonday && isCurrentMonth && (
                  <div className="mt-1">
                    {report?.status === "sent" ? (
                      <div className="flex items-center gap-1 text-[9px] font-medium text-[#2E7D32] bg-[#2E7D32]/10 rounded px-1.5 py-0.5">
                        <CheckCircle2 size={10} /> Enviado
                      </div>
                    ) : report?.content ? (
                      <div className="flex items-center gap-1 text-[9px] font-medium text-[#F57C00] bg-[#F57C00]/10 rounded px-1.5 py-0.5">
                        <Clock size={10} /> Borrador
                      </div>
                    ) : (
                      <div className="text-[9px] text-[#9ca3af] group-hover:text-[#00a8a8] transition-colors">
                        + Crear reporte
                      </div>
                    )}
                  </div>
                )}
                {/* Commitment cards — click opens the week modal */}
                {isCurrentMonth &&
                  (() => {
                    const items = commitmentsByDate.get(dateStr);
                    if (!items || items.length === 0) return null;
                    return (
                      <div className="mt-0.5 space-y-0.5">
                        {items.slice(0, 2).map((c) => {
                          const isOverdue = c.status === "pendiente" && c.dueDate && new Date(c.dueDate) < now;
                          return (
                            <div
                              key={c.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedWeek(c.weekStart);
                              }}
                              className={`text-[8px] font-medium rounded px-1 py-0.5 truncate cursor-pointer hover:opacity-80 transition-opacity ${
                                c.status === "cumplido"
                                  ? "text-[#2E7D32] bg-[#2E7D32]/10 line-through"
                                  : isOverdue
                                    ? "text-white bg-[#EF4444]"
                                    : "text-white bg-[#0067B0]"
                              }`}
                              title={`${c.responsible}: ${c.description}`}
                            >
                              {c.description.length > 18 ? `${c.description.substring(0, 18)}…` : c.description}
                            </div>
                          );
                        })}
                        {items.length > 2 && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedWeek(items[0].weekStart);
                            }}
                            className="text-[7px] text-[#0067B0] font-semibold px-1 cursor-pointer hover:underline"
                          >
                            +{items.length - 2} más
                          </div>
                        )}
                      </div>
                    );
                  })()}
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex items-center gap-4 text-[10px] text-[#6b7280]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#2E7D32]" /> Enviado
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#F57C00]" /> Borrador
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#e5e7eb]" /> Sin reporte
          </span>
          <span className="ml-auto">Click en un lunes para abrir el reporte</span>
        </div>
      </div>

      {/* Modal */}
      {selectedWeek && <WeekReportModal weekStart={selectedWeek} onClose={() => setSelectedWeek(null)} />}
    </div>
  );
}

// ─── Week Report Modal (v2 — textarea-first layout) ───

function WeekReportModal({ weekStart, onClose }: { weekStart: string; onClose: () => void }) {
  const { toast } = useToast();
  const { data: report, isLoading } = useWeeklyReport(weekStart);
  const { data: weekCommitments = [] } = useCommitments(weekStart);
  const { data: allPending = [] } = useCommitments();
  const saveMutation = useSaveWeeklyReport();
  const sendMutation = useSendWeeklyReport();
  const createCommitment = useCreateCommitment();
  const updateStatus = useUpdateCommitmentStatus();
  const deleteCommitment = useDeleteCommitment();

  const [content, setContent] = useState("");
  const [meetingNotes, setMeetingNotes] = useState("");
  const [recipients, setRecipients] = useState("");
  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [hasEdited, setHasEdited] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Team members for assignment
  const { data: teamMembers = [] } = useQuery<Pick<User, "id" | "name" | "codigo" | "email">[]>({
    queryKey: ["/api/auth/team"],
    staleTime: 5 * 60 * 1000,
  });

  // New commitment form
  const [newDesc, setNewDesc] = useState("");
  const [newResponsible, setNewResponsible] = useState("");
  const [newResponsibleUserId, setNewResponsibleUserId] = useState<number | null>(null);
  const [newDueDate, setNewDueDate] = useState("");

  // Edit commitment
  const updateCommitmentMutation = useUpdateCommitment();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editResponsible, setEditResponsible] = useState("");
  const [editResponsibleUserId, setEditResponsibleUserId] = useState<number | null>(null);
  const [editDueDate, setEditDueDate] = useState("");

  // Initialize from report + localStorage for recipients
  useEffect(() => {
    if (report && !initialized) {
      setContent(report.content || "");
      setMeetingNotes(report.meetingNotes || "");
      if (report.recipients) {
        setRecipients(report.recipients);
      } else {
        const stored = localStorage.getItem("hub_weekly_recipients");
        if (stored) setRecipients(stored);
      }
      setInitialized(true);
    }
  }, [report, initialized]);

  // Auto-save (2s debounce, only after user edits)
  useEffect(() => {
    if (!initialized || !hasEdited) return;
    if (!content.trim() && !meetingNotes.trim()) return;
    const timer = setTimeout(async () => {
      try {
        await saveMutation.mutateAsync({ weekStart, content, meetingNotes });
        setLastSaved(new Date());
      } catch {
        /* silent auto-save failure */
      }
    }, 2000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, meetingNotes, initialized, hasEdited, weekStart]);

  // Inherited pending commitments from OTHER weeks
  const inheritedPending = allPending.filter((c) => c.weekStart !== weekStart);

  const mondayDate = new Date(`${weekStart}T12:00:00`);
  const weekLabel = mondayDate.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const isSent = report?.status === "sent";

  const handleSave = async () => {
    try {
      await saveMutation.mutateAsync({ weekStart, content, meetingNotes });
      setLastSaved(new Date());
      toast({ title: "Borrador guardado" });
    } catch {
      toast({ title: "Error al guardar", variant: "destructive" });
    }
  };

  const handleSend = async () => {
    const recipientList = recipients
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    if (recipientList.length === 0) {
      toast({ title: "Agrega al menos un destinatario", variant: "destructive" });
      return;
    }
    if (!content.trim()) {
      toast({ title: "El resumen está vacío", variant: "destructive" });
      return;
    }
    try {
      await saveMutation.mutateAsync({ weekStart, content, meetingNotes });
      await sendMutation.mutateAsync({ weekStart, content, recipients: recipientList });
      localStorage.setItem("hub_weekly_recipients", recipients);
      setShowSendConfirm(false);
      toast({ title: "Resumen enviado correctamente" });
    } catch {
      toast({ title: "Error al enviar", variant: "destructive" });
    }
  };

  const handleAddCommitment = async () => {
    if (!(newDesc.trim() && newResponsible.trim())) {
      toast({ title: "Descripción y responsable requeridos", variant: "destructive" });
      return;
    }
    try {
      await createCommitment.mutateAsync({
        weekStart,
        description: newDesc.trim(),
        responsible: newResponsible.trim(),
        responsibleUserId: newResponsibleUserId || undefined,
        dueDate: newDueDate || null,
      });
      setNewDesc("");
      setNewResponsible("");
      setNewResponsibleUserId(null);
      setNewDueDate("");
      toast({ title: "Compromiso agregado" });
    } catch {
      toast({ title: "Error al crear compromiso", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-xl p-12">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#00a8a8]" />
        </div>
      </div>
    );
  }

  const allCommitments = [...weekCommitments, ...inheritedPending];
  const pendingCount = allCommitments.filter((c) => c.status === "pendiente").length;
  const doneCount = allCommitments.filter((c) => c.status === "cumplido").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[92vh] flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ═══ HEADER ═══ */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#e5e7eb]/60 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00a8a8] to-[#0D47A1] flex items-center justify-center shadow-sm">
              <FileText className="text-white" size={16} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1c2c4a]">Semana del {weekLabel}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                {isSent ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#2E7D32] bg-[#2E7D32]/10 px-2 py-0.5 rounded-full">
                    <CheckCircle2 size={10} /> Enviado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#F57C00] bg-[#F57C00]/10 px-2 py-0.5 rounded-full">
                    <Clock size={10} /> Borrador
                  </span>
                )}
                {recipients && (
                  <span className="text-[10px] text-[#9ca3af]">
                    · Para:{" "}
                    {recipients
                      .split(",")
                      .map((e) => e.trim().split("@")[0])
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-[#f3f4f6] flex items-center justify-center text-[#6b7280] hover:text-[#1c2c4a] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* ═══ BODY — two columns: textarea (left) + sidebar (right) ═══ */}
        <div className="flex-1 overflow-hidden flex min-h-0">
          {/* ── LEFT: Textarea fills all available space ── */}
          <div className="flex-1 flex flex-col p-4 min-w-0">
            <label className="text-[11px] font-bold text-[#6b7280] uppercase tracking-wider mb-2 flex-shrink-0 flex items-center gap-1.5">
              <FileText size={12} className="text-[#00a8a8]" /> Resumen de la Semana
            </label>
            <textarea
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setHasEdited(true);
              }}
              placeholder={"¿Qué se logró esta semana?\n¿Cómo va el pipeline?\n¿Qué sigue la próxima semana?"}
              className="flex-1 w-full p-5 rounded-xl border border-[#e5e7eb] bg-[#faf7f2] text-[14px] leading-relaxed text-[#1c2c4a] placeholder:text-[#c4b9a8] focus:outline-none focus:ring-2 focus:ring-[#00a8a8]/20 focus:border-[#00a8a8] resize-none"
            />
          </div>

          {/* ── RIGHT: Sidebar — Compromisos + Notas ── */}
          <div className="w-[340px] flex-shrink-0 border-l border-[#e5e7eb]/60 flex flex-col bg-[#f9fafb]/80">
            {/* Compromisos */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="px-4 py-2.5 border-b border-[#e5e7eb]/60 flex items-center justify-between flex-shrink-0">
                <label className="text-[11px] font-bold text-[#1c2c4a] uppercase tracking-wider flex items-center gap-1.5">
                  <Check size={13} className="text-[#7C3AED]" /> Compromisos
                </label>
                <div className="flex items-center gap-1.5">
                  {pendingCount > 0 && (
                    <span className="text-[9px] font-bold text-[#F57C00] bg-[#F57C00]/10 px-1.5 py-0.5 rounded-full">
                      {pendingCount}
                    </span>
                  )}
                  {doneCount > 0 && (
                    <span className="text-[9px] font-bold text-[#2E7D32] bg-[#2E7D32]/10 px-1.5 py-0.5 rounded-full">
                      {doneCount} ✓
                    </span>
                  )}
                </div>
              </div>

              {/* Commitment list */}
              <div className="flex-1 overflow-y-auto">
                {/* Inherited pending from other weeks */}
                {inheritedPending.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-start gap-2 px-3 py-2 border-b border-[#F57C00]/10 bg-[#FFF7ED] hover:bg-[#FFF0E0] group"
                  >
                    <button
                      onClick={() => updateStatus.mutateAsync({ id: c.id, status: "cumplido" })}
                      className="w-4 h-4 rounded border-[1.5px] border-[#F57C00] flex items-center justify-center flex-shrink-0 mt-0.5 hover:bg-[#F57C00]/10"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] text-[#1c2c4a] leading-snug">{c.description}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] font-medium text-[#F57C00]">{c.responsible.split(" ")[0]}</span>
                        <span className="text-[10px] text-[#d1d5db]">·</span>
                        <span
                          className={`text-[10px] ${new Date(c.dueDate || c.weekStart) < new Date() ? "text-[#EF4444] font-bold" : "text-[#6b7280]"}`}
                        >
                          {formatDateShort(c.dueDate || c.weekStart)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* This week's commitments */}
                {weekCommitments.map((c) =>
                  editingId === c.id ? (
                    /* ── Edit mode ── */
                    <div key={c.id} className="px-3 py-2 border-b border-[#00a8a8]/20 bg-[#00a8a8]/5">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <select
                          value={editResponsibleUserId || ""}
                          onChange={(e) => {
                            const id = Number(e.target.value);
                            const m = teamMembers.find((t) => t.id === id);
                            if (m) {
                              setEditResponsible(m.name);
                              setEditResponsibleUserId(m.id);
                            }
                          }}
                          className="flex-1 px-1.5 py-1 rounded border border-[#e5e7eb] bg-white text-[11px] focus:outline-none focus:ring-1 focus:ring-[#00a8a8]"
                        >
                          <option value="">{editResponsible.split(" ")[0]}</option>
                          {teamMembers.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name.split(" ").slice(0, 2).join(" ")}
                            </option>
                          ))}
                        </select>
                        <input
                          type="date"
                          value={editDueDate}
                          onChange={(e) => setEditDueDate(e.target.value)}
                          className="w-[110px] px-1 py-1 rounded border border-[#e5e7eb] bg-white text-[10px] focus:outline-none focus:ring-1 focus:ring-[#00a8a8]"
                        />
                        <button
                          onClick={() => {
                            if (editDesc.trim()) {
                              updateCommitmentMutation.mutateAsync({
                                id: c.id,
                                description: editDesc,
                                responsible: editResponsible,
                                responsibleUserId: editResponsibleUserId,
                                dueDate: editDueDate || null,
                              });
                            }
                            setEditingId(null);
                          }}
                          className="w-7 h-7 rounded-lg bg-[#00a8a8] text-white flex items-center justify-center hover:bg-[#008b8b] flex-shrink-0"
                        >
                          <Check size={12} />
                        </button>
                      </div>
                      <input
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        className="w-full px-2 py-1 rounded border border-[#e5e7eb] bg-white text-[12px] focus:outline-none focus:ring-1 focus:ring-[#00a8a8]"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && editDesc.trim()) {
                            updateCommitmentMutation.mutateAsync({
                              id: c.id,
                              description: editDesc,
                              responsible: editResponsible,
                              responsibleUserId: editResponsibleUserId,
                              dueDate: editDueDate || null,
                            });
                            setEditingId(null);
                          }
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        autoFocus
                      />
                    </div>
                  ) : (
                    /* ── View mode — card style ── */
                    <div
                      key={c.id}
                      className="flex items-start gap-2 px-3 py-2 border-b border-[#e5e7eb]/30 hover:bg-white group cursor-pointer"
                      onDoubleClick={() => {
                        setEditingId(c.id);
                        setEditDesc(c.description);
                        setEditResponsible(c.responsible);
                        setEditResponsibleUserId(c.responsibleUserId || null);
                        setEditDueDate(c.dueDate || "");
                      }}
                    >
                      <button
                        onClick={() =>
                          updateStatus.mutateAsync({
                            id: c.id,
                            status: c.status === "cumplido" ? "pendiente" : "cumplido",
                          })
                        }
                        className={`w-4 h-4 rounded border-[1.5px] flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                          c.status === "cumplido"
                            ? "bg-[#2E7D32] border-[#2E7D32] text-white"
                            : "border-[#d1d5db] hover:border-[#00a8a8]"
                        }`}
                      >
                        {c.status === "cumplido" && <Check size={9} />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-[12px] leading-snug ${c.status === "cumplido" ? "line-through text-[#9ca3af]" : "text-[#1c2c4a]"}`}
                        >
                          {c.description}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className={`text-[10px] font-medium ${c.status === "cumplido" ? "text-[#9ca3af]" : "text-[#6b7280]"}`}
                          >
                            {c.responsible.split(" ")[0]}
                          </span>
                          {c.dueDate && (
                            <>
                              <span className="text-[10px] text-[#d1d5db]">·</span>
                              <span
                                className={`text-[10px] ${c.status !== "cumplido" && new Date(c.dueDate) < new Date() ? "text-[#EF4444] font-bold" : "text-[#6b7280]"}`}
                              >
                                {formatDateShort(c.dueDate)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteCommitment.mutateAsync(c.id)}
                        className="opacity-0 group-hover:opacity-100 text-[#9ca3af] hover:text-[#EF4444] transition-all p-0.5 mt-0.5"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ),
                )}
                {weekCommitments.length === 0 && inheritedPending.length === 0 && (
                  <div className="text-[11px] text-[#9ca3af] text-center py-6">Sin compromisos</div>
                )}
              </div>

              {/* Add new commitment */}
              <div className="border-t border-[#e5e7eb]/60 px-3 py-2.5 flex-shrink-0 bg-white/50">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <select
                    value={newResponsibleUserId || ""}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      const m = teamMembers.find((t) => t.id === id);
                      if (m) {
                        setNewResponsible(m.name);
                        setNewResponsibleUserId(m.id);
                      }
                    }}
                    className="flex-1 px-1.5 py-1.5 rounded-lg border border-[#e5e7eb] bg-white text-[11px] text-[#1c2c4a] focus:outline-none focus:ring-1 focus:ring-[#00a8a8] appearance-none"
                  >
                    <option value="">Persona...</option>
                    {teamMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name.split(" ").slice(0, 2).join(" ")}
                      </option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-[110px] px-1.5 py-1.5 rounded-lg border border-[#e5e7eb] bg-white text-[10px] focus:outline-none focus:ring-1 focus:ring-[#00a8a8]"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Compromiso..."
                    className="flex-1 px-2 py-1.5 rounded-lg border border-[#e5e7eb] bg-white text-[11px] focus:outline-none focus:ring-1 focus:ring-[#00a8a8]"
                    onKeyDown={(e) =>
                      e.key === "Enter" && newDesc.trim() && newResponsible.trim() && handleAddCommitment()
                    }
                  />
                  <button
                    onClick={handleAddCommitment}
                    disabled={createCommitment.isPending || !newDesc.trim() || !newResponsible.trim()}
                    className="w-8 h-8 rounded-lg text-white bg-[#00a8a8] hover:bg-[#008b8b] disabled:opacity-30 transition-colors shadow-sm flex items-center justify-center flex-shrink-0"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Notas de Junta */}
            <div className="h-[140px] flex-shrink-0 border-t border-[#e5e7eb]/60 flex flex-col">
              <div className="px-4 py-2 flex-shrink-0">
                <label className="text-[11px] font-bold text-[#1c2c4a] uppercase tracking-wider flex items-center gap-1.5">
                  <CalendarDays size={13} className="text-[#0D47A1]" /> Notas de Junta
                </label>
              </div>
              <div className="flex-1 px-3 pb-2">
                <textarea
                  value={meetingNotes}
                  onChange={(e) => {
                    setMeetingNotes(e.target.value);
                    setHasEdited(true);
                  }}
                  placeholder="Decisiones, acuerdos, feedback..."
                  className="w-full h-full p-2.5 rounded-lg border border-[#e5e7eb] bg-white text-[12px] text-[#1c2c4a] placeholder:text-[#bbb] focus:outline-none focus:ring-1 focus:ring-[#00a8a8]/20 resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ═══ FOOTER ═══ */}
        <div className="flex items-center justify-between px-5 py-2.5 border-t border-[#e5e7eb]/60 flex-shrink-0">
          <div className="text-[11px] text-[#9ca3af] flex items-center gap-1.5 min-h-[20px]">
            {saveMutation.isPending && "Guardando..."}
            {!saveMutation.isPending && lastSaved && (
              <>
                <CheckCircle2 size={11} className="text-[#2E7D32]" />
                <span>Guardado</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-medium bg-white border border-[#e5e7eb] text-[#6b7280] hover:text-[#1c2c4a] hover:bg-[#f3f4f6] transition-colors disabled:opacity-50"
            >
              <Save size={14} />
              Guardar
            </button>
            <button
              onClick={() => setShowSendConfirm(true)}
              disabled={sendMutation.isPending || !content.trim()}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-[13px] font-semibold bg-[#00a8a8] text-white hover:bg-[#008f8f] transition-colors disabled:opacity-50 shadow-sm"
            >
              <Send size={14} />
              Enviar Resumen
            </button>
          </div>
        </div>

        {/* Send confirmation overlay */}
        {showSendConfirm && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-2xl z-10">
            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl m-4">
              <h4 className="text-base font-bold text-[#1c2c4a] mb-1">Enviar Resumen Semanal</h4>
              <p className="text-sm text-[#6b7280] mb-4">
                Se notificará a los destinatarios con el resumen y compromisos de esta semana.
              </p>

              <div className="mb-4">
                <label className="text-[11px] font-bold text-[#6b7280] uppercase tracking-wider mb-1.5 block">
                  Destinatarios
                </label>
                <input
                  type="text"
                  value={recipients}
                  onChange={(e) => setRecipients(e.target.value)}
                  placeholder="luz@empresa.com, roger@empresa.com"
                  className="w-full px-3 py-2 rounded-lg border border-[#e5e7eb] text-sm focus:outline-none focus:ring-2 focus:ring-[#00a8a8]/20 focus:border-[#00a8a8]"
                />
              </div>

              {recipients.trim() && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {recipients
                    .split(",")
                    .map((e) => e.trim())
                    .filter(Boolean)
                    .map((email) => (
                      <span key={email} className="text-xs text-[#1c2c4a] bg-[#f3f4f6] px-2.5 py-1 rounded-full">
                        {email}
                      </span>
                    ))}
                </div>
              )}

              {allCommitments.length > 0 && (
                <div className="mb-4 p-3 bg-[#f9fafb] rounded-lg">
                  <div className="text-[10px] font-bold text-[#6b7280] uppercase mb-1.5">
                    {allCommitments.length} compromisos incluidos
                  </div>
                  {allCommitments.slice(0, 4).map((c) => (
                    <div key={c.id} className="text-[11px] text-[#1c2c4a] truncate">
                      • {c.description} — {c.responsible}
                    </div>
                  ))}
                  {allCommitments.length > 4 && (
                    <div className="text-[10px] text-[#6b7280] mt-1">+{allCommitments.length - 4} más</div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowSendConfirm(false)}
                  className="px-4 py-2 text-sm text-[#6b7280] hover:bg-[#f3f4f6] rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSend}
                  disabled={sendMutation.isPending || !recipients.trim()}
                  className="px-5 py-2 text-sm font-semibold bg-[#00a8a8] text-white rounded-lg hover:bg-[#008f8f] disabled:opacity-50 transition-colors shadow-sm"
                >
                  {sendMutation.isPending ? "Enviando..." : "Confirmar envío"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
