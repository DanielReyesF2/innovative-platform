import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ClipboardList,
  FileText,
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  Search,
  ChevronRight,
  AlertCircle,
  Plus,
  Inbox,
  BarChart3,
  Users,
  MapPin,
} from "lucide-react";
import {
  useSurveys,
  useSurveySummary,
  useDocuments,
  useExpiredDocuments,
  usePendingReviewSurveys,
  useOpsTeam,
} from "./api";
import { ExecutiveAvatar } from "@/lib/comercial-constants";
import { KpiSection } from "@/features/kpis/components/KpiSection";
import { ReviewSurveyModal } from "./components/ReviewSurveyModal";
import { OperacionesCalendar } from "./components/OperacionesCalendar";

const STATUS_LABELS: Record<string, string> = {
  borrador_comercial: "Borrador Comercial",
  pendiente_operaciones: "Pendiente Operaciones",
  agendado: "Agendado",
  en_sitio: "En Sitio",
  completado: "Completado",
  cancelado: "Cancelado",
  rechazado: "Rechazado",
};

const STATUS_COLORS: Record<string, string> = {
  borrador_comercial: "bg-blue-100 text-blue-800",
  pendiente_operaciones: "bg-purple-100 text-purple-800",
  agendado: "bg-yellow-100 text-yellow-800",
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

export default function OperacionesPage() {
  const [, navigate] = useLocation();
  const { data: surveys = [], isError: surveysError } = useSurveys();
  const { data: summary } = useSurveySummary();
  const { data: documents = [], isError: docsError } = useDocuments();
  const { data: expiredDocs = [] } = useExpiredDocuments();
  const { data: pendingReview = [] } = usePendingReviewSurveys();
  const { data: opsTeam = [] } = useOpsTeam();

  const isError = surveysError || docsError;

  const [activeTab, setActiveTab] = useState<"solicitudes" | "surveys" | "documents" | "kpis">(
    "solicitudes"
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [reviewSurvey, setReviewSurvey] = useState<any>(null);
  const [showLivePanel, setShowLivePanel] = useState(false);

  // Live: surveys where personnel is on-site right now
  const liveSurveys = surveys.filter((s: any) => s.status === "en_sitio");

  // Filter surveys (exclude pendiente_operaciones from main list)
  const filteredSurveys = surveys
    .filter((s: any) => s.status !== "pendiente_operaciones")
    .filter((s: any) => {
      const matchesSearch =
        !searchTerm ||
        s.clientName?.toLowerCase().includes(searchTerm.toLowerCase());
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

  // Stats
  const completedSurveys = surveys.filter((s: any) => s.status === "completado").length;
  const pendingSurveys = surveys.filter(
    (s: any) =>
      s.status === "borrador_comercial" ||
      s.status === "pendiente_operaciones" ||
      s.status === "agendado" ||
      s.status === "en_sitio"
  ).length;
  const withoutReport = surveys.filter(
    (s: any) => s.status === "completado" && !s.hasReport
  ).length;

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="text-red-500 text-4xl">⚠</div>
        <h2 className="text-lg font-semibold text-[#1c2c4a]">Error al cargar operaciones</h2>
        <p className="text-sm text-[#6b7280]">Hubo un problema al conectar con el servidor. Intenta recargar la página.</p>
        <button onClick={() => window.location.reload()} className="mt-2 px-4 py-2 text-sm font-medium text-white bg-[#00a8a8] rounded-lg hover:bg-[#008f8f]">
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
          <p className="text-muted-foreground">
            Levantamientos de campo, documentos operativos y seguimiento
          </p>
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
              const completionPct = member.total > 0
                ? Math.round((member.completed / member.total) * 100)
                : 0;
              const barColor = completionPct >= 80 ? '#2E7D32' : completionPct >= 40 ? '#F57C00' : '#ef4444';

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
                        {member.name.split(' ').slice(0, 2).join(' ')}
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
        opsTeam={opsTeam.map(m => ({ id: m.id, name: m.name, codigo: m.codigo }))}
        onSurveyClick={(id) => {
          const found = surveys.find((s: any) => s.id === id);
          if (found) setReviewSurvey(found);
        }}
      />

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Solicitudes"
          value={String(pendingReview.length)}
          description="Pendientes de revision"
          icon={<Inbox className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Levantamientos Pendientes"
          value={String(pendingSurveys)}
          description="Borrador + En proceso"
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Completados"
          value={String(completedSurveys)}
          description="Levantamientos finalizados"
          icon={<CheckCircle className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Docs Vencidos"
          value={String(expiredDocs.length)}
          description="Requieren renovacion"
          icon={<AlertCircle className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

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
        <KpiSection moduleSlug="operaciones" compact />
      ) : activeTab === "solicitudes" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Solicitudes Pendientes ({pendingReview.length})
            </CardTitle>
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
                        {survey.estimatedValue && (
                          <span>${Number(survey.estimatedValue).toLocaleString("es-MX")}</span>
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
      ) : activeTab === "surveys" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Levantamientos ({filteredSurveys.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredSurveys.length === 0 ? (
              <EmptyState message="No hay levantamientos que mostrar" />
            ) : (
              <div className="space-y-3">
                {filteredSurveys.map((survey: any) => (
                  <button
                    key={survey.id}
                    onClick={() => navigate(`/operaciones/levantamiento/${survey.id}`)}
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
                        {survey.estimatedValue && (
                          <span>${Number(survey.estimatedValue).toLocaleString("es-MX")}</span>
                        )}
                      </div>
                      {survey.address && (
                        <div className="mt-1 text-xs text-muted-foreground truncate max-w-md">
                          {survey.address}
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
            <CardTitle className="text-lg">
              Documentos Operativos ({filteredDocs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredDocs.length === 0 ? (
              <EmptyState message="No hay documentos que mostrar" />
            ) : (
              <div className="space-y-3">
                {filteredDocs.map((doc: any) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
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
                          <span>
                            Vence: {new Date(doc.expirationDate).toLocaleDateString("es-MX")}
                          </span>
                        )}
                      </div>
                      {doc.notes && (
                        <div className="mt-1 text-xs text-muted-foreground">{doc.notes}</div>
                      )}
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
          users={opsTeam.map(m => ({ id: m.id, name: m.name }))}
        />
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
            <span className="text-sm font-semibold">
              {liveSurveys.length} en sitio
            </span>
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
                  const operator = s.assignedOperationsId
                    ? opsTeam.find(m => m.id === s.assignedOperationsId)
                    : null;
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        navigate(`/operaciones/levantamiento/${s.id}`);
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
                      {operator && (
                        <div className="mt-0.5 text-[11px] text-[#00a8a8] font-medium">
                          {operator.name}
                        </div>
                      )}
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

function MetricCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
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
