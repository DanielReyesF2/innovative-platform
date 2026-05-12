import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  data: any;
  onSave: (data: any) => void;
  disabled?: boolean;
}

const ITEMS = [
  { key: "lighting", label: "Iluminación" },
  { key: "electricalOutlets", label: "Contactos eléctricos" },
  { key: "ventilation", label: "Ventilación" },
  { key: "drainage", label: "Drenaje" },
  { key: "waterSupply", label: "Suministro de agua" },
  { key: "loadingDock", label: "Andén de carga" },
  { key: "wifi", label: "WiFi disponible" },
  { key: "officeSpace", label: "Espacio de oficina" },
];

const VOLTAGES = ["110V", "220V", "440V"];

export default function InstalacionesSection({ data, onSave, disabled }: Props) {
  const [form, setForm] = useState<any>(data || {});

  useEffect(() => {
    setForm(data || {});
  }, [data]);

  const handleToggle = (key: string, value: boolean) => {
    const updated = { ...form, [key]: value };
    setForm(updated);
    onSave(updated);
  };

  const handleText = (key: string, value: string) => {
    const updated = { ...form, [key]: value };
    setForm(updated);
    onSave(updated);
  };

  const handleVoltage = (voltage: string, checked: boolean) => {
    const current = form.voltages || [];
    const updated = checked ? [...current, voltage] : current.filter((v: string) => v !== voltage);
    const newForm = { ...form, voltages: updated };
    setForm(newForm);
    onSave(newForm);
  };

  return (
    <div className="space-y-4">
      {ITEMS.map((item) => (
        <div key={item.key} className="flex items-start gap-4 p-3 rounded-lg border">
          <div className="flex items-center gap-2 min-w-[200px]">
            <input
              type="checkbox"
              checked={form[item.key] === true}
              onChange={(e) => handleToggle(item.key, e.target.checked)}
              disabled={disabled}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label className="cursor-pointer">{item.label}</Label>
          </div>
          <Input
            value={form[`${item.key}Obs`] || ""}
            onChange={(e) => handleText(`${item.key}Obs`, e.target.value)}
            disabled={disabled}
            placeholder="Observaciones..."
            className="flex-1 h-8 text-sm"
          />
        </div>
      ))}
      <div className="p-3 rounded-lg border">
        <Label className="mb-2 block">Voltajes disponibles</Label>
        <div className="flex gap-4">
          {VOLTAGES.map((v) => (
            <label key={v} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={(form.voltages || []).includes(v)}
                onChange={(e) => handleVoltage(v, e.target.checked)}
                disabled={disabled}
                className="h-4 w-4 rounded border-gray-300"
              />
              {v}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
