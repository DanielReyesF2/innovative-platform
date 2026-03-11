import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChevronDown,
  ChevronRight,
  Send,
  Plus,
  Trash2,
  Building2,
  Recycle,
  Truck,
  Warehouse,
  Target,
  CheckCircle,
  Clock,
  StickyNote,
  Users,
  FileText,
  FileCheck,
  Pencil,
  Save,
  X,
} from "lucide-react";
import { useUpdateProspect, useSendToOperaciones } from "../api";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/components/ui/use-toast";
import { ProspectTimeline } from "./ProspectTimeline";
import { ProspectNotes } from "./ProspectNotes";
import { ProspectMeetings } from "./ProspectMeetings";
import { ProspectDocuments } from "./ProspectDocuments";
import { ProspectProposals } from "./ProspectProposals";

const STAGE_LABELS: Record<string, string> = {
  contacto_inicial: "Contacto Inicial",
  presentacion: "Presentacion",
  levantamiento: "Levantamiento",
  propuesta: "Propuesta",
  negociacion: "Negociacion",
  cierre_ganado: "Socio Ambiental",
  cierre_perdido: "Cierre Perdido",
  // Legacy
  lead: "Contacto Inicial",
  cierre: "Socio Ambiental",
  rechazada: "Cierre Perdido",
};

const STAGE_COLORS: Record<string, string> = {
  contacto_inicial: "bg-blue-100 text-blue-800",
  presentacion: "bg-cyan-100 text-cyan-800",
  levantamiento: "bg-yellow-100 text-yellow-800",
  propuesta: "bg-purple-100 text-purple-800",
  negociacion: "bg-orange-100 text-orange-800",
  cierre_ganado: "bg-green-100 text-green-800",
  cierre_perdido: "bg-red-100 text-red-800",
  // Legacy
  lead: "bg-blue-100 text-blue-800",
  cierre: "bg-green-100 text-green-800",
  rechazada: "bg-red-100 text-red-800",
};

// Ordered pipeline stages for progression bar
const PIPELINE_STAGES = [
  "contacto_inicial",
  "presentacion",
  "levantamiento",
  "propuesta",
  "negociacion",
  "cierre_ganado",
] as const;

function normalizeStage(stage: string): string {
  if (stage === "lead") return "contacto_inicial";
  if (stage === "cierre") return "cierre_ganado";
  if (stage === "rechazada") return "cierre_perdido";
  return stage;
}

// Stage at which each tab becomes available
const TAB_UNLOCK_STAGE: Record<string, string> = {
  info: "contacto_inicial",
  timeline: "contacto_inicial",
  notas: "contacto_inicial",
  reuniones: "presentacion",
  levantamiento: "levantamiento",
  documentos: "levantamiento",
  propuestas: "propuesta",
};


interface ProspectDetailProps {
  prospect: any;
  onClose: () => void;
}

type TabType = "info" | "levantamiento" | "timeline" | "notas" | "reuniones" | "documentos" | "propuestas";

