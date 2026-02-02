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
} from "lucide-react";
import { useSurveys, useSurveySummary, useDocuments, useExpiredDocuments } from "./api";

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

const DOC_STATUS_COLORS: Record<string, string> = {
  vigente: "bg-green-100 text-green-800",
  por_vencer: "bg-yellow-100 text-yellow-800",
  vencido: "bg-red-100 text-red-800",
};

export default function OperacionesPage() {
  const [, navigate] = useLocation();
  const { data: surveys = [] } = useSurveys();
  const { data: summary } = useSurveySummary();
  const { data: documents = [] } = useDocuments();
  const { data: expiredDocs = [] } = useExpiredDocuments();

  const [activeTab, setActiveTab] = useState<"surveys" | "documents">("surveys");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Filter surveys
  const filteredSurveys = surveys.filter((s: any) => {
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

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
          title="Sin Reporte"
          value={String(withoutReport)}
          description="Completados sin reporte"
          icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" />}
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
      </div>

      {/* Search */}
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

      {/* Content */}
      {activeTab === "surveys" ? (
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
