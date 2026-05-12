import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  data: any;
  onSave: (data: any) => void;
  disabled?: boolean;
}

export default function AreaOperacionSection({ data, onSave, disabled }: Props) {
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
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label>Largo (metros)</Label>
          <Input
            type="number"
            value={form.length ?? ""}
            onChange={(e) => update("length", e.target.value ? Number(e.target.value) : null)}
            disabled={disabled}
            className="mt-1"
            placeholder="0"
          />
        </div>
        <div>
          <Label>Ancho (metros)</Label>
          <Input
            type="number"
            value={form.width ?? ""}
            onChange={(e) => update("width", e.target.value ? Number(e.target.value) : null)}
            disabled={disabled}
            className="mt-1"
            placeholder="0"
          />
        </div>
        <div>
          <Label>Alto (metros)</Label>
          <Input
            type="number"
            value={form.height ?? ""}
            onChange={(e) => update("height", e.target.value ? Number(e.target.value) : null)}
            disabled={disabled}
            className="mt-1"
            placeholder="0"
          />
        </div>
      </div>
      {form.length && form.width && (
        <p className="text-sm text-muted-foreground">
          Superficie: {(form.length * form.width).toLocaleString("es-MX")} m²
          {form.height ? ` — Volumen: ${(form.length * form.width * form.height).toLocaleString("es-MX")} m³` : ""}
        </p>
      )}
      <div className="flex items-start gap-4 p-3 rounded-lg border">
        <div className="flex items-center gap-2 min-w-[200px]">
          <input
            type="checkbox"
            checked={form.covered === true}
            onChange={(e) => update("covered", e.target.checked)}
            disabled={disabled}
            className="h-4 w-4 rounded border-gray-300"
          />
          <Label className="cursor-pointer">Área cubierta (techada)</Label>
        </div>
        <Input
          value={form.coveredObs || ""}
          onChange={(e) => update("coveredObs", e.target.value)}
          disabled={disabled}
          placeholder="Observaciones..."
          className="flex-1 h-8 text-sm"
        />
      </div>
    </div>
  );
}
