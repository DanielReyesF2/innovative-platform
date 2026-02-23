import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useConvertLead } from "../api";
import { useToast } from "@/components/ui/use-toast";
import { ArrowRight, UserCheck } from "lucide-react";

interface QualifyLeadDialogProps {
  lead: any;
  onClose: () => void;
  onConverted?: () => void;
}

export function QualifyLeadDialog({ lead, onClose, onConverted }: QualifyLeadDialogProps) {
  const [form, setForm] = useState({
    industry: "",
    location: "",
    potential: "Medio",
    estimatedValue: "",
  });

  const convertLead = useConvertLead();
  const { toast } = useToast();

  const set = (key: string, val: string) => setForm({ ...form, [key]: val });

  const handleSubmit = async () => {
    try {
      await convertLead.mutateAsync({
        id: lead.id,
        industry: form.industry.trim() || undefined,
        location: form.location.trim() || undefined,
        potential: form.potential || undefined,
        estimatedValue: form.estimatedValue || undefined,
      });
      toast({ title: "Lead calificado como prospecto" });
      onConverted?.();
      onClose();
    } catch {
      toast({ title: "Error al calificar lead", variant: "destructive" });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-background shadow-lg">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">Calificar Lead</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>

        <div className="space-y-4 p-6">
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="text-sm font-medium">{lead.companyName}</div>
            <div className="text-xs text-muted-foreground">
              {lead.contactName}
              {lead.contactPhone && ` · ${lead.contactPhone}`}
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
              Lead
            </span>
            <ArrowRight className="h-4 w-4" />
            <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
              Prospecto
            </span>
          </div>

          <p className="text-sm text-muted-foreground">
            Agrega informacion del negocio para convertir este lead en prospecto.
            Estos campos son opcionales y se pueden completar despues.
          </p>

          <div>
            <Label>Industria / Giro</Label>
            <Input
              value={form.industry}
              onChange={(e) => set("industry", e.target.value)}
              placeholder="Ej: Manufactura, Hoteleria, Restaurantes..."
              className="mt-1"
            />
          </div>

          <div>
            <Label>Ubicacion</Label>
            <Input
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="Ej: CDMX, Monterrey, Guadalajara..."
              className="mt-1"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Potencial</Label>
              <select
                value={form.potential}
                onChange={(e) => set("potential", e.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="Bajo">Bajo</option>
                <option value="Medio">Medio</option>
                <option value="Alto">Alto</option>
                <option value="Muy Alto">Muy Alto</option>
              </select>
            </div>
            <div>
              <Label>Valor estimado ($)</Label>
              <Input
                type="number"
                value={form.estimatedValue}
                onChange={(e) => set("estimatedValue", e.target.value)}
                placeholder="0.00"
                className="mt-1"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t px-6 py-3">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={convertLead.isPending}>
            {convertLead.isPending ? "Convirtiendo..." : "Crear Prospecto"}
          </Button>
        </div>
      </div>
    </div>
  );
}
