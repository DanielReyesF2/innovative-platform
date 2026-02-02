import EditableTable, { type ColumnDef } from "../EditableTable";
import { servicesApi } from "../../api";

interface Props {
  surveyId: number;
  disabled?: boolean;
}

const COLUMNS: ColumnDef[] = [
  { key: "itemNumber", label: "#", type: "number", width: "50px" },
  { key: "serviceName", label: "Servicio", type: "text" },
  { key: "characteristic", label: "Característica", type: "text" },
  { key: "um", label: "UM", type: "text", width: "80px" },
  { key: "monthlyQty", label: "Cant. Mensual", type: "number", width: "120px" },
  { key: "collectionFrequency", label: "Frecuencia", type: "text", width: "120px" },
  { key: "equipmentRequired", label: "Equipo", type: "text" },
  { key: "suggestedTreatment", label: "Tratamiento", type: "text" },
];

export default function ServiciosSection({ surveyId, disabled }: Props) {
  const { data: items = [] } = servicesApi.useItems(surveyId);
  const createMutation = servicesApi.useCreate();
  const updateMutation = servicesApi.useUpdate();
  const deleteMutation = servicesApi.useDelete();

  return (
    <EditableTable
      columns={COLUMNS}
      data={items}
      onAdd={(item) => createMutation.mutate({ surveyId, ...item })}
      onUpdate={(itemId, data) => updateMutation.mutate({ surveyId, itemId, ...data })}
      onDelete={(itemId) => deleteMutation.mutate({ surveyId, itemId })}
      disabled={disabled}
      emptyText="No hay servicios registrados"
    />
  );
}
