import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateProspect } from "../api";
import { useToast } from "@/components/ui/use-toast";
import { SERVICIOS_INNOVATIVE } from "@/lib/comercial-constants";
import { STAGE } from "@shared/schema/comercial-stages";
import type { TeamMember } from "@shared/types/comercial";

const SOURCE_LABELS: Record<string, string> = {
  referido: "Referido",
  web: "Web",
  linkedin: "LinkedIn",
  evento: "Evento",
  cold_call: "Cold Call",
  otro: "Otro",
};

interface LeadFormProps {
  onClose: () => void;
  salesTeam?: TeamMember[];
  defaultAssignee?: number;
}

export function LeadForm({ onClose, salesTeam, defaultAssignee }: LeadFormProps) {
  const [form, setForm] = useState({
    companyName: "",
    contactName: "",
    contactRole: "",
    contactPhone: "",
    contactEmail: "",
    source: "referido",
    notes: "",
    assignedToId: defaultAssignee ? String(defaultAssignee) : "",
    firstContactDate: new Date().toISOString().split("T")[0],
    services: [] as string[],
  });

  const createProspect = useCreateProspect();
  const { toast } = useToast();

  const set = (key: string, val: string) => setForm({ ...form, [key]: val });

  const toggleService = (svcId: string) => {
    setForm(prev => ({
      ...prev,
      services: prev.services.includes(svcId)
        ? prev.services.filter(s => s !== svcId)
        : [...prev.services, svcId],
    }));
  };

  const handleSubmit = async () => {
    if (!form.companyName.trim() || !form.contactName.trim()) {
      toast({ title: "Empresa y nombre de contacto son requeridos", variant: "destructive" });
      return;
    }

    try {
      await createProspect.mutateAsync({
        name: form.companyName.trim(),
        contactName: form.contactName.trim(),
        contactRole: form.contactRole.trim() || undefined,
        contactPhone: form.contactPhone.trim() || undefined,
        contactEmail: form.contactEmail.trim() || undefined,
        source: form.source,
        stage: STAGE.CONTACTO_INICIAL,
        probability: 10,
        priority: "media",
        reason: form.notes.trim() || undefined,
        services: form.services.length > 0 ? form.services : undefined,
        assignedToId: form.assignedToId ? Number(form.assignedToId) : undefined,
        firstContactDate: form.firstContactDate || undefined,
      });
      toast({ title: "Lead creado exitosamente" });
      onClose();
    } catch (err) {
      // apiRequest arroja Error(`${status}: ${text}`) — extraemos el mensaje
      // real del servidor para que el usuario vea POR QUÉ falló (Zod, FK,
      // length, lo que sea) en lugar del toast genérico que esconde bugs.
      const raw = err instanceof Error ? err.message : "Error al crear lead";
      let detail = raw;
      try {
        const colonIdx = raw.indexOf(": ");
        if (colonIdx > 0) {
          const body = raw.slice(colonIdx + 2);
          const parsed = JSON.parse(body);
          detail = parsed.message || body;
          if (parsed.errors && Array.isArray(parsed.errors)) {
            const first = parsed.errors[0];
            if (first?.path && first?.message) {
              detail = `${detail} — ${first.path.join(".")} ${first.message}`;
            }
          }
          // Servidor puede añadir `detail` con el error crudo de la DB
          // (FK violation, check constraint, etc.) — lo mostramos para que
          // quien prueba (Vero/Cristina) nos diga el texto exacto.
          if (parsed.detail) {
            detail = `${detail} · ${parsed.detail}`;
          }
        }
      } catch {
        // raw ya es el mejor mensaje disponible
      }
      toast({ title: "No se pudo crear el lead", description: detail, variant: "destructive" });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md max-h-[90vh] flex flex-col rounded-lg bg-background shadow-lg">
        <div className="flex items-center justify-between border-b px-6 py-4 shrink-0">
          <h2 className="text-lg font-bold">Nuevo Lead</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>

        <div className="space-y-4 p-6 overflow-y-auto">
          <p className="text-sm text-muted-foreground">
            Ingresa la informacion de contacto inicial. Los datos de negocio se agregan al calificar como prospecto.
          </p>

          {defaultAssignee && salesTeam && (() => {
            const registrant = salesTeam.find((m: TeamMember) => m.dbUserId === defaultAssignee);
            if (!registrant) return null;
            return (
              <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
                <span className="text-xs text-muted-foreground">Registrado por:</span>
                <span className="text-xs font-medium">{registrant.name}</span>
              </div>
            );
          })()}

          <div>
            <Label>Empresa *</Label>
            <Input
              value={form.companyName}
              onChange={(e) => set("companyName", e.target.value)}
              placeholder="Nombre de la empresa"
              className="mt-1"
            />
          </div>

          <div>
            <Label>Nombre de contacto *</Label>
            <Input
              value={form.contactName}
              onChange={(e) => set("contactName", e.target.value)}
              placeholder="Nombre completo"
              className="mt-1"
            />
          </div>

          <div>
            <Label>Cargo / Puesto</Label>
            <Input
              value={form.contactRole}
              onChange={(e) => set("contactRole", e.target.value)}
              placeholder="Ej: Gerente de Planta"
              className="mt-1"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Telefono</Label>
              <Input
                value={form.contactPhone}
                onChange={(e) => set("contactPhone", e.target.value)}
                placeholder="(55) 1234-5678"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={form.contactEmail}
                onChange={(e) => set("contactEmail", e.target.value)}
                placeholder="email@empresa.com"
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label>Fecha primer contacto</Label>
            <Input
              type="date"
              value={form.firstContactDate}
              onChange={(e) => set("firstContactDate", e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label>Fuente</Label>
            <select
              value={form.source}
              onChange={(e) => set("source", e.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {Object.entries(SOURCE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {salesTeam && salesTeam.length > 0 && (
            <div>
              <Label>Ejecutivo asignado</Label>
              <select
                value={form.assignedToId}
                onChange={(e) => set("assignedToId", e.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Sin asignar</option>
                {salesTeam.map((m: TeamMember) => (
                  <option key={m.dbUserId} value={m.dbUserId}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <Label>Servicios de interés</Label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {SERVICIOS_INNOVATIVE.map(svc => (
                <button
                  key={svc.id}
                  type="button"
                  onClick={() => toggleService(svc.id)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                    form.services.includes(svc.id)
                      ? "bg-[#00a8a8] text-white"
                      : "bg-[#f3f4f6] text-[#6b7280] hover:bg-[#e5e7eb]"
                  }`}
                >
                  {svc.nombre}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Notas</Label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Contexto inicial, como llego el contacto..."
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              rows={2}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t px-6 py-3 shrink-0">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={createProspect.isPending}>
            {createProspect.isPending ? "Creando..." : "Crear Lead"}
          </Button>
        </div>
      </div>
    </div>
  );
}
