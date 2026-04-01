import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateProspect } from "../api";
import { useToast } from "@/components/ui/use-toast";
import { X, Save } from "lucide-react";
import { INDUSTRIAS, SERVICIOS_INNOVATIVE } from "@/lib/comercial-constants";

interface ProspectEditDialogProps {
  prospect: any;
  onClose: () => void;
  onSaved?: () => void;
}

export function ProspectEditDialog({ prospect, onClose, onSaved }: ProspectEditDialogProps) {
  const p = prospect;
  const updateProspect = useUpdateProspect();
  const { toast } = useToast();

  // Map kanban object → form state (using API field names)
  const [form, setForm] = useState({
    name: p.empresa || "",
    location: p.ciudad || "",
    industry: p.industria || "",
    services: p.servicios || [],
    contactName: p.contacto?.nombre || "",
    contactRole: p.contacto?.puesto || "",
    contactPhone: p.contacto?.telefono || "",
    contactEmail: p.contacto?.correo || "",
    potential: p.potential || "Medio",
    probability: p.probability ?? "",
    estimatedValue: p.facturacionEstimada || p.propuesta?.ventaTotal || "",
    estimatedVolume: p.volumenEstimado || "",
    estimatedCloseTime: p.estimatedCloseTime || "",
    priority: p.priority || "media",
    nextStep: p.comentarios || "",
    reason: p.reason || "",
  });

  const set = (key: string, val: any) => setForm((prev) => ({ ...prev, [key]: val }));

  const toggleService = (svcId: string) => {
    setForm((prev) => ({
      ...prev,
      services: prev.services.includes(svcId)
        ? prev.services.filter((s: string) => s !== svcId)
        : [...prev.services, svcId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast({ title: "El nombre de empresa es requerido", variant: "destructive" });
      return;
    }
    try {
      await updateProspect.mutateAsync({
        id: p.id,
        name: form.name.trim(),
        location: form.location.trim() || undefined,
        industry: form.industry || undefined,
        services: form.services.length > 0 ? form.services : undefined,
        contactName: form.contactName.trim() || undefined,
        contactRole: form.contactRole.trim() || undefined,
        contactPhone: form.contactPhone.trim() || undefined,
        contactEmail: form.contactEmail.trim() || undefined,
        potential: form.potential || undefined,
        probability: form.probability !== "" ? Number(form.probability) : undefined,
        estimatedValue: form.estimatedValue !== "" ? String(form.estimatedValue) : undefined,
        estimatedVolume: form.estimatedVolume.trim() || undefined,
        estimatedCloseTime: form.estimatedCloseTime || undefined,
        priority: form.priority || undefined,
        nextStep: form.nextStep.trim() || undefined,
        reason: form.reason.trim() || undefined,
      });
      toast({ title: "Prospecto actualizado" });
      onSaved?.();
    } catch {
      toast({ title: "Error al actualizar", variant: "destructive" });
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[85vh] rounded-lg bg-white shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-bold text-[#1c2c4a]">Editar Prospecto</h2>
          <button onClick={onClose} className="text-[#6b7280] hover:text-[#1c2c4a]">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Empresa */}
          <div>
            <h3 className="text-sm font-semibold text-[#1c2c4a] mb-3 border-b pb-1">Empresa</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Empresa *</Label>
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} className="mt-1" required />
              </div>
              <div>
                <Label className="text-xs">Ubicacion</Label>
                <Input value={form.location} onChange={(e) => set("location", e.target.value)} className="mt-1" placeholder="Ej: CDMX" />
              </div>
              <div>
                <Label className="text-xs">Industria</Label>
                <select
                  value={form.industry}
                  onChange={(e) => set("industry", e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Seleccionar...</option>
                  {INDUSTRIAS.map((ind) => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Servicios</Label>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {SERVICIOS_INNOVATIVE.map((svc) => (
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
            </div>
          </div>

          {/* Contacto */}
          <div>
            <h3 className="text-sm font-semibold text-[#1c2c4a] mb-3 border-b pb-1">Contacto</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Nombre</Label>
                <Input value={form.contactName} onChange={(e) => set("contactName", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Puesto</Label>
                <Input value={form.contactRole} onChange={(e) => set("contactRole", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Telefono</Label>
                <Input value={form.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input type="email" value={form.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} className="mt-1" />
              </div>
            </div>
          </div>

          {/* Comercial */}
          <div>
            <h3 className="text-sm font-semibold text-[#1c2c4a] mb-3 border-b pb-1">Comercial</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Potencial</Label>
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
                <Label className="text-xs">Probabilidad %</Label>
                <Input type="number" min={0} max={100} value={form.probability} onChange={(e) => set("probability", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Valor estimado ($)</Label>
                <Input type="number" value={form.estimatedValue} onChange={(e) => set("estimatedValue", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Volumen estimado</Label>
                <Input value={form.estimatedVolume} onChange={(e) => set("estimatedVolume", e.target.value)} className="mt-1" placeholder="Ej: 120 ton/mes" />
              </div>
              <div>
                <Label className="text-xs">Mes de cierre estimado</Label>
                <Input type="month" value={form.estimatedCloseTime} onChange={(e) => set("estimatedCloseTime", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Prioridad</Label>
                <select
                  value={form.priority}
                  onChange={(e) => set("priority", e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                  <option value="muy_alta">Muy Alta</option>
                </select>
              </div>
            </div>
          </div>

          {/* Seguimiento */}
          <div>
            <h3 className="text-sm font-semibold text-[#1c2c4a] mb-3 border-b pb-1">Seguimiento</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label className="text-xs">Siguiente paso</Label>
                <Input value={form.nextStep} onChange={(e) => set("nextStep", e.target.value)} className="mt-1" placeholder="Ej: Agendar reunión con gerente..." />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Razon de interes</Label>
                <Input value={form.reason} onChange={(e) => set("reason", e.target.value)} className="mt-1" placeholder="Ej: Busca certificación TRUE..." />
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t px-6 py-3">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={updateProspect.isPending}>
            <Save className="mr-1 h-4 w-4" />
            {updateProspect.isPending ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
