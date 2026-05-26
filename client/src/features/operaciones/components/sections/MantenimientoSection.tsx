import { maintenanceApi } from "../../api";
import CatalogTableSection from "./CatalogTableSection";

interface Props {
  surveyId: number;
  disabled?: boolean;
}

export default function MantenimientoSection({ surveyId, disabled }: Props) {
  return (
    <CatalogTableSection
      surveyId={surveyId}
      catalogCategory="mantenimiento"
      api={maintenanceApi}
      itemLabel="Equipo a mantener"
      disabled={disabled}
      emptyText="No hay mantenimientos registrados"
    />
  );
}
