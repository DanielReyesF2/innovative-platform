import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useProspect, useUpdateProspect, useSendToOperaciones } from "../api";
import { useToast } from "@/components/ui/use-toast";
import { EPP_OPTIONS, WASTE_TYPES_CATALOG, ACCESS_REQUIREMENTS_OPTIONS } from "@/lib/comercial-constants";
import { canHandoffStage } from "@shared/schema/comercial-stages";
import type { User } from "@shared/schema/common";
import {
  CalendarCheck, HardHat, Save, Recycle,
  Send, CheckCircle, Users, Phone,
  ChevronDown, ChevronRight, Trash2, Plus,
  MapPin, ShieldCheck, Car,
} from "lucide-react";

// ─── Field helper ───
function Field({
  label, value, onChange, type = "text", placeholder,
}: {
  label: string; value: unknown; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input type={type} value={(value as string) || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1" />
    </div>
  );
}

// ─── Collapsible Section ───
function CollapsibleSection({ title, icon, children, defaultOpen = false }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card>
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-4 py-3 text-left">
        <div className="flex items-center gap-2 text-sm font-semibold">{icon}{title}</div>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {open && <CardContent className="pt-0">{children}</CardContent>}
    </Card>
  );
}

// Parse a legacy `quantity` string like "18 ton/mes" or "50 kg" into value + unit.
// Defaults unit to "ton" when ambiguous (matches previous implicit behavior).
function parseLegacyQuantity(raw: unknown): { value: string; unit: "kg" | "ton" } {
  if (typeof raw !== "string" || !raw.trim()) return { value: "", unit: "ton" };
  const match = raw.match(/^\s*([\d.,]+)\s*(kg|ton|tonelada|toneladas|kilogramo|kilogramos|kilos?)/i);
  if (!match) return { value: raw, unit: "ton" };
  const unit = match[2].toLowerCase().startsWith("k") ? "kg" : "ton";
  return { value: match[1].replace(",", "."), unit };
}

