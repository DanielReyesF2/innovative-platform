import { AlertCircle, BarChart3, ChevronRight, Clock, DollarSign, FileText, Leaf, Recycle, Users } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiSection } from "@/features/kpis/components/KpiSection";
import { useCotizacionKpis, useCotizaciones, useClientTraceabilitySummary, usePendingReports, useServiceClients, useSubproductosSummary } from "./api";
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
  const [mainTab, setMainTab] = useState<"trazabilidad" | "cotizaciones" | "kpis">("cotizaciones");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Subproductos</h1>
        <p className="text-muted-foreground">Trazabilidad, reportes a clientes, modelos económicos y conciliación</p>
      </div>

      {/* Main tab selector */}
      <div className="flex gap-2 border-b pb-2">
        <button
          onClick={() => setMainTab("trazabilidad")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
            mainTab === "trazabilidad"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Recycle className="h-4 w-4" />
          Trazabilidad
        </button>
        <button
          onClick={() => setMainTab("cotizaciones")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
            mainTab === "cotizaciones"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="h-4 w-4" />
          Cotizaciones
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
      </div>

      {mainTab === "trazabilidad" && <TrazabilidadView />}
      {mainTab === "cotizaciones" && <CotizacionesView />}
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

const COTIZACION_STATUS: Record<string, { label: string; color: string }> = {
  recibido: { label: "Recibido", color: "bg-blue-100 text-blue-800" },
  en_cotizacion: { label: "En cotización", color: "bg-yellow-100 text-yellow-800" },
  en_vobo: { label: "En VoBo", color: "bg-purple-100 text-purple-800" },
  aprobado: { label: "Aprobado", color: "bg-green-100 text-green-800" },
  rechazado: { label: "Rechazado", color: "bg-red-100 text-red-800" },
};

function daysSince(date?: string | null): number | null {
  if (!date) return null;
  return Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
}

function CotizacionesView() {
  const { data: cotizaciones = [], isError } = useCotizaciones();
  const { data: kpis } = useCotizacionKpis();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
        <div className="text-red-500 text-4xl">⚠</div>
        <h2 className="text-lg font-semibold text-[#1c2c4a]">Error al cargar cotizaciones</h2>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-4 py-2 text-sm font-medium text-white bg-[#0067B0] rounded-lg hover:bg-[#00558f]"
        >
          Recargar
        </button>
      </div>
    );
  }

  const recibidos = cotizaciones.filter((c: any) => c.status === "recibido").length;

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Recibidos sin tomar"
          value={String(kpis?.pendingReception ?? recibidos)}
          description="Levantamientos por cotizar"
          icon={<FileText className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Tiempo prom. a aprobación"
          value={kpis?.avgDaysToApprove != null ? `${kpis.avgDaysToApprove.toFixed(1)} d` : "—"}
          description="Recibido → aprobado"
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="En VoBo"
          value={String(kpis?.byStatus?.en_vobo ?? 0)}
          description="Esperando visto bueno"
          icon={<AlertCircle className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Aprobadas"
          value={String(kpis?.byStatus?.aprobado ?? 0)}
          description="Listas para enviar"
          icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Bandeja de cotización ({cotizaciones.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {cotizaciones.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <AlertCircle className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p>No hay levantamientos en la bandeja todavía</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cotizaciones.map((c: any) => {
                const st = COTIZACION_STATUS[c.status] ?? { label: c.status, color: "bg-gray-100 text-gray-800" };
                const dias = daysSince(c.receivedAt);
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className="flex w-full items-center justify-between rounded-lg border p-4 text-left transition-colors hover:bg-accent"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{c.prospectName || c.title}</span>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${st.color}`}>{st.label}</span>
                        {c.needsReview && (
                          <span className="inline-flex rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-800">
                            Levantamiento actualizado
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {dias != null ? `Recibido hace ${dias} día${dias === 1 ? "" : "s"}` : "Sin fecha"}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedId != null && <CotizacionDetail id={selectedId} onClose={() => setSelectedId(null)} />}
    </>
  );
}
