import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Minus,
  Plus,
  Search,
  Target,
  TrendingDown,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import {
  useAreaByModule,
  useCreateKpiEntry,
  useKpiCategories,
  useKpiEntries,
  useKpiSummary,
  useKpis,
  usePendingActionPlans,
  useUpdateActionPlan,
} from "../api";
import { CreateActionPlanModal, CreateKpiModal, KpiDetailModal } from "./modals";

type TabKey = "panel" | "registro" | "planes";

const FREQUENCY_LABELS: Record<string, string> = {
  diario: "Diario",
  semanal: "Semanal",
  mensual: "Mensual",
  trimestral: "Trimestral",
  anual: "Anual",
};

const STATUS_LABELS: Record<string, string> = {
  activo: "Activo",
  pausado: "Pausado",
  archivado: "Archivado",
};

const PRIORITY_COLORS: Record<string, string> = {
  alta: "bg-red-100 text-red-700",
  media: "bg-yellow-100 text-yellow-700",
  baja: "bg-gray-100 text-gray-700",
};

const PLAN_STATUS_COLORS: Record<string, string> = {
  pendiente: "bg-yellow-100 text-yellow-700",
  en_proceso: "bg-blue-100 text-blue-700",
  completado: "bg-green-100 text-green-700",
  cancelado: "bg-gray-100 text-gray-700",
};

const PLAN_STATUS_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  en_proceso: "En Proceso",
  completado: "Completado",
  cancelado: "Cancelado",
};

function getComplianceColor(c: number | null) {
  if (c === null) return "text-gray-400";
  if (c >= 90) return "text-green-600";
  if (c >= 70) return "text-yellow-600";
  return "text-red-600";
}

function getComplianceBg(c: number | null) {
  if (c === null) return "bg-gray-400";
  if (c >= 90) return "bg-green-500";
  if (c >= 70) return "bg-yellow-500";
  return "bg-red-500";
}

// ========================
// Props
// ========================

interface KpiSectionProps {
  areaId?: number;
  moduleSlug?: string;
  compact?: boolean;
}

// ========================
// Main Component
// ========================

