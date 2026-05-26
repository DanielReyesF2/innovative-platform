import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  data: any;
  onSave: (data: any) => void;
  disabled?: boolean;
}

const SHIFT_OPTIONS = ["1er turno", "2do turno", "3er turno"];

export default function GeneralesSection({ data, onSave, disabled }: Props) {
  const [form, setForm] = useState({
    siteType: data?.siteType || "",
    siteTypeOther: data?.siteTypeOther || "",
    address: data?.address || "",
    shifts: (data?.shifts as string[]) || [],
    shiftsObs: data?.shiftsObs || "",
  });

  useEffect(() => {
    setForm({
      siteType: data?.siteType || "",
      siteTypeOther: data?.siteTypeOther || "",
      address: data?.address || "",
      shifts: (data?.shifts as string[]) || [],
      shiftsObs: data?.shiftsObs || "",
    });
  }, [data]);

  const handleChange = (field: string, value: any) => {
    const updated = { ...form, [field]: value };
    setForm(updated);
    onSave(updated);
  };

  const toggleShift = (shift: string, checked: boolean) => {
    const next = checked ? [...form.shifts, shift] : form.shifts.filter((s) => s !== shift);
    handleChange("shifts", next);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Nombre del Cliente</Label>
        <Input value={data?.clientName || ""} disabled className="mt-1 bg-muted" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Tipo de Sitio</Label>
          <select
            value={form.siteType}
            onChange={(e) => handleChange("siteType", e.target.value)}
            disabled={disabled}
            className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Seleccionar...</option>
            <option value="CEDIS">CEDIS</option>
            <option value="Planta">Planta</option>
            <option value="Otros">Otros</option>
          </select>
        </div>
        {form.siteType === "Otros" && (
          <div>
            <Label>Especificar tipo</Label>
            <Input
              value={form.siteTypeOther}
              onChange={(e) => handleChange("siteTypeOther", e.target.value)}
              disabled={disabled}
              className="mt-1"
              placeholder="Tipo de sitio..."
            />
          </div>
        )}
      </div>
      <div>
        <Label>Dirección</Label>
        <Input
          value={form.address}
          onChange={(e) => handleChange("address", e.target.value)}
          disabled={disabled}
          className="mt-1"
          placeholder="Dirección completa del sitio..."
        />
      </div>

      {/* Turnos de trabajo — movido desde Personal */}
      <div className="p-3 rounded-lg border space-y-3">
        <Label className="font-semibold">Turnos de trabajo</Label>
        <div className="flex flex-wrap gap-4">
          {SHIFT_OPTIONS.map((shift) => (
            <label key={shift} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.shifts.includes(shift)}
                onChange={(e) => toggleShift(shift, e.target.checked)}
                disabled={disabled}
                className="h-4 w-4 rounded border-gray-300"
              />
              {shift}
            </label>
          ))}
        </div>
        <Input
          value={form.shiftsObs}
          onChange={(e) => handleChange("shiftsObs", e.target.value)}
          disabled={disabled}
          placeholder="Horarios u observaciones de turnos..."
          className="h-8 text-sm"
        />
      </div>
    </div>
  );
}
