import { useState } from "react";
import { proposalSuppliesApi, toolsApi } from "../../api";
import CatalogChecklistSection from "./CatalogChecklistSection";

interface Props {
  surveyId: number;
  disabled?: boolean;
}

type SubTab = "insumos" | "herramientas";

export default function InsumosSection({ surveyId, disabled }: Props) {
  const [activeTab, setActiveTab] = useState<SubTab>("insumos");

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b">
        <button
          onClick={() => setActiveTab("insumos")}
          className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "insumos"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Insumos
        </button>
        <button
          onClick={() => setActiveTab("herramientas")}
          className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "herramientas"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Herramientas
        </button>
      </div>

      {activeTab === "insumos" ? (
        <CatalogChecklistSection
          surveyId={surveyId}
          catalogCategory="insumos"
          api={proposalSuppliesApi}
          itemLabel="Insumo"
          disabled={disabled}
        />
      ) : (
        <CatalogChecklistSection
          surveyId={surveyId}
          catalogCategory="herramientas"
          api={toolsApi}
          itemLabel="Herramienta"
          disabled={disabled}
        />
      )}
    </div>
  );
}
