import { useState, useEffect } from "react";
import { FileText, Save, Send, Clock, CheckCircle2, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useWeeklyReport, useWeeklyReports, useSaveWeeklyReport, useSendWeeklyReport } from "../api";

function getMonday(d: Date): string {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return date.toISOString().split("T")[0];
}

function addWeeks(dateStr: string, weeks: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + weeks * 7);
  return d.toISOString().split("T")[0];
}

function formatWeekLabel(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleString("es-MX", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatShortWeek(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
  });
}

export function ResumenSemanal() {
  const { toast } = useToast();
  const currentMonday = getMonday(new Date());
  const [selectedWeek, setSelectedWeek] = useState(currentMonday);

  const { data: report, isLoading } = useWeeklyReport(selectedWeek);
  const { data: allReports = [] } = useWeeklyReports();
  const saveMutation = useSaveWeeklyReport();
  const sendMutation = useSendWeeklyReport();

  const [content, setContent] = useState("");
  const [recipients, setRecipients] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Sync content when report loads or week changes
  useEffect(() => {
    if (report) {
      setContent(report.content || "");
      if (report.recipients) setRecipients(report.recipients);
      if (report.updatedAt) setLastSaved(new Date(report.updatedAt));
    } else {
      setContent("");
      setLastSaved(null);
    }
  }, [report, selectedWeek]);

  const handleSave = async () => {
    try {
      await saveMutation.mutateAsync({ weekStart: selectedWeek, content });
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
      await sendMutation.mutateAsync({ weekStart: selectedWeek, content, recipients: recipientList });
      setShowConfirm(false);
      toast({ title: "Resumen enviado correctamente" });
    } catch {
      toast({ title: "Error al enviar", variant: "destructive" });
    }
  };

  const isSent = report?.status === "sent";
  const isCurrentWeek = selectedWeek === currentMonday;
  const isFutureWeek = selectedWeek > currentMonday;

  // Past reports excluding the currently selected week
  const pastReports = allReports.filter((r: any) => r.weekStart !== selectedWeek);

  if (isLoading) {
    return (
      <div className="mt-5 flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#00a8a8]" />
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-4">
      {/* Editor card */}
      <div className="bg-white rounded-xl border border-[#e5e7eb] p-5">
        {/* Header with week navigation */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00a8a8]/10 flex items-center justify-center">
              <FileText className="text-[#00a8a8]" size={20} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#1c2c4a]">
                Resumen Semanal
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <button
                  onClick={() => setSelectedWeek(addWeeks(selectedWeek, -1))}
                  className="p-0.5 rounded hover:bg-[#f3f4f6] transition-colors"
                >
                  <ChevronLeft size={14} className="text-[#6b7280]" />
                </button>
                <p className="text-xs text-[#6b7280]">
                  Semana del {formatWeekLabel(selectedWeek)}
                </p>
                <button
                  onClick={() => setSelectedWeek(addWeeks(selectedWeek, 1))}
                  disabled={isFutureWeek}
                  className="p-0.5 rounded hover:bg-[#f3f4f6] transition-colors disabled:opacity-30"
                >
                  <ChevronRight size={14} className="text-[#6b7280]" />
                </button>
                {!isCurrentWeek && (
                  <button
                    onClick={() => setSelectedWeek(currentMonday)}
                    className="text-xs text-[#00a8a8] hover:underline ml-1"
                  >
                    Ir a semana actual
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Status badge */}
          {isSent ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#2E7D32] bg-[#2E7D32]/10 px-3 py-1.5 rounded-full">
              <CheckCircle2 size={14} />
              Enviado {formatDateTime(report?.sentAt)}
            </span>
          ) : report ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#F57C00] bg-[#F57C00]/10 px-3 py-1.5 rounded-full">
              <Clock size={14} />
              Borrador
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#9ca3af] bg-[#f3f4f6] px-3 py-1.5 rounded-full">
              <FileText size={14} />
              Sin reporte
            </span>
          )}
        </div>

        {/* Content textarea */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Escribe aquí tu resumen de gestión comercial de la semana..."
          className="w-full min-h-[300px] p-4 rounded-xl border border-[#e5e7eb] text-sm text-[#1c2c4a] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#00a8a8]/30 focus:border-[#00a8a8] resize-y"
        />

        {/* Recipients */}
        <div className="mt-3">
          <label className="text-xs font-medium text-[#6b7280] mb-1 block">
            Destinatarios (emails separados por coma)
          </label>
          <input
            type="text"
            value={recipients}
            onChange={(e) => setRecipients(e.target.value)}
            placeholder="luz@empresa.com, roger@empresa.com, rafa@empresa.com"
            className="w-full px-3 py-2 rounded-lg border border-[#e5e7eb] text-sm text-[#1c2c4a] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#00a8a8]/30 focus:border-[#00a8a8]"
          />
        </div>

        {/* Action buttons + save feedback */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white border border-[#e5e7eb] text-[#1c2c4a] hover:bg-[#f3f4f6] transition-colors disabled:opacity-50"
            >
              <Save size={15} />
              {saveMutation.isPending ? "Guardando..." : "Guardar borrador"}
            </button>

            <button
              onClick={() => setShowConfirm(true)}
              disabled={sendMutation.isPending || !content.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#00a8a8] text-white hover:bg-[#008f8f] transition-colors disabled:opacity-50"
            >
              <Send size={15} />
              {sendMutation.isPending ? "Enviando..." : "Enviar a dirección"}
            </button>
          </div>

          {/* Last saved feedback */}
          {lastSaved && (
            <span className="text-xs text-[#9ca3af]">
              Último guardado: {formatDateTime(lastSaved.toISOString())}
            </span>
          )}
        </div>
      </div>

      {/* Past reports history */}
      {pastReports.length > 0 && (
        <div className="bg-white rounded-xl border border-[#e5e7eb] p-5">
          <h4 className="text-sm font-semibold text-[#1c2c4a] mb-3 flex items-center gap-2">
            <Calendar size={16} className="text-[#6b7280]" />
            Reportes anteriores
          </h4>
          <div className="space-y-2">
            {pastReports.map((r: any) => (
              <button
                key={r.id}
                onClick={() => setSelectedWeek(r.weekStart)}
                className="w-full text-left flex items-center justify-between p-3 rounded-lg border border-[#e5e7eb] hover:bg-[#f9fafb] transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[#1c2c4a]">
                      Semana del {formatShortWeek(r.weekStart)}
                    </span>
                    {r.status === "sent" ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#2E7D32] bg-[#2E7D32]/10 px-2 py-0.5 rounded-full">
                        <CheckCircle2 size={10} />
                        Enviado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#F57C00] bg-[#F57C00]/10 px-2 py-0.5 rounded-full">
                        <Clock size={10} />
                        Borrador
                      </span>
                    )}
                  </div>
                  {r.content && (
                    <p className="text-xs text-[#9ca3af] mt-1 truncate max-w-md">
                      {r.content.substring(0, 120)}{r.content.length > 120 ? "..." : ""}
                    </p>
                  )}
                </div>
                <ChevronRight size={16} className="text-[#d1d5db] group-hover:text-[#6b7280] shrink-0 ml-2" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Send confirmation dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowConfirm(false)}>
          <div
            className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-base font-semibold text-[#1c2c4a] mb-2">
              Confirmar envío
            </h4>
            <p className="text-sm text-[#6b7280] mb-4">
              Se enviará el resumen semanal a:
            </p>
            <div className="space-y-1 mb-4">
              {recipients
                .split(",")
                .map((e) => e.trim())
                .filter(Boolean)
                .map((email) => (
                  <div
                    key={email}
                    className="text-sm text-[#1c2c4a] bg-[#f3f4f6] px-3 py-1.5 rounded-lg"
                  >
                    {email}
                  </div>
                ))}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-[#6b7280] hover:bg-[#f3f4f6] rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSend}
                disabled={sendMutation.isPending}
                className="px-4 py-2 text-sm font-medium bg-[#00a8a8] text-white rounded-lg hover:bg-[#008f8f] transition-colors disabled:opacity-50"
              >
                {sendMutation.isPending ? "Enviando..." : "Confirmar envío"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
