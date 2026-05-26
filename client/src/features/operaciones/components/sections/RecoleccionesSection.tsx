import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  data: any;
  onSave: (data: any) => void;
  disabled?: boolean;
}

const WEIGHING_TYPES = ["Báscula camionera", "Báscula de piso", "Otra"];

const SCHEDULE_PRESETS = [
  "Lunes a Viernes 7:00 - 18:00",
  "Lunes a Sábado 6:00 - 20:00",
  "24/7",
  "Solo turno matutino",
];

const STAY_PRESETS = ["1 hora", "2 horas", "4 horas", "8 horas", "Sin límite"];

function ChipRow({
  value,
  options,
  onSelect,
  disabled,
}: {
  value: string;
  options: string[];
  onSelect: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const selected = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onSelect(opt)}
            disabled={disabled}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
              selected
                ? "bg-[#0D47A1]/10 border-[#0D47A1]/40 text-[#0D47A1]"
                : "bg-white border-[#e5e7eb] text-[#6b7280] hover:border-[#0D47A1]/30"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

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
    const updated = checked ? [...current, type] : current.filter((v: string) => v !== type);
    update("weighingTypes", updated);
  };

  return (
    <div className="space-y-5">
      {/* Bloque: Horarios */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 rounded-full bg-[#0D47A1]" />
          <Label className="text-sm font-semibold text-[#0D47A1]">Horarios y acceso</Label>
        </div>
        <div className="rounded-lg border bg-white p-4 space-y-4">
          <div>
            <Label>Horario de carga/descarga</Label>
            <ChipRow
              value={form.loadingSchedule || ""}
              options={SCHEDULE_PRESETS}
              onSelect={(v) => update("loadingSchedule", v)}
              disabled={disabled}
            />
            <Input
              value={form.loadingSchedule || ""}
              onChange={(e) => update("loadingSchedule", e.target.value)}
              disabled={disabled}
              className="mt-2 h-9 text-sm"
              placeholder="O escribe horario custom..."
            />
            <Input
              value={form.loadingScheduleObs || ""}
              onChange={(e) => update("loadingScheduleObs", e.target.value)}
              disabled={disabled}
              className="mt-2 h-8 text-sm"
              placeholder="Observaciones..."
            />
          </div>
          <div>
            <Label>Documentos requeridos para entrada</Label>
            <Input
              value={form.entryDocuments || ""}
              onChange={(e) => update("entryDocuments", e.target.value)}
              disabled={disabled}
              className="mt-1 h-9 text-sm"
              placeholder="Ej: Factura, carta porte..."
            />
            <Input
              value={form.entryDocumentsObs || ""}
              onChange={(e) => update("entryDocumentsObs", e.target.value)}
              disabled={disabled}
              className="mt-2 h-8 text-sm"
              placeholder="Observaciones..."
            />
          </div>
          <div>
            <Label>Tiempo máximo de estadía</Label>
            <ChipRow
              value={form.maxStayTime || ""}
              options={STAY_PRESETS}
              onSelect={(v) => update("maxStayTime", v)}
              disabled={disabled}
            />
            <Input
              value={form.maxStayTime || ""}
              onChange={(e) => update("maxStayTime", e.target.value)}
              disabled={disabled}
              className="mt-2 h-9 text-sm"
              placeholder="O escribe custom..."
            />
            <Input
              value={form.maxStayTimeObs || ""}
              onChange={(e) => update("maxStayTimeObs", e.target.value)}
              disabled={disabled}
              className="mt-2 h-8 text-sm"
              placeholder="Observaciones..."
            />
          </div>
        </div>
      </div>

      {/* Bloque: Pesaje */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 rounded-full bg-[#2E7D32]" />
          <Label className="text-sm font-semibold text-[#2E7D32]">Pesaje</Label>
        </div>
        <div className="rounded-lg border bg-white p-4 space-y-3">
          <div className="flex flex-wrap gap-3">
            {WEIGHING_TYPES.map((w) => {
              const checked = (form.weighingTypes || []).includes(w);
              return (
                <button
                  key={w}
                  type="button"
                  onClick={() => handleWeighing(w, !checked)}
                  disabled={disabled}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    checked
                      ? "bg-[#2E7D32]/10 border-[#2E7D32]/40 text-[#2E7D32]"
                      : "bg-white border-[#e5e7eb] text-[#6b7280] hover:border-[#2E7D32]/30"
                  }`}
                >
                  {w}
                </button>
              );
            })}
          </div>
          <Input
            value={form.weighingObs || ""}
            onChange={(e) => update("weighingObs", e.target.value)}
            disabled={disabled}
            placeholder="Observaciones de pesaje..."
            className="h-9 text-sm"
          />
        </div>
      </div>
    </div>
  );
}
