import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  data: any;
  onSave: (data: any) => void;
  disabled?: boolean;
}

const TOGGLE_ITEMS = [
  { key: "credentialRequired", obsKey: "credentialObs", label: "Credencial requerida" },
  { key: "diningArea", obsKey: "diningObs", label: "Comedor disponible" },
  { key: "restroomsAvailable", obsKey: "restroomsObs", label: "Sanitarios disponibles" },
  { key: "hydrationProvided", obsKey: "hydrationObs", label: "Hidratación proporcionada" },
  { key: "transportProvided", obsKey: "transportObs", label: "Transporte proporcionado" },
  { key: "uniformRequired", obsKey: "uniformObs", label: "Uniforme requerido" },
];

const SHIFTS = ["1er turno", "2do turno", "3er turno"];
const PPE_OPTIONS = ["Casco", "Chaleco", "Botas", "Guantes", "Lentes", "Tapones auditivos"];

export default function PersonalSection({ data, onSave, disabled }: Props) {
  const [form, setForm] = useState<any>(data || {});

  useEffect(() => {
    setForm(data || {});
  }, [data]);

  const update = (key: string, value: any) => {
    const updated = { ...form, [key]: value };
    setForm(updated);
    onSave(updated);
  };

  const handleArrayToggle = (field: string, item: string, checked: boolean) => {
    const current = form[field] || [];
    const updated = checked
      ? [...current, item]
      : current.filter((v: string) => v !== item);
    update(field, updated);
  };

  return (
    <div className="space-y-4">
      {/* Shifts */}
      <div className="p-3 rounded-lg border">
        <Label className="mb-2 block">Turnos de trabajo</Label>
        <div className="flex gap-4 mb-2">
          {SHIFTS.map((s) => (
            <label key={s} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={(form.shifts || []).includes(s)}
                onChange={(e) => handleArrayToggle("shifts", s, e.target.checked)}
                disabled={disabled}
                className="h-4 w-4 rounded border-gray-300"
              />
              {s}
            </label>
          ))}
        </div>
        <Input
          value={form.shiftsObs || ""}
          onChange={(e) => update("shiftsObs", e.target.value)}
          disabled={disabled}
          placeholder="Horarios..."
          className="h-8 text-sm"
        />
      </div>

      {/* PPE */}
      <div className="p-3 rounded-lg border">
        <Label className="mb-2 block">EPP Requerido</Label>
        <div className="flex flex-wrap gap-3 mb-2">
          {PPE_OPTIONS.map((p) => (
            <label key={p} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={(form.ppeRequired || []).includes(p)}
                onChange={(e) => handleArrayToggle("ppeRequired", p, e.target.checked)}
                disabled={disabled}
                className="h-4 w-4 rounded border-gray-300"
              />
              {p}
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

      {/* Toggle items */}
      {TOGGLE_ITEMS.map((item) => (
        <div key={item.key} className="flex items-start gap-4 p-3 rounded-lg border">
          <div className="flex items-center gap-2 min-w-[200px]">
            <input
              type="checkbox"
              checked={form[item.key] === true}
              onChange={(e) => update(item.key, e.target.checked)}
              disabled={disabled}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label className="cursor-pointer">{item.label}</Label>
          </div>
          <Input
            value={form[item.obsKey] || ""}
            onChange={(e) => update(item.obsKey, e.target.value)}
            disabled={disabled}
            placeholder="Observaciones..."
            className="flex-1 h-8 text-sm"
          />
        </div>
      ))}
    </div>
  );
}
