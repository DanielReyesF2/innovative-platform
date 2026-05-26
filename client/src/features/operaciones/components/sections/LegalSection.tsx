import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  data: any;
  onSave: (data: any) => void;
  disabled?: boolean;
}

const PPE_OPTIONS = ["Casco", "Chaleco", "Botas", "Guantes", "Lentes", "Tapones auditivos"];

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

  const togglePpe = (item: string, checked: boolean) => {
    const current: string[] = form.ppeRequired || [];
    const next = checked ? [...current, item] : current.filter((v) => v !== item);
    update("ppeRequired", next);
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

      {/* EPP — movido desde Personal */}
      <div className="p-3 rounded-lg border space-y-3">
        <Label className="font-semibold">EPP requerido</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {PPE_OPTIONS.map((item) => (
            <label key={item} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={(form.ppeRequired || []).includes(item)}
                onChange={(e) => togglePpe(item, e.target.checked)}
                disabled={disabled}
                className="h-4 w-4 rounded border-gray-300"
              />
              {item}
            </label>
          ))}
        </div>
        <Input
          value={form.ppeObs || ""}
          onChange={(e) => update("ppeObs", e.target.value)}
          disabled={disabled}
          placeholder="Observaciones EPP..."
          className="h-8 text-sm"
        />
      </div>

      {/* Credencial — movido desde Personal */}
      <div className="p-3 rounded-lg border space-y-3">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.credentialRequired === true}
            onChange={(e) => update("credentialRequired", e.target.checked)}
            disabled={disabled}
            className="h-4 w-4 rounded border-gray-300"
          />
          <Label className="cursor-pointer">Credencial de acceso requerida</Label>
        </div>
        <div className="pl-6">
          <Input
            value={form.credentialObs || ""}
            onChange={(e) => update("credentialObs", e.target.value)}
            disabled={disabled}
            placeholder="Observaciones..."
            className="h-8 text-sm"
          />
        </div>
      </div>

      {/* Uniforme — movido desde Personal */}
      <div className="p-3 rounded-lg border space-y-3">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.uniformRequired === true}
            onChange={(e) => update("uniformRequired", e.target.checked)}
            disabled={disabled}
            className="h-4 w-4 rounded border-gray-300"
          />
          <Label className="cursor-pointer">Uniforme requerido</Label>
        </div>
        <div className="pl-6">
          <Input
            value={form.uniformObs || ""}
            onChange={(e) => update("uniformObs", e.target.value)}
            disabled={disabled}
            placeholder="Observaciones..."
            className="h-8 text-sm"
          />
        </div>
      </div>
    </div>
  );
}
