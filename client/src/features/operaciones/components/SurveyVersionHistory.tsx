import { CheckCircle2, Clock, RotateCcw, XCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/auth";
import { useAllUsers, useReopenSurvey, useSurveyVersions, type SurveyVersionRow } from "../api";

interface SurveyVersionHistoryProps {
  surveyId: number;
  // Estado actual del levantamiento — gobierna si se puede reabrir.
  surveyStatus: string;
}

const STATUS_META: Record<
  SurveyVersionRow["status"],
  { label: string; icon: typeof CheckCircle2; className: string }
> = {
  pendiente_aprobacion: { label: "Pendiente de aprobación", icon: Clock, className: "text-yellow-600" },
  aprobado: { label: "Aprobado", icon: CheckCircle2, className: "text-green-600" },
  rechazado: { label: "Rechazado", icon: XCircle, className: "text-red-600" },
};

function formatDate(value: string | null): string {
  if (!value) return "";
  return new Date(value).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SurveyVersionHistory({ surveyId, surveyStatus }: SurveyVersionHistoryProps) {
  const { data: versions = [], isLoading } = useSurveyVersions(surveyId);
  const { data: users = [] } = useAllUsers();
  const { hasPermission } = useAuth();
  const reopen = useReopenSurvey();
  const { toast } = useToast();
  const [confirming, setConfirming] = useState(false);

  const nameOf = (id: number | null): string => {
    if (!id) return "—";
    return users.find((u) => u.id === id)?.name ?? `Usuario ${id}`;
  };

  // Reabrir solo aplica a un levantamiento aprobado y solo para quien lo aprobó
  // (director, permiso surveys.reopen). Decisión de Daniel: él aprobó, él reabre.
  const canReopen = surveyStatus === "pendiente_revision" && hasPermission("surveys.reopen");

  const handleReopen = async () => {
    try {
      await reopen.mutateAsync(surveyId);
      toast({ description: "Levantamiento reabierto. Quedó editable; el próximo envío crea una nueva versión." });
      setConfirming(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "No se pudo reabrir";
      toast({ description: message, variant: "destructive" });
    }
  };

  // Sin versiones y sin acción de reabrir → no mostramos nada (levantamientos
  // previos al feature no tienen historial).
  if (!isLoading && versions.length === 0 && !canReopen) return null;

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Historial de versiones</h2>
        {canReopen &&
          (confirming ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">¿Reabrir y crear nueva versión?</span>
              <Button size="sm" variant="outline" onClick={() => setConfirming(false)} disabled={reopen.isPending}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleReopen} disabled={reopen.isPending}>
                {reopen.isPending ? "Reabriendo..." : "Confirmar"}
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setConfirming(true)}>
              <RotateCcw className="h-3.5 w-3.5" />
              Reabrir
            </Button>
          ))}
      </div>

      {versions.length === 0 ? (
        <p className="text-xs text-muted-foreground">Aún no hay versiones registradas.</p>
      ) : (
        <ol className="space-y-2">
          {versions.map((v) => {
            const meta = STATUS_META[v.status];
            const Icon = meta.icon;
            return (
              <li key={v.id} className="flex items-start gap-3 rounded-md border p-2.5">
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${meta.className}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">v{v.version}</span>
                    <span className={`text-xs font-medium ${meta.className}`}>{meta.label}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    Enviada por {nameOf(v.submittedById)}
                    {v.submittedAt && ` · ${formatDate(v.submittedAt)}`}
                  </div>
                  {v.reviewedById && (
                    <div className="text-xs text-muted-foreground">
                      {v.status === "aprobado" ? "Aprobada" : "Devuelta"} por {nameOf(v.reviewedById)}
                      {v.reviewedAt && ` · ${formatDate(v.reviewedAt)}`}
                    </div>
                  )}
                  {v.status === "rechazado" && v.rejectionReason && (
                    <div className="mt-1 rounded bg-red-50 px-2 py-1 text-xs text-red-700">
                      Motivo: {v.rejectionReason}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
