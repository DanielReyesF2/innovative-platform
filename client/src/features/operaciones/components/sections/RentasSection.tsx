import { proposalRentalsApi } from "../../api";
import CatalogTableSection from "./CatalogTableSection";

interface Props {
  surveyId: number;
  disabled?: boolean;
}

export default function RentasSection({ surveyId, disabled }: Props) {
  return (
    <CatalogTableSection
      surveyId={surveyId}
      catalogCategory="rentas"
      api={proposalRentalsApi}
      itemLabel="Renta"
      disabled={disabled}
      emptyText="No hay rentas registradas"
    />
  );
}
