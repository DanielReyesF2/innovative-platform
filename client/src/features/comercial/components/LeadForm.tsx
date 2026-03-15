import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateProspect } from "../api";
import { useToast } from "@/components/ui/use-toast";

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
  salesTeam?: any[];
  defaultAssignee?: number;
}

export function LeadForm({ onClose, salesTeam, defaultAssignee }: LeadFormProps) {
  const [form, setForm] = useState({
    companyName: "",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    source: "referido",
    notes: "",
    assignedToId: defaultAssignee ? String(defaultAssignee) : "",
  });

  const createProspect = useCreateProspect();
  const { toast } = useToast();

  const set = (key: string, val: string) => setForm({ ...form, [key]: val });

  const handleSubmit = async () => {
    if (!form.companyName.trim() || !form.contactName.trim()) {
      toast({ title: "Empresa y nombre de contacto son requeridos", variant: "destructive" });
      return;
    }

    try {
      await createProspect.mutateAsync({
        name: form.companyName.trim(),
        contactName: form.contactName.trim(),
        contactPhone: form.contactPhone.trim() || undefined,
        contactEmail: form.contactEmail.trim() || undefined,
        source: form.source,
        stage: "contacto_inicial",
        probability: 10,
        priority: "media",
        reason: form.notes.trim() || undefined,
        assignedToId: form.assignedToId ? Number(form.assignedToId) : undefined,
      });
      toast({ title: "Lead creado exitosamente" });
      onClose();
    } catch {
      toast({ title: "Error al crear lead", variant: "destructive" });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-background shadow-lg">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-bold">Nuevo Lead</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>

        <div className="space-y-4 p-6">
          <p className="text-sm text-muted-foreground">
            Ingresa la informacion de contacto inicial. Los datos de negocio se agregan al calificar como prospecto.
          </p>

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
                {salesTeam.map((m: any) => (
                  <option key={m.dbUserId} value={m.dbUserId}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          )}

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

        <div className="flex justify-end gap-2 border-t px-6 py-3">
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
