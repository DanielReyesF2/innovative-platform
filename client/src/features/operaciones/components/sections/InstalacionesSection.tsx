import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  data: any;
  onSave: (data: any) => void;
  disabled?: boolean;
}

interface GroupItem {
  key: string;
  label: string;
}

interface Group {
  title: string;
  color: string;
  items: GroupItem[];
}

const GROUPS: Group[] = [
  {
    title: "Servicios básicos",
    color: "#F57C00",
    items: [
      { key: "lighting", label: "Iluminación" },
      { key: "electricalOutlets", label: "Contactos eléctricos" },
      { key: "ventilation", label: "Ventilación" },
      { key: "drainage", label: "Drenaje" },
      { key: "waterSupply", label: "Suministro de agua" },
    ],
  },
  {
    title: "Infraestructura del sitio",
    color: "#0067B0",
    items: [
      { key: "loadingDock", label: "Andén de carga" },
      { key: "wifi", label: "WiFi disponible" },
      { key: "officeSpace", label: "Espacio de oficina" },
    ],
  },
  {
    title: "Servicios al personal",
    color: "#2E7D32",
    items: [
      { key: "diningArea", label: "Comedor disponible" },
      { key: "restroomsAvailable", label: "Sanitarios disponibles" },
      { key: "hydrationProvided", label: "Hidratación proporcionada" },
      { key: "transportProvided", label: "Transporte proporcionado" },
    ],
  },
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
    <div className="space-y-5">
      {GROUPS.map((group) => (
        <div key={group.title} className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 rounded-full" style={{ backgroundColor: group.color }} />
            <Label className="text-sm font-semibold" style={{ color: group.color }}>
              {group.title}
            </Label>
          </div>
          <div className="rounded-lg border bg-white divide-y">
            {group.items.map((item) => {
              const checked = form[item.key] === true;
              return (
                <div
                  key={item.key}
                  className={`flex flex-wrap items-center gap-3 px-3 py-2.5 transition-colors ${
                    checked ? "bg-[#0067B0]/5" : "bg-white"
                  }`}
                >
                  <label className="flex items-center gap-2 min-w-[200px] flex-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => handleToggle(item.key, e.target.checked)}
                      disabled={disabled}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className={`text-sm ${checked ? "font-semibold text-[#1c2c4a]" : "text-[#1c2c4a]"}`}>
                      {item.label}
                    </span>
                  </label>
                  <Input
                    value={form[`${item.key}Obs`] || ""}
                    onChange={(e) => handleText(`${item.key}Obs`, e.target.value)}
                    disabled={disabled || !checked}
                    placeholder={checked ? "Observaciones..." : "—"}
                    className="flex-1 min-w-[180px] h-8 text-sm"
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Voltajes — bloque aparte */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 rounded-full bg-[#7C3AED]" />
          <Label className="text-sm font-semibold text-[#7C3AED]">Voltajes disponibles</Label>
        </div>
        <div className="rounded-lg border bg-white p-3">
          <div className="flex gap-4">
            {VOLTAGES.map((v) => (
              <label key={v} className="flex items-center gap-2 text-sm cursor-pointer">
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
    </div>
  );
}
