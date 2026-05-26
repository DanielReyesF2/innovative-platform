import { Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
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
  /** Allow users to add custom items not in the catalog. Renders an "Agregar manualmente" section. */
  allowManual?: boolean;
}

interface RowProps {
  name: string;
  initialQuantity: number;
  initialObservations: string;
  disabled: boolean;
  onCommit: (name: string, quantity: number, observations: string) => void;
  manual?: boolean;
  onDelete?: () => void;
}

function ChecklistRow({
  name,
  initialQuantity,
  initialObservations,
  disabled,
  onCommit,
  manual,
  onDelete,
}: RowProps) {
  const [quantity, setQuantity] = useState<number>(initialQuantity);
  const [observations, setObservations] = useState<string>(initialObservations);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const isInitialMount = useRef(true);

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
  const bgClass = manual
    ? isSelected
      ? "bg-amber-50/60"
      : "bg-amber-50/20"
    : isSelected
      ? "bg-[#0067B0]/5"
      : "bg-white";

  return (
    <div
      className={`grid grid-cols-[1fr_90px_1fr_auto] sm:grid-cols-[minmax(220px,2fr)_100px_minmax(180px,3fr)_auto] gap-3 items-center px-3 py-2.5 border-b last:border-0 transition-colors ${bgClass}`}
    >
      <span className={`text-sm flex items-center gap-2 ${isSelected ? "font-semibold text-[#1c2c4a]" : "text-[#1c2c4a]"}`}>
        {manual && (
          <span className="inline-flex text-[10px] uppercase tracking-wide font-bold text-amber-700 bg-amber-100 rounded px-1.5 py-0.5">
            Manual
          </span>
        )}
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
      {manual && onDelete ? (
        <button
          type="button"
          onClick={onDelete}
          disabled={disabled}
          className="text-muted-foreground hover:text-destructive p-1"
          title="Eliminar item manual"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ) : (
        <span className="w-6" />
      )}
    </div>
  );
}

