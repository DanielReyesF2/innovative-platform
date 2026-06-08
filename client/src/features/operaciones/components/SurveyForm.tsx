import { ArrowLeft, Check } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useAdvanceSurveyStatus, useGateStatus, useSurvey, useUpdateSurvey, useUpdateSurveySection } from "../api";
import SurveySection from "./SurveySection";
import AreaOperacionSection from "./sections/AreaOperacionSection";
import EquipoPermitidoSection from "./sections/EquipoPermitidoSection";
import FotosSection from "./sections/FotosSection";
import GeneralesSection from "./sections/GeneralesSection";
import InstalacionesSection from "./sections/InstalacionesSection";
import LegalSection from "./sections/LegalSection";
import ObservacionesSection from "./sections/ObservacionesSection";
import PersonalSection from "./sections/PersonalSection";
import RecoleccionesSection from "./sections/RecoleccionesSection";
import ServiciosSection from "./sections/ServiciosSection";
import SubproductosSection from "./sections/SubproductosSection";
import ValidacionSection from "./sections/ValidacionSection";

const STATUS_LABELS: Record<string, string> = {
  borrador_comercial: "Borrador Comercial",
  pendiente_operaciones: "Pendiente Operaciones",
  agendado: "Agendado",
  en_sitio: "En Sitio",
  completado: "Completado",
  cancelado: "Cancelado",
};

const STATUS_COLORS: Record<string, string> = {
  borrador_comercial: "bg-blue-100 text-blue-800",
  pendiente_operaciones: "bg-purple-100 text-purple-800",
  agendado: "bg-yellow-100 text-yellow-800",
  en_sitio: "bg-orange-100 text-orange-800",
  completado: "bg-green-100 text-green-800",
  cancelado: "bg-gray-100 text-gray-800",
};

interface SurveyFormProps {
  surveyId: number;
}

