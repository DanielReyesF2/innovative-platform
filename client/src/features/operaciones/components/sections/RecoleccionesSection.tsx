import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  data: any;
  onSave: (data: any) => void;
  disabled?: boolean;
}

const WEIGHING_TYPES = ["Báscula camionera", "Báscula de piso", "Otra"];

export default function RecoleccionesSection({ data, onSave, disabled }: Props) {
  const [form, setForm] = useState<any>(data || {});

  useEffect(() => {
    setForm(data || {});
  }, [data]);

  const update = (key: string, value: any) => {
    const updated = { ...form, [key]: value };
    setForm(updated);
    onSave(updated);
  };

  const handleWeighing = (type: string, checked: boolean) => {
    const current = form.weighingTypes || [];
    const updated = checked
      ? [...current, type]
      : current.filter((v: string) => v !== type);
    update("weighingTypes", updated);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Horario de carga/descarga</Label>
          <Input
            value={form.loadingSchedule || ""}
            onChange={(e) => update("loadingSchedule", e.target.value)}
            disabled={disabled}
            className="mt-1"
            placeholder="Ej: Lunes a Viernes 07:00-18:00"
          />
          <Input
            value={form.loadingScheduleObs || ""}
            onChange={(e) => update("loadingScheduleObs", e.target.value)}
            disabled={disabled}
            className="mt-1 h-8 text-sm"
            placeholder="Observaciones..."
          />
        </div>
        <div>
          <Label>Documentos de entrada</Label>
          <Input
            value={form.entryDocuments || ""}
            onChange={(e) => update("entryDocuments", e.target.value)}
            disabled={disabled}
            className="mt-1"
            placeholder="Ej: Factura, carta porte..."
          />
          <Input
            value={form.entryDocumentsObs || ""}
            onChange={(e) => update("entryDocumentsObs", e.target.value)}
            disabled={disabled}
            className="mt-1 h-8 text-sm"
            placeholder="Observaciones..."
          />
        </div>
      </div>
      <div className="p-3 rounded-lg border">
        <Label className="mb-2 block">Tipos de pesaje</Label>
        <div className="flex gap-4 mb-2">
          {WEIGHING_TYPES.map((w) => (
            <label key={w} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={(form.weighingTypes || []).includes(w)}
                onChange={(e) => handleWeighing(w, e.target.checked)}
                disabled={disabled}
                className="h-4 w-4 rounded border-gray-300"
              />
              {w}
            </label>
          ))}
        </div>
        <Input
          value={form.weighingObs || ""}
          onChange={(e) => update("weighingObs", e.target.value)}
          disabled={disabled}
          placeholder="Observaciones de pesaje..."
          className="h-8 text-sm"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Tiempo máximo de estadía</Label>
          <Input
            value={form.maxStayTime || ""}
            onChange={(e) => update("maxStayTime", e.target.value)}
            disabled={disabled}
            className="mt-1"
            placeholder="Ej: 2 horas"
          />
        </div>
        <div>
          <Label>Observaciones de estadía</Label>
          <Input
            value={form.maxStayTimeObs || ""}
            onChange={(e) => update("maxStayTimeObs", e.target.value)}
            disabled={disabled}
            className="mt-1"
            placeholder="Observaciones..."
          />
        </div>
      </div>
    </div>
  );
}
