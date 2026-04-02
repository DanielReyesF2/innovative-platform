import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bell,
  AlertTriangle,
  Clock,
  TrendingDown,
  Calendar,
  Check,
  X,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  useAlerts,
  usePendingAlertsCount,
  useAcknowledgeAlert,
  useDismissAlert,
} from "../api";
import type { FollowUpAlert } from "@shared/schema/comercial";

const alertTypeIcons: Record<string, React.ReactNode> = {
  overdue_follow_up: <Clock className="h-4 w-4 text-orange-500" />,
  stale_prospect: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
  high_value_at_risk: <TrendingDown className="h-4 w-4 text-red-500" />,
  scheduled_reminder: <Calendar className="h-4 w-4 text-blue-500" />,
};

const alertTypeLabels: Record<string, string> = {
  overdue_follow_up: "Seguimiento vencido",
  stale_prospect: "Prospecto inactivo",
  high_value_at_risk: "Alto valor en riesgo",
  scheduled_reminder: "Recordatorio",
};

const priorityColors: Record<string, string> = {
  muy_alta: "bg-red-100 text-red-700",
  alta: "bg-orange-100 text-orange-700",
  media: "bg-yellow-100 text-yellow-700",
  baja: "bg-gray-100 text-gray-700",
};

export function AlertsDropdown() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const { data: countData } = usePendingAlertsCount();
  const { data: alerts = [], isLoading } = useAlerts("pending");
  const acknowledgeAlert = useAcknowledgeAlert();
  const dismissAlert = useDismissAlert();

  const pendingCount = countData?.count || 0;

  const handleAcknowledge = async (id: number) => {
    try {
      await acknowledgeAlert.mutateAsync(id);
      toast({ title: "Alerta reconocida" });
    } catch {
      toast({
        title: "Error",
        description: "No se pudo reconocer la alerta",
        variant: "destructive",
      });
    }
  };

  const handleDismiss = async (id: number) => {
    try {
      await dismissAlert.mutateAsync(id);
      toast({ title: "Alerta descartada" });
    } catch {
      toast({
        title: "Error",
        description: "No se pudo descartar la alerta",
        variant: "destructive",
      });
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {pendingCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
              {pendingCount > 9 ? "9+" : pendingCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96">
        <div className="p-3 border-b">
          <h4 className="font-semibold">Alertas</h4>
          <p className="text-sm text-muted-foreground">
            {pendingCount} pendiente{pendingCount !== 1 ? "s" : ""}
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No hay alertas pendientes</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="p-2 space-y-2">
              {alerts.map((alert: FollowUpAlert) => (
                <div
                  key={alert.id}
                  className="bg-card border rounded-lg p-3 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {alertTypeIcons[alert.alertType ?? ''] || <Bell className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{alert.title}</p>
                        <Badge className={priorityColors[alert.priority ?? 'media'] || priorityColors.media}>
                          {alert.priority}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {alertTypeLabels[alert.alertType] || alert.alertType}
                      </p>
                      {alert.message && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {alert.message}
                        </p>
                      )}
                      {alert.dueDate && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Vence: {format(new Date(alert.dueDate), "PP", { locale: es })}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2 justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => handleDismiss(alert.id)}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Descartar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => handleAcknowledge(alert.id)}
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Reconocer
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