export default function SurveyForm({ surveyId }: SurveyFormProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { data: survey, isLoading } = useSurvey(surveyId);
  const { data: gateStatus } = useGateStatus(surveyId, "phase1");
  const updateSurvey = useUpdateSurvey();
  const updateSection = useUpdateSurveySection();
  const advanceStatus = useAdvanceSurveyStatus();

  const [openSection, setOpenSection] = useState<number>(1);
  // Separate debounce timers so a section save and a field save within 800ms
  // don't cancel each other (H12 — shared timer dropped the first save silently).
  const sectionTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const fieldTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const isPhase2Unlocked = survey && ["agendado", "en_sitio", "completado"].includes(survey.status);
  const isCompleted = survey?.status === "completado";
  const isCommercialPhase = survey?.status === "borrador_comercial";

  // Debounced section save
  const debouncedSectionSave = useCallback(
    (sectionName: string, data: any) => {
      if (sectionTimerRef.current) clearTimeout(sectionTimerRef.current);
      sectionTimerRef.current = setTimeout(() => {
        updateSection.mutate(
          { surveyId, sectionName, data },
          {
            onSuccess: () => {
              toast({ description: "Guardado", duration: 1500 });
            },
            onError: () => {
              toast({ title: "Error al guardar", description: "Intenta de nuevo", variant: "destructive" });
            },
          },
        );
      }, 800);
    },
    [surveyId, updateSection, toast],
  );

  // Debounced survey field save (for top-level fields like observations, siteType, etc.)
  const debouncedFieldSave = useCallback(
    (data: any) => {
      if (fieldTimerRef.current) clearTimeout(fieldTimerRef.current);
      fieldTimerRef.current = setTimeout(() => {
        updateSurvey.mutate(
          { id: surveyId, ...data },
          {
            onSuccess: () => {
              toast({ description: "Guardado", duration: 1500 });
            },
            onError: () => {
              toast({ title: "Error al guardar", description: "Intenta de nuevo", variant: "destructive" });
            },
          },
        );
      }, 800);
    },
    [surveyId, updateSurvey, toast],
  );

  const handleAdvance = () => {
    if (!survey) return;
    let target = "";
    if (survey.status === "borrador_comercial") target = "pendiente_operaciones";
    else if (survey.status === "pendiente_operaciones") target = "agendado";
    else if (survey.status === "agendado") target = "en_sitio";
    else if (survey.status === "en_sitio") target = "completado";
    else return;

    advanceStatus.mutate(
      { surveyId, targetStatus: target },
      {
        onSuccess: (result: any) => {
          if (result.success) {
            toast({ description: `Estado actualizado a: ${STATUS_LABELS[target]}` });
          } else {
            toast({
              variant: "destructive",
              title: "No se puede avanzar",
              description: `Faltan ${result.gate?.missing?.length || 0} campos requeridos`,
            });
          }
        },
        onError: (err: any) => {
          toast({ variant: "destructive", description: err.message || "Error al avanzar" });
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Levantamiento no encontrado</p>
        <Button variant="link" onClick={() => navigate("/operaciones")}>
          Volver a Operaciones
        </Button>
      </div>
    );
  }

  const progressPercent = gateStatus?.percentage ?? 0;
  const progressFilled = gateStatus?.filled ?? 0;
  const progressTotal = gateStatus?.total ?? 0;

  const nextStatusLabel = () => {
    if (survey.status === "borrador_comercial") return "Pasar a Operaciones";
    if (survey.status === "pendiente_operaciones") return "Agendar";
    if (survey.status === "agendado") return "Iniciar Visita";
    if (survey.status === "en_sitio") return "Completar";
    return "";
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/operaciones")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Volver
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{survey.clientName}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                STATUS_COLORS[survey.status] || ""
              }`}
            >
              {STATUS_LABELS[survey.status] || survey.status}
            </span>
            {survey.address && <span className="text-sm text-muted-foreground">{survey.address}</span>}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="rounded-lg border p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">
            Progreso Fase 1: {progressFilled}/{progressTotal}
          </span>
          <span className="text-sm text-muted-foreground">{progressPercent}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Accordion sections */}
      <div className="space-y-2">
        {/* Section 1: Generales */}
        <SurveySection
          title="Generales"
          sectionNumber={1}
          completionStatus={
            survey.address && survey.siteType ? "complete" : survey.address || survey.siteType ? "partial" : "empty"
          }
          completionText={`${[survey.address, survey.siteType].filter(Boolean).length}/2`}
          isOpen={openSection === 1}
          onToggle={() => setOpenSection(openSection === 1 ? 0 : 1)}
        >
          <GeneralesSection data={survey} onSave={(data) => debouncedFieldSave(data)} disabled={isCompleted} />
        </SurveySection>

        {/* Section 2: Instalaciones */}
        <SurveySection
          title="Instalaciones"
          sectionNumber={2}
          completionStatus={getJsonbStatus(survey.installations, 8)}
          completionText={getJsonbCount(survey.installations, 8)}
          isOpen={openSection === 2}
          onToggle={() => setOpenSection(openSection === 2 ? 0 : 2)}
        >
          <InstalacionesSection
            data={survey.installations}
            onSave={(data) => debouncedSectionSave("installations", data)}
            disabled={isCompleted}
          />
        </SurveySection>

        {/* Section 3: Personal */}
        <SurveySection
          title="Politicas de Personal"
          sectionNumber={3}
          completionStatus={getJsonbStatus(survey.personnelPolicies, 8)}
          completionText={getJsonbCount(survey.personnelPolicies, 8)}
          isOpen={openSection === 3}
          onToggle={() => setOpenSection(openSection === 3 ? 0 : 3)}
        >
          <PersonalSection surveyId={survey.id} disabled={isCompleted} />
        </SurveySection>

        {/* Section 4: Recolecciones */}
        <SurveySection
          title="Recolecciones"
          sectionNumber={4}
          completionStatus={getJsonbStatus(survey.transportPolicies, 4)}
          completionText={getJsonbCount(survey.transportPolicies, 4)}
          isOpen={openSection === 4}
          onToggle={() => setOpenSection(openSection === 4 ? 0 : 4)}
        >
          <RecoleccionesSection
            data={survey.transportPolicies}
            onSave={(data) => debouncedSectionSave("transportPolicies", data)}
            disabled={isCompleted}
          />
        </SurveySection>

        {/* Section 5: Equipo Permitido */}
        <SurveySection
          title="Equipo Permitido"
          sectionNumber={5}
          completionStatus={getJsonbStatus(survey.allowedEquipment, 4)}
          completionText={getJsonbCount(survey.allowedEquipment, 4)}
          isOpen={openSection === 5}
          onToggle={() => setOpenSection(openSection === 5 ? 0 : 5)}
        >
          <EquipoPermitidoSection
            data={survey.allowedEquipment}
            onSave={(data) => debouncedSectionSave("allowedEquipment", data)}
            disabled={isCompleted}
          />
        </SurveySection>

        {/* Section 6: Legal */}
        <SurveySection
          title="Legal Ambiental"
          sectionNumber={6}
          completionStatus={getJsonbStatus(survey.legalRequirements, 2)}
          completionText={getJsonbCount(survey.legalRequirements, 2)}
          isOpen={openSection === 6}
          onToggle={() => setOpenSection(openSection === 6 ? 0 : 6)}
        >
          <LegalSection
            data={survey.legalRequirements}
            onSave={(data) => debouncedSectionSave("legalRequirements", data)}
            disabled={isCompleted}
          />
        </SurveySection>

        {/* Section 7: Area de Operacion */}
        <SurveySection
          title="Area de Operacion"
          sectionNumber={7}
          completionStatus={getJsonbStatus(survey.operationArea, 3)}
          completionText={getJsonbCount(survey.operationArea, 3)}
          isOpen={openSection === 7}
          onToggle={() => setOpenSection(openSection === 7 ? 0 : 7)}
        >
          <AreaOperacionSection
            data={survey.operationArea}
            onSave={(data) => debouncedSectionSave("operationArea", data)}
            disabled={isCompleted}
          />
        </SurveySection>

        {/* Section 8: Subproductos */}
        <SurveySection
          title="Catalogo de Subproductos"
          sectionNumber={8}
          completionStatus={survey.subproducts?.length > 0 ? "complete" : "empty"}
          completionText={`${survey.subproducts?.length || 0} items`}
          isOpen={openSection === 8}
          onToggle={() => setOpenSection(openSection === 8 ? 0 : 8)}
        >
          <SubproductosSection surveyId={surveyId} disabled={isCompleted} />
        </SurveySection>

        {/* Section 9: Servicios */}
        <SurveySection
          title="Catalogo de Servicios"
          sectionNumber={9}
          completionStatus={survey.services?.length > 0 ? "complete" : "empty"}
          completionText={`${survey.services?.length || 0} items`}
          isOpen={openSection === 9}
          onToggle={() => setOpenSection(openSection === 9 ? 0 : 9)}
        >
          <ServiciosSection surveyId={surveyId} disabled={isCompleted} />
        </SurveySection>

        {/* Phase 2 divider */}
        {!isPhase2Unlocked && (
          <div className="text-center text-sm text-muted-foreground py-2 border-t border-b">
            Fase Operaciones (bloqueado hasta que se agende)
          </div>
        )}

        {/* Section 10: Fotos */}
        <SurveySection
          title="Fotografias"
          sectionNumber={10}
          locked={!isPhase2Unlocked}
          completionStatus={isPhase2Unlocked ? (survey.photos?.length > 0 ? "complete" : "empty") : "locked"}
          completionText={isPhase2Unlocked ? `${survey.photos?.length || 0} fotos` : undefined}
          isOpen={openSection === 10}
          onToggle={() => setOpenSection(openSection === 10 ? 0 : 10)}
        >
          <FotosSection surveyId={surveyId} disabled={isCompleted} />
        </SurveySection>

        {/* Section 15: Observaciones */}
        <SurveySection
          title="Observaciones"
          sectionNumber={12}
          locked={!isPhase2Unlocked}
          completionStatus={isPhase2Unlocked ? (survey.observations ? "complete" : "empty") : "locked"}
          completionText={isPhase2Unlocked ? (survey.observations ? "Completado" : "Pendiente") : undefined}
          isOpen={openSection === 12}
          onToggle={() => setOpenSection(openSection === 12 ? 0 : 12)}
        >
          <ObservacionesSection
            data={survey.observations}
            onSave={(observations) => debouncedFieldSave({ observations })}
            disabled={isCompleted}
          />
        </SurveySection>

        {/* Section 16: Validacion */}
        <SurveySection
          title="Validacion"
          sectionNumber={13}
          locked={!isPhase2Unlocked}
          completionStatus={
            isPhase2Unlocked ? (survey.elaboratedById && survey.approvedById ? "complete" : "empty") : "locked"
          }
          isOpen={openSection === 13}
          onToggle={() => setOpenSection(openSection === 13 ? 0 : 13)}
        >
          <ValidacionSection
            elaboratedById={survey.elaboratedById}
            approvedById={survey.approvedById}
            onSave={(data) => debouncedFieldSave(data)}
            disabled={isCompleted}
          />
        </SurveySection>
      </div>

      {/* Action bar */}
      {!isCompleted && nextStatusLabel() && (
        <div className="sticky bottom-4 flex justify-end pt-4">
          <Button
            onClick={handleAdvance}
            disabled={advanceStatus.isPending || (isCommercialPhase && progressPercent < 100)}
            className="gap-2"
          >
            {advanceStatus.isPending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {nextStatusLabel()}
            {isCommercialPhase && progressPercent < 100 && (
              <span className="text-xs opacity-75">({progressPercent}%)</span>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

// Helpers for JSONB section completion status
function getJsonbStatus(data: any, expectedFields: number): "complete" | "partial" | "empty" {
  if (!data) return "empty";
  const filled = countFilledFields(data);
  if (filled === 0) return "empty";
  if (filled >= expectedFields) return "complete";
  return "partial";
}

function getJsonbCount(data: any, expectedFields: number): string {
  if (!data) return `0/${expectedFields}`;
  const filled = countFilledFields(data);
  return `${filled}/${expectedFields}`;
}

function countFilledFields(data: any): number {
  if (!data || typeof data !== "object") return 0;
  return Object.entries(data).filter(([key, value]) => {
    // Skip observation fields for counting
    if (key.endsWith("Obs")) return false;
    if (value === null || value === undefined) return false;
    if (typeof value === "string" && value.trim() === "") return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
  }).length;
}
