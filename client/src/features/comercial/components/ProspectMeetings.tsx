import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Plus,
  Clock,
  MapPin,
  Video,
  CheckCircle,
  XCircle,
  Users,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  useProspectMeetings,
  useCreateMeeting,
  useCompleteMeeting,
  useCancelMeeting,
} from "../api";
import type { ProspectMeeting } from "@shared/schema/comercial";

interface ProspectMeetingsProps {
  prospectId: number;
}

const statusColors: Record<string, string> = {
  programada: "bg-blue-100 text-blue-700",
  completada: "bg-green-100 text-green-700",
  cancelada: "bg-red-100 text-red-700",
  reprogramada: "bg-orange-100 text-orange-700",
};

const statusLabels: Record<string, string> = {
  programada: "Programada",
  completada: "Completada",
  cancelada: "Cancelada",
  reprogramada: "Reprogramada",
};

export function ProspectMeetings({ prospectId }: ProspectMeetingsProps) {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCompleteOpen, setIsCompleteOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<ProspectMeeting | null>(null);
  const [outcome, setOutcome] = useState("");
  const [newMeeting, setNewMeeting] = useState({
    title: "",
    description: "",
    scheduledAt: "",
    duration: 60,
    location: "",
    meetingUrl: "",
  });

  const { data: meetings = [], isLoading } = useProspectMeetings(prospectId);
  const createMeeting = useCreateMeeting();
  const completeMeeting = useCompleteMeeting();
  const cancelMeeting = useCancelMeeting();

  const handleCreateMeeting = async () => {
    if (!newMeeting.title.trim() || !newMeeting.scheduledAt) {
      toast({
        title: "Error",
        description: "Titulo y fecha son requeridos",
        variant: "destructive",
      });
      return;
    }

    try {
      await createMeeting.mutateAsync({
        prospectId,
        title: newMeeting.title,
        description: newMeeting.description || undefined,
        scheduledAt: new Date(newMeeting.scheduledAt).toISOString(),
        duration: newMeeting.duration,
        location: newMeeting.location || undefined,
        meetingUrl: newMeeting.meetingUrl || undefined,
      });
      toast({ title: "Reunion programada" });
      setIsCreateOpen(false);
      setNewMeeting({
        title: "",
        description: "",
        scheduledAt: "",
        duration: 60,
        location: "",
        meetingUrl: "",
      });
    } catch {
      toast({
        title: "Error",
        description: "No se pudo programar la reunion",
        variant: "destructive",
      });
    }
  };

  const handleCompleteMeeting = async () => {
    if (!selectedMeeting || !outcome.trim()) {
      toast({
        title: "Error",
        description: "El resultado es requerido",
        variant: "destructive",
      });
      return;
    }

    try {
      await completeMeeting.mutateAsync({
        prospectId,
        meetingId: selectedMeeting.id,
        outcome,
      });
      toast({ title: "Reunion completada" });
      setIsCompleteOpen(false);
      setSelectedMeeting(null);
      setOutcome("");
    } catch {
      toast({
        title: "Error",
        description: "No se pudo completar la reunion",
        variant: "destructive",
      });
    }
  };

  const handleCancelMeeting = async (meetingId: number) => {
    try {
      await cancelMeeting.mutateAsync({ prospectId, meetingId });
      toast({ title: "Reunion cancelada" });
    } catch {
      toast({
        title: "Error",
        description: "No se pudo cancelar la reunion",
        variant: "destructive",
      });
    }
  };

  const upcomingMeetings = meetings.filter(
    (m: ProspectMeeting) => m.status === "programada" || m.status === "reprogramada"
  );
  const pastMeetings = meetings.filter(
    (m: ProspectMeeting) => m.status === "completada" || m.status === "cancelada"
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium">Reuniones</h4>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Programar
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Programar Reunion</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium">Titulo</label>
                <Input
                  className="mt-1"
                  placeholder="Ej: Presentacion de propuesta"
                  value={newMeeting.title}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewMeeting({ ...newMeeting, title: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Fecha y Hora</label>
                <Input
                  className="mt-1"
                  type="datetime-local"
                  value={newMeeting.scheduledAt}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewMeeting({ ...newMeeting, scheduledAt: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Duracion (minutos)</label>
                <Select
                  value={String(newMeeting.duration)}
                  onValueChange={(v: string) =>
                    setNewMeeting({ ...newMeeting, duration: parseInt(v) })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="60">1 hora</SelectItem>
                    <SelectItem value="90">1.5 horas</SelectItem>
                    <SelectItem value="120">2 horas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Ubicacion (opcional)</label>
                <Input
                  className="mt-1"
                  placeholder="Ej: Oficinas del cliente"
                  value={newMeeting.location}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewMeeting({ ...newMeeting, location: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Link de videollamada (opcional)</label>
                <Input
                  className="mt-1"
                  placeholder="https://meet.google.com/..."
                  value={newMeeting.meetingUrl}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewMeeting({ ...newMeeting, meetingUrl: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Descripcion (opcional)</label>
                <Textarea
                  className="mt-1"
                  placeholder="Agenda o detalles..."
                  value={newMeeting.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setNewMeeting({ ...newMeeting, description: e.target.value })
                  }
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateMeeting} disabled={createMeeting.isPending}>
                  {createMeeting.isPending ? "Guardando..." : "Programar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </div>
      ) : meetings.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p>No hay reuniones programadas</p>
        </div>
      ) : (
        <div className="space-y-6">
          {upcomingMeetings.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-muted-foreground mb-3">Proximas</h5>
              <div className="space-y-3">
                {upcomingMeetings.map((meeting: ProspectMeeting) => (
                  <div key={meeting.id} className="bg-card border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{meeting.title}</p>
                          <Badge className={statusColors[meeting.status ?? '']}>
                            {statusLabels[meeting.status ?? '']}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {meeting.scheduledAt
                              ? format(new Date(meeting.scheduledAt), "PPp", { locale: es })
                              : ""}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {meeting.duration} min
                          </span>
                        </div>
                        {meeting.location && (
                          <p className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            {meeting.location}
                          </p>
                        )}
                        {meeting.meetingUrl && (
                          <a
                            href={meeting.meetingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 mt-1 text-sm text-primary hover:underline"
                          >
                            <Video className="h-4 w-4" />
                            Unirse a la videollamada
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedMeeting(meeting);
                          setIsCompleteOpen(true);
                        }}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Completar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCancelMeeting(meeting.id)}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pastMeetings.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-muted-foreground mb-3">Historial</h5>
              <div className="space-y-3">
                {pastMeetings.map((meeting: ProspectMeeting) => (
                  <div key={meeting.id} className="bg-card border rounded-lg p-4 opacity-75">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{meeting.title}</p>
                      <Badge className={statusColors[meeting.status ?? '']}>
                        {statusLabels[meeting.status ?? '']}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {meeting.scheduledAt
                        ? format(new Date(meeting.scheduledAt), "PPp", { locale: es })
                        : ""}
                    </p>
                    {meeting.outcome && (
                      <p className="text-sm mt-2 bg-muted p-2 rounded">
                        <strong>Resultado:</strong> {meeting.outcome}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Complete Meeting Dialog */}
      <Dialog open={isCompleteOpen} onOpenChange={setIsCompleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Completar Reunion</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">Resultado de la reunion</label>
              <Textarea
                className="mt-1"
                placeholder="Describe el resultado, acuerdos y proximos pasos..."
                value={outcome}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setOutcome(e.target.value)}
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCompleteOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCompleteMeeting} disabled={completeMeeting.isPending}>
                {completeMeeting.isPending ? "Guardando..." : "Completar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
