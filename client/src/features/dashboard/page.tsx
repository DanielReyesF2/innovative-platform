import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useProspects, usePipeline, useComercialTeam } from "@/features/comercial/api";
import { Users, TrendingUp, BarChart3, DollarSign } from "lucide-react";

const STAGE_LABELS: Record<string, string> = {
  contacto_inicial: "Contacto Inicial",
  presentacion: "Presentacion",
  levantamiento: "Levantamiento",
  propuesta: "Propuesta",
  negociacion: "Negociacion",
  cierre_ganado: "Ganado",
  cierre_perdido: "Perdido",
};

const STAGE_COLORS: Record<string, string> = {
  contacto_inicial: "bg-blue-500",
  presentacion: "bg-indigo-500",
  levantamiento: "bg-yellow-500",
  propuesta: "bg-orange-500",
  negociacion: "bg-purple-500",
  cierre_ganado: "bg-green-500",
  cierre_perdido: "bg-red-500",
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: prospects = [] } = useProspects();
  const { data: pipeline = [] } = usePipeline();
  const { data: team = [] } = useComercialTeam();

  const activeProspects = prospects.filter(
    (p: any) => !["cierre_ganado", "cierre_perdido"].includes(p.stage)
  );
  const pipelineValue = activeProspects.reduce(
    (sum: number, p: any) => sum + (parseFloat(p.estimatedValue) || 0),
    0
  );
  const wonCount = prospects.filter((p: any) => p.stage === "cierre_ganado").length;
  const conversionRate = prospects.length > 0
    ? Math.round((wonCount / prospects.length) * 100)
    : 0;

  const maxStageCount = Math.max(...pipeline.map((s: any) => s.count || 0), 1);

  const recentProspects = [...prospects]
    .sort((a: any, b: any) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Bienvenido, {user?.name}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Prospectos"
          value={String(prospects.length)}
          description={`${activeProspects.length} activos`}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Pipeline Activo"
          value={`$${pipelineValue.toLocaleString("es-MX")}`}
          description={`${activeProspects.length} prospectos en pipeline`}
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Tasa de Conversion"
          value={`${conversionRate}%`}
          description={`${wonCount} de ${prospects.length} cerrados`}
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Equipo Activo"
          value={String(team.length)}
          description="Miembros del equipo comercial"
          icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Pipeline por etapa */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pipeline por Etapa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pipeline.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin datos de pipeline</p>
            ) : (
              pipeline.map((stage: any) => (
                <div key={stage.stage} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{STAGE_LABELS[stage.stage] || stage.stage}</span>
                    <span className="font-medium">{stage.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${STAGE_COLORS[stage.stage] || "bg-primary"}`}
                      style={{ width: `${(stage.count / maxStageCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Equipo comercial */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Equipo Comercial</CardTitle>
          </CardHeader>
          <CardContent>
            {team.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin equipo configurado</p>
            ) : (
              <div className="space-y-3">
                {team.map((member: any) => (
                  <div key={member.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold">
                        {member.name?.charAt(0).toUpperCase() || "?"}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{member.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {member.prospectCount ?? 0} prospectos
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      <p className="text-muted-foreground">
                        Presupuesto: ${(parseFloat(member.salesBudget) || 0).toLocaleString("es-MX")}
                      </p>
                      <p className="font-medium">
                        Ventas: ${(parseFloat(member.actualSales) || 0).toLocaleString("es-MX")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Actividad reciente */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Actividad Reciente</CardTitle>
        </CardHeader>
        <CardContent>
          {recentProspects.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin prospectos registrados</p>
          ) : (
            <div className="space-y-3">
              {recentProspects.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{p.companyName || p.contactName}</p>
                    <p className="text-xs text-muted-foreground">{p.contactName}</p>
                  </div>
                  <Badge variant="outline">{STAGE_LABELS[p.stage] || p.stage}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
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
