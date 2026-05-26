import { proposalPersonnelApi } from "../../api";
import CatalogTableSection from "./CatalogTableSection";

interface Props {
  surveyId: number;
  disabled?: boolean;
}

export default function PersonalSection({ surveyId, disabled }: Props) {
  return (
    <CatalogTableSection
      surveyId={surveyId}
      catalogCategory="personal"
      api={proposalPersonnelApi}
      itemLabel="Puesto"
      disabled={disabled}
      emptyText="No hay personal registrado"
    />
  );
}
