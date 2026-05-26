import { proposalPersonnelApi } from "../../api";
import CatalogChecklistSection from "./CatalogChecklistSection";

interface Props {
  surveyId: number;
  disabled?: boolean;
}

export default function PersonalSection({ surveyId, disabled }: Props) {
  return (
    <CatalogChecklistSection
      surveyId={surveyId}
      catalogCategory="personal"
      api={proposalPersonnelApi}
      itemLabel="Puesto"
      disabled={disabled}
    />
  );
}
