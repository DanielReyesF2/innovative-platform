import { useState } from "react";
import EditableTable, { type ColumnDef } from "../EditableTable";
import { useToast } from "@/components/ui/use-toast";
import {
  proposalPersonnelApi,
  proposalEquipmentApi,
  proposalSuppliesApi,
  proposalRentalsApi,
} from "../../api";

interface Props {
  surveyId: number;
  disabled?: boolean;
}

const PERSONNEL_COLS: ColumnDef[] = [
  { key: "role", label: "Puesto", type: "text" },
  { key: "quantity", label: "Cantidad", type: "number", width: "100px" },
  { key: "schedule", label: "Horario", type: "text" },
  { key: "observations", label: "Observaciones", type: "text" },
];

const EQUIPMENT_COLS: ColumnDef[] = [
  { key: "item", label: "Equipo", type: "text" },
  { key: "quantity", label: "Cantidad", type: "number", width: "100px" },
  { key: "observations", label: "Observaciones", type: "text" },
];

const SUPPLIES_COLS: ColumnDef[] = [
  { key: "item", label: "Insumo", type: "text" },
  { key: "quantity", label: "Cantidad", type: "number", width: "100px" },
  { key: "observations", label: "Observaciones", type: "text" },
];

const RENTALS_COLS: ColumnDef[] = [
  { key: "item", label: "Renta", type: "text" },
  { key: "quantity", label: "Cantidad", type: "number", width: "100px" },
  { key: "observations", label: "Observaciones", type: "text" },
];

type SubTab = "personnel" | "equipment" | "supplies" | "rentals";

export default function PropuestaSection({ surveyId, disabled }: Props) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<SubTab>("personnel");

  const personnel = proposalPersonnelApi.useItems(surveyId);
  const personnelCreate = proposalPersonnelApi.useCreate();
  const personnelUpdate = proposalPersonnelApi.useUpdate();
  const personnelDelete = proposalPersonnelApi.useDelete();

  const equipment = proposalEquipmentApi.useItems(surveyId);
  const equipmentCreate = proposalEquipmentApi.useCreate();
  const equipmentUpdate = proposalEquipmentApi.useUpdate();
  const equipmentDelete = proposalEquipmentApi.useDelete();

  const supplies = proposalSuppliesApi.useItems(surveyId);
  const suppliesCreate = proposalSuppliesApi.useCreate();
  const suppliesUpdate = proposalSuppliesApi.useUpdate();
  const suppliesDelete = proposalSuppliesApi.useDelete();

  const rentals = proposalRentalsApi.useItems(surveyId);
  const rentalsCreate = proposalRentalsApi.useCreate();
  const rentalsUpdate = proposalRentalsApi.useUpdate();
  const rentalsDelete = proposalRentalsApi.useDelete();

  const onError = () => {
    toast({ title: "Error al guardar", description: "Intenta de nuevo", variant: "destructive" });
  };

  const tabs: { key: SubTab; label: string; count: number }[] = [
    { key: "personnel", label: "Personal", count: (personnel.data || []).length },
    { key: "equipment", label: "Equipo", count: (equipment.data || []).length },
    { key: "supplies", label: "Insumos", count: (supplies.data || []).length },
    { key: "rentals", label: "Rentas", count: (rentals.data || []).length },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {activeTab === "personnel" && (
        <EditableTable
          columns={PERSONNEL_COLS}
          data={personnel.data || []}
          onAdd={(item) => personnelCreate.mutate({ surveyId, ...item }, { onError })}
          onUpdate={(itemId, data) => personnelUpdate.mutate({ surveyId, itemId, ...data }, { onError })}
          onDelete={(itemId) => personnelDelete.mutate({ surveyId, itemId }, { onError })}
          disabled={disabled}
          emptyText="No hay personal en la propuesta"
        />
      )}
      {activeTab === "equipment" && (
        <EditableTable
          columns={EQUIPMENT_COLS}
          data={equipment.data || []}
          onAdd={(item) => equipmentCreate.mutate({ surveyId, ...item }, { onError })}
          onUpdate={(itemId, data) => equipmentUpdate.mutate({ surveyId, itemId, ...data }, { onError })}
          onDelete={(itemId) => equipmentDelete.mutate({ surveyId, itemId }, { onError })}
          disabled={disabled}
          emptyText="No hay equipo en la propuesta"
        />
      )}
      {activeTab === "supplies" && (
        <EditableTable
          columns={SUPPLIES_COLS}
          data={supplies.data || []}
          onAdd={(item) => suppliesCreate.mutate({ surveyId, ...item }, { onError })}
          onUpdate={(itemId, data) => suppliesUpdate.mutate({ surveyId, itemId, ...data }, { onError })}
          onDelete={(itemId) => suppliesDelete.mutate({ surveyId, itemId }, { onError })}
          disabled={disabled}
          emptyText="No hay insumos en la propuesta"
        />
      )}
      {activeTab === "rentals" && (
        <EditableTable
          columns={RENTALS_COLS}
          data={rentals.data || []}
          onAdd={(item) => rentalsCreate.mutate({ surveyId, ...item }, { onError })}
          onUpdate={(itemId, data) => rentalsUpdate.mutate({ surveyId, itemId, ...data }, { onError })}
          onDelete={(itemId) => rentalsDelete.mutate({ surveyId, itemId }, { onError })}
          disabled={disabled}
          emptyText="No hay rentas en la propuesta"
        />
      )}
    </div>
  );
}
