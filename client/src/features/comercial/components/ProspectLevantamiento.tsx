import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useProspect, useUpdateProspect, useSendToOperaciones } from "../api";
import { useToast } from "@/components/ui/use-toast";
import { EPP_OPTIONS, WASTE_TYPES_CATALOG } from "@/lib/comercial-constants";
import type { User } from "@shared/schema/common";
import {
  CalendarCheck, HardHat, Save, Recycle,
  Send, CheckCircle, Users, Phone, Mail,
  ChevronDown, ChevronRight, Trash2, Plus,
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

// ─── Section: Tipos de Residuo ───
function WasteTypesSection({ data, onChange }: { data: Record<string, unknown>[]; onChange: (d: Record<string, unknown>[]) => void }) {
  const addRow = () => onChange([...data, { wasteType: "", quantity: "", currentDestination: "" }]);
  const removeRow = (i: number) => onChange(data.filter((_, idx) => idx !== i));
  const updateRow = (i: number, key: string, val: string) => {
    const updated = [...data];
    updated[i] = { ...updated[i], [key]: val } as Record<string, unknown>;
    onChange(updated);
  };
  const categories = [...new Set(WASTE_TYPES_CATALOG.map(w => w.category))];

  return (
    <CollapsibleSection title="Tipos de Residuo" icon={<Recycle className="h-4 w-4" />} defaultOpen>
      {data.length === 0 && <p className="mb-3 text-sm text-muted-foreground">Agrega al menos un tipo de residuo</p>}
      {data.map((row: Record<string, unknown>, i: number) => {
        const currentType = row.wasteType as string;
        const isLegacyValue = currentType && !WASTE_TYPES_CATALOG.some(w => w.id === currentType || w.label === currentType);
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
              <Field label="Cantidad" value={row.quantity} onChange={(v) => updateRow(i, "quantity", v)} placeholder="Ej: 18 ton/mes" />
              <Field label="Destino Actual" value={row.currentDestination} onChange={(v) => updateRow(i, "currentDestination", v)} />
            </div>
          </div>
        );
      })}
      <Button variant="outline" size="sm" onClick={addRow}><Plus className="mr-1 h-3 w-3" /> Agregar residuo</Button>
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

  // Team members for responsable dropdown
  const { data: teamMembers = [] } = useQuery<Pick<User, "id" | "name" | "codigo" | "email">[]>({
    queryKey: ["/api/auth/team"],
    staleTime: 5 * 60 * 1000,
  });

  // Scheduling state
  const [schedDate, setSchedDate] = useState("");
  const [schedTime, setSchedTime] = useState("");
  const [schedResponsibles, setSchedResponsibles] = useState<number[]>([]);
  const [schedEpp, setSchedEpp] = useState<string[]>([]);
  const [schedContactName, setSchedContactName] = useState("");
  const [schedContactPhone, setSchedContactPhone] = useState("");
  const [schedContactEmail, setSchedContactEmail] = useState("");
  const [schedNotes, setSchedNotes] = useState("");

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
      setSchedResponsibles((sched.responsibleIds as number[]) || []);
      setSchedEpp((sched.epp as string[]) || []);
      setSchedContactName((sched.contactName as string) || "");
      setSchedContactPhone((sched.contactPhone as string) || "");
      setSchedContactEmail((sched.contactEmail as string) || "");
      setSchedNotes((sched.notes as string) || "");
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

  // Preserve any existing levantamientoData (generalInfo, wasteTypes, etc.) and update scheduling
  const existingData = (prospect?.levantamientoData || {}) as Record<string, unknown>;
  const buildFullData = () => ({
    ...existingData,
    wasteTypes,
    scheduling: {
      proposedDate: schedDate,
      proposedTime: schedTime,
      responsibleIds: schedResponsibles,
      responsibleNames: schedResponsibles.map(id => teamMembers.find(m => m.id === id)?.name || "").filter(Boolean),
      responsibleEmails: schedResponsibles.map(id => teamMembers.find(m => m.id === id)?.email || "").filter(Boolean),
      epp: schedEpp,
      contactName: schedContactName.trim(),
      contactPhone: schedContactPhone.trim(),
      contactEmail: schedContactEmail.trim(),
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
    if (schedResponsibles.length === 0) {
      toast({ title: "Selecciona al menos un responsable", variant: "destructive" });
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
    ["contacto_inicial", "presentacion", "levantamiento"].includes(prospect.stage) &&
    !prospect.surveyId;

  const sentToOps = prospect?.sentToOpsAt;

  const toggleResponsible = (id: number) => {
    setSchedResponsibles(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
  };

  const toggleEpp = (id: string) => {
    setSchedEpp(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]);
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
        </div>
        <CardContent className="pt-0 space-y-4">
          {/* Date & Time */}
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

          {/* Responsables (multi-select from team) */}
          <div>
            <Label className="text-xs flex items-center gap-1">
              <Users className="h-3 w-3" /> Responsables del Levantamiento *
            </Label>
            <p className="text-[10px] text-muted-foreground mb-2">Selecciona quién(es) irán al levantamiento</p>
            <div className="flex flex-wrap gap-1.5">
              {teamMembers.map(member => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => toggleResponsible(member.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    schedResponsibles.includes(member.id)
                      ? "bg-[#00a8a8] text-white"
                      : "bg-[#f3f4f6] text-[#6b7280] hover:bg-[#e5e7eb]"
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[9px] font-bold">
                    {member.codigo || member.name.split(" ").map(n => n[0]).join("").substring(0, 2)}
                  </span>
                  {member.name.split(" ").slice(0, 2).join(" ")}
                </button>
              ))}
            </div>
            {schedResponsibles.length > 0 && (
              <div className="mt-2 text-[10px] text-[#6b7280]">
                {schedResponsibles.map(id => {
                  const m = teamMembers.find(t => t.id === id);
                  return m ? `${m.name} (${m.email})` : "";
                }).filter(Boolean).join(" · ")}
              </div>
            )}
          </div>

          {/* Contacto en sitio */}
          <div>
            <Label className="text-xs flex items-center gap-1 mb-2">
              <Phone className="h-3 w-3" /> Contacto que recibe en sitio
            </Label>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Nombre" value={schedContactName} onChange={setSchedContactName} placeholder="Quien recibe" />
              <Field label="Teléfono" value={schedContactPhone} onChange={setSchedContactPhone} placeholder="55 1234 5678" />
              <div>
                <Label className="text-xs">Correo</Label>
                <Input type="email" value={schedContactEmail} onChange={(e) => setSchedContactEmail(e.target.value)} placeholder="contacto@empresa.com" className="mt-1" />
              </div>
            </div>
          </div>

          {/* EPP (multi-select chips) */}
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

          {/* Notes */}
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