// ─── Section: Tipos de Residuo ───
function WasteTypesSection({ data, onChange }: { data: Record<string, unknown>[]; onChange: (d: Record<string, unknown>[]) => void }) {
  const addRow = () => onChange([...data, { wasteType: "", quantityValue: "", quantityUnit: "ton", quantity: "", currentDestination: "" }]);
  const removeRow = (i: number) => onChange(data.filter((_, idx) => idx !== i));
  const updateRow = (i: number, key: string, val: string) => {
    const updated = [...data];
    updated[i] = { ...updated[i], [key]: val } as Record<string, unknown>;
    onChange(updated);
  };
  const updateRowFields = (i: number, fields: Record<string, unknown>) => {
    const updated = [...data];
    updated[i] = { ...updated[i], ...fields };
    onChange(updated);
  };
  const categories = [...new Set(WASTE_TYPES_CATALOG.map(w => w.category))];

  return (
    <CollapsibleSection title="Tipos de Residuo" icon={<Recycle className="h-4 w-4" />} defaultOpen>
      {data.length === 0 && <p className="mb-3 text-sm text-muted-foreground">Agrega al menos un tipo de residuo</p>}
      {data.map((row: Record<string, unknown>, i: number) => {
        const currentType = row.wasteType as string;
        const isLegacyValue = currentType && !WASTE_TYPES_CATALOG.some(w => w.id === currentType || w.label === currentType);
        const legacy = parseLegacyQuantity(row.quantity);
        const quantityValue = ((row.quantityValue as string) ?? legacy.value) || "";
        const quantityUnit = ((row.quantityUnit as "kg" | "ton") ?? legacy.unit) || "ton";
        const setQuantity = (value: string, unit: "kg" | "ton") => {
          updateRowFields(i, {
            quantityValue: value,
            quantityUnit: unit,
            quantity: value ? `${value} ${unit}/mes` : "",
          });
        };
        return (
          <div key={i} className="mb-3 rounded-lg border p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium">Residuo #{i + 1}</span>
              <Button variant="ghost" size="sm" onClick={() => removeRow(i)}><Trash2 className="h-3 w-3" /></Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Tipo *</Label>
                {isLegacyValue ? (
                  <Input value={currentType} onChange={(e) => updateRow(i, "wasteType", e.target.value)} className="mt-1" />
                ) : (
                  <select value={currentType} onChange={(e) => updateRow(i, "wasteType", e.target.value)}
                    className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option value="">Seleccionar residuo...</option>
                    {categories.map(cat => (
                      <optgroup key={cat} label={cat}>
                        {WASTE_TYPES_CATALOG.filter(w => w.category === cat).map(w => (
                          <option key={w.id} value={w.id}>{w.label}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <Label className="text-xs">Cantidad mensual</Label>
                <div className="mt-1 flex items-stretch gap-1.5">
                  <Input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    value={quantityValue}
                    onChange={(e) => setQuantity(e.target.value, quantityUnit)}
                    placeholder="Ej: 18"
                    className="flex-1"
                  />
                  <div className="inline-flex shrink-0 overflow-hidden rounded-md border border-input">
                    <button
                      type="button"
                      onClick={() => setQuantity(quantityValue, "kg")}
                      className={`px-2.5 text-xs font-medium transition-colors ${
                        quantityUnit === "kg"
                          ? "bg-[#00a8a8] text-white"
                          : "bg-background text-[#6b7280] hover:bg-[#f3f4f6]"
                      }`}
                      aria-pressed={quantityUnit === "kg"}
                    >
                      kg
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuantity(quantityValue, "ton")}
                      className={`px-2.5 text-xs font-medium transition-colors ${
                        quantityUnit === "ton"
                          ? "bg-[#00a8a8] text-white"
                          : "bg-background text-[#6b7280] hover:bg-[#f3f4f6]"
                      }`}
                      aria-pressed={quantityUnit === "ton"}
                    >
                      ton
                    </button>
                  </div>
                </div>
              </div>
              <Field label="Destino Actual" value={row.currentDestination} onChange={(v) => updateRow(i, "currentDestination", v)} />
            </div>
          </div>
        );
      })}
      <Button variant="outline" size="sm" onClick={addRow}><Plus className="mr-1 h-3 w-3" /> Agregar residuo</Button>
    </CollapsibleSection>
  );
}

// Team member shape consumed by the scheduling form. Adds areaSlug coming from
// the joined areas table so we can split participants by business area.
type TeamMemberRow = Pick<User, "id" | "name" | "codigo" | "email"> & {
  areaSlug: string | null;
  areaName: string | null;
};

// ─── Area participant selector (shared by comercial / operaciones / subproductos) ───
function AreaParticipants({
  label,
  color,
  selectedIds,
  teamMembers,
  onToggle,
  emptyLabel,
}: {
  label: string;
  color: string;
  selectedIds: number[];
  teamMembers: TeamMemberRow[];
  onToggle: (id: number) => void;
  emptyLabel: string;
}) {
  return (
    <div>
      <Label className="text-xs font-semibold" style={{ color }}>{label}</Label>
      {teamMembers.length === 0 ? (
        <p className="mt-1 text-[11px] italic text-[#9ca3af]">{emptyLabel}</p>
      ) : (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {teamMembers.map((m) => {
            const active = selectedIds.includes(m.id);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onToggle(m.id)}
                className="rounded-full px-2.5 py-1 text-xs font-medium transition-colors flex items-center gap-1.5"
                style={active
                  ? { backgroundColor: color, color: "white" }
                  : { backgroundColor: "#f3f4f6", color: "#6b7280" }}
              >
                <span className="w-4 h-4 rounded-full bg-white/25 flex items-center justify-center text-[9px] font-bold">
                  {m.codigo || m.name.split(" ").map(n => n[0]).join("").substring(0, 2)}
                </span>
                {m.name.split(" ").slice(0, 2).join(" ")}
              </button>
            );
          })}
        </div>
      )}
    </div>
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

  // Team members for participants dropdowns (include area slug from joined areas table)
  const { data: teamMembers = [] } = useQuery<TeamMemberRow[]>({
    queryKey: ["/api/auth/team"],
    staleTime: 5 * 60 * 1000,
  });

  // Scheduling state
  const [schedDate, setSchedDate] = useState("");
  const [schedTime, setSchedTime] = useState("");
  const [schedEpp, setSchedEpp] = useState<string[]>([]);
  const [schedNotes, setSchedNotes] = useState("");

  // Site + contact fields
  const [schedSiteAddress, setSchedSiteAddress] = useState("");
  const [schedContactName, setSchedContactName] = useState("");
  const [schedContactRole, setSchedContactRole] = useState("");
  const [schedContactPhone, setSchedContactPhone] = useState("");
  const [schedContactEmail, setSchedContactEmail] = useState("");

  // Participants split by area
  const [partComercial, setPartComercial] = useState<number[]>([]);
  const [partOperaciones, setPartOperaciones] = useState<number[]>([]);
  const [partSubproductos, setPartSubproductos] = useState<number[]>([]);

  // Access requirements + vehicle plates
  const [schedAccessReqs, setSchedAccessReqs] = useState<string[]>([]);
  const [schedAccessReqsOther, setSchedAccessReqsOther] = useState("");
  const [schedVehiclePlates, setSchedVehiclePlates] = useState("");

  // Fecha de entrega del levantamiento por parte de Operaciones — campo que
  // Comercial captura cuando Ops le confirma cuándo entregará el documento.
  const [schedDeliveryDate, setSchedDeliveryDate] = useState("");

  const [wasteTypes, setWasteTypes] = useState<Record<string, unknown>[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Initialize from API data once loaded
  if (prospect && !initialized) {
    const raw = (prospect.levantamientoData || {}) as Record<string, unknown>;
    setWasteTypes((raw.wasteTypes as Record<string, unknown>[]) || []);
    const sched = raw.scheduling as Record<string, unknown> | undefined;
    if (sched) {
      setSchedDate((sched.proposedDate as string) || "");
      setSchedTime((sched.proposedTime as string) || "");
      setSchedEpp((sched.epp as string[]) || []);
      setSchedNotes((sched.notes as string) || "");
      setSchedSiteAddress((sched.siteAddress as string) || "");
      setSchedContactName((sched.contactName as string) || "");
      setSchedContactRole((sched.contactRole as string) || "");
      setSchedContactPhone((sched.contactPhone as string) || "");
      setSchedContactEmail((sched.contactEmail as string) || "");
      setSchedAccessReqs((sched.accessRequirements as string[]) || []);
      setSchedAccessReqsOther((sched.accessRequirementsOther as string) || "");
      setSchedVehiclePlates((sched.vehiclePlates as string) || "");
      setSchedDeliveryDate((sched.deliveryDate as string) || "");

      // Participants: new structure first, legacy fallback so old data
      // shows up as comercial until the user re-assigns.
      const pba = sched.participantsByArea as Record<string, number[]> | undefined;
      if (pba) {
        setPartComercial(Array.isArray(pba.comercial) ? pba.comercial : []);
        setPartOperaciones(Array.isArray(pba.operaciones) ? pba.operaciones : []);
        setPartSubproductos(Array.isArray(pba.subproductos) ? pba.subproductos : []);
      } else if (Array.isArray(sched.responsibleIds) && (sched.responsibleIds as number[]).length) {
        setPartComercial(sched.responsibleIds as number[]);
      }
    }
    setInitialized(true);
  }

  if (isLoading || !initialized) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#00a8a8]" />
      </div>
    );
  }

  const allParticipants = Array.from(new Set([...partComercial, ...partOperaciones, ...partSubproductos]));
  const participantsInfo = allParticipants
    .map((id) => teamMembers.find((m) => m.id === id))
    .filter((m): m is TeamMemberRow => Boolean(m));

  // Preserve any existing levantamientoData (generalInfo, wasteTypes, etc.) and update scheduling.
  // Keeps flat responsibleIds alongside participantsByArea for backward compat with
  // handoff flows / downstream consumers that haven't been updated yet.
  const existingData = (prospect?.levantamientoData || {}) as Record<string, unknown>;
  const buildFullData = () => ({
    ...existingData,
    wasteTypes,
    scheduling: {
      proposedDate: schedDate,
      proposedTime: schedTime,
      siteAddress: schedSiteAddress.trim() || null,
      contactName: schedContactName.trim(),
      contactRole: schedContactRole.trim() || null,
      contactPhone: schedContactPhone.trim(),
      contactEmail: schedContactEmail.trim(),
      participantsByArea: {
        comercial: partComercial,
        operaciones: partOperaciones,
        subproductos: partSubproductos,
      },
      // Flat fields for backward compat (handoff validations, reports, etc.)
      responsibleIds: allParticipants,
      responsibleNames: participantsInfo.map((m) => m.name),
      responsibleEmails: participantsInfo.map((m) => m.email),
      epp: schedEpp,
      accessRequirements: schedAccessReqs,
      accessRequirementsOther: schedAccessReqsOther.trim() || null,
      vehiclePlates: schedVehiclePlates.trim() || null,
      deliveryDate: schedDeliveryDate || null,
      notes: schedNotes.trim() || null,
    },
  });

  const handleSave = async () => {
    try {
      await updateProspect.mutateAsync({ id: prospectId, levantamientoData: buildFullData() });
      toast({ title: "Levantamiento guardado" });
    } catch {
      toast({ title: "Error al guardar", variant: "destructive" });
    }
  };

  const handleSendToOps = async () => {
    if (!schedDate || !schedTime) {
      toast({ title: "Fecha y hora son requeridos", variant: "destructive" });
      return;
    }
    if (!schedSiteAddress.trim()) {
      toast({ title: "La dirección del sitio es requerida", variant: "destructive" });
      return;
    }
    if (allParticipants.length === 0) {
      toast({ title: "Selecciona al menos un participante por área", variant: "destructive" });
      return;
    }
    try {
      await updateProspect.mutateAsync({ id: prospectId, levantamientoData: buildFullData() });
      await sendToOps.mutateAsync(prospectId);
      toast({ title: "Levantamiento agendado y enviado a Operaciones" });
    } catch (err: unknown) {
      const msg = (err instanceof Error ? err.message : null) || "Error al enviar a Operaciones";
      toast({ title: msg, variant: "destructive" });
    }
  };

  const canSendToOps =
    prospect &&
    canHandoffStage(prospect.stage) &&
    !prospect.surveyId;

  const sentToOps = prospect?.sentToOpsAt;

  const toggleId = (setter: React.Dispatch<React.SetStateAction<number[]>>) => (id: number) => {
    setter((prev) => prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]);
  };

  const toggleAccessReq = (id: string) => {
    setSchedAccessReqs((prev) => prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]);
  };

  const toggleEpp = (id: string) => {
    setSchedEpp((prev) => prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]);
  };

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

      {/* Tipos de Residuo */}
      <WasteTypesSection
        data={wasteTypes}
        onChange={setWasteTypes}
      />

      {/* Agendar Levantamiento */}
      <Card>
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <CalendarCheck className="h-4 w-4" />
            Agendar Levantamiento
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Toda esta información se enviará a Operaciones para preparar la visita.
          </p>
        </div>
        <CardContent className="pt-0 space-y-5">
          {/* 1. Fecha y hora */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Fecha Propuesta *</Label>
              <Input type="date" value={schedDate} onChange={(e) => setSchedDate(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Hora Propuesta *</Label>
              <Input type="time" value={schedTime} onChange={(e) => setSchedTime(e.target.value)} className="mt-1" />
            </div>
          </div>

          {/* 1b. Ejecutivo responsable */}
          <div>
            <Label className="text-xs">Ejecutivo responsable</Label>
            <div className="mt-1 h-10 flex items-center rounded-md border border-input bg-[#f9fafb] px-3 text-sm text-[#1c2c4a]">
              {(() => {
                const owner = teamMembers.find((m) => m.id === prospect?.assignedToId);
                return owner ? owner.name : <span className="text-[#9ca3af]">Sin asignar</span>;
              })()}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Toma el ejecutivo asignado al prospecto. Se edita desde el Kanban.
            </p>
          </div>

          {/* 2. Dirección del sitio */}
          <div>
            <Label className="text-xs flex items-center gap-1">
              <MapPin className="h-3 w-3" /> Dirección del sitio *
            </Label>
            <Input
              value={schedSiteAddress}
              onChange={(e) => setSchedSiteAddress(e.target.value)}
              placeholder="Calle, número, colonia, ciudad, estado, CP"
              className="mt-1"
            />
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Dirección completa de planta / sede donde se hará el levantamiento (no la ciudad general del prospecto).
            </p>
          </div>

          {/* 3. Contacto en sitio */}
          <div>
            <Label className="text-xs flex items-center gap-1 mb-2">
              <Phone className="h-3 w-3" /> Contacto que recibe en sitio
            </Label>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Nombre" value={schedContactName} onChange={setSchedContactName} placeholder="Quien recibe" />
              <Field label="Puesto" value={schedContactRole} onChange={setSchedContactRole} placeholder="Ej: Gerente de Planta" />
              <Field label="Teléfono" value={schedContactPhone} onChange={setSchedContactPhone} type="tel" placeholder="55 1234 5678" />
              <Field label="Correo" value={schedContactEmail} onChange={setSchedContactEmail} type="email" placeholder="contacto@empresa.com" />
            </div>
          </div>

          {/* 4. Participantes por área */}
          <div>
            <Label className="text-xs flex items-center gap-1">
              <Users className="h-3 w-3" /> Participantes por área *
            </Label>
            <p className="text-[10px] text-muted-foreground mb-2">
              Selecciona quién de cada área asistirá al levantamiento.
            </p>
            <div className="space-y-3">
              <AreaParticipants
                label="Comercial"
                color="#00a8a8"
                selectedIds={partComercial}
                // Users con area 'comercial' + los que aún no tienen área asignada
                // (legacy) caen aquí por default para no perderlos de la lista.
                teamMembers={teamMembers.filter((m) => !m.areaSlug || m.areaSlug === "comercial")}
                onToggle={toggleId(setPartComercial)}
                emptyLabel="Sin usuarios en Comercial — asígnalos desde Settings"
              />
              <AreaParticipants
                label="Operaciones"
                color="#0D47A1"
                selectedIds={partOperaciones}
                teamMembers={teamMembers.filter((m) => m.areaSlug === "operaciones")}
                onToggle={toggleId(setPartOperaciones)}
                emptyLabel="Sin usuarios en Operaciones — asígnalos desde Settings"
              />
              <AreaParticipants
                label="Subproductos"
                color="#F57C00"
                selectedIds={partSubproductos}
                teamMembers={teamMembers.filter((m) => m.areaSlug === "subproductos")}
                onToggle={toggleId(setPartSubproductos)}
                emptyLabel="Sin usuarios en Subproductos — asígnalos desde Settings"
              />
            </div>
            {allParticipants.length > 0 && (
              <p className="text-[10px] text-[#6b7280] mt-2">
                {allParticipants.length} participante{allParticipants.length === 1 ? "" : "s"} asignado{allParticipants.length === 1 ? "" : "s"} en total
              </p>
            )}
          </div>

          {/* 5. EPP Necesario */}
          <div>
            <Label className="text-xs flex items-center gap-1">
              <HardHat className="h-3 w-3" /> EPP Necesario
            </Label>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {EPP_OPTIONS.map(epp => (
                <button
                  key={epp.id}
                  type="button"
                  onClick={() => toggleEpp(epp.id)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                    schedEpp.includes(epp.id)
                      ? "bg-[#F57C00] text-white"
                      : "bg-[#f3f4f6] text-[#6b7280] hover:bg-[#e5e7eb]"
                  }`}
                >
                  {epp.label}
                </button>
              ))}
            </div>
          </div>

          {/* 6. Requisitos de acceso */}
          <div>
            <Label className="text-xs flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> Requisitos de acceso
            </Label>
            <p className="text-[10px] text-muted-foreground mb-2">
              Qué hay que presentar o traer para entrar al sitio.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ACCESS_REQUIREMENTS_OPTIONS.map(req => (
                <button
                  key={req.id}
                  type="button"
                  onClick={() => toggleAccessReq(req.id)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                    schedAccessReqs.includes(req.id)
                      ? "bg-[#7C3AED] text-white"
                      : "bg-[#f3f4f6] text-[#6b7280] hover:bg-[#e5e7eb]"
                  }`}
                >
                  {req.label}
                </button>
              ))}
            </div>
            <Input
              value={schedAccessReqsOther}
              onChange={(e) => setSchedAccessReqsOther(e.target.value)}
              placeholder="Otros requisitos (texto libre)"
              className="mt-2"
            />
          </div>

          {/* 7. Placas de vehículos */}
          <div>
            <Label className="text-xs flex items-center gap-1">
              <Car className="h-3 w-3" /> Placas de vehículos
            </Label>
            <Input
              value={schedVehiclePlates}
              onChange={(e) => setSchedVehiclePlates(e.target.value)}
              placeholder="Ej: ABC-123-A, XYZ-987-B"
              className="mt-1"
            />
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Separa con coma si son varios. Útil para el registro de vehículos al ingresar al sitio.
            </p>
          </div>

          {/* 8. Notas */}
          <div>
            <Label className="text-xs">Notas (opcional)</Label>
            <textarea
              value={schedNotes}
              onChange={(e) => setSchedNotes(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              rows={2}
              placeholder="Ej: Llegar por la puerta de carga, preguntar por Juan..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Footer actions */}
      <div className="flex items-center gap-3 pt-2 border-t">
        <Button onClick={handleSave} disabled={updateProspect.isPending}>
          <Save className="mr-1 h-4 w-4" />
          {updateProspect.isPending ? "Guardando..." : "Guardar"}
        </Button>

        {canSendToOps && (
          <Button
            onClick={handleSendToOps}
            disabled={sendToOps.isPending || updateProspect.isPending}
            className="bg-[#00a8a8] hover:bg-[#008b8b]"
          >
            <Send className="mr-1 h-4 w-4" />
            {sendToOps.isPending || updateProspect.isPending ? "Enviando..." : "Agendar Levantamiento"}
          </Button>
        )}
      </div>
    </div>
  );
}
