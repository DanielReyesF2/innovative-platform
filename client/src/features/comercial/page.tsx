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
  Filter,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { useProspects, usePipeline, useLeads } from "./api";

const STAGE_LABELS: Record<string, string> = {
  lead: "Leads",
  levantamiento: "Levantamientos",
  propuesta: "Propuestas",
  negociacion: "Negociación",
  cierre: "Cierre",
  rechazada: "Rechazadas",
};

const STAGE_COLORS: Record<string, string> = {
  lead: "bg-blue-100 text-blue-800",
  levantamiento: "bg-yellow-100 text-yellow-800",
  propuesta: "bg-purple-100 text-purple-800",
  negociacion: "bg-orange-100 text-orange-800",
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
  const { data: prospects = [] } = useProspects();
  const { data: pipeline = [] } = usePipeline();
  const { data: leads = [] } = useLeads();

  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [selectedProspect, setSelectedProspect] = useState<any>(null);

  // Calculate metrics
  const activeProspects = prospects.filter((p: any) => p.stage !== "rechazada");
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
  const closedDeals = prospects.filter((p: any) => p.stage === "cierre").length;

  // Filter prospects
  const filtered = prospects.filter((p: any) => {
    const matchesSearch =
      !searchTerm ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.industry?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStage = stageFilter === "all" || p.stage === stageFilter;
    return matchesSearch && matchesStage;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pipeline Comercial</h1>
        <p className="text-muted-foreground">
          Gestión de prospectos, leads y embudo de ventas
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Pipeline Total"
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
          <div className="grid grid-cols-5 gap-3">
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
          {Object.entries(STAGE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
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
                      {prospect.priority && (
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            PRIORITY_COLORS[prospect.priority] || ""
                          }`}
                        >
                          {prospect.priority.replace("_", " ")}
                        </span>
                      )}
                    </div>
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
                    {prospect.nextStep && (
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

      {/* Prospect detail modal */}
      {selectedProspect && (
        <ProspectDetailModal
          prospect={selectedProspect}
          onClose={() => setSelectedProspect(null)}
        />
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

function ProspectDetailModal({
  prospect,
  onClose,
}: {
  prospect: any;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[80vh] w-full max-w-2xl overflow-auto rounded-lg bg-background p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">{prospect.name}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <InfoRow label="Industria" value={prospect.industry} />
          <InfoRow label="Ubicación" value={prospect.location} />
          <InfoRow label="Etapa" value={STAGE_LABELS[prospect.stage] || prospect.stage} />
          <InfoRow label="Probabilidad" value={`${prospect.probability}%`} />
          <InfoRow label="Potencial" value={prospect.potential} />
          <InfoRow
            label="Valor Estimado"
            value={`$${Number(prospect.estimatedValue || 0).toLocaleString("es-MX")}`}
          />
          <InfoRow label="Volumen Estimado" value={prospect.estimatedVolume} />
          <InfoRow label="Tiempo Cierre" value={prospect.estimatedCloseTime} />
        </div>

        {prospect.contactName && (
          <div className="mt-4 rounded-lg border p-3">
            <h3 className="mb-2 text-sm font-semibold">Contacto</h3>
            <p className="text-sm">{prospect.contactName}</p>
            {prospect.contactRole && (
              <p className="text-xs text-muted-foreground">{prospect.contactRole}</p>
            )}
          </div>
        )}

        {prospect.lastActivity && (
          <div className="mt-3">
            <span className="text-sm font-medium">Última actividad: </span>
            <span className="text-sm text-muted-foreground">{prospect.lastActivity}</span>
          </div>
        )}

        {prospect.nextStep && (
          <div className="mt-2">
            <span className="text-sm font-medium">Siguiente paso: </span>
            <span className="text-sm text-muted-foreground">{prospect.nextStep}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}
