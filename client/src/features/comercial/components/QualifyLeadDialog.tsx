import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateProspect } from "../api";
import { useToast } from "@/components/ui/use-toast";
import { ArrowRight, UserCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { KANBAN_STAGES } from "@/lib/comercial-constants";

const INDUSTRIES = [
  "Manufactura",
  "Alimentos",
  "Retail",
  "Logistica",
  "Salud",
  "Hoteleria",
  "Construccion",
  "Automotriz",
  "Bebidas",
  "Farmaceutica",
  "Otro",
];

const WASTE_TYPES = [
  "Carton/Papel",
  "Plastico",
  "Metal",
  "Organico",
  "Madera",
  "Vidrio",
  "Peligroso",
  "Electronico",
  "Textil",
  "Otro",
];

interface QualifyLeadDialogProps {
  prospect: any;
  onClose: () => void;
  onQualified?: () => void;
}

export function QualifyLeadDialog({ prospect, onClose, onQualified }: QualifyLeadDialogProps) {
  const [step, setStep] = useState(1);

  // Step 1: Business data
  const [business, setBusiness] = useState({
    industry: prospect.industria || "",
    location: prospect.ciudad || "",
    potential: "Medio",
    estimatedValue: "",
  });

  // Step 2: Waste info
  const [waste, setWaste] = useState({
    wasteTypes: [] as string[],
    estimatedVolume: "",
    hasCurrentProvider: false,
    currentProviderName: "",
    reasonForChange: "",
  });

  const updateProspect = useUpdateProspect();
  const { toast } = useToast();

  const setBiz = (key: string, val: string) => setBusiness({ ...business, [key]: val });

  const toggleWasteType = (type: string) => {
    setWaste((prev) => ({
      ...prev,
      wasteTypes: prev.wasteTypes.includes(type)
        ? prev.wasteTypes.filter((t) => t !== type)
        : [...prev.wasteTypes, type],
    }));
  };

  const handleSubmit = async () => {
    try {
      await updateProspect.mutateAsync({
        id: prospect.id,
        industry: business.industry || undefined,
        location: business.location.trim() || undefined,
        potential: business.potential || undefined,
        estimatedValue: business.estimatedValue || undefined,
        estimatedVolume: waste.estimatedVolume.trim() || undefined,
        levantamientoData: waste.wasteTypes.length > 0
          ? {
              qualificationWaste: {
                wasteTypes: waste.wasteTypes,
                estimatedVolume: waste.estimatedVolume.trim(),
                hasCurrentProvider: waste.hasCurrentProvider,
                currentProviderName: waste.currentProviderName.trim() || undefined,
                reasonForChange: waste.reasonForChange.trim() || undefined,
              },
            }
          : undefined,
        stage: "presentacion",
        probability: 20,
      });
      toast({ title: "Lead calificado exitosamente" });
      onQualified?.();
    } catch {
      toast({ title: "Error al calificar lead", variant: "destructive" });
    }
  };

  const fromLabel = KANBAN_STAGES.find(s => s.id === prospect.status)?.label || "Lead Nuevo";
  const toLabel = KANBAN_STAGES.find(s => s.id === "presentacion")?.label || "Reunión";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-lg bg-background shadow-lg">
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

        {/* Prospect info + step indicator */}
        <div className="space-y-3 px-6 pt-4">
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="text-sm font-medium">{prospect.empresa || prospect.name}</div>
            <div className="text-xs text-muted-foreground">
              {prospect.contacto?.nombre || prospect.contactName}
              {(prospect.contacto?.telefono || prospect.contactPhone) && ` · ${prospect.contacto?.telefono || prospect.contactPhone}`}
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
              {fromLabel}
            </span>
            <ArrowRight className="h-4 w-4" />
            <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
              {toLabel}
            </span>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  step >= 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                1
              </div>
              <span className={`text-xs ${step === 1 ? "font-medium" : "text-muted-foreground"}`}>
                Negocio
              </span>
            </div>
            <div className="h-px flex-1 bg-border" />
            <div className="flex items-center gap-1.5">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  step >= 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                2
              </div>
              <span className={`text-xs ${step === 2 ? "font-medium" : "text-muted-foreground"}`}>
                Residuos
              </span>
            </div>
          </div>
        </div>

        {/* Step content */}
        <div className="space-y-4 px-6 py-4">
          {step === 1 && (
            <>
              <div>
                <Label>Industria / Giro</Label>
                <select
                  value={business.industry}
                  onChange={(e) => setBiz("industry", e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Seleccionar...</option>
                  {INDUSTRIES.map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Ubicacion</Label>
                <Input
                  value={business.location}
                  onChange={(e) => setBiz("location", e.target.value)}
                  placeholder="Ej: CDMX, Monterrey, Guadalajara..."
                  className="mt-1"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Potencial</Label>
                  <select
                    value={business.potential}
                    onChange={(e) => setBiz("potential", e.target.value)}
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
                    value={business.estimatedValue}
                    onChange={(e) => setBiz("estimatedValue", e.target.value)}
                    placeholder="0.00"
                    className="mt-1"
                  />
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <Label>Tipos de residuo que genera</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {WASTE_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleWasteType(type)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        waste.wasteTypes.includes(type)
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Volumen estimado mensual</Label>
                <Input
                  value={waste.estimatedVolume}
                  onChange={(e) => setWaste({ ...waste, estimatedVolume: e.target.value })}
                  placeholder="Ej: 120 ton/mes"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Tiene proveedor de residuos actualmente?</Label>
                <div className="mt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setWaste({ ...waste, hasCurrentProvider: false })}
                    className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                      !waste.hasCurrentProvider
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={() => setWaste({ ...waste, hasCurrentProvider: true })}
                    className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                      waste.hasCurrentProvider
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    Si
                  </button>
                </div>
              </div>

              {waste.hasCurrentProvider && (
                <>
                  <div>
                    <Label>Nombre del proveedor</Label>
                    <Input
                      value={waste.currentProviderName}
                      onChange={(e) => setWaste({ ...waste, currentProviderName: e.target.value })}
                      placeholder="Ej: PASA, Veolia..."
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Razon de cambio</Label>
                    <textarea
                      value={waste.reasonForChange}
                      onChange={(e) => setWaste({ ...waste, reasonForChange: e.target.value })}
                      placeholder="Por que buscan cambiar de proveedor?"
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      rows={2}
                    />
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between border-t px-6 py-3">
          <div>
            {step === 2 && (
              <Button variant="ghost" onClick={() => setStep(1)}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Atras
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            {step === 1 && (
              <Button onClick={() => setStep(2)}>
                Siguiente
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            )}
            {step === 2 && (
              <Button onClick={handleSubmit} disabled={updateProspect.isPending}>
                {updateProspect.isPending ? "Calificando..." : "Calificar Lead"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