function ManualEntryForm({
  disabled,
  onAdd,
  onCancel,
}: {
  disabled: boolean;
  onAdd: (name: string, quantity: number, observations: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState<number>(1);
  const [observations, setObservations] = useState("");

  const canSave = name.trim().length > 0 && quantity > 0;

  return (
    <div className="grid grid-cols-[1fr_90px_1fr_auto] sm:grid-cols-[minmax(220px,2fr)_100px_minmax(180px,3fr)_auto] gap-3 items-center px-3 py-2.5 border-b bg-amber-50/40">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nombre del item..."
        autoFocus
        className="h-9 text-sm"
      />
      <Input
        type="number"
        min={1}
        value={quantity || ""}
        onChange={(e) => setQuantity(Math.max(0, Number(e.target.value) || 0))}
        placeholder="0"
        className="h-9 text-sm text-center"
      />
      <Input
        value={observations}
        onChange={(e) => setObservations(e.target.value)}
        placeholder="Observaciones..."
        className="h-9 text-sm"
      />
      <div className="flex gap-1">
        <Button
          size="sm"
          onClick={() => canSave && onAdd(name.trim(), quantity, observations)}
          disabled={disabled || !canSave}
          className="h-8 text-xs"
        >
          Guardar
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onCancel}
          className="h-8 text-xs text-muted-foreground"
        >
          ✕
        </Button>
      </div>
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
  allowManual = false,
}: Props) {
  const { toast } = useToast();
  const { data: catalog = [], isLoading } = useCatalog(catalogCategory);
  const items = api.useItems(surveyId);
  const createMut = api.useCreate();
  const updateMut = api.useUpdate();
  const deleteMut = api.useDelete();

  const [manualFormOpen, setManualFormOpen] = useState(false);
  const [search, setSearch] = useState("");
  const showSearch = catalog.length >= 10;

  const byName = useMemo(() => {
    const m = new Map<string, any>();
    (items.data || []).forEach((it: any) => m.set(it[fieldMap.item] as string, it));
    return m;
  }, [items.data, fieldMap.item]);

  const catalogNames = useMemo(() => new Set(catalog.map((c: CatalogItem) => c.name)), [catalog]);

  // Items present in the survey but NOT in the catalog = manual entries
  const manualItems = useMemo(
    () => (items.data || []).filter((it: any) => !catalogNames.has(it[fieldMap.item] as string)),
    [items.data, catalogNames, fieldMap.item],
  );

  // Filter catalog by search query (case-insensitive substring on name + groupName)
  const filteredCatalog = useMemo(() => {
    if (!search.trim()) return catalog;
    const q = search.trim().toLowerCase();
    return catalog.filter(
      (c: CatalogItem) =>
        c.name.toLowerCase().includes(q) || (c.groupName || "").toLowerCase().includes(q),
    );
  }, [catalog, search]);

  // Group catalog by groupName (if any item has it)
  const grouped = useMemo(() => {
    const hasGroups = filteredCatalog.some((c: CatalogItem) => c.groupName);
    if (!hasGroups) return [{ groupName: null as string | null, items: filteredCatalog }];
    const map = new Map<string, CatalogItem[]>();
    for (const c of filteredCatalog) {
      const key = c.groupName || "Otros";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    return Array.from(map.entries()).map(([groupName, groupItems]) => ({
      groupName: groupName as string | null,
      items: groupItems,
    }));
  }, [filteredCatalog]);

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
      if (existingQty !== quantity || existingObs !== observations) {
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

  const handleManualAdd = (name: string, quantity: number, observations: string) => {
    const existing = byName.get(name);
    if (existing) {
      toast({ title: "Ya existe un item con ese nombre", variant: "destructive" });
      return;
    }
    createMut.mutate(
      {
        surveyId,
        [fieldMap.item]: name,
        [fieldMap.quantity]: quantity,
        [fieldMap.observations]: observations,
      },
      {
        onSuccess: () => {
          setManualFormOpen(false);
          toast({ description: `"${name}" agregado` });
        },
        onError,
      },
    );
  };

  const handleManualDelete = (existing: any) => {
    if (!window.confirm(`Eliminar "${existing[fieldMap.item]}"?`)) return;
    deleteMut.mutate({ surveyId, itemId: existing.id }, { onError });
  };

  if (isLoading) {
    return <p className="text-center text-sm text-muted-foreground py-6">Cargando catálogo...</p>;
  }

  if (catalog.length === 0 && !allowManual) {
    return <p className="text-center text-sm text-muted-foreground py-6">Catálogo vacío</p>;
  }

  const totalAvailable = catalog.length + manualItems.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Pon la cantidad necesaria. Items con cantidad 0 no se incluyen en la propuesta.
        </p>
        <span className="text-xs font-semibold text-[#0067B0]">
          {selectedCount} de {totalAvailable} con cantidad
        </span>
      </div>

      {showSearch && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Buscar en ${catalog.length} items...`}
            className="pl-9 h-9 text-sm"
          />
        </div>
      )}

      <div className="rounded-lg border bg-white overflow-hidden">
        <div className="grid grid-cols-[1fr_90px_1fr_auto] sm:grid-cols-[minmax(220px,2fr)_100px_minmax(180px,3fr)_auto] gap-3 px-3 py-2 border-b bg-[#fafafa] text-xs uppercase tracking-wide text-muted-foreground font-medium">
          <span>{itemLabel}</span>
          <span className="text-center">Cantidad</span>
          <span>Observaciones</span>
          <span className="w-6" />
        </div>

        {grouped.map((group) => (
          <div key={group.groupName ?? "_default"}>
            {group.groupName && (
              <div className="px-3 py-1.5 bg-[#f3f4f6] border-b text-[11px] font-semibold uppercase tracking-wide text-[#0067B0]">
                {group.groupName}
              </div>
            )}
            {group.items.map((c: CatalogItem) => {
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
        ))}

        {/* Manual entries (items present in survey but NOT in catalog) */}
        {allowManual && manualItems.length > 0 && (
          <>
            <div className="px-3 py-1.5 bg-amber-50 border-b text-[11px] font-semibold uppercase tracking-wide text-amber-800">
              Agregados manualmente
            </div>
            {manualItems.map((it: any) => (
              <ChecklistRow
                key={`manual-${it.id}`}
                name={it[fieldMap.item]}
                initialQuantity={Number(it[fieldMap.quantity] ?? 0)}
                initialObservations={(it[fieldMap.observations] ?? "") as string}
                disabled={!!disabled}
                onCommit={handleCommit}
                manual
                onDelete={() => handleManualDelete(it)}
              />
            ))}
          </>
        )}

        {/* Manual entry form */}
        {allowManual && manualFormOpen && (
          <ManualEntryForm
            disabled={!!disabled}
            onAdd={handleManualAdd}
            onCancel={() => setManualFormOpen(false)}
          />
        )}
      </div>

      {allowManual && !disabled && !manualFormOpen && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setManualFormOpen(true)}
          className="gap-1.5 text-amber-700 border-amber-300 hover:bg-amber-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Agregar manualmente
        </Button>
      )}
    </div>
  );
}
