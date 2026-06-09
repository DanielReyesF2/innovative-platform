import type { ProposalVersion } from "@shared/schema/comercial";
import { useMutation, useMutation as useRQMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle, Clock, DollarSign, ExternalLink, Eye, FileText, Send, Upload, XCircle } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { apiRequest, getAuthToken, invalidateByPrefix } from "@/lib/queryClient";
import { fmtCurrency } from "@/lib/utils";
import { useChangeProposalStatus, useProposalVersions, useSendProposal, useUpdateProposal } from "../api";
import { openProspectFile } from "../open-file";
import { InlineNumber, InlineText } from "./InlineEdit";

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

// Detalles editables adicionales de una propuesta (spec Vero): margen de
// utilidad + contacto receptor. Cada campo se guarda inline.
function ProposalDetails({ prospectId, proposal }: { prospectId: number; proposal: ProposalVersion }) {
  const updateProposal = useUpdateProposal();

  const saveField = async (patch: Record<string, unknown>) => {
    await updateProposal.mutateAsync({ prospectId, proposalId: proposal.id, ...patch });
  };

  const utilidad = proposal.utilidad != null ? Number(proposal.utilidad) : null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 pt-3 border-t border-[#f3f4f6]">
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-widest text-[#9ca3af] mb-0.5">
          Margen de utilidad
        </div>
        <InlineNumber
          value={utilidad}
          onSave={(v) => saveField({ utilidad: v })}
          min={0}
          max={100}
          suffix="%"
          emptyLabel="Sin definir"
        />
      </div>
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-widest text-[#9ca3af] mb-0.5">Recibe (nombre)</div>
        <InlineText
          value={proposal.recipientName || ""}
          onSave={(v) => saveField({ recipientName: v || null })}
          emptyLabel="Contacto receptor"
          placeholder="Nombre"
        />
      </div>
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-widest text-[#9ca3af] mb-0.5">Recibe (cargo)</div>
        <InlineText
          value={proposal.recipientRole || ""}
          onSave={(v) => saveField({ recipientRole: v || null })}
          emptyLabel="Cargo"
          placeholder="Ej: Gerente de Operaciones"
        />
      </div>
    </div>
  );
}

// Inline editable amount
function ProposalAmountInput({ prospectId: pid, proposal }: { prospectId: number; proposal: ProposalVersion }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(proposal.amount ? String(proposal.amount) : "");
  const { toast } = useToast();

  const saveMutation = useRQMutation({
    mutationFn: async (amount: string) => {
      const res = await apiRequest("PATCH", `/api/comercial/prospects/${pid}/proposals/${proposal.id}/amount`, {
        amount,
      });
      return res.json();
    },
    onSuccess: () => {
      invalidateByPrefix(`/api/comercial/prospects/${pid}`);
      setEditing(false);
      toast({ title: "Monto actualizado" });
    },
  });

  if (editing) {
    return (
      <span className="flex items-center gap-1">
        <DollarSign className="h-3.5 w-3.5" />
        <input
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => {
            if (value.trim()) saveMutation.mutate(value);
            else setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && value.trim()) saveMutation.mutate(value);
            if (e.key === "Escape") setEditing(false);
          }}
          className="w-28 px-1.5 py-0.5 text-sm border border-[#0067B0] rounded focus:outline-none focus:ring-1 focus:ring-[#0067B0]"
          placeholder="0.00"
        />
      </span>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="flex items-center gap-1 hover:text-[#0067B0] transition-colors"
      title="Click para editar monto"
    >
      <DollarSign className="h-3.5 w-3.5" />
      {proposal.amount ? (
        fmtCurrency(proposal.amount)
      ) : (
        <span className="text-[#F57C00] text-xs font-medium">+ Agregar monto</span>
      )}
    </button>
  );
}

export function ProspectProposals({ prospectId }: ProspectProposalsProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { data: proposals = [], isLoading } = useProposalVersions(prospectId);
  const sendProposal = useSendProposal();
  const changeStatus = useChangeProposalStatus();

  // File upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const headers: Record<string, string> = {};
      const token = getAuthToken();
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch(`/api/comercial/prospects/${prospectId}/proposals/upload`, {
        method: "POST",
        headers,
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Error al subir propuesta");
      }
      return response.json();
    },
    onSuccess: () => {
      invalidateByPrefix(`/api/comercial/prospects/${prospectId}`);
      toast({ title: "Propuesta subida correctamente" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleFileUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setUploading(true);
      for (const file of Array.from(files)) {
        if (file.size > 20 * 1024 * 1024) {
          toast({ title: `${file.name} excede 20MB`, variant: "destructive" });
          continue;
        }
        try {
          await uploadMutation.mutateAsync(file);
        } catch {
          // Error handled by mutation
        }
      }
      setUploading(false);
    },
    [uploadMutation, toast],
  );

  // Drag & drop
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      handleFileUpload(e.dataTransfer.files);
    },
    [handleFileUpload],
  );

  const handleSendProposal = async (proposalId: number) => {
    try {
      await sendProposal.mutateAsync({ prospectId, proposalId });
      toast({ title: "Propuesta marcada como enviada" });
    } catch {
      toast({ title: "Error al enviar propuesta", variant: "destructive" });
    }
  };

  const handleChangeStatus = async (proposalId: number, status: string) => {
    try {
      await changeStatus.mutateAsync({ prospectId, proposalId, status });
      toast({ title: "Estado actualizado" });
    } catch {
      toast({ title: "Error al cambiar estado", variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <h4 className="font-medium">Propuestas</h4>
        <p className="text-xs text-muted-foreground">Arrastra archivos o haz click para subir propuestas (max 20MB)</p>
      </div>

      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer mb-4 ${
          isDragging
            ? "border-[#0067B0] bg-[#0067B0]/5"
            : "border-[#e5e7eb] hover:border-[#0067B0]/50 hover:bg-[#f9fafb]"
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png"
          multiple
          onChange={(e) => handleFileUpload(e.target.files)}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0067B0]" />
            <span className="text-sm text-[#6b7280]">Subiendo propuesta...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className={`h-8 w-8 ${isDragging ? "text-[#0067B0]" : "text-[#9ca3af]"}`} />
            <span className="text-sm font-medium text-[#6b7280]">
              {isDragging ? "Suelta tu propuesta aquí" : "Arrastra tu propuesta o haz click para seleccionar"}
            </span>
            <span className="text-[10px] text-[#9ca3af]">PDF, Word, Excel, PowerPoint o imágenes · Max 20MB</span>
          </div>
        )}
      </div>

      {/* Proposals list */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </div>
      ) : proposals.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p>No hay propuestas</p>
          <p className="text-xs mt-1">Arrastra un archivo arriba para crear la primera versión</p>
        </div>
      ) : (
        <div className="space-y-3">
          {[...proposals]
            .sort((a: ProposalVersion, b: ProposalVersion) => (b.version || 1) - (a.version || 1))
            .map((proposal: ProposalVersion) => (
              <div
                key={proposal.id}
                className={`bg-card border rounded-lg p-4 ${proposal.status === "aceptada" ? "border-green-400" : ""}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium bg-muted px-2 py-0.5 rounded">v{proposal.version || 1}</span>
                      <p className="font-medium text-sm">{proposal.name}</p>
                      <Badge className={statusColors[proposal.status ?? ""]}>
                        {statusLabels[proposal.status ?? ""]}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                      <ProposalAmountInput prospectId={prospectId} proposal={proposal} />
                      {proposal.validUntil && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          Válida hasta: {format(new Date(proposal.validUntil), "PP", { locale: es })}
                        </span>
                      )}
                    </div>

                    {proposal.sentAt && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Enviada: {format(new Date(proposal.sentAt), "PPp", { locale: es })}
                      </p>
                    )}

                    {/* Campos de Propuesta (spec Vero): utilidad + contacto
                        receptor, editables inline. */}
                    <ProposalDetails prospectId={prospectId} proposal={proposal} />
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      openProspectFile(proposal.url).catch(() =>
                        toast({
                          title: "No se pudo abrir la propuesta",
                          description: "El archivo no está disponible.",
                          variant: "destructive",
                        }),
                      )
                    }
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                  >
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-3 flex-wrap">
                  {proposal.status === "borrador" && (
                    <button
                      onClick={() => handleSendProposal(proposal.id)}
                      disabled={sendProposal.isPending}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#0067B0] text-white hover:bg-[#008b8b] disabled:opacity-50"
                    >
                      <Send className="h-3.5 w-3.5" /> Marcar como Enviada
                    </button>
                  )}
                  {proposal.status === "enviada" && (
                    <button
                      onClick={() => handleChangeStatus(proposal.id, "revisada")}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-[#e5e7eb] text-[#6b7280] hover:bg-[#f3f4f6]"
                    >
                      <Eye className="h-3.5 w-3.5" /> Cliente Revisó
                    </button>
                  )}
                  {(proposal.status === "enviada" || proposal.status === "revisada") && (
                    <>
                      <button
                        onClick={() => handleChangeStatus(proposal.id, "aceptada")}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-green-200 text-green-600 hover:bg-green-50"
                      >
                        <CheckCircle className="h-3.5 w-3.5" /> Aceptada
                      </button>
                      <button
                        onClick={() => handleChangeStatus(proposal.id, "rechazada")}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <XCircle className="h-3.5 w-3.5" /> Rechazada
                      </button>
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
