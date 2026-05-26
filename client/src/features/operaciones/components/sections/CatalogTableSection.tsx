import { useMemo } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useCatalog } from "../../api";
import EditableTable, { type ColumnDef } from "../EditableTable";

interface SubItemApi {
  useItems: (surveyId: number | null) => { data: any };
  useCreate: () => { mutate: (vars: any, opts?: any) => void };
  useUpdate: () => { mutate: (vars: any, opts?: any) => void };
  useDelete: () => { mutate: (vars: any, opts?: any) => void };
}

interface Props {
  surveyId: number;
  catalogCategory: string;
  api: SubItemApi;
  disabled?: boolean;
  itemLabel?: string;
  emptyText?: string;
}

/**
 * Reusable table-style section for items that come from the master catalog.
 * Columns: Item (dropdown from catalog + manual fallback) / Cantidad / Observaciones.
 */
export default function CatalogTableSection({
  surveyId,
  catalogCategory,
  api,
  disabled,
  itemLabel = "Item",
  emptyText = "Sin registros",
}: Props) {
  const { toast } = useToast();
  const { data: catalog = [] } = useCatalog(catalogCategory);
  const items = api.useItems(surveyId);
  const createMutation = api.useCreate();
  const updateMutation = api.useUpdate();
  const deleteMutation = api.useDelete();

  const options = useMemo(() => catalog.map((c: any) => c.name as string), [catalog]);

  const columns: ColumnDef[] = [
    { key: "item", label: itemLabel, type: "select", options },
    { key: "quantity", label: "Cantidad", type: "number", width: "100px" },
    { key: "observations", label: "Observaciones", type: "text" },
  ];

  const onError = () => {
    toast({ title: "Error al guardar", description: "Intenta de nuevo", variant: "destructive" });
  };

  return (
    <EditableTable
      columns={columns}
      data={items.data || []}
      onAdd={(item) => createMutation.mutate({ surveyId, ...item }, { onError })}
      onUpdate={(itemId, data) => updateMutation.mutate({ surveyId, itemId, ...data }, { onError })}
      onDelete={(itemId) => deleteMutation.mutate({ surveyId, itemId }, { onError })}
      disabled={disabled}
      emptyText={emptyText}
    />
  );
}
