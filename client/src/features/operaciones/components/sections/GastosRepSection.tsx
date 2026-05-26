import { expensesApi } from "../../api";
import CatalogTableSection from "./CatalogTableSection";

interface Props {
  surveyId: number;
  disabled?: boolean;
}

export default function GastosRepSection({ surveyId, disabled }: Props) {
  return (
    <CatalogTableSection
      surveyId={surveyId}
      catalogCategory="gastos_rep"
      api={expensesApi}
      itemLabel="Gasto"
      disabled={disabled}
      emptyText="No hay gastos registrados"
    />
  );
}
