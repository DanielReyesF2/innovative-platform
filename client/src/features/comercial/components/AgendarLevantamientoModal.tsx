import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  X, Calendar as CalendarIcon, ChevronRight, Trash2, Plus,
  MapPin, Phone, Users, HardHat, ShieldCheck, Car, Recycle, Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useUpdateProspect } from "../api";
import {
  KANBAN_STAGES, EPP_OPTIONS, WASTE_TYPES_CATALOG, ACCESS_REQUIREMENTS_OPTIONS,
} from "@/lib/comercial-constants";
import { STAGE } from "@shared/schema/comercial-stages";
import type { KanbanProspecto } from "@shared/types/comercial";
import type { User } from "@shared/schema/common";

// Modal de agendamiento de levantamiento: captura TODOS los campos de la etapa
// al avanzar de Reunión → Agendar Levantamiento (DB: levantamiento → propuesta).
// Permite guardar como borrador (se queda en Reunión con datos parciales) o
// agendar y avanzar (valida mínimos y mueve de etapa).

type TeamMemberRow = Pick<User, "id" | "name" | "codigo" | "email"> & {
  areaSlug: string | null;
  areaName: string | null;
};

interface WasteRow {
  wasteType: string;
  quantityValue: string;
  quantityUnit: "kg" | "ton";
  quantity: string;
  currentDestination: string;
}

interface Props {
  prospecto: KanbanProspecto;
  onClose: () => void;
  onAdvanced?: () => void;
}

