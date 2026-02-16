import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  LineChart,
  PieChart,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
} from "lucide-react";
import {
  useLeadSourcesReport,
  useSalesForecast,
  useWinLossAnalysis,
  useCompetitorAnalysis,
} from "../api";

const formatCurrency = (value: string | number | null | undefined) => {
  if (!value) return "$0";
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

const formatPercent = (value: string | number | null | undefined) => {
  if (!value) return "0%";
  const num = typeof value === "string" ? parseFloat(value) : value;
  return `${num.toFixed(1)}%`;
};

export function ComercialReports() {
  const [activeTab, setActiveTab] = useState("sources");

  const { data: leadSources = [], isLoading: loadingSources } = useLeadSourcesReport();
  const { data: forecast = [], isLoading: loadingForecast } = useSalesForecast();
  const { data: winLoss, isLoading: loadingWinLoss } = useWinLossAnalysis();
  const { data: competitors = [], isLoading: loadingCompetitors } = useCompetitorAnalysis();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Reportes Comerciales</h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="sources" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Fuentes</span>
          </TabsTrigger>
          <TabsTrigger value="forecast" className="flex items-center gap-2">
            <LineChart className="h-4 w-4" />
            <span className="hidden sm:inline">Proyeccion</span>
          </TabsTrigger>
          <TabsTrigger value="winloss" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            <span className="hidden sm:inline">Win/Loss</span>
          </TabsTrigger>
          <TabsTrigger value="competitors" className="flex items-center gap-2">
            <BarChart className="h-4 w-4" />
            <span className="hidden sm:inline">Competencia</span>
          </TabsTrigger>
        </TabsList>

        {/* Lead Sources */}
        <TabsContent value="sources" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Fuentes de Leads</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingSources ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                </div>
              ) : leadSources.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No hay datos disponibles
                </p>
              ) : (
                <div className="space-y-4">
                  {leadSources.map((source: any) => (
                    <div key={source.source} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium capitalize">{source.source?.replace("_", " ") || "Desconocido"}</p>
                        <p className="text-sm text-muted-foreground">
                          {source.total} leads - {source.converted} convertidos
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatPercent(source.conversionRate)}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(source.totalValue)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sales Forecast */}
        <TabsContent value="forecast" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Proyeccion de Ventas</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingForecast ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                </div>
              ) : forecast.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No hay datos disponibles
                </p>
              ) : (
                <div className="space-y-4">
                  {forecast.map((month: any) => (
                    <div key={month.month} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium">{month.month}</p>
                        <p className="text-sm text-muted-foreground">
                          {month.count} oportunidades
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Valor Total</p>
                          <p className="font-semibold">{formatCurrency(month.totalValue)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Valor Ponderado</p>
                          <p className="font-semibold text-primary">
                            {formatCurrency(month.weightedValue)}
                          </p>
                        </div>
                      </div>
                      {/* Simple visual bar */}
                      <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{
                            width: `${Math.min(
                              100,
                              ((parseFloat(month.weightedValue) || 0) /
                                (parseFloat(month.totalValue) || 1)) *
                                100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Win/Loss Analysis */}
        <TabsContent value="winloss" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Resumen General</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingWinLoss ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                  </div>
                ) : !winLoss ? (
                  <p className="text-center py-8 text-muted-foreground">
                    No hay datos disponibles
                  </p>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <TrendingUp className="h-8 w-8 text-green-600" />
                        <div>
                          <p className="text-sm text-muted-foreground">Ganados</p>
                          <p className="text-2xl font-bold text-green-600">
                            {winLoss.won || 0}
                          </p>
                        </div>
                      </div>
                      <p className="text-lg font-semibold">
                        {formatCurrency(winLoss.wonValue)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <TrendingDown className="h-8 w-8 text-red-600" />
                        <div>
                          <p className="text-sm text-muted-foreground">Perdidos</p>
                          <p className="text-2xl font-bold text-red-600">
                            {winLoss.lost || 0}
                          </p>
                        </div>
                      </div>
                      <p className="text-lg font-semibold">
                        {formatCurrency(winLoss.lostValue)}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Win Rate</p>
                      <p className="text-3xl font-bold">
                        {formatPercent(winLoss.winRate)}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Motivos de Rechazo</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingWinLoss ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                  </div>
                ) : !winLoss?.rejectionReasons || winLoss.rejectionReasons.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    No hay rechazos registrados
                  </p>
                ) : (
                  <div className="space-y-3">
                    {winLoss.rejectionReasons.map((reason: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{reason.reason}</p>
                          <p className="text-xs text-muted-foreground">{reason.category}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{reason.count}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(reason.lostValue)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Competitor Analysis */}
        <TabsContent value="competitors" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Analisis de Competencia</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingCompetitors ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                </div>
              ) : competitors.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No hay datos de competidores
                </p>
              ) : (
                <div className="space-y-4">
                  {competitors.map((comp: any) => {
                    const total = (comp.wins || 0) + (comp.losses || 0);
                    const winRate = total > 0 ? ((comp.wins || 0) / total) * 100 : 0;

                    return (
                      <div key={comp.competitor} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium">{comp.competitor}</p>
                          <p className="text-sm text-muted-foreground">
                            {comp.mentions} menciones
                          </p>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div className="p-2 bg-green-50 rounded">
                            <p className="text-xs text-muted-foreground">Victorias</p>
                            <p className="font-semibold text-green-600">{comp.wins || 0}</p>
                          </div>
                          <div className="p-2 bg-red-50 rounded">
                            <p className="text-xs text-muted-foreground">Derrotas</p>
                            <p className="font-semibold text-red-600">{comp.losses || 0}</p>
                          </div>
                          <div className="p-2 bg-blue-50 rounded">
                            <p className="text-xs text-muted-foreground">Win Rate</p>
                            <p className="font-semibold text-blue-600">
                              {formatPercent(winRate)}
                            </p>
                          </div>
                        </div>
                        {/* Win/Loss bar */}
                        <div className="mt-3 h-2 bg-red-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 transition-all"
                            style={{ width: `${winRate}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
