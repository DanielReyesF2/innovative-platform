import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { type CatalogItem, useCatalog } from "../../api";

interface SubItemApi {
  useItems: (surveyId: number | null) => { data: any };
  useCreate: () => { mutate: (vars: any, opts?: any) => void };
  useUpdate: () => { mutate: (vars: any, opts?: any) => void };
  useDelete: () => { mutate: (vars: any, opts?: any) => void };
}

/** Maps the conceptual fields (item/quantity/observations) to the actual column names in the backend table. */
export interface ChecklistFieldMap {
  item: string;
  quantity: string;
  observations: string;
}

const DEFAULT_FIELD_MAP: ChecklistFieldMap = {
  item: "item",
  quantity: "quantity",
  observations: "observations",
};

interface Props {
  surveyId: number;
  catalogCategory: string;
  api: SubItemApi;
  disabled?: boolean;
  itemLabel?: string;
  fieldMap?: ChecklistFieldMap;
}

interface RowProps {
  name: string;
  initialQuantity: number;
  initialObservations: string;
  disabled: boolean;
  onCommit: (name: string, quantity: number, observations: string) => void;
}

/**
 * One row per catalog item. Local state with debounced commit.
 * Re-mounts when initial values change (key = name + serverId).
 */
function ChecklistRow({ name, initialQuantity, initialObservations, disabled, onCommit }: RowProps) {
  const [quantity, setQuantity] = useState<number>(initialQuantity);
  const [observations, setObservations] = useState<string>(initialObservations);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const isInitialMount = useRef(true);

  // Commit on change (debounced)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onCommit(name, quantity, observations);
    }, 700);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quantity, observations]);

  const isSelected = quantity > 0;

  return (
    <div
      className={`grid grid-cols-[1fr_90px_1fr] sm:grid-cols-[minmax(220px,2fr)_100px_minmax(180px,3fr)] gap-3 items-center px-3 py-2.5 border-b last:border-0 transition-colors ${
        isSelected ? "bg-[#0067B0]/5" : "bg-white"
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

export default function CatalogChecklistSection({
  surveyId,
  catalogCategory,
  api,
  disabled,
  itemLabel = "Item",
  fieldMap = DEFAULT_FIELD_MAP,
}: Props) {
  const { toast } = useToast();
  const { data: catalog = [], isLoading } = useCatalog(catalogCategory);
  const items = api.useItems(surveyId);
  const createMut = api.useCreate();
  const updateMut = api.useUpdate();
  const deleteMut = api.useDelete();

  const byName = useMemo(() => {
    const m = new Map<string, any>();
    (items.data || []).forEach((it: any) => m.set(it[fieldMap.item] as string, it));
    return m;
  }, [items.data, fieldMap.item]);

  const selectedCount = useMemo(
    () => (items.data || []).filter((it: any) => Number(it[fieldMap.quantity] ?? 0) > 0).length,
    [items.data, fieldMap.quantity],
  );

  const onError = () => {
    toast({ title: "Error al guardar", variant: "destructive" });
  };

  const handleCommit = (name: string, quantity: number, observations: string) => {
    const existing = byName.get(name);

    if (existing && quantity <= 0) {
      deleteMut.mutate({ surveyId, itemId: existing.id }, { onError });
      return;
    }
    if (existing && quantity > 0) {
      const existingQty = Number(existing[fieldMap.quantity] ?? 0);
      const existingObs = (existing[fieldMap.observations] ?? "") as string;
      const qtyChanged = existingQty !== quantity;
      const obsChanged = existingObs !== observations;
      if (qtyChanged || obsChanged) {
        updateMut.mutate(
          {
            surveyId,
            itemId: existing.id,
            [fieldMap.quantity]: quantity,
            [fieldMap.observations]: observations,
          },
          { onError },
        );
      }
      return;
    }
    if (!existing && quantity > 0) {
      createMut.mutate(
        {
          surveyId,
          [fieldMap.item]: name,
          [fieldMap.quantity]: quantity,
          [fieldMap.observations]: observations,
        },
        { onError },
      );
    }
  };

  if (isLoading) {
    return <p className="text-center text-sm text-muted-foreground py-6">Cargando catálogo...</p>;
  }

  if (catalog.length === 0) {
    return <p className="text-center text-sm text-muted-foreground py-6">Catálogo vacío</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Pon la cantidad necesaria. Items con cantidad 0 no se incluyen en la propuesta.
        </p>
        <span className="text-xs font-semibold text-[#0067B0]">
          {selectedCount} de {catalog.length} con cantidad
        </span>
      </div>

      <div className="rounded-lg border bg-white overflow-hidden">
        <div className="grid grid-cols-[1fr_90px_1fr] sm:grid-cols-[minmax(220px,2fr)_100px_minmax(180px,3fr)] gap-3 px-3 py-2 border-b bg-[#fafafa] text-xs uppercase tracking-wide text-muted-foreground font-medium">
          <span>{itemLabel}</span>
          <span className="text-center">Cantidad</span>
          <span>Observaciones</span>
        </div>
        {catalog.map((c: CatalogItem) => {
          const existing = byName.get(c.name);
          return (
            <ChecklistRow
              key={`${c.id}-${existing?.id ?? "new"}`}
              name={c.name}
              initialQuantity={existing ? Number(existing[fieldMap.quantity] ?? 0) : 0}
              initialObservations={(existing?.[fieldMap.observations] ?? "") as string}
              disabled={!!disabled}
              onCommit={handleCommit}
            />
          );
        })}
      </div>
    </div>
  );
}
