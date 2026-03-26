import { useState, useEffect } from "react";
import { FileText, Save, Send, Clock, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useWeeklyReport, useSaveWeeklyReport, useSendWeeklyReport } from "../api";

function getMonday(d: Date): string {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return date.toISOString().split("T")[0];
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleString("es-MX", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ResumenSemanal() {
  const { toast } = useToast();
  const weekStart = getMonday(new Date());
  const { data: report, isLoading } = useWeeklyReport(weekStart);
  const saveMutation = useSaveWeeklyReport();
  const sendMutation = useSendWeeklyReport();

  const [content, setContent] = useState("");
  const [recipients, setRecipients] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  // Sync content when report loads
  useEffect(() => {
    if (report) {
      setContent(report.content || "");
      if (report.recipients) setRecipients(report.recipients);
    }
  }, [report]);

  const handleSave = async () => {
    try {
      await saveMutation.mutateAsync({ weekStart, content });
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
      await sendMutation.mutateAsync({ weekStart, content, recipients: recipientList });
      setShowConfirm(false);
      toast({ title: "Resumen enviado correctamente" });
    } catch {
      toast({ title: "Error al enviar", variant: "destructive" });
    }
  };

  const isSent = report?.status === "sent";
  const mondayDate = new Date(weekStart + "T12:00:00");
  const weekLabel = mondayDate.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  if (isLoading) {
    return (
      <div className="mt-5 flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#00a8a8]" />
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl border border-[#e5e7eb] p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00a8a8]/10 flex items-center justify-center">
              <FileText className="text-[#00a8a8]" size={20} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#1c2c4a]">
                Resumen Semanal
              </h3>
              <p className="text-xs text-[#6b7280]">
                Semana del {weekLabel}
              </p>
            </div>
          </div>

          {/* Status badge */}
          {isSent ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#2E7D32] bg-[#2E7D32]/10 px-3 py-1.5 rounded-full">
              <CheckCircle2 size={14} />
              Enviado {formatDate(report?.sentAt)}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#F57C00] bg-[#F57C00]/10 px-3 py-1.5 rounded-full">
              <Clock size={14} />
              Borrador
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

        {/* Action buttons */}
        <div className="flex items-center gap-3 mt-4">
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
      </div>

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