export function ProspectDetail({ prospect, onClose }: ProspectDetailProps) {
  const [activeTab, setActiveTab] = useState<TabType>("info");
  const [levData, setLevData] = useState<any>(prospect.levantamientoData || {});
  const [showConfirmSend, setShowConfirmSend] = useState(false);
  const [showAdvanceStage, setShowAdvanceStage] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const updateProspect = useUpdateProspect();
  const sendToOps = useSendToOperaciones();
  const { toast } = useToast();

  const currentStage = normalizeStage(prospect.stage);
  const currentStageIndex = PIPELINE_STAGES.indexOf(currentStage as any);
  const isTerminal = ["cierre_ganado", "cierre_perdido", "cierre", "rechazada"].includes(prospect.stage);

  // Whether a tab belongs to a future stage (used for visual styling only)
  const isTabFutureStage = (tabId: string): boolean => {
    if (isTerminal) return false;
    const unlockStage = TAB_UNLOCK_STAGE[tabId];
    if (!unlockStage) return false;
    const unlockIndex = PIPELINE_STAGES.indexOf(unlockStage as any);
    const currentIdx = PIPELINE_STAGES.indexOf(currentStage as any);
    if (currentIdx < 0) return false;
    return currentIdx < unlockIndex;
  };

  const handleAdvanceStage = async () => {
    if (currentStageIndex < 0 || currentStageIndex >= PIPELINE_STAGES.length - 1) return;
    const nextStage = PIPELINE_STAGES[currentStageIndex + 1];
    try {
      await updateProspect.mutateAsync({ id: prospect.id, stage: nextStage });
      toast({ title: `Avanzado a ${STAGE_LABELS[nextStage]}` });
      setShowAdvanceStage(false);
      onClose();
    } catch (err: any) {
      const msg = err?.message?.includes(":")
        ? err.message.split(":").slice(1).join(":")
        : "Error al avanzar etapa";
      toast({ title: msg, variant: "destructive" });
    }
  };

  const saveLevantamientoData = useCallback(
    async (data: any) => {
      setIsSaving(true);
      try {
        await updateProspect.mutateAsync({
          id: prospect.id,
          levantamientoData: data,
        });
      } catch {
        toast({ title: "Error al guardar", variant: "destructive" });
      } finally {
        setIsSaving(false);
      }
    },
    [prospect.id, updateProspect, toast]
  );

  const handleSave = () => {
    saveLevantamientoData(levData);
    toast({ title: "Datos guardados" });
  };

  const handleSendToOps = async () => {
    try {
      await sendToOps.mutateAsync(prospect.id);
      toast({ title: "Enviado a Operaciones" });
      setShowConfirmSend(false);
      onClose();
    } catch (err: any) {
      const msg = err?.message || "Error al enviar";
      toast({ title: msg, variant: "destructive" });
      setShowConfirmSend(false);
    }
  };

  const handleDeleteProspect = async () => {
    setIsDeleting(true);
    try {
      await apiRequest("DELETE", `/api/comercial/prospects/${prospect.id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/comercial/prospects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/comercial/pipeline"] });
      toast({ title: "Prospecto eliminado" });
      onClose();
    } catch {
      toast({ title: "Error al eliminar prospecto", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const canSend = ["lead", "contacto_inicial", "presentacion"].includes(prospect.stage) && !prospect.surveyId;
  const wasSent = !!prospect.sentToOpsAt;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-background shadow-lg">
        {/* Header */}
        <div className="border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold">{prospect.name}</h2>
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STAGE_COLORS[prospect.stage] || ""}`}
              >
                {STAGE_LABELS[prospect.stage] || prospect.stage}
              </span>
              {wasSent && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                  <CheckCircle className="h-3 w-3" />
                  Enviado a Ops {new Date(prospect.sentToOpsAt).toLocaleDateString("es-MX")}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setShowConfirmDelete(true)}
                title="Eliminar prospecto"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                ✕
              </Button>
            </div>
          </div>

          {/* Stage progression bar */}
          {!isTerminal && (
            <div className="mt-3 flex items-center gap-1">
              {PIPELINE_STAGES.map((stage, idx) => {
                const isCompleted = idx < currentStageIndex;
                const isCurrent = idx === currentStageIndex;
                return (
                  <div key={stage} className="flex flex-1 items-center">
                    <div
                      className={`flex-1 rounded-full h-2 transition-colors ${
                        isCompleted
                          ? "bg-primary"
                          : isCurrent
                          ? "bg-primary/60"
                          : "bg-muted"
                      }`}
                      title={STAGE_LABELS[stage]}
                    />
                    {idx < PIPELINE_STAGES.length - 1 && <div className="w-1" />}
                  </div>
                );
              })}
            </div>
          )}
          {!isTerminal && (
            <div className="mt-1 flex items-center justify-between">
              <div className="flex gap-3 text-[10px] text-muted-foreground">
                {PIPELINE_STAGES.map((stage, idx) => (
                  <span
                    key={stage}
                    className={`flex-1 text-center ${
                      idx <= currentStageIndex ? "font-medium text-foreground" : ""
                    }`}
                  >
                    {STAGE_LABELS[stage]}
                  </span>
                ))}
              </div>
            </div>
          )}
          {!isTerminal && currentStageIndex >= 0 && currentStageIndex < PIPELINE_STAGES.length - 1 && (
            <div className="mt-2 flex justify-end">
              <Button
                size="sm"
                onClick={() => setShowAdvanceStage(true)}
              >
                <ChevronRight className="mr-1 h-3 w-3" />
                Avanzar a {STAGE_LABELS[PIPELINE_STAGES[currentStageIndex + 1]]}
              </Button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b px-6 overflow-x-auto">
          {[
            { id: "info", label: "Info", icon: Building2 },
            { id: "timeline", label: "Timeline", icon: Clock },
            { id: "notas", label: "Notas", icon: StickyNote },
            { id: "reuniones", label: "Reuniones", icon: Users },
            { id: "levantamiento", label: "Levantamiento", icon: Target },
            { id: "documentos", label: "Docs", icon: FileText },
            { id: "propuestas", label: "Propuestas", icon: FileCheck },
          ].map((tab) => {
            const isFuture = isTabFutureStage(tab.id);
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                title={
                  isFuture
                    ? `Se activa en ${STAGE_LABELS[TAB_UNLOCK_STAGE[tab.id]] || tab.id}`
                    : undefined
                }
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-b-2 border-primary text-primary"
                    : isFuture
                    ? "text-muted-foreground/50 hover:text-muted-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === "info" && (
            <InfoTab
              prospect={prospect}
              onSave={async (data: any) => {
                try {
                  await updateProspect.mutateAsync({ id: prospect.id, ...data });
                  toast({ title: "Datos actualizados" });
                } catch {
                  toast({ title: "Error al guardar", variant: "destructive" });
                }
              }}
              isSaving={updateProspect.isPending}
            />
          )}
          {activeTab === "timeline" && <ProspectTimeline prospectId={prospect.id} />}
          {activeTab === "notas" && <ProspectNotes prospectId={prospect.id} />}
          {activeTab === "reuniones" && <ProspectMeetings prospectId={prospect.id} />}
          {activeTab === "documentos" && <ProspectDocuments prospectId={prospect.id} />}
          {activeTab === "propuestas" && <ProspectProposals prospectId={prospect.id} />}
          {activeTab === "levantamiento" && (
            <LevantamientoTab data={levData} onChange={setLevData} />
          )}
        </div>

        {/* Footer */}
        {activeTab === "levantamiento" && (
          <div className="flex items-center justify-between border-t px-6 py-3">
            <div className="text-xs text-muted-foreground">
              {isSaving ? "Guardando..." : ""}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSave} disabled={isSaving}>
                Guardar
              </Button>
              {canSend && (
                <Button onClick={() => setShowConfirmSend(true)} disabled={sendToOps.isPending}>
                  <Send className="mr-2 h-4 w-4" />
                  Enviar a Operaciones
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Confirm send to ops dialog */}
      {showConfirmSend && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
            <h3 className="text-lg font-bold">Confirmar envio</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Se creara una solicitud de levantamiento en Operaciones. El prospecto pasara a etapa "Levantamiento".
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowConfirmSend(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSendToOps} disabled={sendToOps.isPending}>
                {sendToOps.isPending ? "Enviando..." : "Confirmar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete dialog */}
      {showConfirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
            <h3 className="text-lg font-bold">Eliminar prospecto</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Se eliminara permanentemente <strong>{prospect.name}</strong> y todos sus datos asociados. Esta accion no se puede deshacer.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowConfirmDelete(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleDeleteProspect} disabled={isDeleting}>
                {isDeleting ? "Eliminando..." : "Eliminar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm advance stage dialog */}
      {showAdvanceStage && currentStageIndex >= 0 && currentStageIndex < PIPELINE_STAGES.length - 1 && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
            <h3 className="text-lg font-bold">Avanzar etapa</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              El prospecto pasara de{" "}
              <strong>{STAGE_LABELS[PIPELINE_STAGES[currentStageIndex]]}</strong> a{" "}
              <strong>{STAGE_LABELS[PIPELINE_STAGES[currentStageIndex + 1]]}</strong>.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAdvanceStage(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAdvanceStage} disabled={updateProspect.isPending}>
                {updateProspect.isPending ? "Avanzando..." : "Confirmar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoTab({
  prospect,
  onSave,
  isSaving,
}: {
  prospect: any;
  onSave: (data: any) => Promise<void>;
  isSaving: boolean;
}) {
  const isLead = prospect.stage === "lead";
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: prospect.name || "",
    location: prospect.location || "",
    contactName: prospect.contactName || "",
    contactRole: prospect.contactRole || "",
    contactPhone: prospect.contactPhone || "",
    contactEmail: prospect.contactEmail || "",
    industry: prospect.industry || "",
    potential: prospect.potential || "",
    probability: prospect.probability || 0,
    estimatedValue: prospect.estimatedValue || "",
    estimatedVolume: prospect.estimatedVolume || "",
    estimatedCloseTime: prospect.estimatedCloseTime || "",
    priority: prospect.priority || "",
    nextStep: prospect.nextStep || "",
    reason: prospect.reason || "",
    risk: prospect.risk || "",
    opportunity: prospect.opportunity || "",
  });

  const set = (key: string, val: any) => setForm({ ...form, [key]: val });

  const handleSave = async () => {
    await onSave(form);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Editar informacion</h3>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
              <X className="mr-1 h-3 w-3" />
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              <Save className="mr-1 h-3 w-3" />
              {isSaving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Empresa" value={form.name} onChange={(v) => set("name", v)} />
          <Field label="Ubicacion" value={form.location} onChange={(v) => set("location", v)} />
        </div>
        <div className="rounded-lg border p-3">
          <h3 className="mb-2 text-sm font-semibold">Contacto</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nombre" value={form.contactName} onChange={(v) => set("contactName", v)} />
            {!isLead && <Field label="Rol" value={form.contactRole} onChange={(v) => set("contactRole", v)} />}
            <Field label="Telefono" value={form.contactPhone} onChange={(v) => set("contactPhone", v)} />
            {!isLead && <Field label="Email" value={form.contactEmail} onChange={(v) => set("contactEmail", v)} />}
          </div>
        </div>
        {!isLead && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Industria" value={form.industry} onChange={(v) => set("industry", v)} />
            <div>
              <Label className="text-xs">Potencial</Label>
              <select
                value={form.potential}
                onChange={(e) => set("potential", e.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Seleccionar</option>
                <option value="Bajo">Bajo</option>
                <option value="Medio">Medio</option>
                <option value="Alto">Alto</option>
                <option value="Muy Alto">Muy Alto</option>
              </select>
            </div>
            <Field label="Probabilidad %" value={String(form.probability)} onChange={(v) => set("probability", Number(v))} type="number" />
            <Field label="Valor Estimado" value={form.estimatedValue} onChange={(v) => set("estimatedValue", v)} type="number" />
            <Field label="Volumen Estimado" value={form.estimatedVolume} onChange={(v) => set("estimatedVolume", v)} />
            <Field label="Tiempo Cierre" value={form.estimatedCloseTime} onChange={(v) => set("estimatedCloseTime", v)} />
            <div>
              <Label className="text-xs">Prioridad</Label>
              <select
                value={form.priority}
                onChange={(e) => set("priority", e.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Seleccionar</option>
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
                <option value="muy_alta">Muy Alta</option>
              </select>
            </div>
            <Field label="Siguiente paso" value={form.nextStep} onChange={(v) => set("nextStep", v)} />
            <Field label="Razon de interes" value={form.reason} onChange={(v) => set("reason", v)} />
            <Field label="Riesgo" value={form.risk} onChange={(v) => set("risk", v)} />
            <Field label="Oportunidad" value={form.opportunity} onChange={(v) => set("opportunity", v)} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          <Pencil className="mr-1 h-3 w-3" />
          Editar
        </Button>
      </div>
      {/* Always shown: basic info */}
      <div className="grid gap-4 sm:grid-cols-2">
        <InfoRow label="Empresa" value={prospect.name} />
        <InfoRow label="Ubicacion" value={prospect.location} />
        {prospect.source && <InfoRow label="Fuente" value={prospect.source} />}
      </div>

      {/* Contact info — always shown */}
      {prospect.contactName && (
        <div className="rounded-lg border p-3">
          <h3 className="mb-2 text-sm font-semibold">Contacto</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            <InfoRow label="Nombre" value={prospect.contactName} />
            {!isLead && <InfoRow label="Rol" value={prospect.contactRole} />}
            <InfoRow label="Telefono" value={prospect.contactPhone} />
            {!isLead && <InfoRow label="Email" value={prospect.contactEmail} />}
          </div>
        </div>
      )}

      {/* Commercial info — only for prospecto+ */}
      {!isLead && (
        <div className="grid gap-4 sm:grid-cols-2">
          <InfoRow label="Industria" value={prospect.industry} />
          <InfoRow label="Potencial" value={prospect.potential} />
          <InfoRow label="Probabilidad" value={`${prospect.probability}%`} />
          <InfoRow
            label="Valor Estimado"
            value={prospect.estimatedValue ? `$${Number(prospect.estimatedValue).toLocaleString("es-MX")}` : undefined}
          />
          <InfoRow label="Volumen Estimado" value={prospect.estimatedVolume} />
          <InfoRow label="Tiempo Cierre" value={prospect.estimatedCloseTime} />
          <InfoRow label="Prioridad" value={prospect.priority?.replace("_", " ")} />
        </div>
      )}

      {!isLead && prospect.lastActivity && (
        <InfoRow label="Ultima actividad" value={prospect.lastActivity} />
      )}
      {!isLead && prospect.nextStep && (
        <InfoRow label="Siguiente paso" value={prospect.nextStep} />
      )}
      {!isLead && prospect.reason && (
        <InfoRow label="Razon de interes" value={prospect.reason} />
      )}
      {!isLead && prospect.risk && <InfoRow label="Riesgo" value={prospect.risk} />}
      {!isLead && prospect.opportunity && <InfoRow label="Oportunidad" value={prospect.opportunity} />}

      {/* Qualification waste data (from QualifyLeadDialog) */}
      {(prospect.levantamientoData as any)?.qualificationWaste && (
        <div className="rounded-lg border p-3">
          <h3 className="mb-2 text-sm font-semibold">Info de Residuos (Calificacion)</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            <InfoRow
              label="Tipos de residuo"
              value={(prospect.levantamientoData as any).qualificationWaste.wasteTypes?.join(", ")}
            />
            <InfoRow
              label="Volumen estimado"
              value={(prospect.levantamientoData as any).qualificationWaste.estimatedVolume}
            />
            {(prospect.levantamientoData as any).qualificationWaste.hasCurrentProvider && (
              <>
                <InfoRow
                  label="Proveedor actual"
                  value={(prospect.levantamientoData as any).qualificationWaste.currentProviderName}
                />
                <InfoRow
                  label="Razon de cambio"
                  value={(prospect.levantamientoData as any).qualificationWaste.reasonForChange}
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

// --- Levantamiento Tab ---

function LevantamientoTab({
  data,
  onChange,
}: {
  data: any;
  onChange: (d: any) => void;
}) {
  return (
    <div className="space-y-4">
      <GeneralInfoSection
        data={data.generalInfo || {}}
        onChange={(gi: any) => onChange({ ...data, generalInfo: gi })}
      />
      <WasteTypesSection
        data={data.wasteTypes || []}
        onChange={(wt: any) => onChange({ ...data, wasteTypes: wt })}
      />
      <CurrentServicesSection
        data={data.currentServices || {}}
        onChange={(cs: any) => onChange({ ...data, currentServices: cs })}
      />
      <InfrastructureSection
        data={data.infrastructure || {}}
        onChange={(inf: any) => onChange({ ...data, infrastructure: inf })}
      />
      <NeedsSection
        data={data.needs || {}}
        onChange={(n: any) => onChange({ ...data, needs: n })}
      />
    </div>
  );
}

// Collapsible section wrapper
function Section({
  title,
  icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2 text-sm font-semibold">
          {icon}
          {title}
        </div>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {open && <CardContent className="pt-0">{children}</CardContent>}
    </Card>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input
        type={type}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1"
      />
    </div>
  );
}

function GeneralInfoSection({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const set = (key: string, val: string) => onChange({ ...data, [key]: val });
  return (
    <Section title="Datos de la Empresa" icon={<Building2 className="h-4 w-4" />} defaultOpen>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Razon Social *" value={data.razonSocial} onChange={(v) => set("razonSocial", v)} />
        <Field label="RFC" value={data.rfc} onChange={(v) => set("rfc", v)} />
        <Field label="Direccion" value={data.direccion} onChange={(v) => set("direccion", v)} />
        <Field label="Giro" value={data.giro} onChange={(v) => set("giro", v)} />
        <Field label="Num. Empleados" value={data.numEmpleados} onChange={(v) => set("numEmpleados", v)} />
        <Field label="Horario de Operacion" value={data.horarioOperacion} onChange={(v) => set("horarioOperacion", v)} />
        <Field label="Contacto Operativo" value={data.contactoOperativo} onChange={(v) => set("contactoOperativo", v)} />
        <Field label="Telefono Operativo" value={data.telefonoOperativo} onChange={(v) => set("telefonoOperativo", v)} />
      </div>
    </Section>
  );
}

function WasteTypesSection({ data, onChange }: { data: any[]; onChange: (d: any[]) => void }) {
  const addRow = () =>
    onChange([...data, { wasteType: "", quantity: "", percentage: "", currentDestination: "", monthlyCost: "" }]);
  const removeRow = (i: number) => onChange(data.filter((_, idx) => idx !== i));
  const updateRow = (i: number, key: string, val: string) => {
    const updated = [...data];
    updated[i] = { ...updated[i], [key]: val };
    onChange(updated);
  };

  return (
    <Section title="Tipos de Residuo" icon={<Recycle className="h-4 w-4" />}>
      {data.length === 0 && (
        <p className="mb-3 text-sm text-muted-foreground">
          Agrega al menos un tipo de residuo *
        </p>
      )}
      {data.map((row: any, i: number) => (
        <div key={i} className="mb-3 rounded-lg border p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium">Residuo #{i + 1}</span>
            <Button variant="ghost" size="sm" onClick={() => removeRow(i)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <Field label="Tipo *" value={row.wasteType} onChange={(v) => updateRow(i, "wasteType", v)} placeholder="Ej: Organicos" />
            <Field label="Cantidad" value={row.quantity} onChange={(v) => updateRow(i, "quantity", v)} placeholder="Ej: 18 ton/mes" />
            <Field label="Porcentaje %" value={row.percentage} onChange={(v) => updateRow(i, "percentage", v)} type="number" />
            <Field label="Destino Actual" value={row.currentDestination} onChange={(v) => updateRow(i, "currentDestination", v)} />
            <Field label="Costo Mensual" value={row.monthlyCost} onChange={(v) => updateRow(i, "monthlyCost", v)} type="number" />
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addRow}>
        <Plus className="mr-1 h-3 w-3" /> Agregar residuo
      </Button>
    </Section>
  );
}

function CurrentServicesSection({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const set = (key: string, val: any) => onChange({ ...data, [key]: val });
  return (
    <Section title="Servicios Actuales" icon={<Truck className="h-4 w-4" />}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Proveedor" value={data.providerName} onChange={(v) => set("providerName", v)} />
        <div>
          <Label className="text-xs">Contrato Activo</Label>
          <select
            value={data.contractActive ? "true" : "false"}
            onChange={(e) => set("contractActive", e.target.value === "true")}
            className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="false">No</option>
            <option value="true">Si</option>
          </select>
        </div>
        <Field label="Costo Mensual" value={data.monthlyCost} onChange={(v) => set("monthlyCost", v)} type="number" />
        <Field label="Frecuencia Recoleccion" value={data.collectionFrequency} onChange={(v) => set("collectionFrequency", v)} />
        <Field label="Tipo de Servicio" value={data.serviceType} onChange={(v) => set("serviceType", v)} />
        <div>
          <Label className="text-xs">Nivel de Satisfaccion (1-10)</Label>
          <Input
            type="number"
            min={1}
            max={10}
            value={data.satisfactionLevel || ""}
            onChange={(e) => set("satisfactionLevel", Number(e.target.value))}
            className="mt-1"
          />
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs">Razon de Cambio</Label>
          <textarea
            value={data.reasonForChange || ""}
            onChange={(e) => set("reasonForChange", e.target.value)}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            rows={2}
          />
        </div>
      </div>
    </Section>
  );
}

function InfrastructureSection({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const set = (key: string, val: any) => onChange({ ...data, [key]: val });
  const BoolSelect = ({ label, field }: { label: string; field: string }) => (
    <div>
      <Label className="text-xs">{label}</Label>
      <select
        value={data[field] ? "true" : "false"}
        onChange={(e) => set(field, e.target.value === "true")}
        className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
      >
        <option value="false">No</option>
        <option value="true">Si</option>
      </select>
    </div>
  );

  return (
    <Section title="Infraestructura" icon={<Warehouse className="h-4 w-4" />}>
      <div className="grid gap-3 sm:grid-cols-2">
        <BoolSelect label="Tiene Area de Almacenamiento" field="hasStorageArea" />
        <Field label="Tamano Area" value={data.storageAreaSize} onChange={(v) => set("storageAreaSize", v)} />
        <Field label="Tipo de Almacenamiento" value={data.storageType} onChange={(v) => set("storageType", v)} />
        <Field label="Num. Contenedores" value={data.containerCount} onChange={(v) => set("containerCount", v)} type="number" />
        <BoolSelect label="Tiene Compactadora" field="hasCompactor" />
        <BoolSelect label="Tiene Bodega" field="hasWarehouse" />
        <Field label="Acceso Vehicular" value={data.vehicleAccess} onChange={(v) => set("vehicleAccess", v)} />
        <Field label="Restricciones de Horario" value={data.scheduleRestrictions} onChange={(v) => set("scheduleRestrictions", v)} />
        <Field label="Espacio Disponible" value={data.availableSpace} onChange={(v) => set("availableSpace", v)} />
      </div>
    </Section>
  );
}

function NeedsSection({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const set = (key: string, val: any) => onChange({ ...data, [key]: val });
  const BoolSelect = ({ label, field }: { label: string; field: string }) => (
    <div>
      <Label className="text-xs">{label}</Label>
      <select
        value={data[field] ? "true" : "false"}
        onChange={(e) => set(field, e.target.value === "true")}
        className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
      >
        <option value="false">No</option>
        <option value="true">Si</option>
      </select>
    </div>
  );

  return (
    <Section title="Necesidades" icon={<Target className="h-4 w-4" />}>
      <div className="grid gap-3 sm:grid-cols-2">
        <BoolSelect label="Separacion" field="needsSeparation" />
        <BoolSelect label="Valorizacion" field="needsValorization" />
        <BoolSelect label="Trazabilidad" field="needsTraceability" />
        <BoolSelect label="Reportes Mensuales" field="needsMonthlyReporting" />
        <Field label="Certificaciones" value={data.certifications} onChange={(v) => set("certifications", v)} placeholder="ISO 14001, etc." />
        <Field label="Presupuesto Disponible" value={data.availableBudget} onChange={(v) => set("availableBudget", v)} type="number" />
        <div>
          <Label className="text-xs">Urgencia</Label>
          <select
            value={data.urgency || ""}
            onChange={(e) => set("urgency", e.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Seleccionar</option>
            <option value="Baja">Baja</option>
            <option value="Media">Media</option>
            <option value="Alta">Alta</option>
          </select>
        </div>
        <Field label="Tomador de Decision" value={data.decisionMaker} onChange={(v) => set("decisionMaker", v)} />
        <div className="sm:col-span-2">
          <Label className="text-xs">Metas Ambientales</Label>
          <textarea
            value={data.environmentalGoals || ""}
            onChange={(e) => set("environmentalGoals", e.target.value)}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            rows={2}
          />
        </div>
      </div>
    </Section>
  );
}
