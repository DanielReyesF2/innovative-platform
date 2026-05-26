import { subproductsApi } from "../../api";
import CatalogChecklistSection from "./CatalogChecklistSection";

interface Props {
  surveyId: number;
  disabled?: boolean;
}

export default function SubproductosSection({ surveyId, disabled }: Props) {
  return (
    <CatalogChecklistSection
      surveyId={surveyId}
      catalogCategory="subproductos"
      api={subproductsApi}
      itemLabel="Residuo / Subproducto"
      disabled={disabled}
      fieldMap={{ item: "name", quantity: "monthlyQty", observations: "characteristics" }}
    />
  );
}
