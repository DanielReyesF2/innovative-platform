import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { useCatalog } from "../../api";

interface AllowedEquipmentItem {
  item: string;
  quantity: number;
  observations?: string | null;
}

interface Props {
  data: any;
  onSave: (data: any) => void;
  disabled?: boolean;
}

export default function EquipoPermitidoSection({ data, onSave, disabled }: Props) {
  const { data: catalog = [], isLoading } = useCatalog("equipos");
  const [items, setItems] = useState<AllowedEquipmentItem[]>([]);

  // Hydrate from server data (new shape if present, else empty)
  useEffect(() => {
    const incoming = (data?.items as AllowedEquipmentItem[] | undefined) ?? [];
    setItems(incoming);
  }, [data]);

  const itemMap = useMemo(() => new Map(items.map((it) => [it.item, it])), [items]);

  const persist = (next: AllowedEquipmentItem[]) => {
    setItems(next);
    // Preserve any legacy fields by spreading existing data
    onSave({ ...(data || {}), items: next });
  };

  const toggle = (name: string, checked: boolean) => {
    if (checked) {
      if (!itemMap.has(name)) persist([...items, { item: name, quantity: 1, observations: "" }]);
    } else {
      persist(items.filter((it) => it.item !== name));
    }
  };

  const updateQty = (name: string, qty: number) => {
    persist(items.map((it) => (it.item === name ? { ...it, quantity: qty } : it)));
  };

  const updateObs = (name: string, obs: string) => {
    persist(items.map((it) => (it.item === name ? { ...it, observations: obs } : it)));
  };

  if (isLoading) {
    return <p className="text-center text-sm text-muted-foreground py-4">Cargando catálogo...</p>;
  }

  if (catalog.length === 0) {
    return <p className="text-center text-sm text-muted-foreground py-4">Catálogo vacío</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground mb-2">
        Selecciona los equipos permitidos en el sitio. Al marcar uno aparece la cantidad.
      </p>
      {catalog.map((cat: any) => {
        const name = cat.name as string;
        const selected = itemMap.get(name);
        const checked = !!selected;

        return (
          <div
            key={cat.id}
            className={`flex flex-wrap items-center gap-3 p-3 rounded-lg border transition-colors ${
              checked ? "border-[#0067B0]/30 bg-[#0067B0]/5" : "border-[#e5e7eb] bg-white"
            }`}
          >
            <label className="flex items-center gap-2 min-w-[260px] flex-1 cursor-pointer">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => toggle(name, e.target.checked)}
                disabled={disabled}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm font-medium text-[#1c2c4a]">{name}</span>
            </label>

            {checked && (
              <>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground">Cantidad</label>
                  <Input
                    type="number"
                    min={1}
                    value={selected?.quantity ?? 1}
                    onChange={(e) => updateQty(name, Math.max(1, Number(e.target.value) || 1))}
                    disabled={disabled}
                    className="h-8 w-20 text-sm"
                  />
                </div>
                <Input
                  value={selected?.observations ?? ""}
                  onChange={(e) => updateObs(name, e.target.value)}
                  disabled={disabled}
                  placeholder="Observaciones..."
                  className="flex-1 min-w-[180px] h-8 text-sm"
                />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
