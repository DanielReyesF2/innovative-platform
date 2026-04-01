import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useProspect, useUpdateProspect, useSendToOperaciones } from "../api";
import { useToast } from "@/components/ui/use-toast";
import {
  Building2, Recycle, Truck, Warehouse, Target,
  ChevronDown, ChevronRight, Trash2, Plus, Save,
  Send, CheckCircle, AlertCircle,
} from "lucide-react";

// ─── Collapsible Section ───
function CollapsibleSection({
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

// ─── Field helpers ───
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

function BoolField({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <select
        value={value ? "true" : "false"}
        onChange={(e) => onChange(e.target.value === "true")}
        className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
      >
        <option value="false">No</option>
        <option value="true">Si</option>
      </select>
    </div>
  );
}

// ─── Section Components ───

function GeneralInfoSection({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const set = (key: string, val: string) => onChange({ ...data, [key]: val });
  return (
    <CollapsibleSection title="Datos de la Empresa" icon={<Building2 className="h-4 w-4" />} defaultOpen>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Razon Social *" value={data.razonSocial} onChange={(v) => set("razonSocial", v)} />
        <Field label="RFC" value={data.rfc} onChange={(v) => set("rfc", v)} />
        <Field label="Direccion" value={data.direccion} onChange={(v) => set("direccion", v)} />
        <Field label="Giro" value={data.giro} onChange={(v) => set("giro", v)} />
        <Field label="Contacto Operativo" value={data.contactoOperativo} onChange={(v) => set("contactoOperativo", v)} />
        <Field label="Telefono Operativo" value={data.telefonoOperativo} onChange={(v) => set("telefonoOperativo", v)} />
      </div>
    </CollapsibleSection>
  );
}

function WasteTypesSection({ data, onChange }: { data: any[]; onChange: (d: any[]) => void }) {
  const addRow = () =>
    onChange([...data, { wasteType: "", quantity: "", currentDestination: "", monthlyCost: "" }]);
  const removeRow = (i: number) => onChange(data.filter((_, idx) => idx !== i));
  const updateRow = (i: number, key: string, val: string) => {
    const updated = [...data];
    updated[i] = { ...updated[i], [key]: val };
    onChange(updated);
  };

  return (
    <CollapsibleSection title="Tipos de Residuo" icon={<Recycle className="h-4 w-4" />}>
      {data.length === 0 && (
        <p className="mb-3 text-sm text-muted-foreground">Agrega al menos un tipo de residuo *</p>
      )}
      {data.map((row: any, i: number) => (
        <div key={i} className="mb-3 rounded-lg border p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium">Residuo #{i + 1}</span>
            <Button variant="ghost" size="sm" onClick={() => removeRow(i)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Tipo *" value={row.wasteType} onChange={(v) => updateRow(i, "wasteType", v)} placeholder="Ej: Organicos" />
            <Field label="Cantidad" value={row.quantity} onChange={(v) => updateRow(i, "quantity", v)} placeholder="Ej: 18 ton/mes" />
            <Field label="Destino Actual" value={row.currentDestination} onChange={(v) => updateRow(i, "currentDestination", v)} />
            <Field label="Costo Mensual" value={row.monthlyCost} onChange={(v) => updateRow(i, "monthlyCost", v)} type="number" />
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addRow}>
        <Plus className="mr-1 h-3 w-3" /> Agregar residuo
      </Button>
    </CollapsibleSection>
  );
}

function CurrentServicesSection({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const set = (key: string, val: any) => onChange({ ...data, [key]: val });
  return (
    <CollapsibleSection title="Servicios Actuales" icon={<Truck className="h-4 w-4" />}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Proveedor" value={data.providerName} onChange={(v) => set("providerName", v)} />
        <BoolField label="Contrato Activo" value={!!data.contractActive} onChange={(v) => set("contractActive", v)} />
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
    </CollapsibleSection>
  );
}

function InfrastructureSection({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const set = (key: string, val: any) => onChange({ ...data, [key]: val });
  return (
    <CollapsibleSection title="Infraestructura" icon={<Warehouse className="h-4 w-4" />}>
      <div className="grid gap-3 sm:grid-cols-2">
        <BoolField label="Tiene Area de Almacenamiento" value={!!data.hasStorageArea} onChange={(v) => set("hasStorageArea", v)} />
        <Field label="Tamano Area" value={data.storageAreaSize} onChange={(v) => set("storageAreaSize", v)} />
        <Field label="Tipo de Almacenamiento" value={data.storageType} onChange={(v) => set("storageType", v)} />
        <Field label="Num. Contenedores" value={data.containerCount} onChange={(v) => set("containerCount", v)} type="number" />
        <BoolField label="Tiene Compactadora" value={!!data.hasCompactor} onChange={(v) => set("hasCompactor", v)} />
        <BoolField label="Tiene Bodega" value={!!data.hasWarehouse} onChange={(v) => set("hasWarehouse", v)} />
        <Field label="Acceso Vehicular" value={data.vehicleAccess} onChange={(v) => set("vehicleAccess", v)} />
        <Field label="Restricciones de Horario" value={data.scheduleRestrictions} onChange={(v) => set("scheduleRestrictions", v)} />
        <Field label="Espacio Disponible" value={data.availableSpace} onChange={(v) => set("availableSpace", v)} />
      </div>
    </CollapsibleSection>
  );
}

function NeedsSection({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const set = (key: string, val: any) => onChange({ ...data, [key]: val });
  return (
    <CollapsibleSection title="Necesidades" icon={<Target className="h-4 w-4" />}>
      <div className="grid gap-3 sm:grid-cols-2">
        <BoolField label="Separacion" value={!!data.needsSeparation} onChange={(v) => set("needsSeparation", v)} />
        <BoolField label="Valorizacion" value={!!data.needsValorization} onChange={(v) => set("needsValorization", v)} />
        <BoolField label="Trazabilidad" value={!!data.needsTraceability} onChange={(v) => set("needsTraceability", v)} />
        <BoolField label="Reportes Mensuales" value={!!data.needsMonthlyReporting} onChange={(v) => set("needsMonthlyReporting", v)} />
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
    </CollapsibleSection>
  );
}

// ─── Main Component ───

interface ProspectLevantamientoProps {
  prospectId: number;
}

export function ProspectLevantamiento({ prospectId }: ProspectLevantamientoProps) {
  const { data: prospect, isLoading } = useProspect(prospectId);
  const updateProspect = useUpdateProspect();
  const sendToOps = useSendToOperaciones();
  const { toast } = useToast();
  const [showOpsConfirm, setShowOpsConfirm] = useState(false);
  const [schedProposedDate, setSchedProposedDate] = useState("");
  const [schedProposedTime, setSchedProposedTime] = useState("");
  const [schedResponsible, setSchedResponsible] = useState("");
  const [schedNotes, setSchedNotes] = useState("");

  const [levData, setLevData] = useState<any | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Initialize from API data once loaded
  if (prospect && !initialized) {
    const raw = prospect.levantamientoData || {};
    setLevData({
      generalInfo: raw.generalInfo || {},
      wasteTypes: raw.wasteTypes || [],
      currentServices: raw.currentServices || {},
      infrastructure: raw.infrastructure || {},
      needs: raw.needs || {},
    });
    setInitialized(true);
  }

  if (isLoading || !levData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#00a8a8]" />
      </div>
    );
  }

  const handleSave = async () => {
    try {
      await updateProspect.mutateAsync({ id: prospectId, levantamientoData: levData });
      toast({ title: "Levantamiento guardado" });
    } catch {
      toast({ title: "Error al guardar", variant: "destructive" });
    }
  };

  const handleSendToOps = async () => {
    if (!schedProposedDate || !schedProposedTime || !schedResponsible.trim()) {
      toast({ title: "Fecha, hora y responsable son requeridos", variant: "destructive" });
      return;
    }
    try {
      const dataWithScheduling = {
        ...levData,
        scheduling: {
          proposedDate: schedProposedDate,
          proposedTime: schedProposedTime,
          responsibleName: schedResponsible.trim(),
          notes: schedNotes.trim() || null,
        },
      };
      await updateProspect.mutateAsync({ id: prospectId, levantamientoData: dataWithScheduling });
      await sendToOps.mutateAsync(prospectId);
      toast({ title: "Enviado a Operaciones" });
      setShowOpsConfirm(false);
    } catch (err: any) {
      const msg = err?.message || "Error al enviar a Operaciones";
      toast({ title: msg, variant: "destructive" });
      setShowOpsConfirm(false);
    }
  };

  const canSendToOps =
    prospect &&
    ["contacto_inicial", "presentacion", "levantamiento"].includes(prospect.stage) &&
    !prospect.surveyId;

  const sentToOps = prospect?.sentToOpsAt;

  return (
    <div className="space-y-4">
      {/* Sent to Ops badge */}
      {sentToOps && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium text-green-700">
            Enviado a Operaciones — {new Date(sentToOps).toLocaleDateString("es-MX")}
          </span>
        </div>
      )}

      {/* 5 Sections */}
      <GeneralInfoSection
        data={levData.generalInfo}
        onChange={(gi) => setLevData({ ...levData, generalInfo: gi })}
      />
      <WasteTypesSection
        data={levData.wasteTypes}
        onChange={(wt) => setLevData({ ...levData, wasteTypes: wt })}
      />
      <CurrentServicesSection
        data={levData.currentServices}
        onChange={(cs) => setLevData({ ...levData, currentServices: cs })}
      />
      <InfrastructureSection
        data={levData.infrastructure}
        onChange={(inf) => setLevData({ ...levData, infrastructure: inf })}
      />
      <NeedsSection
        data={levData.needs}
        onChange={(n) => setLevData({ ...levData, needs: n })}
      />

      {/* Footer actions */}
      <div className="flex items-center gap-3 pt-2 border-t">
        <Button onClick={handleSave} disabled={updateProspect.isPending}>
          <Save className="mr-1 h-4 w-4" />
          {updateProspect.isPending ? "Guardando..." : "Guardar"}
        </Button>

        {canSendToOps && (
          <Button
            variant="outline"
            onClick={() => setShowOpsConfirm(true)}
            disabled={sendToOps.isPending}
          >
            <Send className="mr-1 h-4 w-4" />
            Enviar a Operaciones
          </Button>
        )}
      </div>

      {/* Scheduling + confirmation dialog */}
      {showOpsConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={() => setShowOpsConfirm(false)}>
          <div className="w-full max-w-lg rounded-lg bg-white shadow-xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="h-6 w-6 text-[#F57C00] flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-[#1c2c4a]">Enviar a Operaciones</h3>
                <p className="text-sm text-[#6b7280] mt-1">
                  Propone una fecha, hora y responsable para el levantamiento. Operaciones puede aceptar o ajustar.
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 mb-4">
              <div>
                <Label className="text-xs">Fecha Propuesta *</Label>
                <Input
                  type="date"
                  value={schedProposedDate}
                  onChange={(e) => setSchedProposedDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Hora Propuesta *</Label>
                <Input
                  type="time"
                  value={schedProposedTime}
                  onChange={(e) => setSchedProposedTime(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Responsable del Levantamiento *</Label>
                <Input
                  value={schedResponsible}
                  onChange={(e) => setSchedResponsible(e.target.value)}
                  placeholder="Nombre del responsable"
                  className="mt-1"
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Notas (opcional)</Label>
                <textarea
                  value={schedNotes}
                  onChange={(e) => setSchedNotes(e.target.value)}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  rows={2}
                  placeholder="Ej: Llegar por la puerta de carga..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowOpsConfirm(false)}>Cancelar</Button>
              <Button onClick={handleSendToOps} disabled={sendToOps.isPending || updateProspect.isPending}>
                <Send className="mr-1 h-4 w-4" />
                {sendToOps.isPending || updateProspect.isPending ? "Enviando..." : "Confirmar y Enviar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
