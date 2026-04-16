import { useState, useRef, useCallback } from "react";
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
  Upload,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useProspectDocuments, useCreateDocument, useDeleteDocument } from "../api";
import type { ProspectDocument } from "@shared/schema/comercial";
import { useMutation } from "@tanstack/react-query";
import { getAuthToken, invalidateByPrefix } from "@/lib/queryClient";

interface ProspectDocumentsProps {
  prospectId: number;
}

const documentTypeLabels: Record<string, string> = {
  propuesta: "Propuesta",
  orden_compra: "Orden de Compra",
  contrato: "Contrato",
  cotizacion: "Cotizacion",
  presentacion: "Presentacion",
  otro: "Otro",
};

const documentTypeColors: Record<string, string> = {
  propuesta: "bg-blue-100 text-blue-700",
  orden_compra: "bg-green-100 text-green-700",
  contrato: "bg-red-100 text-red-700",
  cotizacion: "bg-teal-100 text-teal-700",
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadType, setUploadType] = useState("otro");
  const [markAsClosed, setMarkAsClosed] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newDoc, setNewDoc] = useState({
    name: "",
    type: "otro",
    url: "",
    description: "",
  });

  const { data: documents = [], isLoading } = useProspectDocuments(prospectId);
  const createDocument = useCreateDocument();
  const deleteDocument = useDeleteDocument();

  // File upload mutation
  const uploadMutation = useMutation({
    mutationFn: async ({ file, tipo, markAsClosed }: { file: File; tipo: string; markAsClosed: boolean }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("tipo", tipo);
      formData.append("markAsClosed", markAsClosed.toString());

      const headers: Record<string, string> = {};
      const token = getAuthToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/comercial/prospects/${prospectId}/documents/upload`, {
        method: "POST",
        headers,
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Error al subir archivo");
      }

      return response.json();
    },
    onSuccess: () => {
      invalidateByPrefix(`/api/comercial/prospects/${prospectId}`);
      toast({ title: "Documento subido correctamente" });
      setUploadType("otro");
      setMarkAsClosed(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle file upload
  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    for (const file of Array.from(files)) {
      try {
        await uploadMutation.mutateAsync({ file, tipo: uploadType, markAsClosed });
      } catch {
        // Error handled by mutation
      }
    }
    setUploading(false);
  }, [uploadMutation, uploadType, markAsClosed]);

  // Drag and drop handlers
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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  }, [handleFileUpload]);

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
  const groupedDocs = documents.reduce((acc: Record<string, ProspectDocument[]>, doc: ProspectDocument) => {
    const type = doc.type || "otro";
    if (!acc[type]) acc[type] = [];
    acc[type].push(doc);
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="font-medium">Documentos</h4>
          <p className="text-xs text-muted-foreground">
            Archivos generales: contratos, cotizaciones, presentaciones, ordenes de compra
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-1" />
              Link externo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar Documento (Link)</DialogTitle>
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
                    <SelectItem value="propuesta">Propuesta</SelectItem>
                    <SelectItem value="orden_compra">Orden de Compra</SelectItem>
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

      {/* Drag & Drop Upload Zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 mb-4 transition-all ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50"
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
          onChange={(e) => handleFileUpload(e.target.files)}
        />

        <div className="text-center">
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              <p className="text-sm text-muted-foreground">Subiendo archivo...</p>
            </div>
          ) : (
            <>
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium mb-1">
                Arrastra archivos aqui o{" "}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-primary hover:underline"
                >
                  selecciona
                </button>
              </p>
              <p className="text-xs text-muted-foreground">
                PDF, Word, Excel, imagenes (max 10MB)
              </p>
            </>
          )}
        </div>

        {/* Upload options */}
        <div className="mt-4 flex flex-wrap items-center gap-4 justify-center">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium">Tipo:</label>
            <Select value={uploadType} onValueChange={setUploadType}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="propuesta">Propuesta</SelectItem>
                <SelectItem value="orden_compra">Orden de Compra</SelectItem>
                <SelectItem value="contrato">Contrato</SelectItem>
                <SelectItem value="cotizacion">Cotizacion</SelectItem>
                <SelectItem value="presentacion">Presentacion</SelectItem>
                <SelectItem value="otro">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {uploadType === "orden_compra" && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="markAsClosed"
                checked={markAsClosed}
                onChange={(e) => setMarkAsClosed(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label htmlFor="markAsClosed" className="text-xs cursor-pointer">
                Marcar prospecto como cerrado
              </label>
            </div>
          )}
        </div>
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
                {docs.map((doc: ProspectDocument) => (
                  <div
                    key={doc.id}
                    className="bg-card border rounded-lg p-4 flex items-center gap-4"
                  >
                    <div className="flex-shrink-0">
                      {getFileIcon(doc.mimeType ?? undefined)}
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