export function AgendarLevantamientoModal({ prospecto, onClose, onAdvanced }: Props) {
  const { toast } = useToast();
  const updateProspect = useUpdateProspect();

  const { data: teamMembers = [] } = useQuery<TeamMemberRow[]>({
    queryKey: ["/api/auth/team"],
    staleTime: 5 * 60 * 1000,
  });

  // Seed from existing levantamientoData.scheduling / wasteTypes si ya hay
  const existing = (prospecto.levantamientoData || {}) as Record<string, unknown>;
  const seed = (existing.scheduling || {}) as Record<string, unknown>;
  const seedWaste = (existing.wasteTypes as WasteRow[] | undefined) || [];
  const seedPba = (seed.participantsByArea || {}) as Record<string, number[]>;

  const [date, setDate] = useState<string>((seed.proposedDate as string) || "");
  const [time, setTime] = useState<string>((seed.proposedTime as string) || "");
  const [siteAddress, setSiteAddress] = useState<string>((seed.siteAddress as string) || "");
  const [contactName, setContactName] = useState<string>((seed.contactName as string) || "");
  const [contactRole, setContactRole] = useState<string>((seed.contactRole as string) || "");
  const [contactPhone, setContactPhone] = useState<string>((seed.contactPhone as string) || "");
  const [contactEmail, setContactEmail] = useState<string>((seed.contactEmail as string) || "");
  const [partComercial, setPartComercial] = useState<number[]>(seedPba.comercial || []);
  const [partOperaciones, setPartOperaciones] = useState<number[]>(seedPba.operaciones || []);
  const [partSubproductos, setPartSubproductos] = useState<number[]>(seedPba.subproductos || []);
  const [epp, setEpp] = useState<string[]>((seed.epp as string[]) || []);
  const [accessReqs, setAccessReqs] = useState<string[]>((seed.accessRequirements as string[]) || []);
  const [accessReqsOther, setAccessReqsOther] = useState<string>((seed.accessRequirementsOther as string) || "");
  const [vehiclePlates, setVehiclePlates] = useState<string>((seed.vehiclePlates as string) || "");
  const [deliveryDate, setDeliveryDate] = useState<string>((seed.deliveryDate as string) || "");
  const [notes, setNotes] = useState<string>((seed.notes as string) || "");
  const [wasteTypes, setWasteTypes] = useState<WasteRow[]>(seedWaste);

  const allParticipants = Array.from(new Set([...partComercial, ...partOperaciones, ...partSubproductos]));
  const participantsInfo = allParticipants
    .map((id) => teamMembers.find((m) => m.id === id))
    .filter((m): m is TeamMemberRow => Boolean(m));

  // Requisitos mínimos para "Agendar y avanzar". Todo lo demás es opcional y
  // se puede completar después dentro del tab Agendar Levantamiento.
  const missing: string[] = [];
  if (!date) missing.push("fecha");
  if (!time) missing.push("hora");
  if (!siteAddress.trim()) missing.push("dirección del sitio");
  if (!contactName.trim()) missing.push("contacto en sitio");
  if (allParticipants.length === 0) missing.push("al menos un participante");
  const canAdvance = missing.length === 0;

  const toggleId = (setter: React.Dispatch<React.SetStateAction<number[]>>) => (id: number) => {
    setter((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));
  };

  const toggleInList = (list: string[], id: string, setter: (v: string[]) => void) => {
    setter(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  // Waste rows ops
  const addWasteRow = () =>
    setWasteTypes([...wasteTypes, { wasteType: "", quantityValue: "", quantityUnit: "ton", quantity: "", currentDestination: "" }]);
  const removeWasteRow = (i: number) => setWasteTypes(wasteTypes.filter((_, idx) => idx !== i));
  const updateWaste = (i: number, patch: Partial<WasteRow>) => {
    const next = [...wasteTypes];
    next[i] = { ...next[i], ...patch };
    if (patch.quantityValue !== undefined || patch.quantityUnit !== undefined) {
      const v = patch.quantityValue ?? next[i].quantityValue;
      const u = patch.quantityUnit ?? next[i].quantityUnit;
      next[i].quantity = v ? `${v} ${u}/mes` : "";
    }
    setWasteTypes(next);
  };

  const buildPayload = () => ({
    ...existing,
    wasteTypes,
    scheduling: {
      proposedDate: date || null,
      proposedTime: time || null,
      siteAddress: siteAddress.trim() || null,
      contactName: contactName.trim() || null,
      contactRole: contactRole.trim() || null,
      contactPhone: contactPhone.trim() || null,
      contactEmail: contactEmail.trim() || null,
      participantsByArea: {
        comercial: partComercial,
        operaciones: partOperaciones,
        subproductos: partSubproductos,
      },
      responsibleIds: allParticipants,
      responsibleNames: participantsInfo.map((m) => m.name),
      responsibleEmails: participantsInfo.map((m) => m.email),
      epp,
      accessRequirements: accessReqs,
      accessRequirementsOther: accessReqsOther.trim() || null,
      vehiclePlates: vehiclePlates.trim() || null,
      deliveryDate: deliveryDate || null,
      notes: notes.trim() || null,
    },
  });

  const handleDraft = async () => {
    try {
      await updateProspect.mutateAsync({
        id: prospecto.id,
        levantamientoData: buildPayload(),
        // Si el usuario empezó a capturar fecha, la persistimos también en
        // surveyDate para que aparezca en el stats row del drawer.
        ...(date ? { surveyDate: date } : {}),
      });
      toast({ title: "Borrador guardado", description: "Puedes volver a abrir para completar." });
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al guardar borrador";
      toast({ title: "No se pudo guardar el borrador", description: msg, variant: "destructive" });
    }
  };

  const handleAdvance = async () => {
    if (!canAdvance) {
      toast({ title: `Faltan: ${missing.join(", ")}`, variant: "destructive" });
      return;
    }
    try {
      await updateProspect.mutateAsync({
        id: prospecto.id,
        stage: STAGE.PROPUESTA,
        surveyDate: date,
        levantamientoData: buildPayload(),
      });
      toast({ title: "Levantamiento agendado" });
      onAdvanced?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al agendar levantamiento";
      toast({ title: "No se pudo agendar", description: msg, variant: "destructive" });
    }
  };

  const fromLabel = KANBAN_STAGES.find((s) => s.id === prospecto.status)?.label || "Reunión";
  const toLabel = KANBAN_STAGES.find((s) => s.id === STAGE.PROPUESTA)?.label || "Agendar levantamiento";
  const owner = teamMembers.find((m) => m.id === prospecto.assignedToId);
  const wasteCategories = [...new Set(WASTE_TYPES_CATALOG.map((w) => w.category))];

  const renderArea = (
    label: string,
    color: string,
    members: TeamMemberRow[],
    selected: number[],
    setter: React.Dispatch<React.SetStateAction<number[]>>,
    emptyLabel: string,
  ) => (
    <div>
      <Label className="text-[11px] font-semibold" style={{ color }}>{label}</Label>
      {members.length === 0 ? (
        <p className="mt-1 text-[11px] italic text-[#9ca3af]">{emptyLabel}</p>
      ) : (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {members.map((m) => {
            const active = selected.includes(m.id);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => toggleId(setter)(m.id)}
                className="rounded-full px-2.5 py-1 text-xs font-medium transition-colors flex items-center gap-1.5"
                style={active ? { backgroundColor: color, color: "white" } : { backgroundColor: "#f3f4f6", color: "#6b7280" }}
              >
                <span className="w-4 h-4 rounded-full bg-white/25 flex items-center justify-center text-[9px] font-bold">
                  {m.codigo || m.name.split(" ").map((n) => n[0]).join("").substring(0, 2)}
                </span>
                {m.name.split(" ").slice(0, 2).join(" ")}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-lg bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-[#00a8a8]" />
            <h2 className="text-lg font-bold">Agendar Levantamiento</h2>
          </div>
          <button onClick={onClose} className="text-[#6b7280] hover:text-[#1c2c4a]">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Context */}
        <div className="px-6 pt-4">
          <div className="rounded-lg bg-[#f9fafb] px-3 py-2">
            <div className="text-sm font-semibold text-[#1c2c4a]">{prospecto.empresa}</div>
            <div className="text-xs text-[#6b7280]">{prospecto.ciudad} · {prospecto.industria}</div>
          </div>
          <div className="flex items-center gap-2 text-sm mt-3">
            <span className="rounded bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">{fromLabel}</span>
            <ChevronRight className="h-4 w-4 text-[#6b7280]" />
            <span className="rounded bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-800">{toLabel}</span>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Captura todo lo que ya tengas. Si te falta información, guárdalo como borrador y completa después.
          </p>
        </div>

        {/* Fields */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Fecha + hora */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Fecha *</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Hora *</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1" />
            </div>
          </div>

          {/* Ejecutivo responsable (read-only) */}
          <div>
            <Label className="text-xs">Ejecutivo responsable</Label>
            <div className="mt-1 h-9 flex items-center rounded-md border border-input bg-[#f9fafb] px-3 text-sm text-[#1c2c4a]">
              {owner ? owner.name : <span className="text-[#9ca3af]">Sin asignar — asígnalo desde el Kanban</span>}
            </div>
          </div>

          {/* Dirección */}
          <div>
            <Label className="text-xs flex items-center gap-1">
              <MapPin className="h-3 w-3" /> Dirección del sitio *
            </Label>
            <Input
              value={siteAddress}
              onChange={(e) => setSiteAddress(e.target.value)}
              placeholder="Calle, número, colonia, ciudad, estado, CP"
              className="mt-1"
            />
          </div>

          {/* Contacto en sitio */}
          <div>
            <Label className="text-xs flex items-center gap-1 mb-2">
              <Phone className="h-3 w-3" /> Contacto que recibe en sitio
            </Label>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label className="text-[11px]">Nombre *</Label>
                <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Quien recibe" className="mt-1 h-9 text-sm" />
              </div>
              <div>
                <Label className="text-[11px]">Puesto</Label>
                <Input value={contactRole} onChange={(e) => setContactRole(e.target.value)} placeholder="Ej: Gerente de Planta" className="mt-1 h-9 text-sm" />
              </div>
              <div>
                <Label className="text-[11px]">Teléfono</Label>
                <Input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="55 1234 5678" className="mt-1 h-9 text-sm" />
              </div>
              <div>
                <Label className="text-[11px]">Correo</Label>
                <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="contacto@empresa.com" className="mt-1 h-9 text-sm" />
              </div>
            </div>
          </div>

          {/* Participantes por área */}
          <div>
            <Label className="text-xs flex items-center gap-1">
              <Users className="h-3 w-3" /> Participantes por área *
            </Label>
            <p className="text-[10px] text-muted-foreground mb-2">
              Selecciona quién de cada área asistirá al levantamiento.
            </p>
            <div className="space-y-3">
              {renderArea(
                "Comercial",
                "#00a8a8",
                teamMembers.filter((m) => !m.areaSlug || m.areaSlug === "comercial"),
                partComercial,
                setPartComercial,
                "Sin usuarios en Comercial",
              )}
              {renderArea(
                "Operaciones",
                "#0D47A1",
                teamMembers.filter((m) => m.areaSlug === "operaciones"),
                partOperaciones,
                setPartOperaciones,
                "Sin usuarios en Operaciones",
              )}
              {renderArea(
                "Subproductos",
                "#F57C00",
                teamMembers.filter((m) => m.areaSlug === "subproductos"),
                partSubproductos,
                setPartSubproductos,
                "Sin usuarios en Subproductos",
              )}
            </div>
          </div>

          {/* EPP */}
          <div>
            <Label className="text-xs flex items-center gap-1">
              <HardHat className="h-3 w-3" /> EPP necesario
            </Label>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {EPP_OPTIONS.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => toggleInList(epp, e.id, setEpp)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                    epp.includes(e.id)
                      ? "bg-[#F57C00] text-white"
                      : "bg-[#f3f4f6] text-[#6b7280] hover:bg-[#e5e7eb]"
                  }`}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </div>

          {/* Requisitos de acceso */}
          <div>
            <Label className="text-xs flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> Requisitos de acceso
            </Label>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {ACCESS_REQUIREMENTS_OPTIONS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => toggleInList(accessReqs, r.id, setAccessReqs)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                    accessReqs.includes(r.id)
                      ? "bg-[#7C3AED] text-white"
                      : "bg-[#f3f4f6] text-[#6b7280] hover:bg-[#e5e7eb]"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <Input
              value={accessReqsOther}
              onChange={(e) => setAccessReqsOther(e.target.value)}
              placeholder="Otros requisitos (texto libre)"
              className="mt-2"
            />
          </div>

          {/* Placas de vehículos */}
          <div>
            <Label className="text-xs flex items-center gap-1">
              <Car className="h-3 w-3" /> Placas de vehículos
            </Label>
            <Input
              value={vehiclePlates}
              onChange={(e) => setVehiclePlates(e.target.value)}
              placeholder="Ej: ABC-123-A, XYZ-987-B"
              className="mt-1"
            />
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Separa con coma si son varios.
            </p>
          </div>

          {/* Residuos con unidad kg/ton */}
          <div>
            <Label className="text-xs flex items-center gap-1 mb-2">
              <Recycle className="h-3 w-3" /> Tipos de residuo (opcional en borrador)
            </Label>
            {wasteTypes.length === 0 && (
              <p className="text-[11px] text-muted-foreground mb-2">Agrega residuos con su volumen mensual.</p>
            )}
            {wasteTypes.map((row, i) => (
              <div key={i} className="mb-2 rounded-lg border p-2.5">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[11px] font-medium">Residuo #{i + 1}</span>
                  <button type="button" onClick={() => removeWasteRow(i)} className="text-[#9ca3af] hover:text-red-500">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <div>
                    <Label className="text-[11px]">Tipo</Label>
                    <select
                      value={row.wasteType}
                      onChange={(e) => updateWaste(i, { wasteType: e.target.value })}
                      className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
                    >
                      <option value="">Seleccionar...</option>
                      {wasteCategories.map((cat) => (
                        <optgroup key={cat} label={cat}>
                          {WASTE_TYPES_CATALOG.filter((w) => w.category === cat).map((w) => (
                            <option key={w.id} value={w.id}>{w.label}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-[11px]">Cantidad mensual</Label>
                    <div className="mt-1 flex items-stretch gap-1">
                      <Input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="any"
                        value={row.quantityValue}
                        onChange={(e) => updateWaste(i, { quantityValue: e.target.value })}
                        placeholder="18"
                        className="h-9 flex-1 text-sm"
                      />
                      <div className="inline-flex shrink-0 overflow-hidden rounded-md border border-input">
                        <button
                          type="button"
                          onClick={() => updateWaste(i, { quantityUnit: "kg" })}
                          className={`px-2 text-[11px] font-medium ${
                            row.quantityUnit === "kg" ? "bg-[#00a8a8] text-white" : "bg-background text-[#6b7280]"
                          }`}
                        >kg</button>
                        <button
                          type="button"
                          onClick={() => updateWaste(i, { quantityUnit: "ton" })}
                          className={`px-2 text-[11px] font-medium ${
                            row.quantityUnit === "ton" ? "bg-[#00a8a8] text-white" : "bg-background text-[#6b7280]"
                          }`}
                        >ton</button>
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label className="text-[11px]">Destino actual</Label>
                    <Input
                      value={row.currentDestination}
                      onChange={(e) => updateWaste(i, { currentDestination: e.target.value })}
                      placeholder="Ej: relleno sanitario"
                      className="mt-1 h-9 text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addWasteRow}>
              <Plus className="mr-1 h-3 w-3" /> Agregar residuo
            </Button>
          </div>

          {/* Notas */}
          <div>
            <Label className="text-xs">Notas</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Ej: llegar por la puerta de carga, preguntar por Juan..."
              className="mt-1"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-6 py-3 gap-3">
          <div className="text-[11px] text-muted-foreground">
            {canAdvance
              ? "Listo para agendar y avanzar."
              : `Para avanzar faltan: ${missing.join(", ")}.`}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button
              variant="outline"
              onClick={handleDraft}
              disabled={updateProspect.isPending}
              title="Guardar sin avanzar de etapa"
            >
              <Save className="mr-1 h-4 w-4" />
              {updateProspect.isPending ? "Guardando..." : "Guardar borrador"}
            </Button>
            <Button
              onClick={handleAdvance}
              disabled={!canAdvance || updateProspect.isPending}
              className="bg-[#00a8a8] hover:bg-[#008b8b]"
            >
              {updateProspect.isPending ? "Agendando..." : "Agendar y avanzar"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
