import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  TrendingUp,
  Users,
  Target,
  DollarSign,
  Search,
  ChevronRight,
  AlertCircle,
  BarChart3,
  FileBarChart,
  Plus,
  UserPlus,
} from "lucide-react";
import { useProspects, usePipeline, useLeads, useCreateProspect } from "./api";
import { Label } from "@/components/ui/label";
import { KpiSection } from "@/features/kpis/components/KpiSection";
import { ProspectDetail } from "./components/ProspectDetail";
import { ComercialReports } from "./components/ComercialReports";
import { AlertsDropdown } from "./components/AlertsDropdown";
import { LeadsView } from "./components/LeadsView";

const STAGE_LABELS: Record<string, string> = {
  contacto_inicial: "Contacto Inicial",
  presentacion: "Presentacion",
  levantamiento: "Levantamiento",
  propuesta: "Propuesta",
  negociacion: "Negociacion",
  cierre_ganado: "Cierre Ganado",
  cierre_perdido: "Cierre Perdido",
  // Legacy
  lead: "Contacto Inicial",
  cierre: "Cierre Ganado",
  rechazada: "Cierre Perdido",
};

const STAGE_COLORS: Record<string, string> = {
  contacto_inicial: "bg-blue-100 text-blue-800",
  presentacion: "bg-cyan-100 text-cyan-800",
  levantamiento: "bg-yellow-100 text-yellow-800",
  propuesta: "bg-purple-100 text-purple-800",
  negociacion: "bg-orange-100 text-orange-800",
  cierre_ganado: "bg-green-100 text-green-800",
  cierre_perdido: "bg-red-100 text-red-800",
  // Legacy
  lead: "bg-blue-100 text-blue-800",
  cierre: "bg-green-100 text-green-800",
  rechazada: "bg-red-100 text-red-800",
};

const PRIORITY_COLORS: Record<string, string> = {
  muy_alta: "bg-red-100 text-red-700",
  alta: "bg-orange-100 text-orange-700",
  media: "bg-yellow-100 text-yellow-700",
  baja: "bg-gray-100 text-gray-700",
};

