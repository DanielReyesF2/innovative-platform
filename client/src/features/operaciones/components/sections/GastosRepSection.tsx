import { expensesApi } from "../../api";
import CatalogChecklistSection from "./CatalogChecklistSection";

interface Props {
  surveyId: number;
  disabled?: boolean;
}

export default function GastosRepSection({ surveyId, disabled }: Props) {
  return (
    <CatalogChecklistSection
      surveyId={surveyId}
      catalogCategory="gastos_rep"
      api={expensesApi}
      itemLabel="Gasto"
      disabled={disabled}
    />
  );
}
