import { servicesApi } from "../../api";
import CatalogChecklistSection from "./CatalogChecklistSection";

interface Props {
  surveyId: number;
  disabled?: boolean;
}

export default function ServiciosSection({ surveyId, disabled }: Props) {
  return (
    <CatalogChecklistSection
      surveyId={surveyId}
      catalogCategory="servicios"
      api={servicesApi}
      itemLabel="Servicio"
      disabled={disabled}
      fieldMap={{ item: "serviceName", quantity: "monthlyQty", observations: "characteristic" }}
      allowManual
    />
  );
}
