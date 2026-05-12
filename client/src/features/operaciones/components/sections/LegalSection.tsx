import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  data: any;
  onSave: (data: any) => void;
  disabled?: boolean;
}

export default function LegalSection({ data, onSave, disabled }: Props) {
  const [form, setForm] = useState<any>(data || {});

  useEffect(() => {
    setForm(data || {});
  }, [data]);

  const update = (key: string, value: any) => {
    const updated = { ...form, [key]: value };
    setForm(updated);
    onSave(updated);
  };

  return (
    <div className="space-y-4">
      <div className="p-3 rounded-lg border space-y-3">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.manifests === true}
            onChange={(e) => update("manifests", e.target.checked)}
            disabled={disabled}
            className="h-4 w-4 rounded border-gray-300"
          />
          <Label className="cursor-pointer">Manifiestos de residuos requeridos</Label>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 pl-6">
          <div>
            <Label className="text-xs text-muted-foreground">Frecuencia</Label>
            <Input
              value={form.manifestFrequency || ""}
              onChange={(e) => update("manifestFrequency", e.target.value)}
              disabled={disabled}
              placeholder="Ej: Mensual"
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Observaciones</Label>
            <Input
              value={form.manifestObs || ""}
              onChange={(e) => update("manifestObs", e.target.value)}
              disabled={disabled}
              placeholder="Observaciones..."
              className="h-8 text-sm"
            />
          </div>
        </div>
      </div>
      <div className="p-3 rounded-lg border space-y-3">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.traceabilityLetter === true}
            onChange={(e) => update("traceabilityLetter", e.target.checked)}
            disabled={disabled}
            className="h-4 w-4 rounded border-gray-300"
          />
          <Label className="cursor-pointer">Carta de trazabilidad requerida</Label>
        </div>
        <div className="pl-6">
          <Input
            value={form.traceabilityObs || ""}
            onChange={(e) => update("traceabilityObs", e.target.value)}
            disabled={disabled}
            placeholder="Observaciones..."
            className="h-8 text-sm"
          />
        </div>
      </div>
    </div>
  );
}
