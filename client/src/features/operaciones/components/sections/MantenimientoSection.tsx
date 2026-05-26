import { maintenanceApi } from "../../api";
import CatalogChecklistSection from "./CatalogChecklistSection";

interface Props {
  surveyId: number;
  disabled?: boolean;
}

export default function MantenimientoSection({ surveyId, disabled }: Props) {
  return (
    <CatalogChecklistSection
      surveyId={surveyId}
      catalogCategory="mantenimiento"
      api={maintenanceApi}
      itemLabel="Equipo a mantener"
      disabled={disabled}
    />
  );
}
