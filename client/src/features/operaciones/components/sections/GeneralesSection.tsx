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
    <div className="space-y-5">
      {/* Bloque: Datos del cliente */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 rounded-full bg-[#0067B0]" />
          <Label className="text-sm font-semibold text-[#0067B0]">Datos del sitio</Label>
        </div>
        <div className="rounded-lg border bg-white p-4 space-y-4">
          <div>
            <Label>Nombre del cliente</Label>
            <Input value={data?.clientName || ""} disabled className="mt-1 bg-muted" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Tipo de sitio</Label>
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
        </div>
      </div>

      {/* Bloque: Turnos */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 rounded-full bg-[#7C3AED]" />
          <Label className="text-sm font-semibold text-[#7C3AED]">Turnos de trabajo</Label>
        </div>
        <div className="rounded-lg border bg-white p-4 space-y-3">
          <div className="flex flex-wrap gap-3">
            {SHIFT_OPTIONS.map((shift) => {
              const checked = form.shifts.includes(shift);
              return (
                <button
                  key={shift}
                  type="button"
                  onClick={() => toggleShift(shift, !checked)}
                  disabled={disabled}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    checked
                      ? "bg-[#7C3AED]/10 border-[#7C3AED]/40 text-[#7C3AED]"
                      : "bg-white border-[#e5e7eb] text-[#6b7280] hover:border-[#7C3AED]/30"
                  }`}
                >
                  {shift}
                </button>
              );
            })}
          </div>
          <Input
            value={form.shiftsObs}
            onChange={(e) => handleChange("shiftsObs", e.target.value)}
            disabled={disabled}
            placeholder="Horarios u observaciones de turnos..."
            className="h-9 text-sm"
          />
        </div>
      </div>
    </div>
  );
}