export function KpiSection({ areaId: propAreaId, moduleSlug, compact }: KpiSectionProps) {
  const { data: moduleArea } = useAreaByModule(moduleSlug);
  const resolvedAreaId = propAreaId ?? moduleArea?.areaId;

  const [activeTab, setActiveTab] = useState<TabKey>("panel");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [frequencyFilter, setFrequencyFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedKpiId, setSelectedKpiId] = useState<number | null>(null);
  const [showCreateKpi, setShowCreateKpi] = useState(false);

  const { data: summary } = useKpiSummary(resolvedAreaId);
  const { data: kpis = [] } = useKpis({
    categoryId: categoryFilter ? Number(categoryFilter) : undefined,
    status: statusFilter || undefined,
    frequency: frequencyFilter || undefined,
    areaId: resolvedAreaId,
  });
  const { data: categories = [] } = useKpiCategories();

  const filtered = kpis.filter((k: any) => !searchTerm || k.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const tabs: { key: TabKey; label: string }[] = [
    { key: "panel", label: "Panel General" },
    { key: "registro", label: "Registro" },
    { key: "planes", label: "Planes de Accion" },
  ];

  return (
    <div className="space-y-6">
      {!compact && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            title="KPIs Activos"
            value={String(summary?.total || 0)}
            subtitle=""
            icon={<Target className="h-4 w-4 text-blue-500" />}
          />
          <SummaryCard
            title="En Meta"
            value={String(summary?.onTarget || 0)}
            subtitle=">=90% cumplimiento"
            icon={<CheckCircle2 className="h-4 w-4 text-green-500" />}
          />
          <SummaryCard
            title="En Riesgo"
            value={String(summary?.atRisk || 0)}
            subtitle="70-89% cumplimiento"
            icon={<AlertTriangle className="h-4 w-4 text-yellow-500" />}
          />
          <SummaryCard
            title="Fuera de Meta"
            value={String(summary?.offTarget || 0)}
            subtitle="<70% cumplimiento"
            icon={<XCircle className="h-4 w-4 text-red-500" />}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar KPIs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Todas las categorias</option>
          {categories.map((c: any) => (
            <option key={c.id} value={c.id}>
              {c.displayName}
            </option>
          ))}
        </select>
        {!compact && (
          <>
            <select
              value={frequencyFilter}
              onChange={(e) => setFrequencyFilter(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Todas las frecuencias</option>
              {Object.entries(FREQUENCY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Todos los estados</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </>
        )}
        <Button onClick={() => setShowCreateKpi(true)} size={compact ? "sm" : "default"}>
          <Plus className="mr-2 h-4 w-4" /> Nuevo KPI
        </Button>
      </div>

      <div className="flex gap-1 rounded-lg border bg-muted/30 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${activeTab === tab.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "panel" && <PanelTab kpis={filtered} onSelect={setSelectedKpiId} />}
      {activeTab === "registro" && <RegistroTab kpis={kpis} />}
      {activeTab === "planes" && <PlanesTab kpis={kpis} areaId={resolvedAreaId} />}

      {selectedKpiId && <KpiDetailModal kpiId={selectedKpiId} onClose={() => setSelectedKpiId(null)} />}
      {showCreateKpi && (
        <CreateKpiModal
          categories={categories}
          onClose={() => setShowCreateKpi(false)}
          defaultAreaId={resolvedAreaId}
        />
      )}
    </div>
  );
}

// ========================
// Panel Tab
// ========================

function PanelTab({ kpis, onSelect }: { kpis: any[]; onSelect: (id: number) => void }) {
  if (kpis.length === 0) return <EmptyState message="No hay KPIs que mostrar" />;

  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y">
          {kpis.map((kpi: any) => {
            const entry = kpi.lastEntry;
            const compliance = entry ? Number(entry.compliance) : null;
            const actual = entry ? Number(entry.actualValue) : null;
            const target = Number(kpi.targetValue || 0);

            return (
              <button
                key={kpi.id}
                onClick={() => onSelect(kpi.id)}
                className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-accent"
              >
                <div className={`h-3 w-3 rounded-full ${getComplianceBg(compliance)}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{kpi.name}</span>
                    {kpi.category && (
                      <span className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {kpi.category.displayName}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {kpi.unit && <span className="mr-3">{kpi.unit}</span>}
                    {FREQUENCY_LABELS[kpi.frequency] && <span>{FREQUENCY_LABELS[kpi.frequency]}</span>}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">
                    {actual !== null ? actual.toLocaleString("es-MX") : "—"} / {target.toLocaleString("es-MX")}
                  </div>
                  {compliance !== null && (
                    <div className={`text-xs font-bold ${getComplianceColor(compliance)}`}>
                      {compliance.toFixed(1)}%
                    </div>
                  )}
                </div>
                <div>
                  {entry?.trend === "up" && <TrendingUp className="h-5 w-5 text-green-500" />}
                  {entry?.trend === "down" && <TrendingDown className="h-5 w-5 text-red-500" />}
                  {(!entry?.trend || entry?.trend === "stable") && <Minus className="h-5 w-5 text-gray-400" />}
                </div>
                <div className="text-xs text-muted-foreground">
                  {entry?.createdAt ? new Date(entry.createdAt).toLocaleDateString("es-MX") : "Sin datos"}
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ========================
// Registro Tab
// ========================

function RegistroTab({ kpis }: { kpis: any[] }) {
  const { toast } = useToast();
  const [selectedKpiId, setSelectedKpiId] = useState<number>(kpis[0]?.id || 0);
  const [period, setPeriod] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [actualValue, setActualValue] = useState("");
  const [notes, setNotes] = useState("");
  const { data: entries = [] } = useKpiEntries(selectedKpiId);
  const createEntry = useCreateKpiEntry();

  const handleSubmit = () => {
    if (!(selectedKpiId && actualValue)) return;
    createEntry.mutate(
      { kpiId: selectedKpiId, period, actualValue, notes: notes || undefined },
      {
        onSuccess: () => {
          setActualValue("");
          setNotes("");
        },
        onError: () => {
          toast({ title: "Error al registrar", description: "Intenta de nuevo", variant: "destructive" });
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Registrar Valor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="mb-1 block text-sm font-medium">KPI</Label>
              <select
                value={selectedKpiId}
                onChange={(e) => setSelectedKpiId(Number(e.target.value))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value={0}>Seleccionar KPI...</option>
                {kpis
                  .filter((k: any) => k.status === "activo")
                  .map((k: any) => (
                    <option key={k.id} value={k.id}>
                      {k.name}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <Label className="mb-1 block text-sm font-medium">Periodo</Label>
              <Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
            </div>
            <div>
              <Label className="mb-1 block text-sm font-medium">Valor Actual</Label>
              <Input
                type="number"
                value={actualValue}
                onChange={(e) => setActualValue(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <Label className="mb-1 block text-sm font-medium">Notas</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observaciones..." />
            </div>
          </div>
          <Button onClick={handleSubmit} disabled={!(selectedKpiId && actualValue) || createEntry.isPending}>
            Registrar Valor
          </Button>
        </CardContent>
      </Card>

      {selectedKpiId > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ultimas Entradas</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {entries.length === 0 ? (
              <EmptyState message="Sin entradas registradas" />
            ) : (
              <div className="divide-y">
                {entries.slice(0, 10).map((entry: any) => (
                  <div key={entry.id} className="flex items-center justify-between p-4">
                    <div>
                      <span className="font-medium">{entry.period}</span>
                      {entry.notes && <p className="mt-0.5 text-xs text-muted-foreground">{entry.notes}</p>}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {Number(entry.actualValue).toLocaleString("es-MX")}
                          {entry.targetValue && (
                            <span className="text-muted-foreground">
                              {" "}
                              / {Number(entry.targetValue).toLocaleString("es-MX")}
                            </span>
                          )}
                        </div>
                        {entry.compliance && (
                          <div className={`text-xs font-bold ${getComplianceColor(Number(entry.compliance))}`}>
                            {Number(entry.compliance).toFixed(1)}%
                          </div>
                        )}
                      </div>
                      {entry.trend === "up" && <TrendingUp className="h-4 w-4 text-green-500" />}
                      {entry.trend === "down" && <TrendingDown className="h-4 w-4 text-red-500" />}
                      {entry.trend === "stable" && <Minus className="h-4 w-4 text-gray-400" />}
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

// ========================
// Planes Tab
// ========================

function PlanesTab({ kpis, areaId }: { kpis: any[]; areaId?: number }) {
  const { toast } = useToast();
  const { data: plans = [] } = usePendingActionPlans(areaId);
  const [planStatusFilter, setPlanStatusFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const updatePlan = useUpdateActionPlan();

  const filteredPlans = planStatusFilter ? plans.filter((p: any) => p.status === planStatusFilter) : plans;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <select
          value={planStatusFilter}
          onChange={(e) => setPlanStatusFilter(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Todos los estados</option>
          {Object.entries(PLAN_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nuevo Plan
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {filteredPlans.length === 0 ? (
            <EmptyState message="No hay planes de accion" />
          ) : (
            <div className="divide-y">
              {filteredPlans.map((plan: any) => {
                const kpi = kpis.find((k: any) => k.id === plan.kpiId);
                return (
                  <div key={plan.id} className="flex items-center justify-between p-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{plan.title}</span>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_COLORS[plan.priority] || ""}`}
                        >
                          {plan.priority}
                        </span>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${PLAN_STATUS_COLORS[plan.status] || ""}`}
                        >
                          {PLAN_STATUS_LABELS[plan.status] || plan.status}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {kpi && <span className="mr-3">KPI: {kpi.name}</span>}
                        {plan.dueDate && <span>Vence: {new Date(plan.dueDate).toLocaleDateString("es-MX")}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {plan.status === "pendiente" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            updatePlan.mutate(
                              { id: plan.id, status: "en_proceso" },
                              {
                                onError: () => {
                                  toast({
                                    title: "Error al actualizar",
                                    description: "Intenta de nuevo",
                                    variant: "destructive",
                                  });
                                },
                              },
                            )
                          }
                        >
                          Iniciar
                        </Button>
                      )}
                      {plan.status === "en_proceso" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            updatePlan.mutate(
                              { id: plan.id, status: "completado" },
                              {
                                onError: () => {
                                  toast({
                                    title: "Error al actualizar",
                                    description: "Intenta de nuevo",
                                    variant: "destructive",
                                  });
                                },
                              },
                            )
                          }
                        >
                          Completar
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {showCreate && <CreateActionPlanModal kpis={kpis} onClose={() => setShowCreate(false)} defaultAreaId={areaId} />}
    </div>
  );
}

// ========================
// Shared
// ========================

function SummaryCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string;
  subtitle: string;
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
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
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
