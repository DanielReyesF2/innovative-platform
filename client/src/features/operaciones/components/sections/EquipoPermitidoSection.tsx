import { useEffect, useMemo, useRef, useState } from "react";
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

interface RowProps {
  name: string;
  initialQuantity: number;
  initialObservations: string;
  disabled: boolean;
  onChange: (name: string, quantity: number, observations: string) => void;
}

function EquipmentRow({ name, initialQuantity, initialObservations, disabled, onChange }: RowProps) {
  const [quantity, setQuantity] = useState<number>(initialQuantity);
  const [observations, setObservations] = useState<string>(initialObservations);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange(name, quantity, observations);
    }, 600);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quantity, observations]);

  const isSelected = quantity > 0;

  return (
    <div
      className={`grid grid-cols-[1fr_90px_1fr] sm:grid-cols-[minmax(220px,2fr)_100px_minmax(180px,3fr)] gap-3 items-center px-3 py-2.5 border-b last:border-0 transition-colors ${
        isSelected ? "bg-[#2E7D32]/5" : "bg-white"
      }`}
    >
      <span className={`text-sm ${isSelected ? "font-semibold text-[#1c2c4a]" : "text-[#1c2c4a]"}`}>
        {name}
      </span>
      <Input
        type="number"
        min={0}
        value={quantity || ""}
        onChange={(e) => setQuantity(Math.max(0, Number(e.target.value) || 0))}
        disabled={disabled}
        placeholder="0"
        className="h-9 text-sm text-center"
      />
      <Input
        value={observations}
        onChange={(e) => setObservations(e.target.value)}
        disabled={disabled || !isSelected}
        placeholder={isSelected ? "Observaciones..." : "—"}
        className="h-9 text-sm"
      />
    </div>
  );
}

export default function EquipoPermitidoSection({ data, onSave, disabled }: Props) {
  const { data: catalog = [], isLoading } = useCatalog("equipos");

  const items: AllowedEquipmentItem[] = useMemo(() => (data?.items as AllowedEquipmentItem[]) ?? [], [data?.items]);
  const byName = useMemo(() => new Map(items.map((it) => [it.item, it])), [items]);

  const selectedCount = items.filter((it) => (it.quantity ?? 0) > 0).length;

  const handleChange = (name: string, quantity: number, observations: string) => {
    let next: AllowedEquipmentItem[];
    const existing = byName.get(name);

    if (quantity <= 0) {
      next = items.filter((it) => it.item !== name);
    } else if (existing) {
      next = items.map((it) => (it.item === name ? { ...it, quantity, observations } : it));
    } else {
      next = [...items, { item: name, quantity, observations }];
    }

    onSave({ ...(data || {}), items: next });
  };

  if (isLoading) {
    return <p className="text-center text-sm text-muted-foreground py-6">Cargando catálogo...</p>;
  }

  if (catalog.length === 0) {
    return <p className="text-center text-sm text-muted-foreground py-6">Catálogo de equipos vacío</p>;
  }

  // Group by groupName (if present in catalog)
  const grouped = useMemo(() => {
    const hasGroups = catalog.some((c: any) => c.groupName);
    if (!hasGroups) return [{ groupName: null as string | null, items: catalog }];
    const map = new Map<string, any[]>();
    for (const c of catalog) {
      const key = c.groupName || "Otros";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    return Array.from(map.entries()).map(([groupName, groupItems]) => ({
      groupName: groupName as string | null,
      items: groupItems,
    }));
  }, [catalog]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Cantidad de cada equipo permitido en el sitio. Items con cantidad 0 quedan fuera.
        </p>
        <span className="text-xs font-semibold text-[#2E7D32]">
          {selectedCount} de {catalog.length} con cantidad
        </span>
      </div>

      <div className="rounded-lg border bg-white overflow-hidden">
        <div className="grid grid-cols-[1fr_90px_1fr] sm:grid-cols-[minmax(220px,2fr)_100px_minmax(180px,3fr)] gap-3 px-3 py-2 border-b bg-[#fafafa] text-xs uppercase tracking-wide text-muted-foreground font-medium">
          <span>Equipo</span>
          <span className="text-center">Cantidad</span>
          <span>Observaciones</span>
        </div>
        {grouped.map((group) => (
          <div key={group.groupName ?? "_default"}>
            {group.groupName && (
              <div className="px-3 py-1.5 bg-[#f3f4f6] border-b text-[11px] font-semibold uppercase tracking-wide text-[#2E7D32]">
                {group.groupName}
              </div>
            )}
            {group.items.map((c: any) => {
              const existing = byName.get(c.name);
              return (
                <EquipmentRow
                  key={c.id}
                  name={c.name}
                  initialQuantity={existing?.quantity ?? 0}
                  initialObservations={existing?.observations ?? ""}
                  disabled={!!disabled}
                  onChange={handleChange}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
