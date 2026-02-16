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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Plus,
  Download,
  Trash2,
  MoreVertical,
  File,
  FileSpreadsheet,
  FileImage,
  Presentation,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useProspectDocuments, useCreateDocument, useDeleteDocument } from "../api";

interface ProspectDocumentsProps {
  prospectId: number;
}

const documentTypeLabels: Record<string, string> = {
  contrato: "Contrato",
  cotizacion: "Cotizacion",
  presentacion: "Presentacion",
  otro: "Otro",
};

const documentTypeColors: Record<string, string> = {
  contrato: "bg-red-100 text-red-700",
  cotizacion: "bg-green-100 text-green-700",
  presentacion: "bg-purple-100 text-purple-700",
  otro: "bg-gray-100 text-gray-700",
};

const getFileIcon = (mimeType?: string) => {
  if (!mimeType) return <File className="h-8 w-8" />;
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) {
    return <FileSpreadsheet className="h-8 w-8 text-green-600" />;
  }
  if (mimeType.includes("image")) {
    return <FileImage className="h-8 w-8 text-blue-600" />;
  }
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) {
    return <Presentation className="h-8 w-8 text-orange-600" />;
  }
  if (mimeType.includes("pdf")) {
    return <FileText className="h-8 w-8 text-red-600" />;
  }
  return <File className="h-8 w-8 text-gray-600" />;
};

const formatFileSize = (bytes?: number) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function ProspectDocuments({ prospectId }: ProspectDocumentsProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newDoc, setNewDoc] = useState({
    name: "",
    type: "otro",
    url: "",
    description: "",
  });

  const { data: documents = [], isLoading } = useProspectDocuments(prospectId);
  const createDocument = useCreateDocument();
  const deleteDocument = useDeleteDocument();

  const handleCreateDocument = async () => {
    if (!newDoc.name.trim() || !newDoc.url.trim()) {
      toast({
        title: "Error",
        description: "Nombre y URL son requeridos",
        variant: "destructive",
      });
      return;
    }

    try {
      await createDocument.mutateAsync({
        prospectId,
        name: newDoc.name,
        type: newDoc.type,
        url: newDoc.url,
        description: newDoc.description || undefined,
      });
      toast({ title: "Documento agregado" });
      setIsDialogOpen(false);
      setNewDoc({ name: "", type: "otro", url: "", description: "" });
    } catch {
      toast({
        title: "Error",
        description: "No se pudo agregar el documento",
        variant: "destructive",
      });
    }
  };

  const handleDeleteDocument = async (docId: number) => {
    try {
      await deleteDocument.mutateAsync({ prospectId, docId });
      toast({ title: "Documento eliminado" });
    } catch {
      toast({
        title: "Error",
        description: "No se pudo eliminar el documento",
        variant: "destructive",
      });
    }
  };

  // Group documents by type
  const groupedDocs = documents.reduce((acc: Record<string, any[]>, doc: any) => {
    const type = doc.type || "otro";
    if (!acc[type]) acc[type] = [];
    acc[type].push(doc);
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium">Documentos</h4>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Agregar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar Documento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium">Nombre</label>
                <Input
                  className="mt-1"
                  placeholder="Ej: Propuesta comercial v2"
                  value={newDoc.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewDoc({ ...newDoc, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Tipo</label>
                <Select
                  value={newDoc.type}
                  onValueChange={(v: string) => setNewDoc({ ...newDoc, type: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contrato">Contrato</SelectItem>
                    <SelectItem value="cotizacion">Cotizacion</SelectItem>
                    <SelectItem value="presentacion">Presentacion</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">URL del documento</label>
                <Input
                  className="mt-1"
                  placeholder="https://drive.google.com/..."
                  value={newDoc.url}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewDoc({ ...newDoc, url: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Link de Google Drive, Dropbox, OneDrive, etc.
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Descripcion (opcional)</label>
                <Textarea
                  className="mt-1"
                  placeholder="Notas sobre el documento..."
                  value={newDoc.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewDoc({ ...newDoc, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateDocument} disabled={createDocument.isPending}>
                  {createDocument.isPending ? "Guardando..." : "Agregar"}
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
      ) : documents.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p>No hay documentos</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedDocs).map(([type, docs]) => (
            <div key={type}>
              <h5 className="text-sm font-medium text-muted-foreground mb-3">
                {documentTypeLabels[type] || type}
              </h5>
              <div className="grid gap-3">
                {docs.map((doc: any) => (
                  <div
                    key={doc.id}
                    className="bg-card border rounded-lg p-4 flex items-center gap-4"
                  >
                    <div className="flex-shrink-0">
                      {getFileIcon(doc.mimeType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{doc.name}</p>
                        <Badge className={documentTypeColors[doc.type]}>
                          {documentTypeLabels[doc.type]}
                        </Badge>
                      </div>
                      {doc.description && (
                        <p className="text-sm text-muted-foreground truncate mt-1">
                          {doc.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {doc.fileSize && <span>{formatFileSize(doc.fileSize)}</span>}
                        <span>
                          {doc.createdAt
                            ? format(new Date(doc.createdAt), "PP", { locale: es })
                            : ""}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        asChild
                      >
                        <a href={doc.url} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
