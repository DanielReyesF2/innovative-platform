import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  data: any;
  onSave: (data: any) => void;
  disabled?: boolean;
}

export default function GeneralesSection({ data, onSave, disabled }: Props) {
  const [form, setForm] = useState({
    siteType: data?.siteType || "",
    siteTypeOther: data?.siteTypeOther || "",
    address: data?.address || "",
  });

  useEffect(() => {
    setForm({
      siteType: data?.siteType || "",
      siteTypeOther: data?.siteTypeOther || "",
      address: data?.address || "",
    });
  }, [data]);

  const handleChange = (field: string, value: string) => {
    const updated = { ...form, [field]: value };
    setForm(updated);
    onSave(updated);
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
        <Label>Direccion</Label>
        <Input
          value={form.address}
          onChange={(e) => handleChange("address", e.target.value)}
          disabled={disabled}
          className="mt-1"
          placeholder="Direccion completa del sitio..."
        />
      </div>
    </div>
  );
}
