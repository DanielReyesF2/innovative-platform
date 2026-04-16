import EditableTable, { type ColumnDef } from "../EditableTable";
import { useToast } from "@/components/ui/use-toast";
import { subproductsApi } from "../../api";

interface Props {
  surveyId: number;
  disabled?: boolean;
}

const COLUMNS: ColumnDef[] = [
  { key: "itemNumber", label: "#", type: "number", width: "50px" },
  { key: "name", label: "Nombre", type: "text" },
  { key: "um", label: "UM", type: "text", width: "80px" },
  { key: "monthlyQty", label: "Cant. Mensual", type: "number", width: "120px" },
  { key: "characteristics", label: "Características", type: "text" },
  { key: "collectionFrequency", label: "Frecuencia", type: "text", width: "120px" },
  { key: "storage", label: "Almacenamiento", type: "text" },
];

export default function SubproductosSection({ surveyId, disabled }: Props) {
  const { toast } = useToast();
  const { data: items = [] } = subproductsApi.useItems(surveyId);
  const createMutation = subproductsApi.useCreate();
  const updateMutation = subproductsApi.useUpdate();
  const deleteMutation = subproductsApi.useDelete();

  const onError = () => {
    toast({ title: "Error al guardar", description: "Intenta de nuevo", variant: "destructive" });
  };

  return (
    <EditableTable
      columns={COLUMNS}
      data={items}
      onAdd={(item) => createMutation.mutate({ surveyId, ...item }, { onError })}
      onUpdate={(itemId, data) => updateMutation.mutate({ surveyId, itemId, ...data }, { onError })}
      onDelete={(itemId) => deleteMutation.mutate({ surveyId, itemId }, { onError })}
      disabled={disabled}
      emptyText="No hay subproductos registrados"
    />
  );
}
