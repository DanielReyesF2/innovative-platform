import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useCotizacion, useResolveVobo, useSubmitVobo, useTakeCotizacion, useUpdateCotizacion } from "../api";

export function CotizacionDetail({ id, onClose }: { id: number; onClose: () => void }) {
  const { data: cot } = useCotizacion(id);
  const { hasPermission } = useAuth();
  const take = useTakeCotizacion();
  const update = useUpdateCotizacion();
  const submitVobo = useSubmitVobo();
  const resolveVobo = useResolveVobo();
  const [form, setForm] = useState<{ proposedPrice?: string; estimatedCost?: string; estimatedMargin?: string; notes?: string }>({});
  const [rejectReason, setRejectReason] = useState("");

  if (!cot) return null;

  const canEdit = hasPermission("cotizaciones.edit");
  const canVobo = hasPermission("cotizaciones.vobo");
  const snapshot = cot.snapshot ?? null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[88vh] w-full max-w-5xl overflow-auto rounded-lg bg-background p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">{cot.prospectName || cot.title}</h2>
            <p className="text-sm text-muted-foreground">Estado: {cot.status}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>

        {cot.needsReview && (
          <div className="mb-4 rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800">
            El levantamiento se reabrió y volvió a aprobarse. Revisa los cambios antes de seguir cotizando.
          </div>
        )}
        {cot.rejectionReason && cot.status === "en_cotizacion" && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            VoBo rechazado: {cot.rejectionReason}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded-lg border p-4">
            <h3 className="mb-3 text-sm font-semibold">Levantamiento</h3>
            {snapshot ? (
              <pre className="max-h-[50vh] overflow-auto whitespace-pre-wrap break-words text-xs text-muted-foreground">
                {JSON.stringify(snapshot, null, 2)}
              </pre>
            ) : (
              <p className="text-sm text-muted-foreground">Sin levantamiento vinculado.</p>
            )}
          </section>

          <section className="rounded-lg border p-4">
            <h3 className="mb-3 text-sm font-semibold">Modelo económico</h3>
            <div className="space-y-3">
              <LabeledInput label="Precio propuesto" defaultValue={cot.proposedPrice ?? ""} disabled={!canEdit}
                onChange={(v) => setForm((f) => ({ ...f, proposedPrice: v }))} />
              <LabeledInput label="Costo estimado" defaultValue={cot.estimatedCost ?? ""} disabled={!canEdit}
                onChange={(v) => setForm((f) => ({ ...f, estimatedCost: v }))} />
              <LabeledInput label="Margen estimado (%)" defaultValue={cot.estimatedMargin ?? ""} disabled={!canEdit}
                onChange={(v) => setForm((f) => ({ ...f, estimatedMargin: v }))} />
              <div>
                <label htmlFor="cot-notes" className="text-xs text-muted-foreground">Notas</label>
                <textarea
                  id="cot-notes"
                  className="w-full rounded-md border p-2 text-sm"
                  defaultValue={cot.notes ?? ""}
                  disabled={!canEdit}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>
          </section>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          {cot.status === "recibido" && canEdit && (
            <Button onClick={() => take.mutate(id)}>Tomar</Button>
          )}
          {cot.status === "en_cotizacion" && canEdit && (
            <>
              <Button variant="outline" onClick={() => update.mutate({ id, data: form })}>Guardar</Button>
              <Button onClick={() => { update.mutate({ id, data: form }); submitVobo.mutate(id); }}>
                Enviar a VoBo
              </Button>
            </>
          )}
          {cot.status === "en_vobo" && canVobo && (
            <>
              <Button onClick={() => resolveVobo.mutate({ id, decision: "aprobar" })}>Aprobar VoBo</Button>
              <input
                className="rounded-md border p-2 text-sm"
                placeholder="Motivo de rechazo"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
              <Button variant="destructive"
                onClick={() => resolveVobo.mutate({ id, decision: "rechazar", rejectionReason: rejectReason })}>
                Rechazar
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function LabeledInput({ label, defaultValue, disabled, onChange }: {
  label: string; defaultValue: string | number; disabled?: boolean; onChange: (v: string) => void;
}) {
  const inputId = `cot-field-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div>
      <label htmlFor={inputId} className="text-xs text-muted-foreground">{label}</label>
      <input
        id={inputId}
        className="w-full rounded-md border p-2 text-sm"
        defaultValue={String(defaultValue ?? "")}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
