import { Archive, Pencil } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import {
  useArchiveKpi,
  useCreateActionPlan,
  useCreateKpi,
  useKpi,
  useKpiActionPlans,
  useKpiEntries,
  useKpiTrend,
  useUpdateKpi,
} from "../api";

const FREQUENCY_LABELS: Record<string, string> = {
  diario: "Diario",
  semanal: "Semanal",
  mensual: "Mensual",
  trimestral: "Trimestral",
  anual: "Anual",
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

function getComplianceColor(compliance: number | null) {
  if (compliance === null) return "text-gray-400";
  if (compliance >= 90) return "text-green-600";
  if (compliance >= 70) return "text-yellow-600";
  return "text-red-600";
}

function getComplianceBg(compliance: number | null) {
  if (compliance === null) return "bg-gray-400";
  if (compliance >= 90) return "bg-green-500";
  if (compliance >= 70) return "bg-yellow-500";
  return "bg-red-500";
}

// ========================
// Shared
// ========================

function ModalWrapper({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[80vh] w-full max-w-lg overflow-auto rounded-lg bg-background p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <Label className="mb-1 block text-sm font-medium">{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function MiniCard({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="rounded-lg border p-2 text-center">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-sm font-bold ${className || ""}`}>{value}</div>
    </div>
  );
}

// ========================
// KPI Detail Modal
// ========================

export function KpiDetailModal({ kpiId, onClose }: { kpiId: number; onClose: () => void }) {
  const { data: kpi } = useKpi(kpiId);
  const { data: entries = [] } = useKpiEntries(kpiId);
  const { data: trend = [] } = useKpiTrend(kpiId);
  const { data: actionPlans = [] } = useKpiActionPlans(kpiId);
  const { toast } = useToast();
  const archiveKpi = useArchiveKpi();
  const [showEdit, setShowEdit] = useState(false);

  if (!kpi) return null;

  const lastEntry = kpi.lastEntry;
  const compliance = lastEntry ? Number(lastEntry.compliance) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[80vh] w-full max-w-2xl overflow-auto rounded-lg bg-background p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">{kpi.name}</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {kpi.category && <span>{kpi.category.displayName}</span>}
              {kpi.unit && <span>| {kpi.unit}</span>}
              <span>| {FREQUENCY_LABELS[kpi.frequency]}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowEdit(true)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (window.confirm("Archivar este KPI?"))
                  archiveKpi.mutate(kpiId, {
                    onSuccess: () => onClose(),
                    onError: () => {
                      toast({ title: "Error al archivar", description: "Intenta de nuevo", variant: "destructive" });
                    },
                  });
              }}
            >
              <Archive className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-4 gap-3">
          <MiniCard
            label="Valor Actual"
            value={lastEntry ? Number(lastEntry.actualValue).toLocaleString("es-MX") : "—"}
          />
          <MiniCard label="Target" value={Number(kpi.targetValue || 0).toLocaleString("es-MX")} />
          <MiniCard
            label="Cumplimiento"
            value={compliance !== null ? `${compliance.toFixed(1)}%` : "—"}
            className={getComplianceColor(compliance)}
          />
          <MiniCard
            label="Tendencia"
            value={lastEntry?.trend === "up" ? "Subiendo" : lastEntry?.trend === "down" ? "Bajando" : "Estable"}
          />
        </div>

        {trend.length > 0 && (
          <div className="mb-4">
            <h3 className="mb-2 text-sm font-semibold">Tendencia</h3>
            <div className="flex items-end gap-1" style={{ height: 120 }}>
              {trend.map((entry: any, i: number) => {
                const val = Number(entry.actualValue);
                const maxVal = Math.max(...trend.map((e: any) => Number(e.actualValue)), 1);
                const height = (val / maxVal) * 100;
                const c = Number(entry.compliance);
                return (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className={`w-full rounded-t ${getComplianceBg(c)}`}
                      style={{ height: `${height}%`, minHeight: 4 }}
                      title={`${entry.period}: ${val}`}
                    />
                    <span className="text-[9px] text-muted-foreground">{entry.period.slice(-2)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {entries.length > 0 && (
          <div className="mb-4">
            <h3 className="mb-2 text-sm font-semibold">Historial</h3>
            <div className="max-h-40 overflow-auto rounded border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-2 text-left font-medium">Periodo</th>
                    <th className="p-2 text-right font-medium">Actual</th>
                    <th className="p-2 text-right font-medium">Target</th>
                    <th className="p-2 text-right font-medium">Cumpl.</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {entries.slice(0, 12).map((e: any) => (
                    <tr key={e.id}>
                      <td className="p-2">{e.period}</td>
                      <td className="p-2 text-right">{Number(e.actualValue).toLocaleString("es-MX")}</td>
                      <td className="p-2 text-right">
                        {e.targetValue ? Number(e.targetValue).toLocaleString("es-MX") : "—"}
                      </td>
                      <td className={`p-2 text-right font-medium ${getComplianceColor(Number(e.compliance))}`}>
                        {e.compliance ? `${Number(e.compliance).toFixed(1)}%` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {actionPlans.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold">Planes de Accion</h3>
            <div className="space-y-2">
              {actionPlans.map((plan: any) => (
                <div key={plan.id} className="flex items-center justify-between rounded border p-2">
                  <div>
                    <span className="text-sm font-medium">{plan.title}</span>
                    <span
                      className={`ml-2 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${PLAN_STATUS_COLORS[plan.status] || ""}`}
                    >
                      {PLAN_STATUS_LABELS[plan.status] || plan.status}
                    </span>
                  </div>
                  {plan.dueDate && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(plan.dueDate).toLocaleDateString("es-MX")}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showEdit && <EditKpiModal kpi={kpi} onClose={() => setShowEdit(false)} />}
    </div>
  );
}

// ========================
// Create KPI Modal
// ========================

export function CreateKpiModal({
  categories,
  onClose,
  defaultAreaId,
}: {
  categories: any[];
  onClose: () => void;
  defaultAreaId?: number;
}) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [unit, setUnit] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [frequency, setFrequency] = useState("mensual");
  const createKpi = useCreateKpi();

  const handleSubmit = () => {
    createKpi.mutate(
      {
        name,
        description: description || undefined,
        categoryId: categoryId ? Number(categoryId) : undefined,
        unit: unit || undefined,
        targetValue: targetValue || undefined,
        frequency,
        areaId: defaultAreaId || undefined,
      },
      {
        onSuccess: () => onClose(),
        onError: () => {
          toast({ title: "Error al crear KPI", description: "Intenta de nuevo", variant: "destructive" });
        },
      },
    );
  };

  return (
    <ModalWrapper title="Nuevo KPI" onClose={onClose}>
      <div className="space-y-4">
        <FormField label="Nombre" value={name} onChange={setName} />
        <FormField label="Descripcion" value={description} onChange={setDescription} />
        <div>
          <Label className="mb-1 block text-sm font-medium">Categoria</Label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Sin categoria</option>
            {categories.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.displayName}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Unidad" value={unit} onChange={setUnit} placeholder="%, ton, $" />
          <FormField label="Valor Objetivo" value={targetValue} onChange={setTargetValue} type="number" />
        </div>
        <div>
          <Label className="mb-1 block text-sm font-medium">Frecuencia</Label>
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {Object.entries(FREQUENCY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <Button onClick={handleSubmit} disabled={!name || createKpi.isPending} className="w-full">
          Crear KPI
        </Button>
      </div>
    </ModalWrapper>
  );
}

// ========================
// Edit KPI Modal
// ========================

function EditKpiModal({ kpi, onClose }: { kpi: any; onClose: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState(kpi.name);
  const [description, setDescription] = useState(kpi.description || "");
  const [targetValue, setTargetValue] = useState(kpi.targetValue || "");
  const updateKpi = useUpdateKpi();

  const handleSubmit = () => {
    updateKpi.mutate(
      { id: kpi.id, name, description, targetValue },
      {
        onSuccess: () => onClose(),
        onError: () => {
          toast({ title: "Error al guardar", description: "Intenta de nuevo", variant: "destructive" });
        },
      },
    );
  };

  return (
    <ModalWrapper title="Editar KPI" onClose={onClose}>
      <div className="space-y-4">
        <FormField label="Nombre" value={name} onChange={setName} />
        <FormField label="Descripcion" value={description} onChange={setDescription} />
        <FormField label="Valor Objetivo" value={targetValue} onChange={setTargetValue} type="number" />
        <Button onClick={handleSubmit} disabled={!name || updateKpi.isPending} className="w-full">
          Guardar Cambios
        </Button>
      </div>
    </ModalWrapper>
  );
}

// ========================
// Create Action Plan Modal
// ========================

export function CreateActionPlanModal({
  kpis,
  onClose,
  defaultAreaId,
}: {
  kpis: any[];
  onClose: () => void;
  defaultAreaId?: number;
}) {
  const { toast } = useToast();
  const [kpiId, setKpiId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("media");
  const [dueDate, setDueDate] = useState("");
  const createPlan = useCreateActionPlan();

  const handleSubmit = () => {
    createPlan.mutate(
      { kpiId: Number(kpiId), title, description: description || undefined, priority, dueDate: dueDate || undefined },
      {
        onSuccess: () => onClose(),
        onError: () => {
          toast({ title: "Error al crear plan", description: "Intenta de nuevo", variant: "destructive" });
        },
      },
    );
  };

  return (
    <ModalWrapper title="Nuevo Plan de Accion" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <Label className="mb-1 block text-sm font-medium">KPI</Label>
          <select
            value={kpiId}
            onChange={(e) => setKpiId(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Seleccionar KPI...</option>
            {kpis.map((k: any) => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
          </select>
        </div>
        <FormField label="Titulo" value={title} onChange={setTitle} />
        <FormField label="Descripcion" value={description} onChange={setDescription} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="mb-1 block text-sm font-medium">Prioridad</Label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </select>
          </div>
          <div>
            <Label className="mb-1 block text-sm font-medium">Fecha Limite</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>
        <Button onClick={handleSubmit} disabled={!(kpiId && title) || createPlan.isPending} className="w-full">
          Crear Plan
        </Button>
      </div>
    </ModalWrapper>
  );
}
