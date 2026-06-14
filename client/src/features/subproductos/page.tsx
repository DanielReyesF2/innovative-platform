import {
  AlertCircle,
  BarChart3,
  ChevronRight,
  Clock,
  DollarSign,
  FileText,
  Inbox,
  Leaf,
  Recycle,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiSection } from "@/features/kpis/components/KpiSection";
import {
  useClientTraceabilitySummary,
  useCotizaciones,
  useCotizacionKpis,
  usePendingReports,
  useServiceClients,
  useSubproductosSummary,
} from "./api";
import { CotizacionDetail } from "./components/CotizacionDetail";

const _REPORT_STATUS_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  en_proceso: "En Proceso",
  enviado: "Enviado",
  confirmado: "Confirmado",
};

const _REPORT_STATUS_COLORS: Record<string, string> = {
  pendiente: "bg-yellow-100 text-yellow-800",
  en_proceso: "bg-blue-100 text-blue-800",
  enviado: "bg-green-100 text-green-800",
  confirmado: "bg-emerald-100 text-emerald-800",
};

export default function SubproductosPage() {
  const [mainTab, setMainTab] = useState<"bandeja" | "trazabilidad" | "kpis">("bandeja");

  const tabs = [
    { key: "bandeja" as const, label: "Bandeja", icon: Inbox },
    { key: "trazabilidad" as const, label: "Trazabilidad", icon: Recycle },
    { key: "kpis" as const, label: "KPIs", icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Subproductos · Soporte Comercial</h1>
        <p className="text-muted-foreground">
          Levantamientos por cotizar, trazabilidad ambiental y reportes a clientes
        </p>
      </div>

      {/* Main tab selector */}
      <div className="flex gap-2 border-b pb-2">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setMainTab(key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
              mainTab === key ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {mainTab === "bandeja" && <BandejaView />}
      {mainTab === "trazabilidad" && <TrazabilidadView />}
      {mainTab === "kpis" && <KpiSection moduleSlug="subproductos" compact />}
    </div>
  );
}

function TrazabilidadView() {
  const { data: clients = [], isError: clientsError } = useServiceClients();
  const { data: summary } = useSubproductosSummary();
  const { data: pendingReports = [], isError: reportsError } = usePendingReports();
  const [selectedClient, setSelectedClient] = useState<any>(null);

  if (clientsError || reportsError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
        <div className="text-red-500 text-4xl">⚠</div>
        <h2 className="text-lg font-semibold text-[#1c2c4a]">Error al cargar subproductos</h2>
        <p className="text-sm text-[#6b7280]">
          Hubo un problema al conectar con el servidor. Intenta recargar la página.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-4 py-2 text-sm font-medium text-white bg-[#0067B0] rounded-lg hover:bg-[#00558f]"
        >
          Recargar
        </button>
      </div>
    );
  }

  return (
    <>
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Clientes Activos"
          value={String(summary?.activeClients || clients.length)}
          description="Con servicio activo"
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Reportes Pendientes"
          value={String(summary?.pendingReports || pendingReports.length)}
          description="Requieren envío"
          icon={<FileText className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Ingresos Acum."
          value={`$${(Number(summary?.totalRevenue || 0) / 1_000_000).toFixed(1)}M`}
          description="Total trazabilidad"
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Impacto Ambiental"
          value={String(clients.length)}
          description="Clientes con trazabilidad"
          icon={<Leaf className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      {/* Pending reports alert */}
      {pendingReports.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="flex items-center gap-3 p-4">
            <Clock className="h-5 w-5 text-yellow-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800">
                {pendingReports.length} reportes pendientes de envío
              </p>
              <p className="text-xs text-yellow-700">Revisa y envía los reportes mensuales a tus clientes</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Clients list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Clientes con Servicio ({clients.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <AlertCircle className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p>No hay clientes con servicio activo</p>
            </div>
          ) : (
            <div className="space-y-3">
              {clients.map((client: any) => (
                <button
                  key={client.id}
                  onClick={() => setSelectedClient(client)}
                  className="flex w-full items-center justify-between rounded-lg border p-4 text-left transition-colors hover:bg-accent"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-lg">
                      {client.logo || "🏢"}
                    </div>
                    <div>
                      <div className="font-semibold">{client.name}</div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>{client.branchCount} sucursales</span>
                        {client.monthlyAverage && <span>{Number(client.monthlyAverage).toFixed(1)} ton/mes</span>}
                        {client.valorizationRate && (
                          <span className="text-green-600">
                            {Number(client.valorizationRate).toFixed(0)}% valorización
                          </span>
                        )}
                      </div>
                      {client.servicesContracted && (
                        <div className="mt-1 flex gap-1">
                          {(client.servicesContracted as string[]).slice(0, 3).map((s: string) => (
                            <span key={s} className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs">
                              {s}
                            </span>
                          ))}
                        </div>
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

      {/* Client detail modal */}
      {selectedClient && <ClientDetailModal client={selectedClient} onClose={() => setSelectedClient(null)} />}
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

function ClientDetailModal({ client, onClose }: { client: any; onClose: () => void }) {
  const { data: traceSummary } = useClientTraceabilitySummary(client.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[80vh] w-full max-w-3xl overflow-auto rounded-lg bg-background p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-lg">
              {client.logo || "🏢"}
            </div>
            <div>
              <h2 className="text-xl font-bold">{client.name}</h2>
              <p className="text-sm text-muted-foreground">
                {client.branchCount} sucursales · {client.collectionFrequency}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>

        {/* Summary metrics */}
        {traceSummary && (
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border p-3 text-center">
              <div className="text-lg font-bold text-green-600">{traceSummary.diversionRate.toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground">Desviación</div>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <div className="text-lg font-bold">{(traceSummary.totalManaged / 1000).toFixed(1)}t</div>
              <div className="text-xs text-muted-foreground">Total Gestionado</div>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <div className="text-lg font-bold text-green-600">{traceSummary.treesSaved.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Árboles Salvados</div>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <div className="text-lg font-bold">{traceSummary.co2Avoided.toFixed(1)}t</div>
              <div className="text-xs text-muted-foreground">CO₂ Evitado</div>
            </div>
          </div>
        )}

        {/* Client details */}
        <div className="grid gap-4 sm:grid-cols-2">
          <InfoRow label="Contacto" value={client.contactName} />
          <InfoRow label="Email" value={client.contactEmail} />
          <InfoRow
            label="Inicio Operación"
            value={
              client.operationStartDate ? new Date(client.operationStartDate).toLocaleDateString("es-MX") : undefined
            }
          />
          <InfoRow
            label="Promedio Mensual"
            value={client.monthlyAverage ? `${Number(client.monthlyAverage).toFixed(1)} ton/mes` : undefined}
          />
        </div>

        {/* Destinations */}
        {client.recyclingDestination && (
          <div className="mt-4 rounded-lg border p-3">
            <h3 className="mb-2 text-sm font-semibold">Destinos Finales</h3>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <DestRow label="Reciclaje" value={client.recyclingDestination} registry={client.recyclingRegistry} />
              <DestRow label="Composta" value={client.compostDestination} registry={client.compostRegistry} />
              <DestRow label="Reuso" value={client.reuseDestination} registry={client.reuseRegistry} />
              <DestRow label="Relleno" value={client.landfillDestination} registry={client.landfillRegistry} />
            </div>
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

function DestRow({ label, value, registry }: { label: string; value?: string | null; registry?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="text-sm">{value}</div>
      {registry && <div className="text-xs text-muted-foreground">{registry}</div>}
    </div>
  );
}

function daysSince(date?: string | null): number | null {
  if (!date) return null;
  return Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
}

// Columnas del pipeline de cotización (kanban). El orden = el flujo real.
// "rechazado" no es columna: rechazar el VoBo regresa el ítem a en_cotizacion.
const PIPELINE_COLUMNS = [
  { key: "recibido", label: "Recibido", accent: "border-t-blue-400", badge: "bg-blue-100 text-blue-800" },
  {
    key: "en_cotizacion",
    label: "En cotización",
    accent: "border-t-yellow-400",
    badge: "bg-yellow-100 text-yellow-800",
  },
  { key: "en_vobo", label: "En VoBo", accent: "border-t-purple-400", badge: "bg-purple-100 text-purple-800" },
  { key: "aprobado", label: "Aprobado", accent: "border-t-green-500", badge: "bg-green-100 text-green-800" },
] as const;

function BandejaCard({ cot, onClick }: { cot: any; onClick: () => void }) {
  const dias = daysSince(cot.receivedAt);
  // Aviso visual cuando algo lleva mucho esperando (sobre todo recibidos sin tomar).
  const stale = dias != null && dias >= 3 && (cot.status === "recibido" || cot.status === "en_cotizacion");
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-lg border bg-card p-3 text-left shadow-sm transition-colors hover:bg-accent"
    >
      <div className="text-sm font-medium leading-tight">{cot.prospectName || cot.title}</div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${
            stale ? "bg-red-100 text-red-700" : "bg-muted text-muted-foreground"
          }`}
        >
          <Clock className="h-3 w-3" />
          {dias != null ? `${dias} d` : "—"}
        </span>
        {cot.needsReview && (
          <span className="inline-flex rounded-full bg-orange-100 px-2 py-0.5 text-[11px] text-orange-800">
            Actualizado
          </span>
        )}
      </div>
    </button>
  );
}

function BandejaView() {
  const { data: cotizaciones = [], isError } = useCotizaciones();
  const { data: kpis } = useCotizacionKpis();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
        <div className="text-red-500 text-4xl">⚠</div>
        <h2 className="text-lg font-semibold text-[#1c2c4a]">Error al cargar la bandeja</h2>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-4 py-2 text-sm font-medium text-white bg-[#0067B0] rounded-lg hover:bg-[#00558f]"
        >
          Recargar
        </button>
      </div>
    );
  }

  const byStatus = (status: string) => cotizaciones.filter((c: any) => c.status === status);
  const porCotizar = byStatus("recibido").length;
  const enProceso = byStatus("en_cotizacion").length + byStatus("en_vobo").length;
  const aprobadas = byStatus("aprobado").length;

  return (
    <>
      {/* KPIs del pipeline (tiempos de respuesta — lo que pidió Verónica) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Por cotizar"
          value={String(porCotizar)}
          description="Levantamientos recibidos sin tomar"
          icon={<Inbox className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Tiempo prom. de respuesta"
          value={kpis?.avgDaysToApprove != null ? `${kpis.avgDaysToApprove.toFixed(1)} d` : "—"}
          description="Recibido → aprobado"
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="En proceso"
          value={String(enProceso)}
          description="En cotización + en VoBo"
          icon={<FileText className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Aprobadas"
          value={String(aprobadas)}
          description="Listas para enviar"
          icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      {/* Pipeline kanban */}
      {cotizaciones.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Inbox className="mx-auto mb-3 h-10 w-10 opacity-40" />
            <p className="font-medium">La bandeja está vacía</p>
            <p className="text-sm">
              Cuando Operaciones apruebe un levantamiento, aparecerá aquí automáticamente para cotizar.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {PIPELINE_COLUMNS.map((col) => {
            const items = byStatus(col.key);
            return (
              <div key={col.key} className={`rounded-lg border border-t-4 bg-muted/30 ${col.accent}`}>
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm font-semibold">{col.label}</span>
                  <span
                    className={`inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-xs font-medium ${col.badge}`}
                  >
                    {items.length}
                  </span>
                </div>
                <div className="min-h-[120px] space-y-2 p-2">
                  {items.length === 0 ? (
                    <p className="px-1 py-6 text-center text-xs text-muted-foreground">—</p>
                  ) : (
                    items.map((c: any) => <BandejaCard key={c.id} cot={c} onClick={() => setSelectedId(c.id)} />)
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedId != null && <CotizacionDetail id={selectedId} onClose={() => setSelectedId(null)} />}
    </>
  );
}
