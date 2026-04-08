import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft, ChevronRight, FileText, Save, Send, Clock,
  CheckCircle2, Plus, Trash2, Check, X, CalendarDays, AlertCircle,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  useWeeklyReport, useSaveWeeklyReport, useSendWeeklyReport,
  useWeeklyReportsRange, useCommitments, useCreateCommitment,
  useUpdateCommitmentStatus, useDeleteCommitment, useCommitmentsRange,
} from "../api";
import type { User } from "@shared/schema/common";

// ─── Helpers ───

function getMonday(d: Date): string {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return date.toISOString().split("T")[0];
}

function formatDateShort(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  return new Date(dateStr + "T12:00:00").toLocaleString("es-MX", {
    day: "numeric", month: "short",
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
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
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
  const reportsMap = new Map(monthReports.map(r => [r.weekStart, r]));

  // Commitments in range for calendar indicators
  const { data: rangeCommitments = [] } = useCommitmentsRange(rangeFrom, rangeTo);
  const commitmentsByDate = new Map<string, { pending: number; overdue: number }>();
  rangeCommitments.forEach(c => {
    const dateKey = c.dueDate || c.weekStart;
    if (!dateKey) return;
    const entry = commitmentsByDate.get(dateKey) || { pending: 0, overdue: 0 };
    if (c.status === "pendiente") {
      entry.pending++;
      if (c.dueDate && new Date(c.dueDate) < now) entry.overdue++;
    }
    commitmentsByDate.set(dateKey, entry);
  });

  const calendarDays = getCalendarDays(viewYear, viewMonth);
  const todayStr = now.toISOString().split("T")[0];

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  return (
    <div className="mt-5 space-y-4">
      {/* Calendar */}
      <div className="bg-white rounded-xl border border-[#e5e7eb] p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <CalendarDays className="text-[#00a8a8]" size={20} />
            <h3 className="text-sm font-semibold text-[#1c2c4a]">
              Resumen Semanal — Vista Calendario
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
          {DAY_HEADERS.map(d => (
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
                {/* Commitment indicators */}
                {isCurrentMonth && (() => {
                  const ci = commitmentsByDate.get(dateStr);
                  if (!ci || ci.pending === 0) return null;
                  return (
                    <div className={`flex items-center gap-0.5 mt-0.5 text-[8px] font-semibold rounded px-1 py-0.5 ${
                      ci.overdue > 0 ? "text-[#EF4444] bg-[#EF4444]/10" : "text-[#7C3AED] bg-[#7C3AED]/10"
                    }`}>
                      {ci.overdue > 0 ? <AlertCircle size={8} /> : <CheckCircle2 size={8} />}
                      {ci.pending}
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex items-center gap-4 text-[10px] text-[#6b7280]">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#2E7D32]" /> Enviado</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#F57C00]" /> Borrador</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#e5e7eb]" /> Sin reporte</span>
          <span className="ml-auto">Click en un lunes para abrir el reporte</span>
        </div>
      </div>

      {/* Modal */}
      {selectedWeek && (
        <WeekReportModal
          weekStart={selectedWeek}
          onClose={() => setSelectedWeek(null)}
        />
      )}
    </div>
  );
}

// ─── Week Report Modal ───

function WeekReportModal({ weekStart, onClose }: { weekStart: string; onClose: () => void }) {
  const { toast } = useToast();
  const { data: report, isLoading } = useWeeklyReport(weekStart);
  const { data: weekCommitments = [] } = useCommitments(weekStart);
  const { data: allPending = [] } = useCommitments(); // all pending across weeks
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

  // Team members for assignment
  const { data: teamMembers = [] } = useQuery<Pick<User, "id" | "name" | "codigo" | "email">[]>({
    queryKey: ["/api/auth/team"],
    staleTime: 5 * 60 * 1000,
  });

  // New commitment form
  const [showNewCommitment, setShowNewCommitment] = useState(false);
  const [newDesc, setNewDesc] = useState("");
  const [newResponsible, setNewResponsible] = useState("");
  const [newResponsibleUserId, setNewResponsibleUserId] = useState<number | null>(null);
  const [newDueDate, setNewDueDate] = useState("");

  useEffect(() => {
    if (report && !initialized) {
      setContent(report.content || "");
      setMeetingNotes(report.meetingNotes || "");
      if (report.recipients) setRecipients(report.recipients);
      setInitialized(true);
    }
  }, [report, initialized]);

  // Inherited pending commitments from OTHER weeks
  const inheritedPending = allPending.filter(c => c.weekStart !== weekStart);

  const mondayDate = new Date(weekStart + "T12:00:00");
  const weekLabel = mondayDate.toLocaleDateString("es-MX", {
    day: "numeric", month: "long", year: "numeric",
  });
  const isSent = report?.status === "sent";

  const handleSave = async () => {
    try {
      await saveMutation.mutateAsync({ weekStart, content, meetingNotes });
      toast({ title: "Borrador guardado" });
    } catch {
      toast({ title: "Error al guardar", variant: "destructive" });
    }
  };

  const handleSend = async () => {
    const recipientList = recipients.split(",").map(e => e.trim()).filter(Boolean);
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
      setShowSendConfirm(false);
      toast({ title: "Resumen enviado correctamente" });
    } catch {
      toast({ title: "Error al enviar", variant: "destructive" });
    }
  };

  const handleAddCommitment = async () => {
    if (!newDesc.trim() || !newResponsible.trim()) {
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
      setShowNewCommitment(false);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e7eb]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#00a8a8]/10 flex items-center justify-center">
              <FileText className="text-[#00a8a8]" size={18} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#1c2c4a]">Semana del {weekLabel}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                {isSent ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#2E7D32] bg-[#2E7D32]/10 px-2 py-0.5 rounded-full">
                    <CheckCircle2 size={10} /> Enviado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#F57C00] bg-[#F57C00]/10 px-2 py-0.5 rounded-full">
                    <Clock size={10} /> Borrador
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-[#6b7280] hover:text-[#1c2c4a] p-1">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Section 1: Resumen */}
          <div>
            <label className="text-xs font-semibold text-[#1c2c4a] uppercase tracking-wide flex items-center gap-1.5 mb-2">
              <FileText size={12} className="text-[#00a8a8]" /> Resumen de la Semana
            </label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Logros, avances, pipeline, cierres..."
              className="w-full min-h-[140px] p-3 rounded-lg border border-[#e5e7eb] text-sm text-[#1c2c4a] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#00a8a8]/30 focus:border-[#00a8a8] resize-y"
            />
          </div>

          {/* Section 2: Compromisos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-[#1c2c4a] uppercase tracking-wide flex items-center gap-1.5">
                <Check size={12} className="text-[#7C3AED]" /> Compromisos
              </label>
              <button
                onClick={() => setShowNewCommitment(true)}
                className="flex items-center gap-1 text-[10px] font-medium text-[#00a8a8] hover:text-[#008b8b] transition-colors"
              >
                <Plus size={12} /> Agregar
              </button>
            </div>

            {/* Inherited pending from other weeks */}
            {inheritedPending.length > 0 && (
              <div className="mb-2">
                <div className="text-[10px] font-medium text-[#F57C00] mb-1">Pendientes heredados</div>
                {inheritedPending.map(c => (
                  <div key={c.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-[#FFF7ED] border border-[#F57C00]/20 mb-1 text-sm">
                    <button
                      onClick={() => updateStatus.mutateAsync({ id: c.id, status: "cumplido" })}
                      className="w-5 h-5 rounded border-2 border-[#F57C00] flex items-center justify-center flex-shrink-0 hover:bg-[#F57C00]/10"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-[#1c2c4a]">{c.description}</span>
                      <span className="text-[10px] text-[#6b7280] ml-2">{c.responsible}</span>
                      {c.dueDate && (
                        <span className={`text-[10px] ml-2 ${new Date(c.dueDate) < new Date() ? "text-[#EF4444] font-semibold" : "text-[#6b7280]"}`}>
                          {formatDateShort(c.dueDate)}
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] text-[#F57C00] bg-[#F57C00]/10 px-1.5 py-0.5 rounded font-medium flex-shrink-0">
                      Sem. {formatDateShort(c.weekStart)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* This week's commitments */}
            {weekCommitments.length === 0 && inheritedPending.length === 0 && !showNewCommitment && (
              <p className="text-xs text-[#9ca3af] py-2">Sin compromisos esta semana</p>
            )}
            {weekCommitments.map(c => (
              <div key={c.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-[#f9fafb] mb-1 text-sm group">
                <button
                  onClick={() => updateStatus.mutateAsync({ id: c.id, status: c.status === "cumplido" ? "pendiente" : "cumplido" })}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    c.status === "cumplido"
                      ? "bg-[#2E7D32] border-[#2E7D32] text-white"
                      : "border-[#d1d5db] hover:border-[#00a8a8]"
                  }`}
                >
                  {c.status === "cumplido" && <Check size={12} />}
                </button>
                <div className={`flex-1 min-w-0 ${c.status === "cumplido" ? "line-through text-[#9ca3af]" : "text-[#1c2c4a]"}`}>
                  {c.description}
                  <span className="text-[10px] text-[#6b7280] ml-2">{c.responsible}</span>
                  {c.dueDate && (
                    <span className={`text-[10px] ml-2 ${c.status !== "cumplido" && new Date(c.dueDate) < new Date() ? "text-[#EF4444] font-semibold" : "text-[#6b7280]"}`}>
                      {formatDateShort(c.dueDate)}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => deleteCommitment.mutateAsync(c.id)}
                  className="opacity-0 group-hover:opacity-100 text-[#9ca3af] hover:text-[#EF4444] transition-all p-1"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}

            {/* New commitment inline form */}
            {showNewCommitment && (
              <div className="rounded-lg border border-[#00a8a8]/30 bg-[#00a8a8]/5 p-3 space-y-2 mt-2">
                <input
                  autoFocus
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="Descripcion del compromiso..."
                  className="w-full px-2 py-1.5 rounded border border-[#e5e7eb] text-sm focus:outline-none focus:ring-1 focus:ring-[#00a8a8]"
                />
                {/* Responsable — team member chips */}
                <div>
                  <div className="text-[10px] text-[#6b7280] mb-1">Responsable</div>
                  <div className="flex flex-wrap gap-1.5">
                    {teamMembers.map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setNewResponsible(m.name);
                          setNewResponsibleUserId(m.id);
                        }}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                          newResponsibleUserId === m.id
                            ? "bg-[#00a8a8] text-white"
                            : "bg-[#f3f4f6] text-[#6b7280] hover:bg-[#e5e7eb]"
                        }`}
                      >
                        {m.name.split(" ").slice(0, 2).join(" ")}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-[#6b7280] mb-1">Fecha límite</div>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={e => setNewDueDate(e.target.value)}
                    className="w-full px-2 py-1.5 rounded border border-[#e5e7eb] text-sm focus:outline-none focus:ring-1 focus:ring-[#00a8a8]"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowNewCommitment(false)} className="text-xs text-[#6b7280] hover:text-[#1c2c4a] px-3 py-1.5">
                    Cancelar
                  </button>
                  <button
                    onClick={handleAddCommitment}
                    disabled={createCommitment.isPending}
                    className="text-xs font-medium text-white bg-[#00a8a8] hover:bg-[#008b8b] px-3 py-1.5 rounded-lg disabled:opacity-50"
                  >
                    {createCommitment.isPending ? "Guardando..." : "Agregar"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Notas de Junta */}
          <div>
            <label className="text-xs font-semibold text-[#1c2c4a] uppercase tracking-wide flex items-center gap-1.5 mb-2">
              <CalendarDays size={12} className="text-[#0D47A1]" /> Notas de Junta
            </label>
            <textarea
              value={meetingNotes}
              onChange={e => setMeetingNotes(e.target.value)}
              placeholder="Decisiones, acuerdos, feedback de direccion..."
              className="w-full min-h-[100px] p-3 rounded-lg border border-[#e5e7eb] text-sm text-[#1c2c4a] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#0D47A1]/20 focus:border-[#0D47A1] resize-y"
            />
          </div>

          {/* Recipients */}
          <div>
            <label className="text-xs font-medium text-[#6b7280] mb-1 block">
              Destinatarios (emails separados por coma)
            </label>
            <input
              type="text"
              value={recipients}
              onChange={e => setRecipients(e.target.value)}
              placeholder="luz@empresa.com, roger@empresa.com"
              className="w-full px-3 py-2 rounded-lg border border-[#e5e7eb] text-sm text-[#1c2c4a] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#00a8a8]/30 focus:border-[#00a8a8]"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-[#e5e7eb]">
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white border border-[#e5e7eb] text-[#1c2c4a] hover:bg-[#f3f4f6] transition-colors disabled:opacity-50"
          >
            <Save size={15} />
            {saveMutation.isPending ? "Guardando..." : "Guardar borrador"}
          </button>
          <button
            onClick={() => setShowSendConfirm(true)}
            disabled={sendMutation.isPending || !content.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#00a8a8] text-white hover:bg-[#008f8f] transition-colors disabled:opacity-50"
          >
            <Send size={15} />
            {sendMutation.isPending ? "Enviando..." : "Enviar a dirección"}
          </button>
        </div>

        {/* Send confirmation */}
        {showSendConfirm && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-xl">
            <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl m-4">
              <h4 className="text-base font-semibold text-[#1c2c4a] mb-2">Confirmar envío</h4>
              <p className="text-sm text-[#6b7280] mb-3">Se enviará a:</p>
              <div className="space-y-1 mb-4">
                {recipients.split(",").map(e => e.trim()).filter(Boolean).map(email => (
                  <div key={email} className="text-sm text-[#1c2c4a] bg-[#f3f4f6] px-3 py-1.5 rounded-lg">{email}</div>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowSendConfirm(false)} className="px-4 py-2 text-sm text-[#6b7280] hover:bg-[#f3f4f6] rounded-lg">Cancelar</button>
                <button onClick={handleSend} disabled={sendMutation.isPending} className="px-4 py-2 text-sm font-medium bg-[#00a8a8] text-white rounded-lg hover:bg-[#008f8f] disabled:opacity-50">
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
