import { STAGE } from "@shared/schema/comercial-stages";
import { ArrowRight, UserCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { KANBAN_STAGES } from "@/lib/comercial-constants";
import { useConvertLead, useUpdateProspect } from "../api";

interface QualifyProspect {
  id: number;
  empresa?: string;
  name?: string;
  industria?: string | null;
  industry?: string | null;
  ciudad?: string | null;
  location?: string | null;
  status?: string;
  contacto?: { nombre?: string; telefono?: string; puesto?: string; correo?: string };
  contactName?: string | null;
  contactPhone?: string | null;
  contactRole?: string | null;
  contactEmail?: string | null;
}

interface QualifyLeadDialogProps {
  prospect: QualifyProspect;
  isLead?: boolean;
  onClose: () => void;
  onQualified?: () => void;
}

// Siguiendo el flujo que definió Vero: Lead → Prospecto solo requiere los
// datos de contacto profundos + ubicación. Industria viene del Lead, y
// potencial / valor cotización / residuos se capturan más adelante.
export function QualifyLeadDialog({ prospect, isLead, onClose, onQualified }: QualifyLeadDialogProps) {
  const [form, setForm] = useState({
    contactRole: prospect.contacto?.puesto || prospect.contactRole || "",
    contactPhone: prospect.contacto?.telefono || prospect.contactPhone || "",
    contactEmail: prospect.contacto?.correo || prospect.contactEmail || "",
    location: prospect.ciudad || prospect.location || "",
    serviceFrequency: "",
  });

  const updateProspect = useUpdateProspect();
  const convertLead = useConvertLead();
  const { toast } = useToast();

  const setField = (key: string, val: string) => setForm((prev) => ({ ...prev, [key]: val }));

  const missing: string[] = [];
  if (!form.contactRole.trim()) missing.push("Cargo");
  if (!form.contactPhone.trim()) missing.push("Teléfono");
  if (!form.contactEmail.trim()) missing.push("Correo");
  if (!form.location.trim()) missing.push("Ubicación");
  const canSubmit = missing.length === 0;

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast({ title: `Faltan: ${missing.join(", ")}`, variant: "destructive" });
      return;
    }
    try {
      const payload = {
        contactRole: form.contactRole.trim(),
        contactPhone: form.contactPhone.trim(),
        contactEmail: form.contactEmail.trim(),
        location: form.location.trim(),
        serviceFrequency: form.serviceFrequency.trim() || undefined,
      };

      if (isLead) {
        await convertLead.mutateAsync({ id: prospect.id, ...payload });
      } else {
        await updateProspect.mutateAsync({
          id: prospect.id,
          ...payload,
          stage: STAGE.PRESENTACION,
          probability: 20,
        });
      }
      toast({ title: "Lead calificado a Prospecto" });
      onQualified?.();
    } catch {
      toast({ title: "Error al calificar el lead", variant: "destructive" });
    }
  };

  const fromLabel = KANBAN_STAGES.find((s) => s.id === prospect.status)?.label || "Lead";
  const toLabel = KANBAN_STAGES.find((s) => s.id === STAGE.PRESENTACION)?.label || "Prospecto";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-background shadow-lg flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">Calificar Lead</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>

        {/* Context */}
        <div className="space-y-3 px-6 pt-4">
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="text-sm font-medium">{prospect.empresa || prospect.name}</div>
            {(prospect.contacto?.nombre || prospect.contactName) && (
              <div className="text-xs text-muted-foreground">{prospect.contacto?.nombre || prospect.contactName}</div>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">{fromLabel}</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">{toLabel}</span>
          </div>
        </div>

        {/* Fields */}
        <div className="space-y-3 px-6 py-4">
          <div>
            <Label>Cargo *</Label>
            <Input
              value={form.contactRole}
              onChange={(e) => setField("contactRole", e.target.value)}
              placeholder="Ej: Gerente de Operaciones"
              className="mt-1"
            />
          </div>

          <div>
            <Label>Teléfono *</Label>
            <Input
              type="tel"
              value={form.contactPhone}
              onChange={(e) => setField("contactPhone", e.target.value)}
              placeholder="55 1234 5678"
              className="mt-1"
            />
          </div>

          <div>
            <Label>Correo *</Label>
            <Input
              type="email"
              value={form.contactEmail}
              onChange={(e) => setField("contactEmail", e.target.value)}
              placeholder="contacto@empresa.com"
              className="mt-1"
            />
          </div>

          <div>
            <Label>Ubicación *</Label>
            <Input
              value={form.location}
              onChange={(e) => setField("location", e.target.value)}
              placeholder="Ej: CDMX, Monterrey, Guadalajara..."
              className="mt-1"
            />
          </div>

          <div>
            <Label>Frecuencia del servicio</Label>
            <Input
              value={form.serviceFrequency}
              onChange={(e) => setField("serviceFrequency", e.target.value)}
              placeholder="Ej: Mensual, quincenal, bajo demanda (opcional)"
              className="mt-1"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Opcional. Puedes dejarlo en blanco si aún no se definió.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-6 py-3">
          <div className="text-[11px] text-muted-foreground">* Requerido</div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={!canSubmit || updateProspect.isPending || convertLead.isPending}>
              {updateProspect.isPending || convertLead.isPending ? "Calificando..." : "Calificar Lead"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
