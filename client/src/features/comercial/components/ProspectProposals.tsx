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
  Send,
  Plus,
  FileText,
  Clock,
  DollarSign,
  ExternalLink,
  CheckCircle,
  XCircle,
  Eye,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  useProposalVersions,
  useCreateProposal,
  useSendProposal,
  useChangeProposalStatus,
} from "../api";

interface ProspectProposalsProps {
  prospectId: number;
}

const statusColors: Record<string, string> = {
  borrador: "bg-gray-100 text-gray-700",
  enviada: "bg-blue-100 text-blue-700",
  revisada: "bg-yellow-100 text-yellow-700",
  aceptada: "bg-green-100 text-green-700",
  rechazada: "bg-red-100 text-red-700",
};

const statusLabels: Record<string, string> = {
  borrador: "Borrador",
  enviada: "Enviada",
  revisada: "Revisada",
  aceptada: "Aceptada",
  rechazada: "Rechazada",
};

const formatCurrency = (value: string | number | null | undefined) => {
  if (!value) return "-";
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
  }).format(num);
};

export function ProspectProposals({ prospectId }: ProspectProposalsProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newProposal, setNewProposal] = useState({
    name: "",
    url: "",
    amount: "",
    validUntil: "",
    notes: "",
  });

  const { data: proposals = [], isLoading } = useProposalVersions(prospectId);
  const createProposal = useCreateProposal();
  const sendProposal = useSendProposal();
  const changeStatus = useChangeProposalStatus();

  const handleCreateProposal = async () => {
    if (!newProposal.name.trim() || !newProposal.url.trim()) {
      toast({
        title: "Error",
        description: "Nombre y URL son requeridos",
        variant: "destructive",
      });
      return;
    }

    try {
      await createProposal.mutateAsync({
        prospectId,
        name: newProposal.name,
        url: newProposal.url,
        amount: newProposal.amount ? parseFloat(newProposal.amount) : undefined,
        validUntil: newProposal.validUntil
          ? new Date(newProposal.validUntil).toISOString()
          : undefined,
        notes: newProposal.notes || undefined,
      });
      toast({ title: "Propuesta creada" });
      setIsDialogOpen(false);
      setNewProposal({ name: "", url: "", amount: "", validUntil: "", notes: "" });
    } catch {
      toast({
        title: "Error",
        description: "No se pudo crear la propuesta",
        variant: "destructive",
      });
    }
  };

  const handleSendProposal = async (proposalId: number) => {
    try {
      await sendProposal.mutateAsync({ prospectId, proposalId });
      toast({ title: "Propuesta enviada" });
    } catch {
      toast({
        title: "Error",
        description: "No se pudo enviar la propuesta",
        variant: "destructive",
      });
    }
  };

  const handleChangeStatus = async (proposalId: number, status: string) => {
    try {
      await changeStatus.mutateAsync({ prospectId, proposalId, status });
      toast({ title: "Estado actualizado" });
    } catch {
      toast({
        title: "Error",
        description: "No se pudo cambiar el estado",
        variant: "destructive",
      });
    }
  };

  // Get next version number
  const nextVersion = proposals.length > 0
    ? Math.max(...proposals.map((p: any) => p.version || 1)) + 1
    : 1;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="font-medium">Propuestas</h4>
          <p className="text-xs text-muted-foreground">
            Versiones de propuesta comercial con seguimiento de status (borrador → enviada → aceptada)
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Nueva Version
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva Propuesta (v{nextVersion})</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium">Nombre</label>
                <Input
                  className="mt-1"
                  placeholder="Ej: Propuesta servicio integral"
                  value={newProposal.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewProposal({ ...newProposal, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">URL del documento</label>
                <Input
                  className="mt-1"
                  placeholder="https://drive.google.com/..."
                  value={newProposal.url}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewProposal({ ...newProposal, url: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Monto (opcional)</label>
                <Input
                  className="mt-1"
                  type="number"
                  placeholder="150000"
                  value={newProposal.amount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewProposal({ ...newProposal, amount: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Valida hasta (opcional)</label>
                <Input
                  className="mt-1"
                  type="date"
                  value={newProposal.validUntil}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewProposal({ ...newProposal, validUntil: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Notas (opcional)</label>
                <Textarea
                  className="mt-1"
                  placeholder="Cambios respecto a version anterior..."
                  value={newProposal.notes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setNewProposal({ ...newProposal, notes: e.target.value })
                  }
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateProposal} disabled={createProposal.isPending}>
                  {createProposal.isPending ? "Guardando..." : "Crear"}
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
      ) : proposals.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p>No hay propuestas</p>
        </div>
      ) : (
        <div className="space-y-4">
          {[...proposals]
            .sort((a: any, b: any) => (b.version || 1) - (a.version || 1))
            .map((proposal: any) => (
              <div
                key={proposal.id}
                className={`bg-card border rounded-lg p-4 ${
                  proposal.status === "aceptada" ? "border-green-400" : ""
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium bg-muted px-2 py-0.5 rounded">
                        v{proposal.version || 1}
                      </span>
                      <p className="font-medium">{proposal.name}</p>
                      <Badge className={statusColors[proposal.status]}>
                        {statusLabels[proposal.status]}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                      {proposal.amount && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          {formatCurrency(proposal.amount)}
                        </span>
                      )}
                      {proposal.validUntil && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Valida hasta:{" "}
                          {format(new Date(proposal.validUntil), "PP", { locale: es })}
                        </span>
                      )}
                    </div>

                    {proposal.sentAt && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Enviada: {format(new Date(proposal.sentAt), "PPp", { locale: es })}
                      </p>
                    )}

                    {proposal.notes && (
                      <p className="text-sm text-muted-foreground mt-2 bg-muted p-2 rounded">
                        {proposal.notes}
                      </p>
                    )}
                  </div>

                  <Button size="icon" variant="ghost" asChild>
                    <a href={proposal.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>

                {/* Actions based on status */}
                <div className="flex gap-2 mt-3 flex-wrap">
                  {proposal.status === "borrador" && (
                    <Button
                      size="sm"
                      onClick={() => handleSendProposal(proposal.id)}
                      disabled={sendProposal.isPending}
                    >
                      <Send className="h-4 w-4 mr-1" />
                      Marcar como Enviada
                    </Button>
                  )}

                  {proposal.status === "enviada" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleChangeStatus(proposal.id, "revisada")}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Cliente Reviso
                    </Button>
                  )}

                  {(proposal.status === "enviada" || proposal.status === "revisada") && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 hover:text-green-700"
                        onClick={() => handleChangeStatus(proposal.id, "aceptada")}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Aceptada
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleChangeStatus(proposal.id, "rechazada")}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Rechazada
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
