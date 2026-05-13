import {
  ArrowLeft,
  Building2,
  Camera,
  Check,
  CheckCircle2,
  ClipboardList,
  FileText,
  Lock,
  Maximize2,
  MessageSquare,
  Package,
  Play,
  Scale,
  Shield,
  Truck,
  UserCheck,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import {
  useAdvanceSurveyStatus,
  useGateStatus,
  useSurvey,
  useUpdateSurvey,
  useUpdateSurveySection,
} from "../api";
import AreaOperacionSection from "./sections/AreaOperacionSection";
import EquipoPermitidoSection from "./sections/EquipoPermitidoSection";
import FotosSection from "./sections/FotosSection";
import GeneralesSection from "./sections/GeneralesSection";
import InstalacionesSection from "./sections/InstalacionesSection";
import LegalSection from "./sections/LegalSection";
import ObservacionesSection from "./sections/ObservacionesSection";
import PersonalSection from "./sections/PersonalSection";
import PropuestaSection from "./sections/PropuestaSection";
import RecoleccionesSection from "./sections/RecoleccionesSection";
import ServiciosSection from "./sections/ServiciosSection";
import SubproductosSection from "./sections/SubproductosSection";
import ValidacionSection from "./sections/ValidacionSection";

// ─── Section definitions ───

const SECTIONS = [
  { key: "generales", label: "Generales", icon: Building2, color: "#0067B0", phase: 1 },
  { key: "instalaciones", label: "Instalaciones", icon: Zap, color: "#F57C00", phase: 1 },
  { key: "personal", label: "Personal", icon: Shield, color: "#7C3AED", phase: 1 },
  { key: "recolecciones", label: "Recolecciones", icon: Truck, color: "#0D47A1", phase: 1 },
  { key: "equipo", label: "Equipo Permitido", icon: Wrench, color: "#2E7D32", phase: 1 },
  { key: "legal", label: "Legal Ambiental", icon: Scale, color: "#C62828", phase: 1 },
  { key: "area", label: "Área Operación", icon: Maximize2, color: "#00838F", phase: 1 },
  { key: "subproductos", label: "Subproductos", icon: Package, color: "#4CAF50", phase: 1 },
  { key: "servicios", label: "Servicios", icon: ClipboardList, color: "#1565C0", phase: 1 },
  { key: "fotos", label: "Fotografías", icon: Camera, color: "#E64A19", phase: 2 },
  { key: "propuesta", label: "Propuesta", icon: FileText, color: "#00a8a8", phase: 2 },
  { key: "observaciones", label: "Observaciones", icon: MessageSquare, color: "#5D4037", phase: 2 },
  { key: "validacion", label: "Validación", icon: UserCheck, color: "#1B5E20", phase: 2 },
] as const;

// ─── Completion helpers ───

function countFilledFields(data: any): number {
  if (!data || typeof data !== "object") return 0;
  return Object.entries(data).filter(([key, value]) => {
    if (key.endsWith("Obs")) return false;
    if (value === null || value === undefined) return false;
    if (typeof value === "string" && value.trim() === "") return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
  }).length;
}

function getJsonbStatus(data: any, expected: number): "complete" | "partial" | "empty" {
  if (!data) return "empty";
  const filled = countFilledFields(data);
  if (filled === 0) return "empty";
  if (filled >= expected) return "complete";
  return "partial";
}

function getJsonbCount(data: any, expected: number): string {
  if (!data) return `0/${expected}`;
  return `${countFilledFields(data)}/${expected}`;
}

function getSectionCompletion(survey: any, key: string): { status: "complete" | "partial" | "empty"; label: string } {
  switch (key) {
    case "generales": {
      const n = [survey.address, survey.siteType].filter(Boolean).length;
      return { status: n >= 2 ? "complete" : n > 0 ? "partial" : "empty", label: `${n}/2` };
    }
    case "instalaciones":
      return { status: getJsonbStatus(survey.installations, 8), label: getJsonbCount(survey.installations, 8) };
    case "personal":
      return { status: getJsonbStatus(survey.personnelPolicies, 8), label: getJsonbCount(survey.personnelPolicies, 8) };
    case "recolecciones":
      return { status: getJsonbStatus(survey.transportPolicies, 4), label: getJsonbCount(survey.transportPolicies, 4) };
    case "equipo":
      return { status: getJsonbStatus(survey.allowedEquipment, 4), label: getJsonbCount(survey.allowedEquipment, 4) };
    case "legal":
      return { status: getJsonbStatus(survey.legalRequirements, 2), label: getJsonbCount(survey.legalRequirements, 2) };
    case "area":
      return { status: getJsonbStatus(survey.operationArea, 3), label: getJsonbCount(survey.operationArea, 3) };
    case "subproductos": {
      const c = survey.subproducts?.length || 0;
      return { status: c > 0 ? "complete" : "empty", label: `${c} items` };
    }
    case "servicios": {
      const c = survey.services?.length || 0;
      return { status: c > 0 ? "complete" : "empty", label: `${c} items` };
    }
    case "fotos": {
      const c = survey.photos?.length || 0;
      return { status: c > 0 ? "complete" : "empty", label: `${c} fotos` };
    }
    case "propuesta":
      return { status: "partial", label: "Personal / Equipo / Insumos" };
    case "observaciones":
      return { status: survey.observations ? "complete" : "empty", label: survey.observations ? "Listo" : "Pendiente" };
    case "validacion": {
      const n = [survey.elaboratedById, survey.approvedById].filter(Boolean).length;
      return { status: n >= 2 ? "complete" : n > 0 ? "partial" : "empty", label: `${n}/2` };
    }
    default:
      return { status: "empty", label: "" };
  }
}

// ─── Status labels ───

const STATUS_LABELS: Record<string, string> = {
  borrador_comercial: "Borrador",
  pendiente_operaciones: "Pendiente",
  agendado: "Agendado",
  en_sitio: "En Sitio",
  completado: "Completado",
  pendiente_revision: "Aprobado",
  cancelado: "Cancelado",
};

const STATUS_BADGE: Record<string, string> = {
  agendado: "bg-[#F57C00]/10 text-[#F57C00]",
  en_sitio: "bg-[#0067B0]/10 text-[#0067B0]",
  completado: "bg-[#2E7D32]/10 text-[#2E7D32]",
  pendiente_revision: "bg-emerald-100 text-emerald-800",
  cancelado: "bg-gray-100 text-gray-600",
  borrador_comercial: "bg-blue-50 text-blue-700",
  pendiente_operaciones: "bg-purple-50 text-purple-700",
};

// ─── Main Component (Modal) ───

interface LevantamientoHubProps {
  surveyId: number;
  onClose: () => void;
}

export default function LevantamientoHub({ surveyId, onClose }: LevantamientoHubProps) {
  const { toast } = useToast();
  const { data: survey, isLoading } = useSurvey(surveyId);
  const { data: gateStatus } = useGateStatus(surveyId, "phase1");
  const updateSurvey = useUpdateSurvey();
  const updateSection = useUpdateSurveySection();
  const advanceStatus = useAdvanceSurveyStatus();

  const [activeSection, setActiveSection] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const isPhase2Unlocked = survey && ["agendado", "en_sitio", "completado"].includes(survey.status);
  const isCompleted = survey?.status === "completado";

  // Escape key: section → grid, grid → close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (activeSection) {
          setActiveSection(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeSection, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // ── Debounced saves ──

  const debouncedSectionSave = useCallback(
    (sectionName: string, data: any) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        updateSection.mutate(
          { surveyId, sectionName, data },
          {
            onSuccess: () => toast({ description: "Guardado", duration: 1500 }),
            onError: () => toast({ title: "Error al guardar", variant: "destructive" }),
          },
        );
      }, 800);
    },
    [surveyId, updateSection, toast],
  );

  const debouncedFieldSave = useCallback(
    (data: any) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        updateSurvey.mutate(
          { id: surveyId, ...data },
          {
            onSuccess: () => toast({ description: "Guardado", duration: 1500 }),
            onError: () => toast({ title: "Error al guardar", variant: "destructive" }),
          },
        );
      }, 800);
    },
    [surveyId, updateSurvey, toast],
  );

  // ── Status advancement ──

  const handleAdvance = () => {
    if (!survey) return;
    let target = "";
    if (survey.status === "agendado") target = "en_sitio";
    else if (survey.status === "en_sitio") target = "completado";
    else return;

    advanceStatus.mutate(
      { surveyId, targetStatus: target },
      {
        onSuccess: (result: any) => {
          if (result.success) {
            toast({ description: target === "en_sitio" ? "Visita iniciada" : "Levantamiento completado" });
          } else {
            toast({
              variant: "destructive",
              title: "No se puede avanzar",
              description: `Faltan ${result.gate?.missing?.length || 0} campos requeridos`,
            });
          }
        },
        onError: (err: any) => {
          toast({ variant: "destructive", description: err.message || "Error" });
        },
      },
    );
  };

  // ── Render section content ──

  const renderSectionContent = (key: string) => {
    if (!survey) return null;
    const disabled = isCompleted;
    switch (key) {
      case "generales":
        return <GeneralesSection data={survey} onSave={debouncedFieldSave} disabled={disabled} />;
      case "instalaciones":
        return <InstalacionesSection data={survey.installations} onSave={(d) => debouncedSectionSave("installations", d)} disabled={disabled} />;
      case "personal":
        return <PersonalSection data={survey.personnelPolicies} onSave={(d) => debouncedSectionSave("personnelPolicies", d)} disabled={disabled} />;
      case "recolecciones":
        return <RecoleccionesSection data={survey.transportPolicies} onSave={(d) => debouncedSectionSave("transportPolicies", d)} disabled={disabled} />;
      case "equipo":
        return <EquipoPermitidoSection data={survey.allowedEquipment} onSave={(d) => debouncedSectionSave("allowedEquipment", d)} disabled={disabled} />;
      case "legal":
        return <LegalSection data={survey.legalRequirements} onSave={(d) => debouncedSectionSave("legalRequirements", d)} disabled={disabled} />;
      case "area":
        return <AreaOperacionSection data={survey.operationArea} onSave={(d) => debouncedSectionSave("operationArea", d)} disabled={disabled} />;
      case "subproductos":
        return <SubproductosSection surveyId={surveyId} disabled={disabled} />;
      case "servicios":
        return <ServiciosSection surveyId={surveyId} disabled={disabled} />;
      case "fotos":
        return <FotosSection surveyId={surveyId} disabled={disabled} />;
      case "propuesta":
        return <PropuestaSection surveyId={surveyId} disabled={disabled} />;
      case "observaciones":
        return <ObservacionesSection data={survey.observations} onSave={(obs) => debouncedFieldSave({ observations: obs })} disabled={disabled} />;
      case "validacion":
        return <ValidacionSection elaboratedById={survey.elaboratedById} approvedById={survey.approvedById} onSave={debouncedFieldSave} disabled={disabled} />;
      default:
        return null;
    }
  };

  // ── Completion metrics ──
  const completedSections = survey
    ? SECTIONS.filter((s) => {
        if (s.phase === 2 && !isPhase2Unlocked) return false;
        return getSectionCompletion(survey, s.key).status === "complete";
      }).length
    : 0;
  const totalSections = SECTIONS.filter((s) => s.phase === 1 || isPhase2Unlocked).length;
  const progressPercent = totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0;

  // ════════════════════════════════════════
  // MODAL RENDER
  // ════════════════════════════════════════

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={activeSection ? undefined : onClose} />

      {/* Modal card */}
      <div className="relative w-[96vw] max-w-5xl h-[92vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* ── Loading state ── */}
        {isLoading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0067B0]" />
          </div>
        )}

        {/* ── Not found ── */}
        {!isLoading && !survey && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <p className="text-[#6b7280]">Levantamiento no encontrado</p>
            <button onClick={onClose} className="text-[#0067B0] text-sm font-medium">
              Cerrar
            </button>
          </div>
        )}

        {/* ── Survey loaded ── */}
        {!isLoading && survey && (
          <>
            {/* ═══ HEADER ═══ */}
            <div className="flex-shrink-0 border-b border-[#e5e7eb] px-5 py-4 bg-[#fafafa]">
              <div className="flex items-center gap-3">
                {/* Back / Close button */}
                {activeSection ? (
                  <button
                    onClick={() => setActiveSection(null)}
                    className="w-9 h-9 rounded-xl bg-[#f3f4f6] flex items-center justify-center hover:bg-[#e5e7eb] transition-colors active:scale-95"
                  >
                    <ArrowLeft size={18} className="text-[#1c2c4a]" />
                  </button>
                ) : (
                  <div className="w-9" /> // spacer to keep layout consistent
                )}

                {/* Title area */}
                <div className="flex-1 min-w-0">
                  {activeSection ? (
                    // Section title
                    (() => {
                      const section = SECTIONS.find((s) => s.key === activeSection);
                      if (!section) return null;
                      const SectionIcon = section.icon;
                      return (
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: `${section.color}15` }}
                          >
                            <SectionIcon size={16} style={{ color: section.color }} />
                          </div>
                          <div>
                            <span className="font-semibold text-[15px] text-[#1c2c4a]">{section.label}</span>
                            <span className="text-[11px] text-[#9ca3af] ml-2">{survey.clientName}</span>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    // Hub title
                    <>
                      <h2 className="text-lg font-bold text-[#1c2c4a] truncate">{survey.clientName}</h2>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[survey.status] || "bg-gray-100 text-gray-600"}`}>
                          {STATUS_LABELS[survey.status] || survey.status}
                        </span>
                        {survey.address && (
                          <span className="text-[11px] text-[#9ca3af] truncate">{survey.address}</span>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Save indicator + Close */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {(updateSection.isPending || updateSurvey.isPending) && (
                    <span className="text-[11px] text-[#9ca3af]">Guardando...</span>
                  )}
                  <button
                    onClick={onClose}
                    className="w-9 h-9 rounded-xl bg-[#f3f4f6] flex items-center justify-center hover:bg-[#e5e7eb] transition-colors active:scale-95"
                  >
                    <X size={18} className="text-[#6b7280]" />
                  </button>
                </div>
              </div>

              {/* Progress bar — only on grid view */}
              {!activeSection && (
                <div className="flex items-center gap-3 mt-3">
                  <div className="flex-1 h-2 bg-[#e5e7eb] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${progressPercent}%`, backgroundColor: progressPercent === 100 ? "#2E7D32" : "#0067B0" }}
                    />
                  </div>
                  <span className="text-[12px] font-semibold text-[#1c2c4a] min-w-[50px] text-right">
                    {completedSections}/{totalSections}
                  </span>
                </div>
              )}
            </div>

            {/* ═══ BODY ═══ */}
            <div className="flex-1 overflow-auto bg-[#faf7f2]">
              {activeSection ? (
                // ── Section detail ──
                <div className="p-5 md:p-6">
                  <div className="max-w-2xl mx-auto">
                    {renderSectionContent(activeSection)}
                  </div>
                </div>
              ) : (
                // ── Grid view ──
                <div className="p-5">
                  {/* Iniciar Visita CTA */}
                  {survey.status === "agendado" && (
                    <button
                      onClick={handleAdvance}
                      disabled={advanceStatus.isPending}
                      className="w-full flex items-center justify-center gap-2.5 py-4 mb-4 rounded-xl bg-[#0067B0] text-white font-semibold text-[15px] shadow-lg hover:bg-[#005a9e] transition-colors disabled:opacity-50 active:scale-[0.98]"
                    >
                      <Play size={20} />
                      {advanceStatus.isPending ? "Iniciando..." : "Iniciar Visita en Sitio"}
                    </button>
                  )}

                  {/* Completed banner */}
                  {isCompleted && (
                    <div className="mb-4 p-3.5 rounded-xl bg-[#2E7D32]/10 border border-[#2E7D32]/20 flex items-center gap-3">
                      <CheckCircle2 size={20} className="text-[#2E7D32] flex-shrink-0" />
                      <span className="text-[14px] font-medium text-[#2E7D32]">Levantamiento completado</span>
                    </div>
                  )}

                  {/* Phase 1 sections */}
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                    {SECTIONS.filter((s) => s.phase === 1).map((section) => {
                      const { status, label } = getSectionCompletion(survey, section.key);
                      const SectionIcon = section.icon;

                      return (
                        <button
                          key={section.key}
                          onClick={() => setActiveSection(section.key)}
                          className={`relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all min-h-[110px] active:scale-[0.97] ${
                            status === "complete"
                              ? "bg-white border-[#2E7D32]/40"
                              : status === "partial"
                                ? "bg-white border-[#F57C00]/40"
                                : "bg-white border-[#e5e7eb] hover:border-[#0067B0]/40 hover:shadow-md"
                          }`}
                        >
                          {/* Status indicator */}
                          {status === "complete" ? (
                            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#2E7D32] flex items-center justify-center">
                              <Check size={12} className="text-white" />
                            </div>
                          ) : status === "partial" ? (
                            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#F57C00]/20 flex items-center justify-center">
                              <div className="w-2 h-2 rounded-full bg-[#F57C00]" />
                            </div>
                          ) : null}

                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center mb-1.5"
                            style={{ backgroundColor: `${section.color}12` }}
                          >
                            <SectionIcon size={20} style={{ color: section.color }} />
                          </div>
                          <span className="text-[12px] font-semibold text-[#1c2c4a] text-center leading-tight">
                            {section.label}
                          </span>
                          <span className="text-[10px] text-[#9ca3af] mt-0.5">{label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Phase 2 divider */}
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-[#d1d5db]" />
                    <span className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider">
                      {isPhase2Unlocked ? "Fase Operativa" : "Requiere iniciar visita"}
                    </span>
                    <div className="flex-1 h-px bg-[#d1d5db]" />
                  </div>

                  {/* Phase 2 sections */}
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                    {SECTIONS.filter((s) => s.phase === 2).map((section) => {
                      const isLocked = !isPhase2Unlocked;
                      const { status, label } = isLocked
                        ? { status: "locked" as const, label: "Bloqueado" }
                        : getSectionCompletion(survey, section.key);
                      const SectionIcon = section.icon;

                      return (
                        <button
                          key={section.key}
                          onClick={() => !isLocked && setActiveSection(section.key)}
                          disabled={isLocked}
                          className={`relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all min-h-[110px] ${
                            isLocked
                              ? "bg-[#f3f4f6] border-[#e5e7eb] opacity-50 cursor-not-allowed"
                              : status === "complete"
                                ? "bg-white border-[#2E7D32]/40 active:scale-[0.97]"
                                : status === "partial"
                                  ? "bg-white border-[#F57C00]/40 active:scale-[0.97]"
                                  : "bg-white border-[#e5e7eb] hover:border-[#0067B0]/40 hover:shadow-md active:scale-[0.97]"
                          }`}
                        >
                          {isLocked ? (
                            <div className="absolute top-2 right-2">
                              <Lock size={14} className="text-[#9ca3af]" />
                            </div>
                          ) : status === "complete" ? (
                            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#2E7D32] flex items-center justify-center">
                              <Check size={12} className="text-white" />
                            </div>
                          ) : status === "partial" ? (
                            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#F57C00]/20 flex items-center justify-center">
                              <div className="w-2 h-2 rounded-full bg-[#F57C00]" />
                            </div>
                          ) : null}

                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center mb-1.5"
                            style={{ backgroundColor: isLocked ? "#e5e7eb" : `${section.color}12` }}
                          >
                            <SectionIcon size={20} style={{ color: isLocked ? "#9ca3af" : section.color }} />
                          </div>
                          <span className={`text-[12px] font-semibold text-center leading-tight ${isLocked ? "text-[#9ca3af]" : "text-[#1c2c4a]"}`}>
                            {section.label}
                          </span>
                          <span className="text-[10px] text-[#9ca3af] mt-0.5">{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ═══ FOOTER — Completar Levantamiento ═══ */}
            {survey.status === "en_sitio" && !activeSection && (
              <div className="flex-shrink-0 p-4 bg-white border-t border-[#e5e7eb]">
                <button
                  onClick={handleAdvance}
                  disabled={advanceStatus.isPending}
                  className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl bg-[#2E7D32] text-white font-semibold text-[15px] shadow-lg hover:bg-[#1B5E20] transition-colors disabled:opacity-50 active:scale-[0.98]"
                >
                  <CheckCircle2 size={18} />
                  {advanceStatus.isPending ? "Completando..." : "Completar Levantamiento"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
