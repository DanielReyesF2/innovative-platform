import { KpiSection } from "./components/KpiSection";

export default function KpisPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Centro de Control KPIs</h1>
        <p className="text-muted-foreground">Seguimiento de indicadores clave de desempeno</p>
      </div>

      <KpiSection />
    </div>
  );
}
