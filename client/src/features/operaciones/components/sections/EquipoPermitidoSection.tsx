import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  data: any;
  onSave: (data: any) => void;
  disabled?: boolean;
}

const ITEMS = [
  { key: "scale", obsKey: "scaleObs", label: "Báscula" },
  { key: "press", obsKey: "pressObs", label: "Prensa" },
  { key: "forklift", obsKey: "forkliftObs", label: "Montacargas" },
  { key: "palletJack", obsKey: "palletJackObs", label: "Patín hidráulico" },
];

export default function EquipoPermitidoSection({ data, onSave, disabled }: Props) {
  const [form, setForm] = useState<any>(data || {});

  useEffect(() => { setForm(data || {}); }, [data]);

  const update = (key: string, value: any) => {
    const updated = { ...form, [key]: value };
    setForm(updated);
    onSave(updated);
  };

  return (
    <div className="space-y-4">
      {ITEMS.map((item) => (
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
