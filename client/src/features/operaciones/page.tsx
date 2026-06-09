import {
  AlertCircle,
  BarChart3,
  Calendar,
  CheckCircle,
  CheckCircle2,
  ChevronRight,
  Play,
  ClipboardList,
  Clock,
  FileText,
  Inbox,
  MapPin,
  RotateCcw,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { KpiSection } from "@/features/kpis/components/KpiSection";
import { ExecutiveAvatar } from "@/lib/comercial-constants";
import {
  useApproveSurvey,
  useApprovedSurveys,
  useDocuments,
  useOpsTeam,
  usePendingApprovalSurveys,
  usePendingReviewSurveys,
  useReturnSurvey,
  useSurveySummary,
  useSurveys,
} from "./api";
import { KpiTiempoRespuesta } from "./components/KpiTiempoRespuesta";
import LevantamientoHub from "./components/LevantamientoHub";
import { OperacionesCalendar } from "./components/OperacionesCalendar";
import { ReviewSurveyModal } from "./components/ReviewSurveyModal";

const STATUS_LABELS: Record<string, string> = {
  borrador_comercial: "Borrador Comercial",
  pendiente_operaciones: "Pendiente Operaciones",
  agendado: "Agendado",
  en_sitio: "En Sitio",
  completado: "Completado",
  pendiente_revision: "Aprobado",
  cancelado: "Cancelado",
  rechazado: "Rechazado",
};

const STATUS_COLORS: Record<string, string> = {
  borrador_comercial: "bg-blue-100 text-blue-800",
  pendiente_operaciones: "bg-purple-100 text-purple-800",
  agendado: "bg-yellow-100 text-yellow-800",
  pendiente_revision: "bg-emerald-100 text-emerald-800",
  en_sitio: "bg-orange-100 text-orange-800",
  completado: "bg-green-100 text-green-800",
  cancelado: "bg-gray-100 text-gray-800",
  rechazado: "bg-red-100 text-red-800",
};

const DOC_STATUS_COLORS: Record<string, string> = {
  vigente: "bg-green-100 text-green-800",
  por_vencer: "bg-yellow-100 text-yellow-800",
  vencido: "bg-red-100 text-red-800",
};

const STATUS_LABELS_APPROVAL: Record<string, string> = {
  completado: "Pendiente de Aprobación",
  pendiente_revision: "Aprobado",
};

export default function OperacionesPage() {
  const { data: surveys = [], isError: surveysError } = useSurveys();
  const { data: summary } = useSurveySummary();
  const { data: documents = [], isError: docsError } = useDocuments();
  const { data: pendingReview = [] } = usePendingReviewSurveys();
  const { data: pendingApproval = [] } = usePendingApprovalSurveys();
  const { data: approvedSurveys = [] } = useApprovedSurveys();
  const { data: opsTeam = [] } = useOpsTeam();
  const approveMutation = useApproveSurvey();
  const returnMutation = useReturnSurvey();
  const { toast } = useToast();

  const isError = surveysError || docsError;

  const [activeTab, setActiveTab] = useState<"solicitudes" | "aprobacion" | "surveys" | "documents" | "kpis">("solicitudes");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [reviewSurvey, setReviewSurvey] = useState<any>(null);
  const [hubSurveyId, setHubSurveyId] = useState<number | null>(null);
  const [returnSurveyId, setReturnSurveyId] = useState<number | null>(null);
  const [returnReason, setReturnReason] = useState("");
  const [showLivePanel, setShowLivePanel] = useState(false);

  // Live: surveys where personnel is on-site right now
  const liveSurveys = surveys.filter((s: any) => s.status === "en_sitio");

  // Filter surveys (exclude pendiente_operaciones from main list)
  const filteredSurveys = surveys
    .filter((s: any) => s.status !== "pendiente_operaciones")
    .filter((s: any) => {
      const matchesSearch = !searchTerm || s.clientName?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || s.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

  // Filter documents
  const filteredDocs = documents.filter((d: any) => {
    return (
      !searchTerm ||
      d.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.type?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Expiration alert buckets (H5 — 30/60/90 days, derived from daysUntilExpiry).
  const dnum = (d: any) => (typeof d.daysUntilExpiry === "number" ? d.daysUntilExpiry : null);
  const docAlerts = {
    vencidos: documents.filter((d: any) => dnum(d) !== null && (dnum(d) as number) < 0).length,
    d30: documents.filter((d: any) => dnum(d) !== null && (dnum(d) as number) >= 0 && (dnum(d) as number) <= 30).length,
    d60: documents.filter((d: any) => dnum(d) !== null && (dnum(d) as number) > 30 && (dnum(d) as number) <= 60).length,
    d90: documents.filter((d: any) => dnum(d) !== null && (dnum(d) as number) > 60 && (dnum(d) as number) <= 90).length,
  };
  const hasDocAlerts = docAlerts.vencidos + docAlerts.d30 + docAlerts.d60 + docAlerts.d90 > 0;

  // Stats
  const completedSurveys = surveys.filter((s: any) => s.status === "completado").length;
  const pendingSurveys = surveys.filter(
    (s: any) =>
      s.status === "borrador_comercial" ||
      s.status === "pendiente_operaciones" ||
      s.status === "agendado" ||
      s.status === "en_sitio",
  ).length;
  const _withoutReport = surveys.filter((s: any) => s.status === "completado" && !s.hasReport).length;

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="text-red-500 text-4xl">⚠</div>
        <h2 className="text-lg font-semibold text-[#1c2c4a]">Error al cargar operaciones</h2>
        <p className="text-sm text-[#6b7280]">
          Hubo un problema al conectar con el servidor. Intenta recargar la página.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-4 py-2 text-sm font-medium text-white bg-[#00a8a8] rounded-lg hover:bg-[#008f8f]"
        >
          Recargar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Operaciones</h1>
          <p className="text-muted-foreground">Levantamientos de campo, documentos operativos y seguimiento</p>
        </div>
      </div>

      {/* Equipo */}
      {opsTeam.length > 0 && (
        <>
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 rounded-full bg-gradient-to-b from-[#00a8a8] to-[#0D47A1]" />
            <Users size={16} className="text-[#00a8a8]" />
            <h2 className="text-sm font-semibold text-[#1c2c4a]">Equipo de Campo</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {opsTeam.map((member) => {
              const completionPct = member.total > 0 ? Math.round((member.completed / member.total) * 100) : 0;
              const barColor = completionPct >= 80 ? "#2E7D32" : completionPct >= 40 ? "#F57C00" : "#ef4444";

              return (
                <div
                  key={member.id}
                  className="bg-white rounded-xl border border-[#e5e7eb] p-4 hover:shadow-lg hover:border-[#00a8a8]/40 transition-all group relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#00a8a8] to-[#0D47A1] opacity-60 group-hover:opacity-100 transition-opacity" />

                  {/* Avatar + Name */}
                  <div className="flex items-center gap-3 mb-3">
                    <ExecutiveAvatar codigo={member.codigo || "??"} name={member.name} size="lg" />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#1c2c4a] truncate">
                        {member.name.split(" ").slice(0, 2).join(" ")}
                      </div>
                      <div className="text-[10px] text-[#6b7280] flex items-center gap-1">
                        <MapPin size={9} /> Campo
                      </div>
                    </div>
                  </div>

                  {/* KPIs */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[#6b7280]">Asignados</span>
                      <span className="text-sm font-bold text-[#1c2c4a]">{member.assigned}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[#6b7280]">Completados</span>
                      <span className="text-sm font-bold text-[#2E7D32]">{member.completed}</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2.5 mb-1">
                    <div className="w-full h-1.5 bg-[#f3f4f6] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${Math.min(completionPct, 100)}%`, backgroundColor: barColor }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[9px] text-[#6b7280]">{member.total} total</span>
                      {member.avgResponseHours !== null && (
                        <span className="text-[9px] text-[#6b7280]">~{member.avgResponseHours}h resp.</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Calendario de levantamientos — siempre visible */}
      <OperacionesCalendar
        surveys={surveys}
        opsTeam={opsTeam.map((m) => ({ id: m.id, name: m.name, codigo: m.codigo }))}
        onSurveyClick={(id) => {
          const found = surveys.find((s: any) => s.id === id);
          if (found) setReviewSurvey(found);
        }}
      />

      {/* Tab selector */}
      <div className="flex gap-2 border-b pb-2">
        <button
          onClick={() => setActiveTab("solicitudes")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
            activeTab === "solicitudes"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Inbox className="h-4 w-4" />
          Solicitudes
          {pendingReview.length > 0 && (
            <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500 px-1.5 text-xs font-bold text-white">
              {pendingReview.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("aprobacion")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
            activeTab === "aprobacion"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          Aprobación
          {pendingApproval.length > 0 && (
            <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-green-600 px-1.5 text-xs font-bold text-white">
              {pendingApproval.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("surveys")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
            activeTab === "surveys"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <ClipboardList className="h-4 w-4" />
          Levantamientos ({surveys.length})
        </button>
        <button
          onClick={() => setActiveTab("documents")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
            activeTab === "documents"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="h-4 w-4" />
          Documentos ({documents.length})
        </button>
        <button
          onClick={() => setActiveTab("kpis")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
            activeTab === "kpis"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          KPIs
        </button>
      </div>

      {/* Search (not shown for solicitudes or kpis) */}
      {(activeTab === "surveys" || activeTab === "documents") && (
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={activeTab === "surveys" ? "Buscar levantamientos..." : "Buscar documentos..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          {activeTab === "surveys" && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">Todos los estados</option>
              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Content */}
      {activeTab === "kpis" ? (
        <KpiTiempoRespuesta />
      ) : activeTab === "aprobacion" ? (
        <div className="space-y-6">
          {/* Pendientes de Aprobación */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" />
                Pendientes de Aprobación ({pendingApproval.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingApproval.length === 0 ? (
                <EmptyState message="No hay levantamientos pendientes de aprobación" />
              ) : (
                <div className="space-y-3">
                  {pendingApproval.map((survey: any) => (
                    <div
                      key={survey.id}
                      className="flex items-center gap-4 rounded-lg border border-amber-200 bg-amber-50/50 p-4"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{survey.clientName}</span>
                          <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                            Completado
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                          {survey.completedDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Completado: {new Date(survey.completedDate).toLocaleDateString("es-MX")}
                            </span>
                          )}
                          {survey.address && (
                            <span className="truncate max-w-xs">{survey.address}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => setHubSurveyId(survey.id)}
                          className="px-3 py-2 text-xs font-medium text-[#0067B0] border border-[#0067B0]/30 rounded-lg hover:bg-[#0067B0]/5 transition-colors"
                        >
                          Ver Detalle
                        </button>
                        <button
                          onClick={() => {
                            setReturnSurveyId(survey.id);
                            setReturnReason("");
                          }}
                          className="px-3 py-2 text-xs font-medium text-amber-700 border border-amber-300 rounded-lg hover:bg-amber-50 transition-colors flex items-center gap-1"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Devolver
                        </button>
                        <button
                          onClick={() => {
                            approveMutation.mutate(
                              { id: survey.id },
                              {
                                onSuccess: () => toast({ description: `${survey.clientName} aprobado` }),
                                onError: () => toast({ title: "Error al aprobar", variant: "destructive" }),
                              },
                            );
                          }}
                          disabled={approveMutation.isPending}
                          className="px-4 py-2 text-xs font-semibold text-white bg-[#2E7D32] rounded-lg hover:bg-[#1B5E20] transition-colors flex items-center gap-1 disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Aprobar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Aprobados — listos para subproductos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Aprobados — Listos para Modelo Económico ({approvedSurveys.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {approvedSurveys.length === 0 ? (
                <EmptyState message="No hay levantamientos aprobados aún" />
              ) : (
                <div className="space-y-3">
                  {approvedSurveys.map((survey: any) => (
                    <button
                      key={survey.id}
                      onClick={() => setHubSurveyId(survey.id)}
                      className="flex w-full items-center justify-between rounded-lg border border-green-200 bg-green-50/50 p-4 text-left transition-colors hover:bg-green-100/50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{survey.clientName}</span>
                          <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                            Aprobado
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                          {survey.approvedAt && (
                            <span className="flex items-center gap-1">
                              <ShieldCheck className="h-3 w-3 text-green-600" />
                              Aprobado: {new Date(survey.approvedAt).toLocaleDateString("es-MX")}
                            </span>
                          )}
                          {survey.address && (
                            <span className="truncate max-w-xs">{survey.address}</span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : activeTab === "solicitudes" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Solicitudes Pendientes ({pendingReview.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingReview.length === 0 ? (
              <EmptyState message="No hay solicitudes pendientes" />
            ) : (
              <div className="space-y-3">
                {pendingReview.map((survey: any) => (
                  <button
                    key={survey.id}
                    onClick={() => setReviewSurvey(survey)}
                    className="flex w-full items-center justify-between rounded-lg border border-amber-200 bg-amber-50/50 p-4 text-left transition-colors hover:bg-amber-100/50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{survey.clientName}</span>
                        <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                          Pendiente Operaciones
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(survey.createdAt).toLocaleDateString("es-MX")}
                        </span>
                        {survey.estimatedVolume && <span>{survey.estimatedVolume}</span>}
                        {survey.estimatedValue && <span>${Number(survey.estimatedValue).toLocaleString("es-MX")}</span>}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : activeTab === "surveys" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Levantamientos ({filteredSurveys.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredSurveys.length === 0 ? (
              <EmptyState message="No hay levantamientos que mostrar" />
            ) : (
              <div className="space-y-3">
                {filteredSurveys.map((survey: any) => (
                  <button
                    key={survey.id}
                    onClick={() => setHubSurveyId(survey.id)}
                    className="flex w-full items-center justify-between rounded-lg border p-4 text-left transition-colors hover:bg-accent"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{survey.clientName}</span>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            STATUS_COLORS[survey.status] || ""
                          }`}
                        >
                          {STATUS_LABELS[survey.status] || survey.status}
                        </span>
                        <span className="text-xs text-muted-foreground">{survey.type}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                        {survey.scheduledDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(survey.scheduledDate).toLocaleDateString("es-MX")}
                          </span>
                        )}
                        {survey.estimatedVolume && <span>{survey.estimatedVolume}</span>}
                        {survey.estimatedValue && <span>${Number(survey.estimatedValue).toLocaleString("es-MX")}</span>}
                      </div>
                      {survey.address && (
                        <div className="mt-1 text-xs text-muted-foreground truncate max-w-md">{survey.address}</div>
                      )}
                      {(survey.status === "agendado" || survey.status === "en_sitio") && (
                        <div className="mt-2">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0067B0] text-white text-xs font-semibold">
                            <Play className="h-3 w-3" />
                            {survey.status === "agendado" ? "Comenzar Levantamiento" : "Continuar Levantamiento"}
                          </span>
                        </div>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Documentos Operativos ({filteredDocs.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {hasDocAlerts && (
              <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                <span className="font-medium text-amber-800">Vencimientos:</span>
                {docAlerts.vencidos > 0 && (
                  <span className="rounded-full bg-red-100 px-2.5 py-0.5 font-medium text-red-700">
                    {docAlerts.vencidos} vencido{docAlerts.vencidos !== 1 ? "s" : ""}
                  </span>
                )}
                {docAlerts.d30 > 0 && (
                  <span className="rounded-full bg-orange-100 px-2.5 py-0.5 font-medium text-orange-700">
                    {docAlerts.d30} en ≤30 días
                  </span>
                )}
                {docAlerts.d60 > 0 && (
                  <span className="rounded-full bg-yellow-100 px-2.5 py-0.5 font-medium text-yellow-700">
                    {docAlerts.d60} en 31-60 días
                  </span>
                )}
                {docAlerts.d90 > 0 && (
                  <span className="rounded-full bg-blue-100 px-2.5 py-0.5 font-medium text-blue-700">
                    {docAlerts.d90} en 61-90 días
                  </span>
                )}
              </div>
            )}
            {filteredDocs.length === 0 ? (
              <EmptyState message="No hay documentos que mostrar" />
            ) : (
              <div className="space-y-3">
                {filteredDocs.map((doc: any) => (
                  <div key={doc.id} className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">{doc.name}</span>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            DOC_STATUS_COLORS[doc.status] || ""
                          }`}
                        >
                          {doc.status}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{doc.type}</span>
                        <span>{doc.category}</span>
                        {doc.expirationDate && (
                          <span>Vence: {new Date(doc.expirationDate).toLocaleDateString("es-MX")}</span>
                        )}
                      </div>
                      {doc.notes && <div className="mt-1 text-xs text-muted-foreground">{doc.notes}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Review survey modal */}
      {reviewSurvey && (
        <ReviewSurveyModal
          survey={reviewSurvey}
          onClose={() => setReviewSurvey(null)}
          users={opsTeam.map((m) => ({ id: m.id, name: m.name }))}
        />
      )}

      {/* Levantamiento Hub modal */}
      {hubSurveyId && (
        <LevantamientoHub surveyId={hubSurveyId} onClose={() => setHubSurveyId(null)} />
      )}

      {/* Return survey modal */}
      {returnSurveyId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setReturnSurveyId(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white rounded-2xl p-6 mx-4 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[#1c2c4a] mb-1">Devolver Levantamiento</h3>
            <p className="text-sm text-[#6b7280] mb-4">
              El levantamiento regresará al equipo de campo para correcciones.
            </p>
            <textarea
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              placeholder="Describe qué se necesita corregir o completar..."
              className="w-full h-28 rounded-xl border border-[#e5e7eb] px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#0067B0]/30 focus:border-[#0067B0]"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setReturnSurveyId(null)}
                className="flex-1 py-2.5 rounded-xl border border-[#e5e7eb] text-sm font-medium text-[#6b7280] hover:bg-[#f3f4f6] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  returnMutation.mutate(
                    { id: returnSurveyId, reason: returnReason },
                    {
                      onSuccess: () => {
                        toast({ description: "Levantamiento devuelto al equipo de campo" });
                        setReturnSurveyId(null);
                        setReturnReason("");
                      },
                      onError: (err: any) => {
                        toast({ title: "Error", description: err.message || "No se pudo devolver", variant: "destructive" });
                      },
                    },
                  );
                }}
                disabled={returnReason.length < 10 || returnMutation.isPending}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 transition-colors disabled:opacity-50"
              >
                {returnMutation.isPending ? "Devolviendo..." : "Devolver"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Live floating button ═══ */}
      {liveSurveys.length > 0 && (
        <>
          <button
            onClick={() => setShowLivePanel(!showLivePanel)}
            className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-[#0D47A1] px-5 py-3 text-white shadow-lg hover:bg-[#1565C0] transition-all hover:scale-105 active:scale-95"
          >
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
            </span>
            <span className="text-sm font-semibold">{liveSurveys.length} en sitio</span>
            <MapPin size={16} />
          </button>

          {/* Live panel */}
          {showLivePanel && (
            <div className="fixed bottom-20 right-6 z-40 w-80 rounded-xl bg-white border border-[#e5e7eb] shadow-2xl overflow-hidden">
              <div className="px-4 py-3 bg-gradient-to-r from-[#0D47A1] to-[#00a8a8] flex items-center justify-between">
                <div className="flex items-center gap-2 text-white">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                  </span>
                  <span className="text-sm font-bold">Levantamientos en Vivo</span>
                </div>
                <button
                  onClick={() => setShowLivePanel(false)}
                  className="text-white/70 hover:text-white text-lg leading-none"
                >
                  ✕
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-[#f3f4f6]">
                {liveSurveys.map((s: any) => {
                  const operator = s.assignedOperationsId ? opsTeam.find((m) => m.id === s.assignedOperationsId) : null;
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        setHubSurveyId(s.id);
                        setShowLivePanel(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-[#f0fdf4] transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                        <span className="text-sm font-semibold text-[#1c2c4a] truncate">{s.clientName}</span>
                      </div>
                      {s.address && (
                        <div className="mt-1 flex items-center gap-1 text-[11px] text-[#6b7280]">
                          <MapPin size={10} className="flex-shrink-0" />
                          <span className="truncate">{s.address}</span>
                        </div>
                      )}
                      {operator && <div className="mt-0.5 text-[11px] text-[#00a8a8] font-medium">{operator.name}</div>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-8 text-center text-muted-foreground">
      <AlertCircle className="mx-auto mb-2 h-8 w-8 opacity-50" />
      <p>{message}</p>
    </div>
  );
}