export default function ComercialPage() {
  const { user } = useAuth();
  const [mainTab, setMainTab] = useState<"leads" | "pipeline" | "kpis" | "reportes">("leads");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Presupuesto Comercial</h1>
          <p className="text-muted-foreground">
            Gestion de leads, prospectos y embudo de ventas
          </p>
        </div>
        <AlertsDropdown />
      </div>

      {/* Main tab selector */}
      <div className="flex gap-2 border-b pb-2">
        <button
          onClick={() => setMainTab("leads")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
            mainTab === "leads"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <UserPlus className="h-4 w-4" />
          Leads
        </button>
        <button
          onClick={() => setMainTab("pipeline")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
            mainTab === "pipeline"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          Presupuesto
        </button>
        <button
          onClick={() => setMainTab("kpis")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
            mainTab === "kpis"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          KPIs
        </button>
        <button
          onClick={() => setMainTab("reportes")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
            mainTab === "reportes"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileBarChart className="h-4 w-4" />
          Reportes
        </button>
      </div>

      {mainTab === "leads" && <LeadsView />}
      {mainTab === "pipeline" && <PipelineView />}
      {mainTab === "kpis" && <KpiSection moduleSlug="comercial" compact />}
      {mainTab === "reportes" && <ComercialReports />}
    </div>
  );
}

function PipelineView() {
  const { data: prospects = [] } = useProspects();
  const { data: pipeline = [] } = usePipeline();
  const { data: leads = [] } = useLeads();

  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [selectedProspect, setSelectedProspect] = useState<any>(null);
  const [showNewLead, setShowNewLead] = useState(false);
  const createProspect = useCreateProspect();

  // Calculate metrics
  const activeProspects = prospects.filter((p: any) => !["rechazada", "cierre_perdido"].includes(p.stage));
  const totalPipelineValue = activeProspects.reduce(
    (sum: number, p: any) => sum + Number(p.estimatedValue || 0),
    0
  );
  const avgProbability =
    activeProspects.length > 0
      ? Math.round(
          activeProspects.reduce((sum: number, p: any) => sum + (p.probability || 0), 0) /
            activeProspects.length
        )
      : 0;
  const closedDeals = prospects.filter((p: any) => ["cierre", "cierre_ganado"].includes(p.stage)).length;

  // Map legacy stages for filtering
  const stageAliases: Record<string, string[]> = {
    contacto_inicial: ["contacto_inicial", "lead"],
    cierre_ganado: ["cierre_ganado", "cierre"],
    cierre_perdido: ["cierre_perdido", "rechazada"],
  };

  // Filter prospects
  const filtered = prospects.filter((p: any) => {
    const matchesSearch =
      !searchTerm ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.industry?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStage =
      stageFilter === "all" ||
      (stageAliases[stageFilter]
        ? stageAliases[stageFilter].includes(p.stage)
        : p.stage === stageFilter);
    return matchesSearch && matchesStage;
  });

  return (
    <>
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Presupuesto Total"
          value={`$${(totalPipelineValue / 1_000_000).toFixed(1)}M`}
          description={`${activeProspects.length} prospectos activos`}
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Leads Activos"
          value={String(leads.length)}
          description="Sin asignar / en proceso"
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Probabilidad Promedio"
          value={`${avgProbability}%`}
          description="De prospectos activos"
          icon={<Target className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Cierres"
          value={String(closedDeals)}
          description="Negocios cerrados"
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      {/* Pipeline funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Embudo de Ventas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 gap-3">
            {pipeline.map((stage: any) => (
              <button
                key={stage.stage}
                onClick={() => setStageFilter(stage.stage)}
                className={`rounded-lg border p-4 text-center transition-colors hover:bg-accent ${
                  stageFilter === stage.stage ? "border-primary bg-accent" : ""
                }`}
              >
                <div className="text-2xl font-bold">{stage.count}</div>
                <div className="text-xs text-muted-foreground">
                  {STAGE_LABELS[stage.stage] || stage.stage}
                </div>
                <div className="mt-1 text-xs font-medium">
                  ${(Number(stage.totalValue) / 1_000_000).toFixed(1)}M
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* New Lead button */}
      <div className="flex justify-end">
        <Button onClick={() => setShowNewLead(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Lead
        </Button>
      </div>

      {/* Search and filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar prospectos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">Todas las etapas</option>
          {["contacto_inicial", "presentacion", "levantamiento", "propuesta", "negociacion", "cierre_ganado", "cierre_perdido"].map((key) => (
            <option key={key} value={key}>
              {STAGE_LABELS[key]}
            </option>
          ))}
        </select>
      </div>

      {/* Prospects list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Prospectos ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <AlertCircle className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p>No hay prospectos que mostrar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((prospect: any) => (
                <button
                  key={prospect.id}
                  onClick={() => setSelectedProspect(prospect)}
                  className="flex w-full items-center justify-between rounded-lg border p-4 text-left transition-colors hover:bg-accent"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{prospect.name}</span>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          STAGE_COLORS[prospect.stage] || ""
                        }`}
                      >
                        {STAGE_LABELS[prospect.stage] || prospect.stage}
                      </span>
                      {prospect.stage !== "lead" && prospect.priority && (
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            PRIORITY_COLORS[prospect.priority] || ""
                          }`}
                        >
                          {prospect.priority.replace("_", " ")}
                        </span>
                      )}
                    </div>
                    {/* Lead: minimal info */}
                    {prospect.stage === "lead" && (
                      <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                        {prospect.contactName && <span>{prospect.contactName}</span>}
                        <span>{prospect.location}</span>
                      </div>
                    )}
                    {/* Prospecto+: commercial info */}
                    {prospect.stage !== "lead" && (
                      <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{prospect.industry}</span>
                        <span>{prospect.location}</span>
                        {prospect.estimatedValue && (
                          <span className="font-medium">
                            ${Number(prospect.estimatedValue).toLocaleString("es-MX")}
                          </span>
                        )}
                        {prospect.probability > 0 && (
                          <span>{prospect.probability}% prob.</span>
                        )}
                      </div>
                    )}
                    {/* Next step for prospecto+ */}
                    {prospect.stage !== "lead" && prospect.nextStep && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        Siguiente: {prospect.nextStep}
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

      {/* Prospect detail */}
      {selectedProspect && (
        <ProspectDetail
          prospect={selectedProspect}
          onClose={() => setSelectedProspect(null)}
        />
      )}

      {showNewLead && (
        <NewLeadModal
          onClose={() => setShowNewLead(false)}
          isPending={createProspect.isPending}
          onSubmit={async (data) => {
            await createProspect.mutateAsync(data);
            setShowNewLead(false);
          }}
        />
      )}
    </>
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

function NewLeadModal({
  onClose,
  onSubmit,
  isPending,
}: {
  onClose: () => void;
  onSubmit: (data: any) => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState({
    name: "",
    contactName: "",
    location: "",
    source: "otro",
    contactPhone: "",
  });

  const set = (key: string, val: string) => setForm({ ...form, [key]: val });

  const handleSubmit = () => {
    if (!form.name || !form.contactName || !form.location) return;
    onSubmit({
      name: form.name,
      contactName: form.contactName,
      location: form.location,
      source: form.source,
      contactPhone: form.contactPhone || undefined,
      stage: "lead",
      potential: "Medio",
      industry: "Por definir",
      probability: 0,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
        <h3 className="text-lg font-bold">Nuevo Lead</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Captura rápida — solo datos básicos
        </p>
        <div className="mt-4 space-y-3">
          <div>
            <Label className="text-xs">Nombre empresa *</Label>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Ej: ACME Corp"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Nombre contacto *</Label>
            <Input
              value={form.contactName}
              onChange={(e) => set("contactName", e.target.value)}
              placeholder="Ej: Juan Pérez"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Ubicación *</Label>
            <Input
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="Ej: CDMX, Monterrey"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Fuente</Label>
            <select
              value={form.source}
              onChange={(e) => set("source", e.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="referido">Referido</option>
              <option value="web">Web</option>
              <option value="linkedin">LinkedIn</option>
              <option value="evento">Evento</option>
              <option value="cold_call">Cold Call</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Teléfono contacto</Label>
            <Input
              value={form.contactPhone}
              onChange={(e) => set("contactPhone", e.target.value)}
              placeholder="Opcional"
              className="mt-1"
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || !form.name || !form.contactName || !form.location}
          >
            {isPending ? "Creando..." : "Crear Lead"}
          </Button>
        </div>
      </div>
    </div>
  );
}

