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
} from "lucide-react";
import { useUpdateProspect, useSendToOperaciones, useQualifyProspect } from "../api";
import { useToast } from "@/components/ui/use-toast";
import { ProspectTimeline } from "./ProspectTimeline";
import { ProspectNotes } from "./ProspectNotes";
import { ProspectMeetings } from "./ProspectMeetings";
import { ProspectDocuments } from "./ProspectDocuments";
import { ProspectProposals } from "./ProspectProposals";

const STAGE_LABELS: Record<string, string> = {
  lead: "Leads",
  prospecto: "Prospectos",
  levantamiento: "Levantamientos",
  propuesta: "Propuestas",
  negociacion: "Negociacion",
  cierre: "Cierre",
  rechazada: "Rechazadas",
};

const STAGE_COLORS: Record<string, string> = {
  lead: "bg-blue-100 text-blue-800",
  prospecto: "bg-cyan-100 text-cyan-800",
  levantamiento: "bg-yellow-100 text-yellow-800",
  propuesta: "bg-purple-100 text-purple-800",
  negociacion: "bg-orange-100 text-orange-800",
  cierre: "bg-green-100 text-green-800",
  rechazada: "bg-red-100 text-red-800",
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
  const [isSaving, setIsSaving] = useState(false);

  const updateProspect = useUpdateProspect();
  const sendToOps = useSendToOperaciones();
  const { toast } = useToast();
  const qualifyProspect = useQualifyProspect();
  const [showQualify, setShowQualify] = useState(false);

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

  const canSend = prospect.stage === "prospecto" && !prospect.surveyId;
  const canQualify = prospect.stage === "lead";
  const wasSent = !!prospect.sentToOpsAt;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-background shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
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
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b px-6 overflow-x-auto">
          {(() => {
            const stage = prospect.stage;
            const allTabs = [
              { id: "info", label: "Info", icon: Building2, minStage: "lead" },
              { id: "timeline", label: "Timeline", icon: Clock, minStage: "prospecto" },
              { id: "notas", label: "Notas", icon: StickyNote, minStage: "lead" },
              { id: "reuniones", label: "Reuniones", icon: Users, minStage: "prospecto" },
              { id: "documentos", label: "Docs", icon: FileText, minStage: "prospecto" },
              { id: "propuestas", label: "Propuestas", icon: FileCheck, minStage: "propuesta" },
              { id: "levantamiento", label: "Levantamiento", icon: Target, minStage: "levantamiento" },
            ];

            const stageOrder = ["lead", "prospecto", "levantamiento", "propuesta", "negociacion", "cierre", "rechazada"];
            const currentIdx = stageOrder.indexOf(stage);
            const isRechazada = stage === "rechazada";

            return allTabs
              .filter((tab) => isRechazada || currentIdx >= stageOrder.indexOf(tab.minStage))
              .map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? "border-b-2 border-primary text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ));
          })()}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === "info" && <InfoTab prospect={prospect} />}
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
        {(activeTab === "levantamiento" || canQualify) && (
          <div className="flex items-center justify-between border-t px-6 py-3">
            <div className="text-xs text-muted-foreground">
              {isSaving ? "Guardando..." : ""}
            </div>
            <div className="flex gap-2">
              {activeTab === "levantamiento" && (
                <>
                  <Button variant="outline" onClick={handleSave} disabled={isSaving}>
                    Guardar
                  </Button>
                  {canSend && (
                    <Button onClick={() => setShowConfirmSend(true)} disabled={sendToOps.isPending}>
                      <Send className="mr-2 h-4 w-4" />
                      Enviar a Operaciones
                    </Button>
                  )}
                </>
              )}
              {canQualify && (
                <Button onClick={() => setShowQualify(true)}>
                  <Target className="mr-2 h-4 w-4" />
                  Calificar como Prospecto
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Confirm dialog */}
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

      {showQualify && (
        <QualifyModal
          onClose={() => setShowQualify(false)}
          isPending={qualifyProspect.isPending}
          onSubmit={async (data) => {
            try {
              await qualifyProspect.mutateAsync({ id: prospect.id, ...data });
              toast({ title: "Lead calificado como Prospecto" });
              setShowQualify(false);
              onClose();
            } catch (err: any) {
              toast({ title: err?.message || "Error al calificar", variant: "destructive" });
            }
          }}
        />
      )}
    </div>
  );
}

function InfoTab({ prospect }: { prospect: any }) {
  const isLead = prospect.stage === "lead";

  return (
    <div className="space-y-4">
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

function QualifyModal({
  onClose,
  onSubmit,
  isPending,
}: {
  onClose: () => void;
  onSubmit: (data: any) => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState({
    industry: "",
    potential: "Medio",
    estimatedValue: "",
    estimatedVolume: "",
    probability: 50,
    priority: "media",
    contactRole: "",
    contactEmail: "",
    reason: "",
    nextStep: "",
  });

  const set = (key: string, val: any) => setForm({ ...form, [key]: val });

  const handleSubmit = () => {
    if (!form.industry) return;
    onSubmit({
      industry: form.industry,
      potential: form.potential,
      estimatedValue: form.estimatedValue || undefined,
      estimatedVolume: form.estimatedVolume || undefined,
      probability: form.probability,
      priority: form.priority,
      contactRole: form.contactRole || undefined,
      contactEmail: form.contactEmail || undefined,
      reason: form.reason || undefined,
      nextStep: form.nextStep || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[80vh] w-full max-w-lg overflow-auto rounded-lg bg-background p-6 shadow-lg">
        <h3 className="text-lg font-bold">Calificar Lead</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Agrega la información comercial para convertirlo en Prospecto
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Industria *</Label>
            <Input value={form.industry} onChange={(e) => set("industry", e.target.value)} placeholder="Ej: Manufactura" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Potencial</Label>
            <select value={form.potential} onChange={(e) => set("potential", e.target.value)} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="Bajo">Bajo</option>
              <option value="Medio">Medio</option>
              <option value="Alto">Alto</option>
              <option value="Muy Alto">Muy Alto</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Valor estimado</Label>
            <Input type="number" value={form.estimatedValue} onChange={(e) => set("estimatedValue", e.target.value)} placeholder="$" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Volumen estimado</Label>
            <Input value={form.estimatedVolume} onChange={(e) => set("estimatedVolume", e.target.value)} placeholder="Ej: 50 ton/mes" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Probabilidad %</Label>
            <Input type="number" min={0} max={100} value={form.probability} onChange={(e) => set("probability", Number(e.target.value))} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Prioridad</Label>
            <select value={form.priority} onChange={(e) => set("priority", e.target.value)} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="baja">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
              <option value="muy_alta">Muy Alta</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Rol del contacto</Label>
            <Input value={form.contactRole} onChange={(e) => set("contactRole", e.target.value)} placeholder="Ej: Director de Operaciones" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Email contacto</Label>
            <Input type="email" value={form.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} placeholder="correo@empresa.com" className="mt-1" />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Razón de interés</Label>
            <Input value={form.reason} onChange={(e) => set("reason", e.target.value)} placeholder="¿Por qué están interesados?" className="mt-1" />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Siguiente paso</Label>
            <Input value={form.nextStep} onChange={(e) => set("nextStep", e.target.value)} placeholder="Ej: Agendar presentación" className="mt-1" />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isPending || !form.industry}>
            {isPending ? "Calificando..." : "Calificar como Prospecto"}
          </Button>
        </div>
      </div>
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
