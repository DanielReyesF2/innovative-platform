import { proposalRentalsApi } from "../../api";
import CatalogChecklistSection from "./CatalogChecklistSection";

interface Props {
  surveyId: number;
  disabled?: boolean;
}

export default function RentasSection({ surveyId, disabled }: Props) {
  return (
    <CatalogChecklistSection
      surveyId={surveyId}
      catalogCategory="rentas"
      api={proposalRentalsApi}
      itemLabel="Renta"
      disabled={disabled}
    />
  );
}
